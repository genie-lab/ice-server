class SessionStore {
  findSession(id) {}
  saveSession(id, session) {}
  findAllSessions() {}
}

class InMemorySessionStore extends SessionStore {
  constructor() {
    super();
    this.sessions = new Map();
  }
  findSession(obj) {
    return this.sessions.get(obj.sessionID);
  }
  saveSession(id, session) {

    sessions.set(id, session);
  }
  findAllSessions() {
    return [...this.sessions.values()];
  }
}

module.exports = {
  InMemorySessionStore,
};
