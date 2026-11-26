import { Maximize2, X, Send, Paperclip } from "lucide-react";

import RiriIdle from "../../assets/riri/riri-idle-v2.gif";
import "../../css/riri/riri-quick-chat.css";

export default function RiriQuickChat({
    onClose,
    onMaximize
}) {
    return (
        <div
            className="riri-quick-chat"
            onPointerDown={(event) => event.stopPropagation()}
        >
            <div className="riri-quick-chat-header">
                <img
                    src={RiriIdle}
                    alt="Riri"
                    className="riri-quick-chat-avatar"
                />

                <div className="riri-quick-chat-heading">
                    <strong>Riri AI</strong>
                    <span>Your banking buddy</span>
                </div>

                <button
                    type="button"
                    onClick={onMaximize}
                    aria-label="Maximise chat"
                >
                    <Maximize2 size={19} />
                </button>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close chat"
                >
                    <X size={21} />
                </button>
            </div>

            <div className="riri-quick-chat-body">
                <div className="riri-quick-chat-message">
                    <strong>Meep! 🐾</strong>
                    <p>How can Riri help you today?</p>
                </div>
            </div>

            <div className="riri-quick-chat-composer">
                <button type="button" disabled>
                    <Paperclip size={20} />
                </button>

                <input
                    placeholder="Ask Riri anything..."
                    disabled
                />

                <button
                    type="button"
                    className="riri-quick-chat-send"
                    disabled
                >
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
}