(() => {
  'use strict';

  const RECEIPT_KEY = 'pantry-raccoon:receipts:v1';
  const SCHEMA_VERSION = 1;
  const INVENTORY_KINDS = new Set(['pantry', 'fridge', 'freezer']);
  const FIRST_RECEIPT_URL = '/data/receipts/receipt_hyvee_2026-08-29_44233905.json';

  function nowIso() {
    return new Date().toISOString();
  }

  function readLedger() {
    try {
      const parsed = JSON.parse(localStorage.getItem(RECEIPT_KEY) || '{}');
      return {
        schema: 'pancoon.receipt-ledger',
        schemaVersion: SCHEMA_VERSION,
        receipts: Array.isArray(parsed.receipts) ? parsed.receipts : [],
        updatedAt: parsed.updatedAt || ''
      };
    } catch {
      return {
        schema: 'pancoon.receipt-ledger',
        schemaVersion: SCHEMA_VERSION,
        receipts: [],
        updatedAt: ''
      };
    }
  }

  function writeLedger(ledger) {
    ledger.schema = 'pancoon.receipt-ledger';
    ledger.schemaVersion = SCHEMA_VERSION;
    ledger.updatedAt = nowIso();
    localStorage.setItem(RECEIPT_KEY, JSON.stringify(ledger));
  }

  function validReceipt(receipt) {
    return Boolean(
      receipt &&
      receipt.schema === 'pancoon.receipt' &&
      Number(receipt.schemaVersion) === SCHEMA_VERSION &&
      receipt.id &&
      receipt.purchaseDate &&
      Array.isArray(receipt.items)
    );
  }

  function ingest(receipt, options = {}) {
    if (!validReceipt(receipt)) {
      throw new Error('Receipt does not match the PanCoon receipt contract.');
    }

    const ledger = readLedger();
    const importedAt = options.importedAt || nowIso();
    const record = {
      ...receipt,
      importedAt,
      importSource: options.importSource || receipt.source?.sourceFile || 'unknown',
      importStatus: options.importStatus || 'proposed'
    };

    const index = ledger.receipts.findIndex(candidate => candidate?.id === receipt.id);
    if (index >= 0) {
      ledger.receipts[index] = {
        ...ledger.receipts[index],
        ...record,
        importedAt: ledger.receipts[index].importedAt || importedAt
      };
    } else {
      ledger.receipts.push(record);
    }

    writeLedger(ledger);
    document.dispatchEvent(new CustomEvent('pancoon:receipt-ingested', {
      detail: { receiptId: receipt.id }
    }));
    return record;
  }

  function getAll() {
    return readLedger().receipts
      .slice()
      .sort((a, b) => String(b.purchaseDate || '').localeCompare(String(a.purchaseDate || '')));
  }

  function getById(receiptId) {
    return getAll().find(receipt => receipt.id === receiptId) || null;
  }

  function proposalForItem(receipt, item) {
    if (!item || !item.watch || !INVENTORY_KINDS.has(item.inventoryKind)) return null;

    const reviewReasons = [];
    if (item.reviewRequired) reviewReasons.push('receipt-substitution');
    if (item.needsDatePrompt) reviewReasons.push('printed-date-needed');
    if (item.quantityValue === null || item.quantityValue === undefined) reviewReasons.push('quantity-unknown');

    return {
      schema: 'pancoon.inventory-proposal',
      schemaVersion: SCHEMA_VERSION,
      id: `proposal:${item.id}`,
      receiptId: receipt.id,
      receiptLineId: item.id,
      purchaseDate: receipt.purchaseDate,
      source: 'receipt',
      sourceRef: `${receipt.source?.store || 'store'}:${receipt.source?.orderNumber || receipt.id}`,
      rawName: item.rawName || '',
      name: item.normalizedName || item.rawName || '',
      kind: item.inventoryKind,
      category: item.inventoryCategory || 'Other',
      quantityValue: item.quantityValue ?? null,
      unit: item.unit || '',
      quantityText: item.quantityText || '',
      status: 'plenty',
      foodGroup: item.foodGroup || 'other',
      freshnessStrategy: item.freshnessStrategy || 'none',
      printedDate: '',
      estimatedUseByDate: '',
      needsDatePrompt: Boolean(item.needsDatePrompt),
      reviewRequired: reviewReasons.length > 0,
      reviewReasons,
      substitutionCandidates: Array.isArray(item.substitutionCandidates)
        ? item.substitutionCandidates.slice()
        : [],
      receiptNote: item.receiptNote || '',
      proposedAt: nowIso()
    };
  }

  function getProposals(receiptId) {
    const receipt = getById(receiptId);
    if (!receipt) return [];
    return receipt.items
      .map(item => proposalForItem(receipt, item))
      .filter(Boolean);
  }

  function getDatePrompts(receiptId) {
    return getProposals(receiptId).filter(proposal => proposal.needsDatePrompt);
  }

  function getReviewQueue(receiptId) {
    return getProposals(receiptId).filter(proposal => proposal.reviewRequired);
  }

  function exportPayload(receiptId) {
    const receipt = getById(receiptId);
    if (!receipt) return null;
    return {
      schema: 'pancoon.receipt-review',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: nowIso(),
      receipt,
      inventoryProposals: getProposals(receiptId)
    };
  }

  async function seedFirstReceipt() {
    if (getById('hyvee:44233905')) return;
    try {
      const response = await fetch(FIRST_RECEIPT_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Receipt seed returned ${response.status}.`);
      const receipt = await response.json();
      ingest(receipt, {
        importSource: 'phase-0-seed',
        importStatus: 'proposed'
      });
    } catch (error) {
      console.error('PanCoon receipt seed failed.', error);
    }
  }

  window.PanCoonReceiptBridge = Object.freeze({
    schemaVersion: SCHEMA_VERSION,
    storageKey: RECEIPT_KEY,
    ingest,
    getAll,
    getById,
    getProposals,
    getDatePrompts,
    getReviewQueue,
    exportPayload
  });

  seedFirstReceipt();
})();
