import os
import json
try:
    from pypdf import PdfReader
except ImportError:
    print("pypdf not installed yet.")
    exit(1)

def extract_pdf_text(pdf_path):
    print(f"Extracting text from: {pdf_path}")
    reader = PdfReader(pdf_path)
    text = ""
    for i, page in enumerate(reader.pages):
        text += f"\n--- Page {i+1} ---\n"
        text += page.extract_text()
    return text

def main():
    files = ["Sujith_AI_Engineer-2.pdf", "SUJITH_AI-Developer.pdf"]
    for file in files:
        path = os.path.join("d:\\JithX", file)
        if os.path.exists(path):
            text = extract_pdf_text(path)
            txt_path = path.replace(".pdf", "_text.txt")
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(text)
            print(f"Saved to {txt_path}")
        else:
            print(f"File not found: {path}")

if __name__ == "__main__":
    main()
