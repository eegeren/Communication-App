/* eslint-disable @typescript-eslint/no-require-imports */
const { JsonStore } = require("./jsonStore");
const { PrismaStore } = require("./prismaStore");

async function createStore(env) {
  if (env.databaseUrl) {
    try {
      const store = new PrismaStore(env.databaseUrl);
      await store.prisma.$connect();
      return store;
    } catch (error) {
      console.warn(
        "Prisma store unavailable, falling back to JSON store:",
        error.message
      );
    }
  }

  return new JsonStore(env.persistenceFile);
}

module.exports = {
  createStore,
};
