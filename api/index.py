import os
import json
import zipfile
import xml.etree.ElementTree as ET
from io import BytesIO
from typing import List, Dict, Optional
from fastapi import FastAPI, HTTPException, Body, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from google.genai import types
from supabase import create_client
import pypdf
import math
import httpx

# Load environment variables from .env.local and fallback to .env
load_dotenv(dotenv_path=".env.local")
if not os.environ.get("GEMINI_API_KEY"):
    os.environ.pop("GEMINI_API_KEY", None)  # Remove empty/null key so fallback .env can load it
load_dotenv(dotenv_path=".env")

# Initialize FastAPI
app = FastAPI(title="JithX API", description="AI Digital Twin Backend")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize new Google GenAI Client
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
client = None
if GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY)
else:
    print("WARNING: GEMINI_API_KEY environment variable is not set. API calls to Gemini will fail.")

# Initialize Supabase Client
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase_client = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"Error initializing Supabase client: {e}")
else:
    print("WARNING: SUPABASE_URL and SUPABASE_KEY environment variables are not set.")

def query_supabase_vectors(query_embedding: list, n_results: int = 6) -> list:
    if not supabase_client:
        print("ERROR: Supabase client is not initialized.")
        return []
    try:
        response = supabase_client.rpc("match_documents", {
            "query_embedding": query_embedding,
            "match_threshold": 0.3,
            "match_count": n_results
        }).execute()
        return [item["content"] for item in response.data]
    except Exception as e:
        print(f"Supabase RPC Error: {e}")
        return []

async def stream_from_grok(system_instruction: str, history: List[ChatMessage], query: str, api_key: str):
    messages = [{"role": "system", "content": system_instruction}]
    for msg in history:
        messages.append({
            "role": "assistant" if msg.role == "model" else "user",
            "content": msg.parts
        })
    messages.append({"role": "user", "content": query})
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "grok-2-1212",
        "messages": messages,
        "stream": True
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client_httpx:
        async with client_httpx.stream(
            "POST", 
            "https://api.x.ai/v1/chat/completions", 
            headers=headers, 
            json=payload
        ) as response:
            if response.status_code != 200:
                error_body = await response.aread()
                raise Exception(f"Grok API error (HTTP {response.status_code}): {error_body.decode()}")
                
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk_json = json.loads(data_str)
                        content = chunk_json["choices"][0]["delta"].get("content", "")
                        if content:
                            yield content
                    except Exception:
                        pass

async def query_grok(prompt: str, api_key: str, response_format: Optional[dict] = None) -> str:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "grok-2-1212",
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }
    if response_format:
        payload["response_format"] = response_format
        
    async with httpx.AsyncClient(timeout=60.0) as client_httpx:
        response = await client_httpx.post(
            "https://api.x.ai/v1/chat/completions",
            headers=headers,
            json=payload
        )
        if response.status_code != 200:
            raise Exception(f"Grok API error (HTTP {response.status_code}): {response.text}")
        data = response.json()
        return data["choices"][0]["message"]["content"]

# Pydantic Request Models
class ChatMessage(BaseModel):
    role: str # 'user' or 'model'
    parts: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []

class JobMatchRequest(BaseModel):
    job_description: str

class InterviewRequest(BaseModel):
    question: str

class ContactRequest(BaseModel):
    name: str
    email: str
    message: str

# Helper functions
def embed_text(text: str):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini API Client is not configured on the server.")
    try:
        response = client.models.embed_content(
            model="gemini-embedding-2",
            contents=text,
            config=types.EmbedContentConfig(
                output_dimensionality=3072
            )
        )
        return response.embeddings[0].values
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate embedding: {str(e)}")

def extract_text_from_docx(file_bytes: bytes) -> str:
    try:
        with zipfile.ZipFile(BytesIO(file_bytes)) as z:
            xml_content = z.read('word/document.xml')
            root = ET.fromstring(xml_content)
            namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            texts = []
            for paragraph in root.findall('.//w:p', namespaces):
                p_text = ""
                for t in paragraph.findall('.//w:t', namespaces):
                    if t.text:
                        p_text += t.text
                if p_text:
                    texts.append(p_text)
            return "\n".join(texts)
    except Exception as e:
        print(f"Error parsing docx: {e}")
        return ""

# Endpoints
@app.get("/api/health")
def health_check():
    db_status = "Available" if supabase_client is not None else "Unavailable"
    if supabase_client:
        try:
            # Query table for quick validation
            supabase_client.table("documents").select("id", count="exact").limit(1).execute()
            db_status = "Available (Connected)"
        except Exception as e:
            db_status = f"Unavailable: {str(e)}"
    return {
        "status": "healthy",
        "supabase": db_status,
        "api_key_configured": GEMINI_API_KEY is not None
    }

