import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Search,
  UsersRound,
  UserRound,
  Clock3,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  X,
} from "lucide-react";

import PageBanner from "../components/PageBanner";
import {
  getBankPayees,
  deleteBankPayee,
  isPayeePending,
} from "../utils/bankPayees";

import "../css/manage-recipients.css";

export default function ManageRecipients() {
  const navigate = useNavigate();

  const [payees, setPayees] = useState(getBankPayees);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const now = Date.now();

  const activeCount = payees.filter(
    (payee) => !isPayeePending(payee, now)
  ).length;

  const pendingCount = payees.length - activeCount;

  const filteredPayees = useMemo(() => {
    const query = search.trim().toLowerCase();

    return payees.filter((payee) => {
      const pending = isPayeePending(payee, now);

      const matchesSearch =
        payee.name.toLowerCase().includes(query) ||
        payee.bank.toLowerCase().includes(query) ||
        payee.accountNumber.includes(query);

      const matchesFilter =
        filter === "all" ||
        (filter === "active" && !pending) ||
        (filter === "pending" && pending);

      return matchesSearch && matchesFilter;
    });
  }, [payees, search, filter, now]);

  function confirmDelete() {
    if (!deleteTarget) return;

    const updated = deleteBankPayee(deleteTarget.id);
    setPayees(updated);
    setDeleteTarget(null);
  }

  function transferTo(payee) {
    if (isPayeePending(payee)) return;

    navigate(
      `/transfer/bank?payee=${encodeURIComponent(payee.id)}`
    );
  }

  return (
    <main className="recipients-page">
      <PageBanner
        eyebrow="Transfers & Payments / Manage Recipients"
        title="Manage Recipients"
        description="View and manage your saved bank recipients."
      />

      <div className="recipients-container">
        <Link to="/transfer" className="recipients-back">
          <ArrowLeft size={18} />
          Back to Transfer & Pay
        </Link>

        <section className="recipients-panel">
          <div className="recipients-heading">
            <div className="recipients-heading-icon">
              <UsersRound size={25} />
            </div>

            <div>
              <h2>Your Recipients</h2>
              <p>
                Manage the people and accounts you send money to.
              </p>
            </div>
          </div>

          <div className="recipients-stats">
            <div>
              <strong>{payees.length}</strong>
              <span>Total</span>
            </div>

            <div>
              <strong>{activeCount}</strong>
              <span>Active</span>
            </div>

            <div>
              <strong>{pendingCount}</strong>
              <span>Pending</span>
            </div>
          </div>

          <div className="recipients-toolbar">
            <div className="recipients-search">
              <Search size={19} />

              <input
                type="search"
                placeholder="Search name, bank or account"
                aria-label="Search recipients"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />
            </div>

            <Link
              to="/transfer/bank?mode=new"
              className="recipients-add"
            >
              <Plus size={18} />
              Add Recipient
            </Link>
          </div>

          <div
            className="recipients-filters"
            aria-label="Filter recipients"
          >
            {[
              { value: "all", label: "All" },
              { value: "active", label: "Active" },
              { value: "pending", label: "Pending" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  filter === option.value ? "selected" : ""
                }
                aria-pressed={filter === option.value}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="recipients-list">
            {filteredPayees.length === 0 ? (
              <div className="recipients-empty">
                <UsersRound size={34} />
                <h3>No recipients found</h3>
                <p>
                  Try another search or add a new recipient.
                </p>
              </div>
            ) : (
              filteredPayees.map((payee) => {
                const pending = isPayeePending(payee, now);

                return (
                  <article
                    className="recipient-item"
                    key={payee.id}
                  >
                    <div className="recipient-avatar">
                      <UserRound size={23} />
                    </div>

                    <div className="recipient-details">
                      <h3>{payee.name}</h3>

                      <p>
                        {payee.bank} · ••••{" "}
                        {payee.accountNumber.slice(-4)}
                      </p>

                      <span
                        className={`recipient-status ${
                          pending ? "pending" : "active"
                        }`}
                      >
                        {pending ? (
                          <Clock3 size={14} />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}

                        {pending
                          ? "Pending activation"
                          : "Active"}
                      </span>

                      {pending && (
                        <p className="recipient-activation">
                          Available from{" "}
                          {new Date(
                            payee.activatedAt
                          ).toLocaleString("en-SG")}
                        </p>
                      )}
                    </div>

                    <div className="recipient-actions">
                      <button
                        type="button"
                        className="recipient-transfer"
                        disabled={pending}
                        onClick={() => transferTo(payee)}
                      >
                        Transfer
                        <ArrowRight size={16} />
                      </button>

                      <button
                        type="button"
                        className="recipient-delete"
                        aria-label={`Delete ${payee.name}`}
                        onClick={() => setDeleteTarget(payee)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <div className="recipients-security">
            <ShieldCheck size={21} />

            <p>
              New recipients require a 12-hour cooling-off
              period before bank transfers can be made.
              REVENT also assesses transfers for scam risks.
            </p>
          </div>
        </section>

        <p className="recipients-disclaimer">
          Prototype only. Recipient information is stored
          locally in this browser. No real bank accounts
          are managed.
        </p>
      </div>

      {deleteTarget && (
        <div
          className="recipient-modal-backdrop"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="recipient-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-recipient-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="recipient-modal-close"
              aria-label="Close dialog"
              onClick={() => setDeleteTarget(null)}
            >
              <X size={20} />
            </button>

            <div className="recipient-modal-icon">
              <Trash2 size={25} />
            </div>

            <h2 id="delete-recipient-title">
              Remove recipient?
            </h2>

            <p>
              Are you sure you want to remove{" "}
              <strong>{deleteTarget.name}</strong> from
              your saved recipients?
            </p>

            <p>
              If you add this recipient again later,
              a new cooling-off period will apply.
            </p>

            <div className="recipient-modal-actions">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="danger"
                onClick={confirmDelete}
              >
                Remove Recipient
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
