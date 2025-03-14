const Product = require('../Model/Product');
const User = require('../Model/User');
const { cloudinary } = require('../config/cloudinary');
const ErrorHandler = require('../utils/errorHandler');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const fs = require('fs');

// Add a new product
exports.addProduct = async (req, res) => {
    try {
        const { title, description, price, quantity, category, unit } = req.body;
        const farmer = req.user.id; // Getting farmer ID from authenticated user

        // Handle image uploads
        const imageUrls = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                // Upload file from local path to Cloudinary
                const result = await cloudinary.uploader.upload(file.path, {
                    folder: 'agrolink_products'
                });
                
                imageUrls.push({
                    public_id: result.public_id,
                    url: result.secure_url
                });
                
                // Clean up local file after upload
                fs.unlinkSync(file.path);
            }
        }

        const product = await Product.create({
            title,
            description,
            price,
            quantity,
            category,
            unit,
            farmer,
            images: imageUrls
        });

        res.status(201).json({
            success: true,
            product
        });
    } catch (error) {
        console.error("Error creating product:", error);
        res.status(500).json({
            success: false,
            message: "Error creating product",
            error: error.message
        });
    }
};

// Get all products by farmer
exports.getFarmerProducts = catchAsyncErrors(async (req, res, next) => {
    try {
        console.log("=== GETTING FARMER PRODUCTS ===");
        console.log("Farmer ID:", req.user.id);
        
        // Method 1: Get products directly from Product model
        console.log("Fetching products from Product model...");
        const products = await Product.find({ 
            farmer: req.user.id,
            status: { $ne: 'deleted' }
        }).sort({ createdAt: -1 });
        
        console.log(`Found ${products.length} products for farmer`);
        
        // Method 2: Get products from User model (as a backup/verification)
        console.log("Fetching farmer with populated products...");
        const farmer = await User.findById(req.user.id)
            .populate({
                path: 'Products',
                match: { status: { $ne: 'deleted' } },
                options: { sort: { createdAt: -1 } }
            });
        
        if (!farmer) {
            console.error("Farmer not found");
            return next(new ErrorHandler('Farmer not found', 404));
        }
        
        console.log(`Found ${farmer.Products.length} products in farmer's Products array`);
        
        // Ensure consistency between the two methods
        if (products.length !== farmer.Products.length) {
            console.warn("Inconsistency detected between Product model and User.Products array");
            console.warn(`Product model: ${products.length}, User.Products: ${farmer.Products.length}`);
            
            // Sync the Products array in User model with actual products
            const productIds = products.map(product => product._id);
            await User.findByIdAndUpdate(
                req.user.id,
                { Products: productIds },
                { new: true }
            );
            console.log("Synced farmer's Products array with actual products");
        }

        res.status(200).json({
            success: true,
            products,
            count: products.length
        });
    } catch (error) {
        console.error('Error in getFarmerProducts:', error);
        return next(new ErrorHandler(error.message, 500));
    }
});

