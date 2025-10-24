"use client";

import React from "react";
import { PreviewMessage, ThinkingMessage } from "@/components/message";
import { MultimodalInput } from "@/components/multimodal-input";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { useChat } from "ai/react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function PatientChatPage() {
  const chatId = "patient-001";

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    isLoading,
    stop,
  } = useChat({
    api: "/api/patient-chat",
    maxSteps: 4,
    onError: (error) => {
      if (error.message.includes("Too many requests")) {
        toast.error(
          "You are sending too many messages. Please try again later.",
        );
      }
    },
  });

  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  const hasMessages = messages.length > 0;

  const patientSuggestedActions = [
    {
      title: "Help me get started",
      label: "I'm new here",
      action: "I'm new here. Can you help me understand how this works and what you can help me with?",
    },
    {
      title: "Describe my symptoms",
      label: "I'm not feeling well",
      action: "I'm not feeling well and would like to describe my symptoms to you.",
    },
    {
      title: "Ask about my health",
      label: "I have questions",
      action: "I have some questions about my health and well-being.",
    },
    {
      title: "Medical information",
      label: "Update my details",
      action: "I'd like to provide or update my medical information and history.",
    },
  ];

  return (
    <div className="flex h-[calc(100dvh-64px)] overflow-hidden bg-background">
      <div className="flex flex-col h-full w-full overflow-hidden">
        <div className="flex flex-col min-w-0 h-full bg-background">
          {/* Header */}
          {hasMessages && (
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                duration: 0.6,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="flex-shrink-0 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
            >
              <div className="px-4 py-4">
                <div className="flex flex-col gap-3 max-w-4xl mx-auto">
                  <motion.div
                    className="flex flex-col gap-0.5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                  >
                    <p className="text-white font-medium text-base sm:text-lg leading-tight tracking-tight">
                      Patient Health Assistant
                    </p>
                    <p className="text-muted-foreground font-normal text-xs sm:text-sm tracking-tight">
                      Tell us about your symptoms and health concerns
                    </p>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          <div
            ref={messagesContainerRef}
            className="flex flex-col flex-1 overflow-y-scroll pt-4"
          >
            <div className="px-4">
              {/* Welcome message when no messages */}
              {!hasMessages && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)] relative"
                >
                  <div className="max-w-3xl w-full space-y-8 px-4 relative z-10">
                    {/* Header Section */}
                    <motion.div 
                      className="text-center space-y-4"
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <motion.div
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-4"
                        animate={{ 
                          opacity: [0.7, 1, 0.7]
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-50"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        <span className="text-xs font-mono text-white/80 uppercase tracking-widest">AI Health Assistant</span>
                      </motion.div>
                      
                      <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
                        Welcome to Patient Care
                      </h1>
                      <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                        I&apos;m here to help answer your health questions and gather information about your symptoms in a compassionate, caring way.
                      </p>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {messages.map((message, index) => (
                <PreviewMessage
                  key={message.id}
                  chatId={chatId}
                  message={message}
                  isLoading={isLoading && messages.length - 1 === index}
                />
              ))}

              {isLoading &&
                messages.length > 0 &&
                messages[messages.length - 1].role === "user" && <ThinkingMessage />}

              <div
                ref={messagesEndRef}
                className="shrink-0 min-w-[24px] min-h-[24px]"
              />
            </div>
          </div>

          <div className="flex-shrink-0 mx-auto px-4 bg-background pb-4 md:pb-6 w-full md:max-w-3xl">
            <MultimodalInput
              chatId={chatId}
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
              stop={stop}
              messages={messages}
              setMessages={setMessages}
              append={append}
              suggestedActions={patientSuggestedActions}
              placeholder="Tell me about your symptoms, ask health questions, or let me know how I can help..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

