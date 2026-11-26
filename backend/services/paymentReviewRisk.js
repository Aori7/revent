"use strict";

const db = require("../config/supabaseAdmin");

const FIRST_RECIPIENT_THRESHOLD = 500;

function unavailable(stage, error) {
  console.error(
    `[payment-risk:${stage}]`,
    error?.code || error?.message
  );

  const failure = new Error(
    "Payment safety checks are temporarily unavailable."
  );

  failure.status = 503;
  throw failure;
}

function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

async function assertQuery(query, stage) {
  const { data, error } = await query;

  if (error) unavailable(stage, error);

  return data ?? [];
}

// PBI-34 and PBI-36:
// Retrieve trusted recipient history from Supabase.
async function getRecipientPaymentHistory(userId, payment) {
  const recipientNumber = String(
    payment?.recipientNumber ?? ""
  ).replace(/[\s-]/g, "");

  const amountText = String(payment?.amount ?? "");

  const amount = Number(amountText);

  if (
    !userId ||
    !/^\d{8,16}$/.test(recipientNumber) ||
    !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(amountText) ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 1000000
  ) {
    invalid("Enter valid recipient and payment details.");
  }

  const { data, error } = await db.rpc(
    "revent_sprint2_recipient_history",
    {
      p_user: userId,
      p_recipient: recipientNumber,
      p_amount: amount.toFixed(2),
    }
  );

  if (error) {
    unavailable("recipient-history", error);
  }

  // Never treat a missing or invalid response as zero history.
  if (
    !data ||
    typeof data.isNewRecipient !== "boolean" ||
    !Array.isArray(data.payments) ||
    !Number.isSafeInteger(data.alreadySentCents) ||
    !Number.isSafeInteger(data.proposedCents) ||
    !Number.isSafeInteger(data.totalCents) ||
    !Number.isSafeInteger(data.start) ||
    !Number.isSafeInteger(data.end) ||
    data.alreadySentCents < 0 ||
    data.proposedCents <= 0 ||
    data.totalCents !==
      data.alreadySentCents + data.proposedCents ||
    data.currency !== "SGD"
  ) {
    unavailable(
      "recipient-history",
      new Error("Invalid recipient history response.")
    );
  }

  return data;
}

async function assessServerPaymentRisk(userId, payment) {
  const amount = Number(payment.amount);

  const recipientNumber = String(
    payment.recipientNumber
  ).replace(/[\s-]/g, "");

  // PBI-34: Use actual completed payment history.
  const history = await getRecipientPaymentHistory(
    userId,
    payment
  );

  const isNewRecipient = history.isNewRecipient;

  // Only trigger the first-time recipient alert
  // when the proposed amount is at least SGD 500.
  const firstTimeRecipient =
    isNewRecipient &&
    amount >= FIRST_RECIPIENT_THRESHOLD;

  // Always use the authenticated user ID.
  const accounts = await assertQuery(
    db.from("bank_accounts")
      .select("account_id,balance,daily_transfer_limit")
      .eq("user_id", userId),
    "accounts"
  );

  if (accounts.length === 0) {
    return {
      blocked: true,
      reason: "No eligible account was found for this customer.",
      requiresReview: true,
      isNewRecipient,
      firstTimeRecipient,
      score: 0,
    };
  }

  // Preserve existing account balance and limit checks.
  const eligible = accounts.some((account) => {
    const balance = Number(account.balance);
    const limit = Number(account.daily_transfer_limit);

    return (
      Number.isFinite(balance) &&
      Number.isFinite(limit) &&
      balance >= amount &&
      limit >= amount
    );
  });

  // Preserve existing verified scam concern checks.
  const reports = await assertQuery(
    db.from("recipient_reports")
      .select("reported_identifier")
      .eq("reported_identifier", recipientNumber)
      .eq("report_status", "VERIFIED_CONCERN")
      .limit(1),
    "verified-reports"
  );

  // Preserve existing rapid completed transfer checks.
  const tenMinutesAgo = new Date(
    Date.now() - 10 * 60 * 1000
  ).toISOString();

  const recent = await assertQuery(
    db.from("transactions")
      .select(`
        transaction_id,
        account:bank_accounts!transactions_from_account_id_fkey!inner(
          user_id
        )
      `)
      .eq("account.user_id", userId)
      .eq("transaction_status", "COMPLETED")
      .gte("created_at", tenMinutesAgo)
      .limit(3),
    "recent-transfers"
  );

  const verifiedScamReport = reports.length > 0;
  const rapidTransfers = recent.length >= 3;

  // Preserve the existing risk scoring system.
  const score = Math.min(
    100,
    (isNewRecipient ? 20 : 0) +
    (firstTimeRecipient ? 10 : 0) +
    (amount > 1000 ? 20 : 0) +
    (verifiedScamReport ? 40 : 0) +
    (rapidTransfers ? 15 : 0)
  );

  // Preserve mandatory server-side restrictions.
  const blocked =
    !eligible ||
    verifiedScamReport ||
    rapidTransfers;

  const reason = !eligible
    ? "Payment exceeds the available balance or daily limit of every owned account."
    : verifiedScamReport
      ? "Recipient has a verified scam report. Payment is blocked."
      : rapidTransfers
        ? "Multiple recent transfers detected. Payment is temporarily blocked."
        : "";

  return {
    blocked,
    reason,
    isNewRecipient,
    firstTimeRecipient,
    verifiedScamReport,
    rapidTransfers,
    score,
    requiresReview: score >= 30 || blocked,
  };
}

module.exports = {
  assessServerPaymentRisk,
  getRecipientPaymentHistory,
};