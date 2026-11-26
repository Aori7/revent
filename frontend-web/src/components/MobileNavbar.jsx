import { NavLink } from "react-router-dom";
import { House, ArrowLeftRight, Gift, Menu } from "lucide-react";

import RiriHead from "../assets/riri/idle-head.png";
import "../css/nav/mobile-navbar.css";

function MobileNavbar() {
  return (
    <nav className="mobile-bottom-nav">
      {/* Curved navbar background */}
      <svg
        className="mobile-nav-background"
        width="100%"
        height="100%"
        aria-hidden="true"
      >
        <defs>
          <mask id="mobile-nav-mask">
            <rect width="100%" height="100%" fill="white" />

            <circle cx="50%" cy="0" r="39" fill="black" />
          </mask>
        </defs>

        <rect
          width="100%"
          height="100%"
          fill="white"
          mask="url(#mobile-nav-mask)"
        />
      </svg>

      {/* Home */}
      <NavLink to="/" end>
        <House size={26} className="nav-home-icon" />
        <span>Home</span>
      </NavLink>

      {/* Riri AI */}
      <NavLink to="/scam-chatbot">
        <img
          src={RiriHead}
          alt=""
          className="mobile-nav-riri"
          draggable={false}
        />
        <span>Riri AI</span>
      </NavLink>

      {/* Raised Transfer button */}
      <NavLink to="/transfer" className="mobile-nav-transfer">
        <div className="mobile-transfer-circle">
          <ArrowLeftRight size={29} className="nav-transfer-icon" />
        </div>

        <span>Transfer</span>
      </NavLink>

      {/* Rewards */}
      <NavLink to="/rewards">
        <Gift size={26} className="nav-rewards-icon" />
        <span>Rewards</span>
      </NavLink>

      {/* More */}
      <NavLink to="/more">
        <Menu size={26} className="nav-more-icon" />
        <span>More</span>
      </NavLink>
    </nav>
  );
}

export default MobileNavbar;
