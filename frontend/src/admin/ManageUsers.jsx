import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { Edit2, Trash2 } from "lucide-react";
import "./ManageUsers.css";

function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const location = useLocation();
  const initialStatusFilter = location.state?.statusFilter || "All Status";
  const updateMessage = location.state?.updateMessage;   // 🔥 From edit user page

  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [roleFilter, setRoleFilter] = useState("All Roles");

  const [showConfirm, setShowConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  const token = localStorage.getItem("access");
  const navigate = useNavigate();

  // 🔥 Toast (BOTTOM)
const showToast = (msg, type = "success") => {
  let wrapper = document.querySelector(".toast-wrapper");

  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.className = "toast-wrapper";
    document.body.appendChild(wrapper);
  }

  const t = document.createElement("div");
  t.className = `toast-message ${type}`;
  t.innerText = msg;

  wrapper.appendChild(t);

  // fade + remove
  setTimeout(() => (t.style.opacity = "0"), 1800);
  setTimeout(() => t.remove(), 2400);
};


  // Show toast if user was updated
  useEffect(() => {
    if (updateMessage) {
      showToast(updateMessage, "success");
      navigate(location.pathname, { replace: true }); // clear state
    }
  }, [updateMessage, navigate, location.pathname]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${d.getDate()}-${m[d.getMonth()]}-${d.getFullYear()}`;
  };

  const loadRoles = useCallback(async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/auth/roles/");
      setRoles(Array.isArray(res.data) ? res.data : []);
    } catch {
      showToast("Failed loading roles", "error");
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);

    try {
      const res = await axios.get(
        "http://127.0.0.1:8000/api/auth/admin/users/",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const raw = Array.isArray(res.data) ? res.data : res.data.results || [];

      const formatted = await Promise.all(
        raw.map(async (u) => {
          const roleObj = roles.find((r) => Number(r.id) === Number(u.role));
          let address = {};

          try {
            const addrRes = await axios.get(
              `http://127.0.0.1:8000/api/addresses/?user=${u.id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (Array.isArray(addrRes.data) && addrRes.data.length > 0) {
              address = addrRes.data[0];
            }
          } catch {}

          return {
            id: u.id,
            username: u.username,
            email: u.email,
            role: roleObj ? roleObj.role_name : "—",
            status: u.is_active ? "Active" : "Inactive",
            dateJoined: formatDate(u.date_joined),
            address,
          };
        })
      );

      setUsers(formatted);
    } catch {
      showToast("Failed loading users", "error");
    }

    setLoading(false);
  }, [roles, token]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    if (roles.length) loadUsers();
  }, [roles, loadUsers]);

  const exportUsers = () => {
    const headers = [
      "Username","Email","Role","Status","Joined",
      "House/Flat","Street","Area","District","City",
      "State","Postal Code","Country",
    ];

    const csvRows = [headers.join(",")];

    users.forEach((u) => {
      const a = u.address || {};
      csvRows.push([
        u.username,u.email,u.role,u.status,u.dateJoined,
        a.house_flat || "",a.street || "",a.area || "",
        a.district || "",a.city || "",a.state || "",
        a.postal_code || "",a.country || ""
      ].join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Users_With_Address.csv";
    link.click();
  };

  const filtered = users.filter((u) => {
    const matchSearch =
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus = statusFilter === "All Status" || u.status === statusFilter;
    const matchRole = roleFilter === "All Roles" || u.role === roleFilter;

    return matchSearch && matchStatus && matchRole;
  });

  const indexOfLast = currentPage * usersPerPage;
  const current = filtered.slice(indexOfLast - usersPerPage, indexOfLast);
  const totalPages = Math.max(1, Math.ceil(filtered.length / usersPerPage));

  const handleEdit = (u) => navigate(`/admin/users/edit/${u.id}`);
  const handleAdd = () => navigate("/admin/users/add");

  const handleDelete = async () => {
    try {
      await axios.delete(
        `http://127.0.0.1:8000/api/auth/admin/users/${userToDelete.id}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));

      // 🔥 Bottom toast for delete
      showToast("User deleted successfully", "success");

    } catch (err) {
      const msg = err.response?.data?.message || "Delete failed";
      showToast(msg, "error");
    }
    setShowConfirm(false);
  };

  return (
    <div className="manage-users-container">
      <div className="page-header">
        <h2>User Management</h2>
        <p>View, edit and manage users</p>

        <div className="header-actions">
          <button className="export-btn" onClick={exportUsers}>Export</button>
          <button className="add-btn" onClick={handleAdd}>+ Add User</button>
        </div>
      </div>

      <div className="filter-bar">
        <input
          className="filter-input search-box"
          placeholder="Search by username or email"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
        />

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
        >
          <option>All Status</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>

        <select
          className="filter-select"
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
        >
          <option>All Roles</option>
          {roles.map((r) => (
            <option key={r.id}>{r.role_name}</option>
          ))}
        </select>
      </div>

      <table className="users-table">
        <thead>
          <tr>
            <th>Username</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr><td colSpan="6" style={{ textAlign: "center" }}>Updating data...</td></tr>
          ) : current.length > 0 ? (
            current.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td><span className={`role-badge ${u.role.toLowerCase()}`}>{u.role}</span></td>
                <td><span className={`status-badge ${u.status.toLowerCase()}`}>{u.status}</span></td>
                <td>{u.dateJoined}</td>
                <td>
                  <button className="action-btn edit" onClick={() => handleEdit(u)}>
                    <Edit2 size={16} />
                  </button>

                  <button className="action-btn delete" onClick={() => { setUserToDelete(u); setShowConfirm(true); }}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr><td colSpan="6" style={{ textAlign: "center" }}>No users found</td></tr>
          )}
        </tbody>
      </table>

      {!loading && filtered.length > usersPerPage && (
        <div className="pagination-controls">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>Prev</button>
          <span>Page {currentPage} / {totalPages}</span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>Next</button>
        </div>
      )}

      {showConfirm && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <h3>Confirm Delete</h3>
            <p>Delete user <b>{userToDelete?.username}</b>?</p>
            <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            <button className="btn btn-gray" onClick={() => setShowConfirm(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageUsers;
