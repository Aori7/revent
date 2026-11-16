import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  Plus,
  ListChecks,
  UserRound,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock3,
  FlaskConical,
} from "lucide-react";

import PageBanner from "../components/PageBanner";
import useTransactionRisk from "../hooks/useTransactionRisk";
import { getBankPayees } from "../utils/bankPayees";
import {
  getScheduledTransfers,
  addScheduledTransfer,
  cancelScheduledTransfer,
  simulateDueTransfers,
} from "../utils/scheduledTransfers";

import "../css/scheduled-transfer.css";

const formatMoney = (amount) =>
  Number(amount).toLocaleString("en-SG", {
    style: "currency",
    currency: "SGD",
  });

const formatDate = (date) =>
  new Date(date).toLocaleString("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
  });

function toLocalDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");

  return (
    `${date.getFullYear()}-` +
    `${pad(date.getMonth() + 1)}-` +
    `${pad(date.getDate())}T` +
    `${pad(date.getHours())}:` +
    `${pad(date.getMinutes())}`
  );
}

export default function ScheduledTransfer() {
  const { assess } = useTransactionRisk();

  const [tab, setTab] = useState("new");
  const [payees, setPayees] = useState(() => getBankPayees());
  const [schedules, setSchedules] = useState(() =>
    getScheduledTransfers()
  );

  const [selectedId, setSelectedId] = useState("");
  const [amount, setAmount] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [reference, setReference] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [riskWarning, setRiskWarning] = useState(null);

  const [demoOffset, setDemoOffset] = useState(0);

  const demoNow = Date.now() + demoOffset;

  const selectedPayee = payees.find(
    (payee) => payee.id === selectedId
  );

  const activeSchedules = schedules
    .filter((item) => item.status === "scheduled")
    .sort(
      (a, b) =>
        new Date(a.scheduledAt) - new Date(b.scheduledAt)
    );

  const historySchedules = schedules.filter(
    (item) => item.status !== "scheduled"
  );

  function refreshData() {
    setPayees(getBankPayees());
    setSchedules(getScheduledTransfers());
  }

  function resetForm() {
    setSelectedId("");
    setAmount("");
    setScheduledAt("");
    setReference("");
    setRiskWarning(null);
    setError("");
  }

  function createSchedule(event) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setRiskWarning(null);

    const payee = getBankPayees().find(
      (item) => item.id === selectedId
    );

    if (!payee) {
      setError("Please select a recipient.");
      return;
    }

    const value = Number(amount);

    if (
      !/^\d+(\.\d{1,2})?$/.test(amount) ||
      !Number.isFinite(value) ||
      value <= 0
    ) {
      setError("Enter a valid transfer amount.");
      return;
    }

    const scheduledTime = new Date(scheduledAt).getTime();

    if (
      !Number.isFinite(scheduledTime) ||
      scheduledTime <= demoNow
    ) {
      setError("Please choose a future date and time.");
      return;
    }

    // Require the recipient to be active when scheduling.
    // This is a conservative prototype policy.
    if (demoNow < Number(payee.activatedAt || 0)) {
      setError(
        "This recipient is still in the 12-hour cooling-off period."
      );
      return;
    }

    try {
      const draft = {
        transferType: "scheduled",
        recipientName: payee.name,
        recipientNumber: payee.accountNumber,
        bankName: payee.bank,
        amount: value,
        reference: reference.trim(),
        scheduledAt: new Date(scheduledTime).toISOString(),
      };

      const riskResult = assess(draft, {
        isNewRecipient: Boolean(payee.isNewRecipient),
      });

      // Never silently approve medium/high-risk schedules.
      if (riskResult.level !== "low") {
        setRiskWarning(riskResult);
        setError(
          "This schedule requires an additional safety review. No payment has been scheduled."
        );
        return;
      }

      addScheduledTransfer({
        ...draft,
        recipientId: payee.id,
        riskLevel: riskResult.level,
      });

      refreshData();
      resetForm();

      setSuccess("Your transfer has been scheduled.");
      setTab("list");
    } catch (err) {
      setError(err.message || "Unable to create schedule.");
    }
  }

  function handleCancel(id) {
    if (
      !window.confirm(
        "Are you sure you want to cancel this scheduled transfer?"
      )
    ) {
      return;
    }

    setSchedules(cancelScheduledTransfer(id));
    setSuccess("Scheduled transfer cancelled.");
    setError("");
  }

  function advanceDemoClock() {
    const nextOffset =
      demoOffset + 24 * 60 * 60 * 1000;

    setDemoOffset(nextOffset);

    const updated = simulateDueTransfers(
      Date.now() + nextOffset
    );

    setSchedules(updated);
    setSuccess(
      "Demo clock advanced by 24 hours. Due schedules have been marked as simulated."
    );
  }

  return (
    <main className="scheduled-page">
      <PageBanner
        eyebrow="Transfers & Payments / Scheduled Transfer"
        title="Scheduled Transfer"
        description="Plan future payments and manage upcoming transfers."
      />

      <div className="scheduled-container">
        <Link to="/transfer" className="scheduled-back">
          <ArrowLeft size={18} />
          Back to Transfer & Pay
        </Link>

        <section className="scheduled-panel">
          <div className="scheduled-heading">
            <div className="scheduled-heading-icon">
              <CalendarClock size={25} />
            </div>

            <div>
              <h2>Scheduled Transfers</h2>
              <p>
                Create a new schedule or manage existing ones.
              </p>
            </div>
          </div>

          <div className="scheduled-tabs">
            <button
              type="button"
              className={tab === "new" ? "active" : ""}
              onClick={() => {
                setTab("new");
                setError("");
                setSuccess("");
              }}
            >
              <Plus size={18} />
              New Schedule
            </button>

            <button
              type="button"
              className={tab === "list" ? "active" : ""}
              onClick={() => {
                refreshData();
                setTab("list");
                setError("");
              }}
            >
              <ListChecks size={18} />
              My Schedules
              <span>{activeSchedules.length}</span>
            </button>
          </div>

          {success && (
            <div className="scheduled-success" role="status">
              <CheckCircle2 size={20} />
              {success}
            </div>
          )}

          {error && (
            <div className="scheduled-error" role="alert">
              <AlertTriangle size={20} />
              {error}
            </div>
          )}

          {tab === "new" ? (
            <form onSubmit={createSchedule}>
              <div className="scheduled-field">
                <label htmlFor="scheduled-recipient">
                  Select Recipient
                </label>

                <select
                  id="scheduled-recipient"
                  value={selectedId}
                  onChange={(event) => {
                    setSelectedId(event.target.value);
                    setRiskWarning(null);
                  }}
                  required
                >
                  <option value="">
                    Choose a saved bank recipient
                  </option>

                  {payees.map((payee) => (
                    <option
                      key={payee.id}
                      value={payee.id}
                    >
                      {payee.name} · {payee.bank}
                    </option>
                  ))}
                </select>

                <p className="scheduled-field-hint">
                  <Link to="/transfer/recipients">
                    Manage saved recipients
                  </Link>
                </p>
              </div>

              {selectedPayee && (
                <div className="scheduled-recipient">
                  <UserRound size={22} />

                  <div>
                    <strong>{selectedPayee.name}</strong>
                    <span>
                      {selectedPayee.bank} · ••••
                      {selectedPayee.accountNumber.slice(-4)}
                    </span>
                  </div>
                </div>
              )}

              <div className="scheduled-field">
                <label htmlFor="scheduled-amount">
                  Transfer Amount (SGD)
                </label>

                <div className="scheduled-amount">
                  <span>S$</span>

                  <input
                    id="scheduled-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(event) => {
                      setAmount(event.target.value);
                      setRiskWarning(null);
                    }}
                    required
                  />
                </div>
              </div>

              <div className="scheduled-field">
                <label htmlFor="scheduled-date">
                  Transfer Date & Time
                </label>

                <input
                  id="scheduled-date"
                  type="datetime-local"
                  min={toLocalDateTime(
                    new Date(demoNow + 60 * 1000)
                  )}
                  value={scheduledAt}
                  onChange={(event) => {
                    setScheduledAt(event.target.value);
                    setRiskWarning(null);
                  }}
                  required
                />
              </div>

              <div className="scheduled-field">
                <label htmlFor="scheduled-reference">
                  Payment Reference (Optional)
                </label>

                <input
                  id="scheduled-reference"
                  type="text"
                  maxLength={120}
                  placeholder="e.g. Monthly allowance"
                  value={reference}
                  onChange={(event) =>
                    setReference(event.target.value)
                  }
                />
              </div>

              {riskWarning && (
                <div className="scheduled-risk">
                  <AlertTriangle size={22} />

                  <div>
                    <strong>
                      {riskWarning.level.toUpperCase()} RISK
                    </strong>
                    <p>
                      REVENT identified risk indicators
                      requiring additional verification.
                      Scheduling has been blocked.
                    </p>
                  </div>
                </div>
              )}

              <div className="scheduled-security">
                <ShieldCheck size={21} />
                <p>
                  REVENT checks this payment for scam
                  indicators before accepting the schedule.
                </p>
              </div>

              <button
                type="submit"
                className="scheduled-primary"
              >
                <CalendarClock size={19} />
                Schedule Transfer
              </button>
            </form>
          ) : (
            <>
              <div className="scheduled-section-title">
                <h3>Upcoming Transfers</h3>
                <span>{activeSchedules.length} active</span>
              </div>

              {activeSchedules.length === 0 ? (
                <div className="scheduled-empty">
                  <CalendarClock size={36} />
                  <strong>No upcoming transfers</strong>
                  <p>
                    Your scheduled payments will appear here.
                  </p>
                </div>
              ) : (
                <div className="scheduled-list">
                  {activeSchedules.map((item) => (
                    <div
                      key={item.id}
                      className="scheduled-item"
                    >
                      <div className="scheduled-item-top">
                        <div className="scheduled-item-icon">
                          <UserRound size={21} />
                        </div>

                        <div className="scheduled-item-info">
                          <strong>
                            {item.recipientName}
                          </strong>
                          <span>
                            {item.bankName} · ••••
                            {item.recipientNumber.slice(-4)}
                          </span>
                        </div>

                        <strong className="scheduled-item-amount">
                          {formatMoney(item.amount)}
                        </strong>
                      </div>

                      <div className="scheduled-item-bottom">
                        <span>
                          <Clock3 size={15} />
                          {formatDate(item.scheduledAt)}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            handleCancel(item.id)
                          }
                        >
                          <XCircle size={16} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {historySchedules.length > 0 && (
                <>
                  <div className="scheduled-section-title">
                    <h3>History</h3>
                  </div>

                  <div className="scheduled-list">
                    {historySchedules.map((item) => (
                      <div
                        key={item.id}
                        className="scheduled-item"
                      >
                        <div className="scheduled-item-top">
                          <div className="scheduled-item-icon">
                            <UserRound size={20} />
                          </div>

                          <div className="scheduled-item-info">
                            <strong>
                              {item.recipientName}
                            </strong>
                            <span>
                              {formatDate(item.scheduledAt)}
                            </span>
                          </div>

                          <strong className="scheduled-item-amount">
                            {formatMoney(item.amount)}
                          </strong>
                        </div>

                        <div className="scheduled-history-status">
                          {item.status === "cancelled"
                            ? "Cancelled"
                            : "Simulated completion"}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>

        <details className="scheduled-demo">
          <summary>
            <FlaskConical size={19} />
            Prototype Testing Controls
          </summary>

          <p>
            Advance the simulated clock by 24 hours to
            test upcoming scheduled transfers.
          </p>

          <button
            type="button"
            onClick={advanceDemoClock}
          >
            <Clock3 size={18} />
            Advance Demo Clock by 24 Hours
          </button>

          <small>
            Demo time: {formatDate(demoNow)}
          </small>
        </details>

        <p className="scheduled-disclaimer">
          Prototype only. No real bank transfers are
          executed, and simulated completion does not
          deduct funds.
        </p>
      </div>
    </main>
  );
}
