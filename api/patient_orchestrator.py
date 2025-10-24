import os
import json
import base64
from typing import List, Dict, Any
from openai import OpenAI
from dotenv import load_dotenv

from .utils.write_patient_record import write_patient_intake

load_dotenv()

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# Define tools for patient chat
patient_tools = [
    {
        "type": "function",
        "name": "write_patient_intake",
        "description": """Write a completed patient intake record after gathering sufficient information. 
        Use this tool when you have collected: name, age, sex, chief complaint/symptoms, reason for visit (sick, appointment, medication question, etc.).
        Optional but valuable: current medications, existing conditions, family history (if relevant to symptoms), allergies.
        Only call this when you have enough information to create a meaningful patient record.""",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Patient's full name"
                },
                "age": {
                    "type": "integer",
                    "description": "Patient's age in years"
                },
                "sex": {
                    "type": "string",
                    "description": "Patient's sex (M or F)"
                },
                "chief_complaint": {
                    "type": "string",
                    "description": "Main reason for visit or primary complaint"
                },
                "symptoms": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of symptoms the patient is experiencing"
                },
                "medications": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of current medications (optional)"
                },
                "conditions": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of existing medical conditions (optional)"
                },
                "family_history": {
                    "type": "string",
                    "description": "Relevant family medical history (optional, only if relevant to current symptoms)"
                },
                "conversation_summary": {
                    "type": "string",
                    "description": "Brief summary of the conversation and information gathered"
                },
                "ai_assessment": {
                    "type": "string",
                    "description": "Your assessment and recommendations (e.g., 'Patient should schedule appointment for persistent cough', 'Non-urgent symptoms, follow up if worsening')"
                },
                "reason_for_visit": {
                    "type": "string",
                    "description": "Type of interaction: 'scheduling_appointment', 'symptom_inquiry', 'medication_question', 'general_inquiry', etc."
                },
                "allergies": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of known allergies (optional)"
                }
            },
            "required": ["name", "age", "sex", "chief_complaint", "symptoms", "conversation_summary", "ai_assessment", "reason_for_visit"]
        }
    }
]

PATIENT_SYSTEM_PROMPT = """
You are a compassionate AI Health Assistant designed to help patients communicate their health concerns 
and gather initial information before they see a healthcare provider.

Your role is similar to a triage nurse. You should:

1. **Greet warmly and ask open-ended questions** to understand why the patient is reaching out
   - Are they experiencing symptoms?
   - Do they want to schedule an appointment?
   - Do they have questions about medications?
   - Do they need general health information?

2. **Gather essential patient information**:
   - Full name
   - Age
   - Sex
   - Chief complaint (main reason for contact)

3. **If they have symptoms, ask about**:
   - What symptoms they're experiencing
   - How long they've had these symptoms
   - Severity (mild, moderate, severe)
   - What makes it better or worse
   - Any other associated symptoms

4. **Collect medical background** (be conversational, don't interrogate):
   - Current medications (if any)
   - Existing medical conditions
   - Known allergies
   - Family history (ONLY if relevant to their current symptoms - e.g., if chest pain, ask about family heart disease)

5. **Once you have sufficient information** (name, age, sex, reason for visit, chief complaint/symptoms):
   - Provide a compassionate summary
   - Give appropriate guidance (e.g., "Based on your symptoms, I recommend scheduling an appointment", 
     "For emergencies like chest pain, please call 911 or go to ER")
   - **Call the write_patient_intake tool** to save the information for healthcare providers to review

6. **Important guidelines**:
   - Be empathetic and reassuring
   - Use simple, non-medical language
   - NEVER diagnose or prescribe
   - For serious symptoms (chest pain, difficulty breathing, severe bleeding, suicidal thoughts), 
     advise immediate emergency care
   - Ask one or two questions at a time, don't overwhelm
   - If patient is vague, gently probe for details
   - Keep responses concise and warm

7. **When you have enough information**, acknowledge the patient, summarize what you learned, 
   provide next steps, and save the record.

Example flow:
- "Hi! I'm here to help. What brings you in today?"
- [Patient describes issue]
- "I'm sorry you're dealing with that. Can you tell me your name and age so I can help you better?"
- [Gather symptoms, duration, severity]
- "Are you currently taking any medications?"
- [Gather relevant history]
- "Thank you for sharing that with me. Let me summarize..."
- [Provide guidance and save record]

Remember: You're gathering information and providing compassionate support, not diagnosing or treating.
""".strip()


