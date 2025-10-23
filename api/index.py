from typing import List
from pydantic import BaseModel
from fastapi import FastAPI, Query, UploadFile, File
from fastapi.responses import StreamingResponse, JSONResponse
from openai import OpenAI
import os

from .utils.prompt import ClientMessage
from .orchestrator import stream_text
from .patient_orchestrator import stream_patient_text

app = FastAPI()
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

class Request(BaseModel):
    messages: List[ClientMessage]


def sanitize_for_responses(messages: List[ClientMessage]) -> List[dict]:
    """
    Keep only 'user' and 'assistant' messages for Responses `input`.
    Drop 'system' and 'tool' (system goes in `instructions`).
    """
    out = []
    for m in messages:
        if m.role not in ("user", "assistant"):
            continue
        # If you have attachments you want to merge, do it here.
        text = (m.content or "").strip()
        out.append({"role": m.role, "content": text})
    return out

@app.post("/api/chat")
async def handle_chat_data(request: Request, protocol: str = Query("data")):
    openai_messages = sanitize_for_responses(request.messages)

    response = StreamingResponse(stream_text(openai_messages, protocol))
    response.headers["x-vercel-ai-data-stream"] = "v1"
    return response

@app.post("/api/patient-chat")
async def handle_patient_chat_data(request: Request, protocol: str = Query("data")):
    """Handle patient-side chat requests with patient-specific orchestration"""
    openai_messages = sanitize_for_responses(request.messages)

    response = StreamingResponse(stream_patient_text(openai_messages, protocol))
    response.headers["x-vercel-ai-data-stream"] = "v1"
    return response

@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe audio file to text using Whisper"""
    try:
        # Read audio file
        audio_bytes = await file.read()
        
        # Save temporarily
        temp_path = f"/tmp/{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(audio_bytes)
        
        # Transcribe using Whisper
        with open(temp_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )
        
        # Clean up temp file
        os.remove(temp_path)
        
        return JSONResponse(content={"text": transcript.text})
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )
