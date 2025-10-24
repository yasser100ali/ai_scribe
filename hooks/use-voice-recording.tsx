import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";

export interface VoiceRecordingHook {
  isRecording: boolean;
  isPlaying: boolean;
  audioBlob: Blob | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  playAudio: (audioData: string, format?: string) => Promise<void>;
  stopAudio: () => void;
  clearRecording: () => void;
}

export function useVoiceRecording(): VoiceRecordingHook {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Use webm format for better compatibility
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/mp4';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Recording started");
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Failed to start recording. Please check microphone permissions.");
    }
  }, []);

  const stopRecording = useCallback(async () => {
    return new Promise<void>((resolve) => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.onstop = () => {
          const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          setAudioBlob(blob);
          
          // Stop all tracks
          if (mediaRecorderRef.current?.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
          }
          
          setIsRecording(false);
          toast.success("Recording stopped");
          resolve();
        };
        
        mediaRecorderRef.current.stop();
      } else {
        resolve();
      }
    });
  }, [isRecording]);

  const playAudio = useCallback(async (audioData: string, format: string = 'wav') => {
    console.log('playAudio called with format:', format);
    console.log('Audio data length:', audioData?.length);
    
    try {
      // Stop any currently playing audio
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }

      // Decode base64 audio data
      console.log('Decoding base64 audio data...');
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: `audio/${format}` });
      console.log('Created audio blob:', blob.size, 'bytes');
      const url = URL.createObjectURL(blob);
      console.log('Created object URL:', url);
      
      const audio = new Audio(url);
      audioElementRef.current = audio;

      audio.onplay = () => {
        console.log('Audio started playing');
        setIsPlaying(true);
      };
      audio.onended = () => {
        console.log('Audio finished playing');
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = (e) => {
        console.error('Audio error event:', e);
        console.error('Audio error details:', audio.error);
        setIsPlaying(false);
        URL.revokeObjectURL(url);
        toast.error("Failed to play audio");
      };

      console.log('Attempting to play audio...');
      await audio.play();
      console.log('Audio play() succeeded');
    } catch (error) {
      console.error("Error playing audio:", error);
      toast.error("Failed to play audio response");
      setIsPlaying(false);
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
      setIsPlaying(false);
    }
  }, []);

  const clearRecording = useCallback(() => {
    setAudioBlob(null);
    audioChunksRef.current = [];
  }, []);

  return {
    isRecording,
    isPlaying,
    audioBlob,
    startRecording,
    stopRecording,
    playAudio,
    stopAudio,
    clearRecording,
  };
}

