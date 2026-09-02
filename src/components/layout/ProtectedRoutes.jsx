import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function ProtectedRoutes({ isAuthenticated = true }) {
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
