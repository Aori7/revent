
import "../css/dashboard.css";
import "../css/everyday-banking.css";

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
      {/* Welcome */}
      <section className="dashboard-top">
        <div className="dashboard-greeting">
          <div>
            <h1>Welcome back, Kiki</h1>
            <p>Here's an overview of your banking activity.</p>
          </div>

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
    </main>
  );
}

export default Dashboard;
