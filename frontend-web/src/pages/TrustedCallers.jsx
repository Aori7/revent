import { useState } from "react";
import { ShieldCheck, Phone, Trash2 } from "lucide-react";
import "../css/TrustedCallers.css";

const STORAGE_KEY = "reventTrustedCallers";

export default function TrustedCallers() {
  const [contacts, setContacts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  });

  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [error, setError] = useState("");

  function saveContacts(updated) {
    setContacts(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function addContact(event) {
    event.preventDefault();

    const cleaned = number.replace(/\s/g, "");

    if (!name.trim() || !/^\+?\d{8,15}$/.test(cleaned)) {
      setError("Enter a name and a valid phone number.");
      return;
    }

    if (contacts.some((contact) => contact.number === cleaned)) {
      setError("This number is already trusted.");
      return;
    }

    saveContacts([
      ...contacts,
      { id: crypto.randomUUID(), name: name.trim(), number: cleaned },
    ]);

    setName("");
    setNumber("");
    setError("");
  }

  function removeContact(id) {
    saveContacts(contacts.filter((contact) => contact.id !== id));
  }

  return (
    <main className="trusted-page">
      <div className="trusted-container">
        <div className="trusted-heading">
          <ShieldCheck size={34} color="#ee2722" />
          <div>
            <h1>Trusted Callers</h1>
            <p>Choose who can stay on a call while you bank.</p>
          </div>
        </div>

        <div className="trusted-card">
          <h2>Add a Trusted Caller</h2>

          <form onSubmit={addContact}>
            <label htmlFor="trusted-name">Contact name</label>
            <input
              id="trusted-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mum"
            />

            <label htmlFor="trusted-number">Phone number</label>
            <input
              id="trusted-number"
              type="tel"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="e.g. 91234567"
            />

            {error && <p className="trusted-error">{error}</p>}

            <button type="submit" className="trusted-add-btn">
              Add Trusted Caller
            </button>
          </form>
        </div>

        <div className="trusted-card">
          <h2>Your Trusted Callers ({contacts.length})</h2>

          {contacts.length === 0 ? (
            <p className="trusted-empty">No trusted callers added yet.</p>
          ) : (
            contacts.map((contact) => (
              <div className="trusted-contact" key={contact.id}>
                <Phone size={20} />
                <div className="trusted-contact-info">
                  <strong>{contact.name}</strong>
                  <span>{contact.number}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeContact(contact.id)}
                  aria-label={`Remove ${contact.name}`}
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))
          )}
        </div>

        <p className="trusted-note">
          Trusted callers can bypass call-only restrictions.
          Screen sharing is never permitted during banking.
          This feature uses simulated caller verification.
        </p>
      </div>
    </main>
  );
}
