
export default function MessageInput({
  message,
  setMessage,
  disabled
}) {
  return (
    <div className="scam-input">
      <label htmlFor="scam-message">
        Suspicious content
      </label>

      <textarea
        id="scam-message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Paste a suspicious SMS, email or chat message, or upload an image below..."
        rows={7}
        maxLength={5000}
        disabled={disabled}
        aria-label="Suspicious content"
      />

      <span className="character-count">
        {message.length}/5000 characters
      </span>
    </div>
  );
}
