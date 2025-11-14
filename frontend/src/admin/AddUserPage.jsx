// frontend/src/pages/AddUserPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AddUserPage.css";

/**
 * Merged AddUserPage
 * - Project B layout kept
 * - Project A validation + cached messages + postal lookup + live uniqueness checks
 *
 * Endpoints expected:
 *  POST /api/auth/admin/users/           (create user)
 *  POST /api/addresses/                  (create address)
 *  GET  /api/auth/departments/
 *  GET  /api/auth/roles/
 *  GET  /api/auth/check-username/?username=...
 *  GET  /api/auth/check-email/?email=...
 *  GET  /api/auth/messages/              (full tables)   [optional: cached]
 *  GET  /api/auth/messages/error/{code}/ (single-code fallback)
 *  GET  /api/auth/messages/validation/{code}/
 *  GET  /api/auth/messages/information/{code}/
 */

function AddUserPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [user, setUser] = useState({
    username: "",
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    department: "",
    role: "",
    is_active: true,
    password: "",
  });

  const [address, setAddress] = useState({
    house_flat: "",
    street: "",
    area: "",
    postal_code: "",
    city: "",
    district: "",
    state: "",
    country: "India",
  });

  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [filteredRoles, setFilteredRoles] = useState([]);

  const [tables, setTables] = useState({
    user_error: [],
    user_validation: [],
    user_information: [],
  });

  const [errors, setErrors] = useState({}); // field => message
  const [saving, setSaving] = useState(false);
  const [loadingPinLookup, setLoadingPinLookup] = useState(false);

  // Regexes
  const NAME_RE = /^[A-Za-z\s]+$/;
  const USERNAME_RE = /^[A-Za-z0-9._]+$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_RE = /^[0-9]{10}$/;
  const ALNUM_SPACE_HYPHEN = /^[A-Za-z0-9\s-]+$/;
  const ALNUM_ONLY = /^[A-Za-z0-9]+$/;

  // ---------------------------
  // Cache helpers (read localStorage first).
  // If missing, we attempt single-code fetch as fallback.
  // ---------------------------
  const fetchBackendMessageSingle = async (code, type) => {
    if (!code || !type) return "";
    try {
      const cached = localStorage.getItem(`${type}_${code}`);
      if (cached) return cached;
      // fallback single-code API
      const url = `http://127.0.0.1:8000/api/auth/messages/${type}/${code}/`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const message = data?.message || data?.validation_message || data?.information_text || "";
        if (message) localStorage.setItem(`${type}_${code}`, message);
        return message;
      }
    } catch {
      // silent
    }
    return "";
  };

  const getErrorText = async (code) => {
    if (!code) return "";
    const list = Array.isArray(tables.user_error) ? tables.user_error : [];
    const found = list.find((x) => (x?.error_code || "").toUpperCase() === (code || "").toUpperCase());
    if (found?.error_message) return found.error_message;
    return await fetchBackendMessageSingle(code, "error");
  };

  const getValidationText = async (code) => {
    if (!code) return "";
    const list = Array.isArray(tables.user_validation) ? tables.user_validation : [];
    const found = list.find((x) => (x?.validation_code || "").toUpperCase() === (code || "").toUpperCase());
    if (found?.validation_message) return found.validation_message;
    return await fetchBackendMessageSingle(code, "validation");
  };

  const getInfoText = async (code) => {
    if (!code) return "";
    const list = Array.isArray(tables.user_information) ? tables.user_information : [];
    const found = list.find((x) => (x?.information_code || "").toUpperCase() === (code || "").toUpperCase());
    if (found?.information_text) return found.information_text;
    return await fetchBackendMessageSingle(code, "information");
  };

  // ---------------------------
  // Load message tables from localStorage only first; if empty try full fetch (best-effort)
  // ---------------------------
  useEffect(() => {
    const loadTables = async () => {
      try {
        const e = JSON.parse(localStorage.getItem("user_error") || "[]");
        const v = JSON.parse(localStorage.getItem("user_validation") || "[]");
        const i = JSON.parse(localStorage.getItem("user_information") || "[]");

        if ((Array.isArray(e) && e.length) || (Array.isArray(v) && v.length) || (Array.isArray(i) && i.length)) {
          setTables({
            user_error: Array.isArray(e) ? e : [],
            user_validation: Array.isArray(v) ? v : [],
            user_information: Array.isArray(i) ? i : [],
          });
          return;
        }

        // Best-effort fetch to populate cache for first-time installs
        const res = await fetch("http://127.0.0.1:8000/api/auth/messages/");
        if (res.ok) {
          const data = await res.json();
          const ue = Array.isArray(data.user_error) ? data.user_error : [];
          const uv = Array.isArray(data.user_validation) ? data.user_validation : [];
          const ui = Array.isArray(data.user_information) ? data.user_information : [];
          setTables({ user_error: ue, user_validation: uv, user_information: ui });
          localStorage.setItem("user_error", JSON.stringify(ue));
          localStorage.setItem("user_validation", JSON.stringify(uv));
          localStorage.setItem("user_information", JSON.stringify(ui));
        } else {
          setTables({ user_error: [], user_validation: [], user_information: [] });
        }
      } catch {
        setTables({ user_error: [], user_validation: [], user_information: [] });
      }
    };
    loadTables();
  }, []);

  // ---------------------------
  // Load dropdowns
  // ---------------------------
  useEffect(() => {
    const load = async () => {
      try {
        const d = await axios.get("http://127.0.0.1:8000/api/auth/departments/");
        const r = await axios.get("http://127.0.0.1:8000/api/auth/roles/");
        setDepartments(Array.isArray(d.data) ? d.data : []);
        setRoles(Array.isArray(r.data) ? r.data : []);
      } catch {
        // ignore - optional
      }
    };
    load();
  }, []);

  // filter roles when department changes
  useEffect(() => {
    if (user.department) {
      const r = roles.filter((x) => Number(x.department) === Number(user.department));
      setFilteredRoles(r);
    } else setFilteredRoles([]);
  }, [user.department, roles]);

  // ---------------------------
  // Client-side validation helpers (use cached messages)
  // ---------------------------
  const validatePersonalField = async (name, val) => {
    let msg = "";
    const v = String(val || "").trim();

    if (!v) msg = await getValidationText("VA002");
    else if ((name === "first_name" || name === "last_name") && v.length > 50) {
  msg = await getValidationText("VP003"); // Name cannot exceed 50 chars
}
else if ((name === "first_name" || name === "last_name") && !NAME_RE.test(v)) {
  msg = await getErrorText("EP001"); // Invalid characters
}
    else if (name === "username" && !USERNAME_RE.test(v)) msg = await getErrorText("EA003");
    else if (name === "email" && !EMAIL_RE.test(v)) msg = await getErrorText("EP013");
    else if (name === "phone" && !PHONE_RE.test(v)) msg = await getValidationText("VP009");

    setErrors((p) => ({ ...p, [name]: msg }));
    return !msg;
  };

  const validateAddressField = async (name, val) => {
    let msg = "";
    const v = String(val || "");
    if (name === "landmark") {
      if (v && !ALNUM_SPACE_HYPHEN.test(v)) msg = await getErrorText("EA003");
    } else if (name === "postal_code") {
      if (!v.trim()) msg = await getErrorText("EA008");
      else if (!ALNUM_ONLY.test(v)) msg = await getErrorText("EA005");
      else if (v.length < 4 || v.length > 10) msg = await getErrorText("EA006");
    } else {
      if (!v.trim()) msg = await getErrorText("EA004");
      else if (!ALNUM_SPACE_HYPHEN.test(v)) msg = await getErrorText("EA003");
    }
    setErrors((p) => ({ ...p, [name]: msg }));
    return !msg;
  };

  const validateAll = async () => {
    const personalFields = ["username", "first_name", "last_name", "phone", "email", "password"];
    const addrFields = ["house_flat", "street", "area", "postal_code", "city", "district", "state", "country"];

    const personalChecks = await Promise.all(personalFields.map((f) => validatePersonalField(f, user[f])));
    const addrChecks = await Promise.all(addrFields.map((f) => validateAddressField(f, address[f])));

    return [...personalChecks, ...addrChecks].every(Boolean);
  };

  // ---------------------------
  // Postal lookup (India -> fallback zippopotam)
  // ---------------------------
  const lookupPostalCode = async (postal) => {
    setLoadingPinLookup(true);
    try {
      if (!postal || String(postal).length < 4) {
        const m = await getErrorText("EA006");
        setErrors((p) => ({ ...p, postal_code: m }));
        setLoadingPinLookup(false);
        return;
      }

      // India first
      try {
        const r = await fetch(`https://api.postalpincode.in/pincode/${postal}`);
        const d = await r.json();
        if (Array.isArray(d) && d[0]?.Status === "Success") {
          const p = d[0].PostOffice?.[0];
          if (p) {
            setAddress((prev) => ({ ...prev, city: p.Block || p.Name, district: p.District, state: p.State, country: "India" }));
            setErrors((p) => ({ ...p, postal_code: "" }));
            setLoadingPinLookup(false);
            return;
          }
        }
      } catch {
        // fallthrough
      }

      // fallback
      const r2 = await fetch(`https://api.zippopotam.us/us/${postal}`);
      if (!r2.ok) {
        const m = await getErrorText("EA007");
        setErrors((p) => ({ ...p, postal_code: m }));
        setLoadingPinLookup(false);
        return;
      }
      const dd = await r2.json();
      const place = dd.places?.[0];
      if (place) {
        setAddress((prev) => ({ ...prev, city: place["place name"], state: place["state"], country: dd["country"] }));
        setErrors((p) => ({ ...p, postal_code: "" }));
      } else {
        const m = await getErrorText("EA006");
        setErrors((p) => ({ ...p, postal_code: m }));
      }
    } catch {
      const m = await getErrorText("EA007");
      setErrors((p) => ({ ...p, postal_code: m }));
    } finally {
      setLoadingPinLookup(false);
    }
  };

  // ---------------------------
  // Live uniqueness checks (on blur / Enter)
  // - Uses check endpoints when available
  // - If endpoint fails, we silently ignore (final mapping happens at save)
  // ---------------------------
  const checkUsernameUnique = async (usernameVal) => {
    if (!usernameVal || !USERNAME_RE.test(usernameVal)) return;
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/auth/check-username/", {
        params: { username: usernameVal },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const exists = Boolean(res.data?.exists);
      if (exists) {
        const msg = (await getErrorText("EP016")) || "";
        setErrors((p) => ({ ...p, username: msg }));
      } else {
        setErrors((p) => ({ ...p, username: "" }));
      }
    } catch {
      // ignore - final check on save will handle
    }
  };

  const checkEmailUnique = async (emailVal) => {
    if (!emailVal || !EMAIL_RE.test(emailVal)) return;
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/auth/check-email/", {
        params: { email: emailVal },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const exists = Boolean(res.data?.exists);
      if (exists) {
        const msg = (await getErrorText("ES003")) || "";
        setErrors((p) => ({ ...p, email: msg }));
      } else {
        setErrors((p) => ({ ...p, email: "" }));
      }
    } catch {
      // ignore
    }
  };

  // ---------------------------
  // Input handlers
  // ---------------------------
  const handleChangeUser = async (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
    // live client validation
    await validatePersonalField(name, value);
  };

  const handleChangeAddress = async (e) => {
    const { name, value } = e.target;
    setAddress((prev) => ({ ...prev, [name]: value }));
    await validateAddressField(name, value);
    if (name === "postal_code" && value && value.length >= 4) lookupPostalCode(value);
  };

  const handleKeyDownOnField = (e, fieldName) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // run validation + uniqueness check
      if (fieldName === "username") {
        validatePersonalField("username", user.username || "").then(() => checkUsernameUnique(user.username || ""));
      } else if (fieldName === "email") {
        validatePersonalField("email", user.email || "").then(() => checkEmailUnique(user.email || ""));
      } else {
        validatePersonalField(fieldName, user[fieldName] || "");
      }
    }
  };

  const handleBlurField = async (e) => {
    const { name, value } = e.target;
    await validatePersonalField(name, value);
    if (name === "username") await checkUsernameUnique(value);
    if (name === "email") await checkEmailUnique(value);
    if (name === "postal_code" && value && value.length >= 4) await lookupPostalCode(value);
  };

  // ---------------------------
  // show toast helper (DOM)
  // ---------------------------
  const showToast = (message, type = "success") => {
    const t = document.createElement("div");
    t.className = `toast-message ${type}`;
    t.innerText = message || "";
    document.body.appendChild(t);
    setTimeout(() => (t.style.opacity = "0"), 1800);
    setTimeout(() => t.remove(), 2400);
  };

  // ---------------------------
  // Save handler
  // ---------------------------
  const handleSave = async () => {
    setSaving(true);
    setErrors({});
    // client-side validation first
    const ok = await validateAll();
    if (!ok) {
      const eg002 = (await getErrorText("EG002")) || "";
      setErrors((p) => ({ ...p, general: eg002 || "Please check details." }));
      setSaving(false);
      return;
    }

    try {
      // create user
      const res = await axios.post(
        "http://127.0.0.1:8000/api/auth/admin/users/",
        { ...user, department: user.department ? Number(user.department) : null, role: user.role ? Number(user.role) : null },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      const created = res.data;
      const userId = created?.id || created?.user || null;

      // save address if some address values present
      const hasAddress = Object.values(address).some((v) => v && String(v).trim());
      if (hasAddress && userId) {
        await axios.post(
          "http://127.0.0.1:8000/api/addresses/",
          { ...address, user: userId },
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
      }

      // success message from DB messages IR001 or fallback from response
      const infoMsg = (await getInfoText("IR001")) || res.data?.message || "";
      if (infoMsg) showToast(infoMsg, "success");
      // redirect after 1.2s so user sees toast
      setTimeout(() => navigate("/admin/users"), 1200);
    } catch (err) {
      // Map backend errors to field messages using cached codes when possible
      const resp = err.response?.data;
      const newErrs = {};

      if (resp && typeof resp === "object") {
        for (const key of Object.keys(resp)) {
          const raw = Array.isArray(resp[key]) ? String(resp[key][0]) : String(resp[key]);
          const trimmed = raw.trim();

          // Duplicate username -> EP016
          if (key === "username") {
            newErrs.username = (await getErrorText("EP016")) || trimmed;
            continue;
          }

          // Duplicate email -> ES003
          if (key === "email") {
            newErrs.email = (await getErrorText("ES003")) || trimmed;
            continue;
          }

          // If raw equals a known code in cache, map it
          const codeItem = (tables.user_error || []).find((it) => String(it?.error_code || "").toUpperCase() === trimmed.toUpperCase());
          if (codeItem) {
            newErrs[key] = codeItem.error_message || trimmed;
            continue;
          }

          // fallback to raw text
          newErrs[key] = trimmed;
        }

        // if no field errors but top-level detail is present
        if (!Object.keys(newErrs).length && typeof resp.detail === "string") {
          const det = String(resp.detail).trim();
          const codeItem = (tables.user_error || []).find((it) => String(it?.error_code || "").toUpperCase() === det.toUpperCase());
          newErrs.general = codeItem ? codeItem.error_message : det;
        }
      } else if (typeof resp === "string") {
        const det = resp.trim();
        const codeItem = (tables.user_error || []).find((it) => String(it?.error_code || "").toUpperCase() === det.toUpperCase());
        newErrs.general = codeItem ? codeItem.error_message : det;
      } else {
        newErrs.general = (await getErrorText("EA010")) || "Failed to create user";
      }

      setErrors(newErrs);
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------
  // UI
  // ---------------------------
  return (
    <div className="add-user-page">
      <div className="add-user-header">
        <h2>Add New User</h2>
      </div>

      {/* ACCOUNT INFO */}
      <div className="add-user-card">
        <h3>Account Information</h3>

        <div className="grid-2">
          {/* Username */}
          <div className="add-user-group">
            <label>Username *</label>
            <input
              type="text"
              name="username"
              value={user.username}
              onChange={handleChangeUser}
              onBlur={handleBlurField}
              onKeyDown={(e) => handleKeyDownOnField(e, "username")}
              className={errors.username ? "input-error" : ""}
            />
            {errors.username && <small className="error-text">{errors.username}</small>}
          </div>

          {/* Email */}
          <div className="add-user-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              value={user.email}
              onChange={handleChangeUser}
              onBlur={handleBlurField}
              onKeyDown={(e) => handleKeyDownOnField(e, "email")}
              className={errors.email ? "input-error" : ""}
            />
            {errors.email && <small className="error-text">{errors.email}</small>}
          </div>

          {/* Password + Generate */}
          <div className="add-user-group">
            <label>Password *</label>
            <div className="password-row">
              <input
                type="text"
                name="password"
                value={user.password}
                onChange={handleChangeUser}
                className={errors.password ? "input-error" : ""}
              />
              <button
                type="button"
                className="pass-btn"
                onClick={() => setUser((prev) => ({ ...prev, password: Math.random().toString(36).slice(-8) }))}
              >
                Generate
              </button>
            </div>
            {errors.password && <small className="error-text">{errors.password}</small>}
          </div>

          {/* Status */}
          <div className="add-user-group">
            <label>Status *</label>
            <select
              name="is_active"
              value={user.is_active}
              onChange={(e) => setUser({ ...user, is_active: e.target.value === "true" })}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          {/* Department */}
          <div className="add-user-group">
            <label>Department *</label>
            <select name="department" value={user.department} onChange={(e) => { setUser((p) => ({ ...p, department: e.target.value })); setErrors((p)=>({...p, department: ""})); }}>
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.department_name}
                </option>
              ))}
            </select>
            {errors.department && <small className="error-text">{errors.department}</small>}
          </div>

          {/* Role */}
          <div className="add-user-group">
            <label>Role *</label>
            <select
              name="role"
              value={user.role}
              onChange={(e) => setUser({ ...user, role: e.target.value })}
              disabled={!filteredRoles.length}
              className={errors.role ? "input-error" : ""}
            >
              <option value="">Select Role</option>
              {filteredRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.role_name}
                </option>
              ))}
            </select>
            {errors.role && <small className="error-text">{errors.role}</small>}
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <div className="add-user-card">
        <h3>Personal Details</h3>
        <div className="grid-2">
          <div className="add-user-group">
            <label>First Name</label>
            <input name="first_name" value={user.first_name} onChange={handleChangeUser} onBlur={handleBlurField} onKeyDown={(e)=>handleKeyDownOnField(e,"first_name")} />
            {errors.first_name && <small className="error-text">{errors.first_name}</small>}
          </div>

          <div className="add-user-group">
            <label>Last Name</label>
            <input name="last_name" value={user.last_name} onChange={handleChangeUser} onBlur={handleBlurField} onKeyDown={(e)=>handleKeyDownOnField(e,"last_name")} />
            {errors.last_name && <small className="error-text">{errors.last_name}</small>}
          </div>

          <div className="add-user-group">
            <label>Phone</label>
            <input name="phone" value={user.phone} onChange={handleChangeUser} onBlur={handleBlurField} onKeyDown={(e)=>handleKeyDownOnField(e,"phone")} />
            {errors.phone && <small className="error-text">{errors.phone}</small>}
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="add-user-card">
        <h3>Address</h3>
        <div className="grid-2">
          <div className="add-user-group">
            <label>House/Flat No</label>
            <input name="house_flat" value={address.house_flat} onChange={handleChangeAddress} onBlur={handleBlurField} onKeyDown={(e)=>handleKeyDownOnField(e,"house_flat")} />
            {errors.house_flat && <small className="error-text">{errors.house_flat}</small>}
          </div>

          <div className="add-user-group">
            <label>Street</label>
            <input name="street" value={address.street} onChange={handleChangeAddress} onBlur={handleBlurField} />
            {errors.street && <small className="error-text">{errors.street}</small>}
          </div>

          <div className="add-user-group">
            <label>Area</label>
            <input name="area" value={address.area} onChange={handleChangeAddress} onBlur={handleBlurField} />
            {errors.area && <small className="error-text">{errors.area}</small>}
          </div>

          <div className="add-user-group">
            <label>Pincode {loadingPinLookup && "(Fetching…)"}</label>
            <input name="postal_code" value={address.postal_code} onChange={handleChangeAddress} onBlur={handleBlurField} />
            {errors.postal_code && <small className="error-text">{errors.postal_code}</small>}
          </div>

          <div className="add-user-group">
            <label>City</label>
            <input value={address.city} readOnly />
          </div>

          <div className="add-user-group">
            <label>District</label>
            <input value={address.district} readOnly />
          </div>

          <div className="add-user-group">
            <label>State</label>
            <input value={address.state} readOnly />
          </div>

          <div className="add-user-group">
            <label>Country</label>
            <input value={address.country} readOnly />
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="action-buttons">
        <button className="save-btn" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save User"}
        </button>
        <button className="cancel-btn" onClick={() => navigate("/admin/users")}>
          Cancel
        </button>
      </div>

      {/* Bottom general error */}
      {errors.general && <div style={{ marginTop: 12 }} className="alert-box alert-error">{errors.general}</div>}
    </div>
  );
}

export default AddUserPage;
