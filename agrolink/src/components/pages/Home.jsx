import React from 'react';
import { Link } from 'react-router-dom';
import HeroSection from '../home/HeroSection';

const CategorySection = () => {
  const categories = [
    { id: 1, name: 'Vegetables', slug: 'vegetables', icon: '🥦' },
    { id: 2, name: 'Fruits', slug: 'fruits', icon: '🍎' },
    { id: 3, name: 'Grains', slug: 'grains', icon: '🌾' },
    { id: 4, name: 'Dairy', slug: 'dairy', icon: '🥛' },
    { id: 5, name: 'Herbs', slug: 'herbs', icon: '🌿' },
    { id: 6, name: 'Nuts', slug: 'nuts', icon: '🥜' }
  ];

  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-8">Browse by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/category/${category.slug}`}
              className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center justify-center hover:shadow-lg transition-shadow duration-300"
            >
              <span className="text-4xl mb-3">{category.icon}</span>
              <h3 className="text-lg font-medium text-gray-800">{category.name}</h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

const Home = () => {
  return (
    <div>
      {/* Hero Section */}
      <HeroSection />
      
      {/* Category Section */}
      <CategorySection />
      
      {/* Featured Products */}
      {/* ... existing code ... */}
    </div>
  );
};

export default Home; 