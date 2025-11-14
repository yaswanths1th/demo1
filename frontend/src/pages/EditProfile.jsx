// frontend/src/pages/EditProfilePage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./EditProfilePage.css";

// ==============================
//  EDIT PROFILE PAGE
// ==============================

export default function EditProfilePage() {
  const [user, setUser] = useState({});
  const [address, setAddress] = useState({});
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [filteredRoles, setFilteredRoles] = useState([]);

  const [tables, setTables] = useState({
    user_error: [],
    user_validation: [],
    user_information: [],
  });

  const [errors, setErrors] = useState({});
  const [loadingPinLookup, setLoadingPinLookup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const token = localStorage.getItem("access");
  const navigate = useNavigate();
  const location = useLocation();

  const isAdminView = location.pathname.startsWith("/admin");
  const redirectTo = isAdminView ? "/admin/profile" : "/profile";

  // ------------------ REGEX ------------------
  const NAME_RE = /^[A-Za-z\s]+$/;
  const USERNAME_RE = /^[A-Za-z0-9_]+$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_RE = /^[0-9]{10}$/;
  const ALNUM_SPACE_HYPHEN = /^[A-Za-z0-9\s-,]+$/;
  const ALNUM_ONLY = /^[A-Za-z0-9]+$/;

  // ------------------ MESSAGE SYSTEM ------------------
  const fetchBackendMessage = async (code, type) => {
    try {
      const cached = localStorage.getItem(`${type}_${code}`);
      if (cached) return cached;

      const res = await fetch(
        `http://127.0.0.1:8000/api/auth/messages/${type}/${code}/`
      );
      if (res.ok) {
        const data = await res.json();
        const msg = data?.message || "";
        if (msg) localStorage.setItem(`${type}_${code}`, msg);
        return msg;
      }
    } catch {
      console.warn("Message fetch failed", code, type);
    }
    return "";
  };

  const getErrorText = async (code) => {
    const list = tables.user_error;
    const row = list.find(
      (x) => (x.error_code || "").toUpperCase() === code.toUpperCase()
    );
    return row?.error_message || (await fetchBackendMessage(code, "error"));
  };

  const getValidationText = async (code) => {
    const list = tables.user_validation;
    const row = list.find(
      (x) =>
        (x.validation_code || "").toUpperCase() === code.toUpperCase()
    );
    return (
      row?.validation_message ||
      (await fetchBackendMessage(code, "validation"))
    );
  };

  const getInfoText = async (code) => {
    const list = tables.user_information;
    const row = list.find(
      (x) =>
        (x.information_code || "").toUpperCase() === code.toUpperCase()
    );
    return (
      row?.information_text ||
      (await fetchBackendMessage(code, "information"))
    );
  };

  // ------------------ LOAD MESSAGE TABLES ------------------
  useEffect(() => {
    const loadTables = async () => {
      try {
        const e = JSON.parse(localStorage.getItem("user_error") || "[]");
        const v = JSON.parse(localStorage.getItem("user_validation") || "[]");
        const i = JSON.parse(localStorage.getItem("user_information") || "[]");

        if (e.length || v.length || i.length) {
          setTables({
            user_error: e,
            user_validation: v,
            user_information: i,
          });
        } else {
          const res = await fetch(
            "http://127.0.0.1:8000/api/auth/messages/"
          );
          if (res.ok) {
            const data = await res.json();
            setTables(data);

            localStorage.setItem(
              "user_error",
              JSON.stringify(data.user_error || [])
            );
            localStorage.setItem(
              "user_validation",
              JSON.stringify(data.user_validation || [])
            );
            localStorage.setItem(
              "user_information",
              JSON.stringify(data.user_information || [])
            );
          }
        }
      } catch {
        console.error("Table load fail");
      }
    };
    loadTables();
  }, []);

  // ------------------ LOAD USER + ADDRESS + DEPTS + ROLES ------------------
  useEffect(() => {
    if (!token) return navigate("/login");

    const loadAll = async () => {
      try {
        const userRes = await axios.get(
          "http://127.0.0.1:8000/api/auth/profile/",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setUser(userRes.data);

        // address
        const addrRes = await axios.get(
          "http://127.0.0.1:8000/api/addresses/",
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (Array.isArray(addrRes.data) && addrRes.data.length > 0)
          setAddress(addrRes.data[0]);
        else if (addrRes.data && typeof addrRes.data === "object")
          setAddress(addrRes.data);

        // departments + roles
        const deptRes = await axios.get(
          "http://127.0.0.1:8000/api/auth/departments/"
        );
        const rolesRes = await axios.get(
          "http://127.0.0.1:8000/api/auth/roles/"
        );

        setDepartments(deptRes.data || []);
        setRoles(rolesRes.data || []);
      } catch {
        console.error("Load error");
      }
    };

    loadAll();
  }, [navigate, token]);

  // ------------------ FILTER ROLES ------------------
  useEffect(() => {
    if (user.department) {
      setFilteredRoles(
        roles.filter(
          (r) => String(r.department) === String(user.department)
        )
      );
    } else {
      setFilteredRoles([]);
    }
  }, [user.department, roles]);

  // ------------------ VALIDATION ------------------
  const validatePersonalField = async (name, value) => {
    let msg = "";
    const v = String(value || "").trim();

    if (!v) msg = await getValidationText("VA002");
    else if (
      (name === "first_name" || name === "last_name") &&
      !NAME_RE.test(v)
    )
      msg = await getValidationText("VA001");
    else if (name === "username" && !USERNAME_RE.test(v))
      msg = await getValidationText("VA003");
    else if (name === "email" && !EMAIL_RE.test(v))
      msg = await getValidationText("VA005");

    // -----------------------------------------
    // 🔥 PHONE FIX (YOU ASKED FOR EA009 HERE)
    // -----------------------------------------
    else if (name === "phone" && !PHONE_RE.test(v))
      msg = await getErrorText("EA009");
    // -----------------------------------------

    setErrors((p) => ({ ...p, [name]: msg }));
    return !msg;
  };

  const validateAddressField = async (name, value) => {
    let msg = "";
    const v = String(value || "");

    if (name === "landmark") {
      if (v && !ALNUM_SPACE_HYPHEN.test(v))
        msg = await getErrorText("EA003");
    } else if (name === "postal_code") {
      if (!v.trim()) msg = await getErrorText("EA008");
      else if (!ALNUM_ONLY.test(v)) msg = await getErrorText("EA005");
      else if (v.length < 4 || v.length > 10)
        msg = await getErrorText("EA006");
    } else {
      if (!v.trim()) msg = await getErrorText("EA004");
      else if (!ALNUM_SPACE_HYPHEN.test(v))
        msg = await getErrorText("EA003");
    }

    setErrors((p) => ({ ...p, [name]: msg }));
    return !msg;
  };

  // ------------------ POSTAL LOOKUP ------------------
  const lookupPostalCode = async (
    postalCodeValue,
    countryValue = address.country || "India"
  ) => {
    try {
      setLoadingPinLookup(true);

      if (!postalCodeValue || postalCodeValue.length < 4) {
        const msg = await getErrorText("EA006");
        setErrors((p) => ({ ...p, postal_code: msg }));
        return;
      }

      // India POST
      if (countryValue === "India") {
        try {
          const res = await fetch(
            `https://api.postalpincode.in/pincode/${postalCodeValue}`
          );
          const data = await res.json();

          if (Array.isArray(data) && data[0]?.Status === "Success") {
            const info = data[0].PostOffice?.[0];
            if (info) {
              setAddress((prev) => ({
                ...prev,
                district: info.District,
                state: info.State,
                city: info.Name,
                country: "India",
              }));
              setErrors((p) => ({ ...p, postal_code: "" }));
              return;
            }
          }
        } catch {}
      }

      // fallback
      const res = await fetch(
        `https://api.zippopotam.us/${(
          countryValue || "us"
        ).toLowerCase()}/${postalCodeValue}`
      );

      if (!res.ok) {
        const msg = await getErrorText("EA007");
        setErrors((p) => ({ ...p, postal_code: msg }));
        return;
      }

      const data = await res.json();
      const place = data.places?.[0];

      if (place) {
        setAddress((prev) => ({
          ...prev,
          city: place["place name"],
          state: place["state"],
          country: data["country"],
        }));
        setErrors((p) => ({ ...p, postal_code: "" }));
      } else {
        const msg = await getErrorText("EA006");
        setErrors((p) => ({ ...p, postal_code: msg }));
      }
    } catch {
      const msg = await getErrorText("EA007");
      setErrors((p) => ({ ...p, postal_code: msg }));
    } finally {
      setLoadingPinLookup(false);
    }
  };

  // ------------------ HANDLERS ------------------
  const handleChangeUser = async (e) => {
    const { name, value } = e.target;
    setUser((p) => ({ ...p, [name]: value }));
    if (
      ["first_name", "last_name", "username", "email", "phone"].includes(
        name
      )
    ) {
      await validatePersonalField(name, value);
    }
  };

  const handleChangeAddress = async (e) => {
    const { name, value } = e.target;
    setAddress((p) => ({ ...p, [name]: value }));

    if (name === "postal_code") {
      await validateAddressField(name, value);
      if (value.length >= 4)
        lookupPostalCode(value, address.country);
    } else {
      await validateAddressField(name, value);
    }
  };

  const validateAll = async () => {
    const personal = ["username", "first_name", "last_name", "phone", "email"];
    const addr = [
      "house_flat",
      "street",
      "area",
      "district",
      "city",
      "state",
      "postal_code",
      "country",
    ];

    const okPersonal = await Promise.all(
      personal.map((f) => validatePersonalField(f, user[f] || ""))
    );

    const okAddress = await Promise.all(
      addr.map((f) => validateAddressField(f, address[f] || ""))
    );

    return [...okPersonal, ...okAddress].every(Boolean);
  };

  // ------------------ SAVE ------------------
  const handleSave = async () => {
    setSuccessMsg("");
    setErrors({});
    if (!(await validateAll())) return;

    setSaving(true);
    try {
      let payload = { ...user };
      if (payload.department)
        payload.department = Number(payload.department);
      if (payload.role)
        payload.role = Number(payload.role);

      await axios.put("http://127.0.0.1:8000/api/auth/profile/", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // address
      const addrUrl = address.id
        ? `http://127.0.0.1:8000/api/addresses/${address.id}/`
        : "http://127.0.0.1:8000/api/addresses/";

      await axios({
        method: address.id ? "put" : "post",
        url: addrUrl,
        data: address,
        headers: { Authorization: `Bearer ${token}` },
      });

      const msg = await getInfoText(address.id ? "IA004" : "IA001");
      setSuccessMsg(msg);

      setTimeout(() => navigate(redirectTo), 1200);
    } catch (err) {
      const resp = err.response?.data;
      const newErrs = {};

      if (resp && typeof resp === "object") {
        for (const k of Object.keys(resp)) {
          const v = resp[k];

          if (Array.isArray(v)) {
            newErrs[k] = v[0];
          } else if (typeof v === "string") {
            const code = v.trim();
            if (
              tables.user_error.some((item) => item.error_code === code)
            ) {
              newErrs[k] = await getErrorText(code);
            } else newErrs[k] = v;
          }
        }

        // Backend field-level uniqueness mapping
        if (resp?.username) {
          newErrs.username = await getErrorText("EP016");
        }
        if (resp?.email) {
          newErrs.email = await getErrorText("ES003");
        }
      } else {
        newErrs.general = "Failed to save data.";
      }

      setErrors(newErrs);
    } finally {
      setSaving(false);
    }
  };

  // ------------------ LOGOUT ------------------
  const handleLogout = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/messages/");
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("user_error", JSON.stringify(data.user_error || []));
        localStorage.setItem("user_validation", JSON.stringify(data.user_validation || []));
        localStorage.setItem("user_information", JSON.stringify(data.user_information || []));
      }
    } catch {}

    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user_error");
    localStorage.removeItem("user_information");
    localStorage.removeItem("user_validation");
    localStorage.removeItem("messages_loaded");
    navigate("/login");
  };

  // ------------------ RENDER ------------------
  return (
    <div className="edit-profile-page">
      <div className="edit-profile-header">
        <h2>
          {isAdminView
            ? `Edit User: ${user.username || ""}`
            : "Edit Profile"}
        </h2>

        <div style={{ display: "flex", gap: "8px" }}>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="edit-profile-content">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          noValidate
        >
          {/* ACCOUNT INFO */}
          <div className="edit-profile-card">
            <h3>Account Information</h3>
            <div className="edit-form-grid">
              {/* Department */}
              <div className="edit-form-group">
                <label>Department</label>
                <select
                  name="department"
                  value={user.department || ""}
                  onChange={(e) =>
                    setUser((p) => ({
                      ...p,
                      department: Number(e.target.value),
                      role: "",
                    }))
                  }
                  disabled={!isAdminView}
                >
                  <option value="">Select</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.department_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role */}
              <div className="edit-form-group">
                <label>Role</label>
                <select
                  name="role"
                  value={user.role || ""}
                  onChange={(e) =>
                    setUser((p) => ({
                      ...p,
                      role: Number(e.target.value),
                    }))
                  }
                  disabled={!isAdminView}
                >
                  <option value="">Select Role</option>
                  {filteredRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.role_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="edit-form-group">
                <label>Status</label>
                <select
                  name="is_active"
                  value={user.is_active ? "Active" : "Inactive"}
                  onChange={(e) =>
                    setUser((prev) => ({
                      ...prev,
                      is_active: e.target.value === "Active",
                    }))
                  }
                  disabled={!isAdminView}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* PERSONAL INFO */}
          <div className="edit-profile-card">
            <h3>Personal Details</h3>
            <div className="edit-form-grid">
              {["username", "first_name", "last_name", "phone", "email"].map(
                (field) => (
                  <div className="edit-form-group" key={field}>
                    <label>{field.replace("_", " ").toUpperCase()}</label>
                    <input
                      name={field}
                      value={user[field] || ""}
                      onChange={handleChangeUser}
                      onBlur={(e) =>
                        validatePersonalField(field, e.target.value)
                      }
                    />
                    {errors[field] && (
                      <div className="error-text">{errors[field]}</div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>

          {/* ADDRESS INFO */}
          <div className="edit-profile-card">
            <h3>Address Details</h3>
            <div className="edit-form-grid">
              {[
                "house_flat",
                "street",
                "landmark",
                "area",
                "district",
                "city",
                "state",
                "postal_code",
                "country",
              ].map((key) => (
                <div className="edit-form-group" key={key}>
                  <label>
                    {key.replace("_", " ").toUpperCase()}
                    {key === "postal_code" && loadingPinLookup && (
                      <span className="lookup"> (Checking...) </span>
                    )}
                  </label>

                  <input
                    name={key}
                    value={address[key] || ""}
                    onChange={handleChangeAddress}
                    onBlur={(e) =>
                      validateAddressField(key, e.target.value)
                    }
                  />

                  {errors[key] && (
                    <div className="error-text">{errors[key]}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* FEEDBACK */}
          {errors.general && (
            <div className="error-text">{errors.general}</div>
          )}
          {successMsg && (
            <div className="success-text">{successMsg}</div>
          )}

          {/* ACTION BUTTONS */}
          <div className="action-buttons">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => navigate(redirectTo)}
            >
              Cancel
            </button>

            <button type="submit" className="save-btn">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
