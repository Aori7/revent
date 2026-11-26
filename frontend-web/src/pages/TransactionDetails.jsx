import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

import {
  ArrowLeft,
  CircleCheck,
  CircleAlert,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";

import {
  demoCustomer,
  demoAccount,
} from "../data/demoBanking";

import {
  formatSGD,
  maskIdentifier,
} from "../utils/banking";

import {
  getTransactions,
} from "../utils/transactionHistory";

import {
  bankingRequest,
  mapBankingTransaction,
} from "../hooks/useBankingTransactions";

import "../css/banking-flow.css";

function DetailRow({ label, value }) {
  return (
    <div className="flow-detail-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function TransactionDetails() {
  const { transactionId } = useParams();

  const isDatabaseTransaction =
    /^[1-9]\d*$/.test(transactionId || "");

  const [result, setResult] = useState(null);
  const [retry, setRetry] = useState(0);

  // Retrieve database transactions securely.
  useEffect(() => {
    if (!isDatabaseTransaction) return;

    const controller = new AbortController();

    async function loadTransaction() {
      try {
        const data = await bankingRequest(
          `/transactions/${encodeURIComponent(
            transactionId
          )}`,
          controller.signal
        );

        if (!data.transaction) {
          throw new Error("Transaction not found.");
        }

        if (!controller.signal.aborted) {
          setResult({
            id: transactionId,
            retry,
            transaction: mapBankingTransaction(
              data.transaction
            ),
          });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setResult({
            id: transactionId,
            retry,
            error: error.message,
          });
        }
      }
    }

    loadTransaction();

    return () => controller.abort();
  }, [transactionId, isDatabaseTransaction, retry]);

  const currentResult =
    result?.id === transactionId &&
    result?.retry === retry
      ? result
      : null;

  // Preserve existing local simulator transactions.
  const localTransaction = !isDatabaseTransaction
    ? getTransactions().find(
        (item) =>
          item.id === transactionId &&
          item.customerId === demoCustomer.id &&
          item.accountId === demoAccount.id
      )
    : null;

  const transaction = isDatabaseTransaction
    ? currentResult?.transaction
    : localTransaction;

  const loading =
    isDatabaseTransaction && !currentResult;

  const completed =
    transaction?.status === "Completed";

  return (
    <main className="flow-page">
      <div className="flow-shell flow-narrow">

        <Link className="flow-back" to="/accounts">
          <ArrowLeft size={19} />
          Back to account overview
        </Link>

        <div className="flow-page-heading">
          <div>
            <span className="flow-eyebrow">
              ACCOUNT ACTIVITY
            </span>

            <h1>Transaction Details</h1>

            <p>
              Review the details of your selected transaction.
            </p>
          </div>
        </div>

        {loading ? (
          <div
            className="flow-panel flow-message"
            role="status"
          >
            <h2>Loading transaction...</h2>
          </div>
        ) : !transaction ? (
          <div
            className="flow-panel flow-message"
            role="alert"
          >
            <CircleAlert size={34} />

            <h2>Transaction unavailable</h2>

            <p>
              {currentResult?.error ||
                "This transaction could not be found."}
            </p>

            {isDatabaseTransaction && (
              <button
                type="button"
                className="flow-button flow-button-secondary"
                onClick={() =>
                  setRetry((value) => value + 1)
                }
              >
                Retry
              </button>
            )}

            <Link
              className="flow-button flow-button-primary"
              to="/accounts"
            >
              Return to accounts
            </Link>
          </div>
        ) : (
          <section className="flow-panel flow-transaction-details">

            <div className="flow-transaction-symbol">
              <ReceiptText size={30} />
            </div>

            <p className="flow-muted">
              {!completed
                ? "Transaction amount"
                : transaction.amount > 0
                  ? "Money received"
                  : "Money sent"}
            </p>

            <h2
              className={
                transaction.amount > 0
                  ? "flow-credit"
                  : ""
              }
            >
              {transaction.amount > 0 ? "+" : "−"}
              {formatSGD(transaction.amount)}
            </h2>

            <div className="flow-status">
              {completed
                ? <CircleCheck size={17} />
                : <CircleAlert size={17} />}

              {transaction.status}
            </div>

            <dl className="flow-detail-list">
              <DetailRow
                label="Transaction"
                value={transaction.name}
              />

              <DetailRow
                label="Transaction type"
                value={transaction.type}
              />

              <DetailRow
                label="Date and time"
                value={
                  `${transaction.date}, ${transaction.time} SGT`
                }
              />

              <DetailRow
                label="Direction"
                value={
                  transaction.amount > 0
                    ? "Incoming"
                    : "Outgoing"
                }
              />

              <DetailRow
                label="Currency"
                value="SGD"
              />

              <DetailRow
                label="Counterparty"
                value={transaction.counterparty}
              />

              <DetailRow
                label="Counterparty identifier"
                value={
                  transaction.counterpartyNumber
                    ? maskIdentifier(
                        transaction.counterpartyNumber
                      )
                    : "Not available"
                }
              />

              <DetailRow
                label="Your account"
                value={
                  isDatabaseTransaction
                    ? `Account ID: ${transaction.accountId}`
                    : maskIdentifier(
                        demoAccount.accountNumber
                      )
                }
              />

              <DetailRow
                label="Description"
                value={transaction.description || "—"}
              />

              <DetailRow
                label="Reference number"
                value={transaction.reference || "—"}
              />
            </dl>

            <p className="flow-trust-note">
              <ShieldCheck size={18} />
              Simulated transaction. No real money was sent.
            </p>

            <Link
              className="flow-button flow-button-secondary flow-wide"
              to="/accounts"
            >
              <ArrowLeft size={18} />
              Back to account overview
            </Link>

          </section>
        )}

      </div>
    </main>
  );
}

export default TransactionDetails;