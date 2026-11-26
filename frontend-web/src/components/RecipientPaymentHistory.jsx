import {
  useEffect,
  useState,
} from "react";

import {
  History,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";

import {
  formatSGD,
} from "../utils/banking.js";

import {
  subscribeToTransactions,
} from "../utils/transactionHistory.js";

import {
  formatHistoryTime,
} from "../utils/recipientPaymentHistory.js";

import {
  getRecipientPaymentHistoryFromApi,
} from "../services/paymentReviewApi.js";

import "../css/payment-review/recipient-payment-history.css";

export default function RecipientPaymentHistory({
  draft,
  onRetry,
}) {
  const [revision, setRevision] = useState(0);

  const [
    showDetails,
    setShowDetails,
  ] = useState(false);

  const [result, setResult] = useState(null);

  const recipientNumber =
    draft?.recipientNumber;

  const amount = draft?.amount;

  // Prevent displaying old history after the
  // recipient or payment amount changes.
  const requestKey = JSON.stringify([
    draft?.customerId,
    draft?.id,
    draft?.version,
    recipientNumber,
    amount,
    revision,
  ]);

  // Preserve transaction update subscriptions.
  useEffect(() => {
    return subscribeToTransactions(() => {
      setRevision((value) => value + 1);
    });
  }, []);

  // PBI-36: Retrieve actual history from the backend.
  useEffect(() => {
    let cancelled = false;

    getRecipientPaymentHistoryFromApi({
      recipientNumber,
      amount,
    })
      .then((history) => {
        if (cancelled) return;

        setResult({
          key: requestKey,
          history,
        });
      })
      .catch(() => {
        if (cancelled) return;

        setResult({
          key: requestKey,
          error: true,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    requestKey,
    recipientNumber,
    amount,
  ]);

  const currentResult =
    result?.key === requestKey
      ? result
      : null;

  const history =
    currentResult?.history;

  const loading =
    !currentResult;

  function retry() {
    setRevision((value) => value + 1);

    onRetry?.();
  }

  return (
    <section
      className="flow-panel recipient-history-compact"
      aria-labelledby="recipient-history-title"
      aria-busy={loading}
    >
      <div className="recipient-history-compact__header">
        <div className="recipient-history-compact__heading">
          <History
            size={24}
            aria-hidden="true"
          />

          <h2 id="recipient-history-title">
            Payment History
          </h2>
        </div>

        <span className="recipient-history-compact__period">
          Last 30 days
        </span>
      </div>

      {loading ? (
        <p
          className="recipient-history-compact__message"
          role="status"
        >
          Retrieving previous payments…
        </p>
      ) : !history ? (
        <div
          className="recipient-history-compact__error"
          role="alert"
        >
          <AlertCircle size={22} />

          <div>
            <strong>
              Payment history unavailable
            </strong>

            <p>
              We couldn't retrieve previous payments.
            </p>

            <button
              type="button"
              onClick={retry}
            >
              Retry
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="recipient-history-compact__stats">
            <div className="recipient-history-compact__stat">
              <span>Previously sent</span>

              <strong>
                {formatSGD(
                  history.alreadySentCents / 100
                )}
              </strong>
            </div>

            <div className="recipient-history-compact__stat">
              <span>Total if sent</span>

              <strong>
                {formatSGD(
                  history.totalCents / 100
                )}
              </strong>
            </div>
          </div>

          <p className="recipient-history-compact__message">
            {history.payments.length === 0
              ? `No completed payments to ${draft.recipientName} in the last 30 days.`
              : `${history.payments.length} completed payment${
                  history.payments.length === 1
                    ? ""
                    : "s"
                } to ${draft.recipientName} in the last 30 days.`}
          </p>

          <button
            type="button"
            className="recipient-history-compact__toggle"
            aria-expanded={showDetails}
            aria-controls="recipient-history-details"
            onClick={() =>
              setShowDetails((value) => !value)
            }
          >
            {showDetails
              ? "Hide details"
              : "View payment details"}

            {showDetails ? (
              <ChevronUp size={18} />
            ) : (
              <ChevronDown size={18} />
            )}
          </button>

          {showDetails && (
            <div
              id="recipient-history-details"
              className="recipient-history-compact__details"
            >
              <p>
                {formatHistoryTime(history.start)}
                {" – "}
                {formatHistoryTime(history.end)}
                {" (SGT)"}
              </p>

              {history.payments.length > 0 && (
                <ul>
                  {history.payments.map((payment) => (
                    <li key={payment.id}>
                      <span>
                        {formatHistoryTime(payment.time)}
                      </span>

                      <strong>
                        {formatSGD(
                          payment.amountCents / 100
                        )}
                      </strong>
                    </li>
                  ))}
                </ul>
              )}

              <div className="recipient-history-compact__proposed">
                <span>
                  Proposed payment (not sent)
                </span>

                <strong>
                  {formatSGD(
                    history.proposedCents / 100
                  )}
                </strong>
              </div>

              <p>
                Previous payments may relate to
                different purchases. The proposed
                payment has not been sent.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}