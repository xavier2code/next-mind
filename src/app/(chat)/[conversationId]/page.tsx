'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ChatList } from '@/components/chat/chat-list';
import { ChatInput } from '@/components/chat/chat-input';
import { useModelPreference } from '@/hooks/use-model-preference';
import { injectFileContent } from '@/lib/chat/inject-file-content';
import type { AttachmentFile } from '@/lib/chat/types';

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const { modelId, setModelId } = useModelPreference();
  const [messages, setMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    attachments?: AttachmentFile[];
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadConversation() {
      try {
        const response = await fetch(`/api/conversations/${conversationId}`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          })));
          if (data.conversation.modelId) {
            setModelId(data.conversation.modelId);
          }
        }
      } catch (err) {
        console.error('Failed to load conversation:', err);
      } finally {
        setLoading(false);
      }
    }
    loadConversation();
  }, [conversationId, setModelId]);

  async function handleSend(content: string, fileIds?: string[], editedContents?: Map<string, string>) {
    // Inject file content if files are attached (CHAT-01, CHAT-05)
    let enrichedContent = content;
    const attachments: AttachmentFile[] = [];
    if (fileIds && fileIds.length > 0) {
      try {
        const result = await injectFileContent(content, fileIds, editedContents);
        enrichedContent = result.enrichedContent;
        attachments.push(...result.attachments);
      } catch {
        // If injection fails, send plain message
      }
    }

    const userMessageId = crypto.randomUUID();
    const userMessage = {
      id: userMessageId,
      role: 'user' as const,
      content: enrichedContent,
      attachments: attachments.length > 0 ? attachments : undefined,
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Link files to conversation (D-04): fire-and-forget
      if (fileIds && fileIds.length > 0) {
        Promise.all(
          fileIds.map(fileId =>
            fetch('/api/conversations/files/link', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileId, conversationId, messageId: userMessageId }),
            }).catch(() => {})
          )
        );
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          modelId,
          conversationId,
        }),
      });

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

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantContent || 'Response received',
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-zinc-500">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <ChatList messages={messages} isLoading={isLoading} />
      <ChatInput
        onSend={handleSend}
        modelId={modelId}
        onModelChange={setModelId}
        disabled={isLoading}
      />
    </div>
  );
}
