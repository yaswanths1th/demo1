// frontend/src/pages/EditUserPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./EditUserPage.css";

/**
 * EditUserPage
 * - Project B UI + Project A validations & cached message system (cache-only)
 *
 * Behavior:
 * - Inline errors & bottom errors are taken from cached messages in localStorage:
 *     user_error, user_validation, user_information
 * - Uniqueness endpoints (used on blur / Enter AND before save):
 *     GET /api/auth/check-username/?username=...
 *     GET /api/auth/check-email/?email=...
 *   Should return { exists: true } (or similar truthy)
 *
 * - If username/email exists (either via immediate checks or backend save),
 *   show inline EP016/ES003 and bottom EG002. Do NOT redirect.
 *
 * - On success, show IA004 / IA001 as bottom success message, stay 2s, then redirect.
 *
 * Notes:
 * - This file intentionally avoids hardcoded user-facing strings. It reads messages
 *   from the cache in localStorage. Make sure your app has stored those message tables.
 */

function EditUserPage() {
  const [user, setUser] = useState({});
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [filteredRoles, setFilteredRoles] = useState([]);

  const [address, setAddress] = useState({
    id: null,
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

  const [loadingPinLookup, setLoadingPinLookup] = useState(false);

  // cache-only message tables (read from localStorage)
  const [tables, setTables] = useState({
    user_error: [],
    user_validation: [],
    user_information: [],
  });

  // per-field errors and global bottom messages
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("access");
  const navigate = useNavigate();
  const { id } = useParams();

  // -------------------------
  // Regex validation rules
  // -------------------------
  const NAME_RE = /^[A-Za-z\s]+$/;
  const USERNAME_RE = /^[A-Za-z0-9_]+$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_RE = /^[0-9]{10}$/;
  const ALNUM_SPACE_HYPHEN = /^[A-Za-z0-9\s-]+$/;
  const ALNUM_ONLY = /^[A-Za-z0-9]+$/;

  // -------------------------
  // Cache-only getters (NO network calls)
  // -------------------------
  const getErrorText = async (code) => {
    if (!code) return "";
    const list = Array.isArray(tables.user_error) ? tables.user_error : [];
    const it = list.find(
      (x) =>
        x &&
        String(x.error_code || "").toUpperCase() === String(code || "").toUpperCase()
    );
    return it?.error_message || "";
  };

  const getValidationText = async (code) => {
    if (!code) return "";
    const list = Array.isArray(tables.user_validation) ? tables.user_validation : [];
    const it = list.find(
      (x) =>
        x &&
        String(x.validation_code || "").toUpperCase() === String(code || "").toUpperCase()
    );
    return it?.validation_message || "";
  };

  const getInfoText = async (code) => {
    if (!code) return "";
    const list = Array.isArray(tables.user_information) ? tables.user_information : [];
    const it = list.find(
      (x) =>
        x &&
        String(x.information_code || "").toUpperCase() === String(code || "").toUpperCase()
    );
    return it?.information_text || "";
  };

  // -------------------------
  // Load message tables from localStorage only (cache-only)
  // -------------------------
  useEffect(() => {
    try {
      const e = JSON.parse(localStorage.getItem("user_error") || "[]");
      const v = JSON.parse(localStorage.getItem("user_validation") || "[]");
      const i = JSON.parse(localStorage.getItem("user_information") || "[]");
      setTables({
        user_error: Array.isArray(e) ? e : [],
        user_validation: Array.isArray(v) ? v : [],
        user_information: Array.isArray(i) ? i : [],
      });
    } catch {
      setTables({ user_error: [], user_validation: [], user_information: [] });
    }
  }, []);

  // -------------------------
  // Load user, address, departments, roles (Project B behavior)
  // -------------------------
  const loadUserData = useCallback(async () => {
    try {
      const res = await axios.get(`http://127.0.0.1:8000/api/auth/admin/users/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser({
  ...res.data,
  username_original: res.data.username,
  email_original: res.data.email,
});


      const addrRes = await axios.get(`http://127.0.0.1:8000/api/addresses/?user=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const a = Array.isArray(addrRes.data) && addrRes.data.length ? addrRes.data[0] : addrRes.data;
      if (a && typeof a === "object") {
        setAddress({
          id: a.id || null,
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
      // set bottom general error if cached message exists
      (async () => {
        const msg = (await getErrorText("EA010")) || (await getErrorText("EA011")) || "";
        setErrors((p) => ({ ...p, general: msg }));
      })();
    }
  }, [id, token]); //[id, token, getErrorText]);

  const loadDropdowns = useCallback(async () => {
    try {
      const deptRes = await axios.get("http://127.0.0.1:8000/api/auth/departments/");
      setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
      const rolesRes = await axios.get("http://127.0.0.1:8000/api/auth/roles/");
      setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []);
    } catch {
      // ignore; optional
      (async () => {
        const msg = await getErrorText("EA012");
        if (msg) setErrors((p) => ({ ...p, general: msg }));
      })();
    }
  }, []);

  useEffect(() => {
    if (!token) return navigate("/login");
    loadDropdowns();
    loadUserData();
  }, [loadDropdowns, loadUserData, navigate, token]);

  // -------------------------
  // Filter roles by department
  // -------------------------
  useEffect(() => {
    if (user.department) {
      const available = roles.filter((r) => Number(r.department) === Number(user.department));
      setFilteredRoles(available);
    } else {
      setFilteredRoles([]);
    }
  }, [roles, user.department]);

  // -------------------------
  // Validation helpers (use cached validation messages)
  // -------------------------
  const validatePersonalField = async (name, value) => {
    let msg = "";
    const v = String(value || "").trim();

    if (!v) msg = await getValidationText("VA002");
    else if ((name === "first_name" || name === "last_name") && !NAME_RE.test(v))
      msg = await getValidationText("VA001");
    else if (name === "username" && !USERNAME_RE.test(v)) msg = await getValidationText("VA003");
    else if (name === "email" && !EMAIL_RE.test(v)) msg = await getValidationText("VA005");
    else if (name === "phone" && !PHONE_RE.test(v)) msg = await getErrorText("EA009");

    setErrors((p) => ({ ...p, [name]: msg }));
    return !msg;
  };

  const validateAddressField = async (name, value) => {
    let msg = "";
    const v = String(value || "");

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
    const personal = ["username", "first_name", "last_name", "phone", "email"];
    const addr = ["house_flat", "street", "area", "district", "city", "state", "postal_code", "country"];

    const okPersonal = await Promise.all(personal.map((f) => validatePersonalField(f, user[f] || "")));
    const okAddress = await Promise.all(addr.map((f) => validateAddressField(f, address[f] || "")));
    return [...okPersonal, ...okAddress].every(Boolean);
  };

  // -------------------------
  // POSTAL LOOKUP
  // -------------------------
  const lookupPostal = async (pin) => {
    setLoadingPinLookup(true);
    try {
      if (!pin || String(pin).length < 4) {
        const m = await getErrorText("EA006");
        setErrors((p) => ({ ...p, postal_code: m }));
        setLoadingPinLookup(false);
        return;
      }

      // India first
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (Array.isArray(data) && data[0]?.Status === "Success") {
          const p = data[0].PostOffice?.[0];
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

      // fallback zippopotam
      const res2 = await fetch(`https://api.zippopotam.us/us/${pin}`);
      if (!res2.ok) {
        const m = await getErrorText("EA007");
        setErrors((p) => ({ ...p, postal_code: m }));
        setLoadingPinLookup(false);
        return;
      }
      const dat = await res2.json();
      const place = dat.places?.[0];
      if (place) {
        setAddress((prev) => ({ ...prev, city: place["place name"] || prev.city, state: place["state"] || prev.state, country: dat["country"] || prev.country }));
        setErrors((p) => ({ ...p, postal_code: "" }));
      }
    } catch {
      const m = await getErrorText("EA007");
      setErrors((p) => ({ ...p, postal_code: m }));
    } finally {
      setLoadingPinLookup(false);
    }
  };

  // -------------------------
  // Immediate uniqueness checks (backend endpoints)
  // - Called onBlur and when Enter is pressed inside username/email inputs.
  // - They return a boolean: true = exists, false = available.
  // -------------------------
  const checkUsernameUnique = async (usernameVal) => {
  // If unchanged from original → NOT duplicate
  if (usernameVal === user.username_original) {
    setErrors((p) => ({ ...p, username: "" }));
    return false;
  }

  if (!usernameVal || !USERNAME_RE.test(usernameVal)) {
    return false;
  }

  try {
    const res = await axios.get("http://127.0.0.1:8000/api/auth/check-username/", {
      params: { username: usernameVal },
      headers: { Authorization: `Bearer ${token}` },
    });
    const exists = Boolean(res.data?.exists);

    if (exists) {
      const msg = (await getErrorText("EP016")) || "";
      setErrors((p) => ({ ...p, username: msg }));
      return true; // duplicate
    } else {
      setErrors((p) => ({ ...p, username: "" }));
      return false;
    }
  } catch {
    return false;
  }
};


  const checkEmailUnique = async (emailVal) => {
  // If unchanged from original → NOT duplicate
  if (emailVal === user.email_original) {
    setErrors((p) => ({ ...p, email: "" }));
    return false;
  }

  if (!emailVal || !EMAIL_RE.test(emailVal)) {
    return false;
  }

  try {
    const res = await axios.get("http://127.0.0.1:8000/api/auth/check-email/", {
      params: { email: emailVal },
      headers: { Authorization: `Bearer ${token}` },
    });
    const exists = Boolean(res.data?.exists);

    if (exists) {
      const msg = (await getErrorText("ES003")) || "";
      setErrors((p) => ({ ...p, email: msg }));
      return true;
    } else {
      setErrors((p) => ({ ...p, email: "" }));
      return false;
    }
  } catch {
    return false;
  }
};


  // -------------------------
  // Handlers
  // -------------------------
  const handleDepartmentChange = (e) => {
    const deptId = e.target.value ? Number(e.target.value) : "";
    setUser((prev) => ({ ...prev, department: deptId, role: "" }));
    const available = roles.filter((r) => Number(r.department) === deptId);
    setFilteredRoles(available);
  };

  const handleChangeUser = async (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
    // run client validation live
    await validatePersonalField(name, value);
  };

  const handleKeyDownOnField = (e, fieldName) => {
    // If user presses Enter in username/email field, run validation + uniqueness check
    if (e.key === "Enter") {
      e.preventDefault();
      if (fieldName === "username") {
        validatePersonalField("username", user.username || "").then(() => checkUsernameUnique(user.username || ""));
      } else if (fieldName === "email") {
        validatePersonalField("email", user.email || "").then(() => checkEmailUnique(user.email || ""));
      } else {
        // for other fields run validation
        validatePersonalField(fieldName, user[fieldName] || "");
      }
    }
  };

  const handleBlurField = async (e) => {
    const { name, value } = e.target;
    await validatePersonalField(name, value);
    if (name === "username") await checkUsernameUnique(value);
    if (name === "email") await checkEmailUnique(value);
    if (name === "postal_code" && value && value.length >= 4) await lookupPostal(value);
  };

  const handleChangeAddress = async (e) => {
    const { name, value } = e.target;
    setAddress((prev) => ({ ...prev, [name]: value }));
    await validateAddressField(name, value);
    if (name === "postal_code" && value && value.length >= 4) lookupPostal(value);
  };

  // -------------------------
  // Save flow (client-first then backend)
  // -------------------------
  const handleSave = async () => {
    setSaving(true);
    setErrors({});
    setSuccessMsg("");

    // client-side validation
    const ok = await validateAll();
    if (!ok) {
      // EG002 message from cache (Please check details again)
      const eg002 = (await getErrorText("EG002")) || "";
      setErrors((p) => ({ ...p, general: eg002 }));
      setSaving(false);
      return;
    }

    // Ensure uniqueness check is fresh before save (use endpoints)
    const [usernameExists, emailExists] = await Promise.all([
      checkUsernameUnique(user.username || ""),
      checkEmailUnique(user.email || ""),
    ]);

    if (usernameExists || emailExists) {
      const eg002 = (await getErrorText("EG002")) || "";
      setErrors((p) => ({ ...p, general: eg002 }));
      setSaving(false);
      return;
    }

    try {
      // PUT user
      await axios.put(
        `http://127.0.0.1:8000/api/auth/admin/users/${id}/`,
        {
          ...user,
          department: user.department ? Number(user.department) : null,
          role: user.role ? Number(user.role) : null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Save address
      const addrUrl = address.id ? `http://127.0.0.1:8000/api/addresses/${address.id}/` : "http://127.0.0.1:8000/api/addresses/";
      await axios({
        method: address.id ? "put" : "post",
        url: addrUrl,
        data: { ...address, user: id },
        headers: { Authorization: `Bearer ${token}` },
      });

      // success message (IA004 update, IA001 created)
      const infoCode = address.id ? "IA004" : "IA001";
      const infoMsg = (await getInfoText(infoCode)) || "";
      setSuccessMsg(infoMsg);
      setSaving(false);

      // stay 2 seconds so user sees success message, then redirect
      setTimeout(() => {
        navigate("/admin/users");
      }, 2000);
    } catch (err) {
      const resp = err.response?.data;
      const newErrs = {};

      if (resp && typeof resp === "object") {
        for (const key of Object.keys(resp)) {
          const raw = Array.isArray(resp[key]) ? String(resp[key][0]) : String(resp[key]);
          const trimmed = raw.trim();

          // Duplicate username → EP016
          if (key === "username") {
            newErrs.username = (await getErrorText("EP016")) || trimmed;
            continue;
          }

          // Duplicate email → ES003
          if (key === "email") {
            newErrs.email = (await getErrorText("ES003")) || trimmed;
            continue;
          }

          // If raw is a known error code in cache, map it
          const maybe = (tables.user_error || []).find((it) => String(it?.error_code || "").toUpperCase() === trimmed.toUpperCase());
          if (maybe) {
            newErrs[key] = maybe.error_message || trimmed;
            continue;
          }

          // fallback to raw text
          newErrs[key] = trimmed;
        }

        // top-level 'detail' mapping if no field errors
        if (!Object.keys(newErrs).length && resp.detail) {
          const det = String(resp.detail || "").trim();
          const codeItem = (tables.user_error || []).find((it) => String(it?.error_code || "").toUpperCase() === det.toUpperCase());
          newErrs.general = codeItem ? codeItem.error_message : det;
        }
      } else if (typeof resp === "string") {
        const det = resp.trim();
        const codeItem = (tables.user_error || []).find((it) => String(it?.error_code || "").toUpperCase() === det.toUpperCase());
        newErrs.general = codeItem ? codeItem.error_message : det;
      } else {
        newErrs.general = (await getErrorText("EA011")) || "";
      }

      // If there are any field-level errors, show EG002 at bottom as well (cached)
      if (Object.keys(newErrs).length) {
        const eg002 = (await getErrorText("EG002")) || "";
        // preserve any existing general message if set, otherwise set EG002
        if (!newErrs.general) newErrs.general = eg002;
      }

      setErrors(newErrs);
      setSaving(false);
      // DO NOT redirect on error (stay on page)
    }
  };

  // -------------------------
  // Render
  // -------------------------
  return (
    <div className="view-profile-page">
      <div className="view-profile-header">
        <h2>Edit User: {user.username}</h2>
      </div>

      {/* ACCOUNT INFO */}
      <div className="profile-card account-info">
        <h3>Account Information</h3>
        <div className="edit-form-grid">
          <div className="edit-form-group">
            <label>Department</label>
            <select name="department" value={user.department || ""} onChange={handleDepartmentChange}>
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.department_name}
                </option>
              ))}
            </select>
          </div>

          <div className="edit-form-group">
            <label>Role</label>
            <select
              name="role"
              value={user.role || ""}
              onChange={(e) => setUser((p) => ({ ...p, role: e.target.value }))}
              disabled={!filteredRoles.length}
            >
              <option value="">Select Role</option>
              {filteredRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.role_name}
                </option>
              ))}
            </select>
          </div>

          <div className="edit-form-group">
            <label>Status</label>
            <select
              value={user.is_active ? "Active" : "Inactive"}
              onChange={(e) => setUser((prev) => ({ ...prev, is_active: e.target.value === "Active" }))}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="edit-form-group">
            <label>Date Joined</label>
            <input readOnly value={user.date_joined?.split("T")[0] || ""} />
          </div>
        </div>
      </div>

      {/* PERSONAL DETAILS */}
      <div className="profile-card">
        <h3>Personal Details</h3>
        <div className="edit-form-grid">
          <div className="edit-form-group">
            <label>Username</label>
            <input
              name="username"
              value={user.username || ""}
              onChange={handleChangeUser}
              onBlur={handleBlurField}
              onKeyDown={(e) => handleKeyDownOnField(e, "username")}
            />
            {errors.username && <div className="alert-box alert-error">{errors.username}</div>}
          </div>

          <div className="edit-form-group">
            <label>First Name</label>
            <input name="first_name" value={user.first_name || ""} onChange={handleChangeUser} onBlur={handleBlurField} onKeyDown={(e) => handleKeyDownOnField(e, "first_name")} />
            {errors.first_name && <div className="alert-box alert-error">{errors.first_name}</div>}
          </div>

          <div className="edit-form-group">
            <label>Last Name</label>
            <input name="last_name" value={user.last_name || ""} onChange={handleChangeUser} onBlur={handleBlurField} onKeyDown={(e) => handleKeyDownOnField(e, "last_name")} />
            {errors.last_name && <div className="alert-box alert-error">{errors.last_name}</div>}
          </div>

          <div className="edit-form-group">
            <label>Phone</label>
            <input name="phone" value={user.phone || ""} onChange={handleChangeUser} onBlur={handleBlurField} onKeyDown={(e) => handleKeyDownOnField(e, "phone")} />
            {errors.phone && <div className="alert-box alert-error">{errors.phone}</div>}
          </div>

          <div className="edit-form-group">
            <label>Email</label>
            <input
              name="email"
              value={user.email || ""}
              onChange={handleChangeUser}
              onBlur={handleBlurField}
              onKeyDown={(e) => handleKeyDownOnField(e, "email")}
            />
            {errors.email && <div className="alert-box alert-error">{errors.email}</div>}
          </div>
        </div>
      </div>

      {/* ADDRESS */}
      <div className="profile-card">
        <h3>Address Details</h3>
        <div className="edit-form-grid">
          {[
            { key: "house_flat", label: "Flat/House No" },
            { key: "street", label: "Street" },
            { key: "landmark", label: "Landmark" },
            { key: "area", label: "Area" },
            { key: "district", label: "District" },
            { key: "city", label: "City" },
            { key: "state", label: "State" },
            { key: "postal_code", label: loadingPinLookup ? "Postal Code (Fetching...)" : "Postal Code" },
            { key: "country", label: "Country" },
          ].map(({ key, label }) => (
            <div className="edit-form-group" key={key}>
              <label>{label}</label>
              <input name={key} value={address[key] || ""} onChange={handleChangeAddress} onBlur={handleBlurField} onKeyDown={(e) => handleKeyDownOnField(e, key)} />
              {errors[key] && <div className="alert-box alert-error">{errors[key]}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* GLOBAL BOTTOM MESSAGES (error / success) */}
      <div className="edit-user-bottom-messages" style={{ marginTop: 16 }}>
        {errors.general && <div className="alert-box alert-error bottom-alert">{errors.general}</div>}
        {successMsg && <div className="alert-box alert-success bottom-alert">{successMsg}</div>}
      </div>

      {/* Save / Cancel */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: 16 }}>
        <button className="save-btn" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>

        <button className="cancel-btn" onClick={() => navigate("/admin/users")}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default EditUserPage;
