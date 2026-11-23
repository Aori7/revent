
import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ArrowRight,
  LockKeyhole,
  BookmarkCheck,
  ShieldCheck,
} from "lucide-react";

import { demoAccount } from "../data/demoBanking";
import {
  getSavedReview,
  invalidateReview,
  readDraft,
  saveDraft,
  saveAnswers,
  validPayment,
} from "../utils/demoSession";
import { formatSGD, maskIdentifier } from "../utils/banking";
import useTransactionRisk from "../hooks/useTransactionRisk";
import {
  getRiskAssessment,
  saveRiskAssessment,
} from "../utils/riskSession";

import { demoRecipients } from "../utils/payNowRecipients";

import "../css/banking-flow.css";

export default function Transfer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { assess } = useTransactionRisk();

  const [form, setForm] = useState(() => {
    const existing = readDraft();

    return {
      ...existing,
      recipientName: "",
      recipientNumber: existing.id
        ? existing.recipientNumber
        : "",
    };
  });

  const [error, setError] = useState("");
  const [verifiedRecipient, setVerifiedRecipient] = useState(null);

  const saved = getSavedReview();

  function update(field, value) {
    if (field !== "reference" && value !== form[field]) {
      invalidateReview();
    }

    setForm((old) => ({
      ...old,
      [field]: value,
    }));
  }

  function changeRecipientNumber(value) {
    const cleaned = value.replace(/\D/g, "").slice(0, 8);

    if (cleaned !== form.recipientNumber) {
      invalidateReview();

      setForm((old) => ({
        ...old,
        recipientNumber: cleaned,
        recipientName: "",
      }));

      setVerifiedRecipient(null);
      setError("");
    }
  }

  function lookupRecipient() {
    const cleaned = form.recipientNumber.replace(/\D/g, "");

    if (!/^[89]\d{7}$/.test(cleaned)) {
      setError("Enter a valid 8-digit Singapore mobile number.");
      setVerifiedRecipient(null);
      update("recipientName", "");
      return;
    }

    const found = demoRecipients[cleaned];

    if (!found) {
      setError(
        "This number is not registered in the demo PayNow directory."
      );

      setVerifiedRecipient(null);
      update("recipientName", "");
      return;
    }

    setVerifiedRecipient({
      ...found,
      mobile: cleaned,
    });

    setForm((old) => ({
      ...old,
      recipientNumber: cleaned,
      recipientName: found.maskedName,
    }));

    setError("");
  }

  function submit(event) {
    event.preventDefault();

    const amount = Number(form.amount);

    if (
      !verifiedRecipient ||
      verifiedRecipient.mobile !== form.recipientNumber ||
      verifiedRecipient.maskedName !== form.recipientName
    ) {
      setError("Please verify the recipient before continuing.");
      return;
    }

    if (
      !form.recipientName.trim() ||
      !form.recipientNumber.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > demoAccount.balance
    ) {
      setError(
        `Enter a recipient and an amount between SGD 0.01 and ${formatSGD(
          demoAccount.balance
        )}.`
      );
      return;
    }

    if (!/^[89]\d{7}$/.test(form.recipientNumber)) {
      setError("Enter a valid 8-digit Singapore mobile number.");
      return;
    }

    if (!validPayment(form)) {
      setError("Enter a positive amount with up to two decimal places.");
      return;
    }

    try {
      const previous = readDraft();
      const previousRisk = getRiskAssessment();

      const sameRecipient =
        String(previous.recipientNumber).replace(/[\s-]/g, "") ===
        String(form.recipientNumber).replace(/[\s-]/g, "");

      const draft = saveDraft({
        ...form,
        transferType: "ecommerce",
      });

      const riskResult = assess(draft, {
        ...(sameRecipient
          ? previousRisk?.recipientContext || {}
          : {}),
        isNewRecipient: verifiedRecipient.isNewRecipient,
      });

      saveRiskAssessment(draft, riskResult);
      setError("");

      if (
        riskResult.level === "low" &&
        riskResult.canProceedToConfirmation
      ) {
        navigate("/transfer/confirmation");
      } else {
        navigate("/transfer/review");
      }
    } catch (err) {
      setError(err.message);
    }
  }

  function resume() {
    try {
      const resumed = saveDraft(saved.draft);
      saveAnswers(resumed, saved.answers);
      navigate("/transfer/review");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="flow-page">
      <div className="flow-shell flow-narrow">
        <div className="flow-page-heading">
          <div>
            <span className="flow-eyebrow">TRANSFER & PAY</span>
            <h1>Make a payment</h1>
            <p>
              Review your payment information before proceeding
              to the safety check.
            </p>
          </div>
        </div>

        {location.state?.cancelled && (
          <p className="flow-panel" role="status">
            Payment cancelled. No money was sent.
          </p>
        )}

        {saved && (
          <section className="flow-saved-banner">
            <BookmarkCheck size={24} />

            <div>
              <strong>You have a saved review</strong>
              <p>
                Resume your earlier review for{" "}
                {saved.draft.recipientName}.
              </p>
            </div>

            <button
              type="button"
              className="flow-button flow-button-secondary"
              onClick={resume}
            >
              Resume review
            </button>
          </section>
        )}

        <form
          className="flow-panel flow-form"
          onSubmit={submit}
          noValidate
        >
          <h2>Payment Information</h2>

          <div className="flow-form-group">
            <label>From account</label>

            <div className="flow-readonly">
              {demoAccount.type} ·{" "}
              {maskIdentifier(demoAccount.accountNumber)}
              <span>
                {formatSGD(demoAccount.balance)} available
              </span>
            </div>
          </div>

          <div className="flow-form-group">
            <label htmlFor="recipient-number">
              Recipient mobile number
            </label>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <input
                id="recipient-number"
                type="tel"
                value={form.recipientNumber}
                inputMode="numeric"
                maxLength={8}
                placeholder="e.g. 91234567"
                onChange={(event) =>
                  changeRecipientNumber(event.target.value)
                }
                style={{
                  flex: 1,
                  minWidth: 0,
                }}
                required
              />

              <button
                type="button"
                className="flow-button flow-button-primary"
                onClick={lookupRecipient}
              >
                Verify
              </button>
            </div>
          </div>

          <div className="flow-form-group">
            <label>Recipient name</label>

            <div
              className="flow-readonly"
              aria-live="polite"
            >
              {verifiedRecipient ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "#16834a",
                    }}
                  >
                    <ShieldCheck size={22} />
                    Recipient found
                  </div>

                  <h3
                    style={{
                      margin: "12px 0 6px",
                    }}
                  >
                    {verifiedRecipient.maskedName}
                  </h3>

                  <span>
                    Partially masked registered recipient name.
                  </span>

                  <span>
                    A masked name does not confirm someone's
                    identity. Verify unexpected payment requests
                    through a trusted channel.
                  </span>
                </>
              ) : (
                <span>
                  Verify the recipient's mobile number first.
                </span>
              )}
            </div>
          </div>

          <div className="flow-form-group">
            <label htmlFor="payment-amount">
              Amount (SGD)
            </label>

            <input
              id="payment-amount"
              type="number"
              min="0.01"
              max={demoAccount.balance}
              step="0.01"
              value={form.amount}
              onChange={(event) =>
                update("amount", event.target.value)
              }
              required
            />
          </div>

          <div className="flow-form-group">
            <label htmlFor="payment-reference">
              Payment reference (optional)
            </label>

            <input
              id="payment-reference"
              value={form.reference}
              maxLength={120}
              onChange={(event) =>
                update("reference", event.target.value)
              }
            />
          </div>

          {error && (
            <p className="flow-inline-error" role="alert">
              {error}
            </p>
          )}

          <div className="flow-form-footer">
            <p>
              <ShieldCheck size={18} />
              Guided safety review before payment.
            </p>

            <button
              type="submit"
              className="flow-button flow-button-primary"
            >
              Continue to safety review
              <ArrowRight size={18} />
            </button>
          </div>
        </form>

        <div className="flow-trust-note">
          <LockKeyhole size={17} />
          No real money is sent.
        </div>

        <Link className="flow-back" to="/">
          Back to home
        </Link>
      </div>
    </main>
  );
}
