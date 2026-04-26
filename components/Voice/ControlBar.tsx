"use client";
import React from "react";

interface ControlBarProps {
  isMuted: boolean;
  isDeafened: boolean;
  toggleMute: () => void;
  toggleDeafen: () => void;
}

function MicIcon({ crossed }: { crossed: boolean }) {
  return (
    <span className="relative inline-flex items-center justify-center w-5 h-5">
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 1 0 6 0V6a3 3 0 0 0-3-3zm-7 8a1 1 0 0 1 2 0 5 5 0 1 0 10 0 1 1 0 1 1 2 0 7 7 0 0 1-6 6.92V21h3a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h3v-3.08A7 7 0 0 1 5 11z" />
      </svg>
      {crossed ? <span className="absolute w-6 h-0.5 bg-white rotate-[-35deg]" /> : null}
    </span>
  );
}

function HeadphoneIcon({ crossed }: { crossed: boolean }) {
  return (
    <span className="relative inline-flex items-center justify-center w-5 h-5">
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M12 3a8 8 0 0 0-8 8v3a3 3 0 0 0 3 3h1a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H6a6 6 0 0 1 12 0h-2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1a3 3 0 0 0 3-3v-3a8 8 0 0 0-8-8z" />
      </svg>
      {crossed ? <span className="absolute w-6 h-0.5 bg-white rotate-[-35deg]" /> : null}
    </span>
  );
}

export default function ControlBar({ isMuted, isDeafened, toggleMute, toggleDeafen }: ControlBarProps) {

  return (
    <div className="p-4 bg-slate-800/50 border-t border-slate-800 space-y-3 shrink-0">
      <button onClick={toggleDeafen} className={`w-full p-4 rounded-2xl font-black text-[10px] uppercase shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2 ${isDeafened ? 'bg-amber-500 text-slate-900' : 'bg-slate-700'}`}>
        <HeadphoneIcon crossed={isDeafened} />
        {isDeafened ? "Kulaklığı Aç" : "Kulaklığı Sustur"}
      </button>
      <button onClick={toggleMute} className={`w-full p-4 rounded-2xl font-black text-[10px] uppercase shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2 ${isMuted ? 'bg-rose-600' : 'bg-sky-600'} ${isDeafened ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <MicIcon crossed={isMuted} />
        {isMuted ? "Mikrofonu Aç" : "Mikrofonu Kapat"}
      </button>
    </div>
  );
}