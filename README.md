# ShopSphere - Real-Time Sales Analytics Dashboard

A complete MERN stack application for real-time sales analytics and order management, built as a capstone project.

## Project Overview

ShopSphere is a secure, real-time analytics dashboard that allows administrators to monitor sales performance, customer behavior, and manage orders in real-time. The application features JWT-based authentication, MongoDB aggregation pipelines for analytics, and Socket.IO for real-time updates.

## Features

### Part A - Authentication & Authorization ✅
- JWT-based user authentication
- Admin-only access to analytics APIs
- Protected routes using middleware

### Part B - Order Management & MongoDB Operations ✅
- Order schema with fields: userId, product, amount, status, createdAt
- REST APIs for inserting new orders
- CRUD operations using insertMany, find, updateMany, deleteMany

### Part C - Advanced Analytics using Aggregation ✅
- Total revenue calculation from completed orders
- Monthly sales reports
- Top 5 customers based on total spending using aggregation pipelines

### Part D - Real-Time Dashboard ✅
- Socket.IO integration for real-time communication
- Automatic dashboard updates when new orders are placed
- No manual page refresh or polling mechanisms

### Part E - Dashboard UI & REST APIs ✅
- React-based dashboard displaying total revenue, monthly sales, and top customers
- Secure API consumption using JWT tokens
- Responsive and professional UI design

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- Socket.IO
- JWT (jsonwebtoken)
- bcryptjs

### Frontend
- React
- React Router
- Axios
- Socket.IO Client
- Chart.js & react-chartjs-2
- Vite

## Project Structure

```
MERN/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   └── Order.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── orders.js
│   │   └── analytics.js
│   ├── middleware/
│   │   └── auth.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── StatsCards.jsx
│   │   │   ├── MonthlySalesChart.jsx
│   │   │   ├── TopCustomers.jsx
│   │   │   └── OrderManagement.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── socketService.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/shopsphere
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
FRONTEND_URL=http://localhost:5173
```

4. Start MongoDB (if running locally):
```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod
# or
mongod
```

5. (Optional) Seed sample data:
```bash
node seed.js
```

6. Start the backend server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The backend server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## API Endpoints

### Authentication

#### Register User
- **POST** `/api/auth/register`
- **Body:**
```json
{
  "username": "admin",
  "email": "admin@shopsphere.com",
  "password": "password123",
  "role": "admin"
}
```

#### Login
- **POST** `/api/auth/login`
- **Body:**
```json
{
  "email": "admin@shopsphere.com",
  "password": "password123"
}
```

### Orders (Protected - Requires JWT Token)

#### Create Order
- **POST** `/api/orders`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "product": "Laptop",
  "amount": 999.99,
  "status": "pending"
}
```

#### Bulk Insert Orders
- **POST** `/api/orders/bulk`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "orders": [
    {
      "product": "Product 1",
      "amount": 100,
      "status": "pending"
    },
    {
      "product": "Product 2",
      "amount": 200,
      "status": "completed"
    }
  ]
}
```

#### Get All Orders
- **GET** `/api/orders`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  - `status`: Filter by status (pending, processing, completed, cancelled)
  - `userId`: Filter by user ID

#### Get Single Order
- **GET** `/api/orders/:id`
- **Headers:** `Authorization: Bearer <token>`

#### Update Order
- **PUT** `/api/orders/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "status": "completed"
}
```

#### Bulk Update Orders
- **PUT** `/api/orders/bulk`
- **Headers:** `Authorization: Bearer <token>` (Admin only)
- **Body:**
```json
{
  "filter": { "status": "pending" },
  "update": { "status": "processing" }
}
```

#### Delete Order
- **DELETE** `/api/orders/:id`
- **Headers:** `Authorization: Bearer <token>`

#### Bulk Delete Orders
- **DELETE** `/api/orders/bulk`
- **Headers:** `Authorization: Bearer <token>` (Admin only)
- **Body:**
```json
{
  "filter": { "status": "cancelled" }
}
```

### Analytics (Protected - Admin Only)

