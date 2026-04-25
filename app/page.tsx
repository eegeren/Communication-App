"use client";
import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

import AuthContainer from "../components/auth/authContainer";
import ServerList from "../components/Sidebar/ServerList";
import ChannelList from "../components/Sidebar/ChannelList";
import ControlBar from "../components/Voice/ControlBar";
import UserList from "../components/Chat/UserList";
import ProfileModal from "../components/Profile/ProfileModal";

const socketServerUrl = "https://communication-app-production.up.railway.app";
const socketPath = "/socket.io";
const socket = io(socketServerUrl, { path: socketPath, transports: ["websocket", "polling"], withCredentials: true });

type ServerItem = { id: string; name: string };
type RoomItem = { name: string; serverId?: string; count?: number };
type UserItem = { id: string; name: string };
type SignalPayload = {
  from: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

export default function Home() {
  const [isJoined, setIsJoined] = useState(false);
  const [userName, setUserName] = useState("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [currentServer, setCurrentServer] = useState("default");
  const [currentRoom, setCurrentRoom] = useState("");
  const [activeRooms, setActiveRooms] = useState<RoomItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, userId: string } | null>(null);

  const localStream = useRef<MediaStream | null>(null);
  const peerConnections = useRef<{ [key: string]: RTCPeerConnection }>({});
  const remoteAudios = useRef<{ [key: string]: HTMLAudioElement }>({});

  const closePeerConnection = (peerId: string) => {
    if (remoteAudios.current[peerId]) {
      remoteAudios.current[peerId].pause();
      remoteAudios.current[peerId].srcObject = null;
      delete remoteAudios.current[peerId];
    }
    if (peerConnections.current[peerId]) {
      peerConnections.current[peerId].close();
      delete peerConnections.current[peerId];
    }
  };

  const resetVoiceConnections = () => {
    Object.keys(peerConnections.current).forEach((peerId) => closePeerConnection(peerId));
  };

  const createPeerConnection = (peerId: string) => {
    if (peerConnections.current[peerId]) {
      return peerConnections.current[peerId];
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStream.current as MediaStream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { candidate: event.candidate, to: peerId });
      }
    };

    pc.ontrack = (event) => {
      if (!remoteAudios.current[peerId]) {
        const audio = new Audio();
        audio.autoplay = true;
        remoteAudios.current[peerId] = audio;
      }
      remoteAudios.current[peerId].srcObject = event.streams[0];
    };

    pc.onconnectionstatechange = () => {
      if (["closed", "failed", "disconnected"].includes(pc.connectionState)) {
        closePeerConnection(peerId);
      }
    };

    peerConnections.current[peerId] = pc;
    return pc;
  };

  useEffect(() => {
    const handleServerList = (list: ServerItem[]) => setServers(list);
    const handleRoomList = (rooms: RoomItem[]) => setActiveRooms(rooms);
    const handleUserList = (list: UserItem[]) => setUsers(list);
    const handleConnect = () => socket.emit("request-state");
    const handleUserJoined = async (peerId: string) => {
      if (!localStream.current || peerId === socket.id) {
        return;
      }
      const pc = createPeerConnection(peerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", { offer, to: peerId });
    };
    const handleOffer = async ({ offer, from }: SignalPayload) => {
      if (!offer) return;
      const pc = createPeerConnection(from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { answer, to: from });
    };
    const handleAnswer = async ({ answer, from }: SignalPayload) => {
      if (!answer) return;
      const pc = peerConnections.current[from];
      if (!pc) {
        return;
      }
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };
    const handleIceCandidate = async ({ candidate, from }: SignalPayload) => {
      if (!candidate) return;
      const pc = peerConnections.current[from] ?? createPeerConnection(from);
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    };
    const handleUserLeft = (peerId: string) => closePeerConnection(peerId);

    socket.on("server-list", handleServerList);
    socket.on("room-list", handleRoomList);
    socket.on("user-list", handleUserList);
    socket.on("connect", handleConnect);
    socket.on("user-joined", handleUserJoined);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("user-left", handleUserLeft);

    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);

    return () => {
      socket.off("server-list", handleServerList);
      socket.off("room-list", handleRoomList);
      socket.off("user-list", handleUserList);
      socket.off("connect", handleConnect);
      socket.off("user-joined", handleUserJoined);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("user-left", handleUserLeft);
      window.removeEventListener("click", closeMenu);
      resetVoiceConnections();
    };
    // refs keep helper functions stable for this subscription lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Object.values(remoteAudios.current).forEach((audio) => {
      audio.muted = isDeafened;
    });
  }, [isDeafened]);

  const handleJoinRoom = async (roomName: string) => {
    if (!roomName.trim() || roomName === currentRoom) return;
    if (!localStream.current) {
      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStream.current.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }

    resetVoiceConnections();

    socket.emit("join-room", { roomId: roomName, userName, serverId: currentServer }, (res: { ok?: boolean }) => {
      if (res?.ok) {
        setCurrentRoom(roomName);
      }
    });
  };

  const toggleDeafen = () => {
    const status = !isDeafened;
    setIsDeafened(status);
    if (status) {
      setIsMuted(true);
      if (localStream.current) {
        localStream.current.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      socket.emit("mute-status", true);
    }
    Object.values(remoteAudios.current).forEach((audio) => {
      audio.muted = status;
    });
  };

  const toggleMute = () => {
    if (isDeafened) return;
    const status = !isMuted;
    setIsMuted(status);
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach((track) => {
        track.enabled = !status;
      });
    }
    socket.emit("mute-status", status);
  };

  const handleContextMenu = (e: React.MouseEvent, userId: string) => {
    e.preventDefault();
    if (userId !== socket.id) setContextMenu({ x: e.pageX, y: e.pageY, userId });
  };

  const handleServerChange = (nextServerId: string) => {
    setCurrentServer(nextServerId);
    setCurrentRoom("");
    setUsers([]);
    resetVoiceConnections();
  };

  if (!isJoined) return <AuthContainer onJoin={(_email: string, n: string) => { setUserName(n); setIsJoined(true); }} />;

  return (
    <div className="flex h-screen max-h-screen bg-slate-950 text-white font-sans overflow-hidden">
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userData={{ name: userName, bio: "" }}
        onSave={(newData: { name: string }) => {
          setUserName(newData.name);
          setIsProfileOpen(false);
        }}
      />

      <ServerList servers={servers} currentServer={currentServer} setCurrentServer={handleServerChange} socket={socket} userName={userName} />

      <div className="w-72 min-w-72 h-full flex flex-col border-r border-slate-800">
        <ChannelList
          rooms={activeRooms.filter((r) => (r.serverId || "default") === currentServer)}
          currentRoom={currentRoom}
          handleJoinRoom={handleJoinRoom}
          userName={userName}
          setIsJoined={setIsJoined}
          onOpenProfile={() => setIsProfileOpen(true)}
        />

        <ControlBar isMuted={isMuted} isDeafened={isDeafened} toggleMute={toggleMute} toggleDeafen={toggleDeafen} />
      </div>

      <div className="flex-1 flex bg-slate-950 p-4 md:p-8 overflow-y-auto min-w-0">
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