const express = require('express');
const Order = require('../models/Order');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Create a new order (Protected route)
router.post('/', authenticate, async (req, res) => {
  try {
    const { product, amount, status } = req.body;
    const userId = req.user.userId;

    const order = new Order({
      userId,
      product,
      amount,
      status: status || 'pending'
    });

    await order.save();

    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('newOrder', order);
    }

    res.status(201).json({
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Insert multiple orders using insertMany
router.post('/bulk', authenticate, async (req, res) => {
  try {
    const { orders } = req.body;
    const userId = req.user.userId;

    // Add userId and createdAt to each order
    const ordersToInsert = orders.map(order => ({
      userId,
      product: order.product,
      amount: order.amount,
      status: order.status || 'pending',
      createdAt: order.createdAt || new Date()
    }));

    const insertedOrders = await Order.insertMany(ordersToInsert);

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('bulkOrders', insertedOrders);
    }

    res.status(201).json({
      message: `${insertedOrders.length} orders created successfully`,
      orders: insertedOrders
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all orders using find (Protected route)
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, userId } = req.query;
    const query = {};

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Filter by userId if provided (admin can see all, users see only their own)
    if (userId) {
      query.userId = userId;
    } else if (req.user.role !== 'admin') {
      // Non-admin users can only see their own orders
      query.userId = req.user.userId;
    }

    const orders = await Order.find(query)
      .populate('userId', 'username email')
      .sort({ createdAt: -1 });

    res.json({
      count: orders.length,
      orders
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single order by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'username email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user has access to this order
    if (req.user.role !== 'admin' && order.userId._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update multiple orders using updateMany (Protected route)
router.put('/bulk', authenticate, async (req, res) => {
  try {
    const { filter, update } = req.body;

    // Only admin can update multiple orders
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const result = await Order.updateMany(filter, update);

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('ordersUpdated', { filter, update, modifiedCount: result.modifiedCount });
    }

    res.json({
      message: 'Orders updated successfully',
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update single order
router.put('/:id', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user has access to this order
    if (req.user.role !== 'admin' && order.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('userId', 'username email');

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('orderUpdated', updatedOrder);
    }

    res.json({
      message: 'Order updated successfully',
      order: updatedOrder
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete multiple orders using deleteMany (Protected route - Admin only)
router.delete('/bulk', authenticate, async (req, res) => {
  try {
    // Only admin can delete multiple orders
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { filter } = req.body;
    const result = await Order.deleteMany(filter);

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('ordersDeleted', { filter, deletedCount: result.deletedCount });
    }

    res.json({
      message: 'Orders deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete single order
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user has access to this order
    if (req.user.role !== 'admin' && order.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Order.findByIdAndDelete(req.params.id);

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('orderDeleted', { orderId: req.params.id });
    }

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