def execute_patient_function_call(function_name: str, arguments: str) -> str:
    """
    Execute a function call for patient chat and return the JSON-serialized result.
    
    Args:
        function_name: Name of the function to execute
        arguments: JSON string of function arguments
        
    Returns:
        JSON string of the function result
    """
    if function_name == "write_patient_intake":
        args = json.loads(arguments)
        result = write_patient_intake(**args)
        return json.dumps(result)
    
    return json.dumps({"error": f"Unknown function: {function_name}"})


def _flatten_message_content(content: Any) -> str:
    """Normalize chat.completions content into a plain string."""
    if isinstance(content, str):
        return content

    text_parts: List[str] = []

    if isinstance(content, list):
        for part in content:
            if isinstance(part, str):
                text_parts.append(part)
            elif isinstance(part, dict):
                text = part.get("text") or part.get("content")
                if text:
                    text_parts.append(text)
            else:
                text = getattr(part, "text", None) or getattr(part, "content", None)
                if text:
                    text_parts.append(text)

    return "".join(text_parts)


def _build_audio_attachment(audio_obj: Any, default_format: str = "wav") -> Dict[str, str]:
    """Create a Vercel AI compatible attachment payload from audio metadata."""
    if not audio_obj:
        return {}

    audio_data = getattr(audio_obj, "data", None)
    audio_format = getattr(audio_obj, "format", None) or default_format

    if isinstance(audio_obj, dict):
        audio_data = audio_obj.get("data", audio_data)
        audio_format = audio_obj.get("format", audio_format)

    if not audio_data:
        return {}

    data_url = f"data:audio/{audio_format};base64,{audio_data}"

    return {
        "type": "audio",
        "contentType": f"audio/{audio_format}",
        "url": data_url,
        "name": f"assistant-response.{audio_format}",
    }


def stream_patient_text_with_audio(messages: List[dict], protocol: str = "data"):
    """
    Handle audio output for patient chat using the new OpenAI TTS API.
    
    Args:
        messages: List of conversation messages (text only, already transcribed)
        protocol: Protocol type (default "data")
        
    Yields:
        Formatted response chunks for streaming
    """
    # Convert messages to simple Chat Completions format
    chat_messages = []
    
    for msg in messages:
        if not isinstance(msg, dict):
            continue
            
        role = msg.get("role", "user")
        content = msg.get("content", "")
        
        if content:
            chat_messages.append({
                "role": role,
                "content": content
            })
    
    # Add system message for proper context
    chat_messages_with_system = [
        {"role": "system", "content": PATIENT_SYSTEM_PROMPT}
    ] + chat_messages
    
    try:
        # First, get the text response using regular chat completions
        text_response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=chat_messages_with_system,
            stream=False
        )
        
        # Extract text response
        text_content = ""
        if text_response.choices and text_response.choices[0].message.content is not None:
            text_content = _flatten_message_content(text_response.choices[0].message.content)
            if text_content:
                yield f'0:{json.dumps(text_content)}\n'
        
        # Now generate audio from the text response using the new TTS API
        if text_content:
            audio_response = client.audio.speech.create(
                model="gpt-4o-mini-tts",
                voice="nova",  # Nova is more warm and empathetic for patients
                input=text_content,
                instructions="Speak in a warm, empathetic, and reassuring tone suitable for patient care.",
                response_format="wav"
            )
            
            # Convert audio response to base64
            audio_bytes = audio_response.content
            audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
            
            # Create audio attachment
            attachment_data = {
                "type": "audio",
                "contentType": "audio/wav",
                "url": f"data:audio/wav;base64,{audio_base64}",
                "name": "assistant-response.wav",
            }
            yield f'8:{json.dumps(attachment_data)}\n'
        
        # Send completion metadata
        usage = text_response.usage if hasattr(text_response, 'usage') else None
        prompt_tokens = usage.prompt_tokens if usage else None
        completion_tokens = usage.completion_tokens if usage else None
        
        tail = {
            "finishReason": "stop",
            "usage": {"promptTokens": prompt_tokens, "completionTokens": completion_tokens},
            "isContinued": False,
        }
        yield f'e:{json.dumps(tail)}\n'
        
    except Exception as e:
        print(f"Error in patient audio processing: {e}")
        import traceback
        traceback.print_exc()
        error_payload = {"finishReason": "error", "message": str(e)}
        yield f'e:{json.dumps(error_payload)}\n'