// Update product
exports.updateProduct = catchAsyncErrors(async (req, res, next) => {
    try {
        console.log("=== PRODUCT UPDATE PROCESS STARTED ===");
        console.log("Product ID:", req.params.id);
        console.log("User ID:", req.user.id);
        console.log("Request body:", req.body);
        console.log("Request files:", req.files);
        
        let product = await Product.findById(req.params.id);
        
        if (!product) {
            console.error("Product not found");
            return next(new ErrorHandler('Product not found', 404));
        }

        // Verify ownership
        if (product.farmer.toString() !== req.user.id.toString()) {
            console.error("Not authorized to update this product");
            return next(new ErrorHandler('Not authorized to update this product', 403));
        }

        // Handle image updates if any
        if (req.files && req.files.images) {
            console.log("Processing direct file uploads for update");
            const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
            console.log("Number of files to upload:", images.length);
            
            // Delete old images from Cloudinary
            console.log("Deleting old images from Cloudinary...");
            for (const image of product.images) {
                try {
                    await cloudinary.uploader.destroy(image.public_id);
                    console.log("Deleted image:", image.public_id);
                } catch (error) {
                    console.error("Error deleting image from Cloudinary:", error);
                }
            }

            // Upload new images
            const imageUrls = [];
            for (const image of images) {
                try {
                    console.log("Uploading file:", image.name);
                    const result = await cloudinary.uploader.upload(image.tempFilePath, {
                        folder: 'products',
                        crop: "scale"
                    });
                    
                    console.log("Cloudinary upload result:", result.public_id);
                    
                    imageUrls.push({
                        public_id: result.public_id,
                        url: result.secure_url
                    });
                    
                    // Clean up temp file
                    fs.unlink(image.tempFilePath, (err) => {
                        if (err) console.error('Error deleting temp file:', err);
                    });
                } catch (error) {
                    console.error('Error uploading image:', error);
                    return next(new ErrorHandler('Error uploading images', 500));
                }
            }
            req.body.images = imageUrls;
            console.log("New images:", imageUrls);
        }
        
        // Check for imageUrls in array format (from FormData)
        if (req.body['imageUrls[0]']) {
            console.log("Checking for imageUrls in array format for update");
            const urlKeys = Object.keys(req.body).filter(key => key.startsWith('imageUrls['));
            const publicIdKeys = Object.keys(req.body).filter(key => key.startsWith('imagePublicIds['));
            
            console.log("URL keys:", urlKeys);
            console.log("Public ID keys:", publicIdKeys);
            
            if (urlKeys.length > 0 && publicIdKeys.length > 0) {
                const images = [];
                for (let i = 0; i < urlKeys.length; i++) {
                    const urlKey = `imageUrls[${i}]`;
                    const publicIdKey = `imagePublicIds[${i}]`;
                    
                    if (req.body[urlKey] && req.body[publicIdKey]) {
                        images.push({
                            public_id: req.body[publicIdKey],
                            url: req.body[urlKey]
                        });
                    }
                }
                
                console.log("Final image objects from array format for update:", images);
                req.body.images = images;
            }
        }
        
        // Process seasonal availability
        if (req.body['seasonalAvailability[startMonth]'] && req.body['seasonalAvailability[endMonth]']) {
            console.log("Processing seasonal availability for update");
            req.body.seasonalAvailability = {
                startMonth: parseInt(req.body['seasonalAvailability[startMonth]']),
                endMonth: parseInt(req.body['seasonalAvailability[endMonth]'])
            };
            console.log("Seasonal availability:", req.body.seasonalAvailability);
        }
        
        // Process farming practices
        if (req.body.farmingPractices) {
            console.log("Processing farming practices for update");
            if (!Array.isArray(req.body.farmingPractices)) {
                req.body.farmingPractices = [req.body.farmingPractices];
            }
            console.log("Farming practices:", req.body.farmingPractices);
        }
        
        // Process contract preferences
        if (req.body.openToCustomGrowing === 'true' || req.body.openToCustomGrowing === true) {
            console.log("Processing contract preferences for update");
            req.body.contractPreferences = {
                minDuration: parseInt(req.body['contractPreferences[minDuration]']) || 30,
                maxDuration: parseInt(req.body['contractPreferences[maxDuration]']) || 365,
                preferredPaymentTerms: req.body['contractPreferences[preferredPaymentTerms]'] || 'Milestone'
            };
            console.log("Contract preferences:", req.body.contractPreferences);
        }

        // Update product
        console.log("Updating product in database...");
        product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        console.log("Product updated successfully");

        res.status(200).json({
            success: true,
            product
        });
    } catch (error) {
        console.error('Error in updateProduct:', error);
        return next(new ErrorHandler(error.message, 500));
    }
});

