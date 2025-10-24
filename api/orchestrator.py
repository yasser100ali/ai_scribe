import os
import json
import base64
from typing import List, Dict, Any
from openai import OpenAI
from dotenv import load_dotenv

from .utils.get_patient_info import get_patient_info, get_patient_names, search_records_RAG

load_dotenv()

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# Define tools for OpenAI Responses API
tools = [
    {
        "type": "function",
        "name": "get_patient_names",
        "description": "Retrieve all patient names and their patient IDs. Use this first to find the patient_id for a specific patient name before calling get_patient_info.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "type": "function",
        "name": "get_patient_info",
        "description": "Retrieve a specific patient record by patient_id. Use get_patient_names first to find the patient_id from a patient name.",
        "parameters": {
            "type": "object",
            "properties": {
                "patient_id": {
                    "type": "string",
                    "description": "Required patient ID (e.g., 'jordan_carter', 'emily_chen'). Get this from get_patient_names function first.",
                },
                "age": {
                    "type": "array",
                    "items": {"type": "integer"},
                    "minItems": 2,
                    "maxItems": 2,
                    "description": "Optional tuple of [start_age, end_age] to filter patients within age range (upper limit capped at 100)",
                },
                "gender": {
                    "type": "string",
                    "description": "Optional gender to filter by (M, F, or variations like Male, Female)",
                },
            },
            "required": ["patient_id"],
        },
    },
    {
        "type": "function",
        "name": "search_records_RAG",
        "description": "Uses RAG to search through the patient database. Use as default when the user gives you a query and wants you to search through database.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query to find relevant patient records (e.g., 'Tell me about Emily')."
                }
            },
            "required": ["query"]
        }
    }
]

SYSTEM_PROMPT = """
You are DeepScribe Assistant, an AI medical scribe designed to help healthcare providers
capture, organize, and summarize clinical encounters accurately and empathetically.

By default if the user asks a vague prompt like "what do you" or something along those lines or "help me get started", 
then use the get_patient_names() tool to list the patients and ask them which patient they would like to go over. 

Core directives:
1. Listen carefully to the patient's description of their symptoms.
2. Ask clarifying questions only if necessary to capture key details.
3. Summarize findings in structured sections such as:
   - Chief Complaint
   - History of Present Illness
   - Past Medical History
   - Medications
   - Assessment / Plan (if applicable)
4. Maintain a neutral, professional tone appropriate for clinical documentation.
5. Never make diagnostic claims or prescribe treatments — only restate information.
6. When unsure, clearly state uncertainty ("The patient reports...", "It is unclear if...").
7. Keep documentation concise and medically precise.

Your goal: Produce a note that a physician could easily review and use for official documentation.

You have access to patient data through two functions and automatic file search:

1. **get_patient_names()**: Returns all patient names and their IDs. Use this FIRST when a user asks about a specific patient by name.
2. **get_patient_info(patient_id)**: Returns detailed patient record. Use the patient_id from get_patient_names() result.
3. **search_records_RAG(query)**: searches through patient database using RAG. use this when the patient does not give you a particular patient to look into but wants you to find patient in the doc "Find patient that is roughly 60-70 years old" or "Find patient with depression and tell me about their symptoms" etc. Notice the search here is vague. 

If they ask which tools you have describe only these 3. 


If they ask about material not related to patient records or anything medical related, tell them that you are an assistant designed specifically for patient medical data, and steer them back to the main topics.

Be concise with your words and to the point. 

When the user asks you to tell them about a particular patient, usually make a table for that patient and list out their information there. Cite where you are getting your info from. 

When going over a patient, cite where in the transcript (which second mark) or where in the data souce if possible you found what you are referencing to. 

If the user asks a question that is not in the data source given to you, simply say you do not have the information. 
""".strip()


def execute_function_call(function_name: str, arguments: str) -> str:
    """
    Execute a function call and return the JSON-serialized result.
    
    Args:
        function_name: Name of the function to execute
        arguments: JSON string of function arguments
        
    Returns:
        JSON string of the function result
    """
    if function_name == "get_patient_names":
        result = get_patient_names()
        return json.dumps(result)
    
    elif function_name == "get_patient_info":
        args = json.loads(arguments)
        # Convert age array to tuple if present
        if "age" in args and args["age"]:
            args["age"] = tuple(args["age"])
        result = get_patient_info(**args)
        return json.dumps(result)
    
    elif function_name == "search_records_RAG":
        args = json.loads(arguments)
        results = search_records_RAG(**args)
        return json.dumps(results)
    
    
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


def stream_text_with_audio(messages: List[dict], protocol: str = "data"):
    """
    Handle audio output using the new OpenAI TTS API.
    
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
        {"role": "system", "content": SYSTEM_PROMPT}
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
        
        # Send completion metadata
        # Audio will be generated separately via /api/tts endpoint
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
        print(f"Error in audio processing: {e}")
        import traceback
        traceback.print_exc()
        error_payload = {"finishReason": "error", "message": str(e)}
        yield f'e:{json.dumps(error_payload)}\n'


def stream_text(messages: List[dict], protocol: str = "data"):
    """
    Stream text responses from OpenAI with function calling and audio support.
    
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
        yield from stream_text_with_audio(cleaned_messages, protocol)
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
            instructions=SYSTEM_PROMPT,
            input=input_list,
            tools=tools,
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
                    result_output = execute_function_call(item.name, item.arguments)
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
