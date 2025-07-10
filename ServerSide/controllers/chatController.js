const Message = require('../Model/Message');
const Contract = require('../Model/Contract');
const User = require('../Model/User');
const catchAsyncErrors = require('../Middleware/catchAsyncErrors');
const ErrorHandler = require('../utils/errorHandler');
const { cloudinary } = require('../config/cloudinary');
const fs = require('fs');

// Get messages for a specific contract
exports.getMessages = catchAsyncErrors(async (req, res, next) => {
    const { contractId } = req.params;
    const userId = req.user._id;
    const { before, limit = 20 } = req.query;
    
    // Validate contract existence and user's access
    const contract = await Contract.findById(contractId);
    
    if (!contract) {
        return next(new ErrorHandler('Contract not found', 404));
    }
    
    // Check if user is part of the contract
    if (contract.farmer.toString() !== userId.toString() && 
        contract.buyer.toString() !== userId.toString()) {
        return next(new ErrorHandler('Unauthorized access to this contract', 403));
    }
    
    // Build query for pagination
    const query = { contractId };
    
    // If 'before' parameter is provided, get messages before that timestamp
    if (before) {
        query.createdAt = { $lt: new Date(before) };
    }
    
    try {
        // Find messages for this contract
        const messages = await Message.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .populate('senderId', 'Name photo accountType')
            .lean();
            
        // Mark messages as read if recipient is the current user
        if (messages.length > 0) {
            await Message.updateMany(
                { 
                    contractId,
                    recipientId: userId, 
                    read: false
                },
                { read: true }
            );
        }
        
        // Sort messages in ascending order (oldest first)
        messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        res.status(200).json({
            success: true,
            count: messages.length,
            messages
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        return next(new ErrorHandler('Failed to fetch messages', 500));
    }
});

// Send a message
exports.sendMessage = catchAsyncErrors(async (req, res, next) => {
    try {
        const { contractId } = req.params;
        const userId = req.user._id;
        const { content, messageType, offerDetails } = req.body;
        
        // Validate contract existence
        const contract = await Contract.findById(contractId);
        if (!contract) {
            return next(new ErrorHandler('Contract not found', 404));
        }
        
        // Check if user has access to this contract
        const farmerId = contract.farmer.toString();
        const buyerId = contract.buyer.toString();
        
        if (userId.toString() !== farmerId && userId.toString() !== buyerId) {
            return next(new ErrorHandler('You do not have access to this contract', 403));
        }
        
        // Determine recipient
        const recipientId = userId.toString() === farmerId ? buyerId : farmerId;
        
        // Create message
        const newMessage = await Message.create({
            contractId,
            senderId: userId,
            recipientId,
            messageType: messageType || 'text',
            content,
            ...(offerDetails && { offerDetails }),
            read: false
        });
        
        // If this is a counter offer, update contract status and add to negotiation history
        if (messageType === 'counterOffer' && offerDetails) {
            // Update contract status to negotiating if not already
            if (contract.status !== 'negotiating') {
                contract.status = 'negotiating';
            }
            
            // Add to negotiation history
            contract.negotiationHistory.push({
                proposedBy: userId,
                proposedChanges: offerDetails,
                message: content,
                proposedAt: new Date()
            });
            
            await contract.save();
        }
        
        // Populate sender details
        const populatedMessage = await Message.findById(newMessage._id)
            .populate('senderId', 'Name photo accountType');
        
        res.status(201).json({
            success: true,
            message: populatedMessage
        });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// Get unread message count
exports.getUnreadCount = catchAsyncErrors(async (req, res, next) => {
    // Count unread messages for the current user
    const unreadCount = await Message.countDocuments({
        recipientId: req.user._id,
        read: false
    });
    
    // Group by contract to show counts per contract
    const unreadByContract = await Message.aggregate([
        {
            $match: {
                recipientId: req.user._id,
                read: false
            }
        },
        {
            $group: {
                _id: '$contractId',
                count: { $sum: 1 }
            }
        },
        {
            $project: {
                contractId: '$_id',
                count: 1,
                _id: 0
            }
        }
    ]);
    
    res.status(200).json({
        success: true,
        totalUnread: unreadCount,
        unreadCounts: unreadByContract
    });
});

// Mark messages as read
exports.markAsRead = catchAsyncErrors(async (req, res, next) => {
    const { contractId } = req.params;
    
    // Verify contract exists and user has access
    const contract = await Contract.findById(contractId);
    if (!contract) {
        return next(new ErrorHandler('Contract not found', 404));
    }
    
    // Check if user is either the farmer or buyer of the contract
    if (contract.farmer.toString() !== req.user._id.toString() && 
        contract.buyer.toString() !== req.user._id.toString()) {
        return next(new ErrorHandler('Unauthorized access to this contract', 403));
    }
    
    // Mark all messages for this contract where user is recipient as read
    const result = await Message.updateMany(
        {
            contractId,
            recipientId: req.user._id,
            read: false
        },
        { read: true }
    );
    
    res.status(200).json({
        success: true,
        markedAsRead: result.nModified || 0
    });
});

// Get all contracts with latest messages for chat list view
exports.getChatList = catchAsyncErrors(async (req, res, next) => {
    const userId = req.user._id;
    
    // Find all contracts where user is either farmer or buyer
    const contracts = await Contract.find({
        $or: [{ farmer: userId }, { buyer: userId }]
    })
    .populate('farmer', 'Name image')
    .populate('buyer', 'Name image')
    .populate('crop', 'name images')
    .lean();
    
    // For each contract, get the latest message
    const contractsWithMessages = await Promise.all(contracts.map(async (contract) => {
        // Get latest message
        const latestMessage = await Message.findOne({ contractId: contract._id })
            .sort({ createdAt: -1 })
            .populate('senderId', 'Name')
            .lean();
        
        // Count unread messages
        const unreadCount = await Message.countDocuments({
            contractId: contract._id,
            recipientId: userId,
            read: false
        });
        
        // Determine if user is farmer or buyer
        const isFarmer = contract.farmer._id.toString() === userId.toString();
        
        // Determine the other party
        const otherParty = isFarmer ? contract.buyer : contract.farmer;
        
        return {
            ...contract,
            latestMessage,
            unreadCount,
            otherParty
        };
    }));
    
    // Sort by latest message (if exists) or contract creation date
    contractsWithMessages.sort((a, b) => {
        const dateA = a.latestMessage ? new Date(a.latestMessage.createdAt) : new Date(a.createdAt);
        const dateB = b.latestMessage ? new Date(b.latestMessage.createdAt) : new Date(b.createdAt);
        return dateB - dateA; // Descending order (newest first)
    });
    
    res.status(200).json({
        success: true,
        count: contractsWithMessages.length,
        chatList: contractsWithMessages
    });
});

// Accept the latest counter offer
exports.acceptCounterOffer = catchAsyncErrors(async (req, res, next) => {
    const { contractId } = req.params;
    
    // Verify contract exists and user has access
    const contract = await Contract.findById(contractId);
    if (!contract) {
        return next(new ErrorHandler('Contract not found', 404));
    }
    
    // Check if user is either the farmer or buyer of the contract
    if (contract.farmer.toString() !== req.user._id.toString() && 
        contract.buyer.toString() !== req.user._id.toString()) {
        return next(new ErrorHandler('Unauthorized access to this contract', 403));
    }
    
    // Get the latest counter offer
    const latestOfferMessage = await Message.findOne({
        contractId,
        messageType: 'counterOffer'
    })
    .sort({ createdAt: -1 });
    
    if (!latestOfferMessage) {
        return next(new ErrorHandler('No counter offers found to accept', 404));
    }
    
    // Make sure the offer being accepted is not from the current user
    if (latestOfferMessage.senderId.toString() === req.user._id.toString()) {
        return next(new ErrorHandler('You cannot accept your own counter offer', 400));
    }
    
    // Update contract with the terms from the latest counter offer
    const { offerDetails } = latestOfferMessage;
    
    const contractUpdates = {
        status: 'accepted',
        ...offerDetails,
        // Calculate total amount based on price and quantity
        totalAmount: offerDetails.pricePerUnit * offerDetails.quantity
    };
    
    // Update the contract
    await Contract.findByIdAndUpdate(contractId, contractUpdates);
    
    // Create a system message to notify about the acceptance
    const recipientId = contract.farmer.toString() === req.user._id.toString() 
        ? contract.buyer 
        : contract.farmer;
    
    await Message.create({
        contractId,
        senderId: req.user._id,
        recipientId,
        messageType: 'systemMessage',
        content: `${req.user.Name} has accepted the latest counter offer.`,
        read: false
    });
    
    res.status(200).json({
        success: true,
        message: 'Counter offer accepted successfully'
    });
});

// Send an image message
exports.sendImageMessage = catchAsyncErrors(async (req, res, next) => {
    try {
        const { contractId } = req.params;
        const userId = req.user._id;
        
        // Check if image is uploaded
        if (!req.files || !req.files.image) {
            return next(new ErrorHandler('Please upload an image', 400));
        }
        
        // Validate contract existence
        const contract = await Contract.findById(contractId);
        if (!contract) {
            return next(new ErrorHandler('Contract not found', 404));
        }
        
        // Check if user has access to this contract
        const farmerId = contract.farmer.toString();
        const buyerId = contract.buyer.toString();
        
        if (userId.toString() !== farmerId && userId.toString() !== buyerId) {
            return next(new ErrorHandler('You do not have access to this contract', 403));
        }
        
        // Determine recipient
        const recipientId = userId.toString() === farmerId ? buyerId : farmerId;
        
        // Process the image file
        const file = req.files.image;
        
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!allowedTypes.includes(file.mimetype)) {
            return next(new ErrorHandler('Please upload a valid image (JPEG, PNG, WEBP)', 400));
        }
        
        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return next(new ErrorHandler('Image size should be less than 5MB', 400));
        }
        
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(file.tempFilePath, {
            folder: 'chat_images',
            crop: "scale"
        });
        
        // Clean up temp file
        fs.unlink(file.tempFilePath, (err) => {
            if (err) console.error('Error deleting temp file:', err);
        });
        
        // Create message
        const newMessage = await Message.create({
            contractId,
            senderId: userId,
            recipientId,
            messageType: 'image',
            content: req.body.caption || '',
            image: {
                public_id: result.public_id,
                url: result.secure_url
            },
            read: false
        });
        
        // Populate sender details
        const populatedMessage = await Message.findById(newMessage._id)
            .populate('senderId', 'Name photo accountType');
        
        // Get socket.io instance from req
        const io = req.app.get('socketio');
        
        // If io exists, emit real-time update to all users in the contract room
        if (io) {
            // Emit to contract room
            const roomName = `contract:${contractId}`;
            
            try {
                console.log(`Emitting image message to room ${roomName}`);
                io.to(roomName).emit('new_message', populatedMessage);
                
                // Also notify recipient
                io.to(`user:${recipientId}`).emit('new_notification', {
                    type: 'new_message',
                    message: `New image from ${req.user.Name}`,
                    data: {
                        contractId,
                        senderId: userId
                    }
                });
            } catch (socketError) {
                console.error('Socket emission error:', socketError);
                // Continue anyway to return HTTP response
            }
        } else {
            console.log('Socket.io not available for real-time update');
        }
        
        res.status(201).json({
            success: true,
            message: populatedMessage
        });
    } catch (error) {
        console.error('Error sending image message:', error);
        return next(new ErrorHandler(error.message, 500));
    }
});

module.exports = exports; 