"use client";
import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

import AuthContainer from "../components/auth/authContainer";
import ServerList from "../components/Sidebar/ServerList";
import ChannelList from "../components/Sidebar/ChannelList";
import ControlBar from "../components/Voice/ControlBar";
import ChatArea from "../components/Chat/ChatArea";
import ProfileModal from "../components/Profile/ProfileModal";

const socketServerUrl = "https://communication-app-production.up.railway.app";
const socketPath = "/socket.io";
const socket = io(socketServerUrl, { path: socketPath, transports: ["websocket", "polling"], withCredentials: true });

type ServerItem = { id: string; name: string };
type RoomItem = { name: string; serverId?: string; count?: number };
type UserItem = {
  id: string;
  name: string;
  roomName?: string;
  isMuted?: boolean;
  isSpeaking?: boolean;
  status?: ProfileStatus | "offline";
};
type ChatMessage = {
  id: number | string;
  sender: string;
  text: string;
  time?: string;
  attachment?: {
    name: string;
    type: string;
    dataUrl: string;
    size: number;
  };
};
type SignalPayload = {
  from: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};
type ProfileStatus = "online" | "idle" | "dnd";
type ProfileState = {
  name: string;
  bio: string;
  avatarUrl?: string | null;
  status: ProfileStatus;
};
type DialogState =
  | { type: "create-server" }
  | { type: "create-room" }
  | { type: "delete-server"; serverId: string; serverName: string }
  | { type: "delete-room"; roomName: string }
  | { type: "clear-all" }
  | null;