def stream_patient_text(messages: List[dict], protocol: str = "data"):
    """
    Stream text responses for patient chat with function calling and audio support.
    
    Args:
        messages: List of conversation messages
        protocol: Protocol type (default "data")
        
    Yields:
        Formatted response chunks for streaming
    """
    
    # Check if voice mode is active (look for [VOICE_MODE] marker in last user message)
    voice_mode = False
    cleaned_messages = []
    
    for msg in messages:
        if isinstance(msg, dict):
            content = msg.get("content", "")
            if isinstance(content, str) and content.startswith("[VOICE_MODE]"):
                voice_mode = True
                # Remove the marker and keep the text
                cleaned_content = content.replace("[VOICE_MODE]", "").strip()
                cleaned_msg = msg.copy()
                cleaned_msg["content"] = cleaned_content
                cleaned_messages.append(cleaned_msg)
            else:
                cleaned_messages.append(msg)
        else:
            cleaned_messages.append(msg)
    
    # If voice mode is active, use audio generation
    if voice_mode:
        yield from stream_patient_text_with_audio(cleaned_messages, protocol)
        return
    
    model_name = "gpt-4.1-mini"
    input_list = messages.copy()
    
    max_iterations = 5  # Prevent infinite loops
    iteration = 0
    final_response = None
    
    while iteration < max_iterations:
        iteration += 1
        has_function_calls = False
        
        # Make streaming request with tools
        with client.responses.stream(
            model=model_name,
            instructions=PATIENT_SYSTEM_PROMPT,
            input=input_list,
            tools=patient_tools,
        ) as stream:
            for event in stream:
                et = getattr(event, "type", None)
                
                if et == "response.output_text.delta":
                    # Stream text tokens immediately as they arrive
                    yield f'0:{json.dumps(event.delta)}\n'
                    
                elif et == "response.error":
                    err = getattr(event, "error", {}) or {}
                    msg = err.get("message", "unknown error")
                    payload = {"finishReason": "error", "message": msg}
                    yield f'e:{json.dumps(payload)}\n'
                    return

            # Get final response to check for function calls
            final_response = stream.get_final_response()
            
            # Add output to input list
            input_list += final_response.output
            
            # Check if there are function calls to handle
            for item in final_response.output:
                if item.type == "function_call":
                    has_function_calls = True
                    
                    # Execute the function and add result to input
                    result_output = execute_patient_function_call(item.name, item.arguments)
                    input_list.append({
                        "type": "function_call_output",
                        "call_id": item.call_id,
                        "output": result_output
                    })
            
            # If no function calls, we're done
            if not has_function_calls:
                break
    
    # Send final metadata
    if final_response:
        usage = getattr(final_response, "usage", None)
        prompt_tokens = getattr(usage, "input_tokens", None) if usage else None
        completion_tokens = getattr(usage, "output_tokens", None) if usage else None

        tail = {
            "finishReason": "stop",
            "usage": {"promptTokens": prompt_tokens, "completionTokens": completion_tokens},
            "isContinued": False,
        }
        yield f'e:{json.dumps(tail)}\n'
