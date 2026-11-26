import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import TransactionItem from "./TransactionItem";

import useBankingTransactions from "../../hooks/useBankingTransactions";

import "../../css/recent-transactions.css";

function RecentTransactions() {
  const {
    transactions,
    loading,
    error,
    retry,
  } = useBankingTransactions();

  return (
    <section className="recent-transactions">
      <div className="recent-transactions-header">
        <h2>Recent Transactions</h2>

        <Link
          to="/transfer/history"
          className="recent-transactions-link"
        >
          View all <ArrowRight size={22} />
        </Link>
      </div>

      <div
        className="transactions-list"
        aria-busy={loading}
      >
        {loading && (
          <p role="status">
            Loading recent transactions...
          </p>
        )}

        {error && (
          <div role="alert">
            <p>
              Unable to retrieve the latest
              transactions from the database.
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

        {transactions.slice(0, 5).map((transaction) => (
          <TransactionItem
            key={transaction.id}
            transaction={transaction}
          />
        ))}

        {!loading &&
          !error &&
          transactions.length === 0 && (
            <p>No recent transactions to display.</p>
          )}
      </div>
    </section>
  );
}

export default RecentTransactions;