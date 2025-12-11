import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./RegisterPage.css";

// =========================
// 🔹 Helper: Fetch message by code from cache
// =========================
const getMessageByCode = (code) => {
  if (!code) return "";
  try {
    const ue = JSON.parse(localStorage.getItem("user_error") || "[]");
    const ui = JSON.parse(localStorage.getItem("user_information") || "[]");
    const uv = JSON.parse(localStorage.getItem("user_validation") || "[]");

    const all = [...ue, ...ui, ...uv];

    const msg = all.find(
      (m) =>
        m.error_code?.toUpperCase() === code.toUpperCase() ||
        m.information_code?.toUpperCase() === code.toUpperCase() ||
        m.validation_code?.toUpperCase() === code.toUpperCase()
    );

    return (
      msg?.error_message ||
      msg?.information_text ||
      msg?.validation_message ||
      ""
    );
  } catch {
    return "";
  }
};

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    phone: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");

  // ===============================================
  // 🔹 Load DB → Cache messages only once
  // ===============================================
  useEffect(() => {
    const loadMessages = async () => {
      try {
        if (localStorage.getItem("user_error")) return;

        const res = await fetch("http://127.0.0.1:8000/api/auth/messages/");
        const data = await res.json();

        localStorage.setItem("user_error", JSON.stringify(data.user_error || []));
        localStorage.setItem("user_information", JSON.stringify(data.user_information || []));
        localStorage.setItem("user_validation", JSON.stringify(data.user_validation || []));
      } catch {
        console.warn("⚠️ Failed loading messages");
      }
    };
    loadMessages();
  }, []);

  // ===============================================
  // 🔹 Client side validation
  // ===============================================
  const clientValidate = (field, value) => {
    const val = value.trim();

    if (!val) return getMessageByCode("VA002"); // required

    if (["firstName", "lastName"].includes(field)) {
      if (!/^[A-Za-z\s]+$/.test(val)) return getMessageByCode("VA001");
      if (val.length > 50) return getMessageByCode("VA003");
    }

    if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))
      return getMessageByCode("VA005");

    if (field === "phone") {
      if (!/^[0-9]+$/.test(val)) return getMessageByCode("VA006");
      if (val.length !== 10) return getMessageByCode("VA007");
    }

    if (field === "password" && val.length < 6)
      return getMessageByCode("EA004");

    return "";
  };

  // ===============================================
  // 🔹 Run client + server validation together
  // ===============================================
  const validateField = async (name, value) => {
    const trimmed = value.trim();
    const baseErr = clientValidate(name, trimmed);

    if (baseErr) {
      setErrors((prev) => ({ ...prev, [name]: baseErr }));
      return baseErr;              // 👈 return error result
    }

    // Username availability
    if (name === "username") {
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/api/auth/check-username/?username=${encodeURIComponent(
            trimmed
          )}`
        );
        const json = await res.json();
        if (json.exists) {
          const msg = getMessageByCode("EP016");
          setErrors((prev) => ({ ...prev, username: msg }));
          return msg;              // 👈 return error result
        }
      } catch {
        console.warn("Username check failed");
      }
    }

    // Email availability
    if (name === "email") {
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/api/auth/check-email/?email=${encodeURIComponent(
            trimmed
          )}`
        );
        const json = await res.json();
        if (json.exists) {
          const msg = getMessageByCode("ES003");
          setErrors((prev) => ({ ...prev, email: msg }));
          return msg;              // 👈 return error result
        }
      } catch {
        console.warn("Email check failed");
      }
    }

    return ""; // no error
  };

  // ===============================================
  // 🔹 FIXED — Enter key validation (LATEST VALUE)
  // ===============================================
  const handleKeyDown = async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const { name, value } = e.target;

      // Validate field and get latest error result
      const err = await validateField(name, value);

      // ❌ If error exists → DO NOT MOVE
      if (err) return;

      // Move to next field ONLY if no error
      const form = e.target.form;
      const index = [...form].indexOf(e.target);
      if (form.elements[index + 1]) form.elements[index + 1].focus();
    }
  };

  // ===============================================
  // 🔹 Handle input change
  // ===============================================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // ===============================================
  // 🔹 Handle Blur → validate
  // ===============================================
  const handleBlur = async (e) => {
    await validateField(e.target.name, e.target.value);
  };

  // ===============================================
  // 🔹 Submit
  // ===============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess("");

    const newErr = {};
    for (const field in formData) {
      const msg = clientValidate(field, formData[field]);
      if (msg) newErr[field] = msg;
    }

    if (Object.keys(newErr).length) {
      setErrors(newErr);
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(getMessageByCode("IR001"));

        setFormData({
          firstName: "",
          lastName: "",
          username: "",
          email: "",
          phone: "",
          password: "",
        });
      } else {
        const backendErr = {};
        Object.keys(data).forEach((k) => {
          const v = Array.isArray(data[k]) ? data[k][0] : data[k];
          backendErr[k] = getMessageByCode(v) || v;
        });
        setErrors(backendErr);
      }
    } catch {
      setErrors({ general: getMessageByCode("EA004") });
    }
  };

  // ===============================================
  // 🔹 UI — Layout NOT changed
  // ===============================================
  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-card">
          <h2>Create Account</h2>
          <p className="subtitle">Join us by filling out the details below</p>

          <form onSubmit={handleSubmit}>
            <input
              name="firstName"
              placeholder="First Name"
              value={formData.firstName}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
            {errors.firstName && <p className="error">{errors.firstName}</p>}

            <input
              name="lastName"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
            {errors.lastName && <p className="error">{errors.lastName}</p>}

            <input
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
            {errors.username && <p className="error">{errors.username}</p>}

            <input
              name="email"
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
            {errors.email && <p className="error">{errors.email}</p>}

            <input
              name="phone"
              type="tel"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
            {errors.phone && <p className="error">{errors.phone}</p>}

            <input
              name="password"
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
            {errors.password && <p className="error">{errors.password}</p>}

            {errors.general && <p className="error">{errors.general}</p>}
            {success && <p className="success">{success}</p>}

            <button type="submit">Create Account</button>
          </form>

          <p className="redirect">
            Already have an account?{" "}
            <Link to="/login" className="login-link">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
