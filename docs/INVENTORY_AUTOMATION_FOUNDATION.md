# PanCoon Inventory Automation Foundation

## Why this exists

PanCoon began as a local-first meal planning and kitchen inventory app. The original inventory model was intentionally lightweight: item name, free-text quantity, stock status, category, and location. That was enough for a person entering items manually, but not structured enough for reliable automation.

The inventory automation foundation adds a compatibility layer that makes PanCoon ready for future workflows such as n8n, receipt imports, voice/photo pantry sweeps, and a shared database without breaking the existing app.

## Architecture decision: compatibility sidecar

The current PanCoon application owns its primary state in `pantry-raccoon:v1` and rewrites that state during normal interactions. Instead of changing the legacy state shape in place, the automation foundation stores richer inventory metadata in a separate key:

`pantry-raccoon:inventory-meta:v2`

Records are joined by the existing inventory item ID.

This is deliberate. It is the same type of pattern used when a legacy operational system needs to keep running while a newer integration or data layer is introduced alongside it.

## Automation-ready inventory contract

The merged contract exposes these fields:

- `id` — stable inventory identifier
- `name` — item name
- `kind` — pantry, fridge, or freezer
- `quantity` — original human-readable quantity value retained for compatibility
- `quantityValue` — normalized numeric quantity when available
- `unit` — normalized unit such as can, jar, box, bag, lb, oz, or cup
- `status` — plenty, half, low, or out
- `category` — inventory category
- `location` — physical inventory location
- `expirationDate` — optional fridge expiration date
- `bestByDate` — optional pantry/freezer best-by date
- `dateAdded` — date a newly captured item entered inventory
- `notes` — human context that should not be lost during automation
- `source` — origin of the record, currently manual or legacy-manual and designed for future values such as pantry-sweep, receipt, recipe, or n8n
- `createdAt` — creation timestamp when known
- `updatedAt` — last meaningful inventory update when known

## Browser integration contract

The module exposes:

`window.PanCoonInventoryBridge`

Available methods:

- `getAll()` — returns the current merged inventory records
- `exportPayload()` — returns a versioned integration payload ready to POST to an API or n8n webhook

The export identifies itself as:

`pancoon.inventory` schema version `2`

This gives future automation a stable contract instead of making workflows depend directly on PanCoon's internal UI or legacy localStorage format.

## Migration behavior

Existing pantry, fridge, and freezer records are preserved. The compatibility layer:

1. Reads the current inventory.
2. Creates sidecar metadata for each stable item ID.
3. Parses common existing quantity strings when possible, such as `2 cans`, `1/2 bag`, or `3 boxes`.
4. Preserves existing fridge/freezer notes and dates when available.
5. Marks older records as `legacy-manual` rather than pretending their original creation/update timestamps are known.
6. Removes sidecar metadata only when the corresponding inventory item no longer exists.

## Why this matters for n8n

n8n should not need to understand PanCoon's UI. It should receive or return predictable JSON.

A future Pantry Sweep can therefore follow this flow:

1. PanCoon captures voice, photo, or pasted pantry text.
2. PanCoon sends the raw input to an n8n webhook.
3. n8n extracts and normalizes candidate inventory records.
4. PanCoon shows the proposed records for human review.
5. Approved records are written to the future shared data store.
6. The inventory contract records the source and timestamps for traceability.

## How the same pattern translates to business systems

### Apparel / retail

Replace pantry items with products, customer actions, orders, or inventory records. A workflow can normalize data from ecommerce, CRM, returns, loyalty, and marketing systems into a consistent contract before triggering personalized journeys or operational actions.

Example: customer browses a category, purchases an item, and later starts a return. Middleware can normalize those events, enrich customer data, branch on business rules, and send reliable signals to CRM and lifecycle marketing platforms.

### SaaS / software

Replace kitchen inventory with product-usage or account data. A workflow can combine signup data, feature usage, subscription status, support activity, and CRM records into a shared customer state.

Example: a trial user signs up, uses one key feature but not another, reaches a usage threshold, and has no open support issue. Middleware can evaluate those events and trigger onboarding, sales outreach, or lifecycle messaging.

### B2B marketing automation

The same architecture applies to leads, campaign members, form responses, webinar behavior, lifecycle stages, and sales handoff signals. The core skill is not the pantry domain. It is designing reliable data contracts, preserving legacy behavior, normalizing inputs, branching on business logic, and making downstream automation auditable.

## Interview framing

A concise way to describe the project:

> I built an automation-ready inventory contract for a local-first meal planning application. Rather than breaking the legacy data model, I introduced a compatibility sidecar keyed by stable record IDs, normalized quantities and units, added source and timestamp metadata, and exposed a versioned integration payload for future n8n workflows. That let me modernize the data layer incrementally while preserving the existing user experience.

The technical concepts demonstrated are directly transferable to customer lifecycle and marketing operations work: data modeling, schema versioning, normalization, backward compatibility, middleware design, human-in-the-loop automation, traceability, and API-ready integration contracts.
