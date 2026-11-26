
import { useState, useEffect, useRef } from "react";
import {
  Send,
  LockKeyhole,
  Mic,
  MicOff,
  Volume2,
  SquarePen,
  ShieldCheck,
  Phone,
  ImagePlus,
  MessageCircle
} from "lucide-react";

import RiriIdle from "../../assets/riri/riri-wave.webp";
import MessageInput from "./MessageInput";
import ImageUploadNotice from "./ImageUploadNotice";
import RiriAnalysisCard from "./RiriAnalysisCard";

export default function ChatbotHome({
  message,
  setMessage,
  messages,
  onSend,
onFollowUp,
onReset,
  loading,
  error
}) {
  const [processing, setProcessing] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

  const busy = loading || processing || listening;

  useEffect(() => {
    if (messages.length) {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth"
      });
    }
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  function handleExtractedText(text) {
    setMessage(previous =>
      `${previous.trim()}\n${text}`.trim().slice(0, 5000)
    );
  }

  function speak(text) {
    if (!window.speechSynthesis) {
      setVoiceError("Voice playback is not supported.");
      return;
    }

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-SG";
    speech.rate = 0.9;
    speech.pitch = 1.15;

    window.speechSynthesis.speak(speech);
  }

  function startListening() {
    setVoiceError("");

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError(
        "Voice input is unavailable. Try Chrome or Edge."
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognitionRef.current = recognition;
    recognition.lang = "en-SG";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);

    recognition.onresult = event => {
      const transcript = event.results[0][0].transcript;

      setMessage(previous =>
        `${previous} ${transcript}`.trim().slice(0, 5000)
      );
    };

    recognition.onerror = () => {
      setVoiceError(
        "Unable to use your microphone. Check permissions."
      );
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    try {
      recognition.start();
    } catch {
      setVoiceError("Unable to start voice input.");
    }
  }

  const suggestions = [
  {
    icon: ShieldCheck,
    label: "Check a suspicious message",
    text: "Can you help me check a suspicious message?"
  },
  {
    icon: Phone,
    label: "Suspicious phone call",
    text: "I received a suspicious phone call."
  },
  {
    icon: ImagePlus,
    label: "Check a screenshot",
    text: "Can you help me check a screenshot?"
  },
  {
    icon: MessageCircle,
    label: "Ask about banking safety",
    text: "How can I protect myself from banking scams?"
  }
];

  return (
    <>
      <section className="scam-red-header">
        <div>
          <h1>Riri AI</h1>
          <h2>Your banking buddy</h2>
        </div>

        <div className="riri-header-actions">
          <button
            className="riri-new-chat"
            onClick={() => {
              window.speechSynthesis?.cancel();
              onReset();
            }}
            disabled={busy}
          >
            <SquarePen size={19} />
            New chat
          </button>

          <div className="riri-header-avatar">
            <img src={RiriIdle} alt="Riri" />
          </div>
        </div>
      </section>

      <section className="scam-main-content riri-conversation">

        <div className="riri-welcome">
          <div className="riri-welcome-stage">
            <img
              src={RiriIdle}
              alt="Riri, your banking buddy"
              className={`riri-welcome-image ${
                loading || processing
                  ? "riri-is-thinking"
                  : ""
              }`}
              draggable={false}
            />
          </div>

          <h2>Meep! I'm Riri! 🐾</h2>
          <p>Your little companion for safer banking.</p>
        </div>

        {messages.length === 0 && (
          <>
            <div className="riri-speech-bubble">
              <span>
                Hey there! I'm Riri, your banking buddy.
                Tell me what's on your mind!
              </span>

              <button
                className="riri-voice-button"
                aria-label="Listen to Riri's greeting"
                onClick={() =>
                  speak(
                    "Hey there! I'm Riri, your banking buddy. Tell me what's on your mind!"
                  )
                }
              >
                <Volume2 size={21} />
              </button>
            </div>

            <div className="riri-suggestions">
              {suggestions.map(item => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.label}
                    disabled={busy}
                    onClick={() => onSend(item.text)}
                  >
                    <Icon size={22} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div
          className="riri-message-list"
          role="log"
          aria-live="polite"
        >
          {messages.map((item, index) => (
            <div
              key={index}
              className={`riri-message-row ${item.role}`}
            >
              {item.role === "assistant" && (
                <img
                  src={RiriIdle}
                  className="riri-chat-avatar"
                  alt="Riri"
                />
              )}

              <div className="riri-message-bubble">
                <strong>
                  {item.role === "assistant" ? "Riri" : "You"}
                </strong>

                <p>{item.content}</p>

{item.role === "assistant" && item.analysis && (
  <RiriAnalysisCard
    analysis={item.analysis}
    originalMessage={item.originalMessage}
    onFollowUp={onFollowUp}
  />
)}

                {item.role === "assistant" && (
                  <button
                    className="riri-voice-button"
                    aria-label="Read Riri's response aloud"
                    onClick={() => speak(item.content)}
                  >
                    <Volume2 size={19} />
                    Listen
                  </button>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="riri-message-row assistant">
              <img
                src={RiriIdle}
                className="riri-chat-avatar riri-is-thinking"
                alt="Riri thinking"
              />

              <div className="riri-message-bubble">
                <strong>Riri</strong>
                <p>Hmm... let me check that for you!</p>

                <div className="riri-thinking-dots">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="riri-chat-composer">
          <MessageInput
            message={message}
            setMessage={setMessage}
            disabled={busy}
          />

          <div className="riri-composer-tools">
            <ImageUploadNotice
              key={messages.length}
              onExtract={handleExtractedText}
              onProcessingChange={setProcessing}
              disabled={busy}
            />

            <button
              type="button"
              className={`riri-mic-button ${
                listening ? "recording" : ""
              }`}
              onClick={startListening}
              disabled={loading || processing}
            >
              {listening ? (
                <MicOff size={20} />
              ) : (
                <Mic size={20} />
              )}

              {listening ? "Stop" : "Speak"}
            </button>
          </div>

          <p className="scam-attachment-hint">
            Add a screenshot or use your microphone.
            Review the extracted text before sending.
          </p>

          {listening && (
            <p className="riri-listening">
              Listening to you...
            </p>
          )}

          <div className="riri-send-actions">
  <button
    type="button"
    className="scam-primary-button"
    onClick={() => onSend()}
    disabled={busy || !message.trim()}
  >
    <Send size={19} />

    {loading
      ? "Riri is thinking..."
      : processing
      ? "Reading image..."
      : "Ask Riri"}
  </button>
</div>
        </div>

        {(error || voiceError) && (
          <p className="scam-error" role="alert">
            {error || voiceError}
          </p>
        )}

        <div className="scam-security-note">
          <LockKeyhole size={16} />
          <span>
            Never share your OTP, PIN or password.
          </span>
        </div>

        <p className="scam-disclaimer scam-centered">
          Riri provides guidance, not a guarantee of safety.
        </p>
      </section>
    </>
  );
}
