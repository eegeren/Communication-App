/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

function defaultStore() {
  return {
    rooms: {},
    users: {},
  };
}

class JsonStore {
  constructor(filePath) {
    this.kind = "json";
    this.filePath = path.resolve(filePath);
    this.data = defaultStore();
    this.ensureFile();
    this.load();
  }

  ensureFile() {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });

    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(
        this.filePath,
        JSON.stringify(defaultStore(), null, 2),
        "utf-8"
      );
    }
  }

  load() {
    try {
      const raw = fs.readFileSync(this.filePath, "utf-8");
      const parsed = JSON.parse(raw);
      this.data = parsed && typeof parsed === "object" ? parsed : defaultStore();
    } catch {
      this.data = defaultStore();
      this.flush();
    }
  }

  flush() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
  }

  ensureRoom(roomId) {
    if (!this.data.rooms[roomId]) {
      this.data.rooms[roomId] = {
        roomId,
        messages: [],
        events: [],
      };
    }

    return this.data.rooms[roomId];
  }

  async appendMessage(roomId, message) {
    const room = this.ensureRoom(roomId);
    room.messages.push(message);
    if (room.messages.length > 200) {
      room.messages = room.messages.slice(-200);
    }
    this.flush();
  }

  async appendEvent(roomId, event) {
    const room = this.ensureRoom(roomId);
    room.events.push(event);
    if (room.events.length > 300) {
      room.events = room.events.slice(-300);
    }
    this.flush();
  }

  async getRecentMessages(roomId, limit = 50) {
    const room = this.ensureRoom(roomId);
    return room.messages.slice(-limit);
  }

  async touchRoom(roomId) {
    this.ensureRoom(roomId);
    this.flush();
  }

  async listRooms() {
    return Object.keys(this.data.rooms).map((roomId) => ({ roomId }));
  }

  async deleteRoom(roomId) {
    delete this.data.rooms[roomId];
    this.flush();
  }

  async findUserByEmail(email) {
    return this.data.users[email.toLowerCase()] || null;
  }

  async createUser({ email, userName, passwordHash }) {
    const normalizedEmail = email.toLowerCase();
    const user = {
      id: `user_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      email: normalizedEmail,
      userName,
      passwordHash,
    };
    this.data.users[normalizedEmail] = user;
    this.flush();
    return {
      id: user.id,
      email: user.email,
      userName: user.userName,
    };
  }

  async close() {}
}

module.exports = {
  JsonStore,
};
