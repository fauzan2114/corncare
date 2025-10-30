import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { ExpertAuthContext } from '../contexts/ExpertAuthContext';

interface ExpertProtectedRouteProps {
  children: React.ReactNode;
}

const ExpertProtectedRoute: React.FC<ExpertProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useContext(ExpertAuthContext);

  return isAuthenticated ? <>{children}</> : <Navigate to="/expert-login" replace />;
};

export default ExpertProtectedRoute;