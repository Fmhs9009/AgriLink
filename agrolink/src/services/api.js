// Centralized API service for AgroLink
// This file provides a unified API client with standardized error handling,
// authentication token management, and consistent response formats.
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { API_CONFIG, STATUS_CODES, AUTH_CONSTANTS } from '../config/constants';
import authService from './auth/authService';

// Create a store reference to access Redux store
let storeInstance = null;

// Function to set store reference
export const setStore = (store) => {
  storeInstance = store;
};

// Custom toast styles
const warningToast = (message) => {
  toast(message, {
    icon: '⚠️',
    style: {
      borderRadius: '10px',
      background: '#FEF3C7',
      color: '#92400E',
    },
  });
};

const errorToast = (message) => {
  toast.error(message);
};

// Create axios instance with default config
export const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': API_CONFIG.CONTENT_TYPE,
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get token from auth service instead of directly from localStorage
    const token = authService.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Don't show toast for network errors in development mode
    // This prevents annoying toasts when backend is not running
    const isDev = process.env.NODE_ENV === 'development';
    
    if (error.response) {
      switch (error.response.status) {
        case STATUS_CODES.UNAUTHORIZED:
          // Use auth service to handle logout
          authService.removeToken();
          authService.removeUser();
          
          if (storeInstance) {
      storeInstance.dispatch({ type: 'auth/logout' });
            errorToast('Session expired. Please login again.');
          }
          break;
        case STATUS_CODES.FORBIDDEN:
          errorToast('You do not have permission to perform this action');
          break;
        case STATUS_CODES.NOT_FOUND:
          if (!isDev) errorToast('Resource not found');
          break;
        case STATUS_CODES.VALIDATION_ERROR:
          const validationErrors = error.response.data.errors;
          if (validationErrors) {
            Object.values(validationErrors).forEach(err => errorToast(err));
          }
          break;
        case STATUS_CODES.SERVER_ERROR:
          if (!isDev) errorToast('Server error. Please try again later.');
          break;
        default:
          if (!isDev) errorToast(error.response.data.message || 'Something went wrong');
      }
    } else if (error.request) {
      // Only show network error toast in production
      if (!isDev) {
        errorToast('Network error. Please check your connection.');
      } else {
        console.warn('Network error in development mode. Backend might not be running.');
      }
    }
    return Promise.reject(error);
  }
);

// Standardized API response handler
const handleApiResponse = async (apiCall) => {
  try {
    const response = await apiCall();
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'An error occurred',
      error: error.response?.data || error.message
    };
  }
};

