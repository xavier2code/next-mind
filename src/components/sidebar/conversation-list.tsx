'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { MessageSquare, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Conversation } from '@/lib/db/schema';

interface ConversationListProps {
  searchQuery: string;
}

export function ConversationList({ searchQuery }: ConversationListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const currentId = pathname.split('/')[1];

  useEffect(() => {
    fetchConversations();
  }, [searchQuery]);

  async function fetchConversations() {
    try {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.set('search', searchQuery);
      }

      const response = await fetch(`/api/conversations?${params}`);
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentId === id) {
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    } finally {
      setDeleteId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-zinc-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <MessageSquare className="h-8 w-8 text-zinc-300 mb-2" />
        <p className="text-zinc-400 text-sm">
          {searchQuery ? 'No conversations found' : 'No conversations yet'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1 py-2">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
              currentId === conversation.id
                ? 'bg-zinc-200'
                : 'hover:bg-zinc-200'
            }`}
            onClick={() => router.push(`/${conversation.id}`)}
          >
            <MessageSquare className="h-4 w-4 text-zinc-500 flex-shrink-0" />
            <span className="flex-1 truncate text-sm">{conversation.title}</span>
            <DropdownMenu>
              <DropdownMenuTrigger className="h-6 w-6 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                <MoreHorizontal className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId(conversation.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete conversation?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the conversation
              and all its messages.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
