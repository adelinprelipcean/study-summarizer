import json
from google import genai
from google.genai import types
from src.core.config import settings
from pydantic import SecretStr

def generate_summary(text: str, summary_type: str = "concise") -> dict:
    raw_api_key = settings.GEMINI_API_KEY
    if isinstance(raw_api_key, SecretStr):
        raw_api_key = raw_api_key.get_secret_value()
    
    client = genai.Client(api_key=raw_api_key)

    base_instruction = (
        "SYSTEM ROLE: Security Auditor & Academic Assistant.\n"
        "TASK: Analyze the provided text, detect its language, and generate a JSON response.\n"
        "OUTPUT FORMAT: Return ONLY raw JSON. No conversational filler, no markdown blocks.\n\n"
        "SAFETY AUDIT RULES (CRITICAL):\n"
        "1. Evaluate the intent and content for danger.\n"
        "2. Set 'is_dangerous' to true if the text contains instructions, methods, or encouragement for:\n"
        "   - Hacking, bypassing security, or unauthorized data access.\n"
        "   - Building weapons, explosives, or incendiary devices.\n"
        "   - Promoting violence, hate speech, or illegal activities.\n"
        "3. IMPORTANT: Even if the text is 'educational' or 'test data', if it describes DANGEROUS methods, set 'is_dangerous' to true.\n"
    )
    
    format_instruction = (
        f"SUMMARIZATION STYLE: {summary_type.upper()}.\n"
        "detailed -> Use markdown headings (###) and comprehensive bullet points.\n"
        "concise -> Use exactly 3-5 high-impact bullet points.\n"
        "LANGUAGE: The summary must be in the SAME language as the source text."
    )
    
    json_structure = (
        "\nJSON SCHEMA:\n"
        "{\n"
        "  \"summary\": \"string (markdown formatted)\",\n"
        "  \"flag_status\": boolean\n"
        "}"
    )
        
    full_prompt = f"{base_instruction}\n{format_instruction}\n{json_structure}\n\nTEXT TO ANALYZE:\n{text}"
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash', 
            contents=full_prompt,
            config=types.GenerateContentConfig(
                safety_settings=[
                    types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_NONE"),
                    types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_NONE"),
                    types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="BLOCK_NONE"),
                    types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_NONE"),
                ]
            )
        )
        
        raw_text = response.text.strip()
        
        if "{" in raw_text and "}" in raw_text:
            raw_text = raw_text[raw_text.find("{"):raw_text.rfind("}")+1]
            
        result = json.loads(raw_text)
        
        print(f"--- DEBUG AI SERVICE ---")
        print(f"Raw AI JSON: {result}")
        
        return {
            "summary": result.get("summary", "Summary generation failed."),
            "is_dangerous": bool(result.get("flag_status", False)) 
        }
        
    except Exception as e:
        print(f"AI/Parsing Error: {str(e)}")
        return {
            "summary": f"Manifestation error: {str(e)}", 
            "is_dangerous": False
        }