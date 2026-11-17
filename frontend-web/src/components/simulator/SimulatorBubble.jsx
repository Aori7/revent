import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import SimulatorPanel from "./SimulatorPanel";
import "../../css/simulator.css";

const STORAGE_KEY = "reventSimulatorPosition";
const MARGIN = 12;

function getDefaultPosition() {
  const size = window.innerWidth <= 600 ? 60 : 68;
  const bottomSpace =
    window.innerWidth <= 768 ? 112 : 30;

  return {
    x: window.innerWidth - size - 20,
    y: window.innerHeight - size - bottomSpace,
  };
}

function SimulatorBubble() {
  const [isOpen, setIsOpen] = useState(false);

  const bubbleRef = useRef(null);
  const dragRef = useRef(null);
  const movedRef = useRef(false);

  const [position, setPosition] = useState(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY)
      );

      if (
        Number.isFinite(saved?.x) &&
        Number.isFinite(saved?.y)
      ) {
        return saved;
      }
    } catch {
      // Use the default position.
    }

    return getDefaultPosition();
  });

  const positionRef = useRef(position);

  function clampPosition(x, y) {
    const width = bubbleRef.current?.offsetWidth || 68;
    const height = bubbleRef.current?.offsetHeight || 68;

    return {
      x: Math.max(
        MARGIN,
        Math.min(
          x,
          Math.max(MARGIN, window.innerWidth - width - MARGIN)
        )
      ),
      y: Math.max(
        MARGIN,
        Math.min(
          y,
          Math.max(MARGIN, window.innerHeight - height - MARGIN)
        )
      ),
    };
  }

  function updatePosition(next) {
    positionRef.current = next;
    setPosition(next);
  }

  useEffect(() => {
    const handleResize = () => {
      const { x, y } = positionRef.current;
      const next = clampPosition(x, y);
      updatePosition(next);
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  function handlePointerDown(event) {
    if (event.button !== 0) return;

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

    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (Math.hypot(dx, dy) > 5) {
      movedRef.current = true;
    }

    if (!movedRef.current) return;

    updatePosition(
      clampPosition(
        drag.originX + dx,
        drag.originY + dy
      )
    );
  }

  function handlePointerUp(event) {
    if (dragRef.current?.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;

    if (movedRef.current) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(positionRef.current)
      );
    }
  }

  function handleClick(event) {
    if (movedRef.current) {
      event.preventDefault();
      movedRef.current = false;
      return;
    }

    setIsOpen((previous) => !previous);
  }

  return (
    <>
      {isOpen && (
        <div className="simulator-panel-wrapper">
          <SimulatorPanel />
        </div>
      )}

      <button
        ref={bubbleRef}
        type="button"
        className="simulator-bubble simulator-draggable"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
        aria-label={
          isOpen ? "Close simulator" : "Open simulator"
        }
        aria-expanded={isOpen}
        aria-controls="revent-simulator-panel"
        title="Simulation Controls"
      >
        {isOpen ? (
          <X size={30} />
        ) : (
          <SlidersHorizontal size={30} />
        )}
      </button>
    </>
  );
}

export default SimulatorBubble;
