
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import SimulatorBubble from "./components/simulator/SimulatorBubble";
import RiriBubble from "./components/riri/RiriBubble";
import Navbar from "./components/navbar";
import Dashboard from "./components/dashboard";
import MobileNavbar from "./components/MobileNavbar";

import ReportSuspiciousRecipient from "./pages/ReportSuspiciousRecipient"; // added by tiara

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Accounts from "./pages/Accounts";
import Transfer from "./pages/Transfer";
import Cards from "./pages/Cards";
import Rewards from "./pages/Rewards";
import Education from "./pages/Education";
import LearningCardDetails from "./pages/learningCardDetails";
import AwarenessLevel from "./pages/awarenessLevel";
import ReadinessCheck from "./pages/readinessCheck";
import More from "./pages/More";

import TransactionDetails from "./pages/TransactionDetails";
import PaymentReview from "./pages/PaymentReview";
import PaymentConfirmation from "./pages/PaymentConfirmation";

import ScamChatbot from "./pages/ScamChatbot";

import RiskTest from "./components/simulator/RiskTest";
import TransferHub from "./pages/TransferHub";
import PayNowTransfer from "./pages/PayNowTransfer";
// import TransactionReview from "./pages/TransactionReview";
import { usePaymentBehaviour } from "./context/PaymentBehaviourContext";
import BankTransfer from "./pages/BankTransfer";
import ManageRecipients from "./pages/ManageRecipients";
import PayNowHome from "./pages/PayNowHome";
import ScanAndPay from "./pages/ScanAndPay";
import ScheduledTransfer from "./pages/ScheduledTransfer";
import TransactionHistory from "./pages/TransactionHistory";
import AuthTest from "./pages/authTest";

import ProtectedRoute from "./components/protectedRoute";
import CallProtectionOverlay from "./components/security/CallProtectionOverlay";
import TrustedCallers from "./pages/TrustedCallers";

function BankingLayout() {
  const { recordPaymentClick } = usePaymentBehaviour();

  function handlePaymentInteraction(event) {
    const path = window.location.pathname;

    // Only count attempts to submit a payment, not ordinary page clicks.
    const paymentEntryPages = new Set([
      "/transfer/ecommerce",
      "/transfer/paynow/send",
      "/transfer/bank",
      "/transfer/scan",
      "/transfer/scheduled",
    ]);

    if (!paymentEntryPages.has(path)) return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    // Ignore simulator controls and unrelated navigation.
    if (target.closest(".simulator-bubble")) return;

    const submitButton = target.closest('form button[type="submit"]');
    if (!submitButton || submitButton.disabled) return;

    // Registering a new payee is not a payment attempt.
    if (
      path === "/transfer/bank" &&
      submitButton.textContent.trim().toLowerCase().includes("add payee")
    ) {
      return;
    }

    recordPaymentClick();
  }

  return (
    <div onClickCapture={handlePaymentInteraction}>
      <Navbar />
      <Outlet />
      <MobileNavbar />
      <SimulatorBubble />
      <RiriBubble />
      <CallProtectionOverlay />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Temporary chatbot preview with existing navbar */}
        <Route element={<BankingLayout />}>
          <Route path="/scam-chatbot-preview" element={<ScamChatbot />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<BankingLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/risk-test" element={<RiskTest />} />
            <Route path="/transfer/paynow" element={<PayNowHome />} />
            <Route path="/transfer/paynow/send" element={<PayNowTransfer />} />
            <Route path="/transfer/bank" element={<BankTransfer />} />
            <Route path="/transfer/recipients" element={<ManageRecipients />} />
            <Route path="/transfer/scan" element={<ScanAndPay />} />
            <Route path="/transfer/scheduled" element={<ScheduledTransfer />} />
            <Route path="/transfer/history" element={<TransactionHistory />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/transfer" element={<TransferHub />} />
            <Route path="/transfer/ecommerce" element={<Transfer />} />
            <Route path="/transfer/review" element={<PaymentReview />} />
            <Route path="/trusted-callers" element={<TrustedCallers />} />
            <Route path="/auth-test" element={<AuthTest />} />

            {/* <Route
              path="/transfer/transaction-review"
              element={<TransactionReview />}
            /> */}

            <Route
              path="/report-suspicious-recipient"
              element={<ReportSuspiciousRecipient />}
            />
            <Route
              path="/transfer/confirmation"
              element={<PaymentConfirmation />}
            />
            <Route
              path="/transactions/:transactionId"
              element={<TransactionDetails />}
            />
            <Route path="/cards" element={<Cards />} />
            <Route path="/rewards/*" element={<Rewards />} />
            <Route path="/education" element={<Education />} />
            <Route
              path="/education/:topicId"
              element={<LearningCardDetails />}
            />
            <Route path="/awareness" element={<AwarenessLevel />} />
            <Route path="/readiness" element={<ReadinessCheck />} />
            <Route path="/more" element={<More />} />
            <Route path="/scam-chatbot" element={<ScamChatbot />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
