import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { io as createClient } from "socket.io-client";
import { createRealtimeServer } from "../backend/createRealtimeServer";

let server;
let io;
let store;
let baseUrl;

function onceWithTimeout(socket, event, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting ${event}`)), timeout);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function connectClient(url) {
  return new Promise((resolve, reject) => {
    const client = createClient(url, {
      path: "/socket.io",
      transports: ["websocket"],
    });

    client.on("connect", () => resolve(client));
    client.on("connect_error", reject);
  });
}

function emitWithAck(socket, event, payload, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Ack timeout: ${event}`)), timeout);
    socket.emit(event, payload, (response) => {
      clearTimeout(timer);
      resolve(response);
    });
  });
}

beforeAll(async () => {
  const env = {
    port: 0,
    socketPath: "/socket.io",
    serverAuthToken: "",
    clientAuthToken: "",
    socketServerUrl: "",
    allowedOrigins: ["http://localhost:3000"],
    corsOriginValidator: (_origin, callback) => callback(null, true),
    persistenceFile: "backend/persistence/test-data.json",
    databaseUrl: "",
  };

  const app = await createRealtimeServer(env);
  io = app.io;
  store = app.store;
  server = app.httpServer;

  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  io.close();
  await store.close();
  await new Promise((resolve) => server.close(resolve));
});

describe("socket flows", () => {
  it("persists messages and serves room history", async () => {
    const c1 = await connectClient(baseUrl);
    await emitWithAck(c1, "join-room", { roomId: "alpha", userName: "ege" });
    await emitWithAck(c1, "send-message", { text: "selam" });
    await new Promise((r) => setTimeout(r, 150));
    c1.disconnect();

    const c2 = await connectClient(baseUrl);
    const historyPromise = onceWithTimeout(c2, "message-history");
    await emitWithAck(c2, "join-room", { roomId: "alpha", userName: "alice" });
    const history = await historyPromise;

    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);
    expect(history.at(-1).text).toBe("selam");
    c2.disconnect();
  });

  it("supports nudge everyone in same room", async () => {
    const c1 = await connectClient(baseUrl);
    const c2 = await connectClient(baseUrl);

    await emitWithAck(c1, "join-room", { roomId: "beta", userName: "ege" });
    await emitWithAck(c2, "join-room", { roomId: "beta", userName: "ali" });

    const nudgeReceived = onceWithTimeout(c2, "receive-nudge");
    await emitWithAck(c1, "send-nudge", undefined);
    await nudgeReceived;

    c1.disconnect();
    c2.disconnect();
    expect(true).toBe(true);
  });

  it("keeps room names persistent after users leave", async () => {
    const c1 = await connectClient(baseUrl);
    await emitWithAck(c1, "join-room", { roomId: "kalici-oda", userName: "ege" });
    c1.disconnect();

    const c2 = await connectClient(baseUrl);
    const roomListPromise = onceWithTimeout(c2, "room-list");
    await emitWithAck(c2, "join-room", { roomId: "kontrol", userName: "qa" });
    const rooms = await roomListPromise;
    const persisted = rooms.find((room) => room.name === "kalici-oda");
    expect(persisted).toBeTruthy();
    expect(typeof persisted.count).toBe("number");
    c2.disconnect();
  });

  it("allows creating server and room", async () => {
    const c1 = await connectClient(baseUrl);
    const createServerResult = await emitWithAck(c1, "create-server", {
      serverName: "TakimA",
      userName: "ege",
    });
    expect(createServerResult.ok).toBe(true);
    expect(createServerResult.serverId).toBe("takima");

    const createRoomResult = await emitWithAck(c1, "create-room", {
      serverId: "takima",
      roomName: "genel",
      userName: "ege",
    });
    expect(createRoomResult.ok).toBe(true);

    const roomListPromise = onceWithTimeout(c1, "room-list");
    await emitWithAck(c1, "join-room", {
      roomId: "genel",
      serverId: "takima",
      userName: "ege",
    });
    const rooms = await roomListPromise;
    const createdRoom = rooms.find(
      (room) => room.serverId === "takima" && room.name === "genel"
    );
    expect(createdRoom).toBeTruthy();
    c1.disconnect();
  });

  it("blocks non-owner from creating room", async () => {
    const owner = await connectClient(baseUrl);
    const member = await connectClient(baseUrl);

    await emitWithAck(owner, "create-server", {
      serverName: "TakimB",
      userName: "owner",
    });
    await emitWithAck(member, "join-room", {
      roomId: "lobi",
      serverId: "takimb",
      userName: "member",
    });

    const result = await emitWithAck(member, "create-room", {
      serverId: "takimb",
      roomName: "yeni-oda",
      userName: "member",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/owner\/admin/i);

    owner.disconnect();
    member.disconnect();
  });

  it("owner can promote and demote admin", async () => {
    const owner = await connectClient(baseUrl);
    const member = await connectClient(baseUrl);

    await emitWithAck(owner, "create-server", {
      serverName: "TakimC",
      userName: "ownerx",
    });
    await emitWithAck(member, "join-room", {
      roomId: "lobi",
      serverId: "takimc",
      userName: "memberx",
    });

    const promote = await emitWithAck(owner, "promote-user", {
      serverId: "takimc",
      actorUserName: "ownerx",
      targetUserName: "memberx",
    });
    expect(promote.ok).toBe(true);

    const createAfterPromote = await emitWithAck(member, "create-room", {
      serverId: "takimc",
      roomName: "admin-oda",
      userName: "memberx",
    });
    expect(createAfterPromote.ok).toBe(true);

    const demote = await emitWithAck(owner, "demote-user", {
      serverId: "takimc",
      actorUserName: "ownerx",
      targetUserName: "memberx",
    });
    expect(demote.ok).toBe(true);

    const createAfterDemote = await emitWithAck(member, "create-room", {
      serverId: "takimc",
      roomName: "engelli-oda",
      userName: "memberx",
    });
    expect(createAfterDemote.ok).toBe(false);

    owner.disconnect();
    member.disconnect();
  });

  it("owner can transfer ownership", async () => {
    const owner = await connectClient(baseUrl);
    const member = await connectClient(baseUrl);

    await emitWithAck(owner, "create-server", {
      serverName: "TakimD",
      userName: "ownerd",
    });
    await emitWithAck(member, "join-room", {
      roomId: "lobi",
      serverId: "takimd",
      userName: "memberd",
    });

    const transfer = await emitWithAck(owner, "transfer-owner", {
      serverId: "takimd",
      actorUserName: "ownerd",
      targetUserName: "memberd",
    });
    expect(transfer.ok).toBe(true);

    const ownerCreateResult = await emitWithAck(owner, "create-room", {
      serverId: "takimd",
      roomName: "admin-oda",
      userName: "ownerd",
    });
    expect(ownerCreateResult.ok).toBe(true);

    const oldOwnerPromote = await emitWithAck(owner, "promote-user", {
      serverId: "takimd",
      actorUserName: "ownerd",
      targetUserName: "memberd",
    });
    expect(oldOwnerPromote.ok).toBe(false);

    const newOwnerDemote = await emitWithAck(member, "demote-user", {
      serverId: "takimd",
      actorUserName: "memberd",
      targetUserName: "ownerd",
    });
    expect(newOwnerDemote.ok).toBe(true);

    owner.disconnect();
    member.disconnect();
  });
});