#### Get Total Revenue
- **GET** `/api/analytics/revenue`
- **Headers:** `Authorization: Bearer <token>` (Admin only)

#### Get Monthly Sales
- **GET** `/api/analytics/monthly-sales`
- **Headers:** `Authorization: Bearer <token>` (Admin only)

#### Get Top 5 Customers
- **GET** `/api/analytics/top-customers`
- **Headers:** `Authorization: Bearer <token>` (Admin only)

#### Get Dashboard Data (All Analytics)
- **GET** `/api/analytics/dashboard`
- **Headers:** `Authorization: Bearer <token>` (Admin only)

## Authentication Flow

1. **Registration/Login:**
   - User registers or logs in via `/api/auth/register` or `/api/auth/login`
   - Server returns JWT token and user information
   - Frontend stores token in localStorage

2. **Protected Routes:**
   - Frontend includes token in `Authorization` header: `Bearer <token>`
   - Backend middleware verifies token
   - Admin routes check user role

3. **Token Expiration:**
   - Tokens expire after 7 days
   - Frontend automatically redirects to login on 401 response

## Sample Data

### Creating Sample Users

You can create users via the registration API or use the seed script:

```javascript
// Example: Create admin user
POST /api/auth/register
{
  "username": "admin",
  "email": "admin@shopsphere.com",
  "password": "admin123",
  "role": "admin"
}

// Example: Create regular user
POST /api/auth/register
{
  "username": "john",
  "email": "john@example.com",
  "password": "user123",
  "role": "user"
}
```

### Sample Orders Data

```json
[
  {
    "product": "MacBook Pro",
    "amount": 2499.99,
    "status": "completed"
  },
  {
    "product": "iPhone 15",
    "amount": 999.99,
    "status": "completed"
  },
  {
    "product": "AirPods Pro",
    "amount": 249.99,
    "status": "pending"
  },
  {
    "product": "iPad Air",
    "amount": 599.99,
    "status": "processing"
  },
  {
    "product": "Apple Watch",
    "amount": 399.99,
    "status": "completed"
  }
]
```

## Real-Time Features

The application uses Socket.IO for real-time updates:

- **New Order Event:** When a new order is created, all connected clients receive a `newOrder` event
- **Order Update Event:** When an order is updated, clients receive an `orderUpdated` event
- **Order Delete Event:** When an order is deleted, clients receive an `orderDeleted` event
- **Bulk Operations:** Bulk operations emit appropriate events to update all clients

## MongoDB Operations Used

1. **insertMany:** Bulk insert orders (`POST /api/orders/bulk`)
2. **find:** Retrieve orders with filters (`GET /api/orders`)
3. **updateMany:** Bulk update orders (`PUT /api/orders/bulk`)
4. **deleteMany:** Bulk delete orders (`DELETE /api/orders/bulk`)
5. **Aggregation Pipelines:** Used extensively in analytics routes for:
   - Revenue calculation
   - Monthly sales grouping
   - Top customers ranking

## Security Features

- JWT token-based authentication
- Password hashing using bcryptjs
- Protected routes with middleware
- Admin-only access to analytics APIs
- CORS configuration
- Input validation

## Development Notes

- Backend runs on port 5000
- Frontend runs on port 5173
- MongoDB connection string can be configured in `.env`
- JWT secret should be changed in production
- Socket.IO CORS is configured for frontend URL

## Production Deployment

1. Set environment variables in production
2. Use a secure JWT secret
3. Configure MongoDB Atlas or production MongoDB instance
4. Build frontend: `npm run build` in frontend directory
5. Serve frontend build with a production server (nginx, etc.)
6. Use PM2 or similar for backend process management

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check MongoDB URI in `.env` file
- Verify network connectivity

### Authentication Issues
- Check JWT token in localStorage
- Verify token hasn't expired
- Ensure correct role for admin routes

### Socket.IO Connection Issues
- Check CORS configuration
- Verify Socket.IO server is running
- Check browser console for connection errors

## License

This project is created for educational purposes as a capstone project.

## Author

MERN Stack Capstone Project - ShopSphere Real-Time Sales Analytics Dashboard
