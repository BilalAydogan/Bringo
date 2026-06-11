import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axios';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const [checking, setChecking] = useState(true);
  const [hasPendingContracts, setHasPendingContracts] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setChecking(false);
      return;
    }

    axiosInstance
      .get('/contracts/status')
      .then((response) => {
        setHasPendingContracts(response.data.data?.has_pending ?? false);
      })
      .catch(() => {
        setHasPendingContracts(false);
      })
      .finally(() => setChecking(false));
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !(user?.roles ?? []).includes(requiredRole)) {
    return <Navigate to="/" replace />;
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (hasPendingContracts) {
    return <Navigate to="/contract-approval" replace />;
  }

  return <>{children}</>;
}
