"use client";
import { useState } from "react";

interface AuthProps {
  onJoin: (email: string, userName: string) => void;
}

export default function AuthContainer({ onJoin }: AuthProps) {
  const [isLoginActive, setIsLoginActive] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userName, setUserName] = useState("");

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans overflow-hidden">
      <div className="relative w-full max-w-[900px] h-[600px] bg-slate-900 rounded-[60px] overflow-hidden shadow-2xl border border-slate-800 flex">
        {/* Giriş Formu */}
        <div className={`w-1/2 h-full flex flex-col items-center justify-center p-14 transition-all duration-700 ease-in-out z-10 ${!isLoginActive ? 'translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}`}>
          <h2 className="text-4xl font-black text-rose-500 mb-10 uppercase tracking-tighter">Giriş Yap</h2>
          <div className="w-full space-y-5">
            <input type="email" placeholder="E-posta" className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white outline-none focus:border-rose-500 transition-all placeholder:text-slate-500" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="Şifre" className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white outline-none focus:border-rose-500 transition-all placeholder:text-slate-500" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button onClick={() => email && onJoin(email, email.split('@')[0])} className="w-full bg-rose-600 text-white p-5 rounded-2xl font-black text-lg hover:bg-rose-700 shadow-xl active:scale-95 transition-all">BAĞLAN</button>
          </div>
        </div>

        {/* Kayıt Formu */}
        <div className={`w-1/2 h-full flex flex-col items-center justify-center p-14 transition-all duration-700 ease-in-out z-10 ${isLoginActive ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}`}>
          <h2 className="text-4xl font-black text-sky-500 mb-10 uppercase tracking-tighter">Kayıt Ol</h2>
          <div className="w-full space-y-5">
            <input type="text" placeholder="Takma Ad" className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white outline-none focus:border-sky-500 transition-all placeholder:text-slate-500" value={userName} onChange={(e) => setUserName(e.target.value)} />
            <input type="email" placeholder="E-posta" className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white outline-none focus:border-sky-500 transition-all placeholder:text-slate-500" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="Şifre" className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white outline-none focus:border-sky-500 transition-all placeholder:text-slate-500" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button onClick={() => userName && onJoin(email, userName)} className="w-full bg-sky-600 text-white p-5 rounded-2xl font-black text-lg hover:bg-sky-700 shadow-xl active:scale-95 transition-all">HESAP OLUŞTUR</button>
          </div>
        </div>

        {/* Kayan Kırmızı Overlay */}
        <div className={`absolute top-0 w-1/2 h-full bg-gradient-to-br from-rose-600 to-rose-900 z-20 transition-all duration-700 ease-in-out flex flex-col items-center justify-center text-white px-14 text-center ${isLoginActive ? 'left-1/2 rounded-l-[120px]' : 'left-0 rounded-r-[120px]'}`}>
          <h1 className="text-5xl font-black tracking-tighter mb-6 leading-none uppercase">{isLoginActive ? "TEKRAR SELAM!" : "MERHABA DUMBASS!"}</h1>
          <p className="text-rose-100 text-base mb-10 font-medium leading-relaxed">{isLoginActive ? "Zaten bir hesabın varsa giriş yap ve kaldığın yerden devam et." : "Henüz bir hesabın yoksa hemen kayıt ol ve aramıza katıl!"}</p>
          <button onClick={() => setIsLoginActive(!isLoginActive)} className="border-[3px] border-white px-12 py-4 rounded-full font-black uppercase text-sm hover:bg-white hover:text-rose-700 transition-all active:scale-90 shadow-2xl">{isLoginActive ? "Kayıt Olmaya Git" : "Giriş Yapmaya Git"}</button>
        </div>
      </div>
    </div>
  );
}