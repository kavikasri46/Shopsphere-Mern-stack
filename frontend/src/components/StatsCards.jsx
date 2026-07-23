import React from 'react';
import './StatsCards.css';

function StatsCards({ totalRevenue, totalOrders, statusDistribution }) {
  const pendingOrders = statusDistribution?.pending || 0;
  const processingOrders = statusDistribution?.processing || 0;
  const completedOrders = statusDistribution?.completed || 0;
  const cancelledOrders = statusDistribution?.cancelled || 0;
  const totalAllOrders = pendingOrders + processingOrders + completedOrders + cancelledOrders;
  const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;

  return (
    <div className="stats-cards">
      <div className="stat-card revenue">
        <div className="stat-icon">💰</div>
        <div className="stat-content">
          <h3>Total Revenue</h3>
          <p className="stat-value">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="stat-label">From {totalOrders} completed orders</p>
        </div>
      </div>

      <div className="stat-card orders">
        <div className="stat-icon">📦</div>
        <div className="stat-content">
          <h3>Total Orders</h3>
          <p className="stat-value">{totalAllOrders}</p>
          <p className="stat-label">
            {completedOrders} completed, {pendingOrders} pending
          </p>
        </div>
      </div>

      <div className="stat-card average">
        <div className="stat-icon">📊</div>
        <div className="stat-content">
          <h3>Avg Order Value</h3>
          <p className="stat-value">${avgOrderValue}</p>
          <p className="stat-label">Per completed order</p>
        </div>
      </div>

      <div className="stat-card status">
        <div className="stat-icon">⚡</div>
        <div className="stat-content">
          <h3>Order Status</h3>
          <div className="status-breakdown">
            <span className="status-item completed">{completedOrders} Completed</span>
            <span className="status-item pending">{pendingOrders} Pending</span>
            <span className="status-item processing">{processingOrders} Processing</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatsCards;
