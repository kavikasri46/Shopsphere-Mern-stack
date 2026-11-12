import React from 'react';
import './TopProducts.css';

function TopProducts({ topProducts = [] }) {
  const maxRevenue = topProducts.length > 0
    ? Math.max(...topProducts.map(item => item.revenue || 0), 1)
    : 1;

  return (
    <div className="top-products-container">
      <h2>Top Selling Products</h2>
      {topProducts.length === 0 ? (
        <p className="no-data">No product analytics available yet</p>
      ) : (
        <div className="products-list">
          {topProducts.map((item, index) => {
            const widthPct = Math.max(((item.revenue || 0) / maxRevenue) * 100, 4);
            return (
              <div key={item.product || index} className="product-analytics-item">
                <div className="product-analytics-header">
                  <div className="product-title-group">
                    <span className="product-rank">#{index + 1}</span>
                    <div>
                      <h4>{item.product}</h4>
                      <span className="product-meta">
                        {item.completedOrders} completed / {item.totalOrders} total orders · Avg ${item.avgPrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <span className="product-revenue">
                    ${item.revenue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="product-progress-track">
                  <div
                    className="product-progress-fill"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TopProducts;

