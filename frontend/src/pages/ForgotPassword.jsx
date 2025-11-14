import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./ForgotPassword.css";

const FALLBACK = {
  SUCCESS: "IFP001", // Code sent successfully
  ERROR: "EF001",   // Unexpected error
};

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState(""); // "success" / "error"
  const [tables, setTables] = useState({
    errors: {},
    info: {},
  });

  const navigate = useNavigate();

  // -------------------------
  // Convert array → {CODE: "message"}
  // -------------------------
  const normalize = (arr, type) => {
    const map = {};
    arr.forEach((item) => {
      if (type === "error" && item.error_code) {
        map[item.error_code.toUpperCase()] = item.error_message;
      }
      if (type === "info" && item.information_code) {
        map[item.information_code.toUpperCase()] = item.information_text;
      }
    });
    return map;
  };

  // -------------------------
  // Load messages from localStorage
  // -------------------------
  useEffect(() => {
    const e = JSON.parse(localStorage.getItem("user_error") || "[]");
    const i = JSON.parse(localStorage.getItem("user_information") || "[]");

    setTables({
      errors: normalize(e, "error"),
      info: normalize(i, "info"),
    });
  }, []);

  const getErrorText = (code) =>
    tables.errors[(code || "").toUpperCase()] || "";

  const getInfoText = (code) =>
    tables.info[(code || "").toUpperCase()] || "";

  // -------------------------
  // FIX: Normalize backend code mismatch (IF001 → IFP001)
  // -------------------------
  const normalizeCode = (c) => {
    const code = (c || "").toUpperCase();

    // Backend sends IF001 → Frontend uses IFP001
    if (code === "IF001") return "IFP001";

    return code;
  };

  // -------------------------
  // Submit handler
  // -------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setMsgType("");

    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/api/password-reset/send-otp/",
        { email }
      );

      const rawCode = res.data.code || FALLBACK.SUCCESS;
      const code = normalizeCode(rawCode);

      setMessage(getInfoText(code));
      setMsgType("success");

      setTimeout(() => {
        navigate("/verify-otp", { state: { email } });
      }, 1200);

    } catch (error) {
      const rawCode = error.response?.data?.code || FALLBACK.ERROR;
      const code = normalizeCode(rawCode);

      setMessage(getErrorText(code));
      setMsgType("error");
    }
  };

  return (
    <div className="forgot-wrapper">
      <div className="forgot-container">
        <h2 className="forgot-title">Forgot Password</h2>

        <form onSubmit={handleSubmit} className="forgot-form">
          <input
            className="forgot-input"
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button className="forgot-btn" type="submit">
            Send Verification Code
          </button>
        </form>

        {message && (
          <p className={msgType === "error" ? "error" : "success"}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
