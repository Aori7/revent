import { useEffect, useState } from "react";

import {
  getTransactions,
  subscribeToTransactions,
} from "../utils/transactionHistory";

const BASE_URL = "/api/banking";

export async function bankingRequest(path, signal) {
  const token = sessionStorage.getItem(
    "reventAccessToken"
  );

  if (!token) {
    throw new Error("Please log in again.");
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || "Unable to retrieve transactions."
    );
  }

  return data;
}

// Convert a Supabase record into the format
// used by the existing TransactionItem component.
export function mapBankingTransaction(row) {
  const rawDate =
    row.completed_at || row.created_at;

  let timestamp = null;

  if (rawDate) {
    const normalized = rawDate.replace(" ", "T");

    timestamp = new Date(
      /(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized)
        ? normalized
        : `${normalized}Z`
    );
  }

  const validDate =
    timestamp &&
    Number.isFinite(timestamp.getTime());

  const paymentTypes = {
    PAYNOW: "PayNow Transfer",
    BANK_TRANSFER: "Bank Transfer",
    QR_CODE: "Scan & Pay",
    SCAN_PAY: "Scan & Pay",
    SCHEDULED: "Scheduled Transfer",
  };

  const recipient =
    row.payee?.payee_name || "Payment recipient";

  return {
    id: String(row.transaction_id),
    accountId: row.from_account_id,

    name: recipient,

    type:
      paymentTypes[row.payment_method] ||
      row.payment_method ||
      "Transfer",

    amount: -Math.abs(Number(row.amount)),

    currency: "SGD",

    icon: "transfer",

    date: validDate
      ? timestamp.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "Asia/Singapore",
        })
      : "Date unavailable",

    time: validDate
      ? timestamp.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Asia/Singapore",
        })
      : "Time unavailable",

    createdAt: validDate
      ? timestamp.toISOString()
      : null,

    status:
      row.transaction_status === "COMPLETED"
        ? "Completed"
        : row.transaction_status,

    reference: row.transaction_reference || "",
    counterparty: recipient,
    counterpartyNumber: "",
    description: row.payment_purpose || "",
    source: "supabase",
  };
}

function transactionTime(transaction) {
  const date = new Date(
    transaction.createdAt ||
      `${transaction.date} ${transaction.time || "00:00"}`
  );

  return Number.isFinite(date.getTime())
    ? date.getTime()
    : 0;
}

export default function useBankingTransactions() {
  const [databaseTransactions, setDatabaseTransactions] =
    useState([]);

  const [localTransactions, setLocalTransactions] =
    useState(() => getTransactions());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    return subscribeToTransactions(() => {
      setLocalTransactions(getTransactions());
      setRevision((value) => value + 1);
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTransactions() {
      setLoading(true);
      setError("");

      try {
        const data = await bankingRequest(
          "/overview",
          controller.signal
        );

        if (!Array.isArray(data.recentTransactions)) {
          throw new Error(
            "Invalid transaction history response."
          );
        }

        const completed =
          data.recentTransactions
            .filter(
              (row) =>
                row.transaction_status === "COMPLETED"
            )
            .map(mapBankingTransaction);

        if (!controller.signal.aborted) {
          setDatabaseTransactions(completed);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadTransactions();

    return () => controller.abort();
  }, [revision]);

  // Keep existing local simulator transactions so
  // teammates' demonstration flows remain available.
  const databaseReferences = new Set(
    databaseTransactions
      .map((item) => item.reference)
      .filter(Boolean)
  );

  const transactions = [
    ...databaseTransactions,

    ...localTransactions.filter(
      (item) =>
        !item.reference ||
        !databaseReferences.has(item.reference)
    ),
  ].sort(
    (a, b) =>
      transactionTime(b) - transactionTime(a)
  );

  function retry() {
    setRevision((value) => value + 1);
  }

  return {
    transactions,
    loading,
    error,
    retry,
  };
}