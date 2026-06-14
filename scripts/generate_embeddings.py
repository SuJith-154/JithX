import os
import re
from pypdf import PdfReader
import chromadb
from google import genai
from dotenv import load_dotenv

# Load environment variables from .env.local and fallback to .env
load_dotenv(dotenv_path=".env.local")
if not os.environ.get("GEMINI_API_KEY"):
    os.environ.pop("GEMINI_API_KEY", None)  # Remove empty/null key so fallback .env can load it
load_dotenv(dotenv_path=".env")

# Setup Gemini API Client
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
client = None
if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY environment variable is not set. Please set it to generate embeddings.")
else:
    # Initialize the new GenAI Client
    client = genai.Client(api_key=GEMINI_API_KEY)

def extract_text_from_pdf(pdf_path):
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        t = page.extract_text()
        if t:
            text += t + "\n"
    return text

def chunk_resume_text(text, source_name):
    """
    Chunks the resume text semantically.
    Identifies main sections and creates context-enriched text chunks.
    """
    lines = text.split("\n")
    chunks = []
    
    current_section = "General"
    current_item = ""
    
    # Simple regex to identify sections
    section_patterns = {
        "EDUCATION": ["education", "academic"],
        "TECHNICAL SKILLS": ["technical skills", "skills"],
        "EXPERIENCE": ["experience", "work history"],
        "KEY PROJECTS": ["key projects", "projects"],
        "ACHIEVEMENTS & CERTIFICATIONS": ["achievements", "certifications", "co-curricular"]
    }
    
    buffer = []
    
    for line in lines:
        line_strip = line.strip()
        if not line_strip:
            continue
            
        # Check if line is a section header
        is_header = False
        for sec_name, keywords in section_patterns.items():
            if any(kw in line_strip.lower() for kw in keywords) and len(line_strip) < 40 and not line_strip.startswith("•") and not line_strip.startswith("-"):
                if buffer:
                    # Save previous section chunks
                    chunks.append({
                        "text": f"{current_section} | " + "\n".join(buffer),
                        "metadata": {"section": current_section.lower(), "source": source_name}
                    })
                    buffer = []
                current_section = sec_name
                is_header = True
                break
        
        if is_header:
            continue
            
        # If experience or projects, let's chunk by individual bullet points or project headers
        if current_section in ["EXPERIENCE", "KEY PROJECTS"]:
            # If line starts with bullet or a project title (like EasyHire.ai [Apr 2025] or Stack:)
            if line_strip.startswith("•") or line_strip.startswith("-") or line_strip.startswith("") or line_strip.startswith("o"):
                # Save previous buffer as a chunk
                if buffer:
                    chunks.append({
                        "text": f"{current_section} - {current_item}: " + " ".join(buffer),
                        "metadata": {"section": current_section.lower(), "source": source_name}
                    })
                    buffer = []
                buffer.append(line_strip)
            elif len(line_strip) < 50 and any(keyword in line_strip for keyword in ["Prayag.ai", "EasyHire.ai", "Nanban Fund", "Salary Prediction", "PMT", "Knowledge Base"]):
                if buffer:
                    chunks.append({
                        "text": f"{current_section} - {current_item}: " + " ".join(buffer),
                        "metadata": {"section": current_section.lower(), "source": source_name}
                    })
                    buffer = []
                current_item = line_strip
            else:
                buffer.append(line_strip)
        else:
            buffer.append(line_strip)
            # For skills or education, chunk every 3-4 lines to keep chunks granular
            if len(buffer) >= 4:
                chunks.append({
                    "text": f"{current_section}: " + " ".join(buffer),
                    "metadata": {"section": current_section.lower(), "source": source_name}
                })
                buffer = []
                
    # Flush remaining buffer
    if buffer:
        prefix = f"{current_section} - {current_item}: " if current_section in ["EXPERIENCE", "KEY PROJECTS"] and current_item else f"{current_section}: "
        chunks.append({
            "text": prefix + " ".join(buffer),
            "metadata": {"section": current_section.lower(), "source": source_name}
        })
        
    return chunks

def main():
    if not GEMINI_API_KEY or client is None:
        print("ERROR: GEMINI_API_KEY is not set. Please set it before running this script.")
        return
        
    print("Loading PDFs...")
    pdf_files = ["Sujith_AI_Engineer-2.pdf", "SUJITH_AI-Developer.pdf"]
    all_chunks = []
    
    for file in pdf_files:
        path = os.path.join("d:\\JithX", file)
        if os.path.exists(path):
            print(f"Parsing: {file}")
            text = extract_text_from_pdf(path)
            chunks = chunk_resume_text(text, file)
            all_chunks.extend(chunks)
            print(f"Extracted {len(chunks)} chunks from {file}")
        else:
            print(f"PDF not found: {path}")
            
    if not all_chunks:
        print("No chunks found. Exiting.")
        return
        
    print(f"Total chunks extracted: {len(all_chunks)}")
    
    # Initialize ChromaDB persistent client
    chroma_path = "d:\\JithX\\data\\chromadb"
    print(f"Initializing ChromaDB at {chroma_path}")
    chroma_client = chromadb.PersistentClient(path=chroma_path)
    
    collection = chroma_client.get_or_create_collection(name="sujith_portfolio")
    
    print("Generating Gemini embeddings and storing in ChromaDB...")
    
    documents = []
    embeddings = []
    metadatas = []
    ids = []
    
    for i, chunk in enumerate(all_chunks):
        text_content = chunk["text"]
        metadata = chunk["metadata"]
        
        try:
            # Generate embedding using the new GenAI Client
            response = client.models.embed_content(
                model="gemini-embedding-2",
                contents=text_content
            )
            embedding = response.embeddings[0].values
            
            documents.append(text_content)
            embeddings.append(embedding)
            metadatas.append(metadata)
            ids.append(f"chunk_{i}")
            
            print(f"Embedded chunk {i+1}/{len(all_chunks)}")
        except Exception as e:
            print(f"Error embedding chunk {i}: {e}")
            
    if documents:
        print(f"Saving {len(documents)} vectors to ChromaDB...")
        collection.add(
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids
        )
        print("ChromaDB vector store generated successfully!")
    else:
        print("No embeddings generated.")

if __name__ == "__main__":
    main()
