const supabase = require("../config/supabaseAdmin");

// Only retrieve fields needed by the account interface.
const ACCOUNT_FIELDS = `
  account_id,
  account_number,
  account_type,
  balance,
  daily_transfer_limit
`;

// Inner join ensures ownership filtering applies to transactions.
const TRANSACTION_FIELDS = `
  transaction_id,
  from_account_id,
  amount,
  payment_method,
  payment_purpose,
  transaction_status,
  transaction_reference,
  created_at,
  completed_at,
  account:bank_accounts!transactions_from_account_id_fkey!inner(
    user_id
  ),
  payee:payees!transactions_payee_id_fkey(
    payee_name
  )
`;

function removeOwnershipFields(transaction) {
  const { account, ...details } = transaction;
  return details;
}

function handleDatabaseError(res, error, operation) {
  // Keep database details in server logs, not customer responses.
  console.error(`[banking:${operation}]`, error.code || "UNKNOWN");

  return res.status(500).json({
    error: "Unable to retrieve banking information. Please try again.",
  });
}

// GET /api/banking/overview
async function getOverview(req, res) {
  try {
    // req.user.id comes from the verified access token.
    const userId = req.user.id;

    const accountsResult = await supabase
      .from("bank_accounts")
      .select(ACCOUNT_FIELDS)
      .eq("user_id", userId)
      .order("account_id", { ascending: true });

    if (accountsResult.error) {
      return handleDatabaseError(
        res,
        accountsResult.error,
        "accounts"
      );
    }

    const accounts = accountsResult.data || [];

    if (accounts.length === 0) {
      return res.json({
        accounts: [],
        recentTransactions: [],
      });
    }

    const transactionsResult = await supabase
      .from("transactions")
      .select(TRANSACTION_FIELDS)
      .eq("account.user_id", userId)
      .order("created_at", {
        ascending: false,
        nullsFirst: false,
      })
      .order("transaction_id", { ascending: false })
      .limit(5);

    if (transactionsResult.error) {
      return handleDatabaseError(
        res,
        transactionsResult.error,
        "recent-transactions"
      );
    }

    return res.json({
      accounts,
      recentTransactions: (transactionsResult.data || []).map(
        removeOwnershipFields
      ),
    });
  } catch (error) {
    return handleDatabaseError(res, error, "overview");
  }
}

// GET /api/banking/transactions/:transactionId
async function getTransactionDetails(req, res) {
  const rawId = req.params.transactionId;

  // Your Supabase transaction_id is a positive PostgreSQL integer.
  if (!/^[1-9]\d*$/.test(rawId)) {
    return res.status(400).json({
      error: "Invalid transaction ID.",
    });
  }

  const transactionId = Number(rawId);

  if (
    !Number.isSafeInteger(transactionId) ||
    transactionId > 2147483647
  ) {
    return res.status(400).json({
      error: "Invalid transaction ID.",
    });
  }

  try {
    const { data, error } = await supabase
      .from("transactions")
      .select(TRANSACTION_FIELDS)
      .eq("transaction_id", transactionId)
      .eq("account.user_id", req.user.id)
      .maybeSingle();

    if (error) {
      return handleDatabaseError(res, error, "transaction-details");
    }

    // Same response for missing and other customers' transactions.
    if (!data) {
      return res.status(404).json({
        error: "Transaction not found.",
      });
    }

    return res.json({
      transaction: removeOwnershipFields(data),
    });
  } catch (error) {
    return handleDatabaseError(res, error, "transaction-details");
  }
}

module.exports = {
  getOverview,
  getTransactionDetails,
};