"""
Utility functions for File processing (PDF, DOCX, TXT).
"""
import os
from pypdf import PdfReader
import docx

def extract_text_from_file(file_path: str) -> str:
    if not os.path.exists(file_path):
        return ""
    
    ext = file_path.split('.')[-1].lower()
    text = ""
    
    try:
        if ext == 'pdf':
            reader = PdfReader(file_path)
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
                    
        elif ext == 'docx':
            doc = docx.Document(file_path)
            text = "\n".join([parag.text for parag in doc.paragraphs])
            
        elif ext == 'txt':
            with open(file_path, "rb") as f:
                content = f.read()
                try:
                    text = content.decode("utf-8")
                except UnicodeDecodeError:
                    text = content.decode("latin-1")
        else:
            print(f"Unsupported format: {ext}")
            return ""
            
    except Exception as e:
        print(f"Error reading {ext} file: {e}")
        return ""
        
    return text