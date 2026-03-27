'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/sidebar/sidebar';

export default function FilesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-white">
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <main className="flex-1 transition-all duration-300">
        {children}
      </main>
    </div>
  );
}
