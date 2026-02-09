from google import genai
from src.core.config import settings
from pydantic import SecretStr

def generate_summary(text: str, summary_type: str = "concise") -> str:
    raw_api_key = settings.GEMINI_API_KEY
    if isinstance(raw_api_key, SecretStr):
        raw_api_key = raw_api_key.get_secret_value()
    
    client = genai.Client(api_key=raw_api_key)

    base_instruction = (
        "You are an expert academic assistant. Analyze the provided text and detect its dominant language. "
        "Provide a summary **strictly in the same language** as the source text.\n"
        "CRITICAL RULES:\n"
        "1. If the text is technical code or mixed, assume the language of the explanation text.\n"
        "2. Do NOT start by stating the language.\n"
        "3. Do NOT use introductory phrases.\n"
        "4. Start DIRECTLY with the content.\n"
    )
    
    if summary_type == "detailed":
        specific_instructions = (
            "Provide a detailed summary structured with main headings and bullet points. "
            "Capture all key concepts and definitions."
        )
    else:
        specific_instructions = (
            "Provide a concise summary in a few bullet points, capturing only the most important ideas."
        )
        
    full_prompt = f"{base_instruction}\n{specific_instructions}\n\nTEXT TO ANALYZE:\n{text}"
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash-lite',
            contents=full_prompt
            )
        return response.text
    except Exception as e:
        return f"AI Error: {str(e)}"