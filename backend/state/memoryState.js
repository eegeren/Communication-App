class MemoryState {
  constructor() {
    this.users = {};
  }

  upsertUser(socketId, user) {
    this.users[socketId] = user;
    return this.users[socketId];
  }

  getUser(socketId) {
    return this.users[socketId];
  }

  deleteUser(socketId) {
    const user = this.users[socketId];
    delete this.users[socketId];
    return user;
  }

  getRoomUsers(roomId) {
    return Object.values(this.users).filter((user) => user.room === roomId);
  }

  getRoomCountList() {
    const rooms = {};

    for (const user of Object.values(this.users)) {
      if (!user.room) {
        continue;
      }
      rooms[user.room] = (rooms[user.room] || 0) + 1;
    }

    return Object.entries(rooms).map(([name, count]) => ({ name, count }));
  }

  isInSameRoom(socketId, targetSocketId) {
    const current = this.getUser(socketId);
    const target = this.getUser(targetSocketId);
    if (!current || !target) {
      return false;
    }

    return current.room && target.room && current.room === target.room;
  }

  listUsers() {
    return Object.values(this.users);
  }

  updateRoleForUser(serverId, userName, role) {
    const normalized = userName.toLowerCase();
    for (const user of Object.values(this.users)) {
      if (
        user.serverId === serverId &&
        typeof user.name === "string" &&
        user.name.toLowerCase() === normalized
      ) {
        user.role = role;
      }
    }
  }
}

module.exports = {
  MemoryState,
};
