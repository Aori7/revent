import { useEffect, useState } from "react";

import WelcomeBanner from "../components/dashboard/WelcomeBanner";
import "../css/dashboard/dashboard.css";
import "../css/dashboard/everyday-banking.css"; 

import EverydayBanking from "./dashboard/EverydayBanking";
import AccountCard from "./dashboard/AccountCard";
import YourCards from "./dashboard/YourCards";
import RecentTransactions from "./dashboard/RecentTransactions";
import SecurityCard from "./dashboard/SecurityCard";
import RewardsCard from "./dashboard/RewardsCard";

// Added by Tiara - Report Suspicious Recipient
import ReportRecipientCard from "./dashboard/ReportRecipientCard";

import ScamAwarenessBubble from "../pages/dashboard/ScamAwarenessBubble";

function Dashboard() {
  const [account, setAccount] = useState(null);

  const [accountError, setAccountError] =
    useState("");

  const [retry, setRetry] = useState(0);

  // Retrieve the actual account balance from Supabase.
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
            data.error ||
            "Unable to retrieve account."
          );
        }

        const current = data.accounts?.[0];

        if (!current) {
          throw new Error(
            "No bank account found."
          );
        }

        setAccount({
          type:
            current.account_type === "SAVINGS"
              ? "REVENT Savings Account"
              : "REVENT Current Account",

          accountNumber:
            current.account_number,

          balance:
            Number(current.balance),

          // Preserve the existing demo Money Lock feature.
          lockedAmount: 10000,
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
  }, [retry]);

  return (
    <main className="dashboard">

      {/* Full-width welcome banner */}
      <WelcomeBanner name="Kiki" />

      {/* Padded dashboard content */}
      <div className="dashboard-content">

        <section className="dashboard-top">

          <div className="dashboard-update">

            <span className="dashboard-current-date">

              {new Date().toLocaleDateString(
                "en-SG",
                {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }
              )}

            </span>

          </div>

          <div className="dashboard-quick-actions">
            <EverydayBanking />
          </div>

        </section>

        <ScamAwarenessBubble />

        {/* Main components for dashboard */}
        <div className="dashboard-grid">

          <div className="dashboard-cards">
            <YourCards />
          </div>

          {/* Account balance retrieved from Supabase */}
          <div className="dashboard-account">

            {accountError ? (
              <section
                className="account-card"
                role="alert"
              >

                <h2>Your Account</h2>

                <p>{accountError}</p>

                <button
                  type="button"
                  className="flow-button flow-button-secondary"
                  onClick={() =>
                    setRetry((value) => value + 1)
                  }
                >
                  Retry
                </button>

              </section>
            ) : account ? (
              <AccountCard account={account} />
            ) : (
              <section
                className="account-card"
                role="status"
              >

                <h2>Your Account</h2>

                <p>
                  Loading account balance...
                </p>

              </section>
            )}

          </div>

          {/* Recent transaction history */}
          <div className="dashboard-transactions">
            <RecentTransactions />
          </div>

          <div className="dashboard-security">
            <SecurityCard />
          </div>

          <div className="dashboard-rewards">
            <RewardsCard />
          </div>

        </div>

         
        {/* Added by Tiara - Report Suspicious Recipient */}
        <ReportRecipientCard />

      </div>

    </main>
  );
}

export default Dashboard;