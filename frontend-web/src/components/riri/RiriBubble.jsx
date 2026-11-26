import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import RiriQuickChat from "./RiriQuickChat";
import RiriIdle from "../../assets/riri/riri-idle-v2.gif";
import RiriWave from "../../assets/riri/riri-wave.webp";
import "../../css/riri/riri-bubble.css";

const STORAGE_KEY = "reventRiriPosition";
const MARGIN = 12;

function getDefaultPosition() {
  const mobile = window.innerWidth <= 768;
  const size = mobile ? 85 : 100;
  const bottomSpace = mobile ? 112 : 30;

  return {
    x: window.innerWidth - size - 20,
    y: window.innerHeight - size - bottomSpace,
  };
}

function getSavedPosition() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y)) {
      return saved;
    }
  } catch {
    // Use default position.
  }

  return getDefaultPosition();
}

export default function RiriBubble() {
  const bubbleRef = useRef(null);
  const dragRef = useRef(null);
  const movedRef = useRef(false);

  const [position, setPosition] = useState(getSavedPosition);

  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const [isChatOpen, setIsChatOpen] = useState(false);

  const positionRef = useRef(position);

  function clampPosition(x, y) {
    const width = bubbleRef.current?.offsetWidth || 100;
    const height = bubbleRef.current?.offsetHeight || 100;

    return {
      x: Math.max(MARGIN, Math.min(x, window.innerWidth - width - MARGIN)),

      y: Math.max(MARGIN, Math.min(y, window.innerHeight - height - MARGIN)),
    };
  }

  function updatePosition(next) {
    positionRef.current = next;
    setPosition(next);
  }

  useEffect(() => {
    function handleResize() {
      const { x, y } = positionRef.current;

      updatePosition(clampPosition(x, y));
    }

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  function handlePointerDown(event) {
    if (event.button !== 0 || dragRef.current) return;

    movedRef.current = false;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: positionRef.current.x,
      originY: positionRef.current.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (Math.hypot(dx, dy) > 5) {
      movedRef.current = true;
      setIsDragging(true);
    }

    if (!movedRef.current) return;

    updatePosition(clampPosition(drag.originX + dx, drag.originY + dy));
  }

  function handlePointerUp(event) {
    if (dragRef.current?.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;
    setIsDragging(false);

    if (movedRef.current) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(positionRef.current));
    } else if (event.type === "pointerup") {
      setIsChatOpen((previous) => !previous);
    }
  }
  const showGreeting = isHovered && !isDragging && !isChatOpen;
  const shouldWave = isHovered && !isDragging && !isChatOpen;
  const speechSide = position.x > window.innerWidth / 2 ? "left" : "right";

  const hasSideSpace =
    speechSide === "left"
      ? position.x >= 210
      : window.innerWidth -
          position.x -
          (bubbleRef.current?.offsetWidth || 100) >=
        210;

  const speechPosition = hasSideSpace
    ? speechSide
    : position.y > 120
      ? "top"
      : "bottom";

  return (
    <>
      <div
        ref={bubbleRef}
        className={`riri-bubble ${isDragging ? "riri-dragging" : ""}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={handlePointerUp}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Greeting speech bubble */}
        <div
          className={`riri-speech riri-speech-${speechPosition} ${
            showGreeting ? "riri-speech-visible" : ""
          }`}
          aria-hidden={!showGreeting}
        >
          <span className="riri-speech-title">Meep! 🐾</span>
          <span>How can Riri help you today?</span>
        </div>

        {/* Animated Riri avatar */}
        <div className="riri-bubble-inner">
          <img
            src={shouldWave ? RiriWave : RiriIdle}
            alt="Riri, your banking buddy"
            className={`riri-avatar ${
              shouldWave ? "riri-avatar-wave" : "riri-avatar-idle"
            }`}
            draggable={false}
          />
        </div>
      </div>

      {/* Quick chat popup */}
      {isChatOpen && (
        <RiriQuickChat
          onClose={() => setIsChatOpen(false)}
          onMaximize={() => {
            setIsChatOpen(false);
            navigate("/scam-chatbot");
          }}
        />
      )}
    </>
  );
}
