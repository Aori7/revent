import { demoAccount } from "../data/demoBanking.js";
import { getTransactions } from "./transactionHistory.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const MONTHS =
  "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");

function normalise(value) {
  return String(value ?? "").replace(/[\s-]/g, "");
}

export function toCents(value) {
  const match = String(value).match(
    /^(-?)(\d+)(?:\.(\d{1,2}))?$/
  );

  if (!match) {
    throw new Error("Invalid payment amount.");
  }

  const cents =
    Number(match[2]) * 100 +
    Number((match[3] || "").padEnd(2, "0"));

  if (!Number.isSafeInteger(cents)) {
    throw new Error("Invalid payment amount.");
  }

  return match[1] === "-" ? -cents : cents;
}

function transactionTime(item) {
  // Prefer the original transaction timestamp.
  if (item.createdAt != null) {
    const time = Date.parse(item.createdAt);

    if (!Number.isFinite(time)) {
      throw new Error("Invalid transaction date.");
    }

    return time;
  }

  // Support existing demo transaction dates.
  const match = String(item.date).match(
    /^(\d{1,2}) ([A-Z][a-z]{2}) (\d{4})$/
  );

  const clock = String(item.time || "00:00").match(
    /^(\d{2}):(\d{2})$/
  );

  const month = match
    ? MONTHS.indexOf(match[2])
    : -1;

  if (!match || !clock || month < 0) {
    throw new Error("Invalid transaction date.");
  }

  const day = Number(match[1]);
  const year = Number(match[3]);
  const hour = Number(clock[1]);
  const minute = Number(clock[2]);

  const utc = Date.UTC(
    year,
    month,
    day,
    hour,
    minute
  );

  if (
    new Date(utc).getUTCDate() !== day ||
    hour > 23 ||
    minute > 59
  ) {
    throw new Error("Invalid transaction date.");
  }

  // Existing demo dates use Singapore time (UTC+8).
  return utc - 8 * 60 * 60 * 1000;
}

export function buildRecipientPaymentHistory(
  draft,
  transactions,
  now = new Date()
) {
  const recipient = normalise(draft?.recipientNumber);
  const end = now.getTime();

  if (
    !draft?.customerId ||
    !recipient ||
    !Number.isFinite(end)
  ) {
    throw new Error("Invalid payment details.");
  }

  const start = end - 30 * DAY_MS;
  const proposedCents = toCents(draft.amount);

  if (proposedCents <= 0) {
    throw new Error("Invalid proposed payment.");
  }

  const payments = [];

  for (const item of transactions) {
    const currency =
      item.currency ??
      (item.accountId === demoAccount.id
        ? demoAccount.currency
        : null);

    // Only include completed SGD payments belonging
    // to the current customer and same recipient.
    if (
      item.customerId !== draft.customerId ||
      item.status !== "Completed" ||
      currency !== "SGD" ||
      normalise(item.counterpartyNumber) !== recipient
    ) {
      continue;
    }

    const cents = toCents(item.amount);

    // Negative amounts represent outgoing payments.
    if (cents >= 0) continue;

    const time = transactionTime(item);

    // Exclude older transactions and future transactions.
    if (time < start || time > end) continue;

    payments.push({
      id: item.id,
      time,
      amountCents: -cents,
    });
  }

  // Chronological order: oldest to newest.
  payments.sort((a, b) => a.time - b.time);

  const alreadySentCents = payments.reduce(
    (sum, item) => sum + item.amountCents,
    0
  );

  const totalCents =
    alreadySentCents + proposedCents;

  if (!Number.isSafeInteger(totalCents)) {
    throw new Error("Invalid payment total.");
  }

  return {
    payments,
    start,
    end,
    alreadySentCents,
    proposedCents,
    totalCents,
  };
}

export function getRecipientPaymentHistory(
  draft,
  now = new Date()
) {
  return buildRecipientPaymentHistory(
    draft,
    getTransactions({ strict: true }),
    now
  );
}

export function formatHistoryTime(time) {
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(time);
}