@app.post("/api/recruiter/upload")
async def upload_jd_file(file: UploadFile = File(...)):
    filename = file.filename.lower()
    if not (filename.endswith(".pdf") or filename.endswith(".docx") or filename.endswith(".doc")):
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF or DOCX.")
        
    try:
        file_bytes = await file.read()
        
        if filename.endswith(".pdf"):
            reader = pypdf.PdfReader(BytesIO(file_bytes))
            text = ""
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    text += t + "\n"
        elif filename.endswith(".docx"):
            text = extract_text_from_docx(file_bytes)
        else:
            # Older doc files simple extraction
            text = "".join(chr(c) for c in file_bytes if 32 <= c <= 126 or c in (10, 13))
            import re
            text = re.sub(r'\s+', ' ', text).strip()
            
        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from the uploaded file.")
            
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

@app.post("/api/chat")
async def chat_twin(payload: ChatRequest):
    if not supabase_client:
        async def error_generator():
            yield "System database is not configured yet. Please configure Supabase variables."
        return StreamingResponse(error_generator(), media_type="text/plain")
        
    query = payload.message
    history = payload.history
    
    # 1. Embed query
    query_emb = embed_text(query)
    
    # 2. Retrieve matched resume chunks
    matched_docs = query_supabase_vectors(query_emb, n_results=6)
    context_text = "\n\n".join(matched_docs)
    
    # 3. Build system instruction
    system_instruction = f"""
You are the AI Digital Twin of Sujith Senthilraj (Sujith S), a highly skilled Junior AI Engineer.
Your goal is to represent Sujith to recruiters, developers, and visitors in an intelligent, friendly, professional, and confident manner.

Here is the source-of-truth information about Sujith extracted directly from his resume PDFs:
---
{context_text}
---

Rules of conversation:
1. Answer the user's questions based ONLY on the provided source-of-truth context.
2. If the user asks something that is NOT related to Sujith or is not covered in the context, reply with:
   "I don't have enough information about that yet."
3. Do not make up or hallucinate any projects, numbers, jobs, skills, or experiences that are not in the context.
4. Keep answers relatively concise, professional, and clear. Use formatted bullet points or short paragraphs for readability.
5. Talk in first person ("I", "my") as Sujith's AI Digital Twin, or third person ("Sujith is...") depending on how you are addressed, but write in a personal, developer-focused voice.
"""

    # 4. Convert history to google-genai format
    contents = []
    for msg in history:
        contents.append(
            types.Content(
                role="user" if msg.role == "user" else "model",
                parts=[types.Part.from_text(text=msg.parts)]
            )
        )
    contents.append(
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=query)]
        )
    )
    
    # 5. Yield content stream
    async def response_streamer():
        grok_api_key = os.environ.get("GROK_API_KEY") or os.environ.get("XAI_API_KEY")
        
        # If Gemini is not set up, go straight to Grok
        if not client:
            if grok_api_key:
                try:
                    async for chunk in stream_from_grok(system_instruction, history, query, grok_api_key):
                        yield chunk
                except Exception as ge:
                    yield f"\n[Grok Error: {str(ge)}]"
            else:
                yield "System configuration error: Neither Gemini nor Grok API Key is configured."
            return

        try:
            response_stream = client.models.generate_content_stream(
                model="gemini-2.5-flash",
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction
                )
            )
            for chunk in response_stream:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            # Fallback to Grok if Gemini fails mid-run
            if grok_api_key:
                yield f"\n[Gemini Error: {str(e)}. Falling back to Grok...]\n"
                try:
                    async for chunk in stream_from_grok(system_instruction, history, query, grok_api_key):
                        yield chunk
                except Exception as ge:
                    yield f"\n[Grok Fallback Error: {str(ge)}]"
            else:
                yield f"\n[Stream Error: {str(e)}]"

    return StreamingResponse(response_streamer(), media_type="text/plain")

