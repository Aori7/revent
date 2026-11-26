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

function Dashboard() {
  // Temporary data until we connect our database
  const account = {
    type: "REVENT Savings Account",
    accountNumber: "987-545678-876",
    balance: 6700,
    lockedAmount: 10000,
  };

  return (
    <main className="dashboard">

      {/* Full-width welcome banner */}
      <WelcomeBanner name="Kiki" />

      {/* Padded dashboard content */}
      <div className="dashboard-content">

        <section className="dashboard-top">
          <div className="dashboard-update">
            <span className="dashboard-current-date">
              {new Date().toLocaleDateString("en-SG", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          <div className="dashboard-quick-actions">
            <EverydayBanking />
          </div>
        </section>

        {/* Main components for dashboard */}
        <div className="dashboard-grid">
          <div className="dashboard-cards">
            <YourCards />
          </div>

          <div className="dashboard-account">
            <AccountCard account={account} />
          </div>

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