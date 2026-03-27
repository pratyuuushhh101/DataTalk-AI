const _sessions = new Map();

function createSession(sessionId) {
  return {
    sessionId: sessionId,
    status: "ACTIVE",
    items: [],
    detectedTotal: 0,
    spokenTotal: null,
    negotiatedDiscount: 0,
    lastIntent: null,
    intentHistory: [],
    processedEventIds: [],
    mismatchState: {
      active: false,
      startTime: null
    },
    lastUpdated: Date.now()
  };
}

const SESSION_TTL = 60 * 1000;

function getSession(sessionId, eventTimestamp = Date.now()) {
  if (_sessions.has(sessionId)) {
    const s = _sessions.get(sessionId);
    if (eventTimestamp - s.lastUpdated > SESSION_TTL) {
       _sessions.delete(sessionId);
    }
  }
  if (!_sessions.has(sessionId)) {
    _sessions.set(sessionId, createSession(sessionId));
  }
  return JSON.parse(JSON.stringify(_sessions.get(sessionId))); 
}

function saveSession(session) {
  const updatedSession = { ...session, lastUpdated: Date.now() };
  _sessions.set(session.sessionId, JSON.parse(JSON.stringify(updatedSession)));
  return updatedSession;
}

function isDuplicate(session, eventId) {
  return session.processedEventIds.some(e => typeof e === 'string' ? e === eventId : e.eventId === eventId);
}

function markProcessed(session, traceObject) {
  session.processedEventIds.push(traceObject);
  if (session.processedEventIds.length > 100) {
    session.processedEventIds.shift();
  }
}

module.exports = {
  _sessions,
  createSession,
  getSession,
  saveSession,
  isDuplicate,
  markProcessed
};
