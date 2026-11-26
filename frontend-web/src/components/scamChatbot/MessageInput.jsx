
export default function MessageInput({
  message,
  setMessage,
  disabled
}) {
  return (
    <div className="scam-input">

      <label htmlFor="scam-message">
        Message Riri
      </label>

      <textarea
        id="scam-message"
        value={message}
        onChange={(event) =>
          setMessage(event.target.value)
        }
        placeholder="Paste a suspicious message or tell me what happened..."
        rows={4}
        maxLength={5000}
        disabled={disabled}
        aria-label="Message Riri"
      />

      <span className="character-count">
        {message.length}/5000
      </span>

    </div>
  );
}
