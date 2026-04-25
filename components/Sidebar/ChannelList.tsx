"use client";
import React from "react";

export default function ChannelList({ 
  rooms, 
  currentRoom, 
  handleJoinRoom, 
  socket, 
  currentServer, 
  userName, 
  setIsJoined,
  onOpenProfile // Yeni eklenen prop
}: any) {
  const categories = ["GENEL", "OYUN", "SESLİ"];

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
      <div className="p-6 border-b border-slate-800 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-black text-rose-500 tracking-tighter italic">Dumbasscord</h1>
        <button onClick={() => setIsJoined(false)} className="text-[9px] text-rose-400 hover:underline font-black">ÇIKIŞ</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {/* PROFİL KUTUSU (Tıklanabilir) */}
        <div 
          onClick={onOpenProfile}
          className="bg-slate-800/40 p-3 rounded-2xl border border-slate-700/50 mb-4 cursor-pointer hover:bg-slate-800 transition-all group"
        >
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1 group-hover:text-rose-500 transition-all">Profilini Düzenle</p>
          <p className="text-sm font-black text-slate-200 truncate">{userName}</p>
        </div>

        {/* Sunucu Davet Kodu */}
        <div className="bg-slate-800/20 p-3 rounded-xl border border-slate-800/50 mb-2">
          <p className="text-[8px] text-slate-500 font-bold uppercase mb-1">Davet Kodu</p>
          <p className="text-xs font-black text-sky-400">dumbass.link/A78B</p>
        </div>

        {categories.map((cat) => (
          <div key={cat} className="space-y-1">
            <h3 className="text-[10px] font-black text-slate-500 mb-2 uppercase px-2 tracking-widest flex justify-between items-center">
              {cat} <span className="cursor-pointer hover:text-white text-lg">+</span>
            </h3>
            
            {rooms.map((room: any) => (
              <div key={room.name} className="group flex items-center gap-2">
                <button 
                  onClick={() => handleJoinRoom(room.name)}
                  className={`flex-1 flex items-center justify-between p-2.5 rounded-xl transition-all font-bold text-sm ${
                    currentRoom === room.name ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-slate-500 font-black">#</span> 
                    <span className="truncate">{room.name}</span>
                  </div>
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}