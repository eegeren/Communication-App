"use client";
import React from "react";

interface ServerListProps {
  servers: { id: string; name: string }[];
  currentServer: string;
  setCurrentServer: (id: string) => void;
  onRequestCreateServer: () => void;
  onRequestDeleteServer: (serverId: string, serverName: string) => void;
  onRequestClearAll: () => void;
}

export default function ServerList({
  servers,
  currentServer,
  setCurrentServer,
  onRequestCreateServer,
  onRequestDeleteServer,
  onRequestClearAll,
}: ServerListProps) {
  return (
    <div className="w-full md:w-20 bg-slate-950 border-b md:border-b-0 md:border-r border-slate-900 flex md:flex-col items-center md:items-center py-2 md:py-4 px-2 md:px-0 gap-2 md:gap-3 shrink-0 overflow-x-auto md:overflow-x-visible">
      {servers.map((s) => (
        <div key={s.id} className="relative group shrink-0">
          <button
            onClick={() => setCurrentServer(s.id)}
            className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl md:rounded-[24px] md:hover:rounded-2xl transition-all duration-300 flex items-center justify-center font-black text-sm md:text-lg ${
              currentServer === s.id ? "bg-rose-600 text-white" : "bg-slate-800 text-slate-400"
            }`}
          >
            {s.name[0].toUpperCase()}
          </button>
          {s.id !== "default" ? (
            <button
              onClick={() => onRequestDeleteServer(s.id, s.name)}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-800 text-rose-400 text-[10px] font-black opacity-0 group-hover:opacity-100 transition-all border border-slate-700 hover:bg-rose-600 hover:text-white"
              title="Sunucuyu sil"
            >
              ×
            </button>
          ) : null}
        </div>
      ))}
      <button
        onClick={onRequestCreateServer}
        className="w-10 h-10 md:w-12 md:h-12 rounded-2xl md:rounded-[24px] md:hover:rounded-2xl transition-all bg-emerald-600 text-white font-black text-xl md:text-2xl shadow-lg shrink-0"
        title="Sunucu ekle"
      >
        +
      </button>
      <button
        onClick={onRequestClearAll}
        className="w-10 h-10 md:w-12 md:h-12 rounded-2xl md:rounded-[24px] md:hover:rounded-2xl transition-all bg-slate-800 text-rose-400 font-black text-base md:text-lg shadow-lg shrink-0"
        title="Tüm sunucu ve odaları temizle"
      >
        ⌫
      </button>
    </div>
  );
}