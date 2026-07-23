import React from 'react';
import './TopCustomers.css';

function TopCustomers({ topCustomers }) {
  return (
    <div className="top-customers-container">
      <h2>Top 5 Customers</h2>
      {topCustomers.length === 0 ? (
        <p className="no-data">No customer data available</p>
      ) : (
        <div className="customers-list">
          {topCustomers.map((customer, index) => (
            <div key={customer.userId || index} className="customer-card">
              <div className="customer-rank">#{index + 1}</div>
              <div className="customer-info">
                <h3>{customer.username || 'Unknown User'}</h3>
                <p className="customer-email">{customer.email || 'N/A'}</p>
              </div>
              <div className="customer-stats">
                <div className="stat-item">
                  <span className="stat-label">Total Spending</span>
                  <span className="stat-value">${customer.totalSpending?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Orders</span>
                  <span className="stat-value">{customer.orderCount || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TopCustomers;
