import React from 'react';
import { Loader2 } from 'lucide-react';

export function Loading({ message = 'Loading Study Space…' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <Loader2 className="w-8 h-8 text-[#E84D72] animate-spin" />
      <p className="text-sm font-semibold text-white/90">{message}</p>
    </div>
  );
}
