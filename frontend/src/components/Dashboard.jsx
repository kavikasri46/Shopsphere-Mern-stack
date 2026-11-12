import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import socketService from '../services/socketService';
import StatsCards from './StatsCards';
import MonthlySalesChart from './MonthlySalesChart';
import OrderStatusChart from './OrderStatusChart';
import TopProducts from './TopProducts';
import TopCustomers from './TopCustomers';
import OrderManagement from './OrderManagement';
import UserManagement from './UserManagement';
import UserDashboard from './UserDashboard';
import './Dashboard.css';

const SECTION_META = {
  overview: {
    title: 'Overview',
    subtitle: 'Real-time store performance, revenue pipeline, and latest orders'
  },
  analytics: {
    title: 'Analytics & Insights',
    subtitle: 'Sales trends, order status distribution, top products, and customer intelligence'
  },
  orders: {
    title: 'Order Management',
    subtitle: 'Track, filter, create, and update customer orders'
  },
  users: {
    title: 'User Management',
    subtitle: 'Manage accounts, admin roles, and customer purchase activity'
  }
};

function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    totalRevenue: 0,
    totalCompletedOrders: 0,
    totalOrders: 0,
    pendingRevenue: 0,
    completionRate: 0,
    cancellationRate: 0,
    monthlySales: [],
    topCustomers: [],
    topProducts: [],
    statusDistribution: {},
    statusRevenue: {},
    userMetrics: {
      totalUsers: 0,
      adminCount: 0,
      customerCount: 0,
      activeBuyers: 0,
      newUsersThisMonth: 0,
      conversionRate: 0
    },
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await api.get('/analytics/dashboard');
      setDashboardData(response.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch dashboard data');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const socket = socketService.connect();
    setIsConnected(socket.connected);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    const handleRefresh = () => fetchDashboardData();

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    const events = [
      'newOrder',
      'bulkOrders',
      'orderUpdated',
      'ordersUpdated',
      'orderDeleted',
      'ordersDeleted',
      'userCreated',
      'userUpdated',
      'userDeleted'
    ];
    events.forEach(event => socket.on(event, handleRefresh));

    fetchDashboardData();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      events.forEach(event => socket.off(event, handleRefresh));
      socketService.disconnect();
    };
  }, [user, fetchDashboardData]);

  const handleSelectSection = (sectionId) => {
    setActiveTab(sectionId);
    setMobileMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'orders', label: 'Orders', icon: '📦', badge: dashboardData.totalOrders || 0 },
    { id: 'users', label: 'Users', icon: '👥', badge: dashboardData.userMetrics?.totalUsers || 0 }
  ];

  const currentSection = SECTION_META[activeTab] || SECTION_META.overview;
  const userInitial = (user?.username || 'A').charAt(0).toUpperCase();

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
                <span className="brand-tag">Admin Console</span>
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

        <nav className="sidebar-nav" aria-label="Admin sidebar navigation">
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
                <span className="sidebar-userrole">{user?.role}</span>
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
              onClick={fetchDashboardData}
              className="refresh-btn"
              title="Refresh data"
            >
              ↻ Refresh
            </button>
          </div>
        </header>

        {error && (
          <div className="error-banner">{error}</div>
        )}

        {activeTab === 'overview' && (
          <>
            <StatsCards
              totalRevenue={dashboardData.totalRevenue}
              totalOrders={dashboardData.totalCompletedOrders}
              pendingRevenue={dashboardData.pendingRevenue}
              completionRate={dashboardData.completionRate}
              cancellationRate={dashboardData.cancellationRate}
              statusDistribution={dashboardData.statusDistribution}
              userMetrics={dashboardData.userMetrics}
            />

            <div className="charts-grid">
              <MonthlySalesChart monthlySales={dashboardData.monthlySales} />
              <OrderStatusChart
                statusDistribution={dashboardData.statusDistribution}
                statusRevenue={dashboardData.statusRevenue}
              />
            </div>

            {dashboardData.recentActivity?.length > 0 && (
              <div className="recent-activity-card">
                <div className="recent-activity-header">
                  <h2>Recent Orders</h2>
                  <button
                    type="button"
                    className="view-all-link"
                    onClick={() => handleSelectSection('orders')}
                  >
                    Manage all orders →
                  </button>
                </div>
                <div className="recent-activity-list">
                  {dashboardData.recentActivity.map((item) => (
                    <div key={item._id} className="activity-row">
                      <div className="activity-main">
                        <strong>{item.product}</strong>
                        <span className="activity-user">by {item.username}</span>
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
              </div>
            )}
          </>
        )}

        {activeTab === 'analytics' && (
          <>
            <StatsCards
              totalRevenue={dashboardData.totalRevenue}
              totalOrders={dashboardData.totalCompletedOrders}
              pendingRevenue={dashboardData.pendingRevenue}
              completionRate={dashboardData.completionRate}
              cancellationRate={dashboardData.cancellationRate}
              statusDistribution={dashboardData.statusDistribution}
              userMetrics={dashboardData.userMetrics}
            />

            <div className="charts-grid">
              <MonthlySalesChart monthlySales={dashboardData.monthlySales} />
              <OrderStatusChart
                statusDistribution={dashboardData.statusDistribution}
                statusRevenue={dashboardData.statusRevenue}
              />
            </div>

            <div className="charts-grid">
              <TopProducts topProducts={dashboardData.topProducts} />
              <TopCustomers topCustomers={dashboardData.topCustomers} />
            </div>
          </>
        )}

        {activeTab === 'orders' && (
          <OrderManagement onOrderChange={fetchDashboardData} />
        )}

        {activeTab === 'users' && (
          <UserManagement onUserChange={fetchDashboardData} />
        )}
      </main>
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return <UserDashboard />;
  }

  return <AdminDashboard />;
}

export default Dashboard;
