import React from 'react';
import { useApi } from '../../hooks/useApi';
import { productService } from '../../services/productService';
import LoadingSpinner from '../common/LoadingSpinner';
import { Link } from 'react-router-dom';

const FeaturedProducts = () => {
  const { data: products, loading, error } = useApi(
    productService.getAllProducts,
    [] // Execute on mount with empty dependencies array
  );

  if (loading) return <LoadingSpinner />;
  if (error) return null;

  const featuredProducts = products?.slice(0, 3) || [];
console.log(featuredProducts);
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Featured Contracts</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featuredProducts.map((product) => (
            <div key={product._id} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="h-48 bg-gray-200">
                {product.images?.[0] && (
                  <img
                    src={product.images[0].url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
                <p className="text-gray-600 mb-4 line-clamp-2">{product.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-green-600 font-bold">₹{product.price}/{product.unit}</span>
                  <Link
                    to={`/product/${product._id}`}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts; 