export default function Home() {
  const [isJoined, setIsJoined] = useState(false);
  const [userName, setUserName] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileState>({
    name: "",
    bio: "",
    avatarUrl: null,
    status: "online",
  });
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [currentServer, setCurrentServer] = useState("default");
  const [currentRoom, setCurrentRoom] = useState("");
  const [activeRooms, setActiveRooms] = useState<RoomItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dialogInput, setDialogInput] = useState("");
  const [pinnedByRoom, setPinnedByRoom] = useState<Record<string, ChatMessage[]>>({});
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [audioMenu, setAudioMenu] = useState<{
    userId: string;
    userName: string;
    x: number;
    y: number;
  } | null>(null);
  const [userVolumes, setUserVolumes] = useState<Record<string, number>>({});

  const localStream = useRef<MediaStream | null>(null);
  const peerConnections = useRef<{ [key: string]: RTCPeerConnection }>({});
  const remoteAudios = useRef<{ [key: string]: HTMLAudioElement }>({});
  const speakingIntervalRef = useRef<number | null>(null);
  const isSpeakingRef = useRef(false);

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

  const stopSpeakingDetection = () => {
    if (speakingIntervalRef.current) {
      window.clearInterval(speakingIntervalRef.current);
      speakingIntervalRef.current = null;
    }
    if (isSpeakingRef.current) {
      isSpeakingRef.current = false;
      socket.emit("speaking-status", false);
    }
  };

  const startSpeakingDetection = () => {
    if (!localStream.current || speakingIntervalRef.current) {
      return;
    }
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(localStream.current);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const buffer = new Uint8Array(analyser.frequencyBinCount);

    speakingIntervalRef.current = window.setInterval(() => {
      analyser.getByteFrequencyData(buffer);
      const avg = buffer.reduce((sum, value) => sum + value, 0) / buffer.length;
      const speakingNow = avg > 18 && !isMuted && !isDeafened;
      if (speakingNow !== isSpeakingRef.current) {
        isSpeakingRef.current = speakingNow;
        socket.emit("speaking-status", speakingNow);
      }
    }, 250);
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
        audio.volume = userVolumes[peerId] ?? 1;
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
    const handleMessageHistory = (list: ChatMessage[]) => setMessages(list);
    const handleReceiveMessage = (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    };
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
    const handleTypingStatus = ({ userName: typingUser, isTyping }: { userName: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        if (isTyping) {
          if (prev.includes(typingUser)) return prev;
          return [...prev, typingUser];
        }
        return prev.filter((name) => name !== typingUser);
      });
    };
    const handleRoomDeleted = ({ fallbackRoomName }: { fallbackRoomName: string }) => {
      setCurrentRoom(fallbackRoomName);
    };

    socket.on("server-list", handleServerList);
    socket.on("room-list", handleRoomList);
    socket.on("user-list", handleUserList);
    socket.on("message-history", handleMessageHistory);
    socket.on("receive-message", handleReceiveMessage);
    socket.on("typing-status", handleTypingStatus);
    socket.on("room-deleted", handleRoomDeleted);
    socket.on("connect", handleConnect);
    socket.on("user-joined", handleUserJoined);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("user-left", handleUserLeft);

    return () => {
      socket.off("server-list", handleServerList);
      socket.off("room-list", handleRoomList);
      socket.off("user-list", handleUserList);
      socket.off("message-history", handleMessageHistory);
      socket.off("receive-message", handleReceiveMessage);
      socket.off("typing-status", handleTypingStatus);
      socket.off("room-deleted", handleRoomDeleted);
      socket.off("connect", handleConnect);
      socket.off("user-joined", handleUserJoined);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("user-left", handleUserLeft);
      resetVoiceConnections();
      stopSpeakingDetection();
    };
    // refs keep helper functions stable for this subscription lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Object.values(remoteAudios.current).forEach((audio) => {
      audio.muted = isDeafened;
    });
  }, [isDeafened]);

  useEffect(() => {
    Object.entries(remoteAudios.current).forEach(([peerId, audio]) => {
      audio.volume = userVolumes[peerId] ?? 1;
    });
  }, [userVolumes]);

  useEffect(() => {
    const handleWindowClick = () => setAudioMenu(null);
    window.addEventListener("click", handleWindowClick);
    return () => window.removeEventListener("click", handleWindowClick);
  }, []);

  const selectedUser = selectedUserId ? users.find((u) => u.id === selectedUserId) || null : null;

  const handleJoinRoom = async (roomName: string) => {
    if (!roomName.trim() || roomName === currentRoom) return;
    if (!localStream.current) {
      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStream.current.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
      startSpeakingDetection();
    }

    resetVoiceConnections();

    socket.emit("join-room", { roomId: roomName, userName, serverId: currentServer }, (res: { ok?: boolean }) => {
      if (res?.ok) {
        setCurrentRoom(roomName);
        setTypingUsers([]);
        socket.emit("presence-status", profile.status || "online");
      }
    });
  };

  const leaveCurrentRoom = () => {
    if (!currentRoom) {
      return;
    }
    socket.emit("leave-room", {}, (res: { ok?: boolean; error?: string }) => {
      if (!res?.ok) {
        alert(res?.error || "Odadan ayrılamadın.");
        return;
      }
      setCurrentRoom("");
      setTypingUsers([]);
      setMessages([]);
      setSelectedUserId(null);
      setAudioMenu(null);
      resetVoiceConnections();
    });
  };

  const submitCreateRoom = (roomName: string) => {
    socket.emit("create-room", { serverId: currentServer, roomName: roomName.trim(), userName }, (res: { ok?: boolean; error?: string }) => {
      if (!res?.ok) {
        alert(res?.error || "Kanal oluşturulamadı.");
        return;
      }
      setDialog(null);
      setDialogInput("");
    });
  };

  const submitDeleteRoom = (roomName: string) => {
    socket.emit("delete-room", { serverId: currentServer, roomName, userName }, (res: { ok?: boolean; error?: string }) => {
      if (!res?.ok) {
        alert(res?.error || "Kanal silinemedi.");
        return;
      }
      if (currentRoom === roomName) {
        setCurrentRoom("");
      }
      setDialog(null);
    });
  };

  const submitCreateServer = (serverName: string) => {
    socket.emit(
      "create-server",
      { serverName: serverName.trim(), userName },
      (res: { ok?: boolean; error?: string; serverId?: string }) => {
        if (!res?.ok) {
          alert(res?.error || "Sunucu oluşturulamadı.");
          return;
        }
        if (res.serverId) {
          setCurrentServer(res.serverId);
        }
        setDialog(null);
        setDialogInput("");
      }
    );
  };

  const submitDeleteServer = (serverId: string) => {
    socket.emit(
      "delete-server",
      { serverId, actorUserName: userName },
      (res: { ok?: boolean; error?: string }) => {
        if (!res?.ok) {
          alert(res?.error || "Sunucu silinemedi.");
          return;
        }
        if (currentServer === serverId) {
          setCurrentServer("default");
          setCurrentRoom("");
        }
        setDialog(null);
      }
    );
  };

  const submitClearAll = () => {
    const allRooms = activeRooms.filter((room) => room.name !== "genel");
    const nonDefaultServers = servers.filter((server) => server.id !== "default");

    allRooms.forEach((room) => {
      socket.emit("delete-room", { serverId: room.serverId || "default", roomName: room.name, userName });
    });
    nonDefaultServers.forEach((server) => {
      socket.emit("delete-server", { serverId: server.id, actorUserName: userName });
    });

    setCurrentServer("default");
    setCurrentRoom("");
    setDialog(null);
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
      socket.emit("speaking-status", false);
    } else {
      setIsMuted(false);
      if (localStream.current) {
        localStream.current.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
      }
      socket.emit("mute-status", false);
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
    if (status) {
      socket.emit("speaking-status", false);
    }
  };

  const sendMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentRoom || !newMessage.trim()) return;
    socket.emit("send-message", { text: newMessage.trim() }, (res: { ok?: boolean }) => {
      if (res?.ok) {
        setNewMessage("");
        socket.emit("typing-status", { roomId: currentRoom, serverId: currentServer, userName, isTyping: false });
      }
    });
  };

  const handleFilePick = (file: File) => {
    if (!currentRoom) {
      return;
    }
    if (file.size > 1024 * 1024) {
      alert("Dosya boyutu en fazla 1 MB olabilir.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) {
        alert("Dosya okunamadı.");
        return;
      }
      socket.emit(
        "send-message",
        {
          text: "",
          attachment: {
            name: file.name,
            type: file.type || "application/octet-stream",
            dataUrl,
            size: file.size,
          },
        },
        (res: { ok?: boolean; error?: string }) => {
          if (!res?.ok) {
            alert(res?.error || "Dosya gönderilemedi.");
          }
        }
      );
    };
    reader.readAsDataURL(file);
  };

  const handleMessageInput = (value: string) => {
    setNewMessage(value);
    if (!currentRoom) return;
    socket.emit("typing-status", { roomId: currentRoom, serverId: currentServer, userName, isTyping: value.trim().length > 0 });
  };

  const handleServerChange = (nextServerId: string) => {
    setCurrentServer(nextServerId);
    setCurrentRoom("");
    setUsers([]);
    setMessages([]);
    setTypingUsers([]);
    resetVoiceConnections();
    setSelectedUserId(null);
    setAudioMenu(null);
  };

  const togglePinMessage = (message: ChatMessage) => {
    if (!currentRoom) {
      return;
    }
    setPinnedByRoom((prev) => {
      const current = prev[currentRoom] || [];
      const alreadyPinned = current.some((item) => item.id === message.id);
      return {
        ...prev,
        [currentRoom]: alreadyPinned
          ? current.filter((item) => item.id !== message.id)
          : [...current, message],
      };
    });
  };

  const isPinned = (messageId: number | string) => {
    if (!currentRoom) {
      return false;
    }
    return (pinnedByRoom[currentRoom] || []).some((item) => item.id === messageId);
  };

  const typingLabel = typingUsers.length
    ? `${typingUsers.slice(0, 2).join(", ")} yazıyor${typingUsers.length > 2 ? "..." : ""}`
    : "";

  const handleProfileSave = async (newData: {
    name: string;
    bio: string;
    status?: ProfileStatus;
    avatarUrl?: string | null;
  }) => {
    try {
      const response = await fetch(`${socketServerUrl}/auth/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          userName: newData.name,
          bio: newData.bio,
          status: newData.status || "online",
          avatarUrl: newData.avatarUrl || "",
        }),
        credentials: "include",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Profil güncellenemedi.");
      }
      const updated = payload.user;
      setUserName(updated.userName);
      setProfile({
        name: updated.userName,
        bio: updated.bio || "",
        avatarUrl: updated.avatarUrl || null,
        status: (updated.status || "online") as ProfileStatus,
      });
      socket.emit("presence-status", (updated.status || "online") as ProfileStatus);
      setIsProfileOpen(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Profil güncellenemedi.");
    }
  };

  if (!isJoined) {
    return (
      <AuthContainer
        onJoin={(
          _email: string,
          n: string,
          token?: string,
          avatarUrl?: string | null,
          bio?: string,
          status?: ProfileStatus
        ) => {
          setUserName(n);
          setAuthToken(token || "");
          setProfile({
            name: n,
            bio: bio || "",
            avatarUrl: avatarUrl || null,
            status: status || "online",
          });
          setIsJoined(true);
        }}
      />
    );
  }

  return (
    <div className="flex h-screen max-h-screen bg-slate-950 text-white font-sans overflow-hidden">
      <ProfileModal
        key={`${isProfileOpen}-${profile.name}-${profile.status}-${profile.avatarUrl || ""}`}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userData={{
          name: profile.name || userName,
          bio: profile.bio,
          avatarUrl: profile.avatarUrl,
          status: profile.status,
        }}
        onSave={handleProfileSave}
      />

      <ServerList
        servers={servers}
        currentServer={currentServer}
        setCurrentServer={handleServerChange}
        onRequestCreateServer={() => {
          setDialogInput("");
          setDialog({ type: "create-server" });
        }}
        onRequestDeleteServer={(serverId: string, serverName: string) =>
          setDialog({ type: "delete-server", serverId, serverName })
        }
        onRequestClearAll={() => setDialog({ type: "clear-all" })}
      />

      <div className="w-72 min-w-72 h-full flex flex-col border-r border-slate-800">
        <ChannelList
          rooms={activeRooms.filter((r) => (r.serverId || "default") === currentServer)}
          currentRoom={currentRoom}
          handleJoinRoom={handleJoinRoom}
          handleCreateRoom={() => {
            setDialogInput("");
            setDialog({ type: "create-room" });
          }}
          handleDeleteRoom={(roomName: string) => setDialog({ type: "delete-room", roomName })}
          currentUserId={socket.id || ""}
          users={users}
          userName={userName}
          userStatus={profile.status}
          setIsJoined={setIsJoined}
          onOpenProfile={() => setIsProfileOpen(true)}
          onLeaveRoom={leaveCurrentRoom}
          onSelectUser={(selected) => setSelectedUserId(selected.id)}
          onOpenUserAudioMenu={(selected, x, y) =>
            setAudioMenu({ userId: selected.id, userName: selected.name, x, y })
          }
        />

        <ControlBar isMuted={isMuted} isDeafened={isDeafened} toggleMute={toggleMute} toggleDeafen={toggleDeafen} />
      </div>

      <div className="flex-1 flex bg-slate-950 p-4 md:p-8 overflow-y-auto min-w-0">
        <ChatArea
          messages={messages}
          newMessage={newMessage}
          setNewMessage={handleMessageInput}
          sendMessage={sendMessage}
          userName={userName}
          currentRoom={currentRoom}
          typingLabel={typingLabel}
          pinnedMessages={currentRoom ? pinnedByRoom[currentRoom] || [] : []}
          onTogglePinMessage={togglePinMessage}
          isPinned={isPinned}
          onPickFile={handleFilePick}
        />
      </div>

      {selectedUser ? (
        <div className="fixed right-6 top-6 z-[90] w-64 rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-white truncate">{selectedUser.name}</h4>
            <button onClick={() => setSelectedUserId(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Durum:{" "}
            <span className="font-semibold text-slate-200">
              {selectedUser.status === "idle"
                ? "Boşta"
                : selectedUser.status === "dnd"
                  ? "Rahatsız Etmeyin"
                  : "Çevrimiçi"}
            </span>
          </p>
          <p className="text-xs text-slate-500 mt-1">Sağ tık ile ses seviyesini ayarlayabilirsin.</p>
        </div>
      ) : null}

      {audioMenu ? (
        <div
          className="fixed z-[95] w-56 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-2xl"
          style={{ left: audioMenu.x, top: audioMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs text-slate-300 font-semibold mb-2 truncate">{audioMenu.userName} sesi</p>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((userVolumes[audioMenu.userId] ?? 1) * 100)}
            onChange={(e) => {
              const volume = Number(e.target.value) / 100;
              setUserVolumes((prev) => ({ ...prev, [audioMenu.userId]: volume }));
            }}
            className="w-full"
          />
          <p className="text-[10px] text-slate-500 mt-1">
            {(Math.round((userVolumes[audioMenu.userId] ?? 1) * 100))}%
          </p>
        </div>
      ) : null}

      {dialog ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl p-6">
            {(dialog.type === "create-server" || dialog.type === "create-room") ? (
              <>
                <h3 className="text-xl font-black text-white mb-2">
                  {dialog.type === "create-server" ? "Yeni Sunucu Oluştur" : "Yeni Oda Oluştur"}
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  {dialog.type === "create-server"
                    ? "Sunucuna kısa ve akılda kalıcı bir isim ver."
                    : "Bu sunucu için yeni oda adı gir."}
                </p>
                <input
                  autoFocus
                  type="text"
                  value={dialogInput}
                  onChange={(e) => setDialogInput(e.target.value)}
                  placeholder={dialog.type === "create-server" ? "Örn: Gölge Takım" : "Örn: genel-sohbet"}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-rose-500"
                />
                <div className="mt-6 flex gap-3 justify-end">
                  <button
                    onClick={() => setDialog(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={() => {
                      const value = dialogInput.trim();
                      if (!value) {
                        return;
                      }
                      if (dialog.type === "create-server") {
                        submitCreateServer(value);
                        return;
                      }
                      submitCreateRoom(value);
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-500 font-bold"
                  >
                    Oluştur
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-black text-white mb-2">
                  {dialog.type === "delete-server"
                    ? "Sunucuyu Sil"
                    : dialog.type === "delete-room"
                      ? "Odayı Sil"
                      : "Hepsini Temizle"}
                </h3>
                <p className="text-sm text-slate-400 mb-6">
                  {dialog.type === "delete-server"
                    ? `#${dialog.serverName} sunucusunu arşive göndereceğiz.`
                    : dialog.type === "delete-room"
                      ? `#${dialog.roomName} odasını arşive göndereceğiz.`
                      : "Tüm sunucular ve odalar temizlenecek. Bu işlem geri alınamaz."}
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setDialog(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    İptal
                  </button>
                  <button
                    onClick={() => {
                      if (dialog.type === "delete-server") {
                        submitDeleteServer(dialog.serverId);
                        return;
                      }
                      if (dialog.type === "delete-room") {
                        submitDeleteRoom(dialog.roomName);
                        return;
                      }
                      submitClearAll();
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-500 font-bold"
                  >
                    Sil
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}