const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @route   GET /api/user/profile
 * @desc    Get user profile (accessible to all authenticated users)
 * @access  Protected
 */
router.get('/profile', authMiddleware, (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            message: 'User profile retrieved successfully',
            user: req.user,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve profile',
            error: error.message,
        });
    }
});

/**
 * @route   GET /api/user/dashboard
 * @desc    User dashboard (example protected route)
 * @access  Protected
 */
router.get('/dashboard', authMiddleware, (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            message: 'Welcome to your dashboard',
            data: {
                username: req.user.name,
                email: req.user.email,
                role: req.user.role,
                message: 'This is a protected user route accessible to all authenticated users',
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to load dashboard',
            error: error.message,
        });
    }
});

module.exports = router;
