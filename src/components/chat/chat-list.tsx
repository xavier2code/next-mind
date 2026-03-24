'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage } from './chat-message';

interface ChatListProps {
  messages: Array<{ id: string; role: 'user' | 'assistant'; content: string }>;
  isLoading?: boolean;
}

export function ChatList({ messages, isLoading }: ChatListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      {isLoading && (
        <div className="flex gap-4 p-6 bg-zinc-50">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-200 text-zinc-600 flex items-center justify-center">
            <div className="h-4 w-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="flex-1">
            <div className="text-zinc-500">Thinking...</div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
