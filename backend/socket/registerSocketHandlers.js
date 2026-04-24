/* eslint-disable @typescript-eslint/no-require-imports */
const {
  joinRoomSchema,
  messageSchema,
  statusSchema,
  targetSchema,
  signalSchema,
  parseOrThrow,
} = require("../validation/schemas");

function buildChatMessage(user, text) {
  return {
    id: Date.now(),
    sender: user.name,
    text,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

function emitRoomList(io, state) {
  io.emit("room-list", state.getRoomCountList());
}

function emitUserList(io, state, roomId) {
  io.to(roomId).emit("user-list", state.getRoomUsers(roomId));
}

function authSocket(socket, serverToken) {
  if (!serverToken) {
    return true;
  }
  const providedToken = socket.handshake.auth?.token;
  return providedToken && providedToken === serverToken;
}

function registerSocketHandlers(io, { state, store, env }) {
  io.use((socket, next) => {
    if (!authSocket(socket, env.serverAuthToken)) {
      next(new Error("Unauthorized socket connection"));
      return;
    }
    next();
  });

  io.on("connection", (socket) => {
    socket.emit("room-list", state.getRoomCountList());

    socket.on("join-room", (payload, ack) => {
      try {
        const { roomId, userName } = parseOrThrow(joinRoomSchema, payload, "join-room");
        const oldRoom = state.getUser(socket.id)?.room;
        if (oldRoom) {
          socket.leave(oldRoom);
        }

        socket.join(roomId);
        state.upsertUser(socket.id, {
          id: socket.id,
          name: userName,
          room: roomId,
          isSpeaking: false,
          isMuted: false,
          isSharingScreen: false,
        });

        store.appendEvent(roomId, {
          type: "join",
          socketId: socket.id,
          userName,
          at: Date.now(),
        });

        socket.emit("message-history", store.getRecentMessages(roomId, 50));
        socket.to(roomId).emit("user-joined", socket.id);
        emitRoomList(io, state);
        emitUserList(io, state, roomId);
        if (typeof ack === "function") {
          ack({ ok: true });
        }
      } catch (error) {
        if (typeof ack === "function") {
          ack({ ok: false, error: error.message });
        }
      }
    });

    socket.on("mute-status", (payload, ack) => {
      try {
        const status = parseOrThrow(statusSchema, payload, "mute-status");
        const user = state.getUser(socket.id);
        if (!user?.room) {
          throw new Error("User not in room");
        }
        user.isMuted = status;
        emitUserList(io, state, user.room);
        if (typeof ack === "function") {
          ack({ ok: true });
        }
      } catch (error) {
        if (typeof ack === "function") {
          ack({ ok: false, error: error.message });
        }
      }
    });

    socket.on("speaking-status", (payload) => {
      try {
        const status = parseOrThrow(statusSchema, payload, "speaking-status");
        const user = state.getUser(socket.id);
        if (!user?.room) {
          return;
        }
        user.isSpeaking = status;
        emitUserList(io, state, user.room);
      } catch {}
    });

    socket.on("share-screen-status", (payload, ack) => {
      try {
        const status = parseOrThrow(statusSchema, payload, "share-screen-status");
        const user = state.getUser(socket.id);
        if (!user?.room) {
          throw new Error("User not in room");
        }
        user.isSharingScreen = status;
        emitUserList(io, state, user.room);
        if (typeof ack === "function") {
          ack({ ok: true });
        }
      } catch (error) {
        if (typeof ack === "function") {
          ack({ ok: false, error: error.message });
        }
      }
    });

    socket.on("send-message", (payload, ack) => {
      try {
        const parsed = parseOrThrow(messageSchema, payload, "send-message");
        const user = state.getUser(socket.id);
        if (!user?.room) {
          throw new Error("User not in room");
        }
        const message = buildChatMessage(user, parsed.text);
        store.appendMessage(user.room, message);
        io.to(user.room).emit("receive-message", message);
        if (typeof ack === "function") {
          ack({ ok: true });
        }
      } catch (error) {
        if (typeof ack === "function") {
          ack({ ok: false, error: error.message });
        }
      }
    });

    socket.on("send-nudge", (targetId, ack) => {
      try {
        const user = state.getUser(socket.id);
        if (!user?.room) {
          throw new Error("User not in room");
        }

        if (targetId) {
          const parsedTarget = parseOrThrow(targetSchema, targetId, "send-nudge");
          if (!state.isInSameRoom(socket.id, parsedTarget)) {
            throw new Error("Target is not in your room");
          }
          io.to(parsedTarget).emit("receive-nudge");
        } else {
          // "Dürt! (Herkesi)" butonunun backend davranışı
          socket.to(user.room).emit("receive-nudge");
        }

        if (typeof ack === "function") {
          ack({ ok: true });
        }
      } catch (error) {
        if (typeof ack === "function") {
          ack({ ok: false, error: error.message });
        }
      }
    });

    socket.on("offer", ({ offer, to }, ack) => {
      try {
        const parsed = parseOrThrow(signalSchema, { to }, "offer");
        if (!state.isInSameRoom(socket.id, parsed.to)) {
          throw new Error("Signal target is not in your room");
        }
        socket.to(parsed.to).emit("offer", { offer, from: socket.id });
        if (typeof ack === "function") {
          ack({ ok: true });
        }
      } catch (error) {
        if (typeof ack === "function") {
          ack({ ok: false, error: error.message });
        }
      }
    });

    socket.on("answer", ({ answer, to }, ack) => {
      try {
        const parsed = parseOrThrow(signalSchema, { to }, "answer");
        if (!state.isInSameRoom(socket.id, parsed.to)) {
          throw new Error("Signal target is not in your room");
        }
        socket.to(parsed.to).emit("answer", { answer, from: socket.id });
        if (typeof ack === "function") {
          ack({ ok: true });
        }
      } catch (error) {
        if (typeof ack === "function") {
          ack({ ok: false, error: error.message });
        }
      }
    });

    socket.on("ice-candidate", ({ candidate, to }, ack) => {
      try {
        const parsed = parseOrThrow(signalSchema, { to }, "ice-candidate");
        if (!state.isInSameRoom(socket.id, parsed.to)) {
          throw new Error("Signal target is not in your room");
        }
        socket.to(parsed.to).emit("ice-candidate", { candidate, from: socket.id });
        if (typeof ack === "function") {
          ack({ ok: true });
        }
      } catch (error) {
        if (typeof ack === "function") {
          ack({ ok: false, error: error.message });
        }
      }
    });

    socket.on("disconnect", () => {
      const user = state.deleteUser(socket.id);
      if (!user?.room) {
        return;
      }

      store.appendEvent(user.room, {
        type: "disconnect",
        socketId: socket.id,
        userName: user.name,
        at: Date.now(),
      });

      socket.to(user.room).emit("user-left", socket.id);
      emitRoomList(io, state);
      emitUserList(io, state, user.room);
    });
  });
}

module.exports = {
  registerSocketHandlers,
};
