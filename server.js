/* eslint-disable @typescript-eslint/no-require-imports */
const { Server } = require("socket.io");
const { loadEnvConfig } = require("./backend/config/env");
const { createHttpServer } = require("./backend/http/createHttpServer");
const { JsonStore } = require("./backend/persistence/jsonStore");
const { registerSocketHandlers } = require("./backend/socket/registerSocketHandlers");
const { MemoryState } = require("./backend/state/memoryState");

const env = loadEnvConfig();
const state = new MemoryState();
const store = new JsonStore(env.persistenceFile);
const httpServer = createHttpServer();
const io = new Server(httpServer, {
  path: env.socketPath,
  cors: {
    origin: env.corsOriginValidator,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

registerSocketHandlers(io, { state, store, env });

httpServer.listen(env.port, () => {
  console.log(`Dumbasscord Motoru Aktif! Port: ${env.port}`);
});