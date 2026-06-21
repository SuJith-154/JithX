import os
import json
import zipfile
import xml.etree.ElementTree as ET
from io import BytesIO
from typing import List, Dict, Optional
from fastapi import FastAPI, HTTPException, Body, UploadFile, File, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from datetime import datetime, timedelta
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

import logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("JithX-Backend")

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
        logger.error("Supabase client is not initialized.")
        return []
    logger.info(f"Querying Supabase vectors for semantic matching (limit: {n_results})...")
    try:
        response = supabase_client.rpc("match_documents", {
            "query_embedding": query_embedding,
            "match_threshold": 0.3,
            "match_count": n_results
        }).execute()
        results = [item["content"] for item in response.data]
        logger.info(f"Successfully retrieved {len(results)} matching segments from Supabase.")
        return results
    except Exception as e:
        logger.error(f"Supabase RPC Exception: {e}")
        return []

async def stream_from_grok(system_instruction: str, history: List['ChatMessage'], query: str, api_key: str):
    logger.info(f"Initiating streaming chat from Grok (model: grok-2-1212). Query: '{query}'")
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
    logger.info(f"Initiating JSON query to Grok (model: grok-2-1212). Prompt length: {len(prompt)} characters.")
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

async def log_visit(request: Request, endpoint: str):
    if not supabase_client:
        return
    try:
        ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
        country = request.headers.get("x-vercel-ip-country", "unknown")
        region = request.headers.get("x-vercel-ip-country-region", "unknown")
        city = request.headers.get("x-vercel-ip-city", "unknown")
        user_agent = request.headers.get("user-agent", "unknown")
        referer = request.headers.get("referer", "direct")
        
        user_agent_lower = user_agent.lower()
        if "ipad" in user_agent_lower or "tablet" in user_agent_lower:
            device_type = "Tablet"
        elif "mobile" in user_agent_lower or "android" in user_agent_lower or "iphone" in user_agent_lower:
            device_type = "Mobile"
        else:
            device_type = "Desktop"
        
        try:
            # Try inserting all fields (including new analytics fields)
            supabase_client.table("visits").insert({
                "ip_address": ip,
                "country": country,
                "region": region,
                "city": city,
                "user_agent": user_agent,
                "device_type": device_type,
                "referer": referer,
                "endpoint_visited": endpoint
            }).execute()
        except Exception as insert_err:
            logger.warning(f"Visits full insert failed, retrying with basic fields: {insert_err}")
            # Fallback to basic fields in case device_type/referer columns are missing in Supabase
            supabase_client.table("visits").insert({
                "ip_address": ip,
                "country": country,
                "region": region,
                "city": city,
                "user_agent": user_agent,
                "endpoint_visited": endpoint
            }).execute()
        logger.info(f"Log visit recorded: {city}, {country} visited {endpoint}")
        
        # Fallback automated cleanup for visits (12 months TTL)
        try:
            cutoff = (datetime.utcnow() - timedelta(days=365)).isoformat()
            supabase_client.table("visits").delete().lt("created_at", cutoff).execute()
        except Exception as cleanup_err:
            logger.error(f"Fallback visits cleanup failed: {cleanup_err}")
            
    except Exception as e:
        logger.error(f"Failed to log visit to Supabase: {e}")

async def log_chat(message: str, response: str, request: Request):
    if not supabase_client:
        return
    try:
        country = request.headers.get("x-vercel-ip-country", "unknown")
        city = request.headers.get("x-vercel-ip-city", "unknown")
        
        supabase_client.table("chat_logs").insert({
            "message": message,
            "response": response,
            "country": country,
            "city": city
        }).execute()
        logger.info("Chat log successfully saved to Supabase.")
        
        # Fallback automated cleanup for chat logs (3 months TTL)
        try:
            cutoff = (datetime.utcnow() - timedelta(days=90)).isoformat()
            supabase_client.table("chat_logs").delete().lt("created_at", cutoff).execute()
        except Exception as cleanup_err:
            logger.error(f"Fallback chat cleanup failed: {cleanup_err}")
            
    except Exception as e:
        logger.error(f"Failed to save chat log to Supabase: {e}")

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
        logger.error("Gemini API Client is not configured on the server.")
        raise HTTPException(status_code=500, detail="Gemini API Client is not configured on the server.")
    logger.info(f"Generating Gemini embedding for text segment (length: {len(text)} characters)...")
    try:
        response = client.models.embed_content(
            model="gemini-embedding-2",
            contents=text,
            config=types.EmbedContentConfig(
                output_dimensionality=3072
            )
        )
        embedding = response.embeddings[0].values
        logger.info(f"Successfully generated embedding vector of length {len(embedding)}.")
        return embedding
    except Exception as e:
        logger.error(f"Failed to generate embedding: {e}")
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
        logger.error(f"Error parsing docx: {e}")
        return ""

