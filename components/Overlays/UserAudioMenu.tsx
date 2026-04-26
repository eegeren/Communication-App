"use client";

interface UserAudioMenuProps {
  userName: string;
  x: number;
  y: number;
  volume: number;
  onVolumeChange: (value: number) => void;
  onModerate?: (action: "mute" | "kick" | "ban") => void;
}

export default function UserAudioMenu({
  userName,
  x,
  y,
  volume,
  onVolumeChange,
  onModerate,
}: UserAudioMenuProps) {
  return (
    <div
      className="fixed z-[95] w-56 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-2xl"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-xs text-slate-300 font-semibold mb-2 truncate">{userName} sesi</p>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(volume * 100)}
        onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
        className="w-full"
      />
      <p className="text-[10px] text-slate-500 mt-1">{Math.round(volume * 100)}%</p>
      {onModerate ? (
        <div className="mt-3 space-y-1">
          <button
            className="w-full text-left text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
            onClick={() => onModerate("mute")}
          >
            Mikrofonu Sustur
          </button>
          <button
            className="w-full text-left text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
            onClick={() => onModerate("kick")}
          >
            Odadan At
          </button>
          <button
            className="w-full text-left text-xs px-2 py-1 rounded bg-rose-700/70 hover:bg-rose-700"
            onClick={() => onModerate("ban")}
          >
            Sunucudan Banla
          </button>
        </div>
      ) : null}
    </div>
  );
}
