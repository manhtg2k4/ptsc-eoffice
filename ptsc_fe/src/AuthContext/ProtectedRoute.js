import React, { useContext } from "react";
import { AuthContext } from "./AuthProvider";
import Loading from "@components/Loading/Loading";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const { user, loading, authenticated } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return <Loading />;
  }

  if (location.pathname === "/login") {
    return children;
  }

  const token = localStorage.getItem("token");

  // Nếu không có token hoặc không được xác thực, chuyển về /login
  if (!token || (!authenticated && !user)) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;
