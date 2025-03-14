import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import authService from '../../services/auth/authService';
import { ROUTES } from '../../config/constants';
import LoadingSpinner from './LoadingSpinner';
import { useSelector } from 'react-redux';

/**
 * ProtectedRoute component that handles both authentication and role-based access control
 * @param {Object} props Component props
 * @param {React.ReactNode} props.children Child components to render if authorized
 * @param {string|string[]} [props.allowedRoles] Optional roles that are allowed to access this route
 * @param {string} [props.redirectPath] Path to redirect to if unauthorized (defaults to login)
 * @returns {React.ReactNode} Protected route component
 */
const ProtectedRoute = ({ 
  children, 
  allowedRoles = [], 
  redirectPath = '/auth/login'
}) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const location = useLocation();
  
  // Get authentication state from Redux store
  const { isAuthenticated, loginData } = useSelector((state) => state.auth);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // First check if user is authenticated using Redux state
        if (!isAuthenticated || !loginData) {
          console.log('Not authenticated according to Redux state');
          toast.error('Please login to continue');
          setIsAllowed(false);
          setIsChecking(false);
          return;
        }

        // If roles are specified, check if user has required role
        if (allowedRoles.length > 0) {
          const hasRequiredRole = authService.hasRole(allowedRoles);
       //   console.log('Role check:', { allowedRoles, hasRequiredRole });
          
          if (!hasRequiredRole) {
            toast.error("You don't have permission to access this page");
            setIsAllowed(false);
            setIsChecking(false);
            return;
          }
        }

        // User is authenticated and has required role (if any)
      //  console.log('Access granted');
        setIsAllowed(true);
      } catch (error) {
        console.error('Access check failed:', error);
        toast.error('Authentication check failed');
        setIsAllowed(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAccess();
  }, [allowedRoles, location.pathname, isAuthenticated, loginData]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="Verifying access..." />
      </div>
    );
  }

  if (!isAllowed) {
    // Store the attempted URL for redirect after login
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    const loginUrl = `${redirectPath}?returnUrl=${returnUrl}`;
    return <Navigate to={loginUrl} replace />;
  }

  return children;
};

export default ProtectedRoute; 