// Delete product (soft delete)
exports.deleteProduct = catchAsyncErrors(async (req, res, next) => {
    try {
        console.log("=== PRODUCT DELETION PROCESS STARTED ===");
        console.log("Product ID:", req.params.id);
        console.log("User ID:", req.user.id);
        
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            console.error("Product not found");
            return next(new ErrorHandler('Product not found', 404));
        }

        // Verify ownership
        if (product.farmer.toString() !== req.user.id.toString()) {
            console.error("Not authorized to delete this product");
            return next(new ErrorHandler('Not authorized to delete this product', 403));
        }

        // Soft delete by updating status
        console.log("Soft deleting product...");
        product.status = 'deleted';
        await product.save();
        console.log("Product soft deleted successfully");
        
        // Remove product from farmer's Products array
        console.log("Removing product from farmer's Products array...");
        await User.findByIdAndUpdate(
            req.user.id,
            { $pull: { Products: req.params.id } },
            { new: true }
        );
        console.log("Product removed from farmer's Products array successfully");

        res.status(200).json({
            success: true,
            message: "Product deleted successfully"
        });
    } catch (error) {
        console.error('Error in deleteProduct:', error);
        return next(new ErrorHandler(error.message, 500));
    }
});

// Get all products with filters, search, and pagination
exports.getAllProducts = catchAsyncErrors(async (req, res, next) => {
    const { 
        category, 
        minPrice, 
        maxPrice, 
        sort, 
        search, 
        organic, 
        certification,
        page = 1, 
        limit = 10 
    } = req.query;

    const query = {};

    // Apply filters
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }

    if (category) query.category = category;
    if (organic) query.organic = organic === 'true';
    if (certification) query.certification = certification;
    if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = Number(minPrice);
        if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Only show active products
    query.status = 'active';

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build query
    let productsQuery = Product.find(query)
        .populate('farmer', 'name email')
        .skip(skip)
        .limit(Number(limit));

    // Apply sorting
    if (sort) {
        const sortOptions = {
            'price_asc': { price: 1 },
            'price_desc': { price: -1 },
            'rating_desc': { averageRating: -1 },
            'newest': { createdAt: -1 }
        };
        productsQuery = productsQuery.sort(sortOptions[sort] || sortOptions['newest']);
    } else {
        productsQuery = productsQuery.sort({ createdAt: -1 });
    }

    // Execute query
    const [products, total] = await Promise.all([
        productsQuery.exec(),
        Product.countDocuments(query)
    ]);

    res.status(200).json({
        success: true,
        products,
        total,
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit)
    });
});

