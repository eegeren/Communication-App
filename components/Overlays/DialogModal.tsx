"use client";

type DialogState =
  | { type: "create-server" }
  | { type: "create-room" }
  | { type: "delete-server"; serverId: string; serverName: string }
  | { type: "delete-room"; roomName: string }
  | { type: "clear-all" }
  | null;

interface DialogModalProps {
  dialog: DialogState;
  value: string;
  onValueChange: (value: string) => void;
  onClose: () => void;
  onSubmitCreate: () => void;
  onSubmitDelete: () => void;
}

export default function DialogModal({
  dialog,
  value,
  onValueChange,
  onClose,
  onSubmitCreate,
  onSubmitDelete,
}: DialogModalProps) {
  if (!dialog) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl p-6">
        {dialog.type === "create-server" || dialog.type === "create-room" ? (
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
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              placeholder={dialog.type === "create-server" ? "Örn: Gölge Takım" : "Örn: genel-sohbet"}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-rose-500"
            />
            <div className="mt-6 flex gap-3 justify-end">
              <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700">
                Vazgeç
              </button>
              <button
                onClick={onSubmitCreate}
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
              <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700">
                İptal
              </button>
              <button
                onClick={onSubmitDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-500 font-bold"
              >
                Sil
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
