const express = require('express');
const Order = require('../models/Order');
const User = require('../models/User');
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

// Get top selling products
router.get('/products', async (req, res) => {
  try {
    const topProducts = await Order.aggregate([
      {
        $group: {
          _id: '$product',
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          revenue: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
          },
          avgPrice: { $avg: '$amount' }
        }
      },
      { $sort: { revenue: -1, totalOrders: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          product: '$_id',
          totalOrders: 1,
          completedOrders: 1,
          revenue: { $round: ['$revenue', 2] },
          avgPrice: { $round: ['$avgPrice', 2] }
        }
      }
    ]);

    res.json({ topProducts, count: topProducts.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user analytics overview
router.get('/users', async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalUsers, adminCount, customerCount, newUsersThisMonth, distinctBuyers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Order.distinct('userId')
    ]);

    const activeBuyers = distinctBuyers.length;
    const conversionRate = totalUsers > 0 ? Number(((activeBuyers / totalUsers) * 100).toFixed(1)) : 0;

    res.json({
      totalUsers,
      adminCount,
      customerCount,
      activeBuyers,
      newUsersThisMonth,
      conversionRate
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get comprehensive analytics dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      revenueResult,
      pipelineResult,
      monthlySales,
      topCustomers,
      statusDistribution,
      topProducts,
      totalUsers,
      adminCount,
      customerCount,
      newUsersThisMonth,
      distinctBuyers,
      recentOrders
    ] = await Promise.all([
      Order.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' }, orderCount: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { status: { $in: ['pending', 'processing'] } } },
        { $group: { _id: null, pendingRevenue: { $sum: '$amount' }, orderCount: { $sum: 1 } } }
      ]),
      Order.aggregate([
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
      ]),
      Order.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: '$userId',
            totalSpending: { $sum: '$amount' },
            orderCount: { $sum: 1 },
            averageOrderValue: { $avg: '$amount' }
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
      ]),
      Order.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            amount: { $sum: '$amount' }
          }
        }
      ]),
      Order.aggregate([
        {
          $group: {
            _id: '$product',
            totalOrders: { $sum: 1 },
            completedOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            revenue: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
            },
            avgPrice: { $avg: '$amount' }
          }
        },
        { $sort: { revenue: -1, totalOrders: -1 } },
        { $limit: 6 }
      ]),
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Order.distinct('userId'),
      Order.find()
        .populate('userId', 'username email')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    const statusMap = statusDistribution.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const statusRevenueMap = statusDistribution.reduce((acc, item) => {
      acc[item._id] = Number((item.amount || 0).toFixed(2));
      return acc;
    }, {});

    const totalRevenue = revenueResult.length > 0 ? Number(revenueResult[0].totalRevenue.toFixed(2)) : 0;
    const totalCompletedOrders = revenueResult.length > 0 ? revenueResult[0].orderCount : 0;
    const pendingRevenue = pipelineResult.length > 0 ? Number(pipelineResult[0].pendingRevenue.toFixed(2)) : 0;
    const totalOrders = Object.values(statusMap).reduce((sum, count) => sum + count, 0);
    const averageOrderValue = totalCompletedOrders > 0 ? Number((totalRevenue / totalCompletedOrders).toFixed(2)) : 0;
    const completionRate = totalOrders > 0 ? Number(((totalCompletedOrders / totalOrders) * 100).toFixed(1)) : 0;
    const cancelledOrders = statusMap.cancelled || 0;
    const cancellationRate = totalOrders > 0 ? Number(((cancelledOrders / totalOrders) * 100).toFixed(1)) : 0;
    const activeBuyers = distinctBuyers.length;
    const conversionRate = totalUsers > 0 ? Number(((activeBuyers / totalUsers) * 100).toFixed(1)) : 0;

    res.json({
      totalRevenue,
      totalCompletedOrders,
      totalOrders,
      pendingRevenue,
      averageOrderValue,
      completionRate,
      cancellationRate,
      monthlySales: monthlySales.map(item => ({
        year: item._id.year,
        month: item._id.month,
        revenue: Number(item.totalRevenue.toFixed(2)),
        orders: item.orderCount
      })),
      topCustomers: topCustomers.map(customer => ({
        userId: customer._id,
        username: customer.userDetails?.username || 'Unknown',
        email: customer.userDetails?.email || 'N/A',
        totalSpending: Number(customer.totalSpending.toFixed(2)),
        orderCount: customer.orderCount,
        averageOrderValue: Number((customer.averageOrderValue || 0).toFixed(2))
      })),
      statusDistribution: statusMap,
      statusRevenue: statusRevenueMap,
      topProducts: topProducts.map(item => ({
        product: item._id,
        totalOrders: item.totalOrders,
        completedOrders: item.completedOrders,
        revenue: Number(item.revenue.toFixed(2)),
        avgPrice: Number((item.avgPrice || 0).toFixed(2))
      })),
      userMetrics: {
        totalUsers,
        adminCount,
        customerCount,
        activeBuyers,
        newUsersThisMonth,
        conversionRate
      },
      recentActivity: recentOrders.map(order => ({
        _id: order._id,
        product: order.product,
        amount: order.amount,
        status: order.status,
        username: order.userId?.username || 'Unknown',
        createdAt: order.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
