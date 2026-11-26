import { useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { PhoneOff, ShieldAlert, Check } from "lucide-react";

import {
  activeDraft,
  canConfirm,
  hasCompletedReview,
} from "../utils/demoSession";

import { reviewAction } from "../services/paymentReviewApi";

import {
  formatSGD,
  maskIdentifier,
} from "../utils/banking";

import {
  getRiskAssessment,
  hasAcknowledgedAlert,
  saveRiskAssessment,
} from "../utils/riskSession";

import useTransactionRisk from "../hooks/useTransactionRisk";
import { useSimulator } from "../context/SimulatorContext";
import usePaymentRestriction from "../utils/usePaymentRestriction";
import { usePaymentBehaviour } from "../context/PaymentBehaviourContext";

// import RecipientPaymentHistory from "../components/RecipientPaymentHistory";

import "../css/banking-flow.css";

export default function PaymentConfirmation() {
  const restriction = usePaymentRestriction();
  const { assess } = useTransactionRisk();

  const [actionError, setActionError] = useState("");

  const draft = activeDraft();
  const risk = getRiskAssessment();

  const isPayNow = draft?.transferType === "paynow";

  const { triggers } = useSimulator();
  const isOnCall = triggers.isOnCall;

  const [confirmed, setConfirmed] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const pending = useRef(false);

  const [callBlocked, setCallBlocked] = useState(false);

  const [
    rapidPauseAcknowledged,
    setRapidPauseAcknowledged,
  ] = useState(false);

  const [
    detailsAcknowledged,
    setDetailsAcknowledged,
  ] = useState(false);

  const {
    rapidClickDetected,
    resetRapidClickDetection,
    recordPaymentClick,
  } = usePaymentBehaviour();

  if (!draft) {
    return <Navigate to="/transfer" replace />;
  }

  if (
    !canConfirm() ||
    risk?.canProceedToConfirmation !== true ||
    (
      risk.conditions?.firstTimeRecipient &&
      !hasAcknowledgedAlert(draft)
    )
  ) {
    return <Navigate to="/transfer/review" replace />;
  }

  async function handleConfirmTransfer() {
    if (!detailsAcknowledged || pending.current) {
      return;
    }

    const click = recordPaymentClick();

    // Preserve the mandatory on-call interruption.
    if (isOnCall) {
      setCallBlocked(true);
      return;
    }

    setCallBlocked(false);

    // Preserve current and previously detected rapid interactions.
    if (
      (rapidClickDetected || click.detected) &&
      !rapidPauseAcknowledged
    ) {
      return;
    }

    if (confirmed) return;

    pending.current = true;
    setConfirmBusy(true);

    try {
      const fresh = assess(
        draft,
        risk.recipientContext
      );

      saveRiskAssessment(draft, fresh);

      if (
        !canConfirm() ||
        !fresh.canProceedToConfirmation ||
        (
          fresh.conditions.firstTimeRecipient &&
          !hasAcknowledgedAlert(draft)
        )
      ) {
        setActionError(
          fresh.restrictionReason ||
            "Please review this payment again."
        );

        return;
      }

      // Connect completed e-commerce reviews to the backend.
      // Preserve the existing flows for other payment methods.
      if (
        draft.transferType === "ecommerce" &&
        hasCompletedReview(draft)
      ) {
        await reviewAction("confirm", draft);
      }

      setActionError("");

      // Preserve the existing simulated confirmation.
      // This does not create a completed bank transaction.
      setConfirmed(true);
    } catch (error) {
      setActionError(
        error.message ||
          "Payment check unavailable. Try again or return to the safety review."
      );
    } finally {
      pending.current = false;
      setConfirmBusy(false);
    }
  }

  return (
    <main className="flow-page">
      <div className="flow-shell flow-narrow">
        <section className="flow-panel">
          {confirmed ? (
            <div className="transfer-confirmed">
              <div className="transfer-confirmed__icon">
                <Check size={48} strokeWidth={3.5} />
              </div>

              <h2>Transfer Confirmed!</h2>

              <p className="transfer-confirmed__subtitle">
                Your simulated transfer was successful.
              </p>

              <div className="transfer-confirmed__amount">
                {formatSGD(draft.amount)}
              </div>

              <p className="transfer-confirmed__recipient">
                To <strong>{draft.recipientName}</strong>
              </p>

              <div className="transfer-confirmed__notice">
                <ShieldAlert size={18} />

                <span>
                  Demo transaction. No real money was sent.
                </span>
              </div>

              <Link
                to="/"
                className="transfer-confirmed__home"
              >
                Back to Home
              </Link>
            </div>
          ) : (
            <>
              <h1>
                {isPayNow
                  ? "Confirm PayNow Transfer"
                  : "Final Payment Confirmation"}
              </h1>

              <p className="flow-payment-amount">
                {formatSGD(draft.amount)}
              </p>

              <dl className="flow-detail-list">
                <div className="flow-detail-row">
                  <dt>Recipient</dt>
                  <dd>{draft.recipientName}</dd>
                </div>

                <div className="flow-detail-row">
                  <dt>Account / mobile</dt>
                  <dd>
                    {maskIdentifier(draft.recipientNumber)}
                  </dd>
                </div>

                <div className="flow-detail-row">
                  <dt>Reference</dt>
                  <dd>{draft.reference || "—"}</dd>
                </div>

                <div className="flow-detail-row">
                  <dt>Payment method</dt>

                  <dd>
                    {draft.transferType === "paynow"
                      ? "PayNow"
                      : draft.transferType === "bank"
                        ? "Bank Transfer"
                        : draft.transferType === "scanpay"
                          ? "Scan & Pay"
                          : "E-commerce Payment"}
                  </dd>
                </div>
              </dl>

              {/* Display previous payments and proposed total
                  regardless of the payment risk level. */}
              {/* {!confirmed && (
                <RecipientPaymentHistory draft={draft} />
              )} */}

              {risk && (
                <div className="confirmation-risk">
                  <strong>
                    REVENT Risk Assessment: {risk.level.toUpperCase()}
                  </strong>

                  <p>
                    {risk.level === "low"
                      ? "No significant risk indicators were detected."
                      : "Additional safety verification was required for this transfer."}
                  </p>
                </div>
              )}

              <p>
                {risk?.level === "low"
                  ? "Your transaction has passed the initial risk assessment. No payment has been sent."
                  : "Your safety review is complete. No payment has been sent."}
              </p>

              {callBlocked && isOnCall && (
                <div
                  className="call-safety-warning"
                  role="alert"
                >
                  <div className="call-safety-heading">
                    <ShieldAlert size={28} />

                    <h2>Transfer Temporarily Blocked</h2>
                  </div>

                  <p>
                    REVENT detected that you're currently on a phone call.
                  </p>

                  <p>
                    Scammers may stay on the phone to pressure you into
                    transferring money without thinking carefully.
                  </p>

                  <div className="call-safety-action">
                    <PhoneOff size={24} />

                    <div>
                      <strong>
                        End your call before proceeding
                      </strong>

                      <p>
                        Once your call has ended, you can try confirming your
                        transfer again.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {rapidClickDetected && (
                <div
                  className="confirmation-activity-alert"
                  role="alert"
                >
                  <div className="confirmation-activity-alert__heading">
                    <ShieldAlert size={24} />

                    <div>
                      <h2>Unusual payment activity</h2>

                      <p>
                        Multiple payment actions were detected in a short time.
                      </p>
                    </div>
                  </div>

                  <div className="confirmation-activity-alert__details">
                    <span>You're sending</span>

                    <strong>
                      {formatSGD(draft.amount)}
                    </strong>

                    <span>
                      to <b>{draft.recipientName}</b>
                    </span>
                  </div>

                  <label className="confirmation-acknowledgement">
                    <input
                      type="checkbox"
                      checked={rapidPauseAcknowledged}
                      onChange={(event) => {
                        const checked = event.target.checked;

                        setRapidPauseAcknowledged(checked);

                        if (checked) {
                          resetRapidClickDetection();
                        }
                      }}
                    />

                    <span>
                      I've checked these details and want to continue.
                    </span>
                  </label>
                </div>
              )}

              {actionError && (
                <p
                  className="flow-inline-error"
                  role="alert"
                >
                  {actionError}
                </p>
              )}

              <label className="confirmation-final-check">
                <input
                  type="checkbox"
                  checked={detailsAcknowledged}
                  onChange={(event) =>
                    setDetailsAcknowledged(event.target.checked)
                  }
                />

                <span>
                  I've verified that I'm sending{" "}
                  <strong>{formatSGD(draft.amount)}</strong>{" "}
                  to <strong>{draft.recipientName}</strong>.
                </span>
              </label>

              <button
                type="button"
                className="confirm-transfer-btn"
                onClick={handleConfirmTransfer}
                disabled={
                  confirmBusy ||
                  Boolean(restriction) ||
                  !detailsAcknowledged ||
                  (
                    rapidClickDetected &&
                    !rapidPauseAcknowledged
                  ) ||
                  isOnCall
                }
              >
                Confirm Transfer
              </button>

              <div className="flow-button-row">
                <Link
                  to="/transfer/ecommerce"
                  className="flow-button"
                >
                  Edit payment
                </Link>

                {(risk?.level !== "low" || actionError) && (
                  <Link
                    to="/transfer/review"
                    className="flow-button"
                  >
                    Back to safety review
                  </Link>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}