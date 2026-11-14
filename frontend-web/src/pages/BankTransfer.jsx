import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  UserRound,
  Plus,
  Clock3,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  FlaskConical,
} from "lucide-react";

import PageBanner from "../components/PageBanner";
import useTransactionRisk from "../hooks/useTransactionRisk";
import { saveRiskAssessment } from "../utils/riskSession";
import { saveDraft } from "../utils/demoSession";
import { demoAccount } from "../data/demoBanking";

import "../css/bank-transfer.css";

const STORAGE_KEY = "reventBankPayees";
const COOLING_OFF_MS = 12 * 60 * 60 * 1000;

const defaultPayees = [
  {
    id: "demo-existing",
    name: "Alex Tan",
    bank: "DBS / POSB",
    accountNumber: "1234567890",
    activatedAt: 0,
    isNewRecipient: false,
  },
];

function loadPayees() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : defaultPayees;
  } catch {
    return defaultPayees;
  }
}

export default function BankTransfer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const requestedPayeeId = searchParams.get("payee");
  const requestedMode = searchParams.get("mode");
  const { assess } = useTransactionRisk();

  const [payees, setPayees] = useState(loadPayees);
  const [tab, setTab] = useState(requestedMode === "new" ? "new" : "saved");

  const [selectedId, setSelectedId] = useState(requestedPayeeId || "");

  const [bank, setBank] = useState("DBS / POSB");
  const [accountNumber, setAccountNumber] = useState("");
  const [recipientName, setRecipientName] = useState("");

  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [demoOffset, setDemoOffset] = useState(0);
  const [clockVersion, setClockVersion] = useState(0);

  const currentTime = Date.now() + demoOffset;

  const selectedPayee = payees.find((payee) => payee.id === selectedId);

  const isPending = selectedPayee && currentTime < selectedPayee.activatedAt;

  function updatePayees(updated) {
    setPayees(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function changeTab(nextTab) {
    setTab(nextTab);
    setError("");
    setSuccess("");
  }

  function addPayee(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const cleaned = accountNumber.replace(/\s/g, "");

    if (!/^\d{5,20}$/.test(cleaned)) {
      setError("Enter a valid account number (5–20 digits).");
      return;
    }

    if (!recipientName.trim()) {
      setError("Please enter the recipient's name.");
      return;
    }

    const exists = payees.some(
      (payee) => payee.bank === bank && payee.accountNumber === cleaned,
    );

    if (exists) {
      setError("This bank account is already saved.");
      return;
    }

    const newPayee = {
      id: crypto.randomUUID(),
      name: recipientName.trim(),
      bank,
      accountNumber: cleaned,
      activatedAt: currentTime + COOLING_OFF_MS,
      isNewRecipient: true,
    };

    updatePayees([...payees, newPayee]);

    setSelectedId(newPayee.id);
    setAccountNumber("");
    setRecipientName("");
    setTab("saved");

    setSuccess(
      "Payee added successfully. A 12-hour cooling-off period is now in effect.",
    );
  }

  function submitTransfer(event) {
    event.preventDefault();
    setError("");

    if (!selectedPayee) {
      setError("Please select a recipient.");
      return;
    }

    if (currentTime < selectedPayee.activatedAt) {
      setError("This payee is still within the 12-hour cooling-off period.");
      return;
    }

    const value = Number(amount);

    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      !/^\d+(\.\d{1,2})?$/.test(amount) ||
      value > demoAccount.balance
    ) {
      setError("Enter a valid amount within your available balance.");
      return;
    }

    try {
      const draft = saveDraft({
        transferType: "bank",
        recipientName: selectedPayee.name,
        recipientNumber: selectedPayee.accountNumber,
        bankName: selectedPayee.bank,
        amount: value,
        reference,
      });

      const riskResult = assess(draft, {
        isNewRecipient: selectedPayee.isNewRecipient,
      });

      saveRiskAssessment(draft, riskResult);

      if (riskResult.level === "low") {
        navigate("/transfer/confirmation");
      } else {
        navigate("/transfer/review");
      }
    } catch (err) {
      setError(err.message);
    }
  }

  function advanceDemoClock() {
    setDemoOffset((previous) => previous + COOLING_OFF_MS);
    setClockVersion((previous) => previous + 1);
    setSuccess("Demo clock advanced by 12 hours.");
    setError("");
  }

  return (
    <main className="bank-page">
      <PageBanner
        eyebrow="Transfers & Payments / Bank Transfer"
        title="Bank Transfer"
        description="Send money securely to a bank account."
      />

      <div className="bank-container">
        <Link to="/transfer" className="bank-back">
          <ArrowLeft size={18} />
          Back to Transfer & Pay
        </Link>

        <section className="bank-transfer-panel">
          <div className="bank-card-heading">
            <div className="bank-heading-icon">
              <Building2 size={25} />
            </div>

            <div>
              <h2>Who are you paying?</h2>
              <p>Choose a saved recipient or add someone new.</p>
            </div>
          </div>

          <div className="bank-tabs">
            <button
              type="button"
              className={`bank-tab ${tab === "saved" ? "active" : ""}`}
              onClick={() => changeTab("saved")}
            >
              <UserRound size={17} />
              Saved Payees
            </button>

            <button
              type="button"
              className={`bank-tab ${tab === "new" ? "active" : ""}`}
              onClick={() => changeTab("new")}
            >
              <Plus size={18} />
              Add New Payee
            </button>
          </div>

          {tab === "saved" ? (
            <form onSubmit={submitTransfer}>
              <div className="bank-section-heading">
                <h3>Select a recipient</h3>
                <span>{payees.length} saved</span>
              </div>

              <div className="bank-payee-list">
                {payees.map((payee) => {
                  const pending = currentTime < payee.activatedAt;

                  const selected = selectedId === payee.id;

                  return (
                    <button
                      key={payee.id}
                      type="button"
                      className={`bank-payee ${selected ? "selected" : ""}`}
                      onClick={() => {
                        setSelectedId(payee.id);
                        setError("");
                        setSuccess("");
                      }}
                    >
                      <div className="bank-payee-avatar">
                        <UserRound size={21} />
                      </div>

                      <div className="bank-payee-info">
                        <strong>{payee.name}</strong>

                        <span>
                          {payee.bank} · •••• {payee.accountNumber.slice(-4)}
                        </span>

                        <span
                          className={`bank-payee-status ${
                            pending ? "pending" : "active"
                          }`}
                        >
                          {pending ? (
                            <Clock3 size={13} />
                          ) : (
                            <CheckCircle2 size={13} />
                          )}

                          {pending ? "Pending activation" : "Active payee"}
                        </span>
                      </div>

                      <span
                        className={`bank-radio ${selected ? "checked" : ""}`}
                      >
                        {selected && <span />}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedPayee && isPending && (
                <div className="bank-notice warning">
                  <Clock3 size={21} />

                  <div>
                    <strong>12-hour cooling-off period</strong>

                    <p>
                      Transfers to this newly added payee are temporarily
                      unavailable.
                    </p>

                    <p className="bank-activation-date">
                      Available from:{" "}
                      {new Date(selectedPayee.activatedAt).toLocaleString(
                        "en-SG",
                      )}
                    </p>
                  </div>
                </div>
              )}

              <div className="bank-divider" />

              <div className="bank-section-heading">
                <h3>Transfer Details</h3>
              </div>

              <div className="bank-field">
                <label htmlFor="bank-amount">Amount (SGD)</label>

                <div className="bank-amount-input">
                  <span>S$</span>

                  <input
                    id="bank-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="bank-field">
                <label htmlFor="bank-reference">
                  Payment reference
                  <span className="bank-optional">Optional</span>
                </label>

                <input
                  id="bank-reference"
                  type="text"
                  placeholder="What's this payment for?"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  maxLength={120}
                />
              </div>

              <div className="bank-security-note">
                <ShieldCheck size={19} />

                <p>
                  REVENT assesses your transaction for potential scam indicators
                  before payment.
                </p>
              </div>

              <button
                type="submit"
                className="bank-primary-btn"
                disabled={!selectedPayee || isPending}
              >
                Continue
                <ArrowRight size={19} />
              </button>
            </form>
          ) : (
            <form onSubmit={addPayee}>
              <div className="bank-section-heading">
                <h3>New Payee Details</h3>
              </div>

              <div className="bank-field">
                <label htmlFor="bank-name">Recipient's bank</label>

                <div className="bank-select-wrapper">
                  <select
                    id="bank-name"
                    value={bank}
                    onChange={(event) => setBank(event.target.value)}
                    required
                  >
                    <option>DBS / POSB</option>
                    <option>OCBC</option>
                    <option>UOB</option>
                    <option>Standard Chartered</option>
                    <option>Maybank</option>
                    <option>Other Bank</option>
                  </select>

                  <ChevronDown size={18} />
                </div>
              </div>

              <div className="bank-field">
                <label htmlFor="bank-account">Bank account number</label>

                <input
                  id="bank-account"
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter account number"
                  value={accountNumber}
                  onChange={(event) => setAccountNumber(event.target.value)}
                  maxLength={20}
                  required
                />
              </div>

              <div className="bank-field">
                <label htmlFor="bank-recipient">Recipient's name</label>

                <input
                  id="bank-recipient"
                  type="text"
                  placeholder="Name of account holder"
                  value={recipientName}
                  onChange={(event) => setRecipientName(event.target.value)}
                  required
                />
              </div>

              <div className="bank-notice warning">
                <Clock3 size={22} />

                <div>
                  <strong>12-hour cooling-off period</strong>

                  <p>
                    For your security, newly added payees must complete a
                    12-hour activation period before transfers are allowed.
                  </p>
                </div>
              </div>

              <button type="submit" className="bank-primary-btn">
                Add Payee
                <Plus size={19} />
              </button>
            </form>
          )}

          {error && (
            <div className="bank-message error" role="alert">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {success && (
            <div className="bank-message success" role="status">
              <CheckCircle2 size={18} />
              {success}
            </div>
          )}
        </section>

        <details className="bank-demo-panel">
          <summary>
            <FlaskConical size={18} />
            Prototype Testing Controls
            <ChevronDown size={18} />
          </summary>

          <div className="bank-demo-content">
            <p>
              Simulate the passage of 12 hours to test payee activation. No
              device clock is changed.
            </p>

            <button
              type="button"
              onClick={advanceDemoClock}
              className="bank-demo-btn"
            >
              <Clock3 size={17} />
              Advance Demo Clock by 12 Hours
            </button>

            <p className="bank-demo-count">
              Simulated advances: {clockVersion}
            </p>
          </div>
        </details>

        <p className="bank-disclaimer">
          Demo only. No real bank accounts are verified and no money is
          transferred.
        </p>
      </div>
    </main>
  );
}
