import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './OrderManagement.css';

function OrderManagement({ onOrderChange }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    product: '',
    amount: '',
    status: 'pending'
  });
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await api.get('/orders', { params });
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/orders', formData);
      setFormData({ product: '', amount: '', status: 'pending' });
      setShowForm(false);
      fetchOrders();
      onOrderChange();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create order');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    
    try {
      await api.delete(`/orders/${id}`);
      fetchOrders();
      onOrderChange();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete order');
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await api.put(`/orders/${id}`, { status: newStatus });
      fetchOrders();
      onOrderChange();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update order');
    }
  };

  return (
    <div className="order-management">
      <div className="order-header">
        <h2>Order Management</h2>
        <div className="order-controls">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            onClick={() => setShowForm(!showForm)}
            className="add-order-btn"
          >
            {showForm ? '✕ Cancel' : '+ Add Order'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="order-form">
          <h3>Create New Order</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Product</label>
                <input
                  type="text"
                  value={formData.product}
                  onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                  required
                  placeholder="Product name"
                />
              </div>
              <div className="form-group">
                <label>Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  placeholder="0.00"
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <button type="submit" className="submit-btn">Create Order</button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading orders...</div>
      ) : (
        <div className="orders-table">
          {orders.length === 0 ? (
            <p className="no-orders">No orders found</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id}>
                    <td>{order.product}</td>
                    <td>${order.amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                        className={`status-select status-${order.status}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        onClick={() => handleDelete(order._id)}
                        className="delete-btn"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default OrderManagement;