// Create a new product
exports.createProduct = catchAsyncErrors(async (req, res, next) => {
    try {
        console.log("=== PRODUCT CREATION PROCESS STARTED ===");
        console.log("Request body:", req.body);
        console.log("Request files:", req.files);
        console.log("User ID:", req.user.id);
        
        const { 
            name, 
            description, 
            price, 
            category, 
            availableQuantity, 
            unit, 
            minimumOrderQuantity,
            growingPeriod,
            currentGrowthStage,
            estimatedHarvestDate,
            waterSource,
            pesticidesUsed,
            soilType,
            organic,
            certification,
            openToCustomGrowing,
            imageUrls,
            imagePublicIds
        } = req.body;
        
        // Validate required fields
        if (!name || !description || !price || !category || !availableQuantity || !unit) {
            console.error("Missing required fields");
            return next(new ErrorHandler('Please fill all required fields', 400));
        }

        console.log("Required fields validation passed");
        
        // Process images
        let images = [];
        
        // If image URLs and public IDs are provided (pre-uploaded to Cloudinary)
        if (imageUrls && imagePublicIds) {
            console.log("Processing pre-uploaded images");
            console.log("Image URLs:", imageUrls);
            console.log("Image Public IDs:", imagePublicIds);
            
            // Convert to arrays if single values
            const urls = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
            const publicIds = Array.isArray(imagePublicIds) ? imagePublicIds : [imagePublicIds];
            
            console.log("Processed URLs:", urls);
            console.log("Processed Public IDs:", publicIds);
            
            // Create image objects
            for (let i = 0; i < urls.length; i++) {
                if (urls[i] && publicIds[i]) {
                    images.push({
                        public_id: publicIds[i],
                        url: urls[i]
                    });
                }
            }
            
            console.log("Final image objects from pre-uploaded images:", images);
        }
        
        // Handle direct file uploads if any
        if (req.files && req.files.images) {
            console.log("Processing direct file uploads");
            const uploadedFiles = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
            console.log("Number of files to upload:", uploadedFiles.length);
            
            for (const file of uploadedFiles) {
                try {
                    console.log("Uploading file:", file.name);
                    const result = await cloudinary.uploader.upload(file.tempFilePath, {
                        folder: 'products',
                        crop: "scale"
                    });
                    
                    console.log("Cloudinary upload result:", result.public_id);
                    
                    images.push({
                        public_id: result.public_id,
                        url: result.secure_url
                    });
                    
                    // Clean up temp file
                    fs.unlink(file.tempFilePath, (err) => {
                        if (err) console.error('Error deleting temp file:', err);
                    });
                } catch (error) {
                    console.error('Error uploading image:', error);
                    return next(new ErrorHandler('Error uploading images', 500));
                }
            }
            
            console.log("Final image objects after direct uploads:", images);
        }
        
        // Check for imageUrls in array format (from FormData)
        if (!images.length) {
            console.log("Checking for imageUrls in array format");
            const urlKeys = Object.keys(req.body).filter(key => key.startsWith('imageUrls['));
            const publicIdKeys = Object.keys(req.body).filter(key => key.startsWith('imagePublicIds['));
            
            console.log("URL keys:", urlKeys);
            console.log("Public ID keys:", publicIdKeys);
            
            if (urlKeys.length > 0 && publicIdKeys.length > 0) {
                for (let i = 0; i < urlKeys.length; i++) {
                    const urlKey = `imageUrls[${i}]`;
                    const publicIdKey = `imagePublicIds[${i}]`;
                    
                    if (req.body[urlKey] && req.body[publicIdKey]) {
                        images.push({
                            public_id: req.body[publicIdKey],
                            url: req.body[urlKey]
                        });
                    }
                }
                
                console.log("Final image objects from array format:", images);
            }
        }
        
        // Process seasonal availability
        console.log("Processing seasonal availability");
        let seasonalAvailability = {
            startMonth: 1,
            endMonth: 12
        };
        
        if (req.body['seasonalAvailability[startMonth]'] && req.body['seasonalAvailability[endMonth]']) {
            seasonalAvailability = {
                startMonth: parseInt(req.body['seasonalAvailability[startMonth]']),
                endMonth: parseInt(req.body['seasonalAvailability[endMonth]'])
            };
        }
        
        console.log("Seasonal availability:", seasonalAvailability);
        
        // Process farming practices
        console.log("Processing farming practices");
        let farmingPractices = ['Conventional'];
        if (req.body.farmingPractices) {
            if (Array.isArray(req.body.farmingPractices)) {
                farmingPractices = req.body.farmingPractices;
            } else {
                // If it's a single value, convert to array
                farmingPractices = [req.body.farmingPractices];
            }
        }
        
        console.log("Farming practices:", farmingPractices);
        
        // Process contract preferences
        console.log("Processing contract preferences");
        let contractPreferences = null;
        if (openToCustomGrowing === 'true' || openToCustomGrowing === true) {
            contractPreferences = {
                minDuration: parseInt(req.body['contractPreferences[minDuration]']) || 30,
                maxDuration: parseInt(req.body['contractPreferences[maxDuration]']) || 365,
                preferredPaymentTerms: req.body['contractPreferences[preferredPaymentTerms]'] || 'Milestone'
            };
        }
        
        console.log("Contract preferences:", contractPreferences);

        // Prepare product data
        const productData = {
            name,
            description,
            price: parseFloat(price),
            category,
            availableQuantity: parseInt(availableQuantity),
            unit,
            minimumOrderQuantity: parseInt(minimumOrderQuantity) || 1,
            growingPeriod: parseInt(growingPeriod) || 90,
            currentGrowthStage: currentGrowthStage || 'not_planted',
            estimatedHarvestDate: new Date(estimatedHarvestDate),
            seasonalAvailability,
            farmingPractices,
            waterSource: waterSource || 'Rainfed',
            pesticidesUsed: pesticidesUsed === 'true' || pesticidesUsed === true,
            soilType: soilType || '',
            organic: organic === 'true' || organic === true,
            certification: certification || 'None',
            openToCustomGrowing: openToCustomGrowing === 'true' || openToCustomGrowing === true,
            contractPreferences,
            images,
            farmer: req.user.id,
            status: 'active'
        };

        console.log('Creating product with processed data:', productData);
        
        console.log("Saving product to database...");
        const product = await Product.create(productData);
        console.log("Product created successfully with ID:", product._id);

        // Add product to farmer's Products array
        console.log("Adding product to farmer's Products array...");
        await User.findByIdAndUpdate(
            req.user.id,
            { $push: { Products: product._id } },
            { new: true }
        );
        console.log("Product added to farmer's Products array successfully");

        res.status(201).json({
            success: true,
            product
        });
    } catch (error) {
        console.error('Error in createProduct:', error);
        return next(new ErrorHandler(error.message, 500));
    }
});

