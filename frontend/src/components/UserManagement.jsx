import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './UserManagement.css';

const INITIAL_FORM = {
  username: '',
  email: '',
  password: '',
  role: 'user'
};

function UserManagement({ onUserChange }) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({
    totalUsers: 0,
    adminCount: 0,
    customerCount: 0,
    activeBuyers: 0
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { sortBy };
      if (roleFilter !== 'all') params.role = roleFilter;
      if (search.trim()) params.search = search.trim();

      const response = await api.get('/users', { params });
      setUsers(response.data.users || []);
      if (response.data.summary) {
        setSummary(response.data.summary);
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.response?.data?.message || 'Failed to fetch users'
      });
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search, sortBy]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setEditingUser(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    if (showForm && !editingUser) {
      resetForm();
      return;
    }
    setEditingUser(null);
    setFormData(INITIAL_FORM);
    setShowForm(true);
    setFeedback({ type: '', message: '' });
  };

  const openEditForm = (targetUser) => {
    setEditingUser(targetUser);
    setFormData({
      username: targetUser.username || '',
      email: targetUser.email || '',
      password: '',
      role: targetUser.role || 'user'
    });
    setShowForm(true);
    setFeedback({ type: '', message: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback({ type: '', message: '' });

    try {
      if (editingUser) {
        const payload = {
          username: formData.username,
          email: formData.email,
          role: formData.role
        };
        if (formData.password.trim()) {
          payload.password = formData.password;
        }
        const response = await api.put(`/users/${editingUser._id}`, payload);
        setFeedback({ type: 'success', message: response.data.message || 'User updated' });
      } else {
        const response = await api.post('/users', formData);
        setFeedback({ type: 'success', message: response.data.message || 'User created' });
      }
      resetForm();
      await fetchUsers();
      if (onUserChange) onUserChange();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.response?.data?.message || 'Failed to save user'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (targetUser, newRole) => {
    if (targetUser.role === newRole) return;
    setFeedback({ type: '', message: '' });

    try {
      const response = await api.put(`/users/${targetUser._id}`, { role: newRole });
      setFeedback({ type: 'success', message: response.data.message || 'Role updated' });
      await fetchUsers();
      if (onUserChange) onUserChange();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.response?.data?.message || 'Failed to update role'
      });
    }
  };

  const handleDelete = async (targetUser) => {
    if (!window.confirm(`Delete user "${targetUser.username}" (${targetUser.email})?`)) return;
    setFeedback({ type: '', message: '' });

    try {
      const response = await api.delete(`/users/${targetUser._id}`);
      setFeedback({ type: 'success', message: response.data.message || 'User deleted' });
      await fetchUsers();
      if (onUserChange) onUserChange();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.response?.data?.message || 'Failed to delete user'
      });
    }
  };

  const currentUserId = currentUser?.id || currentUser?._id;

  return (
    <div className="user-management">
      <div className="user-header">
        <div>
          <h2>User Management</h2>
          <p className="user-subtitle">Manage accounts, roles, and customer purchase activity</p>
        </div>
        <button onClick={openCreateForm} className="add-user-btn">
          {showForm && !editingUser ? '✕ Cancel' : '+ Add User'}
        </button>
      </div>

      <div className="user-summary-bar">
        <div className="summary-pill">
          <span className="summary-label">Total Users</span>
          <span className="summary-value">{summary.totalUsers}</span>
        </div>
        <div className="summary-pill">
          <span className="summary-label">Admins</span>
          <span className="summary-value">{summary.adminCount}</span>
        </div>
        <div className="summary-pill">
          <span className="summary-label">Customers</span>
          <span className="summary-value">{summary.customerCount}</span>
        </div>
        <div className="summary-pill">
          <span className="summary-label">Active Buyers</span>
          <span className="summary-value">{summary.activeBuyers}</span>
        </div>
      </div>

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

      {showForm && (
        <div className="user-form">
          <h3>{editingUser ? `Edit User: ${editingUser.username}` : 'Create New User'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  placeholder="Enter username"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="user@example.com"
                />
              </div>
              <div className="form-group">
                <label>{editingUser ? 'New Password (optional)' : 'Password'}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                  minLength={6}
                  placeholder={editingUser ? 'Leave blank to keep current' : 'Min 6 characters'}
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  disabled={editingUser && editingUser._id === currentUserId}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" disabled={submitting} className="submit-btn">
                {submitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
              </button>
              <button type="button" onClick={resetForm} className="cancel-btn">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="user-controls">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username or email..."
          className="user-search-input"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admins</option>
          <option value="user">Users</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="filter-select"
        >
          <option value="createdAt">Newest Joined</option>
          <option value="totalSpending">Highest Spending</option>
          <option value="orderCount">Most Orders</option>
          <option value="username">Name (A-Z)</option>
        </select>
      </div>

      {loading ? (
        <div className="user-loading">Loading users...</div>
      ) : (
        <div className="users-table">
          {users.length === 0 ? (
            <p className="no-users">No users match your filter</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Orders</th>
                  <th>Total Spent</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u._id === currentUserId;
                  return (
                    <tr key={u._id}>
                      <td>
                        <div className="user-cell">
                          <span className="user-name">
                            {u.username}
                            {isSelf && <span className="self-badge">You</span>}
                          </span>
                          <span className="user-email">{u.email}</span>
                        </div>
                      </td>
                      <td>
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u, e.target.value)}
                          disabled={isSelf}
                          className={`role-select role-${u.role}`}
                          title={isSelf ? 'You cannot change your own role' : 'Change role'}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td>
                        <span className="orders-cell">
                          {u.orderCount || 0}
                          <small className="orders-sub">
                            ({u.completedOrders || 0} completed)
                          </small>
                        </span>
                      </td>
                      <td className="spending-cell">
                        ${(u.totalSpending || 0).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                      <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            onClick={() => openEditForm(u)}
                            className="edit-btn"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(u)}
                            disabled={isSelf}
                            className="delete-btn"
                            title={isSelf ? 'You cannot delete your own account' : 'Delete user'}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default UserManagement;

