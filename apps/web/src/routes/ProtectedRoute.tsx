import { useAppDispatch, useAppSelector } from "@/store";
import { restoreSession } from "@/store/auth/authThunk";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { accessToken, loading } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const [starting, setStarting] = useState<boolean>(true);

  const init = async () => {
    if (!accessToken) {
      await dispatch(restoreSession());
    }

    setStarting(false);
  };

  useEffect(() => {
    init();
  }, []);

  if (starting || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Đang tải trang...
      </div>
    );
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
