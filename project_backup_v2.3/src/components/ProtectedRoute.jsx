import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../context/useAuth.js';
import LoadingSpinner from './atoms/LoadingSpinner.jsx';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullscreen />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
