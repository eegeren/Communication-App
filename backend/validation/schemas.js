/* eslint-disable @typescript-eslint/no-require-imports */
const { z } = require("zod");

const joinRoomSchema = z.object({
  roomId: z.string().trim().min(1).max(64),
  userName: z.string().trim().min(1).max(32),
  serverId: z.string().trim().min(1).max(64).optional(),
});

const messageSchema = z.object({
  text: z.string().max(350000).optional().default(""),
  attachment: z
    .object({
      name: z.string().trim().min(1).max(255),
      type: z.string().trim().max(128).optional().default("application/octet-stream"),
      dataUrl: z.string().trim().min(1).max(6 * 1024 * 1024),
      size: z.number().int().nonnegative().max(5 * 1024 * 1024),
    })
    .optional(),
}).refine((payload) => payload.text.trim().length > 0 || Boolean(payload.attachment), {
  message: "Message must include text or attachment",
});

const statusSchema = z.boolean();

const targetSchema = z.string().trim().min(1);

const signalSchema = z.object({
  to: z.string().trim().min(1),
});

const createServerSchema = z.object({
  serverName: z.string().trim().min(1).max(64),
  userName: z.string().trim().min(1).max(32),
});

const createRoomSchema = z.object({
  serverId: z.string().trim().min(1).max(64),
  roomName: z.string().trim().min(1).max(64),
  userName: z.string().trim().min(1).max(32),
});

const deleteRoomSchema = z.object({
  serverId: z.string().trim().min(1).max(64),
  roomName: z.string().trim().min(1).max(64),
  userName: z.string().trim().min(1).max(32),
});

const typingSchema = z.object({
  roomId: z.string().trim().min(1).max(64),
  serverId: z.string().trim().min(1).max(64).optional(),
  userName: z.string().trim().min(1).max(32),
  isTyping: z.boolean(),
});

const roleChangeSchema = z.object({
  serverId: z.string().trim().min(1).max(64),
  actorUserName: z.string().trim().min(1).max(32),
  targetUserName: z.string().trim().min(1).max(32),
});

const updateServerSettingsSchema = z.object({
  serverId: z.string().trim().min(1).max(64),
  actorUserName: z.string().trim().min(1).max(32),
  name: z.string().trim().min(1).max(64).optional(),
  description: z.string().trim().max(500).optional(),
});

const updateRoomSettingsSchema = z.object({
  serverId: z.string().trim().min(1).max(64),
  roomName: z.string().trim().min(1).max(64),
  actorUserName: z.string().trim().min(1).max(32),
  name: z.string().trim().min(1).max(64).optional(),
  topic: z.string().trim().max(500).optional(),
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
  createServerSchema,
  createRoomSchema,
  deleteRoomSchema,
  typingSchema,
  roleChangeSchema,
  updateServerSettingsSchema,
  updateRoomSettingsSchema,
  parseOrThrow,
};
