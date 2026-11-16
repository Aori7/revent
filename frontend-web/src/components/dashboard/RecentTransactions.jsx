import { useSyncExternalStore } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import TransactionItem from "./TransactionItem";

import {
  getTransactions,
  subscribeToTransactions,
} from "../../utils/transactionHistory";

import "../../css/recent-transactions.css";

function RecentTransactions() {
  const version = useSyncExternalStore(
    subscribeToTransactions,
    () => localStorage.getItem("reventTransactionHistory"),
    () => null
  );

  // Recalculate when the shared transaction store changes.
  const transactions = getTransactions();

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

      <div className="transactions-list">
        {transactions.slice(0, 5).map((transaction) => (
          <TransactionItem
            key={transaction.id}
            transaction={transaction}
          />
        ))}

        {transactions.length === 0 && (
          <p>No recent transactions to display.</p>
        )}
      </div>
    </section>
  );
}

export default RecentTransactions;
