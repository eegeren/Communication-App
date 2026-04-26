"use client";

type SelectedUser = {
  name: string;
  status?: "online" | "idle" | "dnd" | "offline";
};

interface SelectedUserCardProps {
  user: SelectedUser;
  onClose: () => void;
}

function statusLabel(status?: SelectedUser["status"]) {
  if (status === "idle") return "Boşta";
  if (status === "dnd") return "Rahatsız Etmeyin";
  if (status === "offline") return "Çevrimdışı";
  return "Çevrimiçi";
}

export default function SelectedUserCard({ user, onClose }: SelectedUserCardProps) {
  return (
    <div className="fixed right-6 top-6 z-[90] w-64 rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-black text-white truncate">{user.name}</h4>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          ✕
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-2">
        Durum: <span className="font-semibold text-slate-200">{statusLabel(user.status)}</span>
      </p>
      <p className="text-xs text-slate-500 mt-1">Sağ tık ile ses seviyesini ayarlayabilirsin.</p>
    </div>
  );
}
