import express from "express";

const router = express.Router();

/**
 * 🚨 [TWILIO DEBUG WEBHOOK]
 * Captures real-time error and warning events from Twilio's Debugger.
 */
router.post("/", (req, res) => {
    const timestamp = new Date().toISOString();

    console.log(`\n🚨 [TWILIO DEBUG EVENT RECEIVED] 🚨`);
    console.log(`[TIME]: ${timestamp}`);
    console.log(`[HEADERS]:`, JSON.stringify(req.headers, null, 2));
    console.log(`[QUERY_PARAMS]:`, JSON.stringify(req.query, null, 2));
    console.log(`[BODY_RAW]:`, JSON.stringify(req.body, null, 2));

    // Error-Specific Logging
    const { ErrorCode, ErrorMessage, From, To, MoreInfo } = req.body;

    if (ErrorCode || ErrorMessage) {
        console.log(`\n❌ Twilio Error ${ErrorCode || "UNKNOWN"}: ${ErrorMessage || "No error message provided"}`);
        console.log(`[SOURCE]: From: ${From || "N/A"} -> To: ${To || "N/A"}`);
        if (MoreInfo) {
            console.log(`[LINK]: ${MoreInfo}`);
        }
    }

    // Always respond quickly and do not block
    res.sendStatus(200);
});

export default router;
