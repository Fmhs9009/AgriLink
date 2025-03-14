import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { FaImage, FaUpload, FaTimes, FaSave, FaArrowLeft } from 'react-icons/fa';
import { productAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorBoundary from '../common/ErrorBoundary';

const ProductForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const user = useSelector((state) => state.auth.loginData);
  const isEditMode = !!id;

 // console.log("idddd:",id);
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    availableQuantity: '',
    unit: 'kg',
    minimumOrderQuantity: '1',
    growingPeriod: '90',
    currentGrowthStage: 'not_planted',
    estimatedHarvestDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    seasonalAvailability: {
      startMonth: 1,
      endMonth: 12
    },
    farmingPractices: ['Conventional'],
    waterSource: 'Rainfed',
    pesticidesUsed: true,
    soilType: '',
    organic: false,
    certification: 'None',
    openToCustomGrowing: true,
    contractPreferences: {
      minDuration: 30,
      maxDuration: 365,
      preferredPaymentTerms: 'Milestone'
    }
  });

  // Image upload state
  const [images, setImages] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Component state
  const [loading, setLoading] = useState(false);
  const [fetchingProduct, setFetchingProduct] = useState(isEditMode);
  const [error, setError] = useState(null);

  // Categories
  const categories = [
    'Vegetables',
    'Fruits',
    'Grains',
    'Pulses',
    'Oilseeds',
    'Spices',
    'Cash Crops',
    'Herbs',
    'Other'
  ];

  // Units
  const units = [
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'g', label: 'Gram (g)' },
    { value: 'ton', label: 'Ton' },
    { value: 'quintal', label: 'Quintal' },
    { value: 'acre', label: 'Acre' },
    { value: 'hectare', label: 'Hectare' }
  ];

  // Growth Stages
  const growthStages = [
    { value: 'seed', label: 'Seed' },
    { value: 'seedling', label: 'Seedling' },
    { value: 'vegetative', label: 'Vegetative' },
    { value: 'flowering', label: 'Flowering' },
    { value: 'fruiting', label: 'Fruiting' },
    { value: 'mature', label: 'Mature' },
    { value: 'harvested', label: 'Harvested' },
    { value: 'not_planted', label: 'Not Planted' }
  ];

  // Farming Practices
  const farmingPracticeOptions = [
    'Traditional',
    'Organic',
    'Natural',
    'Permaculture',
    'Biodynamic',
    'Hydroponic',
    'Aquaponic',
    'Conventional'
  ];

  // Water Sources
  const waterSourceOptions = [
    'Rainfed',
    'Canal',
    'Well',
    'Borewell',
    'River',
    'Pond',
    'Other'
  ];

  // Certification Types
  const certificationTypes = [
    'None',
    'Organic',
    'GAP',
    'PGS',
    'NPOP',
    'Global GAP',
    'Other'
  ];

  // Payment Terms
  const paymentTerms = [
    'Advance',
    'Milestone',
    'Delivery',
    'Custom'
  ];

  // Months for seasonal availability
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  // Fetch product data if in edit mode
  useEffect(() => {
    if (isEditMode) {
      const fetchProduct = async () => {
        try {
          setFetchingProduct(true);
          const response = await productAPI.getById(id);
          
          console.log(response);
          const productData = response.product;
          
          if (!productData) {
            toast.error('Product not found');
            navigate('/products/manage');
            return;
          }
          
          // Check if user is authorized to edit this product
          if (productData.farmer?._id !== user?._id && user?.role !== 'admin') {
            toast.error('You are not authorized to edit this product');
            navigate('/products/manage');
            return;
          }
          
          // Set form data
          setFormData({
            name: productData.name || '',
            description: productData.description || '',
            category: productData.category || '',
            price: productData.price?.toString() || '',
            availableQuantity: productData.availableQuantity?.toString() || '',
            unit: productData.unit || 'kg',
            minimumOrderQuantity: productData.minimumOrderQuantity?.toString() || '1',
            growingPeriod: productData.growingPeriod?.toString() || '90',
            currentGrowthStage: productData.currentGrowthStage || 'not_planted',
            estimatedHarvestDate: productData.estimatedHarvestDate ? new Date(productData.estimatedHarvestDate).toISOString().split('T')[0] : '',
            seasonalAvailability: productData.seasonalAvailability || {
              startMonth: 1,
              endMonth: 12
            },
            farmingPractices: productData.farmingPractices || ['Conventional'],
            waterSource: productData.waterSource || 'Rainfed',
            pesticidesUsed: productData.pesticidesUsed !== undefined ? productData.pesticidesUsed : true,
            soilType: productData.soilType || '',
            organic: productData.organic || false,
            certification: productData.certification || 'None',
            openToCustomGrowing: productData.openToCustomGrowing !== undefined ? productData.openToCustomGrowing : true,
            contractPreferences: productData.contractPreferences || {
              minDuration: 30,
              maxDuration: 365,
              preferredPaymentTerms: 'Milestone'
            }
          });
          
          // Set preview images
          if (productData.images && productData.images.length > 0) {
            setPreviewImages(productData.images.map(img => ({
              url: img.url || img,
              public_id: img.public_id,
              isUploaded: true
            })));
          }
        } catch (err) {
          console.error('Error fetching product:', err);
          setError('Failed to load product data');
          toast.error('Failed to load product data');
        } finally {
          setFetchingProduct(false);
        }
      };
      
      fetchProduct();
    }
  }, [id, isEditMode, navigate, user]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle image selection
  const handleImageSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // Validate file types and sizes
    const validFiles = selectedFiles.filter(file => {
      const isValidType = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB max
      
      if (!isValidType) {
        toast.error(`${file.name} is not a valid image type`);
      }
      
      if (!isValidSize) {
        toast.error(`${file.name} exceeds the 5MB size limit`);
      }
      
      return isValidType && isValidSize;
    });
    
    if (validFiles.length === 0) return;
    
    // Add to images array
    setImages(prev => [...prev, ...validFiles]);
    
    // Create preview URLs
    const newPreviews = validFiles.map(file => ({
      url: URL.createObjectURL(file),
      isUploaded: false
    }));
    
    setPreviewImages(prev => [...prev, ...newPreviews]);
  };

  // Remove image
  const handleRemoveImage = (index) => {
    // Remove from preview
    setPreviewImages(prev => {
      const newPreviews = [...prev];
      
      // If it's a local preview, revoke the object URL to prevent memory leaks
      if (!newPreviews[index].isUploaded) {
        URL.revokeObjectURL(newPreviews[index].url);
      }
      
      newPreviews.splice(index, 1);
      return newPreviews;
    });
    
    // Remove from images array if it's not already uploaded
    if (!previewImages[index].isUploaded) {
      setImages(prev => {
        const newImages = [...prev];
        newImages.splice(index, 1);
        return newImages;
      });
    }
  };

  // Upload images to Cloudinary
  const uploadImagesToCloudinary = async () => {
    if (images.length === 0) return [];
    
    setUploadingImages(true);
    setUploadProgress(0);
    
    const uploadedImages = [];
    
    try {
      // Use the productAPI.uploadImage function to upload images
      for (let i = 0; i < images.length; i++) {
        try {
          console.log(`Uploading image ${i+1}/${images.length}: ${images[i].name}`);
          
          // Use the API service to upload the image
          const response = await productAPI.uploadImage(images[i]);
          
          if (response && response.success && response.secure_url) {
            console.log(`Image ${i+1} uploaded successfully:`, response.secure_url);
            uploadedImages.push({
              url: response.secure_url,
              public_id: response.public_id
            });
            
            // Show success toast for each image
            toast.success(`Image ${i+1} uploaded successfully`);
          } else {
            console.error(`Failed to upload image ${i+1}:`, response);
            toast.error(`Failed to upload image ${i+1}: ${response?.message || 'Unknown error'}`);
          }
        } catch (uploadError) {
          console.error(`Error uploading image ${i+1}:`, uploadError);
          toast.error(`Failed to upload image ${i+1}: ${uploadError.message}`);
        }
        
        // Update progress
        setUploadProgress(Math.round(((i + 1) / images.length) * 100));
      }
      
      if (uploadedImages.length === 0 && images.length > 0) {
        toast.error('Failed to upload any images');
      } else if (uploadedImages.length < images.length) {
        toast.warning(`Uploaded ${uploadedImages.length} out of ${images.length} images`);
      } else {
        toast.success(`Successfully uploaded all ${uploadedImages.length} images`);
      }
      
      return uploadedImages;
    } catch (err) {
      console.error('Error in image upload process:', err);
      toast.error(`Failed to upload images: ${err.message}`);
      return [];
    } finally {
      setUploadingImages(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    
    if (!formData.description.trim()) {
      toast.error('Product description is required');
      return;
    }
    
    if (!formData.category) {
      toast.error('Category is required');
      return;
    }
    
    if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    
    if (!formData.availableQuantity || isNaN(parseInt(formData.availableQuantity)) || parseInt(formData.availableQuantity) < 0) {
      toast.error('Please enter a valid available quantity');
      return;
    }
    
    if (!formData.minimumOrderQuantity || isNaN(parseInt(formData.minimumOrderQuantity)) || parseInt(formData.minimumOrderQuantity) < 1) {
      toast.error('Please enter a valid minimum order quantity');
      return;
    }
    
    if (!formData.growingPeriod || isNaN(parseInt(formData.growingPeriod)) || parseInt(formData.growingPeriod) < 1) {
      toast.error('Please enter a valid growing period');
      return;
    }
    
    if (!formData.currentGrowthStage) {
      toast.error('Current growth stage is required');
      return;
    }
    
    if (!formData.estimatedHarvestDate) {
      toast.error('Estimated harvest date is required');
      return;
    }
    
    if (!formData.farmingPractices || formData.farmingPractices.length === 0) {
      toast.error('At least one farming practice must be selected');
      return;
    }
    
    if (!formData.waterSource) {
      toast.error('Water source is required');
      return;
    }
    
    try {
      setLoading(true);
      
      // Upload images if there are any new ones
      let productImages = previewImages.filter(img => img.isUploaded).map(img => ({
        url: img.url,
        public_id: img.public_id || img.url.split('/').pop().split('.')[0]
      }));
      
      console.log('Existing uploaded images:', productImages);
      
      if (images.length > 0) {
        console.log(`Uploading ${images.length} new images...`);
        const uploadedImages = await uploadImagesToCloudinary();
        console.log('New uploaded image URLs:', uploadedImages);
        
        if (uploadedImages.length > 0) {
          productImages = [...productImages, ...uploadedImages];
        } else {
          toast.error('Failed to upload images. Please try again.');
          setLoading(false);
          return;
        }
      }
      
      // Ensure at least one image
      if (productImages.length === 0) {
        toast.error('Please upload at least one product image');
        setLoading(false);
        return;
      }
      
      // Prepare product data
      const productData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: parseFloat(formData.price),
        availableQuantity: parseInt(formData.availableQuantity),
        unit: formData.unit,
        minimumOrderQuantity: parseInt(formData.minimumOrderQuantity),
        growingPeriod: parseInt(formData.growingPeriod),
        currentGrowthStage: formData.currentGrowthStage,
        estimatedHarvestDate: formData.estimatedHarvestDate,
        seasonalAvailability: formData.seasonalAvailability,
        farmingPractices: formData.farmingPractices,
        waterSource: formData.waterSource,
        pesticidesUsed: formData.pesticidesUsed,
        soilType: formData.soilType || '',
        organic: formData.organic,
        certification: formData.certification,
        images: productImages,
        openToCustomGrowing: formData.openToCustomGrowing
      };
      
      // Add contract preferences if open to custom growing
      if (formData.openToCustomGrowing) {
        productData.contractPreferences = formData.contractPreferences;
      }
      
      console.log('Submitting product data:', productData);
      
      let response;
      
      try {
        if (isEditMode) {
          // Update existing product
          console.log(`Updating product with ID: ${id}`);
          response = await productAPI.update(id, productData);
          console.log('Product update response:', response);
          
          if (response.success) {
            toast.success('Product updated successfully');
            // Navigate back to product management
            navigate('/products/manage');
          } else {
            toast.error(response.message || 'Failed to update product');
          }
        } else {
          // Create new product
          console.log('Creating new product');
          response = await productAPI.create(productData);
          console.log('Product creation response:', response);
          
          if (response.success) {
            // Log detailed information about the created product
            const createdProduct = response.product;
            console.group('🌟 PRODUCT UPLOAD SUCCESSFUL 🌟');
            console.log('Product ID:', createdProduct._id);
            console.log('Product Name:', createdProduct.name);
            console.log('Product Category:', createdProduct.category);
            console.log('Product Price:', createdProduct.price);
            console.log('Product Available Quantity:', createdProduct.availableQuantity);
            console.log('Product Description:', createdProduct.description);
            console.log('Product Images:', createdProduct.images);
            console.log('Created At:', createdProduct.createdAt);
            console.log('Created By:', createdProduct.farmer);
            
            // Log Cloudinary information
            console.group('📸 CLOUDINARY IMAGE INFORMATION 📸');
            createdProduct.images?.forEach((image, index) => {
              console.log(`Image ${index + 1}:`, image.url);
              console.log(`  Public ID: ${image.public_id}`);
            });
            console.groupEnd();
            console.groupEnd();
            
            toast.success('Product added successfully');
            // Navigate back to product management
            navigate('/products/manage');
          } else {
            toast.error(response.message || 'Failed to create product');
          }
        }
      } catch (apiError) {
        console.error('API error:', apiError);
        const errorMessage = apiError.response?.data?.message || 
                            apiError.message || 
                            'Failed to save product';
        toast.error(errorMessage);
      }
    } catch (err) {
      console.error('Error in product submission process:', err);
      toast.error('Failed to process product submission');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingProduct) {
    return <LoadingSpinner message="Loading product data..." />;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
        <p className="font-medium">Error</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <button
                onClick={() => navigate('/products/manage')}
                className="inline-flex items-center text-gray-600 hover:text-gray-900"
              >
                <FaArrowLeft className="mr-2" />
                Back to Products
              </button>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">
                {isEditMode ? 'Edit Product' : 'Add New Product'}
              </h1>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <form onSubmit={handleSubmit} className="p-6">
              {/* Basic Information Section */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Basic Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Product Name */}
                  <div className="md:col-span-2">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name*
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  
                  {/* Category */}
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                      Category*
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    >
                      <option value="">Select a category</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Description */}
                  <div className="md:col-span-2">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Description*
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows="4"
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    ></textarea>
                  </div>
                </div>
              </div>
              
              {/* Pricing and Inventory Section */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Pricing and Inventory</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Price */}
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                      Price (₹)*
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">₹</span>
                      </div>
                      <input
                        type="number"
                        id="price"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        className="block w-full pl-7 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                        required
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">per {formData.unit}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Unit */}
                  <div>
                    <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
                      Unit*
                    </label>
                    <select
                      id="unit"
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    >
                      {units.map(unit => (
                        <option key={unit.value} value={unit.value}>{unit.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Available Quantity */}
                  <div>
                    <label htmlFor="availableQuantity" className="block text-sm font-medium text-gray-700 mb-1">
                      Available Quantity*
                    </label>
                    <input
                      type="number"
                      id="availableQuantity"
                      name="availableQuantity"
                      value={formData.availableQuantity}
                      onChange={handleChange}
                      min="0"
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  
                  {/* Minimum Order Quantity */}
                  <div>
                    <label htmlFor="minimumOrderQuantity" className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Order Quantity*
                    </label>
                    <input
                      type="number"
                      id="minimumOrderQuantity"
                      name="minimumOrderQuantity"
                      value={formData.minimumOrderQuantity}
                      onChange={handleChange}
                      min="1"
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                </div>
              </div>
              
              {/* Growing Information Section */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Growing Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Growing Period */}
                  <div>
                    <label htmlFor="growingPeriod" className="block text-sm font-medium text-gray-700 mb-1">
                      Growing Period (days)*
                    </label>
                    <input
                      type="number"
                      id="growingPeriod"
                      name="growingPeriod"
                      value={formData.growingPeriod}
                      onChange={handleChange}
                      min="1"
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  
                  {/* Current Growth Stage */}
                  <div>
                    <label htmlFor="currentGrowthStage" className="block text-sm font-medium text-gray-700 mb-1">
                      Current Growth Stage*
                    </label>
                    <select
                      id="currentGrowthStage"
                      name="currentGrowthStage"
                      value={formData.currentGrowthStage}
                      onChange={handleChange}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    >
                      {growthStages.map(stage => (
                        <option key={stage.value} value={stage.value}>{stage.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Estimated Harvest Date */}
                  <div>
                    <label htmlFor="estimatedHarvestDate" className="block text-sm font-medium text-gray-700 mb-1">
                      Estimated Harvest Date*
                    </label>
                    <input
                      type="date"
                      id="estimatedHarvestDate"
                      name="estimatedHarvestDate"
                      value={formData.estimatedHarvestDate}
                      onChange={handleChange}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  
                  {/* Soil Type */}
                  <div>
                    <label htmlFor="soilType" className="block text-sm font-medium text-gray-700 mb-1">
                      Soil Type
                    </label>
                    <input
                      type="text"
                      id="soilType"
                      name="soilType"
                      value={formData.soilType}
                      onChange={handleChange}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
              </div>
              
              {/* Seasonal Availability */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Seasonal Availability</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Start Month */}
                  <div>
                    <label htmlFor="seasonalAvailabilityStartMonth" className="block text-sm font-medium text-gray-700 mb-1">
                      Available From*
                    </label>
                    <select
                      id="seasonalAvailabilityStartMonth"
                      name="seasonalAvailabilityStartMonth"
                      value={formData.seasonalAvailability.startMonth}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        setFormData({
                          ...formData,
                          seasonalAvailability: {
                            ...formData.seasonalAvailability,
                            startMonth: value
                          }
                        });
                      }}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    >
                      {months.map(month => (
                        <option key={month.value} value={month.value}>{month.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* End Month */}
                  <div>
                    <label htmlFor="seasonalAvailabilityEndMonth" className="block text-sm font-medium text-gray-700 mb-1">
                      Available Until*
                    </label>
                    <select
                      id="seasonalAvailabilityEndMonth"
                      name="seasonalAvailabilityEndMonth"
                      value={formData.seasonalAvailability.endMonth}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        setFormData({
                          ...formData,
                          seasonalAvailability: {
                            ...formData.seasonalAvailability,
                            endMonth: value
                          }
                        });
                      }}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    >
                      {months.map(month => (
                        <option key={month.value} value={month.value}>{month.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Farming Practices */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Farming Practices</h2>
                <div className="grid grid-cols-1 gap-6">
                  {/* Farming Practices */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Farming Practices*
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {farmingPracticeOptions.map(practice => (
                        <div key={practice} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`practice-${practice}`}
                            checked={formData.farmingPractices.includes(practice)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  farmingPractices: [...formData.farmingPractices, practice]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  farmingPractices: formData.farmingPractices.filter(p => p !== practice)
                                });
                              }
                            }}
                            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`practice-${practice}`} className="ml-2 block text-sm text-gray-900">
                            {practice}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Water Source */}
                  <div>
                    <label htmlFor="waterSource" className="block text-sm font-medium text-gray-700 mb-1">
                      Water Source*
                    </label>
                    <select
                      id="waterSource"
                      name="waterSource"
                      value={formData.waterSource}
                      onChange={handleChange}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    >
                      {waterSourceOptions.map(source => (
                        <option key={source} value={source}>{source}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Certification */}
                  <div>
                    <label htmlFor="certification" className="block text-sm font-medium text-gray-700 mb-1">
                      Certification
                    </label>
                    <select
                      id="certification"
                      name="certification"
                      value={formData.certification}
                      onChange={handleChange}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    >
                      {certificationTypes.map(cert => (
                        <option key={cert} value={cert}>{cert}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Checkboxes */}
                  <div className="flex flex-wrap gap-6">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="organic"
                        name="organic"
                        checked={formData.organic}
                        onChange={handleChange}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <label htmlFor="organic" className="ml-2 block text-sm text-gray-900">
                        Organic Product
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="pesticidesUsed"
                        name="pesticidesUsed"
                        checked={formData.pesticidesUsed}
                        onChange={handleChange}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <label htmlFor="pesticidesUsed" className="ml-2 block text-sm text-gray-900">
                        Pesticides Used
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="openToCustomGrowing"
                        name="openToCustomGrowing"
                        checked={formData.openToCustomGrowing}
                        onChange={handleChange}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <label htmlFor="openToCustomGrowing" className="ml-2 block text-sm text-gray-900">
                        Open to Custom Growing Arrangements
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Contract Preferences (Only shown if openToCustomGrowing is true) */}
              {formData.openToCustomGrowing && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Contract Preferences</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Min Duration */}
                    <div>
                      <label htmlFor="contractMinDuration" className="block text-sm font-medium text-gray-700 mb-1">
                        Minimum Contract Duration (days)
                      </label>
                      <input
                        type="number"
                        id="contractMinDuration"
                        name="contractMinDuration"
                        value={formData.contractPreferences.minDuration}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          setFormData({
                            ...formData,
                            contractPreferences: {
                              ...formData.contractPreferences,
                              minDuration: value
                            }
                          });
                        }}
                        min="1"
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    
                    {/* Max Duration */}
                    <div>
                      <label htmlFor="contractMaxDuration" className="block text-sm font-medium text-gray-700 mb-1">
                        Maximum Contract Duration (days)
                      </label>
                      <input
                        type="number"
                        id="contractMaxDuration"
                        name="contractMaxDuration"
                        value={formData.contractPreferences.maxDuration}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          setFormData({
                            ...formData,
                            contractPreferences: {
                              ...formData.contractPreferences,
                              maxDuration: value
                            }
                          });
                        }}
                        min={formData.contractPreferences.minDuration}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    
                    {/* Preferred Payment Terms */}
                    <div>
                      <label htmlFor="preferredPaymentTerms" className="block text-sm font-medium text-gray-700 mb-1">
                        Preferred Payment Terms
                      </label>
                      <select
                        id="preferredPaymentTerms"
                        name="preferredPaymentTerms"
                        value={formData.contractPreferences.preferredPaymentTerms}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            contractPreferences: {
                              ...formData.contractPreferences,
                              preferredPaymentTerms: e.target.value
                            }
                          });
                        }}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      >
                        {paymentTerms.map(term => (
                          <option key={term} value={term}>{term}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Image Upload */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Product Images</h2>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <FaImage className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="images" className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500">
                        <span>Upload images</span>
                        <input
                          id="images"
                          name="images"
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="sr-only"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, WEBP up to 5MB
                    </p>
                  </div>
                </div>
                
                {/* Image Previews */}
                {previewImages.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Images</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {previewImages.map((preview, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-md bg-gray-200">
                            <img
                              src={preview.url}
                              alt={`Preview ${index + 1}`}
                              className="h-full w-full object-cover object-center"
                            />
                            {preview.isUploaded && (
                              <div className="absolute top-0 right-0 bg-green-500 text-white text-xs px-1 py-0.5 rounded-bl-md">
                                Uploaded
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <FaTimes size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Upload Progress */}
                {uploadingImages && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">Uploading images...</span>
                      <span className="text-sm font-medium text-gray-700">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-green-600 h-2.5 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate('/products/manage')}
                  className="mr-3 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || uploadingImages}
                  className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                    (loading || uploadingImages) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <FaSave className="mr-2" />
                  {loading ? 'Saving...' : isEditMode ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ProductForm; 