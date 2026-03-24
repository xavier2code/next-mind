'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AVAILABLE_MODELS } from '@/types';

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('preferred-model');
    if (saved && AVAILABLE_MODELS.find((m) => m.id === saved)) {
      onChange(saved);
    }
  }, [onChange]);

  useEffect(() => {
    if (mounted && value) {
      localStorage.setItem('preferred-model', value);
    }
  }, [value, mounted]);

  if (!mounted) {
    return <div className="w-[180px] h-9 bg-zinc-100 rounded-md" />;
  }

  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger className="w-[180px] h-9">
        <SelectValue placeholder="Select model" />
      </SelectTrigger>
      <SelectContent>
        {AVAILABLE_MODELS.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            <span className="font-medium">{model.name}</span>
            <span className="text-zinc-500 ml-2 text-xs">
              {model.provider.toUpperCase()}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
