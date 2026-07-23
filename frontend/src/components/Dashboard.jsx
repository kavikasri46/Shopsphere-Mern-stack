import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import socketService from '../services/socketService';
import StatsCards from './StatsCards';
import MonthlySalesChart from './MonthlySalesChart';
import TopCustomers from './TopCustomers';
import OrderManagement from './OrderManagement';
import './Dashboard.css';

function Dashboard() {
  const { user, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    totalRevenue: 0,
    totalCompletedOrders: 0,
    monthlySales: [],
    topCustomers: [],
    statusDistribution: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Check if user is admin
    if (user?.role !== 'admin') {
      setError('Access denied. Admin privileges required to view analytics.');
      setLoading(false);
      return;
    }

    // Connect to Socket.IO
    const socket = socketService.connect();
    setIsConnected(socket.connected);

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Listen for real-time order updates
    socket.on('newOrder', (order) => {
      console.log('New order received:', order);
      fetchDashboardData(); // Refresh dashboard data
    });

    socket.on('orderUpdated', (order) => {
      console.log('Order updated:', order);
      fetchDashboardData();
    });

    socket.on('orderDeleted', () => {
      fetchDashboardData();
    });

    // Fetch initial dashboard data
    fetchDashboardData();

    return () => {
      socketService.disconnect();
    };
  }, [user]);

  const fetchDashboardData = async () => {
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
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  if (error && !dashboardData.totalRevenue) {
    return (
      <div className="dashboard-container">
        <div className="error-container">
          <h2>Access Denied</h2>
          <p>{error}</p>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>ShopSphere Analytics Dashboard</h1>
          <p className="subtitle">Real-Time Sales Performance & Customer Insights</p>
        </div>
        <div className="header-right">
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            {isConnected ? 'Live' : 'Offline'}
          </div>
          <div className="user-info">
            <span>{user?.username}</span>
            <span className="user-role">({user?.role})</span>
          </div>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </header>

      {error && (
        <div className="error-banner">{error}</div>
      )}

      <StatsCards
        totalRevenue={dashboardData.totalRevenue}
        totalOrders={dashboardData.totalCompletedOrders}
        statusDistribution={dashboardData.statusDistribution}
      />

      <div className="charts-grid">
        <MonthlySalesChart monthlySales={dashboardData.monthlySales} />
        <TopCustomers topCustomers={dashboardData.topCustomers} />
      </div>

      <OrderManagement onOrderChange={fetchDashboardData} />
    </div>
  );
}

export default Dashboard;
