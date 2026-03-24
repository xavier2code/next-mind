'use client';

import { useState, useEffect } from 'react';

const DEFAULT_MODEL = 'qwen3.5-turbo';
const STORAGE_KEY = 'preferred-model';

export function useModelPreference() {
  const [modelId, setModelId] = useState(DEFAULT_MODEL);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setModelId(saved);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, modelId);
    }
  }, [modelId, mounted]);

  return { modelId, setModelId, mounted };
}
