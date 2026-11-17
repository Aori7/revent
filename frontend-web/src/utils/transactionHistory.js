import {
  demoTransactions,
  demoAccount,
  demoCustomer,
} from "../data/demoBanking.js";

const STORAGE_KEY = "reventTransactionHistory";
const EVENT_NAME = "revent-transactions-updated";

export function getTransactions(
  { strict = false } = {}
) {
  let saved = [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];

    if (
      strict &&
      (
        !Array.isArray(parsed) ||
        parsed.some(
          (item) =>
            !item ||
            typeof item !== "object" ||
            Array.isArray(item) ||
            !item.id
        )
      )
    ) {
      throw new Error("Invalid transaction history.");
    }

    saved = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (strict) throw error;

    saved = [];
  }

  // Keep the original demo transactions and add new ones.
  const combined = [...saved, ...demoTransactions];

  const unique = Array.from(
    new Map(
      combined.map((txn) => [txn.id, txn])
    ).values()
  );

  return unique.sort((a, b) => {
    const dateA = new Date(
      `${a.date} ${a.time || "00:00"}`
    );

    const dateB = new Date(
      `${b.date} ${b.time || "00:00"}`
    );

    return dateB - dateA;
  });
}

export function addTransaction(transaction) {
  const now = new Date();

  const newTransaction = {
    id: crypto.randomUUID(),
    accountId: demoAccount.id,
    customerId: demoCustomer.id,
    name: transaction.name,
    type: transaction.type,

    date: now.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),

    time: now.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),

    amount: transaction.amount,
    currency: transaction.currency ?? demoAccount.currency,
    icon: transaction.icon || "transfer",
    status: transaction.status || "Completed",
    reference: transaction.reference || "",
    counterparty: transaction.counterparty || transaction.name,
    counterpartyNumber: transaction.counterpartyNumber || "",
    description: transaction.description || "",
    createdAt: now.toISOString(),
  };

  let stored = [];

  try {
    const parsed = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

    stored = Array.isArray(parsed) ? parsed : [];
  } catch {
    stored = [];
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([newTransaction, ...stored])
  );

  window.dispatchEvent(new Event(EVENT_NAME));

  return newTransaction;
}

export function subscribeToTransactions(callback) {
  const handleChange = () => callback();

  window.addEventListener(EVENT_NAME, handleChange);
  window.addEventListener("storage", handleChange);

  return () => {
    window.removeEventListener(EVENT_NAME, handleChange);
    window.removeEventListener("storage", handleChange);
  };
}