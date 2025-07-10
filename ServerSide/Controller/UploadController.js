const { cloudinary } = require('../config/cloudinary');
const ErrorHandler = require('../utils/errorHandler');
const catchAsyncErrors = require('../Middleware/catchAsyncErrors');
const fs = require('fs');

// Upload image to Cloudinary
exports.uploadImage = catchAsyncErrors(async (req, res, next) => {
    try {
        console.log('Upload image request received');
        console.log('Request files:', req.files);
        
        if (!req.files || !req.files.image) {
            console.error('No image file found in request');
            return next(new ErrorHandler('Please upload an image', 400));
        }

        const file = req.files.image;
        console.log('Processing file:', file.name, 'Size:', file.size, 'Type:', file.mimetype);
        
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!allowedTypes.includes(file.mimetype)) {
            console.error('Invalid file type:', file.mimetype);
            return next(new ErrorHandler('Please upload a valid image (JPEG, PNG, WEBP)', 400));
        }
        
        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            console.error('File too large:', file.size);
            return next(new ErrorHandler('Image size should be less than 5MB', 400));
        }

        console.log('File validation passed, uploading to Cloudinary...');
        console.log('Temp file path:', file.tempFilePath);
        
        // Check if temp file exists
        if (!fs.existsSync(file.tempFilePath)) {
            console.error('Temp file does not exist:', file.tempFilePath);
            return next(new ErrorHandler('Error with temporary file', 500));
        }

        // Upload to Cloudinary
        try {
            const result = await cloudinary.uploader.upload(file.tempFilePath, {
                folder: 'products',
                crop: "scale"
            });
            
            console.log('Cloudinary upload successful:', result.public_id);
            
            // Clean up temp file
            fs.unlink(file.tempFilePath, (err) => {
                if (err) console.error('Error deleting temp file:', err);
            });

            res.status(200).json({
                success: true,
                public_id: result.public_id,
                secure_url: result.secure_url
            });
        } catch (cloudinaryError) {
            console.error('Cloudinary upload error:', cloudinaryError);
            return next(new ErrorHandler(`Error uploading to Cloudinary: ${cloudinaryError.message}`, 500));
        }
    } catch (error) {
        console.error('Error in uploadImage controller:', error);
        return next(new ErrorHandler(`Error uploading image: ${error.message}`, 500));
    }
}); 