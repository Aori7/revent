import { useEffect, useState } from "react";

import {
  formatSGD,
  maskIdentifier,
} from "../utils/banking.js";

import {
  subscribeToTransactions,
} from "../utils/transactionHistory.js";

import {
  getRecipientPaymentHistory,
  formatHistoryTime,
} from "../utils/recipientPaymentHistory.js";

import "../css/recipient-payment-history.css";

export default function RecipientPaymentHistory({
  draft,
  onRetry,
}) {
  const [, setRevision] = useState(0);

  useEffect(() => {
    return subscribeToTransactions(() =>
      setRevision((value) => value + 1)
    );
  }, []);

  let history = null;

  try {
    history = getRecipientPaymentHistory(draft);
  } catch {
    // Never present unavailable history as zero.
  }

  function retry() {
    setRevision((value) => value + 1);
    onRetry?.();
  }

  return (
    <section
      className="flow-panel recipient-history"
      aria-labelledby="recipient-history-title"
    >
      <div className="flow-section-title">
        <div>
          <span className="flow-eyebrow">
            PAYMENT HISTORY
          </span>

          <h2 id="recipient-history-title">
            Previous payments to this recipient
          </h2>
        </div>

        <span className="flow-tag">
          Last 30 days
        </span>
      </div>

      <p className="flow-muted">
        {draft.recipientName} (
        {maskIdentifier(draft.recipientNumber)})
      </p>

      {!history ? (
        <>
          <div
            className="recipient-history__error"
            role="alert"
          >
            <p>
              We could not retrieve your payment history.
              Your previous payments and total are unavailable.
            </p>

            <button
              type="button"
              className="flow-button flow-button-secondary"
              onClick={retry}
            >
              Retry payment history
            </button>
          </div>

          <dl className="recipient-history__totals">
            <div className="recipient-history__item">
              <dt>Already sent in the last 30 days</dt>
              <dd>Unavailable</dd>
            </div>

            <div className="recipient-history__item">
              <dt>
                Proposed payment
                <span className="recipient-history__pending">
                  Not sent
                </span>
              </dt>

              <dd>{formatSGD(draft.amount)}</dd>
            </div>

            <div className="recipient-history__item recipient-history__total">
              <dt>Total if sent</dt>
              <dd>Unavailable</dd>
            </div>
          </dl>
        </>
      ) : (
        <>
          <p className="flow-muted">
            {formatHistoryTime(history.start)} –{" "}
            {formatHistoryTime(history.end)} (SGT)
          </p>

          {history.payments.length === 0 ? (
            <p className="flow-muted" role="status">
              No completed outgoing SGD payments to this
              recipient in the last 30 days.
            </p>
          ) : (
            <ol
              className="recipient-history__list"
              aria-label="Completed payments, oldest first"
            >
              {history.payments.map((payment) => (
                <li
                  key={payment.id}
                  className="recipient-history__item"
                >
                  <div>
                    <strong>
                      {formatHistoryTime(payment.time)}
                    </strong>

                    <span className="recipient-history__completed">
                      Completed
                    </span>
                  </div>

                  <strong>
                    {formatSGD(payment.amountCents / 100)}
                  </strong>
                </li>
              ))}
            </ol>
          )}

          <dl className="recipient-history__totals">
            <div className="recipient-history__item">
              <dt>Already sent in the last 30 days</dt>

              <dd>
                {formatSGD(history.alreadySentCents / 100)}
              </dd>
            </div>

            <div className="recipient-history__item">
              <dt>
                Proposed payment

                <span className="recipient-history__pending">
                  Not sent
                </span>
              </dt>

              <dd>
                {formatSGD(history.proposedCents / 100)}
              </dd>
            </div>

            <div className="recipient-history__item recipient-history__total">
              <dt>Total if sent</dt>

              <dd>
                {formatSGD(history.totalCents / 100)}
              </dd>
            </div>
          </dl>

          <p className="flow-muted flow-small">
            These payments are to the same recipient and
            may not relate to the same purchase. The proposed
            payment has not been sent.
          </p>
        </>
      )}
    </section>
  );
}