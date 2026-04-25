"use client";
import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

// IMPORTLAR
import AuthContainer from "../components/auth/authContainer";
import ServerList from "../components/Sidebar/ServerList";
import ChannelList from "../components/Sidebar/ChannelList";
import ControlBar from "../components/Voice/ControlBar";
import UserList from "../components/Chat/UserList";
import ProfileModal from "../components/Profile/ProfileModal"; // Modal'ı ekle

const socketServerUrl = "https://communication-app-production.up.railway.app";
const socketPath = "/socket.io";
const socket = io(socketServerUrl, { path: socketPath, transports: ["websocket", "polling"], withCredentials: true });

export default function Home() {
  // --- TEMEL DURUMLAR ---
  const [isJoined, setIsJoined] = useState(false);
  const [email, setEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [isProfileOpen, setIsProfileOpen] = useState(false); // Profil Modal Durumu

  // --- SİSTEM DURUMLARI ---
  const [servers, setServers] = useState<any[]>([]);
  const [currentServer, setCurrentServer] = useState("default");
  const [currentRoom, setCurrentRoom] = useState("");
  const [activeRooms, setActiveRooms] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [userVolumes, setUserVolumes] = useState<{ [key: string]: number }>({});
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, userId: string } | null>(null);

  const localStream = useRef<MediaStream | null>(null);
  const remoteAudios = useRef<{ [key: string]: HTMLAudioElement }>({});

  useEffect(() => {
    socket.on("server-list", (list) => setServers(list));
    socket.on("room-list", (rooms) => setActiveRooms(rooms));
    socket.on("user-list", (list) => setUsers(list));
    socket.on("connect", () => socket.emit("request-state"));
    
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    return () => { socket.off(); window.removeEventListener("click", closeMenu); };
  }, []);

  const handleJoinRoom = async (roomName: string) => {
    if (!roomName.trim() || roomName === currentRoom) return;
    if (!localStream.current) {
      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    socket.emit("join-room", { roomId: roomName, userName, serverId: currentServer }, (res: any) => {
      if (res?.ok) setCurrentRoom(roomName);
    });
  };

  const toggleDeafen = () => {
    const status = !isDeafened; setIsDeafened(status);
    if (status) { setIsMuted(true); if (localStream.current) localStream.current.getAudioTracks()[0].enabled = false; socket.emit("mute-status", true); }
    socket.emit("deafen-status", status);
    Object.values(remoteAudios.current).forEach(a => a.muted = status);
  };

  const toggleMute = () => {
    if (isDeafened) return;
    const status = !isMuted; setIsMuted(status);
    if (localStream.current) localStream.current.getAudioTracks()[0].enabled = !status;
    socket.emit("mute-status", status);
  };

  const handleContextMenu = (e: React.MouseEvent, userId: string) => {
    e.preventDefault();
    if (userId !== socket.id) setContextMenu({ x: e.pageX, y: e.pageY, userId });
  };

  if (!isJoined) return <AuthContainer onJoin={(m: string, n: string) => { setEmail(m); setUserName(n); setIsJoined(true); }} />;

  return (
    <div className="flex h-screen bg-slate-950 text-white font-sans overflow-hidden">
      
      {/* PROFİL MODAL (En dışta hazır bekler) */}
      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        userData={{ name: userName, bio: "" }} 
        onSave={(newData: any) => {
          setUserName(newData.name);
          setIsProfileOpen(false);
        }} 
      />

      <ServerList servers={servers} currentServer={currentServer} setCurrentServer={setCurrentServer} socket={socket} userName={userName} />
      
      <div className="flex flex-col">
        <ChannelList 
          rooms={activeRooms.filter(r => (r.serverId || "default") === currentServer)} 
          currentRoom={currentRoom} 
          handleJoinRoom={handleJoinRoom} 
          socket={socket} 
          currentServer={currentServer} 
          userName={userName} 
          setIsJoined={setIsJoined}
          onOpenProfile={() => setIsProfileOpen(true)} // Modal'ı tetikler
        />

        <ControlBar isMuted={isMuted} isDeafened={isDeafened} toggleMute={toggleMute} toggleDeafen={toggleDeafen} />
      </div>

      <div className="flex-1 flex bg-slate-950 p-8 overflow-y-auto">
        {currentRoom && (
          <UserList users={users} socket={socket} isDeafened={isDeafened} isMuted={isMuted} handleContextMenu={handleContextMenu} />
        )}
      </div>

      {contextMenu && (
        <div className="fixed z-50 bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl p-2 w-48" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <button onClick={() => socket.emit("send-nudge", contextMenu.userId)} className="w-full text-left p-3 hover:bg-amber-500 rounded-xl text-xs font-black uppercase">👉 Dürt!</button>
          <div className="p-3 border-t border-slate-800">
            <input type="range" min="0" max="1" step="0.1" className="w-full" onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (remoteAudios.current[contextMenu.userId]) remoteAudios.current[contextMenu.userId].volume = v;
            }} />
          </div>
        </div>
      )}
    </div>
  );
}