'use client';
import React from 'react';
import { Modal } from './Modal';

interface ProofViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  caption?: string | null;
}

export function ProofViewerModal({ isOpen, onClose, imageUrl, caption }: ProofViewerModalProps) {
  if (!imageUrl) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Submitted Evidence Proof" maxWidth="lg">
      <div className="space-y-4 text-center">
        <div className="relative rounded-[20px] overflow-hidden border border-[#FAD7E0] bg-[#FFF3F5] flex items-center justify-center min-h-[260px] max-h-[500px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Study Proof"
            className="w-full h-auto max-h-[480px] object-contain rounded-[20px]"
          />
        </div>
        {caption && (
          <p className="text-sm font-medium text-[#66545B] bg-[#FFF3F5] p-3 rounded-[16px] border border-[#FFE4EB]">
            💬 {caption}
          </p>
        )}
      </div>
    </Modal>
  );
}
