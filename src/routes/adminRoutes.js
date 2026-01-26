const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const User = require('../models/User');

const router = express.Router();

/**
 * @route   GET /api/admin/dashboard
 * @desc    Admin dashboard (accessible ONLY to admin role)
 * @access  Protected + Admin only
 */
router.get('/dashboard', authMiddleware, roleMiddleware('admin'), (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Welcome to admin dashboard',
      admin: {
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
      data: {
        message: 'This route is accessible only to users with admin role',
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load admin dashboard',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    Get all users (admin only)
 * @access  Protected + Admin only
 */
router.get('/users', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { search = '', sortBy = 'createdAt', order = 'desc' } = req.query;

    // Allowed sort fields (security + control)
    const allowedSortFields = ['name', 'email', 'role', 'createdAt'];

    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = order === 'asc' ? 1 : -1;

    const pipeline = [];

    // 🔍 SEARCH STAGE
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { role: { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    // ❌ Exclude password
    pipeline.push({
      $project: {
        password: 0,
      },
    });

    // ↕️ SORT STAGE
    pipeline.push({
      $sort: {
        [sortField]: sortOrder,
      },
    });

    const users = await User.aggregate(pipeline);

    return res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      count: users.length,
      users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message,
    });
  }
});


/**
 * @route   GET /api/admin/users/:id
 * @desc    Get single user by ID (admin only)
 * @access  Protected + Admin only
 */
router.get('/users/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user (admin only)
 * @access  Protected + Admin only
 */
router.delete('/users/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user.userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    await User.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message,
    });
  }
});

module.exports = router;