# Endpoints
@app.get("/api/health")
def health_check():
    logger.info("Health check requested.")
    db_status = "Available" if supabase_client is not None else "Unavailable"
    if supabase_client:
        try:
            # Query table for quick validation
            supabase_client.table("documents").select("id", count="exact").limit(1).execute()
            db_status = "Available (Connected)"
        except Exception as e:
            db_status = f"Unavailable: {str(e)}"
    logger.info("Health check complete.")
    return {
        "status": "healthy",
        "supabase": db_status,
        "api_key_configured": GEMINI_API_KEY is not None
    }

@app.post("/api/recruiter/upload")
async def upload_jd_file(file: UploadFile = File(...)):
    logger.info(f"File upload initiated: {file.filename}")
    filename = file.filename.lower()
    if not (filename.endswith(".pdf") or filename.endswith(".docx") or filename.endswith(".doc")):
        logger.warning(f"Unsupported file format: {filename}")
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
            logger.warning("Empty text extracted from file.")
            raise HTTPException(status_code=400, detail="Could not extract text from the uploaded file.")
            
        logger.info("File processed successfully.")
        return {"text": text}
    except Exception as e:
        logger.error(f"Failed to process file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

@app.post("/api/chat")
async def chat_twin(payload: ChatRequest, request: Request):
    logger.info(f"Chat request received. Query: '{payload.message}' | History size: {len(payload.history)}")
    await log_visit(request, "/api/chat")
    if not supabase_client:
        logger.error("Supabase database is not configured. Aborting chat request.")
        async def error_generator():
            yield "System database is not configured yet. Please configure Supabase variables."
        return StreamingResponse(error_generator(), media_type="text/plain")
        
    query = payload.message
    history = payload.history
    
    # 1. Embed query
    query_emb = embed_text(query)
    
    # 2. Retrieve matched resume chunks (Pure RAG - load all vector matches)
    matched_docs = query_supabase_vectors(query_emb, n_results=6)
    context_text = "\n\n".join(matched_docs)
    
    # 3. Build system instruction
    system_instruction = f"""
You are the AI Digital Twin of Sujith Senthilraj (Sujith S), a highly skilled Junior AI Engineer.
Your goal is to represent Sujith to recruiters, developers, and visitors in an intelligent, friendly, professional, and confident manner.

Here is the source-of-truth information about Sujith extracted directly from his resume, portfolio documents, and published research papers:
---
{context_text}
---

Rules of conversation:
1. Answer the user's questions based ONLY on the provided source-of-truth context.
2. IMPORTANT context restriction: Discuss or mention details about his research paper, R&D, publishing, or the "Edge-AI Smart Stick" project ONLY if the user explicitly asks about his research, publishing, R&D, or the smart stick. For all other general questions (e.g. about his experience, projects, skills, education), rely strictly on his professional resume, projects, and internship experience (such as at Prayag.ai).
3. If the user asks something that is NOT related to Sujith or is not covered in the context, reply with:
   "I don't have enough information about that yet."
4. Do not make up or hallucinate any projects, numbers, jobs, skills, or experiences that are not in the context.
5. Keep answers relatively concise, professional, and clear. Use formatted bullet points or short paragraphs for readability.
6. Talk in first person ("I", "my") as Sujith's AI Digital Twin, or third person ("Sujith is...") depending on how you are addressed, but write in a personal, developer-focused voice.
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
        accumulated_text = []
        
        # If Gemini is not set up, go straight to Grok
        if not client:
            if grok_api_key:
                logger.warning("Gemini Client not initialized. Falling back directly to Grok stream.")
                try:
                    async for chunk in stream_from_grok(system_instruction, history, query, grok_api_key):
                        accumulated_text.append(chunk)
                        yield chunk
                    raw_resp = "".join(accumulated_text)
                    logger.info(f"Raw Grok Response: {raw_resp}")
                    await log_chat(query, raw_resp, request)
                except Exception as ge:
                    logger.error(f"Grok streaming failed: {ge}")
                    yield f"\n[Grok Error: {str(ge)}]"
            else:
                logger.error("Neither Gemini nor Grok API Keys are configured on Vercel.")
                yield "System configuration error: Neither Gemini nor Grok API Key is configured."
            return

        logger.info("Requesting Gemini-2.5-flash content stream asynchronously...")
        try:
            response_stream = await client.aio.models.generate_content_stream(
                model="gemini-2.5-flash",
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction
                )
            )
            async for chunk in response_stream:
                if chunk.text:
                    accumulated_text.append(chunk.text)
                    yield chunk.text
            raw_resp = "".join(accumulated_text)
            logger.info(f"Raw Gemini Response: {raw_resp}")
            await log_chat(query, raw_resp, request)
        except Exception as e:
            logger.error(f"Gemini stream generation failed: {e}")
            # Fallback to Grok if Gemini fails mid-run
            if grok_api_key:
                logger.warning("Falling back to Grok API after Gemini failure...")
                yield f"\n[Gemini Error: {str(e)}. Falling back to Grok...]\n"
                try:
                    async for chunk in stream_from_grok(system_instruction, history, query, grok_api_key):
                        accumulated_text.append(chunk)
                        yield chunk
                    raw_resp = "".join(accumulated_text)
                    logger.info(f"Raw Grok Fallback Response: {raw_resp}")
                    await log_chat(query, raw_resp, request)
                except Exception as ge:
                    logger.error(f"Grok fallback stream execution failed: {ge}")
                    yield f"\n[Grok Fallback Error: {str(ge)}]"
            else:
                yield f"\n[Stream Error: {str(e)}]"

    return StreamingResponse(
        response_streamer(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.post("/api/recruiter")
async def match_job(payload: JobMatchRequest, request: Request):
    logger.info(f"Job Match analysis requested. JD input length: {len(payload.job_description)} characters.")
    await log_visit(request, "/api/recruiter")
    if not supabase_client:
        logger.error("Supabase database not configured for Job Match.")
        raise HTTPException(status_code=500, detail="Database not configured.")
        
    jd = payload.job_description
    if not jd.strip():
        logger.warning("Job description was empty.")
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
        logger.error("Grok API key missing during job match evaluation.")
        raise HTTPException(status_code=500, detail="Grok API key is not configured in the environment.")

    try:
        grok_response = await query_grok(
            prompt=prompt,
            api_key=grok_api_key,
            response_format={"type": "json_object"}
        )
        result_json = json.loads(grok_response)
        logger.info(f"Successfully calculated Fit Score: {result_json.get('match_score')}% using Grok.")
        return result_json
    except Exception as e:
        logger.error(f"Grok Job Match processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Grok Job Analysis failed: {str(e)}")

@app.post("/api/interview")
async def interview_me(payload: InterviewRequest, request: Request):
    logger.info(f"Mock interview question asked: '{payload.question}'")
    await log_visit(request, "/api/interview")
    if not supabase_client:
        logger.error("Supabase database not configured for interview.")
        raise HTTPException(status_code=500, detail="Database not configured.")
        
    question = payload.question
    
    # 1. Retrieve chunks (Pure RAG - load all vector matches)
    q_emb = embed_text(question)
    matched_docs = query_supabase_vectors(q_emb, n_results=5)
    context_text = "\n\n".join(matched_docs)
    
    # 2. Call Gemini
    prompt = f"""
You are Sujith Senthilraj, answering a recruiter during an interview. 
Answer the following interview question directly, authentically, and confidently based on the context.

QUESTION:
{question}

CONTEXT:
{context_text}

Rules for context use:
1. Mention details about your research paper, publishing, R&D, or the "Edge-AI Smart Stick" project ONLY if the question explicitly asks about your research, publishing, R&D, or the smart stick. 
2. For all other general questions, rely strictly on your professional resume, experience, skills, and work projects (such as at Prayag.ai).

Provide an answer in Sujith's first-person voice. Focus on technical strengths, concrete achievements (like the FastMCP server or Neo4j implementation), and project examples.
Keep the answer under 150 words, structured like a spoken response.
"""

    try:
        logger.info("Querying Gemini (gemini-2.5-flash) for interview answer...")
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        logger.info("Successfully generated mock interview response.")
        return {"answer": response.text}
    except Exception as e:
        logger.error(f"Gemini mock interview response generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Interview response failed: {str(e)}")

@app.get("/api/story")
async def get_career_story(request: Request):
    logger.info("Career story generation requested.")
    await log_visit(request, "/api/story")
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
        logger.error(f"Failed to read static data files for story: {e}")
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
        logger.info("Generating storytelling career profile using Gemini (gemini-2.5-flash)...")
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        logger.info("Successfully generated career biography story.")
        return {"story": response.text}
    except Exception as e:
        logger.error(f"Gemini career biography story generation failed: {e}")
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

    # Save to database if client exists
    if supabase_client:
        try:
            supabase_client.table("contact_messages").insert({
                "name": name,
                "email": email,
                "message": message
            }).execute()
            logger.info("Contact message successfully saved to Supabase.")
        except Exception as e:
            logger.error(f"Failed to save contact message to Supabase: {e}")

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

# Admin Dashboard Endpoints
ADMIN_PASSCODE = os.environ.get("ADMIN_PASSCODE", "sujithadmin")

@app.get("/api/admin/visits")
async def get_visits(request: Request):
    x_admin_passcode = request.headers.get("X-Admin-Passcode") or request.headers.get("x-admin-passcode")
    if not x_admin_passcode or x_admin_passcode.strip().lower() != ADMIN_PASSCODE.lower():
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid passcode.")
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Database not configured.")
    try:
        res = supabase_client.table("visits").select("*").order("created_at", desc=True).limit(1000).execute()
        return res.data
    except Exception as e:
        logger.error(f"Error fetching visits: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/chats")
async def get_chats(request: Request):
    x_admin_passcode = request.headers.get("X-Admin-Passcode") or request.headers.get("x-admin-passcode")
    if not x_admin_passcode or x_admin_passcode.strip().lower() != ADMIN_PASSCODE.lower():
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid passcode.")
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Database not configured.")
    try:
        res = supabase_client.table("chat_logs").select("*").order("created_at", desc=True).limit(1000).execute()
        return res.data
    except Exception as e:
        logger.error(f"Error fetching chats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/messages")
async def get_messages(request: Request):
    x_admin_passcode = request.headers.get("X-Admin-Passcode") or request.headers.get("x-admin-passcode")
    if not x_admin_passcode or x_admin_passcode.strip().lower() != ADMIN_PASSCODE.lower():
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid passcode.")
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Database not configured.")
    try:
        res = supabase_client.table("contact_messages").select("*").order("created_at", desc=True).limit(1000).execute()
        return res.data
    except Exception as e:
        logger.error(f"Error fetching messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/cleanup")
async def run_cleanup(request: Request):
    x_admin_passcode = request.headers.get("X-Admin-Passcode") or request.headers.get("x-admin-passcode")
    if not x_admin_passcode or x_admin_passcode.strip().lower() != ADMIN_PASSCODE.lower():
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid passcode.")
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Database not configured.")
    try:
        cutoff_visits = (datetime.utcnow() - timedelta(days=365)).isoformat()
        cutoff_chats = (datetime.utcnow() - timedelta(days=90)).isoformat()
        
        # Trigger deletions
        supabase_client.table("visits").delete().lt("created_at", cutoff_visits).execute()
        supabase_client.table("chat_logs").delete().lt("created_at", cutoff_chats).execute()
        
        return {
            "status": "success",
            "message": "Manual cleanup completed successfully.",
            "visits_cutoff": cutoff_visits,
            "chats_cutoff": cutoff_chats
        }
    except Exception as e:
        logger.error(f"Error running manual cleanup: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/log-visit")
async def log_page_visit(request: Request, page: str = "home"):
    await log_visit(request, page)
    return {"status": "logged"}
