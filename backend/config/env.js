const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:3000"];

function parseOrigins(originsValue) {
  if (!originsValue) {
    return DEFAULT_ALLOWED_ORIGINS;
  }

  return originsValue
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function buildCorsOriginValidator(allowedOrigins) {
  return (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Origin not allowed by CORS"));
  };
}

function resolveSocketListenPort() {
  const rawSocket = process.env.SOCKET_PORT;
  if (rawSocket != null && String(rawSocket).trim() !== "") {
    const n = Number(rawSocket);
    if (!Number.isNaN(n) && n > 0) {
      return n;
    }
  }
  return Number(process.env.PORT || 3001);
}

function loadEnvConfig() {
  const allowedOrigins = parseOrigins(process.env.ALLOWED_ORIGINS);

  return {
    port: resolveSocketListenPort(),
    socketPath: process.env.SOCKET_PATH || "/socket.io",
    serverAuthToken: process.env.SOCKET_AUTH_TOKEN || "",
    clientAuthToken: process.env.NEXT_PUBLIC_SOCKET_AUTH_TOKEN || "",
    socketServerUrl:
      process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "http://localhost:3001",
    allowedOrigins,
    corsOriginValidator: buildCorsOriginValidator(allowedOrigins),
    persistenceFile:
      process.env.PERSISTENCE_FILE || "backend/persistence/data.json",
    databaseUrl: process.env.DATABASE_URL || "",
  };
}

module.exports = {
  loadEnvConfig,
};
