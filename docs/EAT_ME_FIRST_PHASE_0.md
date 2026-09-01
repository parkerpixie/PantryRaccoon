# Eat Me First — Phase 0

## Product problem

Families do not need another inventory app that requires them to count ounces, maintain every shelf manually, or remember to update a database after every snack.

Eat Me First starts from a narrower problem:

> Know which recently purchased foods are most likely to be wasted, determine whether there is already a plan to use them, and ask a human only when PanCoon cannot safely infer the answer.

The first automation input is a grocery receipt rather than a full household inventory.

## Phase 0 finish line

Phase 0 does **not** calculate expiration dates, automatically mutate household inventory, send reminders, or call n8n yet.

It creates the contracts those later phases can rely on:

1. A receipt ledger with stable IDs and source traceability.
2. A normalized receipt item shape.
3. A proposed-inventory shape that can be reviewed before anything is written.
4. Explicit flags for products that need a printed package date.
5. Explicit review flags when the source receipt contains ambiguous substitution data.
6. A first real fixture based on Hy-Vee order `44233905` placed August 29, 2026.

## Starting rule

PanCoon does not require a giant one-time kitchen inventory.

**Known inventory begins with imported purchases.**

Existing pantry/fridge/freezer records remain valid. New receipt imports progressively increase PanCoon's confidence about what entered the house. Older items can be added manually only when useful.

## Receipt contract

Receipt records use:

- schema: `pancoon.receipt`
- schema version: `1`
- stable receipt ID
- store and location
- order number
- purchase date / placed timestamp
- source file
- receipt totals for traceability
- normalized item records

Each item preserves both:

- `rawName` — exactly what the receipt called the product
- `normalizedName` — the human-readable name PanCoon should use

The raw value is never discarded. That makes future parser improvements auditable.

## Food-watch fields

Receipt items can carry:

- `inventoryKind` — pantry, fridge, or freezer
- `inventoryCategory` — category compatible with the existing PanCoon UI where possible
- `foodGroup` — broader machine-friendly grouping
- `watch` — whether the item belongs in the future waste-prevention workflow
- `freshnessStrategy`
  - `none` — do not include in short-term freshness monitoring
  - `estimate` — Phase 2 may apply a validated default freshness window
  - `printed-date` — ask a human for the package date rather than guessing
- `needsDatePrompt` — whether PanCoon should explicitly request the printed date
- `reviewRequired` — source data is ambiguous and must not be silently accepted

Phase 0 intentionally stores **no invented expiration dates**.

## Human-in-the-loop rule

Receipt ingestion and household inventory mutation are separate operations.

The first receipt is imported with:

`autoWriteInventory: false`

The receipt bridge creates `pancoon.inventory-proposal` records instead. A later review UI will let the household approve, correct, ignore, freeze, or redirect those proposals before they become inventory.

This is especially important for substitutions.

## Hy-Vee fixture lessons

The first fixture contains 31 priced product lines across Bakery, Beverages, Fresh, Frozen, and Pantry.

The receipt is useful precisely because it is not perfectly clean:

- receipt abbreviations need normalization
- weighted deli items use pounds
- multiples such as corn, limes, and tuna need quantity handling
- many shelf-stable/frozen products should not create expiration noise
- perishable produce should become freshness candidates
- meat/dairy/deli products should request printed dates rather than receive invented dates
- the PDF contains substitution language that cannot always be resolved confidently from extracted text

Ambiguous substitution records therefore enter the review queue instead of becoming household truth.

## Browser bridge

Phase 0 exposes:

`window.PanCoonReceiptBridge`

Methods:

- `ingest(receipt)` — validate and upsert a receipt into the local ledger
- `getAll()` — receipt history
- `getById(receiptId)` — retrieve one receipt
- `getProposals(receiptId)` — create inventory proposals for watchable items
- `getDatePrompts(receiptId)` — proposals requiring printed dates
- `getReviewQueue(receiptId)` — proposals that need human attention
- `exportPayload(receiptId)` — versioned receipt + proposal payload suitable for future API/n8n transport

The first Hy-Vee fixture seeds once and is idempotent by receipt ID.

## Storage

Receipt ledger:

`pantry-raccoon:receipts:v1`

Existing inventory remains in the existing local-first model and the existing inventory metadata sidecar. Receipt data does not overwrite either one during Phase 0.

## Planned Phase 1 n8n contract

The first n8n workflow should produce the same `pancoon.receipt` contract from an uploaded PDF.

Conceptual flow:

1. New receipt arrives.
2. Extract text/content.
3. Identify store, order, date, and product lines.
4. Normalize names and quantities.
5. Classify storage + watch policy.
6. Preserve unresolved substitution details.
7. Validate against the PanCoon receipt schema.
8. Return/store the receipt as `proposed`.
9. Present human review before inventory write.

n8n should not be allowed to silently create expiration dates or resolve uncertain substitutions.

## Later Eat Me First flow

Receipt → reviewed inventory → freshness engine → meal-plan/recipe matching → daily risk evaluation → useful notification only when action is needed.

The desired end state is not "inventory management." It is:

> PanCoon knows what recently entered the house, notices which food lacks a plan, and interrupts the family only when something is actually at risk of being wasted.

## B2B / portfolio translation

The architecture deliberately mirrors enterprise integration work:

**Inbound document/event → extract → normalize → classify → validate → create proposal → apply business rules → human review → persist → monitor → notify.**

Swap a grocery receipt for a lead form, webinar event, order, support ticket, or customer event and the technical pattern remains recognizable.

Phase 0 demonstrates:

- data contracts
- schema versioning
- normalization
- source traceability
- idempotent ingestion
- structured JSON
- human-in-the-loop automation
- exception handling strategy
- legacy-system compatibility
- separation of ingestion from mutation
- API/n8n-ready integration design
