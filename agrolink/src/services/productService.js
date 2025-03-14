import axios from 'axios';
import { API_CONFIG } from '../config/constants';
import { api } from './api';
import { getAuthToken } from '../utils/auth';

// Base URL for API requests
const BASE_URL = API_CONFIG.BASE_URL;

// Helper function to set auth header
const getAuthHeader = () => {
  const token = getAuthToken();
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

/**
 * Service for product-related API calls
 */
export const productService = {
  /**
   * Get all products with optional filters
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} - Products array
   */
  getAllProducts: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filters to query params
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.minPrice) queryParams.append('minPrice', filters.minPrice);
      if (filters.maxPrice) queryParams.append('maxPrice', filters.maxPrice);
      if (filters.organic !== undefined) queryParams.append('organic', filters.organic);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.page) queryParams.append('page', filters.page);
      if (filters.limit) queryParams.append('limit', filters.limit);
      if (filters.sort) queryParams.append('sort', filters.sort);
      
      const queryString = queryParams.toString();
      const url = `${BASE_URL}/products${queryString ? `?${queryString}` : ''}`;
      
      const response = await axios.get(url);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch products');
      }
      
      return response.data.products;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },
  
  /**
   * Get product details by ID
   * @param {string} id - Product ID
   * @returns {Promise<Object>} - Product details
   */
  getProductById: async (productId) => {
    try {
      const response = await axios.get(`${BASE_URL}/products/${productId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching product details:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch product details'
      };
    }
  },
  
  /**
   * Get products for the current farmer
   * @returns {Promise<Array>} - Farmer's products array
   */
  getFarmerProducts: async () => {
    try {
      const response = await axios.get(
        `${BASE_URL}/products/my-products`,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching my products:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch your products'
      };
    }
  },
  
  /**
   * Create a new product
   * @param {Object} productData - Product data
   * @returns {Promise<Object>} - Created product
   */
  createProduct: async (productData) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/products`,
        productData,
        {
          ...getAuthHeader(),
          headers: {
            ...getAuthHeader().headers,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating product:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create product'
      };
    }
  },
  
  /**
   * Update an existing product
   * @param {string} id - Product ID
   * @param {Object} productData - Updated product data
   * @returns {Promise<Object>} - Updated product
   */
  updateProduct: async (productId, productData) => {
    try {
      const response = await axios.put(
        `${BASE_URL}/products/${productId}`,
        productData,
        {
          ...getAuthHeader(),
          headers: {
            ...getAuthHeader().headers,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating product:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update product'
      };
    }
  },
  
  /**
   * Delete a product
   * @param {string} id - Product ID
   * @returns {Promise<Object>} - Deletion result
   */
  deleteProduct: async (productId) => {
    try {
      const response = await axios.delete(
        `${BASE_URL}/products/${productId}`,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting product:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete product'
      };
    }
  },
  
  /**
   * Toggle product active status
   * @param {string} id - Product ID
   * @param {boolean} isActive - New active status
   * @returns {Promise<Object>} - Update result
   */
  toggleProductStatus: async (productId, isActive) => {
    try {
      const response = await axios.patch(
        `${BASE_URL}/products/${productId}/status`,
        { isActive },
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      console.error('Error updating product status:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update product status'
      };
    }
  },
  
  /**
   * Get product categories
   * @returns {Promise<Array>} - Product categories
   */
  getProductCategories: async () => {
    try {
      const response = await axios.get(`${BASE_URL}/products/categories`);
      return response.data;
    } catch (error) {
      console.error('Error fetching product categories:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch product categories'
      };
    }
  },
  
  /**
   * Add a review to a product
   * @param {string} id - Product ID
   * @param {Object} reviewData - Review data
   * @returns {Promise<Object>} - Review result
   */
  addProductReview: async (id, reviewData) => {
    try {
      const token = getAuthToken();
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await axios.post(`${BASE_URL}/products/review/${id}`, reviewData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error adding review to product ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Get reviews for a product
   * @param {string} id - Product ID
   * @returns {Promise<Array>} - Reviews array
   */
  getProductReviews: async (id) => {
    try {
      const response = await axios.get(`${BASE_URL}/products/reviews/${id}`);
      return response.data.reviews;
    } catch (error) {
      console.error(`Error fetching reviews for product ${id}:`, error);
      throw error;
    }
  }
}; 