// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("access");
  const location = useLocation();

  // 🔒 If no token found, redirect to login and remember where user came from
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // ✅ If logged in, allow access
  return children;
}

export default ProtectedRoute;
