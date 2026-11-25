import RiriIdle from "../../assets/riri/idle.png";
import "../../css/riri-bubble.css";

export default function RiriBubble() {
    return (
        <div className="riri-bubble">
            <img
                src={RiriIdle}
                alt="Riri, your banking buddy"
                className="riri-avatar"
                draggable={false}
            />
        </div>
    );
}