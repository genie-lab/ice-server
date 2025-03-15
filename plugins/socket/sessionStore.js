class SessionStore {
  findSession(id) {}
  saveSession(id, session) {}
  findAllSessions() {}
}

class InMemorySessionStore extends SessionStore {
  constructor() {
    super();
    this.sessions = new Map();
    console.log('this.sessions',this.sessions);
  }
  findSession(obj) {
    console.log('sessionStore',obj.sessionID);
    return this.sessions.get(obj.sessionID);
  }
  saveSession(id, session) {
    console.log('saveSession',id, session);

    sessions.set(id, session);
  }
  findAllSessions() {
    return [...this.sessions.values()];
  }
}

module.exports = {
  InMemorySessionStore,
};
