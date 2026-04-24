## Communication App (UI sabit, backend güçlendirilmiş)

Bu proje Next.js UI + Socket.IO backend içerir. Arayüz tasarımına dokunmadan backend tarafında:
- Modüler socket handler yapısı
- Payload doğrulama (zod)
- Token tabanlı socket auth
- CORS allow-list
- JSON tabanlı persistence (mesaj geçmişi + oda eventleri)
- Healthcheck endpoint (`/healthz`)

eklendi.

## Kurulum

```bash
npm install
cp .env.example .env
```

## Geliştirme (tek komut)

```bash
npm run dev
```

Bu komut aynı anda:
- Next.js app (`http://localhost:3000`)
- Socket server (`http://localhost:3001`)

çalıştırır.

## Production benzeri başlatma

```bash
npm run build
npm run start
```

Sadece socket backend çalıştırmak için:

```bash
npm run start:socket:only
```

## Ortam Değişkenleri

`NEXT_PUBLIC_SOCKET_SERVER_URL`: Frontend'in bağlanacağı socket backend adresi  
`NEXT_PUBLIC_SOCKET_PATH`: Socket.IO path (`/socket.io`)  
`NEXT_PUBLIC_SOCKET_AUTH_TOKEN`: Frontend handshake auth token  
`SOCKET_AUTH_TOKEN`: Backend tarafındaki beklenen token  
`ALLOWED_ORIGINS`: CORS için izinli origin listesi (virgülle ayrılmış)  
`PERSISTENCE_FILE`: Kalıcı veri dosya yolu  
`PORT`: Socket server portu

## Backend Dosya Yapısı

- `server.js`: backend giriş noktası
- `backend/config/env.js`: env ve CORS konfigürasyonu
- `backend/http/createHttpServer.js`: health endpoint
- `backend/socket/registerSocketHandlers.js`: tüm socket event handler'ları
- `backend/state/memoryState.js`: anlık kullanıcı/oda state'i
- `backend/persistence/jsonStore.js`: persistence katmanı
- `backend/validation/schemas.js`: event payload şemaları

## Healthcheck

Socket backend ayakta mı kontrol etmek için:

```bash
curl http://localhost:3001/healthz
```

Beklenen çıktı:

```json
{"status":"ok"}
```

## Notlar

- UI bileşenlerinde görsel düzen değiştirilmedi.
- `Dürt! (Herkesi)` artık backend'de aynı odadaki tüm diğer kullanıcılara gönderilir.
