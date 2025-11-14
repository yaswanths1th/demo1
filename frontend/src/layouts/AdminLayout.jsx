import React, { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BarChart2,
  Settings,
  LogOut,
} from "lucide-react";
import "./AdminLayout.css";

export default function AdminLayout() {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState("Admin");
  const [initial, setInitial] = useState("A");
  const [avatarColor, setAvatarColor] = useState("#0b2349");
  const token = localStorage.getItem("access");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/auth/profile/", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();

        const name =
          data.first_name || data.last_name
            ? `${data.first_name || ""} ${data.last_name || ""}`.trim()
            : data.username || "Admin";

        setAdminName(name);
        const first = name.charAt(0).toUpperCase();
        setInitial(first);
        setAvatarColor(generateColor(first));
      } catch (err) {
        console.error("Profile fetch error:", err);
      }
    };

    fetchProfile();
  }, [token, navigate]);

  const generateColor = (char) => {
    const colors = [
      "#0b2349",
      "#F97316",
      "#1E88E5",
      "#43A047",
      "#9C27B0",
      "#E53935",
      "#00897B",
      "#6D4C41",
    ];
    const index = (char.charCodeAt(0) - 65) % colors.length;
    return colors[index];
  };

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2 className="sidebar-title">Admin Panel</h2>

        <nav className="sidebar-nav">
          <NavLink to="/admin/dashboard"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>

          <NavLink to="/admin/users"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            <Users size={18} /> Manage Users
          </NavLink>

          <NavLink to="/admin/reports"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            <BarChart2 size={18} /> Reports
          </NavLink>

          <NavLink to="/admin/settings"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            <Settings size={18} /> Settings
          </NavLink>
        </nav>
      </aside>

      <div className="admin-main-wrapper">
        <header className="admin-header">
          <span className="header-title">Welcome, {adminName}</span>

          <div
            className="profile-box"
            onClick={() => navigate("/admin/profile")}
            style={{ cursor: "pointer" }}
          >
            <div className="avatar" style={{ backgroundColor: avatarColor }}>
              {initial}
            </div>

            <span className="profile-name">{adminName}</span>

            <button
              className="logout-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
