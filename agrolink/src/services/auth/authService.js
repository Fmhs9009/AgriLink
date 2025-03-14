import axios from 'axios';
import { toast } from 'react-hot-toast';
import { ROLES, API_CONFIG, AUTH_CONSTANTS } from '../../config/constants';

const AUTH_BASE_URL = API_CONFIG.BASE_URL;
const TOKEN_KEY = AUTH_CONSTANTS.TOKEN_KEY;
const USER_KEY = AUTH_CONSTANTS.USER_KEY;
const REMEMBER_ME_KEY = AUTH_CONSTANTS.REMEMBER_ME_KEY;

// Create axios instance for auth
const authAxios = axios.create({
  baseURL: AUTH_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true  // Add this to enable cookies with CORS
});

// Response interceptor
authAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'An error occurred';
    toast.error(message);
    return Promise.reject(error);
  }
);

class AuthService {
  constructor() {
    // Add token to requests if it exists
    authAxios.interceptors.request.use((config) => {
      const token = this.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Remember Me management
  getRememberMe() {
    return localStorage.getItem(REMEMBER_ME_KEY) === 'true';
  }

  setRememberMe(value) {
    localStorage.setItem(REMEMBER_ME_KEY, value.toString());
  }

  // Token management
  getToken() {
    // First try localStorage (for remembered sessions)
    const localToken = localStorage.getItem(TOKEN_KEY);
    if (localToken) return localToken;
    
    // Then try sessionStorage (for non-remembered sessions)
    return sessionStorage.getItem(TOKEN_KEY);
  }

  setToken(token) {
    if (this.getRememberMe()) {
      // If Remember Me is checked, store in localStorage (persists across browser sessions)
      localStorage.setItem(TOKEN_KEY, token);
      // Also remove from sessionStorage to avoid confusion
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      // If Remember Me is not checked, store in sessionStorage (cleared when browser is closed)
      sessionStorage.setItem(TOKEN_KEY, token);
      // Also remove from localStorage to avoid confusion
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  removeToken() {
    // Clear from both storages
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  }

  // User data management
  getUser() {
    // First try localStorage (for remembered sessions)
    const localUserData = localStorage.getItem(USER_KEY);
    if (localUserData) return JSON.parse(localUserData);
    
    // Then try sessionStorage (for non-remembered sessions)
    const sessionUserData = sessionStorage.getItem(USER_KEY);
    return sessionUserData ? JSON.parse(sessionUserData) : null;
  }

  setUser(user) {
    if (this.getRememberMe()) {
      // If Remember Me is checked, store in localStorage
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      // Also remove from sessionStorage
      sessionStorage.removeItem(USER_KEY);
    } else {
      // If Remember Me is not checked, store in sessionStorage
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
      // Also remove from localStorage
      localStorage.removeItem(USER_KEY);
    }
  }

  removeUser() {
    // Clear from both storages
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
  }

  // Authentication state
  isAuthenticated() {
    return !!this.getToken();
  }

  // Role checking
  hasRole(allowedRoles) {
    const user = this.getUser();
  //  console.log('Checking role for user:', user);
    
    if (!user) {
      console.log('No user found, returning false');
      return false;
    }

    const userRole = user.role || user.accountType;
 //   console.log('User role:', userRole, 'Allowed roles:', allowedRoles);
    
    if (!userRole) {
      console.log('No user role found, returning false');
      return false;
    }
    
    if (Array.isArray(allowedRoles)) {
      const hasRole = allowedRoles.includes(userRole);
    //  console.log('Role check result (array):', hasRole);
      return hasRole;
    }
    
    const hasRole = userRole === allowedRoles;
    //  console.log('Role check result (single):', hasRole);
    return hasRole;
  }

  // Auth methods
  async login(credentials) {
    try {
      console.log('Attempting login with:', credentials);
      console.log('API URL:', AUTH_BASE_URL);
      
      const response = await authAxios.post('/auth/login', credentials);
      console.log('Login response:', response);
      
      // Check if response is successful
      if (response.data.success) {
        // Extract user data from response
        const user = response.data.user;
        console.log('User data from response:', user);
        
        // Extract token - it could be in different places depending on backend implementation
        let token = null;
        
        // Check in response data
        if (response.data.token) {
          token = response.data.token;
          console.log('Token found in response data');
        } 
        // Check in authorization header
        else if (response.headers['authorization']) {
          token = response.headers['authorization'].replace('Bearer ', '');
          console.log('Token found in authorization header');
        }
        // Check in cookies
        else {
          console.log('Cookies:', document.cookie);
          const tokenCookie = document.cookie
            .split(';')
            .find(cookie => cookie.trim().startsWith('token='));
          
          if (tokenCookie) {
            token = tokenCookie.trim().substring('token='.length);
            console.log('Token found in cookies');
          }
        }
        
        console.log('Extracted token:', token ? 'Token found' : 'No token found');
        
        if (token) {
          this.setToken(token);
          console.log('Token saved to storage based on Remember Me setting');
        } else {
          console.warn('No token found in response, authentication may fail');
        }
        
        if (user) {
          // Make sure accountType is set for role checking
          if (!user.role && !user.accountType) {
            console.warn('User data missing role/accountType, defaulting to "customer"');
            user.accountType = 'customer';
          }
          
          this.setUser(user);
          console.log('User data saved to storage based on Remember Me setting');
          
          toast.success('Login successful');
          return { success: true, data: user };
        } else {
          console.error('No user data in response');
          return { 
            success: false, 
            message: 'Invalid login response: No user data' 
          };
        }
      }
      
      return { 
        success: false, 
        message: response.data.message || 'Invalid login response' 
      };
    } catch (error) {
      console.error('Login error details:', error.response?.data || error.message);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed. Please check your credentials.' 
      };
    }
  }

  async register(userData) {
    try {
      console.log('Attempting registration with:', userData);
      
      // First, send OTP to the user's email
      const otpResponse = await authAxios.post('/auth/sendOTP', { email: userData.email });
      
      if (!otpResponse.data.success) {
        console.error('Failed to send OTP:', otpResponse.data);
        return { 
          success: false, 
          message: otpResponse.data.Message || 'Failed to send verification code' 
        };
      }
      
      console.log('OTP sent successfully');
      
      // Return success with email for OTP verification
      return { 
        success: true, 
        data: { 
          message: 'Verification code sent to your email',
          email: userData.email,
          userData: userData // Store user data for later signup
        } 
      };
    } catch (error) {
      console.error('Registration error details:', error.response?.data || error.message);
      return { 
        success: false, 
        message: error.response?.data?.Message || error.response?.data?.message || 'Registration failed' 
      };
    }
  }

  async verifyOTP(otpData) {
    try {
      console.log('Verifying OTP:', otpData);
      
      // First verify the OTP
      const verifyResponse = await authAxios.post('/auth/verifyotp', {
        email: otpData.email,
        otp: otpData.otp
      });
      
      if (!verifyResponse.data.success) {
        console.error('OTP verification failed:', verifyResponse.data);
        return { 
          success: false, 
          message: verifyResponse.data.Message || 'OTP verification failed' 
        };
      }
      
      console.log('OTP verified successfully');
      
      // If userData is provided, complete the signup process
      if (otpData.userData) {
        console.log('Completing signup with:', otpData.userData);
        
        // Prepare signup data
        const signupData = {
          Name: otpData.userData.name,
          email: otpData.userData.email,
          password: otpData.userData.password,
          accountType: otpData.userData.accountType || otpData.userData.role,
          otp: otpData.otp
        };
        
        // Ensure accountType is valid (only 'farmer' or 'customer' are allowed)
        if (signupData.accountType === 'buyer') {
          signupData.accountType = 'customer';
        }
        
        // Add farm details if user is a farmer
        if ((signupData.accountType === 'farmer') && 
            otpData.userData.farmName && otpData.userData.farmLocation) {
          signupData.farmName = otpData.userData.farmName;
          signupData.FarmLocation = otpData.userData.farmLocation;
          console.log('Added farm details:', { farmName: signupData.farmName, FarmLocation: signupData.FarmLocation });
        }
        
        // Call signup endpoint
        console.log('Sending signup data to backend:', signupData);
        const signupResponse = await authAxios.post('/auth/signup', signupData);
        
        if (!signupResponse.data.success) {
          console.error('Signup failed after OTP verification:', signupResponse.data);
          return { 
            success: false, 
            message: signupResponse.data.Message || 'Registration failed' 
          };
        }
        
        console.log('Signup completed successfully:', signupResponse.data);
        
        // If signup is successful and token is provided, save it
        if (signupResponse.data.token) {
          this.setToken(signupResponse.data.token);
          console.log('Token saved successfully');
        } else {
          console.warn('No token received from signup response');
        }
        
        // Save user data if provided
        if (signupResponse.data.user) {
          this.setUser(signupResponse.data.user);
          console.log('User data saved successfully');
        } else {
          console.warn('No user data received from signup response');
        }
        
        return { 
          success: true, 
          data: signupResponse.data,
          message: 'Registration successful'
        };
      }
      
      // If no userData, just return OTP verification success
      return { 
        success: true, 
        data: verifyResponse.data,
        message: 'OTP verified successfully'
      };
    } catch (error) {
      console.error('OTP verification error details:', error.response?.data || error.message);
      return { 
        success: false, 
        message: error.response?.data?.Message || error.response?.data?.message || 'OTP verification failed' 
      };
    }
  }

  async resendOTP(data) {
    try {
      console.log('Resending OTP to:', data.email);
      
      const response = await authAxios.post('/auth/sendOTP', { email: data.email });
      
      if (!response.data.success) {
        console.error('Failed to resend OTP:', response.data);
        return { 
          success: false, 
          message: response.data.Message || 'Failed to resend verification code' 
        };
      }
      
      console.log('OTP resent successfully');
      
      return { 
        success: true, 
        data: response.data,
        message: 'Verification code resent successfully'
      };
    } catch (error) {
      console.error('Resend OTP error details:', error.response?.data || error.message);
      return { 
        success: false, 
        message: error.response?.data?.Message || error.response?.data?.message || 'Failed to resend OTP' 
      };
    }
  }

  async logout() {
    try {
      await authAxios.post('/auth/logout');
      this.removeToken();
      this.removeUser();
      toast.success('Logged out successfully');
      return { success: true };
    } catch (error) {
      this.removeToken();
      this.removeUser();
      return { 
        success: false, 
        message: error.response?.data?.message || 'Logout failed' 
      };
    }
  }

  async checkAuthStatus() {
    try {
      const token = this.getToken();
      console.log('Checking auth status, token exists:', !!token);
      
      if (!token) {
        console.log('No token found, returning false');
        return false;
      }

      // Check if user data exists
      const userData = this.getUser();
      if (!userData) {
        console.log('No user data found, returning false');
        return false;
      }

      // Instead of making an API call, just check if token exists
      // This prevents unnecessary API calls that might fail
      return true;
      
      // If you want to verify with backend, uncomment this:
      /*
      try {
        const response = await authAxios.post('/auth/authenticate');
        return response.data.success;
      } catch (error) {
        console.error('Backend verification failed:', error);
        return false;
      }
      */
    } catch (error) {
      console.error('Auth check error:', error);
      // Don't remove token on check failure
      return false;
    }
  }

  async updateProfile(userData) {
    try {
      const response = await authAxios.put('/auth/profile', userData);
      this.setUser(response.data.user);
      toast.success('Profile updated successfully');
      return { success: true, data: response.data.user };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Profile update failed' 
      };
    }
  }

  async changePassword(passwordData) {
    try {
      const response = await authAxios.put('/auth/password', passwordData);
      toast.success('Password changed successfully');
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Password change failed' 
      };
    }
  }
}

// Create singleton instance
const authService = new AuthService();
export default authService; 