
"use strict";

const db = require("../config/supabaseAdmin");

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

async function assertQuery(query, stage) {
  const { data, error } = await query;

  if (error) unavailable(stage, error);

  return data ?? [];
}

async function assessServerPaymentRisk(userId, payment) {
  const amount = Number(payment.amount);
  const recipientNumber = payment.recipientNumber;

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
      firstTimeRecipient: true,
      score: 0,
    };
  }

  // For this simulated e-commerce flow, check whether at
  // least one customer-owned account can support the payment.
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

  // Check completed transfers to this recipient.
  const history = await assertQuery(
    db.from("transactions")
      .select(`
        transaction_id,
        account:bank_accounts!transactions_from_account_id_fkey!inner(
          user_id
        ),
        payee:payees!transactions_payee_id_fkey!inner(
          payment_identifier
        )
      `)
      .eq("account.user_id", userId)
      .eq("payee.payment_identifier", recipientNumber)
      .eq("transaction_status", "COMPLETED")
      .limit(1),
    "recipient-history"
  );

  // Check verified scam concerns.
  const reports = await assertQuery(
    db.from("recipient_reports")
      .select("reported_identifier")
      .eq("reported_identifier", recipientNumber)
      .eq("report_status", "VERIFIED_CONCERN")
      .limit(1),
    "verified-reports"
  );

  // Check for unusually frequent completed transfers.
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

  const firstTimeRecipient = history.length === 0;
  const verifiedScamReport = reports.length > 0;
  const rapidTransfers = recent.length >= 3;

  // Match the database-backed portions of Revent's
  // existing frontend risk scoring.
  const score = Math.min(
    100,
    (firstTimeRecipient ? 20 : 0) +
    (firstTimeRecipient && amount >= 500 ? 10 : 0) +
    (amount > 1000 ? 20 : 0) +
    (verifiedScamReport ? 40 : 0) +
    (rapidTransfers ? 15 : 0)
  );

  // Mandatory server-side restrictions.
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
    firstTimeRecipient,
    verifiedScamReport,
    rapidTransfers,
    score,
    requiresReview: score >= 30 || blocked,
  };
}

module.exports = {
  assessServerPaymentRisk,
};
