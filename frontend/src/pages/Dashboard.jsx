import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");
  const storedUser = JSON.parse(localStorage.getItem("user"));

  const [profile, setProfile] = useState(null);
  const [addressExists, setAddressExists] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      // ✅ Fetch Profile
      const resProfile = await fetch("http://127.0.0.1:8000/api/auth/profile/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const dataProfile = await resProfile.json();
      setProfile(dataProfile);

      // ✅ Check Address
      const resAddr = await fetch("http://127.0.0.1:8000/api/addresses/check/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const dataAddr = await resAddr.json();
      setAddressExists(dataAddr.has_address);

    } catch (error) {
      console.error("User dashboard load error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p className="loading-text">Loading your dashboard...</p>;

  return (
    <div className="user-dashboard-container">

      {/* ✅ FULL-WIDTH OVERVIEW CARD */}
      <div className="overview-card">

        {/* HEADER */}
        <section className="welcome-section">
          <h1 className="welcome-text">
            Welcome, {profile?.first_name || storedUser.username} 👋
          </h1>
          <p className="subtitle">Here is your account overview</p>
        </section>

        {/* ✅ STATUS CARDS */}
        <section className="stats-section">
          <h3 className="section-title">Your Status</h3>

          <div className="stats-cards">

            <div className="stat-card">
              <div className="stat-info">
                <h2>{profile?.email ? "✓" : "—"}</h2>
                <p>Profile Completed</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-info">
                <h2>{addressExists ? "✓" : "—"}</h2>
                <p>Address Added</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-info">
                <h2>{profile?.is_active ? "Active" : "Inactive"}</h2>
                <p>Account Status</p>
              </div>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}
