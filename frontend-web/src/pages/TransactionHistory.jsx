import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  ArrowLeft,
  History,
  Search,
} from "lucide-react";

import TransactionItem from "../components/dashboard/TransactionItem";

import useBankingTransactions from "../hooks/useBankingTransactions";

import "../css/transaction-history.css";

const filters = [
  { value: "all", label: "All" },
  { value: "incoming", label: "Money In" },
  { value: "outgoing", label: "Money Out" },
  { value: "PayNow Transfer", label: "PayNow" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Scan & Pay", label: "Scan & Pay" },
];

export default function TransactionHistory() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const {
    transactions,
    loading,
    error,
    retry,
  } = useBankingTransactions();

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const keyword =
        search.trim().toLowerCase();

      const matchesSearch = [
        transaction.name,
        transaction.type,
        transaction.reference,
        transaction.description,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(keyword)
      );

      const matchesFilter =
        filter === "all" ||
        (
          filter === "incoming" &&
          transaction.amount > 0
        ) ||
        (
          filter === "outgoing" &&
          transaction.amount < 0
        ) ||
        transaction.type === filter;

      return matchesSearch && matchesFilter;
    });
  }, [transactions, search, filter]);

  return (
    <main className="history-page">
      <div className="history-container">

        <Link
          to="/transfer"
          className="history-back"
        >
          <ArrowLeft size={18} />
          Back to Transfer & Pay
        </Link>

        <div className="history-heading">

          <div className="history-heading-icon">
            <History size={28} />
          </div>

          <div>
            <h1>Transaction History</h1>

            <p>
              View and track your past transactions.
            </p>
          </div>

        </div>

        <section
          className="history-panel"
          aria-busy={loading}
        >

          <div className="history-search">
            <Search size={20} />

            <input
              type="search"
              placeholder="Search transactions..."
              aria-label="Search transactions"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <div className="history-filters">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                className={
                  filter === item.value
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setFilter(item.value)
                }
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="history-results">
            <h2>Transactions</h2>

            <span>
              {filteredTransactions.length} result(s)
            </span>
          </div>

          <p>
            Recent database payments and existing
            simulator transactions.
          </p>

          {loading && (
            <p role="status">
              Loading latest transactions...
            </p>
          )}

          {error && (
            <div role="alert">
              <p>
                Unable to retrieve the latest
                database transactions.
              </p>

              <button
                type="button"
                className="flow-button flow-button-secondary"
                onClick={retry}
              >
                Retry
              </button>
            </div>
          )}

          {filteredTransactions.length > 0 ? (
            <div className="transactions-list">
              {filteredTransactions.map((transaction) => (
                <TransactionItem
                  key={transaction.id}
                  transaction={transaction}
                />
              ))}
            </div>
          ) : !loading && !error ? (
            <div className="history-empty">
              <History size={36} />

              <h3>No transactions found</h3>

              <p>
                Try another search or filter.
              </p>
            </div>
          ) : null}

        </section>
      </div>
    </main>
  );
}