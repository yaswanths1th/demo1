import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./AddressPage.css";

export default function AddressPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [existingId, setExistingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const refs = useRef({});

  const [form, setForm] = useState({
    house_flat: "",
    street: "",
    landmark: "",
    area: "",
    district: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
  });

  const [tables, setTables] = useState({
    user_error: null,
    user_validation: null,
    user_information: null,
  });

  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");

  // Redirect if not logged in
  useEffect(() => {
    if (!token) navigate("/login");

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------
  // LOAD MESSAGE TABLES
  // -----------------------------
  useEffect(() => {
    const loadTables = async () => {
      try {
        const err = localStorage.getItem("user_error");
        const val = localStorage.getItem("user_validation");
        const info = localStorage.getItem("user_information");

        if (err && val && info) {
          setTables({
            user_error: JSON.parse(err),
            user_validation: JSON.parse(val),
            user_information: JSON.parse(info),
          });
          return;
        }

        const res = await fetch("http://127.0.0.1:8000/api/auth/messages/");
        const data = await res.json();

        localStorage.setItem("user_error", JSON.stringify(data.user_error));
        localStorage.setItem("user_validation", JSON.stringify(data.user_validation));
        localStorage.setItem("user_information", JSON.stringify(data.user_information));

        setTables({
          user_error: data.user_error,
          user_validation: data.user_validation,
          user_information: data.user_information,
        });
      } catch {
        console.error("Failed to load message tables");
      }
    };

    loadTables();
  }, []);

  // -----------------------------
  // LOOKUP HELPERS
  // -----------------------------
  const lookup = (table, code, codeKey, textKey) => {
    try {
      if (!table) return null;

      if (!Array.isArray(table)) return table[code] || null;

      const obj = table.find(
        (x) => (x[codeKey] || "").toUpperCase() === String(code).toUpperCase()
      );
      return obj ? obj[textKey] : null;
    } catch {
      return null;
    }
  };

  const getErrorText = (code) =>
    lookup(tables.user_error, code, "error_code", "error_message") ||
    `[MISSING: ${code}]`;

  const getInfoText = (code) =>
    lookup(tables.user_information, code, "information_code", "information_text") ||
    `[MISSING: ${code}]`;

  // -----------------------------
  // LOAD EXISTING ADDRESS
  // -----------------------------
  useEffect(() => {
    const loadAddress = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/addresses/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          const a = data[0];
          setExistingId(a.id);
          setForm({
            house_flat: a.house_flat || "",
            street: a.street || "",
            landmark: a.landmark || "",
            area: a.area || "",
            district: a.district || "",
            city: a.city || "",
            state: a.state || "",
            postal_code: a.postal_code || "",
            country: a.country || "",
          });
        }
      } catch {
        console.error("Load address failed");
      }
      setLoading(false);
    };

    loadAddress();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------
  // VALIDATION
  // -----------------------------
  const ALNUM_SPACE_HYPHEN = /^[A-Za-z0-9\s-]+$/;
  const ALNUM_ONLY = /^[A-Za-z0-9]+$/;

  const validateField = (name, value) => {
    let code = null;

    if (name === "landmark") {
      if (value && !ALNUM_SPACE_HYPHEN.test(value)) code = "EA003";
    } else if (name === "postal_code") {
      if (!value.trim()) code = "EA008";
      else if (!ALNUM_ONLY.test(value)) code = "EA005";
      else if (value.length < 4 || value.length > 10) code = "EA006";
    } else {
      if (!value.trim()) code = "EA004";
      else if (!ALNUM_SPACE_HYPHEN.test(value)) code = "EA003";
    }

    setErrors((prev) => ({
      ...prev,
      [name]: code ? getErrorText(code) : "",
    }));

    return !code;
  };

  // -----------------------------
  // ENTER → NEXT FIELD
  // -----------------------------
  const handleEnter = (e, name) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const ok = validateField(name, form[name]);
      if (!ok) return;

      const fields = [
        "house_flat",
        "street",
        "landmark",
        "area",
        "district",
        "city",
        "state",
        "country",
        "postal_code",
      ];

      const idx = fields.indexOf(name);
      const next = fields[idx + 1];

      if (next && refs.current[next]) refs.current[next].focus();
    }
  };

  // -----------------------------
  // PIN CODE AUTOFILL
  // -----------------------------
  const handlePostalCodeChange = async (e) => {
    const postal_code = e.target.value;
    setForm((prev) => ({ ...prev, postal_code }));

    validateField("postal_code", postal_code);

    if (postal_code.length < 6) return;

    try {
      const result = await fetch(
        `https://api.postalpincode.in/pincode/${postal_code}`
      );
      const data = await result.json();

      if (data[0]?.Status === "Success") {
        const info = data[0].PostOffice?.[0];
        if (info) {
          setForm((prev) => ({
            ...prev,
            district: info.District || prev.district,
            city: info.Block || info.Name || prev.city,
            state: info.State || prev.state,
            country: "India",
          }));
          return;
        }
      }

      setErrors((p) => ({ ...p, postal_code: getErrorText("EA007") }));
    } catch {
      setErrors((p) => ({ ...p, postal_code: getErrorText("EA013") }));
    }
  };

  // -----------------------------
  // SUBMIT
  // -----------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    let ok = true;
    Object.keys(form).forEach((f) => {
      if (!validateField(f, form[f])) ok = false;
    });

    if (!ok) return;

    const url = existingId
      ? `http://127.0.0.1:8000/api/addresses/${existingId}/`
      : "http://127.0.0.1:8000/api/addresses/";

    try {
      const res = await fetch(url, {
        method: existingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setSuccessMsg(existingId ? getInfoText("IA002") : getInfoText("IA001"));
        setTimeout(() => navigate("/profile", { replace: true }), 1200);
        return;
      }

      const backend = await res.json();
      const newErr = {};

      Object.keys(backend).forEach((k) => {
        newErr[k] = String(backend[k]);
      });

      setErrors(newErr);
    } catch {
      setErrors({ general: getErrorText("EA012") });
    }
  };

  // -----------------------------
  // UI
  // -----------------------------
  if (loading) return <p className="loading">Loading...</p>;

  return (
    <div className="address-page">
      <div className="address-container">
        <h2 className="address-title">
          {existingId ? getInfoText("IA004") : getInfoText("IA005")}
        </h2>

        <div className="address-card">
          <form onSubmit={handleSubmit} className="address-form">
            {[
              { label: "Flat / House No", name: "house_flat" },
              { label: "Street", name: "street" },
              { label: "Landmark", name: "landmark" },
              { label: "Area", name: "area" },
              { label: "District", name: "district" },
              { label: "City / Town", name: "city" },
              { label: "State", name: "state" },
              { label: "Country", name: "country" },
              { label: "Pincode", name: "postal_code" },
            ].map((f) => (
              <div key={f.name} className="address-form-group">
                <label>{f.label}</label>
                <input
                  ref={(el) => (refs.current[f.name] = el)}
                  type="text"
                  value={form[f.name]}
                  onChange={
                    f.name === "postal_code"
                      ? handlePostalCodeChange
                      : (e) =>
                          setForm((prev) => ({
                            ...prev,
                            [f.name]: e.target.value,
                          }))
                  }
                  onBlur={(e) => validateField(f.name, e.target.value)}
                  onKeyDown={(e) => handleEnter(e, f.name)}
                />

                {errors[f.name] && (
                  <div className="alert-box alert-error">{errors[f.name]}</div>
                )}
              </div>
            ))}

            {errors.general && (
              <div className="alert-box alert-error">{errors.general}</div>
            )}

            {successMsg && (
              <div className="alert-box alert-success">{successMsg}</div>
            )}

            <button type="submit" className="address-button">
  {existingId ? "Update Address" : "Add Address"}
</button>

          </form>
        </div>
      </div>
    </div>
  );
}
