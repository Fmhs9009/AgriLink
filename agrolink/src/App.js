import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { toast } from 'react-hot-toast';

// Import services and utilities
import { ROUTES, ROLES, TOAST_CONFIG, AUTH_CONSTANTS } from './config/constants';
import { setStore } from './services/api';
import authService from './services/auth/authService';
import { setAuthenticated, setUser, logout, refreshActivity, checkSession, setRememberMe } from "./reducer/Slice/authSlice";

// Import layout components
import Layout from "./components/layout/Layout";
import AuthLayout from "./components/layout/AuthLayout";
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute from './components/common/ProtectedRoute';

// Import auth components
import LoginPage from "./components/auth/Login";
import SignUpPage from "./components/auth/SignUp";
import VerifyOTPPage from "./components/auth/VerifyOTP";

// Lazy loaded components by feature
// Auth components
const ProfileEdit = lazy(() => import("./components/auth/ProfileEdit"));
const PasswordChange = lazy(() => import("./components/auth/PasswordChange"));

// Page components
const Home = lazy(() => import("./components/home/Home"));
const AboutUs = lazy(() => import("./components/pages/AboutUs"));
const ContactUs = lazy(() => import("./components/pages/ContactUs"));
const FarmerDashboard = lazy(() => import("./components/dashboard/FarmerDashboard"));

// Shop components
const Shop = lazy(() => import("./components/shop/Shop"));
const ProductDetail = lazy(() => import("./components/product/ProductDetail"));
const ProductManagement = lazy(() => import("./components/product/ProductManagement"));
const ProductForm = lazy(() => import("./components/product/ProductForm"));
const CategoryProducts = lazy(() => import("./components/product/CategoryProducts"));

// Contract components
const ContractRequests = lazy(() => import("./components/contract/ContractRequests"));
const ContractManagement = lazy(() => import("./components/contract/ContractManagement"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex justify-center items-center min-h-screen">
    <LoadingSpinner message="Loading page..." />
  </div>
);

function App() {
  const dispatch = useDispatch();
  const { loginData, isAuthenticated } = useSelector((state) => state.auth);
  
  // Set store reference for API service
  useEffect(() => {
    setStore(dispatch);
  }, [dispatch]);

  // Check authentication status on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Checking authentication status...');
        console.log('Current auth state:', { isAuthenticated, loginData });
        
        // Check if token exists in either localStorage or sessionStorage
        const token = authService.getToken();
        console.log('Token exists:', !!token);
        
        if (token) {
          // If token exists but Redux state doesn't reflect it
          if (!isAuthenticated) {
            console.log('Token exists but not authenticated in Redux, updating state');
            dispatch(setAuthenticated(true));
            
            // Get user data from appropriate storage
            const userData = authService.getUser();
            if (userData) {
              console.log('User data found:', userData);
              dispatch(setUser(userData));
              
              // Also update rememberMe state based on where the token was found
              const isRemembered = localStorage.getItem(AUTH_CONSTANTS.TOKEN_KEY) !== null;
              dispatch(setRememberMe(isRemembered));
              console.log('Remember me state set to:', isRemembered);
            } else {
              console.log('No user data found despite token existing');
            }
          }
        } else {
          // No token exists
          console.log('No token found, checking if we need to log out');
          
          // Only log out if we're not on the login page and Redux thinks we're authenticated
          const isLoginPage = window.location.pathname.includes('/auth/login');
          if (!isLoginPage && isAuthenticated) {
            console.log('Not on login page and Redux thinks we\'re authenticated, logging out');
            dispatch(logout());
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };

    checkAuth();
  }, [dispatch, isAuthenticated, loginData]);

  // Session timeout check
  useEffect(() => {
    // Check session every minute
    const sessionCheckInterval = setInterval(() => {
      dispatch(checkSession());
    }, 60000);

    // Activity listeners to refresh session timer
    const handleActivity = () => {
      dispatch(refreshActivity());
    };

    // Add event listeners for user activity
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      clearInterval(sessionCheckInterval);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [dispatch]);

  return (
    <ErrorBoundary>
      <div className="flex flex-col min-h-screen">
        <Toaster position="top-right" toastOptions={TOAST_CONFIG} />
        
        <Routes>
          {/* Auth Routes (outside of Layout) */}
          <Route path="/auth" element={<AuthLayout />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignUpPage />} />
            <Route path="verify-otp" element={<VerifyOTPPage />} />
          </Route>
          
          {/* Main Routes with Layout */}
          <Route path="/" element={
            <Suspense fallback={<PageLoader />}>
              <Layout />
            </Suspense>
          }>
            {/* Home and Info Pages */}
            <Route index element={
              <Suspense fallback={<PageLoader />}>
                <Home />
              </Suspense>
            } />
            <Route path="about" element={
              <Suspense fallback={<PageLoader />}>
                <AboutUs />
              </Suspense>
            } />
            <Route path="contact" element={
              <Suspense fallback={<PageLoader />}>
                <ContactUs />
              </Suspense>
            } />
            
            {/* Shop Routes */}
            <Route path="shop" element={
              <Suspense fallback={<PageLoader />}>
                <Shop />
              </Suspense>
            } />
            <Route path="products/:id" element={
              <Suspense fallback={<PageLoader />}>
                <ProductDetail />
              </Suspense>
            } />
            
            {/* Protected Routes */}
            <Route path="dashboard" element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <FarmerDashboard />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* Profile Routes */}
            <Route path="profile">
              <Route path="edit" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <ProfileEdit />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="password" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <PasswordChange />
                  </Suspense>
                </ProtectedRoute>
              } />
            </Route>
            
            {/* Product Management Routes */}
            <Route path="products">
              <Route path="manage" element={
                <ProtectedRoute allowedRoles={[ROLES.FARMER, ROLES.ADMIN]}>
                  <Suspense fallback={<PageLoader />}>
                    <ProductManagement />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="add" element={
                <ProtectedRoute allowedRoles={[ROLES.FARMER, ROLES.ADMIN]}>
                  <Suspense fallback={<PageLoader />}>
                    <ProductForm />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="edit/:id" element={
                <ProtectedRoute allowedRoles={[ROLES.FARMER, ROLES.ADMIN]}>
                  <Suspense fallback={<PageLoader />}>
                    <ProductForm />
                  </Suspense>
                </ProtectedRoute>
              } />
            </Route>
            
            {/* Contract Routes */}
            <Route path="contracts">
              <Route path="requests" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <ContractRequests />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="manage" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <ContractManagement />
                  </Suspense>
                </ProtectedRoute>
              } />
            </Route>
            
            {/* New routes */}
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/category/:category" element={<CategoryProducts />} />
          </Route>
          
          {/* 404 Route */}
          <Route path="*" element={
            <Suspense fallback={<PageLoader />}>
              <Layout>
                <div className="container mx-auto px-4 py-8 text-center">
                  <h1 className="text-4xl font-bold text-red-600 mb-4">404 - Page Not Found</h1>
                  <p className="text-lg mb-6">The page you are looking for does not exist.</p>
                  <Link to="/" className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors">
                    Return Home
                  </Link>
                </div>
              </Layout>
            </Suspense>
          } />
        </Routes>
      </div>
    </ErrorBoundary>
  );
}

export default App;
