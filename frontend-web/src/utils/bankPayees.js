const STORAGE_KEY = "reventBankPayees";

export const COOLING_OFF_MS = 12 * 60 * 60 * 1000;

const DEFAULT_PAYEES = [
  {
    id: "demo-existing",
    name: "Alex Tan",
    bank: "DBS / POSB",
    accountNumber: "1234567890",
    activatedAt: 0,
    isNewRecipient: false,
  },
];

export function getBankPayees() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return [...DEFAULT_PAYEES];
    }

    const parsed = JSON.parse(stored);

    return Array.isArray(parsed)
      ? parsed
      : [...DEFAULT_PAYEES];
  } catch {
    return [...DEFAULT_PAYEES];
  }
}

export function saveBankPayees(payees) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(payees)
  );
}

export function addBankPayee(payee) {
  const payees = getBankPayees();

  const duplicate = payees.some(
    (existing) =>
      existing.bank === payee.bank &&
      existing.accountNumber === payee.accountNumber
  );

  if (duplicate) {
    throw new Error(
      "This bank account is already saved."
    );
  }

  saveBankPayees([...payees, payee]);
}

export function deleteBankPayee(id) {
  const updated = getBankPayees().filter(
    (payee) => payee.id !== id
  );

  saveBankPayees(updated);

  return updated;
}

export function isPayeePending(payee, now = Date.now()) {
  return now < payee.activatedAt;
}
