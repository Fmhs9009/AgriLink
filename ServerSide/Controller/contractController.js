const Contract = require('../Model/Contract');
const Product = require('../Model/Product');
const User = require('../Model/User');
const ErrorHandler = require('../utils/errorHandler');
const catchAsyncErrors = require('../Middleware/catchAsyncErrors');
const { cloudinary } = require('../config/cloudinary');
const fs = require('fs');
const Notification = require('../Model/Notification');
const { sendEmail } = require('../utils/emailService');
const mongoose = require('mongoose');

// Get all contracts (with filtering)
exports.getAllContracts = catchAsyncErrors(async (req, res, next) => {
    try {
        const { status, farmer, buyer, crop } = req.query;
        
        // Build query
        const query = {};
        
        if (status) query.status = status;
        if (farmer) query.farmer = farmer;
        if (buyer) query.buyer = buyer;
        if (crop) query.crop = crop;
        
        const contracts = await Contract.find(query)
            .populate('farmer', 'name email')
            .populate('buyer', 'name email')
            .populate('crop', 'name images price');
        
        res.status(200).json({
            success: true,
            count: contracts.length,
            contracts
        });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// Get contract by ID
exports.getContractById = catchAsyncErrors(async (req, res, next) => {
    try {
        const contract = await Contract.findById(req.params.id)
            .populate('farmer', 'name email phone')
            .populate('buyer', 'name email phone')
            .populate('crop', 'name description images price');
        
        if (!contract) {
            return next(new ErrorHandler('Contract not found', 404));
        }
        
        res.status(200).json({
            success: true,
            contract
        });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// Create a new contract request
exports.createContractRequest = catchAsyncErrors(async (req, res, next) => {
    try {
        // console.log('Creating contract request. User:', req.user ? req.user._id : 'No user');
        // console.log('Request body:', req.body);
        console.log("ssssssssssssssssssssssssssssssssssssssssssssssssssssss")
        const {
            cropId,
            farmerId,
            quantity,
            unit,
            pricePerUnit,
            expectedHarvestDate,
            deliveryDate,
            deliveryFrequency,
            paymentTerms,
            qualityRequirements,
            specialRequirements
        } = req.body;
        
        // Validate required fields
        if (!cropId || !farmerId || !quantity || !unit || !pricePerUnit) {
            console.log('Missing required fields');
            return next(new ErrorHandler('Please provide all required fields', 400));
        }
        
        // Check if crop exists
        const crop = await Product.findById(cropId);
        if (!crop) {
            console.log('Crop not found:', cropId);
            return next(new ErrorHandler('Crop not found', 404));
        }
        
        // Check if farmer exists
        const farmer = await User.findById(farmerId);
        if (!farmer) {
            console.log('Farmer not found:', farmerId);
            return next(new ErrorHandler('Farmer not found', 404));
        }
        
        // Calculate total amount
        const totalAmount = quantity * pricePerUnit;
        
        // Create contract request
        const contract = await Contract.create({
            farmer: farmerId,
            buyer: req.user.id, // Current user (buyer)
            crop: cropId,
            quantity,
            unit,
            pricePerUnit,
            totalAmount,
            expectedHarvestDate: expectedHarvestDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            deliveryDate: deliveryDate || new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
            deliveryFrequency,
            paymentTerms,
            qualityRequirements,
            specialRequirements,
            status: 'requested',
            createdAt: Date.now()
        });
        
        console.log('Contract created:', contract._id);
        
        // Get product and farmer details for notification
        const product = await Product.findById(cropId);
        const buyer = await User.findById(req.user.id);

        if (!product || !farmer) {
            return res.status(404).json({
                success: false,
                message: 'Product or farmer not found'
            });
        }

        // Create notification for farmer
        const notification = new Notification({
            recipient: farmerId,
            type: 'contract_request',
            title: 'New Contract Request',
            message: `${buyer.Name} has requested a contract for ${quantity} ${unit} of ${product.name}`,
            data: {
                contractId: contract._id,
                productId: cropId,
                buyerId: req.user.id
            },
            isRead: false,
            createdAt: Date.now()
        });

        await notification.save();
        console.log('Notification saved for farmer:', farmerId);

        try {
            // Send email notification to farmer
            console.log('Attempting to send email to farmer:', farmer.email);
            
            const emailData = {
                to: farmer.email,
                subject: 'New Contract Request on AgriLink',
                text: `Dear ${farmer.Name},\n\nYou have received a new contract request from ${buyer.Name} for ${quantity} ${unit} of ${product.name}.\n\nPlease login to your AgriLink account to view and respond to this request.\n\nBest regards,\nThe AgriLink Team`,
                html: `
                    <h2>New Contract Request</h2>
                    <p>Dear ${farmer.Name},</p>
                    <p>You have received a new contract request from <strong>${buyer.Name}</strong> for <strong>${quantity} ${unit}</strong> of <strong>${product.name}</strong>.</p>
                    <p>Contract Details:</p>
                    <ul>
                        <li>Product: ${product.name}</li>
                        <li>Quantity: ${quantity} ${unit}</li>
                        <li>Price per Unit: ₹${pricePerUnit}</li>
                        <li>Total Amount: ₹${totalAmount}</li>
                        <li>Delivery Date: ${new Date(deliveryDate).toLocaleDateString()}</li>
                        <li>Payment Terms: ${paymentTerms ? JSON.stringify(paymentTerms) : 'Standard'}</li>
                    </ul>
                    <p>Please <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard">login to your AgriLink account</a> to view and respond to this request.</p>
                    <p>Best regards,<br>The AgriLink Team</p>
                `
            };
            
            console.log('Email data prepared:', { to: emailData.to, subject: emailData.subject });
            
            await sendEmail(emailData);
            console.log('Email sent successfully to farmer');
        } catch (emailError) {
            // Log the error but don't fail the contract creation
            console.error('Error sending email notification:', emailError);
            // We'll continue with the response even if email fails
        }

        // Return success response with contract details
        return res.status(201).json({
            success: true,
            message: 'Contract request submitted successfully',
            contract: {
                _id: contract._id,
                crop: {
                    _id: product._id,
                    name: product.name,
                    image: product.images && product.images.length > 0 ? product.images[0] : null
                },
                farmer: {
                    _id: farmer._id,
                    name: farmer.name
                },
                quantity,
                unit,
                pricePerUnit,
                totalAmount,
                status: contract.status,
                createdAt: contract.createdAt
            }
        });
    } catch (error) {
        console.error('Error creating contract request:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create contract request',
            error: error.message
        });
    }
});

// Get contracts for a farmer
exports.getFarmerContracts = catchAsyncErrors(async (req, res, next) => {
    try {
        const contracts = await Contract.find({ farmer: req.user.id })
            .populate('buyer', 'name email')
            .populate('crop', 'name images price');
        
        res.status(200).json({
            success: true,
            count: contracts.length,
            contracts
        });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// Get contracts for a buyer
exports.getBuyerContracts = catchAsyncErrors(async (req, res, next) => {
    try {
        const contracts = await Contract.find({ buyer: req.user.id })
            .populate('farmer', 'name email')
            .populate('crop', 'name images price');
        
        res.status(200).json({
            success: true,
            count: contracts.length,
            contracts
        });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// Update contract status
exports.updateContractStatus = catchAsyncErrors(async (req, res, next) => {
    try {
        const { status } = req.body;
        
        // Validate status
        const validStatuses = [
            'requested', 
            'negotiating', 
            'payment_pending', // Waiting for payment from buyer
            'accepted', 
            'active', 
            'readyForHarvest', 
            'harvested', 
            'delivered', 
            'completed', 
            'cancelled', 
            'disputed'
        ];
        
        if (!validStatuses.includes(status)) {
            return next(new ErrorHandler('Invalid status', 400));
        }
        
        const contract = await Contract.findById(req.params.id);
        
        if (!contract) {
            return next(new ErrorHandler('Contract not found', 404));
        }
        
        // Check if user is authorized to update status
        if (contract.farmer.toString() !== req.user.id && contract.buyer.toString() !== req.user.id) {
            return next(new ErrorHandler('You are not authorized to update this contract', 403));
        }
        
        // Validate status transitions
        // For example, can't go from cancelled to active
        // Implement more complex validation if needed
        
        // Update status
        contract.status = status;
        await contract.save();
        
        res.status(200).json({
            success: true,
            message: `Contract status updated to ${status}`,
            contract
        });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// Add progress update to contract
exports.addProgressUpdate = catchAsyncErrors(async (req, res, next) => {
    try {
        const { updateType, description, images } = req.body;
        
        if (!updateType || !description) {
            return next(new ErrorHandler('Please provide update type and description', 400));
        }
        
        const contract = await Contract.findById(req.params.id);
        
        if (!contract) {
            return next(new ErrorHandler('Contract not found', 404));
        }
        
        // Check if user is part of this contract
        if (contract.farmer.toString() !== req.user.id && contract.buyer.toString() !== req.user.id) {
            return next(new ErrorHandler('You are not authorized to add progress updates to this contract', 403));
        }
        
        // Add progress update
        contract.progressUpdates.push({
            updateType,
            description,
            images: images || [],
            updatedAt: Date.now()
        });
        
        await contract.save();
        
        res.status(200).json({
            success: true,
            message: 'Progress update added successfully',
            contract
        });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// Add negotiation to contract
exports.negotiateContract = catchAsyncErrors(async (req, res, next) => {
    try {
        const { proposedChanges, message } = req.body;
        
        if (!proposedChanges) {
            return next(new ErrorHandler('Please provide proposed changes', 400));
        }
        
        const contract = await Contract.findById(req.params.id);
        
        if (!contract) {
            return next(new ErrorHandler('Contract not found', 404));
        }
        
        // Check if user is authorized to negotiate this contract
        if (contract.farmer.toString() !== req.user.id && contract.buyer.toString() !== req.user.id) {
            return next(new ErrorHandler('You are not authorized to negotiate this contract', 403));
        }
        
        // Add negotiation
        contract.negotiationHistory.push({
            proposedBy: req.user.id,
            proposedChanges,
            message: message || '',
            proposedAt: Date.now()
        });
        
        // Update status to negotiating
        contract.status = 'negotiating';
        
        await contract.save();
        
        res.status(200).json({
            success: true,
            message: 'Negotiation added successfully',
            contract
        });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// Accept contract (for farmer)
exports.acceptContract = catchAsyncErrors(async (req, res, next) => {
    try {
        const contract = await Contract.findById(req.params.id);
        
        if (!contract) {
            return next(new ErrorHandler('Contract not found', 404));
        }
        
        // Check if user is the farmer of this contract
        if (contract.farmer.toString() !== req.user.id) {
            return next(new ErrorHandler('Only the farmer can accept this contract', 403));
        }
        
        // Check if contract is in requested or negotiating status
        if (contract.status !== 'requested' && contract.status !== 'negotiating') {
            return next(new ErrorHandler(`Cannot accept contract in ${contract.status} status`, 400));
        }
        
        // Update status to payment_pending instead of accepted
        contract.status = 'payment_pending';
        await contract.save();
        
        res.status(200).json({
            success: true,
            message: 'Contract accepted successfully. Waiting for payment.',
            contract
        });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// Get contract details
exports.getContractDetails = catchAsyncErrors(async (req, res, next) => {
    console.log("Eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee")
    try {
        const contract = await Contract.findById(req.params.id)
            .populate('crop', 'name description images category unit price organic certification')
            .populate('farmer', 'Name email contactNumber farmName FarmLocation')
            .populate('buyer', 'Name email contactNumber')
            .populate('negotiationHistory.proposedBy', 'Name accountType');

        if (!contract) {
            return next(new ErrorHandler('Contract not found', 404));
        }

        // Check if user is authorized to view this contract
        if (contract.farmer.toString() !== req.user.id && contract.buyer.toString() !== req.user.id) {
            return next(new ErrorHandler('You are not authorized to view this contract', 403));
        }

        res.status(200).json({
            success: true,
            contract
        });
    } catch (error) {
        console.error('Error fetching contract details:', error);
        return next(new ErrorHandler(error.message, 500));
    }
});

// Generate contract document
exports.generateContractDocument = catchAsyncErrors(async (req, res, next) => {
    try {
        const contract = await Contract.findById(req.params.id)
            .populate('crop', 'name description category unit price organic certification')
            .populate('farmer', 'Name email contactNumber farmName FarmLocation')
            .populate('buyer', 'Name email contactNumber');

        if (!contract) {
            return next(new ErrorHandler('Contract not found', 404));
        }

        // Check if user is authorized to generate document
        if (contract.farmer.toString() !== req.user.id && contract.buyer.toString() !== req.user.id) {
            return next(new ErrorHandler('You are not authorized to generate this contract document', 403));
        }

        // Check if contract is in accepted state
        if (contract.status !== 'accepted') {
            return next(new ErrorHandler('Contract document can only be generated for accepted contracts', 400));
        }

        // In a real implementation, we would generate a PDF here
        // For now, we'll just return the contract data
        res.status(200).json({
            success: true,
            message: 'Contract document generated successfully',
            contractData: {
                contractId: contract._id,
                farmer: {
                    name: contract.farmer.Name,
                    email: contract.farmer.email,
                    phone: contract.farmer.contactNumber,
                    farmName: contract.farmer.farmName,
                    location: contract.farmer.FarmLocation
                },
                buyer: {
                    name: contract.buyer.Name,
                    email: contract.buyer.email,
                    phone: contract.buyer.contactNumber
                },
                crop: {
                    name: contract.crop.name,
                    description: contract.crop.description,
                    category: contract.crop.category,
                    organic: contract.crop.organic,
                    certification: contract.crop.certification
                },
                terms: {
                    quantity: contract.quantity,
                    unit: contract.unit,
                    pricePerUnit: contract.pricePerUnit,
                    totalAmount: contract.totalAmount,
                    expectedHarvestDate: contract.expectedHarvestDate,
                    deliveryDate: contract.deliveryDate,
                    qualityRequirements: contract.qualityRequirements,
                    specialRequirements: contract.specialRequirements
                },
                paymentTerms: contract.paymentTerms,
                createdAt: contract.createdAt,
                status: contract.status
            }
        });
    } catch (error) {
        console.error('Error generating contract document:', error);
        return next(new ErrorHandler(error.message, 500));
    }
});

// Get contract statistics
exports.getContractStatistics = catchAsyncErrors(async (req, res, next) => {
    try {
        const userId = req.user.id;
        const userType = req.user.accountType;
        
        let query = {};
        if (userType === 'farmer') {
            query.farmer = userId;
        } else if (userType === 'customer') {
            query.buyer = userId;
        }
        
        // Get counts by status
        const statusCounts = await Contract.aggregate([
            { $match: query },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        
        // Format the results
        const stats = {
            total: 0,
            requested: 0,
            negotiating: 0,
            accepted: 0,
            active: 0,
            readyForHarvest: 0,
            harvested: 0,
            delivered: 0,
            completed: 0,
            cancelled: 0,
            disputed: 0
        };
        
        statusCounts.forEach(item => {
            stats[item._id] = item.count;
            stats.total += item.count;
        });
        
        res.status(200).json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Error getting contract statistics:', error);
        return next(new ErrorHandler(error.message, 500));
    }
});

// Get all contracts for the logged-in user
exports.getContracts = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.accountType;
        
        let query = {};
        
        // Filter contracts based on user role
        if (userRole === 'farmer') {
            query.farmer = userId;
        } else if (userRole === 'customer') {
            query.buyer = userId;
        } else {
            // Admin can see all contracts
        }
        
        // Apply filters if provided
        const { status, sortBy, limit = 10, page = 1, search, keyword, query: searchQuery } = req.query;
        
        if (status) {
            query.status = status;
        }
        
        // Set up sorting
        let sort = {};
        if (sortBy === 'newest') {
            sort = { createdAt: -1 };
        } else if (sortBy === 'oldest') {
            sort = { createdAt: 1 };
        } else if (sortBy === 'amount-high') {
            sort = { totalAmount: -1 };
        } else if (sortBy === 'amount-low') {
            sort = { totalAmount: 1 };
        } else {
            // Default sort by newest
            sort = { createdAt: -1 };
        }
        
        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // First, fetch all contracts for this user to populate and search
        const allUserContracts = await Contract.find(query)
            .populate('crop', 'name images price unit category')
            .populate('farmer', 'name email phone location')
            .populate('buyer', 'name email phone')
            .sort(sort);
         
        // Get total count for pagination
        const totalContracts = allUserContracts.length;
            
        // Simplified search: Only search by crop name
        const searchTerm = search || keyword || searchQuery;
        let filteredContracts = allUserContracts;
        
        if (searchTerm && searchTerm.trim() !== '') {
            const regex = new RegExp(searchTerm, 'i');
            filteredContracts = allUserContracts.filter(contract => 
                contract.crop && contract.crop.name && regex.test(contract.crop.name)
            );
        }
        
        // Calculate pagination based on filtered results
        const totalFilteredContracts = filteredContracts.length;
        const totalPages = Math.ceil(totalFilteredContracts / parseInt(limit));
        
        // Apply pagination to filtered results
        const paginatedContracts = filteredContracts.slice(skip, skip + parseInt(limit));
        
        return res.status(200).json({
            success: true,
            count: paginatedContracts.length,
            total: totalFilteredContracts,
            totalPages: totalPages,
            currentPage: parseInt(page),
            contracts: paginatedContracts
        });
    } catch (error) {
        console.error('Error fetching contracts:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch contracts',
            error: error.message
        });
    }
};

// Submit a counter offer for a contract
exports.submitCounterOffer = async (req, res) => {
    try {
        const contractId = req.params.id;
        const { 
            quantity, 
            pricePerUnit, 
            deliveryDate, 
            paymentTerms, 
            remarks 
        } = req.body;
        
        // Find contract
        const contract = await Contract.findById(contractId);
        
        if (!contract) {
            return res.status(404).json({
                success: false,
                message: 'Contract not found'
            });
        }
        
        // Check authorization
        const userId = req.user.id;
        const userRole = req.user.accountType;
        
        // Both farmer and buyer can submit counter offers
        if (contract.farmer.toString() !== userId && contract.buyer.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to submit a counter offer for this contract'
            });
        }
        
        // Create counter offer
        const counterOffer = {
            offeredBy: userId,
            offerType: contract.farmer.toString() === userId ? 'farmer' : 'buyer',
            quantity: quantity || contract.quantity,
            pricePerUnit: pricePerUnit || contract.pricePerUnit,
            totalAmount: (quantity || contract.quantity) * (pricePerUnit || contract.pricePerUnit),
            deliveryDate: deliveryDate || contract.deliveryDate,
            paymentTerms: paymentTerms || contract.paymentTerms,
            remarks,
            timestamp: Date.now()
        };
        
        // Add counter offer to contract
        contract.counterOffers = contract.counterOffers || [];
        contract.counterOffers.push(counterOffer);
        
        // Update contract status to negotiating
        contract.status = 'negotiating';
        contract.statusHistory = contract.statusHistory || [];
        contract.statusHistory.push({
            status: 'negotiating',
            changedBy: userId,
            remarks: 'Counter offer submitted',
            timestamp: Date.now()
        });
        
        // Save contract
        await contract.save();
        
        // Get user details for notification
        const farmer = await User.findById(contract.farmer);
        const buyer = await User.findById(contract.buyer);
        const product = await Product.findById(contract.crop);
        
        // Determine recipient
        const recipient = contract.farmer.toString() === userId ? contract.buyer : contract.farmer;
        const senderName = contract.farmer.toString() === userId ? farmer.name : buyer.name;
        const recipientUser = contract.farmer.toString() === userId ? buyer : farmer;
        
        // Create notification
        const notification = new Notification({
            recipient,
            type: 'contract_counter_offer',
            title: 'New Counter Offer',
            message: `${senderName} has submitted a counter offer for ${product.name}`,
            data: {
                contractId: contract._id,
                productId: contract.crop,
                counterOfferId: contract.counterOffers[contract.counterOffers.length - 1]._id
            },
            isRead: false,
            createdAt: Date.now()
        });
        
        await notification.save();
        
        try {
            // Send email notification
            console.log('Attempting to send counter offer email to:', recipientUser.email);
            
            const emailData = {
                to: recipientUser.email,
                subject: 'New Counter Offer on AgriLink',
                text: `Dear ${recipientUser.Name},\n\n${senderName} has submitted a counter offer for ${product.name}.\n\nPlease login to your AgriLink account to view and respond to this offer.\n\nBest regards,\nThe AgriLink Team`,
                html: `
                    <h2>New Counter Offer</h2>
                    <p>Dear ${recipientUser.Name},</p>
                    
                    <p><strong>${senderName}</strong> has submitted a counter offer for <strong>${product.name}</strong>.</p>
                    <p>Counter Offer Details:</p>
                    <ul>
                        <li>Product: ${product.name}</li>
                        <li>Quantity: ${counterOffer.quantity} ${contract.unit}</li>
                        <li>Price per Unit: ₹${counterOffer.pricePerUnit}</li>
                        <li>Total Amount: ₹${counterOffer.totalAmount}</li>
                        <li>Delivery Date: ${new Date(counterOffer.deliveryDate).toLocaleDateString()}</li>
                        <li>Payment Terms: ${typeof counterOffer.paymentTerms === 'object' ? JSON.stringify(counterOffer.paymentTerms) : counterOffer.paymentTerms}</li>
                    </ul>
                    ${remarks ? `<p>Remarks: ${remarks}</p>` : ''}
                    <p>Please <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/contracts/${contract._id}">login to your AgriLink account</a> to view and respond to this offer.</p>
                    <p>Best regards,<br>The AgriLink Team</p>
                `
            };
            
            console.log('Counter offer email data prepared');
            await sendEmail(emailData);
            console.log('Counter offer email sent successfully');
        } catch (emailError) {
            // Log the error but don't fail the contract creation
            console.error('Error sending counter offer email notification:', emailError);
            // We'll continue with the response even if email fails
        }
        
        return res.status(200).json({
            success: true,
            message: 'Counter offer submitted successfully',
            contract
        });
    } catch (error) {
        console.error('Error submitting counter offer:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to submit counter offer',
            error: error.message
        });
    }
};

// Get contract statistics
exports.getContractStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.accountType;
        
        let query = {};
        
        // Filter contracts based on user role
        if (userRole === 'farmer') {
            query.farmer = userId;
        } else if (userRole === 'customer') {
            query.buyer = userId;
        }
        
        // Get counts by status
        const pendingCount = await Contract.countDocuments({ ...query, status: 'pending' });
        const acceptedCount = await Contract.countDocuments({ ...query, status: 'accepted' });
        const rejectedCount = await Contract.countDocuments({ ...query, status: 'rejected' });
        const completedCount = await Contract.countDocuments({ ...query, status: 'completed' });
        const cancelledCount = await Contract.countDocuments({ ...query, status: 'cancelled' });
        const negotiatingCount = await Contract.countDocuments({ ...query, status: 'negotiating' });
        
        // Get total value of contracts
        const totalValuePipeline = [
            { $match: { ...query, status: { $in: ['accepted', 'completed'] } } },
            { $group: { _id: null, totalValue: { $sum: '$totalAmount' } } }
        ];
        
        const totalValueResult = await Contract.aggregate(totalValuePipeline);
        const totalValue = totalValueResult.length > 0 ? totalValueResult[0].totalValue : 0;
        
        // Get monthly contract counts for the last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const monthlyStatsPipeline = [
            { 
                $match: { 
                    ...query, 
                    createdAt: { $gte: sixMonthsAgo } 
                } 
            },
            {
                $group: {
                    _id: { 
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 },
                    value: { $sum: '$totalAmount' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ];
        
        const monthlyStats = await Contract.aggregate(monthlyStatsPipeline);
        
        // Format monthly stats
        const formattedMonthlyStats = monthlyStats.map(stat => ({
            year: stat._id.year,
            month: stat._id.month,
            count: stat.count,
            value: stat.value
        }));
        
        return res.status(200).json({
            success: true,
            stats: {
                counts: {
                    pending: pendingCount,
                    accepted: acceptedCount,
                    rejected: rejectedCount,
                    completed: completedCount,
                    cancelled: cancelledCount,
                    negotiating: negotiatingCount,
                    total: pendingCount + acceptedCount + rejectedCount + completedCount + cancelledCount + negotiatingCount
                },
                totalValue,
                monthlyStats: formattedMonthlyStats
            }
        });
    } catch (error) {
        console.error('Error fetching contract stats:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch contract statistics',
            error: error.message
        });
    }
};

module.exports = exports; 