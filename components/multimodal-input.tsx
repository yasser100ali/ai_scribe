"use client";

import type { ChatRequestOptions, CreateMessage, Message } from "ai";
import { motion } from "framer-motion";
import type React from "react";
import {
  useRef,
  useEffect,
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { toast } from "sonner";
import { useLocalStorage, useWindowSize } from "usehooks-ts";

import { cn, sanitizeUIMessages } from "@/lib/utils";
import { useVoiceRecording } from "@/hooks/use-voice-recording";

import { ArrowUpIcon, StopIcon, MicrophoneIcon } from "./icons";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

const defaultSuggestedActions = [
  {
    title: "Find patients with high fevers",
    label: "from the records",
    action: "Find patients that have high fevers",
  },
  {
    title: "Help me get started",
    label: "with this project",
    action: "Help me get started, how could I use this project?",
  },
  {
    title: "List Patients",
    label: "from Records",
    action: "List the current availabe patients in the records.",
  },
  {
    title: "List Tools",
    label: "available in this system",
    action: "Describe the tools you have here",
  },
];

export function MultimodalInput({
  chatId,
  input,
  setInput,
  isLoading,
  stop,
  messages,
  setMessages,
  append,
  handleSubmit,
  className,
  suggestedActions,
  placeholder,
}: {
  chatId: string;
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  stop: () => void;
  messages: Array<Message>;
  setMessages: Dispatch<SetStateAction<Array<Message>>>;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
  handleSubmit: (
    event?: {
      preventDefault?: () => void;
    },
    chatRequestOptions?: ChatRequestOptions,
  ) => void;
  className?: string;
  suggestedActions?: Array<{
    title: string;
    label: string;
    action: string;
  }>;
  placeholder?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const processingRef = useRef(false);
  const { 
    isRecording, 
    isPlaying, 
    audioBlob, 
    startRecording, 
    stopRecording, 
    playAudio, 
    clearRecording 
  } = useVoiceRecording();

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    "input",
    "",
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || "";
      setInput(finalValue);
      adjustHeight();
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    adjustHeight();
  };

  const submitForm = useCallback(() => {
    handleSubmit(undefined, {});
    setLocalStorageInput("");

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [handleSubmit, setLocalStorageInput, width]);

  const handleVoiceToggle = useCallback(async () => {
    if (isRecording) {
      // Stop recording and send audio
      await stopRecording();
    } else {
      // Start recording
      processingRef.current = false; // Reset processing flag
      setIsVoiceMode(true);
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Handle audio blob when recording stops - transcribe it first
  useEffect(() => {
    if (audioBlob && !isRecording && !processingRef.current) {
      processingRef.current = true;
      
      const transcribeAndSend = async () => {
        try {
          // Convert blob to FormData for transcription
          const formData = new FormData();
          formData.append('file', audioBlob, 'audio.webm');

          // Transcribe audio using backend API
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Transcription failed');
          }

          const data = await response.json();
          const transcribedText = data.text;

          // Send transcribed text as a regular message with voice mode marker
          if (transcribedText) {
            setInput(transcribedText);
            await append({
              role: "user",
              content: `[VOICE_MODE]${transcribedText}`,
            });
          }

          clearRecording();
          processingRef.current = false;
          // Don't set isVoiceMode to false yet - wait for response
        } catch (error) {
          console.error('Error transcribing audio:', error);
          toast.error('Failed to transcribe audio. Please try again.');
          clearRecording();
          setIsVoiceMode(false);
          processingRef.current = false;
        }
      };

      transcribeAndSend();
    }
  }, [audioBlob, isRecording, append, clearRecording, setInput]);

  // Play audio responses from AI (only if voice mode was used)
  useEffect(() => {
    if (!isVoiceMode) return; // Only play audio if user used voice input
    
    const lastMessage = messages[messages.length - 1];
    
    console.log('Checking for audio - Last message:', lastMessage);
    
    // If we have a new assistant message, generate audio for it
    if (lastMessage?.role === "assistant" && lastMessage.content) {
      const generateAudio = async () => {
        try {
          console.log('Generating audio for message:', lastMessage.content);
          
          // Call TTS API
          const response = await fetch('/api/tts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: lastMessage.content,
              voice: 'alloy',  // Use 'nova' for patient portal
            }),
          });
          
          if (!response.ok) {
            throw new Error('TTS failed');
          }
          
          const data = await response.json();
          console.log('Received TTS audio');
          
          // Extract base64 and play
          const base64Data = data.audio.split(',')[1];
          await playAudio(base64Data, 'wav');
          
          // Reset voice mode after playing
          setIsVoiceMode(false);
        } catch (error) {
          console.error('Error generating audio:', error);
          toast.error('Failed to generate audio response');
          setIsVoiceMode(false);
        }
      };
      
      generateAudio();
    }
  }, [messages, playAudio, isVoiceMode, setIsVoiceMode]);

  const actions = suggestedActions || defaultSuggestedActions;

  return (
    <div className="relative w-full flex flex-col gap-4">
      {messages.length === 0 && (
        <div className="grid sm:grid-cols-2 gap-3 w-full">
          {actions.map((suggestedAction, index) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.05 * index }}
              key={`suggested-action-${suggestedAction.title}-${index}`}
              className={index > 1 ? "hidden sm:block" : "block"}
            >
              <Button
                variant="ghost"
                onClick={async () => {
                  append({
                    role: "user",
                    content: suggestedAction.action,
                  });
                }}
                className="text-left border border-border/60 hover:border-primary/50 hover:bg-accent/50 rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start transition-all group"
              >
                <span className="font-medium text-foreground group-hover:text-primary transition-colors">{suggestedAction.title}</span>
                <span className="text-muted-foreground text-xs">
                  {suggestedAction.label}
                </span>
              </Button>
            </motion.div>
          ))}
        </div>
      )}

      <div className="relative rounded-2xl border border-border/60 bg-muted/40 backdrop-blur-sm p-1 shadow-lg hover:border-primary/30 focus-within:border-primary/50 transition-all">
        <Textarea
          ref={textareaRef}
          placeholder={placeholder || "Ask about medical documentation, patient care, or healthcare workflows..."}
          value={input}
          onChange={handleInput}
          className={cn(
            "min-h-[80px] max-h-[calc(75dvh)] overflow-hidden resize-none rounded-xl !text-base bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 pr-12",
            className,
          )}
          rows={3}
          autoFocus
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();

              if (isLoading) {
                toast.error("Please wait for the model to finish its response!");
              } else {
                submitForm();
              }
            }
          }}
        />

        {/* Recording indicator */}
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-3 left-3 flex items-center gap-2 bg-red-500/20 text-red-500 px-3 py-1.5 rounded-full text-xs font-medium"
          >
            <motion.span
              className="w-2 h-2 bg-red-500 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            Recording...
          </motion.div>
        )}

        {/* Playing indicator */}
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-3 left-3 flex items-center gap-2 bg-blue-500/20 text-blue-500 px-3 py-1.5 rounded-full text-xs font-medium"
          >
            <motion.span
              className="w-2 h-2 bg-blue-500 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            Playing...
          </motion.div>
        )}

        {/* Button group */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          {/* Microphone button */}
          {!isLoading && (
            <Button
              className={cn(
                "rounded-full p-2 h-fit shadow-md transition-all",
                isRecording 
                  ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" 
                  : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
              )}
              onClick={(event) => {
                event.preventDefault();
                handleVoiceToggle();
              }}
              title={isRecording ? "Stop recording" : "Start voice recording"}
            >
              <MicrophoneIcon size={16} />
            </Button>
          )}

          {/* Send / Stop button */}
          {isLoading ? (
            <Button
              className="rounded-full p-2 h-fit bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
              onClick={(event) => {
                event.preventDefault();
                stop();
                setMessages((messages) => sanitizeUIMessages(messages));
              }}
            >
              <StopIcon size={16} />
            </Button>
          ) : (
            <Button
              className="rounded-full p-2 h-fit bg-primary hover:bg-primary/90 text-primary-foreground shadow-md disabled:opacity-30"
              onClick={(event) => {
                event.preventDefault();
                submitForm();
              }}
              disabled={input.length === 0}
            >
              <ArrowUpIcon size={16} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
