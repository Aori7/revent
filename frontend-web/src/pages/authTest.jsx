
import { useState } from "react";
import { loginCustomer } from "../services/authApi";

export default function AuthTest() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    try {
      const result = await loginCustomer(email, password);

      if (result.session?.access_token) {
        setMessage("Login API connected successfully!");
      } else {
        setMessage("Login succeeded, but no session was returned.");
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main style={{ padding: "30px" }}>
      <h1>Login API Test</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Registered email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">Test Login</button>
      </form>

      <p role="status">{message}</p>
    </main>
  );
}
