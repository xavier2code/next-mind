'use client';

import { useState, useEffect } from 'react';
import { ChatList } from '@/components/chat/chat-list';
import { ChatInput } from '@/components/chat/chat-input';
import { useModelPreference } from '@/hooks/use-model-preference';

function WelcomeScreen({ onSuggestionClick }: { onSuggestionClick: (s: string) => void }) {
  const suggestions = [
    'Explain quantum computing',
    'Write a poem',
    'Help me code',
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-semibold mb-2">Welcome to Next-Mind</h1>
      <p className="text-zinc-500 mb-8">Your AI assistant powered by Chinese LLMs</p>
      <div className="flex flex-wrap justify-center gap-3">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-sm transition-colors"
            onClick={() => onSuggestionClick(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { modelId, setModelId } = useModelPreference();
  const [messages, setMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string }>>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(content: string) {
    setError(null);
    const userMessage = { id: crypto.randomUUID(), role: 'user' as const, content };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Create conversation if needed
      let convId = conversationId;
      if (!convId) {
        const response = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: content.slice(0, 50), modelId }),
        });
        const data = await response.json();
        convId = data.conversation.id;
        setConversationId(convId);
      }

      // Send to chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          modelId,
          conversationId: convId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantContent += decoder.decode(value, { stream: true });
        }
      }

      const assistantMessage = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        content: assistantContent || 'Response received',
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {messages.length === 0 && !isLoading ? (
        <WelcomeScreen onSuggestionClick={handleSend} />
      ) : (
        <ChatList messages={messages} isLoading={isLoading} />
      )}
      {error && (
        <div className="p-4 mx-4 mb-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="text-red-500 text-xs underline mt-1">
            Dismiss
          </button>
        </div>
      )}
      <ChatInput
        onSend={handleSend}
        modelId={modelId}
        onModelChange={setModelId}
        disabled={isLoading}
      />
    </div>
  );
}