@app.post("/api/recruiter")
async def match_job(payload: JobMatchRequest):
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Database not configured.")
        
    jd = payload.job_description
    if not jd.strip():
        return {"error": "Job Description is empty."}
        
    # 1. Embed JD
    jd_emb = embed_text(jd)
    
    # 2. Retrieve matched chunks
    matched_docs = query_supabase_vectors(jd_emb, n_results=8)
    context_text = "\n\n".join(matched_docs)
    
    # 3. Structure response
    prompt = f"""
Analyze the following Job Description (JD) against Sujith's professional profile chunks.
Provide a detailed matching score report.

JOB DESCRIPTION:
{jd}

SUJITH'S PROFILE DETAILS:
{context_text}

You must return a structured JSON response containing:
1. "match_score": integer (0 to 100) representing how well Sujith fits the requirements.
2. "matching_skills": list of strings listing skills requested in the JD that Sujith possesses.
3. "matching_projects": list of strings naming projects Sujith built that are highly relevant to this role.
4. "relevant_experience": a short description (2-3 sentences) summarizing how Sujith's experience matches the role.
5. "missing_skills": list of strings listing skills from the JD that Sujith does not have in his profile.
6. "recommendations": a concise list of reasons why the recruiter should hire Sujith for this position.
"""

    grok_api_key = os.environ.get("GROK_API_KEY") or os.environ.get("XAI_API_KEY")
    if not grok_api_key:
        raise HTTPException(status_code=500, detail="Grok API key is not configured in the environment.")

    try:
        grok_response = await query_grok(
            prompt=prompt,
            api_key=grok_api_key,
            response_format={"type": "json_object"}
        )
        return json.loads(grok_response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Grok Job Analysis failed: {str(e)}")

@app.post("/api/interview")
async def interview_me(payload: InterviewRequest):
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Database not configured.")
        
    question = payload.question
    
    # 1. Retrieve chunks
    q_emb = embed_text(question)
    matched_docs = query_supabase_vectors(q_emb, n_results=5)
    context_text = "\n\n".join(matched_docs)
    
    # 2. Call Gemini
    prompt = f"""
You are Sujith Senthilraj, answering a recruiter during an interview. 
Answer the following interview question directly, authentically, and confidently based on the resume details.

QUESTION:
{question}

RESUME DETAILS FOR CONTEXT:
{context_text}

Provide an answer in Sujith's first-person voice. Focus on technical strengths, concrete achievements (like the FastMCP server or Neo4j implementation), and project examples.
Keep the answer under 150 words, structured like a spoken response.
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        return {"answer": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interview response failed: {str(e)}")

@app.get("/api/story")
async def get_career_story():
    # Read raw JSON files from data directory
    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    try:
        with open(os.path.join(data_dir, "experience.json"), "r") as f:
            experience = json.load(f)
        with open(os.path.join(data_dir, "projects.json"), "r") as f:
            projects = json.load(f)
        with open(os.path.join(data_dir, "education.json"), "r") as f:
            education = json.load(f)
    except Exception as e:
        return {"story": f"Could not load biography data files: {str(e)}"}
        
    prompt = f"""
Synthesize a beautiful, engaging career story (in the third-person) for Sujith Senthilraj based on his background:

EDUCATION:
{json.dumps(education, indent=2)}

EXPERIENCE:
{json.dumps(experience, indent=2)}

PROJECTS:
{json.dumps(projects, indent=2)}

Write a narrative detailing his transition from student to a Junior AI Engineer at Prayag.ai. Highlight his exploration of python, LLMs, RAG models, and multi-agent systems. Make it inspiring and recruiter-friendly, emphasizing his problem-solving mindset and competitive coding background (LeetCode).
Keep the story around 250-300 words.
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        return {"story": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Story generation failed: {str(e)}")

@app.post("/api/contact")
def send_contact_email(payload: ContactRequest):
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    name = payload.name
    email = payload.email
    message = payload.message

    to_email = os.environ.get("CONTACT_TO_EMAIL", "jith.prxx@gmail.com")
    smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
    smtp_port_str = os.environ.get("SMTP_PORT", "587")
    smtp_port = int(smtp_port_str) if smtp_port_str.isdigit() else 587
    smtp_username = os.environ.get("SMTP_USER")
    smtp_password = os.environ.get("SMTP_PASSWORD")

    # Fallback to simulation mode if credentials are not set or are placeholders
    is_placeholder = (
        not smtp_username 
        or not smtp_password 
        or "your_" in smtp_username 
        or "your_" in smtp_password
        or smtp_username.strip() == ""
        or smtp_password.strip() == ""
    )
    if is_placeholder:
        print(f"SMTP credentials not set or are placeholders. Simulated contact form submission. To: {to_email}")
        return {"status": "simulated", "message": "Email transmission simulated successfully."}

    try:
        # Construct MIME Message
        msg = MIMEMultipart()
        msg['From'] = smtp_username
        msg['To'] = to_email
        msg['Subject'] = f"JithX Portfolio Message from {name}"

        body = f"New message from JithX Digital Twin Portfolio:\n\nName: {name}\nEmail: {email}\n\nMessage:\n{message}"
        msg.attach(MIMEText(body, 'plain'))

        # Secure Connection & Login (SSL or TLS support with 10s timeout)
        if smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=10)
        else:
            server = smtplib.SMTP(smtp_server, smtp_port, timeout=10)
            server.starttls()
            
        server.login(smtp_username, smtp_password)
        server.sendmail(smtp_username, to_email, msg.as_string())
        server.quit()

        return {"status": "sent", "message": f"Email successfully sent to {to_email}."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SMTP transmission failed: {str(e)}")
