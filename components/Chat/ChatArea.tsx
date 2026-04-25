"use client";
import React, { useState } from "react";

export default function ChatArea({ messages, newMessage, setNewMessage, sendMessage, userName, currentRoom }: any) {
  return (
    <div className="flex-1 flex flex-col bg-slate-950">
      <div className="p-4 border-b border-slate-900 bg-slate-900/20 flex justify-between items-center shadow-sm">
        <h2 className="font-black text-sm uppercase tracking-widest"># {currentRoom || "Kanal Seçilmedi"}</h2>
        <div className="flex gap-4 text-slate-500 text-xs font-bold uppercase">
          <span className="hover:text-white cursor-pointer">Duyurular</span>
          <span className="hover:text-white cursor-pointer">Sabitlenenler</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {messages.map((m: any, i: number) => (
          <div key={i} className="group flex flex-col hover:bg-slate-900/30 p-2 rounded-2xl transition-all relative">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-black uppercase ${m.sender === userName ? 'text-sky-500' : 'text-rose-500'}`}>
                {m.sender}
              </span>
              <span className="text-[8px] text-slate-600 font-bold uppercase">Bugün 20:15</span>
              {/* Rol Etiketi */}
              <span className="text-[7px] bg-slate-800 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20 font-black">ADMIN</span>
            </div>
            <div className="text-sm text-slate-300 leading-relaxed pr-20">
              {m.text}
            </div>
            {/* Mesaj Moderasyon Menüsü */}
            <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 flex gap-2 transition-all">
              <button className="text-[9px] font-black text-slate-500 hover:text-white">DÜZENLE</button>
              <button className="text-[9px] font-black text-rose-600 hover:text-rose-400">SİL</button>
            </div>
          </div>
        ))}
      </div>

      {/* Typing Indicator */}
      <div className="px-6 py-1 text-[10px] text-slate-500 italic font-medium h-4">
        {/* Şimdilik statik, backend'den "typing" event'i gelince dolacak */}
        yusuf yazıyor...
      </div>

      <div className="p-4 bg-slate-950">
        <form onSubmit={sendMessage} className="bg-slate-900 rounded-2xl flex items-center p-2 border border-slate-800 focus-within:border-sky-500 transition-all shadow-2xl">
          <button type="button" className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-sky-500 text-2xl">+</button>
          <input 
            type="text" 
            placeholder={`#${currentRoom} kanalına mesaj gönder`} 
            className="flex-1 bg-transparent border-none outline-none text-sm px-2 py-3 text-white placeholder:text-slate-600"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button type="submit" className="bg-sky-600 text-white w-10 h-10 rounded-xl font-bold hover:scale-110 active:scale-95 transition-all shadow-lg">❯</button>
        </form>
      </div>
    </div>
  );
}