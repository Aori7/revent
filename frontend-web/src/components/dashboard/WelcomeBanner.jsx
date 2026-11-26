import RiriWelcome from "../../assets/riri/riri-welcome.png";
import "../../css/dashboard/welcome-banner.css";

export default function WelcomeBanner({ name = "Kiki" }) {
  return (
    <section className="dashboard-welcome-banner">
      <div className="dashboard-welcome-content">

        {/* <span className="dashboard-welcome-meep">
          🐾 Meep!
        </span> */}

        <h1>Welcome back, {name}!</h1>

        <p>
          Riri's here to help you bank safer and smarter.
        </p>

      </div>

      <div className="dashboard-welcome-mascot">
        <img
          src={RiriWelcome}
          alt="Riri welcoming you back"
          draggable={false}
        />
      </div>
    </section>
  );
}