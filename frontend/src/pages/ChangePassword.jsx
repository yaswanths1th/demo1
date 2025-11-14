// frontend/src/pages/ChangePassword.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./ChangePassword.css";
import { Eye, EyeOff } from "lucide-react";

export default function ChangePassword() {
  const [form, setForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  // cache-only message tables (loaded from localStorage)
  const [tables, setTables] = useState({
    user_error: [],
    user_information: [],
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");

  const [showPassword, setShowPassword] = useState({
    old: false,
    new: false,
    confirm: false,
  });

  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("access");

  // redirect path depending on admin/user route
  const redirectTo = location.pathname.startsWith("/admin")
    ? "/admin/profile"
    : "/profile";

  // refs for focusing next field
  const oldRef = useRef(null);
  const newRef = useRef(null);
  const confirmRef = useRef(null);

  // -------------------------
  // load messages ONLY from cache
  // -------------------------
  useEffect(() => {
    try {
      const e = JSON.parse(localStorage.getItem("user_error") || "[]");
      const i = JSON.parse(localStorage.getItem("user_information") || "[]");

      setTables({
        user_error: Array.isArray(e) ? e : [],
        user_information: Array.isArray(i) ? i : [],
      });
    } catch {
      setTables({ user_error: [], user_information: [] });
    }
  }, []);

  // -------------------------
  // cache-only helpers (synchronous)
  // -------------------------
  const getErrorText = (code) => {
    if (!Array.isArray(tables.user_error)) return "";
    const row = tables.user_error.find(
      (x) =>
        x &&
        typeof x === "object" &&
        (String(x.error_code || "").toUpperCase() === String(code || "").toUpperCase())
    );
    return row?.error_message || "";
  };

  const getInfoText = (code) => {
    if (!Array.isArray(tables.user_information)) return "";
    const row = tables.user_information.find(
      (x) =>
        x &&
        typeof x === "object" &&
        (String(x.information_code || "").toUpperCase() === String(code || "").toUpperCase())
    );
    return row?.information_text || "";
  };

  // -------------------------
  // small utility: set single field error
  // -------------------------
  const setFieldError = (field, code) => {
    setErrors((p) => ({ ...p, [field]: code ? getErrorText(code) : "" }));
  };

  // -------------------------
  // validate on blur / enter
  // For required-check we use code "VA002" (validation: required) if present in cache.
  // NOTE: you asked for no hardcoded text — so we always lookup by code only.
  // -------------------------
  const validateOnBlur = (field) => {
    const value = String(form[field] || "").trim();
    if (!value) {
      // required field message code (common code from your earlier messages)
      setFieldError(field, "VA002");
      return false;
    } else {
      // clear
      setFieldError(field, null);
      return true;
    }
  };

  // confirm-match uses EF003 per your system
  const validateConfirmMatch = () => {
    if (form.new_password && form.confirm_password && form.new_password !== form.confirm_password) {
      setFieldError("confirm_password", "EF003");
      return false;
    }
    setFieldError("confirm_password", null);
    return true;
  };

  // -------------------------
  // handlers
  // -------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    // clear error for this field as user types
    setErrors((p) => ({ ...p, [name]: "" }));
    setSuccess("");
  };

  // pressing Enter behavior:
  // - if on old_password => run blur validation, then focus new_password
  // - if on new_password => run blur validation, then focus confirm_password
  // - if on confirm_password => run submit
  const handleKeyDown = (e, field) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    if (field === "old_password") {
      validateOnBlur("old_password");
      // focus new
      if (newRef.current) newRef.current.focus();
    } else if (field === "new_password") {
      validateOnBlur("new_password");
      if (confirmRef.current) confirmRef.current.focus();
    } else if (field === "confirm_password") {
      // check confirm match before submit
      validateConfirmMatch();
      // submit
      handleSubmit(e);
    }
  };

  const toggleShowPassword = (which) => {
    setShowPassword((p) => ({ ...p, [which]: !p[which] }));
  };

  // -------------------------
  // submit
  // -------------------------
  const handleSubmit = async (evt) => {
    if (evt && evt.preventDefault) evt.preventDefault();

    // clear previous
    setErrors({});
    setSuccess("");

    // client-side confirm match check using cached code
    if (!validateConfirmMatch()) return;

    // basic required checks for all fields (will show VA002 if empty and code present)
    const okOld = validateOnBlur("old_password");
    const okNew = validateOnBlur("new_password");
    const okConfirm = validateOnBlur("confirm_password");
    if (!okOld || !okNew || !okConfirm) return;

    try {
      await axios.post(
        "http://127.0.0.1:8000/api/change-password/change-password/",
        {
          old_password: form.old_password,
          new_password: form.new_password,
          confirm_password: form.confirm_password,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // success code ICP001 (from cache only)
      const info = getInfoText("ICP001") || "";
      setSuccess(info);

      // after success navigate
      setTimeout(() => navigate(redirectTo), 2000);
    } catch (err) {
      // parse backend response and map to cached codes (no hardcoded texts)
      const resp = err.response?.data;
      const newErrs = {};

      if (resp && typeof resp === "object") {
        // field-specific server messages
        if (resp.old_password) {
          // display EC001 (invalid old password) if present in cache, else show server string
          const codeEC001 = getErrorText("EC001");
          newErrs.old_password = codeEC001 || String(Array.isArray(resp.old_password) ? resp.old_password[0] : resp.old_password);
        }
        if (resp.new_password) {
          const codeEC002 = getErrorText("EC002");
          newErrs.new_password = codeEC002 || String(Array.isArray(resp.new_password) ? resp.new_password[0] : resp.new_password);
        }
        if (resp.confirm_password) {
          const codeEF003 = getErrorText("EF003");
          newErrs.confirm_password = codeEF003 || String(Array.isArray(resp.confirm_password) ? resp.confirm_password[0] : resp.confirm_password);
        }

        // top-level detail or string possibly a code
        if (!Object.keys(newErrs).length && typeof resp.detail === "string") {
          // if detail matches a cached error code, show that; else map to EG001 if present
          const det = String(resp.detail).trim();
          const isErrorCode = Array.isArray(tables.user_error) && tables.user_error.some(it => (it.error_code || "").toUpperCase() === det.toUpperCase());
          if (isErrorCode) newErrs.general = getErrorText(det);
          else newErrs.general = getErrorText("EG001") || det;
        }
      } else if (typeof resp === "string") {
        const det = resp.trim();
        const isErrorCode = Array.isArray(tables.user_error) && tables.user_error.some(it => (it.error_code || "").toUpperCase() === det.toUpperCase());
        newErrs.general = isErrorCode ? getErrorText(det) : getErrorText("EG001") || det;
      } else {
        newErrs.general = getErrorText("EG001") || "";
      }

      setErrors(newErrs);
    }
  };

  // -------------------------
  // rendering: small inline styles to ensure eye icon sits inside input
  // (keeps layout same but forces icon alignment)
  // -------------------------
  const passwordFieldStyle = {
    position: "relative",
    display: "flex",
    alignItems: "center",
  };

  const inputRightPadding = { paddingRight: "40px" }; // space for icon

  const eyeBtnStyle = {
    position: "absolute",
    right: 8,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  };

  return (
    <div className="change-password-container">
      <h2>Change Password</h2>

      <form onSubmit={handleSubmit} className="change-password-form" noValidate>
        {/* keep general error at top of form */}
        {errors.general && <div className="alert-box alert-error">{errors.general}</div>}

        {/* old_password */}
        <div className="input-group">
          <div style={passwordFieldStyle}>
            <input
              ref={oldRef}
              type={showPassword.old ? "text" : "password"}
              name="old_password"
              placeholder="Current Password"
              value={form.old_password}
              onChange={handleChange}
              onBlur={() => validateOnBlur("old_password")}
              onKeyDown={(e) => handleKeyDown(e, "old_password")}
              required
              className="change-password-input"
              style={inputRightPadding}
            />
            <button
              type="button"
              aria-label="toggle old password visibility"
              style={eyeBtnStyle}
              className="eye-btn"
              onClick={() => toggleShowPassword("old")}
            >
              {showPassword.old ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.old_password && <div className="alert-box alert-error">{errors.old_password}</div>}
        </div>

        {/* new_password */}
        <div className="input-group">
          <div style={passwordFieldStyle}>
            <input
              ref={newRef}
              type={showPassword.new ? "text" : "password"}
              name="new_password"
              placeholder="New Password"
              value={form.new_password}
              onChange={handleChange}
              onBlur={() => validateOnBlur("new_password")}
              onKeyDown={(e) => handleKeyDown(e, "new_password")}
              required
              className="change-password-input"
              style={inputRightPadding}
            />
            <button
              type="button"
              aria-label="toggle new password visibility"
              style={eyeBtnStyle}
              className="eye-btn"
              onClick={() => toggleShowPassword("new")}
            >
              {showPassword.new ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.new_password && <div className="alert-box alert-error">{errors.new_password}</div>}
        </div>

        {/* confirm_password */}
        <div className="input-group">
          <div style={passwordFieldStyle}>
            <input
              ref={confirmRef}
              type={showPassword.confirm ? "text" : "password"}
              name="confirm_password"
              placeholder="Confirm New Password"
              value={form.confirm_password}
              onChange={handleChange}
              onBlur={() => { validateOnBlur("confirm_password"); validateConfirmMatch(); }}
              onKeyDown={(e) => handleKeyDown(e, "confirm_password")}
              required
              className="change-password-input"
              style={inputRightPadding}
            />
            <button
              type="button"
              aria-label="toggle confirm password visibility"
              style={eyeBtnStyle}
              className="eye-btn"
              onClick={() => toggleShowPassword("confirm")}
            >
              {showPassword.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.confirm_password && <div className="alert-box alert-error">{errors.confirm_password}</div>}
        </div>

        {/* SUCCESS message placed above the submit button as requested */}
        {success && <div className="alert-box alert-success">{success}</div>}

        <button type="submit" className="change-password-button">
          Update Password
        </button>
      </form>

      <p className="back-to-profile">
        <button
          type="button"
          className="change-password-back-btn"
          onClick={() => navigate(redirectTo)}
        >
          Back to Profile
        </button>
      </p>
    </div>
  );
}
