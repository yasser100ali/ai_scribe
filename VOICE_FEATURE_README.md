# Voice Feature Documentation

## Overview

Voice capabilities have been added to both the **Provider Portal** and **Patient Portal**, allowing users to speak to the AI and receive spoken responses back.

## Features

### 🎤 Voice Input
- **Microphone Button**: Click the microphone button in the text input area to start recording
- **Real-time Indicator**: Visual feedback shows when recording is active (pulsing red button with "Recording..." indicator)
- **Easy Stop**: Click the microphone button again to stop recording and send your message
- **Automatic Submission**: Audio is automatically sent when you stop recording

### 🔊 Voice Output
- **Audio Responses**: AI responses are automatically played back as audio
- **Playback Indicator**: Visual feedback shows when audio is playing (blue "Playing..." indicator)
- **Natural Speech**: Uses OpenAI's advanced text-to-speech models for natural-sounding responses

## How It Works

### Frontend (React/TypeScript)

1. **useVoiceRecording Hook** (`hooks/use-voice-recording.tsx`)
   - Manages audio recording using the browser's MediaRecorder API
   - Converts recorded audio to base64 for transmission
   - Handles audio playback from AI responses

2. **MultimodalInput Component** (`components/multimodal-input.tsx`)
   - Displays microphone button alongside the send button
   - Shows recording/playing status indicators
   - Sends audio as attachments to the API

3. **Icons** (`components/icons.tsx`)
   - `MicrophoneIcon`: Standard microphone icon
   - `MicrophoneOffIcon`: Muted/off state icon (for future use)

### Backend (Python/FastAPI)

1. **Audio Detection**
   - Both orchestrators check incoming messages for audio attachments
   - Routes audio messages to specialized audio handling functions

2. **Provider Portal** (`api/orchestrator.py`)
   - `stream_text_with_audio()`: Handles audio for provider conversations
   - Uses OpenAI's `gpt-4o-audio-preview` model
   - Voice: "alloy" (professional, clear voice)
   - Converts audio attachments to base64 for OpenAI API
   - Returns both text transcription and audio response

3. **Patient Portal** (`api/patient_orchestrator.py`)
   - `stream_patient_text_with_audio()`: Handles audio for patient conversations
   - Uses OpenAI's `gpt-4o-audio-preview` model
   - Voice: "nova" (warm, empathetic voice - better for patients)
   - Same audio processing pipeline as provider portal

## Voice Models

### OpenAI Audio Voices Available

The system uses different voices for different portals:

- **Provider Portal**: `alloy` - Professional and clear
- **Patient Portal**: `nova` - Warm and empathetic

Other available voices you can use:
- `echo` - Male voice
- `fable` - British accent
- `onyx` - Deep, authoritative
- `shimmer` - Soft, gentle

To change the voice, edit the `audio` parameter in the respective orchestrator file:

```python
# In orchestrator.py or patient_orchestrator.py
audio={"voice": "nova", "format": "wav"}
```

## Audio Formats

- **Recording Format**: WebM (browser default)
- **Transmission Format**: Base64-encoded audio
- **Response Format**: WAV (OpenAI default)

## Browser Compatibility

### Supported Browsers
- ✅ Chrome/Edge (88+)
- ✅ Firefox (85+)
- ✅ Safari (14.1+)
- ✅ Opera (74+)

### Required Permissions
- Microphone access (users will be prompted on first use)

## User Experience

### Recording Flow
1. User clicks microphone button
2. Browser requests microphone permission (first time only)
3. Recording starts - red pulsing button appears
4. User speaks their message
5. User clicks microphone button again to stop
6. Audio is automatically sent to AI
7. AI processes the audio and responds with both text and audio

### Playback Flow
1. AI response includes both text and audio
2. Text appears in the chat immediately
3. Audio begins playing automatically
4. Blue "Playing..." indicator shows playback status
5. User can see and hear the response simultaneously

## Technical Details

### API Integration

The voice feature uses OpenAI's Chat Completions API with audio modalities:

```python
response = client.chat.completions.create(
    model="gpt-4o-audio-preview",
    modalities=["text", "audio"],
    audio={"voice": "alloy", "format": "wav"},
    messages=chat_messages,
    stream=False
)
```

### Data Flow

1. **Frontend → Backend**:
   ```json
   {
     "role": "user",
     "content": "",
     "experimental_attachments": [{
       "name": "voice-message.webm",
       "contentType": "audio/webm",
       "url": "data:audio/webm;base64,..."
     }]
   }
   ```

2. **Backend → Frontend**:
   ```
   0:"Transcribed text response"\n
   8:{"type":"audio","contentType":"audio/wav","data":"base64..."}\n
   e:{"finishReason":"stop","usage":{...}}\n
   ```

## Customization

### Change Voice
Edit the `audio` parameter in `orchestrator.py` or `patient_orchestrator.py`:
```python
audio={"voice": "nova", "format": "wav"}  # Change "nova" to desired voice
```

### Change Recording Format
Edit `use-voice-recording.tsx`:
```typescript
const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
  ? 'audio/webm'  // Change this
  : 'audio/mp4';
```

### Disable Auto-play
Remove or comment out the playAudio effect in `multimodal-input.tsx`.

## Troubleshooting

### Microphone Not Working
1. Check browser permissions: `Settings → Privacy → Microphone`
2. Ensure you're using HTTPS (required for microphone access)
3. Try refreshing the page and allowing permissions again

### Audio Not Playing
1. Check browser audio settings
2. Ensure system volume is not muted
3. Check browser console for errors

### Poor Audio Quality
1. Use a better microphone
2. Reduce background noise
3. Speak clearly and at a moderate pace
4. Ensure good internet connection

## Future Enhancements

Potential improvements:
- [ ] Real-time streaming audio (when OpenAI supports it)
- [ ] Voice activity detection (auto-stop when user stops speaking)
- [ ] Multiple voice options in UI
- [ ] Audio playback controls (pause, replay, speed)
- [ ] Transcription display toggle
- [ ] Language selection for multi-lingual support

## Security & Privacy

- Audio data is transmitted securely over HTTPS
- Audio is sent directly to OpenAI's API
- No audio is stored on the server
- OpenAI's data usage policies apply

## Cost Considerations

Voice features use OpenAI's audio API which has separate pricing:
- Audio input: Based on duration
- Audio output: Based on characters spoken
- More expensive than text-only interactions

For pricing details, visit: https://openai.com/api/pricing/

---

**Version**: 1.0  
**Last Updated**: October 23, 2025

