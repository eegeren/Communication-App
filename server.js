/* eslint-disable @typescript-eslint/no-require-imports */
const { loadEnvConfig } = require("./backend/config/env");
const { createRealtimeServer } = require("./backend/createRealtimeServer");

async function start() {
  const env = loadEnvConfig();
  const { httpServer } = await createRealtimeServer(env);

  httpServer.listen(env.port, () => {
    console.log(`Dumbasscord Motoru Aktif! Port: ${env.port}`);
  });
}

start();