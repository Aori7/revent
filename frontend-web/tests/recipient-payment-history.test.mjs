import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";

import {
  buildRecipientPaymentHistory,
  getRecipientPaymentHistory,
  toCents,
} from "../src/utils/recipientPaymentHistory.js";

import {
  demoCustomer,
  demoAccount,
  startingPayment,
} from "../src/data/demoBanking.js";

import {
  addTransaction,
  getTransactions,
} from "../src/utils/transactionHistory.js";

const now = new Date("2026-11-17T14:00:00Z");

const draft = {
  ...startingPayment,
  customerId: demoCustomer.id,
};

const row = (overrides = {}) => ({
  id: "test-1",
  customerId: demoCustomer.id,
  accountId: demoAccount.id,
  counterpartyNumber: "91234567",
  amount: -10.10,
  status: "Completed",
  createdAt: "2026-11-10T05:00:00Z",
  ...overrides,
});

const build = (rows, payment = draft) =>
  buildRecipientPaymentHistory(payment, rows, now);

beforeEach(() => {
  const values = new Map();

  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) =>
      values.set(key, String(value)),
  };

  globalThis.window = new EventTarget();
});

// TEST 1: Recipient and customer filtering
test("same customer and recipient identifier, not display name", () => {
  const result = build([
    row({
      id: "match",
      counterpartyNumber: "9123-4567",
      counterparty: "Different name",
    }),

    row({
      id: "other",
      counterpartyNumber: "81234567",
      counterparty: draft.recipientName,
    }),

    row({
      id: "foreign",
      customerId: "another-customer",
    }),
  ]);

  assert.deepEqual(
    result.payments.map((p) => p.id),
    ["match"]
  );
});

// TEST 2: Status, direction and currency filtering
test("completed outgoing SGD only", () => {
  const result = build([
    row({ id: "valid", currency: "SGD" }),
    row({ id: "pending", status: "Pending" }),
    row({ id: "failed", status: "Failed" }),
    row({ id: "cancelled", status: "Cancelled" }),
    row({ id: "incoming", amount: 20 }),
    row({ id: "foreignCurrency", currency: "USD" }),
  ]);

  assert.deepEqual(
    result.payments.map((p) => p.id),
    ["valid"]
  );
});

// TEST 3: Exact 30-day date boundary
test("30-day cutoff is inclusive, older and future dates are excluded", () => {
  const result = build([
    row({
      id: "boundary",
      createdAt: "2026-10-18T14:00:00Z",
    }),

    row({
      id: "older",
      createdAt: "2026-10-18T13:59:59Z",
    }),

    row({
      id: "now",
      createdAt: now.toISOString(),
    }),

    row({
      id: "future",
      createdAt: "2026-11-17T14:00:01Z",
    }),
  ]);

  assert.deepEqual(
    result.payments.map((p) => p.id),
    ["boundary", "now"]
  );
});

// TEST 4: Chronological ordering
test("legacy date/time uses Singapore time and sorts oldest first", () => {
  const result = build([
    row({
      id: "later",
      createdAt: "2026-11-11T00:00:00Z",
    }),

    row({
      id: "early",
      createdAt: undefined,
      date: "8 Nov 2026",
      time: "14:20",
    }),
  ]);

  assert.deepEqual(
    result.payments.map((p) => p.id),
    ["early", "later"]
  );

  assert.equal(
    result.payments[0].time,
    Date.parse("2026-11-08T06:20:00Z")
  );
});

// TEST 5: Accurate integer cents calculation
test("integer cents prevent decimal rounding errors", () => {
  const result = build(
    [
      row({ amount: -0.10 }),
      row({ id: "second", amount: -0.20 }),
    ],
    {
      ...draft,
      amount: "0.30",
    }
  );

  assert.equal(result.alreadySentCents, 30);
  assert.equal(result.proposedCents, 30);
  assert.equal(result.totalCents, 60);
  assert.equal(toCents("12.05"), 1205);
});

// TEST 6: Empty history
test("no history gives zero already sent and proposed total only", () => {
  const result = build([], draft);

  assert.deepEqual(result.payments, []);
  assert.equal(result.alreadySentCents, 0);
  assert.equal(result.totalCents, 28000);
});

// TEST 7: Existing and stored transactions
test("existing demo plus stored completed history is retrieved without duplicates", () => {
  localStorage.setItem(
    "reventTransactionHistory",
    JSON.stringify([row(), row()])
  );

  const result = getRecipientPaymentHistory(
    draft,
    now
  );

  assert.deepEqual(
    result.payments.map((p) => p.id),
    ["txn-1004", "test-1"]
  );

  assert.equal(result.alreadySentCents, 16010);
  assert.equal(result.totalCents, 44010);
});

// TEST 8: Corrupted transaction history
test("corrupt history throws while existing default reader still works", () => {
  localStorage.setItem(
    "reventTransactionHistory",
    "not-json"
  );

  assert.throws(() =>
    getRecipientPaymentHistory(draft, now)
  );

  assert.ok(getTransactions().length > 0);

  localStorage.setItem(
    "reventTransactionHistory",
    "{}"
  );

  assert.throws(() =>
    getRecipientPaymentHistory(draft, now)
  );
});

// TEST 9: Invalid records and unavailable storage
test("invalid matching amount/date and unavailable storage throw", () => {
  assert.throws(() =>
    build([row({ amount: -0.001 })])
  );

  assert.throws(() =>
    build([row({ createdAt: "invalid" })])
  );

  localStorage.getItem = () => {
    throw new Error("Storage unavailable");
  };

  assert.throws(() =>
    getRecipientPaymentHistory(draft, now)
  );
});

// TEST 10: Currency is retained for new transactions
test("new stored transactions retain currency, and foreign currency is excluded", () => {
  const item = addTransaction({
    name: "Recipient",
    amount: -20,
    currency: "USD",
    counterpartyNumber: draft.recipientNumber,
  });

  assert.equal(item.currency, "USD");
  assert.equal(build([item]).payments.length, 0);
});