// Get single product details
exports.getProductDetails = catchAsyncErrors(async (req, res, next) => {
   
    const product = await Product.findById(req.params.id)
        .populate('farmer', 'name email')
        .populate('ratings.user', 'name');
console.log("efefwefwef",product);
    if (!product) {
        return next(new ErrorHandler('Product not found', 404));
    }

    res.status(200).json({
        success: true,
        product
    });
});

// Add/Update product review
exports.createProductReview = catchAsyncErrors(async (req, res, next) => {
    const { rating, comment } = req.body;
    const productId = req.params.id;

    if (!rating) {
        return next(new ErrorHandler('Please provide a rating', 400));
    }

    const product = await Product.findById(productId);
    
    if (!product) {
        return next(new ErrorHandler('Product not found', 404));
    }

    // Check if user has already reviewed
    const existingReviewIndex = product.ratings.findIndex(
        r => r.user.toString() === req.user.id.toString()
    );

    const review = {
        user: req.user.id,
        rating: Number(rating),
        comment
    };

    if (existingReviewIndex >= 0) {
        product.ratings[existingReviewIndex] = review;
    } else {
        product.ratings.push(review);
    }

    // Calculate average rating
    await product.calculateAverageRating();

    res.status(200).json({
        success: true,
        message: "Review added successfully"
    });
});

// Get product reviews
exports.getProductReviews = catchAsyncErrors(async (req, res, next) => {
    const product = await Product.findById(req.params.id)
        .populate('ratings.user', 'name');

    if (!product) {
        return next(new ErrorHandler('Product not found', 404));
    }

    res.status(200).json({
        success: true,
        ratings: product.ratings
    });
});

// Get all products regardless of status (for debugging)
exports.getAllProductsDebug = catchAsyncErrors(async (req, res, next) => {
    console.log('Getting all products regardless of status');
    
    try {
        const products = await Product.find()
            .populate('farmer', 'name email');
        
        console.log(`Found ${products.length} products in total`);
        
        res.status(200).json({
            success: true,
            products,
            total: products.length
        });
    } catch (error) {
        console.error('Error in getAllProductsDebug:', error);
        return next(new ErrorHandler(error.message, 500));
    }
});

// Get products by category
exports.getProductsByCategory = catchAsyncErrors(async (req, res, next) => {
    try {
        const category = req.params.category;
        console.log("Fetching products for category:", category);
        
        if (!category) {
            return next(new ErrorHandler('Category is required', 400));
        }
        
        const products = await Product.find({ 
            category: category,
            status: 'active'
        })
        .populate('farmer', 'name email')
        .sort({ createdAt: -1 });
        
        console.log(`Found ${products.length} products in category ${category}`);
        
        res.status(200).json({
            success: true,
            product: products,
            count: products.length
        });
    } catch (error) {
        console.error('Error in getProductsByCategory:', error);
        return next(new ErrorHandler(error.message, 500));
    }
}); 