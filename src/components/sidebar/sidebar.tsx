'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PanelLeftClose, PanelLeft, Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SearchInput } from './search-input';
import { ConversationList } from './conversation-list';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

export function Sidebar({ open, onToggle }: SidebarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleNewChat = () => {
    router.push('/');
  };

  return (
    <aside
      className={`h-full bg-zinc-100 border-r border-zinc-200 transition-all duration-300 ${
        open ? 'w-64' : 'w-0 overflow-hidden'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200">
          <h1 className="font-semibold text-lg">Next-Mind</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8"
          >
            {open ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <Button
            onClick={handleNewChat}
            className="w-full justify-start gap-2"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            New chat
          </Button>
        </div>

        {/* Search */}
        <div className="px-4 pb-2">
          <SearchInput value={searchQuery} onChange={setSearchQuery} />
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1 px-2">
          <ConversationList searchQuery={searchQuery} />
        </ScrollArea>
      </div>
    </aside>
  );
}
