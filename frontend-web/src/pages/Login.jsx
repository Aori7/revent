import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

import { loginCustomer } from "../services/authApi";
import ReventLogo from "../components/ReventLogo";
import "../css/login.css";

function Login() {
  const navigate = useNavigate();

  const [accessCode, setAccessCode] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();

    if (isSubmitting) return;

    setError("");

    // Validate Access Code
    if (!/^\d{6}$/.test(accessCode)) {
      setError("Please enter your 6-digit Access Code.");
      return;
    }

    // Validate PIN
    if (!/^\d{6}$/.test(pin)) {
      setError("Please enter your 6-digit PIN.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Authenticate using the Express backend
      const result = await loginCustomer(accessCode, pin);

      if (!result.session?.access_token) {
        throw new Error("Unable to establish an authenticated session.");
      }

      if (!result.user?.id) {
        throw new Error("Unable to identify the authenticated user.");
      }

      sessionStorage.setItem("reventAccessToken", result.session.access_token);

      sessionStorage.setItem("reventUserId", result.user.id);

      // Redirect to banking home page
      navigate("/", { replace: true });
    } catch (error) {
      setPin("");
      setError(error.message || "Invalid Access Code or PIN.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-content">
        <div className="login-card">
          <ReventLogo />

          <h1>Online Banking</h1>

          <form onSubmit={handleLogin}>
            <label htmlFor="accessCode">Access Code</label>

            <input
              id="accessCode"
              type="text"
              placeholder="Enter 6-digit Access Code"
              value={accessCode}
              onChange={(e) =>
                setAccessCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              maxLength={6}
              autoComplete="username"
              required
            />

            <label htmlFor="pin">PIN</label>

            <div className="login-pin-wrapper">
              <input
                id="pin"
                type={showPin ? "text" : "password"}
                placeholder="Enter 6-digit PIN"
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                maxLength={6}
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="login-show-pin"
                onClick={() => setShowPin(!showPin)}
                aria-label={showPin ? "Hide PIN" : "Show PIN"}
              >
                {showPin ? <EyeOff size={22} /> : <Eye size={22} />}
              </button>
            </div>

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="login-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Logging in..." : "Login"}
            </button>
          </form>

          <button
            type="button"
            className="login-help"
            onClick={() =>
              setError(
                "Please check your Access Code, PIN and email verification status.",
              )
            }
          >
            Trouble logging in?
          </button>
        </div>

        <p className="login-register">
          Don't have Online Banking? <Link to="/signup">Sign up now</Link>
        </p>
      </div>

      <footer className="login-footer">
        @Revent. All Rights Reserved. Conditions of Access | Policies | Security
        | Need Help?
      </footer>
    </main>
  );
}

export default Login;
