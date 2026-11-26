import { useEffect, useState } from "react";

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

import {
  activeDraft,
  restoreSavedPaymentReview,
  invalidateReview,
  saveDraft,
  saveAnswers,
  validPayment,
} from "../utils/demoSession";

import {
  formatSGD,
  maskIdentifier,
} from "../utils/banking";

import useTransactionRisk from "../hooks/useTransactionRisk";

import {
  clearRiskAssessment,
  getRiskAssessment,
  saveRiskAssessment,
} from "../utils/riskSession";

import { demoRecipients } from "../utils/payNowRecipients";

import useSavedPaymentReview from "../hooks/useSavedPaymentReview";

import {
  getSavedPaymentReview,
} from "../services/paymentReviewApi";

import "../css/banking-flow.css";

export default function Transfer() {
  const navigate = useNavigate();
  const location = useLocation();

  const { assess } = useTransactionRisk();

  const isEditing =
    location.state?.editPayment === true;

  const [form, setForm] = useState(() => {
    const existing = activeDraft();

    // Only retain details when deliberately editing.
    if (
      isEditing &&
      existing?.id &&
      existing.transferType === "ecommerce"
    ) {
      return {
        ...existing,
        recipientName: "",
      };
    }

    // All new payments start with empty fields.
    return {
      recipientName: "",
      recipientNumber: "",
      amount: "",
      reference: "",
      transferType: "ecommerce",
    };
  });

  const [error, setError] = useState("");

  const [verifiedRecipient, setVerifiedRecipient] =
    useState(null);

  const { saved, savedError } =
    useSavedPaymentReview();

  const [account, setAccount] = useState(null);

  const [accountError, setAccountError] =
    useState("");

  const [accountRetry, setAccountRetry] =
    useState(0);

  // Retrieve actual account balance from Supabase.
  useEffect(() => {
    const controller = new AbortController();

    async function loadAccount() {
      try {
        setAccountError("");

        const token = sessionStorage.getItem(
          "reventAccessToken"
        );

        const response = await fetch(
          "http://localhost:3000/api/banking/overview",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to retrieve account."
          );
        }

        const current = data.accounts?.[0];

        if (!current) {
          throw new Error("No bank account found.");
        }

        setAccount({
          id: current.account_id,

          type:
            current.account_type === "SAVINGS"
              ? "REVENT Savings Account"
              : "REVENT Current Account",

          accountNumber: current.account_number,

          balance: Number(current.balance),

          dailyTransferLimit: Number(
            current.daily_transfer_limit
          ),
        });

      } catch (error) {
        if (error.name !== "AbortError") {
          setAccountError(error.message);
          setAccount(null);
        }
      }
    }

    loadAccount();

    return () => controller.abort();
  }, [accountRetry]);

  function update(field, value) {
    if (
      field !== "reference" &&
      value !== form[field]
    ) {
      invalidateReview();
    }

    setForm((old) => ({
      ...old,
      [field]: value,
    }));
  }

  function changeRecipientNumber(value) {
    const cleaned = value
      .replace(/\D/g, "")
      .slice(0, 8);

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

  // Preserve existing simulated recipient verification.
  function lookupRecipient() {
    const cleaned =
      form.recipientNumber.replace(/\D/g, "");

    if (!/^[89]\d{7}$/.test(cleaned)) {
      setError(
        "Enter a valid 8-digit Singapore mobile number."
      );

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

    if (!account || accountError) {
      setError(
        "Unable to verify your available balance. Please try again."
      );

      return;
    }

    const amount = Number(form.amount);

    if (
      !verifiedRecipient ||
      verifiedRecipient.mobile !== form.recipientNumber ||
      verifiedRecipient.maskedName !== form.recipientName
    ) {
      setError(
        "Please verify the recipient before continuing."
      );

      return;
    }

    if (
      !form.recipientName.trim() ||
      !form.recipientNumber.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > account.balance
    ) {
      setError(
        `Enter a recipient and an amount between SGD 0.01 and ${formatSGD(
          account.balance
        )}.`
      );

      return;
    }

    if (amount > account.dailyTransferLimit) {
      setError(
        "The payment exceeds your transfer limit."
      );

      return;
    }

    if (!/^[89]\d{7}$/.test(form.recipientNumber)) {
      setError(
        "Enter a valid 8-digit Singapore mobile number."
      );

      return;
    }

    if (!validPayment(form)) {
      setError(
        "Enter a positive amount with up to two decimal places."
      );

      return;
    }

    try {
      const previous = activeDraft();

      const editingExistingPayment =
        isEditing &&
        previous?.id &&
        previous.transferType === "ecommerce";

      const previousRisk = editingExistingPayment
        ? getRiskAssessment()
        : null;

      const sameRecipient =
        editingExistingPayment &&
        String(previous.recipientNumber)
          .replace(/[\s-]/g, "") ===
        String(form.recipientNumber)
          .replace(/[\s-]/g, "");

      // A new payment must receive a fresh draft ID.
      // Do not reuse an abandoned payment's review or alert.
      if (!editingExistingPayment) {
        invalidateReview();
        clearRiskAssessment();

        sessionStorage.removeItem(
          "revent.demo.paymentDraft"
        );

        sessionStorage.removeItem(
          "revent.firstRecipientAcknowledgement"
        );
      }

      const draft = saveDraft({
        ...form,
        transferType: "ecommerce",
      });

      // Preserve existing risk assessment behaviour.
      const riskResult = assess(draft, {
        ...(sameRecipient
          ? previousRisk?.recipientContext || {}
          : {}),

        isNewRecipient:
          verifiedRecipient.isNewRecipient,
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

  // Preserve Sprint 1 save-and-resume functionality.
  async function resume() {
    try {
      if (
        saved?.draft.transferType === "ecommerce"
      ) {
        restoreSavedPaymentReview(
          await getSavedPaymentReview()
        );
      } else {
        const resumed = saveDraft(saved.draft);

        saveAnswers(resumed, saved.answers);
      }

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
            <span className="flow-eyebrow">
              TRANSFER & PAY
            </span>

            <h1>Make a payment</h1>

            <p>
              Review your payment information before
              proceeding to the safety check.
            </p>
          </div>
        </div>

        {location.state?.cancelled && (
          <p className="flow-panel" role="status">
            Payment cancelled. No money was sent.
          </p>
        )}

        {savedError && (
          <p className="flow-inline-error" role="alert">
            {savedError}
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
              {accountError ? (
                <>
                  <span role="alert">
                    {accountError}
                  </span>

                  <button
                    type="button"
                    className="flow-button flow-button-secondary"
                    onClick={() =>
                      setAccountRetry((value) => value + 1)
                    }
                  >
                    Retry
                  </button>
                </>
              ) : account ? (
                <>
                  {account.type} ·{" "}

                  {maskIdentifier(account.accountNumber)}

                  <span>
                    {formatSGD(account.balance)} available
                  </span>
                </>
              ) : (
                <span role="status">
                  Loading account balance...
                </span>
              )}
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
                autoComplete="off"
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

                  <h3 style={{ margin: "12px 0 6px" }}>
                    {verifiedRecipient.maskedName}
                  </h3>

                  <span>
                    Partially masked registered recipient name.
                  </span>

                  <span>
                    A masked name does not confirm
                    someone's identity. Verify unexpected
                    payment requests through a trusted channel.
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
              max={account?.balance}
              step="0.01"
              placeholder="Enter amount"
              autoComplete="off"
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
              placeholder="Enter payment reference"
              autoComplete="off"
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
              disabled={!account || Boolean(accountError)}
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