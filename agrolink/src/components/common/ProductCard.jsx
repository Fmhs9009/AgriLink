import React from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaLeaf, FaRupeeSign, FaShoppingCart, FaHeart } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const ProductCard = ({ product }) => {
  const {
    _id,
    name,
    description,
    price,
    unit = 'kg',
    images = [],
    isOrganic,
    organic,
    averageRating,
    totalReviews,
    farmer = {},
    stock = product.availableQuantity ?? 0
  } = product;

  // Use either isOrganic or organic property (for compatibility)
  const isProductOrganic = isOrganic || organic;
  
  // Default image if none provided
  const productImage = images?.[0] || 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg';
  
  // Format price with commas for thousands
  const formattedPrice = price?.toLocaleString('en-IN') || '0';
  
  // Handle wishlist click
  const handleWishlistClick = (e) => {
    e.preventDefault();
    // TODO: Implement wishlist functionality
    toast.success(`Added ${name} to wishlist`);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-transform hover:scale-[1.02] border border-gray-200">
      <Link to={`/product/${_id}`} className="block">
        <div className="relative h-48 bg-gray-200">
          <img
            src={productImage.url}
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg';
            }}
          />
          {isProductOrganic && (
            <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded-full text-sm flex items-center">
              <FaLeaf className="mr-1" />
              Organic
            </div>
          )}
          {stock <= 0 && (
            <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
              <span className="text-white font-bold text-lg">Out of Stock</span>
            </div>
          )}
        </div>
      </Link>
      
      <div className="p-4">
        <Link to={`/product/${_id}`} className="block">
          <h3 className="text-lg font-semibold mb-2 line-clamp-1 hover:text-green-600 transition-colors">{name}</h3>
        </Link>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{description || 'No description available'}</p>
        
        <div className="flex justify-between items-center mb-3">
          <div className="text-green-600 font-bold flex items-center">
            <FaRupeeSign className="mr-1" />
            {formattedPrice}/{unit}
          </div>
          {averageRating > 0 && (
            <div className="flex items-center text-sm">
              <FaStar className="text-yellow-400 mr-1" />
              <span>{averageRating.toFixed(1)}</span>
              {totalReviews > 0 && (
                <span className="text-gray-500 ml-1">({totalReviews})</span>
              )}
            </div>
          )}
        </div>
        
        {(farmer?.name || farmer?.location) && (
          <div className="mb-4 text-sm text-gray-600">
            {farmer.name && <p>Farmer: {farmer.name}</p>}
            {farmer.location && <p>Location: {farmer.location}</p>}
          </div>
        )}
        
        <div className="flex space-x-2">
          <Link
            to={`/products/${_id}`}
            className="flex-1 text-center bg-green-600 hover:bg-green-700 text-white py-2 rounded-md transition-colors flex items-center justify-center"
          >
            <FaShoppingCart className="mr-2" />
            View Details
          </Link>
          
          <button
            className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            title="Add to wishlist"
            onClick={handleWishlistClick}
          >
            <FaHeart className="text-red-500" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard; 