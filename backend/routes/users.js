const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();

// All user management routes require admin access
router.use(authenticate);
router.use(isAdmin);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sanitizeUser = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

// Get all users with order statistics and summary metrics
router.get('/', async (req, res) => {
  try {
    const { search = '', role = 'all', sortBy = 'createdAt' } = req.query;

    const matchStage = {};
    if (role && role !== 'all' && ['admin', 'user'].includes(role)) {
      matchStage.role = role;
    }
    if (search && search.trim()) {
      const regex = new RegExp(escapeRegex(search.trim()), 'i');
      matchStage.$or = [{ username: regex }, { email: regex }];
    }

    const sortOptions = {
      createdAt: { createdAt: -1 },
      username: { username: 1 },
      totalSpending: { totalSpending: -1, createdAt: -1 },
      orderCount: { orderCount: -1, createdAt: -1 }
    };
    const sortStage = sortOptions[sortBy] || sortOptions.createdAt;

    const users = await User.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'userId',
          as: 'orders'
        }
      },
      {
        $project: {
          _id: 1,
          username: 1,
          email: 1,
          role: 1,
          createdAt: 1,
          updatedAt: 1,
          orderCount: { $size: '$orders' },
          completedOrders: {
            $size: {
              $filter: {
                input: '$orders',
                as: 'order',
                cond: { $eq: ['$$order.status', 'completed'] }
              }
            }
          },
          totalSpending: {
            $round: [
              {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: '$orders',
                        as: 'order',
                        cond: { $eq: ['$$order.status', 'completed'] }
                      }
                    },
                    as: 'completedOrder',
                    in: '$$completedOrder.amount'
                  }
                }
              },
              2
            ]
          },
          lastOrderDate: { $max: '$orders.createdAt' }
        }
      },
      { $sort: sortStage }
    ]);

    const [summaryResult] = await User.aggregate([
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'userId',
          as: 'orders'
        }
      },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          adminCount: {
            $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
          },
          customerCount: {
            $sum: { $cond: [{ $eq: ['$role', 'user'] }, 1, 0] }
          },
          activeBuyers: {
            $sum: { $cond: [{ $gt: [{ $size: '$orders' }, 0] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      count: users.length,
      users,
      summary: summaryResult || {
        totalUsers: 0,
        adminCount: 0,
        customerCount: 0,
        activeBuyers: 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a new user as admin
router.post('/', async (req, res) => {
  try {
    const { username, email, password, role = 'user' } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be admin or user' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }]
    });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email or username already exists' });
    }

    const user = new User({
      username: normalizedUsername,
      email: normalizedEmail,
      password,
      role
    });
    await user.save();

    const result = sanitizeUser(user);
    const io = req.app.get('io');
    if (io) {
      io.emit('userCreated', result);
    }

    res.status(201).json({
      message: 'User created successfully',
      user: result
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'Field';
      return res.status(400).json({ message: `${field} already exists` });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user details or role
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { username, email, role, password } = req.body;

    if (id === req.user.userId && role && role !== 'admin') {
      return res.status(400).json({ message: 'You cannot remove your own admin privileges' });
    }

    if (role !== undefined && !['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be admin or user' });
    }

    if (password !== undefined && password !== '') {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }
      user.password = password;
    }

    if (username !== undefined && username.trim()) {
      const duplicateUsername = await User.findOne({
        username: username.trim(),
        _id: { $ne: id }
      });
      if (duplicateUsername) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
      user.username = username.trim();
    }

    if (email !== undefined && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      const duplicateEmail = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: id }
      });
      if (duplicateEmail) {
        return res.status(400).json({ message: 'Email is already registered' });
      }
      user.email = normalizedEmail;
    }

    if (role !== undefined) {
      user.role = role;
    }

    await user.save();

    const result = sanitizeUser(user);
    const io = req.app.get('io');
    if (io) {
      io.emit('userUpdated', result);
    }

    res.json({
      message: 'User updated successfully',
      user: result
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'Field';
      return res.status(400).json({ message: `${field} already exists` });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    if (id === req.user.userId) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('userDeleted', { userId: id });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

