import os
import re
import time
from pypdf import PdfReader
from supabase import create_client
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Resolve absolute paths relative to script location
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)

# Load environment variables from .env.local and fallback to .env
load_dotenv(dotenv_path=os.path.join(project_root, ".env.local"))
if not os.environ.get("GEMINI_API_KEY"):
    os.environ.pop("GEMINI_API_KEY", None)  # Remove empty/null key so fallback .env can load it
load_dotenv(dotenv_path=os.path.join(project_root, ".env"))

# Setup Gemini API Client
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
client = None
if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY environment variable is not set. Please set it to generate embeddings.")
else:
    # Initialize the new GenAI Client
    client = genai.Client(api_key=GEMINI_API_KEY)

def extract_text_from_pdf(pdf_path):
    print(f"Extracting text from: {pdf_path}")
    reader = PdfReader(pdf_path)
    text = ""
    for i, page in enumerate(reader.pages):
        text += f"\n--- Page {i+1} ---\n"
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
    
    # Check if this is a research paper document
    is_paper = "paper" in source_name.lower() or "publishing" in source_name.lower()
    paper_title = "Research Paper"
    if is_paper:
        # Extract the title from the first few non-empty lines
        title_lines = []
        for line in lines[:20]:
            line_strip = line.strip()
            if line_strip and not line_strip.startswith("---") and "page" not in line_strip.lower() and len(line_strip) > 10:
                title_lines.append(line_strip)
                if len(title_lines) >= 3:
                    break
        if title_lines:
            paper_title = f"Research Paper [{', '.join(title_lines)}]"

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
                    prefix = f"{paper_title} - {current_section}: " if is_paper else f"{current_section} | "
                    chunks.append({
                        "text": prefix + "\n".join(buffer),
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
                    prefix = f"{paper_title} - {current_section} - {current_item}: " if is_paper else f"{current_section} - {current_item}: "
                    chunks.append({
                        "text": prefix + " ".join(buffer),
                        "metadata": {"section": current_section.lower(), "source": source_name}
                    })
                    buffer = []
                buffer.append(line_strip)
            elif len(line_strip) < 50 and any(keyword in line_strip for keyword in ["Prayag.ai", "EasyHire.ai", "Nanban Fund", "Salary Prediction", "PMT", "Knowledge Base"]):
                if buffer:
                    prefix = f"{paper_title} - {current_section} - {current_item}: " if is_paper else f"{current_section} - {current_item}: "
                    chunks.append({
                        "text": prefix + " ".join(buffer),
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
                prefix = f"{paper_title} - {current_section}: " if is_paper else f"{current_section}: "
                chunks.append({
                    "text": prefix + " ".join(buffer),
                    "metadata": {"section": current_section.lower(), "source": source_name}
                })
                buffer = []
                
    # Flush remaining buffer
    if buffer:
        if is_paper:
            prefix = f"{paper_title} - {current_section}: "
        else:
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
        
    documents_dir = os.path.join(project_root, "documents")
    print(f"Scanning documents directory: {documents_dir}...")
    all_chunks = []
    
    if os.path.exists(documents_dir):
        # Identify PDF files
        pdf_files = [f for f in os.listdir(documents_dir) if f.endswith(".pdf")]
        # Identify all TXT files
        txt_files = [f for f in os.listdir(documents_dir) if f.endswith(".txt")]
        
        # Build set of text files that correspond to PDFs to skip them
        pdf_bases = {os.path.splitext(f)[0] for f in pdf_files}
        pdf_text_names = {f"{base}_text.txt" for base in pdf_bases}
        
        for file in pdf_files:
            path = os.path.join(documents_dir, file)
            # Extract text
            text = extract_text_from_pdf(path)
            
            # Save extracted text to a text file next to the PDF
            txt_file_name = file.replace(".pdf", "_text.txt")
            txt_path = os.path.join(documents_dir, txt_file_name)
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(text)
            print(f"Saved text copy to: {txt_path}")
            
            # Chunk the extracted text
            chunks = chunk_resume_text(text, file)
            all_chunks.extend(chunks)
            print(f"Extracted {len(chunks)} chunks from {file}")
            
        for file in txt_files:
            # Skip if it has a corresponding PDF or was generated as _text.txt for a PDF
            base = os.path.splitext(file)[0]
            if base in pdf_bases or file in pdf_text_names:
                print(f"Skipping generated/redundant text file: {file}")
                continue
                
            path = os.path.join(documents_dir, file)
            print(f"Reading standalone text file: {path}")
            with open(path, "r", encoding="utf-8") as f:
                text = f.read()
                
            # Chunk the text
            chunks = chunk_resume_text(text, file)
            all_chunks.extend(chunks)
            print(f"Extracted {len(chunks)} chunks from standalone text file {file}")
    else:
        print(f"ERROR: Documents folder not found at {documents_dir}")
        return
            
    if not all_chunks:
        print("No chunks found. Exiting.")
        return
        
    print(f"Total chunks extracted: {len(all_chunks)}")
    
    # Initialize Supabase client
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")
    if not supabase_url or not supabase_key:
        print("ERROR: SUPABASE_URL and SUPABASE_KEY environment variables must be set.")
        return
        
    print(f"Connecting to Supabase at {supabase_url}...")
    supabase = create_client(supabase_url, supabase_key)
    
    print("Generating Gemini embeddings and storing in Supabase...")
    
    rows = []
    
    for i, chunk in enumerate(all_chunks):
        text_content = chunk["text"]
        metadata = chunk["metadata"]
        
        embedding = None
        retries = 5
        base_delay = 5  # Start with 5 second delay if rate limited
        
        for attempt in range(retries):
            try:
                # Generate embedding using the new GenAI Client
                response = client.models.embed_content(
                    model="gemini-embedding-2",
                    contents=text_content,
                    config=types.EmbedContentConfig(
                        output_dimensionality=3072
                    )
                )
                embedding = response.embeddings[0].values
                break  # Success
            except Exception as e:
                err_str = str(e).lower()
                if "quota" in err_str or "rate" in err_str or "exhausted" in err_str or "429" in err_str:
                    delay = base_delay * (2 ** attempt)
                    print(f"Rate limited on chunk {i+1}. Retrying in {delay}s... (Attempt {attempt+1}/{retries}). Error: {e}")
                    time.sleep(delay)
                else:
                    print(f"Error embedding chunk {i+1} on attempt {attempt+1}: {e}")
                    time.sleep(1)
        
        if embedding is not None:
            rows.append({
                "content": text_content,
                "metadata": metadata,
                "embedding": embedding
            })
            print(f"Embedded chunk {i+1}/{len(all_chunks)}")
        else:
            print(f"Failed to embed chunk {i+1} after all attempts.")
            
    if rows:
        print(f"Saving {len(rows)} vectors to Supabase...")
        try:
            # Clear existing data to prevent duplicate ingestion entries
            supabase.table("documents").delete().neq("id", 0).execute()
            # Batch insert rows
            supabase.table("documents").insert(rows).execute()
            print("Supabase vector store populated successfully!")
        except Exception as e:
            print(f"Error saving to Supabase: {e}")
    else:
        print("No embeddings generated.")

if __name__ == "__main__":
    main()
