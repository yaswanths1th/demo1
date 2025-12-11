// frontend/src/pages/LoginPage.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import "./LoginPage.css";


const FALLBACK_CODES = {
  LOGIN_FAILED: "EL001",
  LOGIN_SUCCESS: "IL001",
  SERVER_ERROR: "EA010",
};

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "error" | "success"
  const navigate = useNavigate();

  const [msgTables, setMsgTables] = useState({
    user_error: {},
    user_information: {},
    user_validation: {},
  });

  // Convert arrays or objects to { CODE: "text" }
  const normalize = (maybeArr, type) => {
    if (!maybeArr) return {};
    const map = {};
    if (Array.isArray(maybeArr)) {
      for (const item of maybeArr) {
        if (!item) continue;
        if (type === "error" && item.error_code) {
          map[String(item.error_code).toUpperCase()] = item.error_message || "";
        } else if (type === "info" && item.information_code) {
          map[String(item.information_code).toUpperCase()] = item.information_text || "";
        } else if (type === "validation" && item.validation_code) {
          map[String(item.validation_code).toUpperCase()] = item.validation_message || "";
        }
      }
    } else if (typeof maybeArr === "object") {
      for (const [k, v] of Object.entries(maybeArr)) {
        map[String(k).toUpperCase()] = typeof v === "string" ? v : String(v || "");
      }
    }
    return map;
    };

  // Load cached tables (App already populated localStorage)
  useEffect(() => {
    try {
      const e = JSON.parse(localStorage.getItem("user_error") || "[]");
      const i = JSON.parse(localStorage.getItem("user_information") || "[]");
      const v = JSON.parse(localStorage.getItem("user_validation") || "[]");
      setMsgTables({
        user_error: normalize(e, "error"),
        user_information: normalize(i, "info"),
        user_validation: normalize(v, "validation"),
      });
    } catch {
      setMsgTables({ user_error: {}, user_information: {}, user_validation: {} });
    }
  }, []);

  const getErrorText = (code) =>
    msgTables.user_error[(code || "").toUpperCase()] || "";
  const getInfoText = (code) =>
    msgTables.user_information[(code || "").toUpperCase()] || "";

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setMessageType("");

    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => ({}));

      // Invalid credentials → no tokens should be kept
      if (!res.ok || !data.access) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");

        const code = (data.code && String(data.code)) || FALLBACK_CODES.LOGIN_FAILED;
        const text = data.message || getErrorText(code) || "Invalid credentials.";
        setMessage(text);
        setMessageType("error");
        return;
      }

      // Success
      const infoCode = (data.code && String(data.code)) || FALLBACK_CODES.LOGIN_SUCCESS;
      setMessage(data.message || getInfoText(infoCode) || "Login successful.");
      setMessageType("success");

      // Store tokens + user
      localStorage.setItem("access", data.access);
      if (data.refresh) localStorage.setItem("refresh", data.refresh);
      localStorage.setItem(
        "user",
        JSON.stringify({
          username: data.username,
          email: data.email,
          is_admin: data.is_admin,
        })
      );

      const token = data.access;

      // Navigate after a short delay to let the success message render
      setTimeout(async () => {
        if (data.is_admin) {
          navigate("/admin/dashboard", { replace: true });
          return;
        }
        try {
          const addrRes = await fetch("http://127.0.0.1:8000/api/addresses/check/", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
          const addrData = await addrRes.json().catch(() => ({}));
          if (addrRes.ok && addrData.has_address) {
            navigate("/dashboard", { replace: true });
          } else {
            navigate("/addresses", { replace: true });
          }
        } catch {
          navigate("/addresses", { replace: true });
        }
      }, 700);
    } catch {
  const fallback =
    getErrorText(FALLBACK_CODES.SERVER_ERROR) ||
    "Server error. Please try again.";
  setMessage(fallback);
  setMessageType("error");
}
  };

  return (
    <div className="auth-wrapper">
      <div className="login-container">
        <h2>Login</h2>

        <form onSubmit={handleLogin} className="login-form" noValidate>
          <input
            className="login-input"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <div className="password-wrapper">
            <input
              className="login-input"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </span>
          </div>

          {message && (
            <p className={`login-message ${messageType === "error" ? "error-text" : "success-text"}`}>
              {message}
            </p>
          )}

          <button className="login-button" type="submit">
            Login
          </button>
        </form>

        <div className="login-links">
          <p><Link to="/forgot-password">Forgot password?</Link></p>
          <p>Don’t have an account? <Link to="/register">Register</Link></p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
