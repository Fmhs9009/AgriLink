import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { productAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FaLeaf, FaRupeeSign, FaShoppingBasket, FaInfoCircle } from 'react-icons/fa';
import Loader from '../layout/Loader';
import { formatCurrency } from '../../utils/helpers';

const CategoryProducts = () => {
  const { category } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await productAPI.getProductsByCategory(category);
        if (response.success) {
          setProducts(response.product || []);
        } else {
          setError('Failed to fetch products');
          toast.error('Failed to fetch products');
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        setError('Error fetching products');
        toast.error('Error fetching products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [category]);

  // Format category name for display
  const formatCategoryName = (category) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) return <Loader />;

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">{formatCategoryName(category)}</h1>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">No products found!</strong>
          <span className="block sm:inline"> There are no products available in this category at the moment.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{formatCategoryName(category)}</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <div key={product._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div className="relative h-48 overflow-hidden">
              {product.images && product.images.length > 0 ? (
                <img 
                  src={product.images[0].url} 
                  alt={product.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <FaLeaf className="text-gray-400 text-4xl" />
                </div>
              )}
              {product.organic && (
                <span className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  Organic
                </span>
              )}
            </div>
            
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-2 truncate">{product.name}</h2>
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
              
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <FaRupeeSign className="text-gray-700 mr-1" />
                  <span className="font-bold text-gray-700">{formatCurrency(product.price)}</span>
                  <span className="text-gray-500 text-sm ml-1">/ {product.unit}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-500">
                  <FaShoppingBasket className="mr-1" />
                  <span>{product.availableQuantity} {product.unit} available</span>
                </div>
              </div>
              
              <Link 
                to={`/product/${product._id}`}
                className="block w-full bg-green-600 hover:bg-green-700 text-white text-center py-2 rounded-md transition-colors duration-300 flex items-center justify-center"
              >
                <FaInfoCircle className="mr-2" />
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryProducts; 