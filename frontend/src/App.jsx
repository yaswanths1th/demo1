import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import AddressPage from "./pages/AddressPage";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyOtp from "./pages/VerifyOtp";
import ViewProfile from "./pages/ViewProfile";
import ChangePassword from "./pages/ChangePassword";
import EditProfilePage from "./pages/EditProfile";

import EditUserPage from "./admin/EditUserPage";
import AddUserPage from "./admin/AddUserPage";

import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./admin/AdminDashboard";
import ManageUsers from "./admin/ManageUsers";
import Reports from "./admin/Reports";
import AdminSettings from "./admin/AdminSettings";
import AdminProtectedRoute from "./components/AdminProtectedRoute";

import UserLayout from "./layouts/UserLayout";

// 👉 Make sure filename matches exactly
import { loadMessages } from "./utils/messageloader";

function App() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [msgsReady, setMsgsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await loadMessages();
      setMsgsReady(true);
    };
    init();
  }, []);

  if (!msgsReady) {
    return (
      <div style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "22px"
      }}>
        Loading...
      </div>
    );
  }

  const getDefaultRoute = () => {
    if (user?.is_admin) return "/admin/dashboard";
    if (user) return "/dashboard";
    return "/login";
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to={getDefaultRoute()} />} />

      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-otp" element={<VerifyOtp />} />

      {/* User routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <UserLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile" element={<ViewProfile />} />
        <Route path="addresses" element={<AddressPage />} />
        <Route path="edit-profile" element={<EditProfilePage isAdminRoute={false} />} />
        <Route path="change-password" element={<ChangePassword />} />
      </Route>

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<ManageUsers />} />
        <Route path="users/add" element={<AddUserPage />} />
        <Route path="users/edit/:id" element={<EditUserPage />} />
        <Route path="users/:userId" element={<ViewProfile />} />
        <Route path="profile" element={<ViewProfile />} />
        <Route path="profile/edit" element={<EditProfilePage isAdminRoute={true} />} />
        <Route path="change-password" element={<ChangePassword />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to={getDefaultRoute()} />} />
    </Routes>
  );
}

export default App;
