// frontend/src/pages/VerifyOtp.jsx
import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { FiEye, FiEyeOff } from "react-icons/fi";
import "./VerifyOtp.css";

export default function VerifyOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const prefilledEmail = (location.state?.email || "").trim();

  const newPassRef = useRef(null);

  const [form, setForm] = useState({
    email: prefilledEmail,
    otp: "",
    new_password: "",
    confirm_password: "",
  });

  const [tables, setTables] = useState({
    user_error: {},
    user_information: {},
  });

  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Convert localStorage arrays → { CODE: "Message" }
  const normalize = (arr, type) => {
    const map = {};
    if (!Array.isArray(arr)) return map;
    arr.forEach((item) => {
      if (type === "error" && item.error_code)
        map[item.error_code.toUpperCase()] = item.error_message;
      if (type === "info" && item.information_code)
        map[item.information_code.toUpperCase()] = item.information_text;
    });
    return map;
  };

  useEffect(() => {
    try {
      const e = JSON.parse(localStorage.getItem("user_error") || "[]");
      const i = JSON.parse(localStorage.getItem("user_information") || "[]");

      setTables({
        user_error: normalize(e, "error"),
        user_information: normalize(i, "info"),
      });
    } catch {
      setTables({ user_error: {}, user_information: {} });
    }
  }, []);

  const getErrorText = (code) => {
    if (!code) return "";

    const key = code.toUpperCase();

    return (
      tables.user_error[key] ||
      tables.user_information[key] ||
      ""
    );
  };

  const getInfoText = (code) => {
    if (!code) return "";

    const key = code.toUpperCase();

    return (
      tables.user_information[key] ||
      tables.user_error[key] ||
      ""
    );
  };

  // 👉 FIX OPTION 1: Force EF005 → EF002
  const normalizeBackendCode = (code) => {
    const c = (code || "").toUpperCase();
    if (c === "EF005") return "EF002"; // 🔥 Force use EF002 message ("Code is wrong")
    return c;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "otp") {
      const onlyNums = (value || "").replace(/[^0-9]/g, "").trim();
      setForm((prev) => ({ ...prev, otp: onlyNums }));
      setErrors((prev) => ({ ...prev, otp: undefined }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validatePasswords = () => {
    if (form.new_password !== form.confirm_password) {
      setErrors({ confirm_password: getErrorText("EF003") });
      return false;
    }
    return true;
  };
  const normalizeSuccessCode = (code) => {
  const c = (code || "").toUpperCase();

  // backend may send IF002 or IF003 or IF004 etc.
  // but for password reset success, we must ALWAYS show IFP002
  if (["IF002", "IF003", "IF004", "IF005", "IF006"].includes(c)) {
    return "IFP002"; 
  }

  return c;
};

  const handleSubmit = async (e) => {
    e.preventDefault();

    setErrors({});
    setSuccessMsg("");

    if ((form.otp || "").length !== 6) {
      setErrors({ otp: "Please enter a 6-digit code" });
      return;
    }

    if (!validatePasswords()) return;

    setLoading(true);
    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/api/password-reset/verify-otp/",
        form
      );

      const backendRaw = res?.data?.code;
const successCode = normalizeSuccessCode(backendRaw);

setSuccessMsg(getInfoText(successCode));

      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      const backendRaw = err?.response?.data?.code;
      const backendCode = normalizeBackendCode(backendRaw);

      // EF004 (session expired) still kept separate
      if (backendCode === "EF004") {
        setErrors({ otp: getErrorText("EF004") });
      } else if (backendCode === "EF002") {
        setErrors({ otp: getErrorText("EF002") }); // will now show correct EF002 message
      } else {
        const text = getErrorText(backendCode) || "Something went wrong.";
        setErrors({ general: text });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();

      if ((form.otp || "").length === 6) {
        setErrors({});
        newPassRef.current?.focus();
      } else {
        setErrors({ otp: "Please enter a 6-digit code" });
      }
    }
  };

  return (
    <div className="verify-container">
      <div className="verify-card">
        <h2 className="verify-title">{getInfoText("IF004")}</h2>

        <p className="verify-subtext">
          Enter the verification code sent to your email.
        </p>

        <form onSubmit={handleSubmit} noValidate>

          {/* Email */}
          <div className="form-group">
            <label>Email</label>
            <input
              className="readonly-input"
              name="email"
              value={form.email}
              readOnly
              type="email"
            />
          </div>

          {/* OTP */}
          <div className="form-group">
            <label>Enter Verification Code</label>
            <input
              name="otp"
              type="text"
              maxLength="6"
              placeholder="Enter 6-digit code"
              value={form.otp}
              onChange={handleChange}
              onKeyDown={handleOtpKeyDown}
              onBlur={() => {
                if ((form.otp || "").length !== 6) {
                  setErrors({ otp: "Please enter a 6-digit code" });
                }
              }}
            />
            {errors.otp && <p className="error-msg">{errors.otp}</p>}
          </div>

          {/* New password */}
          <div className="form-group password-field">
            <label>New Password</label>
            <div className="password-wrapper">
              <input
                ref={newPassRef}
                type={showNewPass ? "text" : "password"}
                name="new_password"
                placeholder="Enter new password"
                value={form.new_password}
                onChange={handleChange}
                className="password-input"
              />
              <span
                className="password-icon"
                onClick={() => setShowNewPass(!showNewPass)}
              >
                {showNewPass ? <FiEyeOff /> : <FiEye />}
              </span>
            </div>
          </div>

          {/* Confirm password */}
          <div className="form-group password-field">
            <label>Confirm Password</label>
            <div className="password-wrapper">
              <input
                type={showConfirmPass ? "text" : "password"}
                name="confirm_password"
                placeholder="Confirm new password"
                value={form.confirm_password}
                onChange={handleChange}
                className="password-input"
              />
              <span
                className="password-icon"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
              >
                {showConfirmPass ? <FiEyeOff /> : <FiEye />}
              </span>
            </div>
            {errors.confirm_password && (
              <p className="error-msg">{errors.confirm_password}</p>
            )}
          </div>

          {errors.general && <p className="error-msg">{errors.general}</p>}
          {successMsg && <p className="success-msg">{successMsg}</p>}

          <button type="submit" className="verify-btn" disabled={loading}>
            {loading ? getInfoText("IA006") : "Reset Password"}
          </button>

        </form>
      </div>
    </div>
  );
}
