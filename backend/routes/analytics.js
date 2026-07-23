const express = require('express');
const Order = require('../models/Order');
const { authenticate, isAdmin } = require('../middleware/auth');
const router = express.Router();

// All analytics routes require admin access
router.use(authenticate);
router.use(isAdmin);

// Get total revenue from completed orders
router.get('/revenue', async (req, res) => {
  try {
    const result = await Order.aggregate([
      {
        $match: { status: 'completed' }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          orderCount: { $sum: 1 }
        }
      }
    ]);

    const revenue = result.length > 0 ? result[0].totalRevenue : 0;
    const orderCount = result.length > 0 ? result[0].orderCount : 0;

    res.json({
      totalRevenue: revenue,
      orderCount,
      currency: 'USD'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get monthly sales reports
router.get('/monthly-sales', async (req, res) => {
  try {
    const monthlySales = await Order.aggregate([
      {
        $match: { status: 'completed' }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalRevenue: { $sum: '$amount' },
          orderCount: { $sum: 1 },
          averageOrderValue: { $avg: '$amount' }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 }
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          monthName: {
            $let: {
              vars: {
                months: ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December']
              },
              in: { $arrayElemAt: ['$$months', '$_id.month'] }
            }
          },
          totalRevenue: { $round: ['$totalRevenue', 2] },
          orderCount: 1,
          averageOrderValue: { $round: ['$averageOrderValue', 2] }
        }
      }
    ]);

    res.json({
      monthlySales,
      totalMonths: monthlySales.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get top 5 customers based on total spending
router.get('/top-customers', async (req, res) => {
  try {
    const topCustomers = await Order.aggregate([
      {
        $match: { status: 'completed' }
      },
      {
        $group: {
          _id: '$userId',
          totalSpending: { $sum: '$amount' },
          orderCount: { $sum: 1 },
          averageOrderValue: { $avg: '$amount' }
        }
      },
      {
        $sort: { totalSpending: -1 }
      },
      {
        $limit: 5
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $unwind: {
          path: '$userDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          username: { $ifNull: ['$userDetails.username', 'Unknown'] },
          email: { $ifNull: ['$userDetails.email', 'N/A'] },
          totalSpending: { $round: ['$totalSpending', 2] },
          orderCount: 1,
          averageOrderValue: { $round: ['$averageOrderValue', 2] }
        }
      }
    ]);

    res.json({
      topCustomers,
      count: topCustomers.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get comprehensive analytics dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    // Get total revenue
    const revenueResult = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' }, orderCount: { $sum: 1 } } }
    ]);

    // Get monthly sales
    const monthlySales = await Order.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          totalRevenue: { $sum: '$amount' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    // Get top 5 customers
    const topCustomers = await Order.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$userId',
          totalSpending: { $sum: '$amount' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalSpending: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      { $unwind: { path: '$userDetails', preserveNullAndEmptyArrays: true } }
    ]);

    // Get order status distribution
    const statusDistribution = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      totalRevenue: revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0,
      totalCompletedOrders: revenueResult.length > 0 ? revenueResult[0].orderCount : 0,
      monthlySales: monthlySales.map(item => ({
        year: item._id.year,
        month: item._id.month,
        revenue: item.totalRevenue,
        orders: item.orderCount
      })),
      topCustomers: topCustomers.map(customer => ({
        userId: customer._id,
        username: customer.userDetails?.username || 'Unknown',
        email: customer.userDetails?.email || 'N/A',
        totalSpending: customer.totalSpending,
        orderCount: customer.orderCount
      })),
      statusDistribution: statusDistribution.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
