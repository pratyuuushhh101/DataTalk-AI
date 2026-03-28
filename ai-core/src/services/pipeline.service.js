const { getSession, saveSession, isDuplicate, markProcessed } = require('./session.service.js');
const { classifyIntent } = require('./intent.service.js');

const CATALOG_PRICES = {
  lays: 20,
  coke: 15,
  default: 10
};

function evaluateSession(session) {
  const actions = [];
  const now = Date.now();

  // RULE 1: BILLING MISMATCH
  if (session.spokenTotal !== null && session.detectedTotal !== null && session.detectedTotal !== session.spokenTotal) {
    if (!session.mismatchState.active) {
      session.mismatchState.active = true;
      session.mismatchState.startTime = now;
    } else if (session.mismatchState.startTime && (now - session.mismatchState.startTime) > 3000) {
      actions.push({ type: "ALERT", message: "Mismatch detected: spoken total does not match detected total." });
    }
  } else {
    session.mismatchState.active = false;
    session.mismatchState.startTime = null;
  }

  // RULE 2: NEGOTIATION
  if (session.negotiatedDiscount > 0) {
    const baseTotal = session.spokenTotal !== null ? session.spokenTotal : session.detectedTotal;
    const adjustedTotal = baseTotal - session.negotiatedDiscount;
    actions.push({ type: "INFO", message: `Negotiation applied. Adjusted total: ${adjustedTotal}` });
  }

  // RULE 3: PRODUCT QUERY + "NO" RESPONSE
  if (session.intentHistory.length >= 2) {
    const lastEvent = session.intentHistory[session.intentHistory.length - 1];
    const prevEvent = session.intentHistory[session.intentHistory.length - 2];
    
    if (prevEvent.intent === "PRODUCT_QUERY" && lastEvent.intent === "NEGATIVE" && lastEvent.speaker === "owner") {
      actions.push({ type: "SUGGESTION", message: "Log missed demand" });
    }
  }

  return actions;
}

function processEvent(event) {
  let session = getSession("till_1", event.timestamp);

  const preState = { spoken: session.spokenTotal, detected: session.detectedTotal, disc: session.negotiatedDiscount };
  console.log(`\n[OBSERVABILITY] Incoming Event:`, event.eventId, event.type === 'SPEECH' ? event.text : event.items);
  console.log(`[OBSERVABILITY] Session BEFORE update:`, JSON.stringify(preState));

  if (isDuplicate(session, event.eventId)) {
    console.log(`[OBSERVABILITY] Dropped: Duplicate EventId`);
    return { session, actions: [] };
  }
  
  // Handling out-of-order events (older than 5s compared to session's last update)
  if (session.intentHistory.length > 0 && event.timestamp < session.lastUpdated - 5000) {
      console.log(`[OBSERVABILITY] Dropped: Out-of-order event`);
      return { session, actions: [{ type: "INFO", message: "Ignored out-of-order event" }] };
  }

  let eventActions = [];

  if (event.type === "CV") {
    session.items = event.items;
    
    session.detectedTotal = session.items.reduce((sum, item) => {
      const price = CATALOG_PRICES[item.name.toLowerCase()] || CATALOG_PRICES.default;
      return sum + (item.qty * price);
    }, 0);
  } else if (event.type === "SPEECH") {
    const { intent, confidence, entities } = classifyIntent(event.text);

    // Semantic deduplication Check
    if (session.intentHistory.length > 0) {
      const last = session.intentHistory[session.intentHistory.length - 1];
      if (last.intent === intent && JSON.stringify(last.entities) === JSON.stringify(entities) && (event.timestamp - last.timestamp) < 5000) {
        console.log(`[OBSERVABILITY] Dropped: Semantic Duplicate (Same Intent + Entities within 5s)`);
        return { session, actions: [{ type: "INFO", message: "Ignored semantic duplicate" }] };
      }
    }
    
    session.intentHistory.push({
      intent, 
      confidence, 
      entities, 
      text: event.text,
      speaker: event.speaker,
      timestamp: event.timestamp
    });

    if (intent !== "UNKNOWN") {
      session.lastIntent = intent;
    }

    if (intent === "BILLING") {
      if (entities.total !== undefined) {
        eventActions.push({ type: "INFO", message: `Stabilizing billing total (1.5s window) for: ${entities.total}` });
        
        // Asynchronous stabilization window without blocking current event pipeline
        const targetTotal = entities.total;
        setTimeout(() => {
            let s = getSession("till_1");
            const recent = s.intentHistory.filter(i => i.intent === "BILLING");
            if (recent.length > 0 && recent[recent.length - 1].entities.total === targetTotal) {
               s.spokenTotal = targetTotal;
               // Re-evaluate asynchronously to trigger alerts if needed
               const asyncActions = evaluateSession(s);
               if (asyncActions.some(a => a.type === "ALERT")) {
                 console.log("\n[DELAYED OBSERVED ALERT]", asyncActions);
               }
               saveSession(s);
            }
        }, 1500);
      }
    } else if (intent === "NEGOTIATION") {
      if (entities.discount !== undefined) {
        session.negotiatedDiscount = entities.discount; // Overwrite, do NOT stack endlessly
      }
    } else if (intent === "PRODUCT_QUERY") {
      // Do NOT mutate totals
    } else if (intent === "UNKNOWN") {
      // Do NOT change session state
    }
  }

  const actions = evaluateSession(session);
  actions.push(...eventActions);

  // Trace log append (uses processedEventIds to preserve core session schema shape)
  markProcessed(session, {
     eventId: event.eventId,
     type: event.type,
     timestamp: event.timestamp,
     decisions: actions
  });

  session = saveSession(session);

  const postState = { spoken: session.spokenTotal, detected: session.detectedTotal, disc: session.negotiatedDiscount, mismatchTimer: session.mismatchState.active };
  console.log(`[OBSERVABILITY] Triggered Actions:`, JSON.stringify(actions));
  console.log(`[OBSERVABILITY] Session AFTER update:`, JSON.stringify(postState));

  return { session, actions };
}

module.exports = {
  processEvent
};
