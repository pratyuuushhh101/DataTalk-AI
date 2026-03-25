import { runCVSnapshot } from "./cv.service.js";
import { getInventory } from "./inventory.service.js";
import { logTransaction } from "./sales.service.js";
import {
    getSession, updateCVItems, setExpectedTotal,
    setAudioTotal, setAudioItems, addAlert, parseTranscript,
    resetSession
} from "./match.service.js";

// ──────────────────────────────────────────────────────────────────────────────
// Transaction Orchestrator — EVENT-DRIVEN Pipeline (v4)
//
// RULES:
//   1. NO mock fallback. CV empty → abort.
//   2. NO stale data. Totals reset at start.
//   3. Mismatch only if BOTH cv_items and audio_total exist.
//   4. Number comparison with tolerance (0.5).
//   5. Single-execution guard (inProgress).
//   6. All sequential. No race conditions.
// ──────────────────────────────────────────────────────────────────────────────

const TOLERANCE = 0.5;
let lastTxTimestamp = 0;
let inProgress = false;

/**
 * @param {string} transcript
 * @param {string|null} imageBase64
 */
export async function processTransaction(transcript, imageBase64 = null) {
    // ── Single execution guard ──
    if (inProgress) {
        console.log("[PIPELINE] ⚠️ Transaction already in progress. Ignoring.");
        return { status: "busy", message: "Transaction in progress." };
    }

    // ── Idempotency guard (3s window) ──
    const now = Date.now();
    if (now - lastTxTimestamp < 3000) {
        console.log("[PIPELINE] ⚠️ Duplicate 'total' ignored (within 3s).");
        return { status: "duplicate", message: "Transaction already processed." };
    }

    inProgress = true;
    lastTxTimestamp = now;

    try {
        console.log("\n════════════════════════════════════════════════════════════");
        console.log("[PIPELINE] 🚀 Transaction Pipeline Started");
        console.log("════════════════════════════════════════════════════════════");

        // ── Reset stale totals FIRST ──
        setExpectedTotal(null);
        setAudioTotal(null);
        updateCVItems({});

        // ══════════════════════════════════════════════════════════════
        // STEP 0: Parse Audio
        // ══════════════════════════════════════════════════════════════
        console.log(`[PIPELINE] 📢 Audio: "${transcript}"`);
        const parsed = parseTranscript(transcript);

        const audioItems = parsed.items;
        const rawAudioTotal = parsed.total;

        // ── Normalize to number ──
        const audioTotal = rawAudioTotal !== null ? Number(rawAudioTotal) : null;
        console.log(`[DEBUG] audioTotal raw=${rawAudioTotal}, type=${typeof rawAudioTotal}, normalized=${audioTotal}, type=${typeof audioTotal}`);

        if (audioTotal !== null && isNaN(audioTotal)) {
            console.error("[PIPELINE] ❌ audio_total is NaN after conversion. Aborting.");
            return { status: "error", message: "Invalid audio total" };
        }

        setAudioItems(audioItems);
        if (audioTotal !== null) setAudioTotal(audioTotal);

        const audioItemCount = Object.keys(audioItems).length;
        console.log(`[PIPELINE] 🗣️ Audio items: ${audioItemCount > 0 ? JSON.stringify(audioItems) : "NONE"}`);
        console.log(`[PIPELINE] 🗣️ Audio total: ${audioTotal !== null ? `₹${audioTotal}` : "not stated"}`);

        // ══════════════════════════════════════════════════════════════
        // STEP 1: CV Snapshot (FRESH)
        // ══════════════════════════════════════════════════════════════
        let cvItems = {};
        let cvSource = "none";

        if (!imageBase64) {
            console.error("[PIPELINE] ❌ NO IMAGE. Camera OFF.");
            return {
                status: "no_image",
                message: "Camera is OFF. Turn on camera before saying 'total'.",
                audio_items: audioItems,
                audio_total: audioTotal,
                session: getSession()
            };
        }

        console.log(`[PIPELINE] 📸 Image received (${(imageBase64.length / 1024).toFixed(1)}KB)`);
        try {
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
            const imageBuffer = Buffer.from(base64Data, "base64");
            console.log(`[PIPELINE] 📸 Buffer: ${(imageBuffer.length / 1024).toFixed(1)}KB`);
            cvItems = await runCVSnapshot(imageBuffer);
            if (Object.keys(cvItems).length > 0) cvSource = "azure";
        } catch (err) {
            console.error("[PIPELINE] ❌ CV FAILED:", err.message);
        }

        // Gate: no items → abort
        if (Object.keys(cvItems).length === 0) {
            console.warn("[PIPELINE] ⛔ No items detected. Aborting.");
            updateCVItems({});
            return {
                status: "no_items",
                message: "No items detected in frame.",
                audio_items: audioItems,
                audio_total: audioTotal,
                cv_items: {},
                session: getSession()
            };
        }

        // ══════════════════════════════════════════════════════════════
        // STEP 2: Normalize CV tags
        // ══════════════════════════════════════════════════════════════
        const normalizedCV = {};
        for (const [key, qty] of Object.entries(cvItems)) {
            const normKey = key.toLowerCase().replace(/[_\-\s]/g, "")
                .replace(/laysblue|laysgreen|laysred|laysyellow|laysclassic/, "lays")
                .replace(/cocacola|coke500ml/, "coke");
            normalizedCV[normKey] = (normalizedCV[normKey] || 0) + qty;
        }
        updateCVItems(normalizedCV);
        console.log(`[PIPELINE] 👁️ CV (${cvSource}): ${JSON.stringify(normalizedCV)}`);

        // ══════════════════════════════════════════════════════════════
        // STEP 3: Compute Expected Total
        // ══════════════════════════════════════════════════════════════
        console.log("[PIPELINE] 💰 Computing expected total...");
        let expectedTotal = 0;
        const pricedItems = [];

        for (const [product, qty] of Object.entries(normalizedCV)) {
            const details = await getInventory(product);
            if (details) {
                const lineTotal = Number(details.selling_price || 0) * qty;
                expectedTotal += lineTotal;
                pricedItems.push({
                    product: details.product,
                    normalized: product,
                    qty,
                    unit_price: Number(details.selling_price),
                    line_total: lineTotal
                });
                console.log(`[PIPELINE]   ✅ ${details.product} x${qty} @ ₹${details.selling_price} = ₹${lineTotal}`);
            } else {
                console.log(`[PIPELINE]   ❌ "${product}" NOT in DB`);
            }
        }

        expectedTotal = Number(expectedTotal);
        console.log(`[DEBUG] expectedTotal=${expectedTotal}, type=${typeof expectedTotal}`);

        if (isNaN(expectedTotal)) {
            console.error("[PIPELINE] ❌ expected_total is NaN. Aborting comparison.");
            return { status: "error", message: "Failed to compute expected total" };
        }

        setExpectedTotal(expectedTotal);
        console.log(`[PIPELINE] 🧮 Expected: ₹${expectedTotal}`);

        // ══════════════════════════════════════════════════════════════
        // STEP 4: Item-Level Comparison
        // ══════════════════════════════════════════════════════════════
        const allProducts = new Set([...Object.keys(normalizedCV), ...Object.keys(audioItems)]);
        const missingItems = [];
        const extraItems = [];
        const qtyMismatches = [];

        for (const product of allProducts) {
            const cvQty = normalizedCV[product] || 0;
            const aQty = audioItems[product] || 0;
            if (cvQty > 0 && aQty === 0) missingItems.push({ product, cv_qty: cvQty, audio_qty: 0 });
            else if (aQty > 0 && cvQty === 0) extraItems.push({ product, cv_qty: 0, audio_qty: aQty });
            else if (cvQty !== aQty) qtyMismatches.push({ product, cv_qty: cvQty, audio_qty: aQty });
        }

        if (missingItems.length > 0) console.log(`[PIPELINE]   🔴 Unbilled: ${missingItems.map(i => `${i.product}(x${i.cv_qty})`).join(", ")}`);
        if (extraItems.length > 0) console.log(`[PIPELINE]   🟡 Extra: ${extraItems.map(i => `${i.product}(x${i.audio_qty})`).join(", ")}`);

        // ══════════════════════════════════════════════════════════════
        // STEP 5: Total Comparison (NUMBERS ONLY, with tolerance)
        // ══════════════════════════════════════════════════════════════
        const statedTotal = audioTotal !== null ? Number(audioTotal) : Number(getSession().audio_total || 0);
        setAudioTotal(statedTotal);

        const diff = Math.abs(expectedTotal - statedTotal);
        const totalMatch = diff <= TOLERANCE;
        const itemsMatch = missingItems.length === 0 && qtyMismatches.length === 0;

        console.log(`[COMPARE] ────────────────────────────`);
        console.log(`[COMPARE] expected: ${expectedTotal} (type: ${typeof expectedTotal})`);
        console.log(`[COMPARE] audio:    ${statedTotal} (type: ${typeof statedTotal})`);
        console.log(`[COMPARE] diff:     ${diff.toFixed(2)}`);
        console.log(`[COMPARE] tolerance:${TOLERANCE}`);

        // Only flag mismatch if we have real data from BOTH sides
        let overallStatus;
        const cvHasItems = Object.keys(normalizedCV).length > 0;
        const audioHasTotal = audioTotal !== null && !isNaN(statedTotal);

        if (!cvHasItems) {
            overallStatus = "no_items";
            console.log(`[COMPARE] result:   SKIPPED (no CV items)`);
        } else if (!audioHasTotal) {
            overallStatus = "partial";
            console.log(`[COMPARE] result:   PARTIAL (no audio total)`);
        } else if (totalMatch && itemsMatch) {
            overallStatus = "ok";
            console.log(`[COMPARE] result:   ✅ MATCH`);
        } else {
            overallStatus = "mismatch";
            console.log(`[COMPARE] result:   ❌ MISMATCH`);
        }
        console.log(`[COMPARE] ────────────────────────────`);

        if (overallStatus === "mismatch") {
            addAlert({
                type: "mismatch",
                message: `Vision ₹${expectedTotal} vs Stated ₹${statedTotal}` +
                    (missingItems.length > 0 ? ` | Unbilled: ${missingItems.map(i => i.product).join(", ")}` : "")
            });
        }

        // ══════════════════════════════════════════════════════════════
        // STEP 6: Log Sale to DB (ONLY on MATCH)
        // ══════════════════════════════════════════════════════════════
        let salesLogged = false;
        if (overallStatus === "ok") {
            console.log("[SALES] 💾 Logging transaction to Azure SQL...");
            const billId = `TX-${Date.now()}`;
            for (const [product, qty] of Object.entries(normalizedCV)) {
                try {
                    const saleResult = await logTransaction({
                        product,
                        quantity: qty,
                        bill_id: billId
                    });
                    console.log(`[SALES]   ✅ ${product} x${qty} | profit: ₹${saleResult.profit}${saleResult.alert ? ` | ${saleResult.alert}` : ""}`);
                    salesLogged = true;
                } catch (saleErr) {
                    console.error(`[SALES]   ❌ Failed for ${product}: ${saleErr.message}`);
                    // Do NOT crash pipeline — continue with other items
                }
            }
            if (salesLogged) {
                console.log(`[SALES] ✅ Transaction saved (bill: ${billId})`);
            }
        } else {
            console.log(`[SALES] ⏭️ Skipped — status: ${overallStatus}`);
        }

        // ══════════════════════════════════════════════════════════════
        // STEP 6: Return
        // ══════════════════════════════════════════════════════════════
        const result = {
            status: overallStatus,
            expected_total: expectedTotal,
            audio_total: statedTotal,
            difference: diff,
            cv_source: cvSource,
            items_detected: normalizedCV,
            audio_items: audioItems,
            items_priced: pricedItems,
            missing_items: missingItems,
            extra_items: extraItems,
            qty_mismatches: qtyMismatches,
            audio_reliable: audioItemCount > 0,
            sales_logged: salesLogged,
            session: getSession(),
            message: overallStatus === "ok"
                ? `Sale recorded. ${salesLogged ? "Saved to DB." : ""}`
                : overallStatus === "partial"
                    ? "Audio incomplete — CV detected items but no total stated."
                    : overallStatus === "mismatch"
                        ? `MISMATCH: Expected ₹${expectedTotal}, Stated ₹${statedTotal}`
                        : "No items detected."
        };

        console.log("════════════════════════════════════════════════════════════");
        console.log(`[PIPELINE] ✅ Complete: ${overallStatus.toUpperCase()}`);
        console.log("════════════════════════════════════════════════════════════\n");

        return result;

    } finally {
        inProgress = false;
    }
}

export default { processTransaction };
