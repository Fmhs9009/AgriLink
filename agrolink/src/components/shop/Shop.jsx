import React, { useState, useEffect } from 'react';
import { productAPI, categoryAPI } from '../../services/api';
import FilterSection from './FilterSection';
import ProductCard from '../common/ProductCard';
import SearchBar from './SearchBar';
import NoResults from './NoResults';
import LoadingSpinner from '../common/LoadingSpinner';
import { toast } from 'react-hot-toast';

// Mock data for fallback when API fails
const MOCK_PRODUCTS = [
  {
    _id: 'mock1',
    name: 'Organic Rice',
    description: 'Premium quality organic rice grown without pesticides',
    price: 120,
    unit: 'kg',
    category: 'Grains',
    stock: 100,
    isOrganic: true,
    isFeatured: true,
    images: ['https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'],
    farmer: {
      _id: '1',
      name: 'Ramesh Kumar',
      location: 'Punjab'
    },
    createdAt: new Date().toISOString(),
    averageRating: 4.5,
    totalReviews: 12
  },
  {
    _id: 'mock2',
    name: 'Premium Wheat',
    description: 'High-quality wheat for all your baking needs',
    price: 80,
    unit: 'kg',
    category: 'Grains',
    stock: 150,
    isOrganic: false,
    isFeatured: true,
    images: ['https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'],
    farmer: {
      _id: '2',
      name: 'Suresh Patel',
      location: 'Gujarat'
    },
    createdAt: new Date().toISOString(),
    averageRating: 4.2,
    totalReviews: 8
  },
  {
    _id: 'mock3',
    name: 'Fresh Tomatoes',
    description: 'Juicy and ripe tomatoes freshly harvested',
    price: 60,
    unit: 'kg',
    category: 'Vegetables',
    stock: 80,
    isOrganic: true,
    isFeatured: false,
    images: ['https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'],
    farmer: {
      _id: '3',
      name: 'Anita Sharma',
      location: 'Maharashtra'
    },
    createdAt: new Date().toISOString(),
    averageRating: 4.8,
    totalReviews: 15
  },
  {
    _id: 'mock4',
    name: 'Organic Potatoes',
    description: 'Farm-fresh organic potatoes',
    price: 40,
    unit: 'kg',
    category: 'Vegetables',
    stock: 200,
    isOrganic: true,
    isFeatured: false,
    images: ['https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'],
    farmer: {
      _id: '3',
      name: 'Anita Sharma',
      location: 'Maharashtra'
    },
    createdAt: new Date().toISOString(),
    averageRating: 4.0,
    totalReviews: 10
  },
  {
    _id: 'mock5',
    name: 'Basmati Rice',
    description: 'Premium long-grain aromatic rice',
    price: 150,
    unit: 'kg',
    category: 'Grains',
    stock: 120,
    isOrganic: false,
    isFeatured: true,
    images: ['https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'],
    farmer: {
      _id: '1',
      name: 'Ramesh Kumar',
      location: 'Punjab'
    },
    createdAt: new Date().toISOString(),
    averageRating: 4.7,
    totalReviews: 20
  },
  {
    _id: 'mock6',
    name: 'Organic Apples',
    description: 'Sweet and juicy organic apples',
    price: 180,
    unit: 'kg',
    category: 'Fruits',
    stock: 75,
    isOrganic: true,
    isFeatured: true,
    images: ['https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'],
    farmer: {
      _id: '4',
      name: 'Vikram Singh',
      location: 'Himachal Pradesh'
    },
    createdAt: new Date().toISOString(),
    averageRating: 4.9,
    totalReviews: 18
  }
];

// Mock categories for fallback
const MOCK_CATEGORIES = ['All', 'Grains', 'Vegetables', 'Fruits', 'Dairy', 'Spices'];

const Shop = () => {
  // State management
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useMockData, setUseMockData] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortOption, setSortOption] = useState('newest');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 5000 });
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'newest',
    organic: false
  });

  // Fetch products and categories on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Try to fetch products from API
        const productsResponse = await productAPI.getAll();
       
        if (productsResponse && productsResponse.success ) {
          setProducts(productsResponse.products);
          setUseMockData(false);
        } else {
          // If API returns empty data, use mock data
    
          setProducts(MOCK_PRODUCTS);
          setUseMockData(true);
          toast('Using demo products for preview', {
            icon: '⚠️',
            style: {
              borderRadius: '10px',
              background: '#FEF3C7',
              color: '#92400E',
            },
          });
        }
        
        // Try to fetch categories from API
        try {
          // Use mock categories directly instead of API call
          setCategories(MOCK_CATEGORIES);
          
          /* Commenting out API call that's causing 404 error
          const categoriesResponse = await productAPI.getProductCategories();
          if (categoriesResponse && categoriesResponse.success && categoriesResponse.data && categoriesResponse.data.length > 0) {
            setCategories(['All', ...categoriesResponse.data]);
          } else {
            // If API returns empty categories, use mock categories
            setCategories(MOCK_CATEGORIES);
          }
          */
        } catch (categoryError) {
          console.error('Error fetching categories:', categoryError);
          setCategories(MOCK_CATEGORIES);
        }
        
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Could not connect to server. Using demo data for preview.');
        
        // Use mock data as fallback
        setProducts(MOCK_PRODUCTS);
        setCategories(MOCK_CATEGORIES);
        setUseMockData(true);
        toast('Using demo products for preview', {
          icon: '⚠️',
          style: {
            borderRadius: '10px',
            background: '#FEF3C7',
            color: '#92400E',
          },
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Filter handlers
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSortOption('newest');
    setPriceRange({ min: 0, max: 5000 });
    setFilters({
      category: '',
      minPrice: '',
      maxPrice: '',
      sortBy: 'newest',
      organic: false
    });
  };

  // Filter products based on all criteria
  const filteredProducts = products.filter(product => {
    // Category filter
    if (selectedCategory !== 'All' && product.category !== selectedCategory) return false;
    
    // Price range filter
    if (product.price < priceRange.min || product.price > priceRange.max) return false;
    
    // Organic filter
    if (filters.organic && !product.isOrganic) return false;
    
    // Search query filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        product.name.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.category?.toLowerCase().includes(searchLower) ||
        product.farmer?.name?.toLowerCase().includes(searchLower) ||
        product.farmer?.location?.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  // Sort filtered products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortOption) {
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'rating':
        return (b.averageRating || 0) - (a.averageRating || 0);
      case 'newest':
      default:
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
        AgroLink Marketplace
      </h1>

      {useMockData && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Using demo data for preview. Connect to a backend API for real data.
              </p>
            </div>
          </div>
        </div>
      )}

      <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters */}
        <div className="md:w-1/4">
          <FilterSection
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            filters={filters}
            handleFilterChange={handleFilterChange}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            sortOption={sortOption}
            setSortOption={setSortOption}
            resetFilters={resetFilters}
            products={products}
          />
        </div>

        {/* Products Grid */}
        <div className="md:w-3/4">
          {isLoading ? (
            <LoadingSpinner />
          ) : sortedProducts.length > 0 ? (
            <>
              <p className="text-gray-600 mb-4">
                Showing {sortedProducts.length} of {products.length} products
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedProducts.map(product => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            </>
          ) : (
            <NoResults resetFilters={resetFilters} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Shop; 