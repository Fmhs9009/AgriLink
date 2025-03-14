import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaFilter, FaSeedling, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { productAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorBoundary from '../common/ErrorBoundary';

const ProductManagement = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.loginData);
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  
  // Categories for filtering
  const categories = ['Grains', 'Vegetables', 'Fruits', 'Dairy', 'Spices', 'Herbs', 'Oilseeds', 'Cash Crops', 'Organic'];
  
  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        console.log("Fetching products for user:", user);
        
        // Get the current user's ID to fetch only their products
        const userId = user?._id;
        
        let response;
        if (user?.role === 'admin') {
          // Admin can see all products
          console.log("Fetching all products for admin");
          response = await productAPI.getAll();
        } else {
          // Farmers see only their products
          console.log("Fetching products for farmer with ID:", userId);
          response = userId ? await productAPI.getByFarmer(userId) : { data: [] };
        }
        
        console.log("API response:", response);
        
        // Ensure data is in the expected format
        let productsData = Array.isArray(response.data) ? response.data : 
                         (response.data?.products || []);
        
        console.log("Setting products:", productsData);
        setProducts(productsData);
        setError(null);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products. Please try again.');
        toast.error('Failed to load products');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, [user]);
  
  // Handle product deletion
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    
    try {
      setLoading(true);
    //  console.log(productToDelete._id);
      await productAPI.delete(productToDelete._id);
      
      // Update local state
      setProducts(products.filter(p => p._id !== productToDelete._id));
      toast.success('Product deleted successfully');
      
      // Close modal
      setShowDeleteModal(false);
      setProductToDelete(null);
    } catch (err) {
      console.error('Error deleting product:', err);
      toast.error('Failed to delete product');
    } finally {
      setLoading(false);
    }
  };
  
  // Confirm delete
  const confirmDelete = (product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };
  
  // Handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Get sort icon
  const getSortIcon = (field) => {
    if (sortField !== field) return <FaSort className="ml-1 text-gray-400" />;
    return sortDirection === 'asc' ? 
      <FaSortUp className="ml-1 text-green-600" /> : 
      <FaSortDown className="ml-1 text-green-600" />;
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN').format(amount);
  };
  
  // Filter and sort products
  const filteredProducts = products
    .filter(product => {
      // Search filter
      const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Category filter
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      // Handle sorting
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name?.localeCompare(b.name || '') || 0;
          break;
        case 'price':
          comparison = (a.price || 0) - (b.price || 0);
          break;
        case 'stock':
          comparison = (a.availableQuantity || 0) - (b.availableQuantity || 0);
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
        default:
          comparison = 0;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  
  if (error) {
    return (
      <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
        <p className="font-medium">Error loading products</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }
  
  return (
    <ErrorBoundary>
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
              <p className="text-gray-600 mt-1">
                Manage your farm products and inventory
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Link
                to="/products/add"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                <FaPlus className="mr-2" />
                Add New Product
              </Link>
            </div>
          </div>
          
          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaSearch className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search products..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaFilter className="text-gray-400" />
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="block pl-10 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          {/* Products Table */}
          {loading ? (
            <LoadingSpinner message="Loading products..." />
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {filteredProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center">
                            Product {getSortIcon('name')}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('category')}
                        >
                          <div className="flex items-center">
                            Category {getSortIcon('category')}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('price')}
                        >
                          <div className="flex items-center">
                            Price {getSortIcon('price')}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('stock')}
                        >
                          <div className="flex items-center">
                            Stock {getSortIcon('stock')}
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredProducts.map((product) => (
                        <tr key={product._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {product.images && product.images.length > 0 ? (
                                <img 
                                  src={product.images[0].url} 
                                  alt={product.name} 
                                  className="h-10 w-10 rounded-full mr-3 object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                                  <FaSeedling className="text-gray-500" />
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium text-gray-900">{product.name}</p>
                                <p className="text-xs text-gray-500">{product.description?.substring(0, 30)}...</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.category || 'Uncategorized'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ₹{formatCurrency(product.price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.availableQuantity} {product.unit || 'kg'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              product.availableQuantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {product.availableQuantity > 0 ? 'In Stock' : 'Out of Stock'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link 
                              to={`/products/edit/${product._id}`}
                              className="text-blue-600 hover:text-blue-800 mr-3"
                            >
                              <FaEdit className="inline mr-1" />
                              Edit
                            </Link>
                            <button 
                              onClick={() => confirmDelete(product)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <FaTrash className="inline mr-1" />
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <FaSeedling className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || categoryFilter !== 'all' 
                      ? 'Try adjusting your search or filter criteria' 
                      : 'Get started by adding your first product'}
                  </p>
                  <div className="mt-6">
                    <Link
                      to="/products/add"
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                    >
                      <FaPlus className="mr-2" />
                      Add New Product
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <FaTrash className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Delete Product
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete "{productToDelete?.name}"? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={()=>handleDeleteProduct()}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setProductToDelete(null);
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
};

export default ProductManagement; 