import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FaChartLine, FaUsers, FaShoppingCart, FaWarehouse, FaMoneyBillWave, FaCalendarCheck, FaHandshake, FaSeedling, FaClipboardList, FaTractor, FaChartBar, FaMapMarkerAlt, FaLeaf, FaEdit, FaEye, FaTrash } from 'react-icons/fa';
import { useApi } from '../../hooks/useApi';
import { contractAPI, productAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorBoundary from '../common/ErrorBoundary';
import { toast } from 'react-hot-toast';

// Utility functions
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN').format(amount);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const getStatusBadge = (status) => {
  const badges = {
    active: 'bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium',
    pending: 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium',
    completed: 'bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium',
    cancelled: 'bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium'
  };
  return badges[status] || badges.pending;
};

const StatCard = ({ icon: Icon, title, value, color }) => (
  <div className="bg-white rounded-lg shadow-md p-6 flex items-center space-x-4 hover:shadow-lg transition-shadow duration-300">
    <div className={`p-3 rounded-full ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-gray-500 text-sm">{title}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  </div>
);

const FarmerDashboardOverview = ({ data }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    <StatCard
      icon={FaWarehouse}
      title="My Products"
      value={data?.stats?.totalProducts || 0}
      color="bg-blue-500"
    />
    <StatCard
      icon={FaHandshake}
      title="Active Contracts"
      value={data?.stats?.activeContracts || 0}
      color="bg-green-500"
    />
    <StatCard
      icon={FaCalendarCheck}
      title="Pending Contracts"
      value={data?.stats?.pendingContracts || 0}
      color="bg-yellow-500"
    />
    <StatCard
      icon={FaMoneyBillWave}
      title="Total Revenue"
      value={`₹${formatCurrency(data?.stats?.totalRevenue || 0)}`}
      color="bg-purple-500"
    />
  </div>
);

const RecentContracts = ({ contracts }) => (
  <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800">Recent Contracts</h3>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contract ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {contracts?.length > 0 ? (
            contracts.map((contract) => (
              <tr key={contract._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {contract.contractId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {contract.product.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {contract.buyer.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={getStatusBadge(contract.status)}>
                    {contract.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ₹{formatCurrency(contract.totalAmount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(contract.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <Link 
                    to={`/contracts/${contract._id}`}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    View
                  </Link>
                  {contract.status === 'pending' && (
                    <>
                      <button 
                        className="text-green-600 hover:text-green-800 mr-3"
                        onClick={() => {/* Handle accept */}}
                      >
                        Accept
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-800"
                        onClick={() => {/* Handle reject */}}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                No contracts found. Start by adding your products to receive contract offers.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
      <Link
        to="/contracts/manage"
        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
      >
        View all contracts →
      </Link>
    </div>
  </div>
);

const MyProducts = ({ products }) => (
  <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800">My Products</h3>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {products?.length > 0 ? (
            products.map((product) => (
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
                  {product.category}
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
                  <div className="flex justify-end space-x-2">
                    <Link 
                      to={`/products/edit/${product._id}`}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-100 transition-colors"
                      title="Edit Product"
                    >
                      <FaEdit className="w-4 h-4" />
                      <span className="sr-only">Edit</span>
                    </Link>
                    <Link 
                      to={`/products/${product._id}`}
                      className="text-green-600 hover:text-green-800 p-1 rounded-full hover:bg-green-100 transition-colors"
                      title="View Product"
                    >
                      <FaEye className="w-4 h-4" />
                      <span className="sr-only">View</span>
                    </Link>
                    <button 
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
                          console.log("Deleting product with ID:", product._id);
                          
                          // Show loading toast
                          const loadingToast = toast.loading('Deleting product...');
                          
                          productAPI.delete(product._id)
                            .then((response) => {
                              console.log("Delete product response:", response);
                              
                              // Check if the deletion was successful
                              if (response.success === false) {
                                throw new Error(response.message || 'Failed to delete product');
                              }
                              
                              // Dismiss loading toast and show success
                              toast.dismiss(loadingToast);
                              toast.success('Product deleted successfully');
                              
                              // Refresh the page to update the product list
                              setTimeout(() => {
                                window.location.reload();
                              }, 1000);
                            })
                            .catch(err => {
                              console.error('Error deleting product:', err);
                              
                              // Dismiss loading toast and show error
                              toast.dismiss(loadingToast);
                              toast.error(err.message || 'Failed to delete product');
                            });
                        }
                      }}
                      className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100 transition-colors"
                      title="Delete Product"
                    >
                      <FaTrash className="w-4 h-4" />
                      <span className="sr-only">Delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                No products found. Add your first product to start receiving contract offers.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
      <Link
        to="/products/add"
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
      >
        <FaSeedling className="mr-2" />
        Add New Product
      </Link>
    </div>
  </div>
);

const FarmInsights = () => (
  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Seasonal Tips</h3>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-1">
              <FaLeaf className="h-5 w-5 text-green-500" />
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-gray-900">Monsoon Crop Planning</h4>
              <p className="mt-1 text-sm text-gray-500">
                Consider planting rice, maize, and pulses during the upcoming monsoon season for optimal yields.
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-1">
              <FaTractor className="h-5 w-5 text-green-500" />
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-gray-900">Equipment Maintenance</h4>
              <p className="mt-1 text-sm text-gray-500">
                Schedule maintenance for your farming equipment before the busy harvest season begins.
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-1">
              <FaChartBar className="h-5 w-5 text-green-500" />
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-gray-900">Market Trends</h4>
              <p className="mt-1 text-sm text-gray-500">
                Organic produce prices are trending upward. Consider transitioning more crops to organic certification.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Weather Forecast</h3>
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500">Today</p>
            <p className="text-2xl font-semibold">32°C</p>
          </div>
          <div className="text-yellow-500">
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Tomorrow</p>
            <div className="flex items-center">
              <p className="text-sm font-medium mr-2">30°C</p>
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Wednesday</p>
            <div className="flex items-center">
              <p className="text-sm font-medium mr-2">28°C</p>
              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" />
              </svg>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Thursday</p>
            <div className="flex items-center">
              <p className="text-sm font-medium mr-2">27°C</p>
              <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const FarmerDashboard = () => {
  const user = useSelector((state) => state.auth.loginData);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: dashboardData, loading, error } = useApi(async () => {
    try {
      let productsRes;
      
      // Get products based on user role
      if (user?.role === 'admin') {
        console.log("Dashboard: Fetching all products for admin");
        productsRes = await productAPI.getAll();
      } else {
        // Farmers see only their products
        console.log("Dashboard: Fetching products for farmer with ID:", user?._id);
        productsRes = user?._id ? await productAPI.getByFarmer(user._id) : { data: [] };
      }
      
      const contractsRes = await contractAPI.getAll();
      
      console.log("Dashboard products response:", productsRes);
      console.log("Dashboard contracts response:", contractsRes);

      // Ensure data is in the expected format
      const products = Array.isArray(productsRes.data) ? productsRes.data : 
                      (productsRes.data?.products || []);
      
      const contracts = Array.isArray(contractsRes.data) ? contractsRes.data : 
                       (contractsRes.data?.contracts || []);
      
      console.log("Dashboard processed products:", products);
      console.log("Dashboard processed contracts:", contracts);
      
      // Now safely use array methods
      const activeContracts = contracts.filter(c => c?.status === 'active').length;
      const pendingContracts = contracts.filter(c => c?.status === 'pending').length;
      const completedContracts = contracts.filter(c => c?.status === 'completed').length;
      
      const totalRevenue = contracts.reduce((sum, c) => {
        const amount = c?.status === 'completed' ? (c?.totalAmount || 0) : 0;
        return sum + amount;
      }, 0);

      return {
        stats: {
          totalProducts: products.length,
          activeContracts,
          pendingContracts,
          totalRevenue,
          totalUsers: 0, // This would come from a users API endpoint
          completedContracts
        },
        recentContracts: contracts.slice(0, 5),
        products: products.slice(0, 5)
      };
    } catch (error) {
      console.error("Dashboard data fetch error:", error);
      throw new Error("Failed to load dashboard data. Please try again.");
    }
  }, [user]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
        <p className="font-medium">Error loading dashboard</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Loading your farm dashboard..." />;
  }

  return (
    <ErrorBoundary>
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user?.name || 'Farmer'}!
              </h1>
              <p className="text-gray-600 mt-1">
                Here's what's happening with your farm today
              </p>
            </div>
            <div className="mt-4 md:mt-0 space-x-3">
              <Link
                to="/products/manage"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                <FaWarehouse className="mr-2" />
                Manage Products
              </Link>
              <Link
                to="/contracts/manage"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <FaHandshake className="mr-2" />
                Manage Contracts
              </Link>
            </div>
          </div>

          <FarmerDashboardOverview data={dashboardData} />
          
          <div className="mt-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`${
                    activeTab === 'overview'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('products')}
                  className={`${
                    activeTab === 'products'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  My Products
                </button>
                <button
                  onClick={() => setActiveTab('contracts')}
                  className={`${
                    activeTab === 'contracts'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Contracts
                </button>
                <button
                  onClick={() => setActiveTab('insights')}
                  className={`${
                    activeTab === 'insights'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Farm Insights
                </button>
              </nav>
            </div>
          </div>

          <div className="mt-6">
            {activeTab === 'overview' && (
              <div>
                <MyProducts products={dashboardData?.products} />
                <RecentContracts contracts={dashboardData?.recentContracts} />
                <FarmInsights />
              </div>
            )}
            
            {activeTab === 'products' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">My Products</h2>
                  <Link
                    to="/products/add"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                  >
                    <FaSeedling className="mr-2" />
                    Add New Product
                  </Link>
                </div>
                <MyProducts products={dashboardData?.products} />
              </div>
            )}
            
            {activeTab === 'contracts' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">My Contracts</h2>
                  <div className="flex space-x-2">
                    <select className="border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-sm focus:outline-none focus:ring-green-500 focus:border-green-500">
                      <option value="all">All Contracts</option>
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                <RecentContracts contracts={dashboardData?.recentContracts} />
              </div>
            )}
            
            {activeTab === 'insights' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">Farm Insights</h2>
                </div>
                <FarmInsights />
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default FarmerDashboard; 