import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import socketService from '../services/socketService';
import './Dashboard.css';
import './StatsCards.css';
import './UserDashboard.css';

const FEATURED_PRODUCTS = [
  { name: 'MacBook Pro', price: 1999, category: 'Laptops' },
  { name: 'iPhone 15', price: 999, category: 'Phones' },
  { name: 'AirPods Pro', price: 249, category: 'Audio' },
  { name: 'iPad Air', price: 599, category: 'Tablets' },
  { name: 'Apple Watch', price: 399, category: 'Wearables' },
  { name: 'Sony WH-1000XM5', price: 349, category: 'Audio' }
];

const USER_SECTION_META = {
  overview: {
    title: 'My Dashboard',
    subtitle: 'Your personal orders, spending summary, and latest updates'
  },
  shop: {
    title: 'Place an Order',
    subtitle: 'Choose a featured product or create a custom order'
  },
  orders: {
    title: 'My Orders',
    subtitle: 'Track order statuses and manage your pending purchases'
  },
  profile: {
    title: 'My Profile',
    subtitle: 'Your ShopSphere account details and lifetime order summary'
  }
};

function UserDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [isConnected, setIsConnected] = useState(false);
  const [formData, setFormData] = useState({ product: '', amount: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchMyOrders = useCallback(async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data.orders || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const socket = socketService.connect();
    setIsConnected(socket.connected);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    const handleRefresh = () => fetchMyOrders();

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    const events = [
      'newOrder',
      'bulkOrders',
      'orderUpdated',
      'ordersUpdated',
      'orderDeleted',
      'ordersDeleted'
    ];
    events.forEach(event => socket.on(event, handleRefresh));

    fetchMyOrders();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      events.forEach(event => socket.off(event, handleRefresh));
      socketService.disconnect();
    };
  }, [fetchMyOrders]);

  const metrics = useMemo(() => {
    const completed = orders.filter(o => o.status === 'completed');
    const pending = orders.filter(o => o.status === 'pending');
    const processing = orders.filter(o => o.status === 'processing');
    const cancelled = orders.filter(o => o.status === 'cancelled');

    const totalSpent = completed.reduce((sum, o) => sum + (o.amount || 0), 0);
    const pendingTotal = [...pending, ...processing].reduce((sum, o) => sum + (o.amount || 0), 0);
    const avgOrder = completed.length > 0 ? totalSpent / completed.length : 0;

    return {
      totalOrders: orders.length,
      completedCount: completed.length,
      pendingCount: pending.length,
      processingCount: processing.length,
      cancelledCount: cancelled.length,
      totalSpent,
      pendingTotal,
      avgOrder
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return orders;
    return orders.filter(o => o.status === statusFilter);
  }, [orders, statusFilter]);

  const handleSelectSection = (sectionId) => {
    setActiveTab(sectionId);
    setMobileMenuOpen(false);
  };

  const handleCreateOrder = async (product, amount) => {
    setSubmitting(true);
    setFeedback({ type: '', message: '' });
    try {
      await api.post('/orders', {
        product,
        amount: Number(amount),
        status: 'pending'
      });
      setFormData({ product: '', amount: '' });
      setFeedback({ type: 'success', message: `Order placed for "${product}"!` });
      await fetchMyOrders();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to place order'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomOrderSubmit = (e) => {
    e.preventDefault();
    if (!formData.product.trim() || Number(formData.amount) <= 0) return;
    handleCreateOrder(formData.product.trim(), formData.amount);
  };

  const handleCancelOrder = async (order) => {
    if (!window.confirm(`Cancel your order for "${order.product}"?`)) return;
    try {
      await api.put(`/orders/${order._id}`, { status: 'cancelled' });
      setFeedback({ type: 'success', message: `Order "${order.product}" cancelled.` });
      await fetchMyOrders();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to cancel order'
      });
    }
  };

  const handleDeleteOrder = async (order) => {
    if (!window.confirm(`Remove order "${order.product}" from your history?`)) return;
    try {
      await api.delete(`/orders/${order._id}`);
      setFeedback({ type: 'success', message: `Order "${order.product}" removed.` });
      await fetchMyOrders();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to remove order'
      });
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading your dashboard...</div>
      </div>
    );
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: '🏠' },
    { id: 'shop', label: 'Place Order', icon: '🛍️' },
    { id: 'orders', label: 'My Orders', icon: '📦', badge: metrics.totalOrders },
    { id: 'profile', label: 'Profile', icon: '👤' }
  ];

  const currentSection = USER_SECTION_META[activeTab] || USER_SECTION_META.overview;
  const userInitial = (user?.username || 'U').charAt(0).toUpperCase();

  return (
    <div className={`admin-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {mobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`admin-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <div className="brand-logo">S</div>
            {!sidebarCollapsed && (
              <div className="brand-text">
                <span className="brand-name">ShopSphere</span>
                <span className="brand-tag">Customer Portal</span>
              </div>
            )}
          </div>
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '›' : '‹'}
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="User sidebar navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => handleSelectSection(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              {!sidebarCollapsed && (
                <>
                  <span className="nav-label">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="nav-badge">{item.badge}</span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className={`sidebar-connection ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            {!sidebarCollapsed && (
              <span>{isConnected ? 'Socket Live' : 'Socket Offline'}</span>
            )}
          </div>

          <div className="sidebar-user">
            <div className="user-avatar">{userInitial}</div>
            {!sidebarCollapsed && (
              <div className="sidebar-user-meta">
                <span className="sidebar-username">{user?.username}</span>
                <span className="sidebar-userrole">{user?.role || 'user'}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={logout}
            className="sidebar-logout-btn"
            title={sidebarCollapsed ? 'Logout' : undefined}
          >
            <span aria-hidden="true">🚪</span>
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="dashboard-header">
          <div className="header-left">
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              ☰
            </button>
            <div>
              <h1>{currentSection.title}</h1>
              <p className="subtitle">{currentSection.subtitle}</p>
            </div>
          </div>

          <div className="header-right">
            <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
              <span className="status-dot"></span>
              {isConnected ? 'Live' : 'Offline'}
            </div>
            <button
              type="button"
              onClick={fetchMyOrders}
              className="refresh-btn"
            >
              ↻ Refresh
            </button>
          </div>
        </header>

        {error && <div className="error-banner">{error}</div>}

        {feedback.message && (
          <div className={`user-feedback ${feedback.type}`}>
            <span>{feedback.message}</span>
            <button
              type="button"
              className="feedback-close"
              onClick={() => setFeedback({ type: '', message: '' })}
            >
              ✕
            </button>
          </div>
        )}

        {activeTab === 'overview' && (
          <>
            <div className="stats-cards">
              <div className="stat-card revenue">
                <div className="stat-icon">💳</div>
                <div className="stat-content">
                  <h3>Total Spent</h3>
                  <p className="stat-value">
                    ${metrics.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="stat-label">
                    Across {metrics.completedCount} completed orders
                  </p>
                </div>
              </div>

              <div className="stat-card orders">
                <div className="stat-icon">📦</div>
                <div className="stat-content">
                  <h3>My Orders</h3>
                  <p className="stat-value">{metrics.totalOrders}</p>
                  <p className="stat-label">
                    ${metrics.pendingTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} active in pipeline
                  </p>
                </div>
              </div>

              <div className="stat-card average">
                <div className="stat-icon">📊</div>
                <div className="stat-content">
                  <h3>Avg Order Value</h3>
                  <p className="stat-value">
                    ${metrics.avgOrder.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="stat-label">Per completed purchase</p>
                </div>
              </div>

              <div className="stat-card status">
                <div className="stat-icon">⚡</div>
                <div className="stat-content">
                  <h3>Order Status</h3>
                  <div className="status-breakdown">
                    <span className="status-item completed">{metrics.completedCount} Completed</span>
                    <span className="status-item pending">{metrics.pendingCount} Pending</span>
                    <span className="status-item processing">{metrics.processingCount} Processing</span>
                    <span className="status-item cancelled">{metrics.cancelledCount} Cancelled</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="recent-activity-card">
              <div className="recent-activity-header">
                <h2>Recent Orders</h2>
                <div className="user-quick-links">
                  <button
                    type="button"
                    className="view-all-link"
                    onClick={() => handleSelectSection('shop')}
                  >
                    + New Order
                  </button>
                  <button
                    type="button"
                    className="view-all-link"
                    onClick={() => handleSelectSection('orders')}
                  >
                    View all orders →
                  </button>
                </div>
              </div>

              {orders.length === 0 ? (
                <div className="user-empty-state">
                  <p>You have not placed any orders yet.</p>
                  <button
                    type="button"
                    className="add-user-btn"
                    onClick={() => handleSelectSection('shop')}
                  >
                    Place Your First Order
                  </button>
                </div>
              ) : (
                <div className="recent-activity-list">
                  {orders.slice(0, 5).map((item) => (
                    <div key={item._id} className="activity-row">
                      <div className="activity-main">
                        <strong>{item.product}</strong>
                      </div>
                      <div className="activity-meta">
                        <span className={`activity-status status-${item.status}`}>
                          {item.status}
                        </span>
                        <span className="activity-amount">
                          ${item.amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="activity-date">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'shop' && (
          <div className="user-shop-grid">
            <div className="user-card-panel">
              <h2>Featured Products</h2>
              <p className="panel-desc">Click &ldquo;Order Now&rdquo; to place an instant order.</p>
              <div className="featured-products-grid">
                {FEATURED_PRODUCTS.map((item) => (
                  <div key={item.name} className="featured-product-card">
                    <span className="product-category-tag">{item.category}</span>
                    <h3>{item.name}</h3>
                    <p className="featured-price">${item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    <button
                      type="button"
                      disabled={submitting}
                      className="order-now-btn"
                      onClick={() => handleCreateOrder(item.name, item.price)}
                    >
                      Order Now
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="user-card-panel">
              <h2>Custom Order</h2>
              <p className="panel-desc">Request a custom product or bundle order.</p>
              <form onSubmit={handleCustomOrderSubmit} className="custom-order-form">
                <div className="form-group">
                  <label>Product Name</label>
                  <input
                    type="text"
                    value={formData.product}
                    onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                    required
                    placeholder="e.g. Dell XPS 15"
                  />
                </div>
                <div className="form-group">
                  <label>Amount ($)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    placeholder="0.00"
                  />
                </div>
                <button type="submit" disabled={submitting} className="submit-btn">
                  {submitting ? 'Placing Order...' : 'Place Order'}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="user-card-panel">
            <div className="order-header">
              <h2>My Order History</h2>
              <div className="order-controls">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleSelectSection('shop')}
                  className="add-order-btn"
                >
                  + Place Order
                </button>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <p className="no-orders">No orders found for this filter.</p>
            ) : (
              <div className="orders-table">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Ordered On</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order._id}>
                        <td><strong>{order.product}</strong></td>
                        <td>
                          ${order.amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td>
                          <span className={`activity-status status-${order.status}`}>
                            {order.status}
                          </span>
                        </td>
                        <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="action-buttons">
                            {order.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => handleCancelOrder(order)}
                                className="cancel-order-btn"
                              >
                                Cancel
                              </button>
                            )}
                            {(order.status === 'pending' || order.status === 'cancelled') && (
                              <button
                                type="button"
                                onClick={() => handleDeleteOrder(order)}
                                className="delete-btn"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="user-card-panel profile-panel">
            <div className="profile-header">
              <div className="profile-avatar-lg">{userInitial}</div>
              <div>
                <h2>{user?.username}</h2>
                <p className="profile-email">{user?.email}</p>
                <span className="profile-role-badge">{user?.role || 'user'}</span>
              </div>
            </div>

            <div className="profile-stats-grid">
              <div className="profile-stat-box">
                <span className="summary-label">Total Orders</span>
                <span className="summary-value">{metrics.totalOrders}</span>
              </div>
              <div className="profile-stat-box">
                <span className="summary-label">Completed Orders</span>
                <span className="summary-value">{metrics.completedCount}</span>
              </div>
              <div className="profile-stat-box">
                <span className="summary-label">Lifetime Spend</span>
                <span className="summary-value">
                  ${metrics.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="profile-stat-box">
                <span className="summary-label">Member Since</span>
                <span className="summary-value">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active Member'}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default UserDashboard;

