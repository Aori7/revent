import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Clock3,
  ContactRound,
  UserRound,
  Plus,
  Smartphone,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

import PageBanner from "../components/PageBanner";
import "../css/paynow-home.css";

// Fictional contacts for prototype testing.
// Mobile numbers match your existing PayNow demo directory.
const demoContacts = [
  {
    id: "alex",
    name: "Alex Tan",
    mobile: "91234567",
    category: "recent",
  },
  {
    id: "chloe",
    name: "Chloe Lee",
    mobile: "87654321",
    category: "recent",
  },
  {
    id: "chloe-contact",
    name: "Chloe Lee",
    mobile: "87654321",
    category: "contacts",
  },
  {
    id: "alex-contact",
    name: "Alex Tan",
    mobile: "91234567",
    category: "contacts",
  },
];

export default function PayNowHome() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("recent");
  const [search, setSearch] = useState("");

  const filteredContacts = demoContacts.filter((contact) => {
    const matchesTab = contact.category === tab;

    const query = search.trim().toLowerCase();

    const matchesSearch =
      contact.name.toLowerCase().includes(query) ||
      contact.mobile.includes(query);

    return matchesTab && matchesSearch;
  });

  function selectRecipient(contact) {
    navigate(
      `/transfer/paynow/send?mobile=${encodeURIComponent(
        contact.mobile
      )}`
    );
  }

  return (
    <main className="paynow-home-page">
      <PageBanner
        eyebrow="Transfers & Payments / PayNow"
        title="PayNow"
        description="Send money instantly using PayNow."
      />

      <div className="paynow-home-container">
        <Link to="/transfer" className="paynow-home-back">
          <ArrowLeft size={18} />
          Back to Transfer & Pay
        </Link>

        <section className="paynow-home-panel">
          <div className="paynow-home-heading">
            <div className="paynow-home-heading-icon">
              <Smartphone size={25} />
            </div>

            <div>
              <h2>Who are you paying?</h2>
              <p>
                Choose a recipient or enter a new mobile number.
              </p>
            </div>
          </div>

          <div className="paynow-home-search">
            <Search size={19} />

            <input
              type="search"
              placeholder="Search name or mobile number"
              aria-label="Search PayNow recipients"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <div className="paynow-home-tabs">
            <button
              type="button"
              className={`paynow-home-tab ${
                tab === "recent" ? "active" : ""
              }`}
              onClick={() => setTab("recent")}
            >
              <Clock3 size={17} />
              Recent
            </button>

            <button
              type="button"
              className={`paynow-home-tab ${
                tab === "contacts" ? "active" : ""
              }`}
              onClick={() => setTab("contacts")}
            >
              <ContactRound size={17} />
              Contacts
            </button>
          </div>

          <div className="paynow-home-section-heading">
            <h3>
              {tab === "recent"
                ? "Recent Recipients"
                : "Your Contacts"}
            </h3>

            <span>{filteredContacts.length} found</span>
          </div>

          <div className="paynow-home-list">
            {filteredContacts.length > 0 ? (
              filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  className="paynow-home-recipient"
                  onClick={() => selectRecipient(contact)}
                >
                  <div className="paynow-home-avatar">
                    <UserRound size={22} />
                  </div>

                  <div className="paynow-home-recipient-info">
                    <strong>{contact.name}</strong>
                    <span>
                      Mobile · •••• {contact.mobile.slice(-4)}
                    </span>
                  </div>

                  <ChevronRight size={19} />
                </button>
              ))
            ) : (
              <div className="paynow-home-empty">
                <Search size={28} />
                <p>No recipients found.</p>
              </div>
            )}
          </div>

          <div className="paynow-home-divider" />

          <button
            type="button"
            className="paynow-home-new"
            onClick={() =>
              navigate("/transfer/paynow/send")
            }
          >
            <div className="paynow-home-new-icon">
              <Plus size={23} />
            </div>

            <div>
              <strong>Pay a new recipient</strong>
              <span>
                Enter a PayNow mobile number manually
              </span>
            </div>

            <ArrowRight size={19} />
          </button>

          <div className="paynow-home-security">
            <ShieldCheck size={20} />

            <p>
              REVENT assesses payments for potential
              scam indicators, including transfers to
              unfamiliar recipients.
            </p>
          </div>
        </section>

        <p className="paynow-home-disclaimer">
          Prototype only. Contacts and recent recipients
          are simulated and are not retrieved from your phone.
        </p>
      </div>
    </main>
  );
}