// Product API service
export const productAPI = {
  // Get all products with optional filters
  getAll: async (filters = {}) => {
   // console.log("Calling getAll products API with filters:", filters);
    return handleApiResponse(() => api.get('/products', { params: filters }));
  },

  // Get product by ID
  getById: async (id) => {
    console.log("Calling getById product API for ID:", id);
    return handleApiResponse(() => api.get(`/products/product/${id}`));
  },

  // Get products by farmer ID
  getByFarmer: async (farmerId) => {
    console.log("Calling getByFarmer API for farmer ID:", farmerId);
    try {
      const response = await api.get(`/products/farmer/products`);
      console.log("Raw farmer products response:", response);
      
      // Handle different response formats
      if (response.data && response.data.products) {
        return { data: response.data.products };
      } else if (Array.isArray(response.data)) {
        return { data: response.data };
      } else {
        console.warn("Unexpected response format from farmer products API:", response.data);
        return { data: [] };
      }
    } catch (error) {
      console.error("Error in getByFarmer:", error);
      return {
        success: false, 
        message: error.response?.data?.message || 'Failed to fetch farmer products',
        data: []
      };
    }
  },
  
  // Upload image to Cloudinary
  uploadImage: async (imageFile) => {
    console.log("Uploading image to Cloudinary:", imageFile.name);
    const formData = new FormData();
    formData.append('image', imageFile);
    
    return handleApiResponse(() => api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }));
  },
  
  // Create new product
  create: async (productData) => {
    // Create FormData for multipart/form-data request
    const formData = new FormData();
    
    // Append product data
    Object.keys(productData).forEach(key => {
      if (key !== 'images' && key !== 'seasonalAvailability' && key !== 'contractPreferences' && key !== 'farmingPractices') {
        formData.append(key, productData[key]);
      }
    });
    
    // Handle seasonalAvailability separately
    if (productData.seasonalAvailability) {
      formData.append('seasonalAvailability[startMonth]', productData.seasonalAvailability.startMonth);
      formData.append('seasonalAvailability[endMonth]', productData.seasonalAvailability.endMonth);
    }
    
    // Handle contractPreferences separately
    if (productData.contractPreferences) {
      formData.append('contractPreferences[minDuration]', productData.contractPreferences.minDuration);
      formData.append('contractPreferences[maxDuration]', productData.contractPreferences.maxDuration);
      formData.append('contractPreferences[preferredPaymentTerms]', productData.contractPreferences.preferredPaymentTerms);
    }
    
    // Handle farmingPractices array
    if (productData.farmingPractices && productData.farmingPractices.length > 0) {
      productData.farmingPractices.forEach((practice, index) => {
        formData.append(`farmingPractices[${index}]`, practice);
      });
    }
    
    // Append images if any
    if (productData.images && productData.images.length > 0) {
      productData.images.forEach((image, index) => {
        if (image.url && image.public_id) {
          formData.append(`imageUrls[${index}]`, image.url);
          formData.append(`imagePublicIds[${index}]`, image.public_id);
        }
      });
    }
    
    console.log("Calling create product API with data:", Object.fromEntries(formData));
    return handleApiResponse(() => api.post('/products/new', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }));
  },

  // Update product
  update: async (id, productData) => {
    // Create FormData for multipart/form-data request
    const formData = new FormData();
    
    // Append product data
    Object.keys(productData).forEach(key => {
      if (key !== 'images' && key !== 'seasonalAvailability' && key !== 'contractPreferences' && key !== 'farmingPractices') {
        formData.append(key, productData[key]);
      }
    });
    
    // Handle seasonalAvailability separately
    if (productData.seasonalAvailability) {
      formData.append('seasonalAvailability[startMonth]', productData.seasonalAvailability.startMonth);
      formData.append('seasonalAvailability[endMonth]', productData.seasonalAvailability.endMonth);
    }
    
    // Handle contractPreferences separately
    if (productData.contractPreferences) {
      formData.append('contractPreferences[minDuration]', productData.contractPreferences.minDuration);
      formData.append('contractPreferences[maxDuration]', productData.contractPreferences.maxDuration);
      formData.append('contractPreferences[preferredPaymentTerms]', productData.contractPreferences.preferredPaymentTerms);
    }
    
    // Handle farmingPractices array
    if (productData.farmingPractices && productData.farmingPractices.length > 0) {
      productData.farmingPractices.forEach((practice, index) => {
        formData.append(`farmingPractices[${index}]`, practice);
      });
    }
    
    // Append images if any
    if (productData.images && productData.images.length > 0) {
      productData.images.forEach((image, index) => {
        if (image.url && image.public_id) {
          formData.append(`imageUrls[${index}]`, image.url);
          formData.append(`imagePublicIds[${index}]`, image.public_id);
        }
      });
    }
    
    console.log("Calling update product API for ID:", id, "with data:", Object.fromEntries(formData));
    return handleApiResponse(() => api.put(`/products/product/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }));
  },

  // Delete product
  delete: async (id) => {
    console.log("Calling delete product API for ID:", id);
    try {
      const response = await api.delete(`/products/product/${id}`);
      console.log("Delete product response:", response);
      
      if (response.status === 200 || response.status === 204) {
        return { 
          success: true, 
          message: 'Product deleted successfully' 
        };
      } else {
        return { 
          success: false, 
          message: response.data?.message || 'Failed to delete product' 
        };
      }
    } catch (error) {
      console.error("Error in delete product:", error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to delete product',
        error: error.response?.data || error.message
      };
    }
  },
  
  // Get products by category
  getByCategory: async (category) => {
    console.log("Calling getByCategory API for category:", category);
    return handleApiResponse(() => api.get(`/products/category/${category}`));
  },

  // Search products
  search: async (query) => {
    console.log("Calling search products API with query:", query);
    return handleApiResponse(() => api.get(`/products/search`, {
      params: { q: query }
    }));
  },

  // Update product stock
  updateStock: async (id, quantity) => {
    console.log("Calling updateStock API for ID:", id, "with quantity:", quantity);
    return handleApiResponse(() => api.patch(`/products/product/${id}/stock`, { quantity }));
  },

  // Toggle product status (active/inactive)
  toggleStatus: async (id) => {
    console.log("Calling toggleStatus API for ID:", id);
    return handleApiResponse(() => api.patch(`/products/product/${id}/toggle-status`));
  },

  // Add product review
  addReview: async (id, reviewData) => {
    console.log("Calling addReview API for ID:", id, "with data:", reviewData);
    return handleApiResponse(() => api.post(`/products/review/${id}`, reviewData));
  },

  // Get product reviews
  getReviews: async (id) => {
    console.log("Calling getReviews API for ID:", id);
    return handleApiResponse(() => api.get(`/products/reviews/${id}`));
  },
  
  // Get product categories
  getProductCategories: async () => {
    console.log("Calling getProductCategories API");
    return handleApiResponse(() => api.get('/products/categories'));
  },

  // Get products by category
  getProductsByCategory: async (category) => {
    try {
      console.log(`Fetching products for category: ${category}`);
      const response = await api.get(`/products/category/${category}`);
      console.log('Products by category response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching products by category:', error);
      throw error;
    }
  }
};

// Category API service
export const categoryAPI = {
  // Get all categories
  getAll: async () => {
    return handleApiResponse(() => api.get('/categories'));
  },

  // Get category by ID
  getById: async (id) => {
    return handleApiResponse(() => api.get(`/categories/${id}`));
  },

  create: async (categoryData) => {
    return handleApiResponse(() => api.post('/categories', categoryData));
  },

  update: async (id, categoryData) => {
    return handleApiResponse(() => api.put(`/categories/${id}`, categoryData));
  },

  delete: async (id) => {
    return handleApiResponse(() => api.delete(`/categories/${id}`));
  }
};

// Auth API service
export const authAPI = {
  login: async (credentials) => {
    return handleApiResponse(() => api.post('/auth/login', credentials));
  },

  signup: async (userData) => {
    return handleApiResponse(() => api.post('/auth/signup', userData));
  },

  verifyOTP: async (data) => {
    return handleApiResponse(() => api.post('/auth/verifyotp', data));
  },

  logout: async () => {
    return handleApiResponse(() => api.post('/auth/logout'));
  },

  updateProfile: async (data) => {
    return handleApiResponse(() => {
      const formData = new FormData();
      
      // Append user data
      Object.keys(data).forEach(key => {
        if (key !== 'avatar') {
          formData.append(key, data[key]);
        }
      });
      
      // Append avatar if provided
      if (data.avatar) {
        formData.append('avatar', data.avatar);
      }
      
      return api.put('/auth/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    });
  },

  changePassword: async (data) => {
    return handleApiResponse(() => api.put('/auth/password', data));
  },
  
  // Get current user profile
  getProfile: async () => {
    return handleApiResponse(() => api.get('/auth/profile'));
  },
  
  // Request password reset
  requestPasswordReset: async (email) => {
    return handleApiResponse(() => api.post('/auth/password/reset-request', { email }));
  },

  // Reset password with token
  resetPassword: async (token, newPassword) => {
    return handleApiResponse(() => api.post('/auth/password/reset', {
      token,
      newPassword
    }));
  }
};

// Contract API service
export const contractAPI = {
  // Get all contracts
  getAll: async (filters = {}) => {
    return handleApiResponse(() => api.get('/contracts', { params: filters }));
  },

  // Get contract by ID
  getById: async (id) => {
    return handleApiResponse(() => api.get(`/contracts/${id}`));
  },

  // Create new contract
  create: async (contractData) => {
    return handleApiResponse(() => api.post('/contracts', contractData));
  },

  // Update contract
  update: async (id, contractData) => {
    return handleApiResponse(() => api.put(`/contracts/${id}`, contractData));
  },

  // Delete contract
  delete: async (id) => {
    return handleApiResponse(() => api.delete(`/contracts/${id}`));
  },

  // Get contracts by status
  getByStatus: async (status) => {
    return handleApiResponse(() => api.get(`/contracts/status/${status}`));
  },

  // Accept contract
  accept: async (id) => {
    return handleApiResponse(() => api.put(`/contracts/${id}/accept`));
  },

  // Reject contract
  reject: async (id) => {
    return handleApiResponse(() => api.put(`/contracts/${id}/reject`));
  },

  // Complete contract
  complete: async (id) => {
    return handleApiResponse(() => api.put(`/contracts/${id}/complete`));
  },

  // Get farmer's contracts
  getByFarmer: async (farmerId) => {
    return handleApiResponse(() => api.get(`/contracts/farmer/${farmerId}`));
  },

  // Get buyer's contracts
  getByBuyer: async (buyerId) => {
    return handleApiResponse(() => api.get(`/contracts/buyer/${buyerId}`));
  }
};

// Order API service
export const orderAPI = {
  // Get all orders
  getAll: async (filters = {}) => {
    return handleApiResponse(() => api.get('/orders', { params: filters }));
  },

  // Get order by ID
  getById: async (id) => {
    return handleApiResponse(() => api.get(`/orders/${id}`));
  },

  // Create new order
  create: async (orderData) => {
    return handleApiResponse(() => api.post('/orders', orderData));
  },

  // Update order
  update: async (id, orderData) => {
    return handleApiResponse(() => api.put(`/orders/${id}`, orderData));
  }
};

// User API service
export const userAPI = {
  // Get user profile
  getProfile: async () => {
    return handleApiResponse(() => api.get('/users/profile'));
  },

  // Update user profile
  updateProfile: async (userData) => {
    return handleApiResponse(() => api.put('/users/profile', userData));
  },

  // Change password
  changePassword: async (passwordData) => {
    return handleApiResponse(() => api.put('/users/password', passwordData));
  },

  // Get user by ID
  getById: async (userId) => {
    console.log("Fetching user details for ID:", userId);
    return handleApiResponse(() => api.get(`/auth/user/${userId}`));
  }
};

export default api; 