/* eslint-disable @typescript-eslint/no-require-imports */
const { z } = require("zod");

const joinRoomSchema = z.object({
  roomId: z.string().trim().min(1).max(64),
  userName: z.string().trim().min(1).max(32),
});

const messageSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});

const statusSchema = z.boolean();

const targetSchema = z.string().trim().min(1);

const signalSchema = z.object({
  to: z.string().trim().min(1),
});

function parseOrThrow(schema, payload, eventName) {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join(", ");
    const error = new Error(`Invalid payload for ${eventName}: ${message}`);
    error.code = "INVALID_PAYLOAD";
    throw error;
  }

  return parsed.data;
}

module.exports = {
  joinRoomSchema,
  messageSchema,
  statusSchema,
  targetSchema,
  signalSchema,
  parseOrThrow,
};
