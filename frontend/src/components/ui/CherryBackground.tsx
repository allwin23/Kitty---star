'use client';
import React from 'react';

export function CherryBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
      {/* Base Cherry Background */}
      <div className="absolute inset-0 bg-[#F63E5F]" />
      
      {/* SVG Notebook Grid Overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-35" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="notebookGrid" width="68" height="68" patternUnits="userSpaceOnUse">
            <path d="M 68 0 L 0 0 0 68" fill="none" stroke="#FFE4EB" strokeWidth="1.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#notebookGrid)" />
      </svg>
      
      {/* Subtle radial glow accents */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-pink-400/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] rounded-full bg-rose-600/30 blur-3xl pointer-events-none" />
    </div>
  );
}
