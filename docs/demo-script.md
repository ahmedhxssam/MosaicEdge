# Mosaic Edge — 3-Minute Demo Script

> Tip: click **Present** in the top bar for Presentation Mode (hides the nav rail, expands visuals). Click **Load Demo** any time to reset to a clean baseline.

### 0:00 — The problem (15s)
"Field teams in a disaster receive conflicting, multilingual reports while connectivity keeps dropping. Most tools either need the cloud or collapse the disagreement into one confident — sometimes wrong — answer. Mosaic Edge runs on a disconnected edge node and keeps the disagreement *visible*."

### 0:15 — Load the scenario (20s)
Open **Live Feed**. 30 synthetic reports across **HUMINT / OSINT / GEOINT / SIGINT** in **English, Arabic and Spanish**. Point out the green banner: *"Local processing active — core fusion remains available without external connectivity."* Filter by language to show the Arabic/Spanish reports.

### 0:35 — Show fusion / multilingual resolution (30s)
Open **Entity Graph** → click the **Hospital Dr. Jose Maria Vargas** node. The side panel shows it resolved **4 aliases across 3 languages** — `Hospital Dr. Jose Maria Vargas`, `Vargas Hospital`, `Hospital Vargas`, `مستشفى فارغاس` — and *why*: normalized-name match, shared coordinates, shared context, time overlap, Arabic alias dictionary. This is explainable, not magic.

### 1:05 — Show contradiction (30s)
Open **Priority Queue** → right column **Truth Tensions** → the **Caracas-La Guaira Highway** card. Closure is favored over older "open" reports. Read the rationale: newer HUMINT/GEOINT reporting supports closure, while the open-status reports are older, low-reliability, and uncorroborated. The conflict is shown, never hidden.

### 1:35 — Show priority (20s)
Open the **Hospital Access and Generator Fuel** alert → **Why this matters**. The 92+/100 score is fully broken down: 35% civilian safety, 20% immediacy, 20% corroboration, 15% source confidence, 10% freshness. No opaque AI scoring.

### 1:55 — Show the risk path (15s)
On the alert click **Risk path** (or a map marker). The graph highlights the causal chain **Vargas Hospital → Caracas-La Guaira Highway → Tacagua Viaduct → aftershock damage** — the system understands operational context, not just entities.

### 2:10 — Go offline (25s)
Top bar → **Offline**. On **Live Feed** click **Add simulated report**. It ingests locally and enters the **sync queue** (a "queued" chip appears; the queue counter ticks up in the top bar). Fusion still updates — disconnected-first is real.

### 2:35 — Reconnect & sync (15s)
Top bar → **Connected**. Open **Sync & Audit** → **Synchronize**. Items move queued → synced and a **verifiable receipt** is issued (item count, bytes, integrity hash). Original event timestamps are preserved.

### 2:50 — What changed & audit (15s)
Open **What Changed?** — confidence increases, the new sync arrival, and the analyst decision are all summarized with *why*. Back on **Sync & Audit**, click **Verify chain** → *"Audit chain verified, no integrity breaks."* Optionally click **Tamper** then **Verify** again to show detection.

### 3:00 — Close
"Mosaic Edge does not pretend uncertainty does not exist. It turns fragmented, multilingual evidence into a transparent, auditable decision picture — and it keeps working when the network doesn't."

---

## Optional deep-dive beats
- **Roles:** switch to **Ops Lead** — HUMINT/SIGINT narratives redact (source protection); conclusions and provenance counts remain. Switch to **Auditor** for the full ledger.
- **Timeline Replay:** drag to T−90 and hit **Explain why it changed** — highway-closure confidence climbs as corroborating reports arrive.
- **Evaluation:** click **Run Validation** — precision/recall, contradiction recall, recall@5, latency, audit & sync checks, all recomputed live with a candid limitations section.
- **Analyst Console:** ask *"Why is the hospital alert critical?"* or *"Which sources are stale?"* — grounded answers with clickable citations.
