# Quick Setup Guide

## Step 1: Backend Setup

1. Navigate to backend folder:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/shopsphere
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
FRONTEND_URL=http://localhost:5173
```

4. Make sure MongoDB is running on your system

5. (Optional) Seed sample data:
```bash
node seed.js
```

6. Start backend server:
```bash
npm run dev
```

Backend will run on: http://localhost:5000

## Step 2: Frontend Setup

1. Open a new terminal and navigate to frontend folder:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start frontend development server:
```bash
npm run dev
```

Frontend will run on: http://localhost:5173

## Step 3: Access the Application

1. Open browser and go to: http://localhost:5173

2. Register a new admin user:
   - Username: admin
   - Email: admin@shopsphere.com
   - Password: admin123
   - Role: Admin

3. Or login with seeded data:
   - Email: admin@shopsphere.com
   - Password: admin123

## Default Credentials (if you ran seed.js)

**Admin:**
- Email: admin@shopsphere.com
- Password: admin123

**Regular Users:**
- Email: user1@example.com
- Password: user123
- (user2@example.com through user5@example.com also available)

## Troubleshooting

### MongoDB Not Running
- Windows: `net start MongoDB`
- macOS/Linux: `sudo systemctl start mongod` or `mongod`

### Port Already in Use
- Change PORT in backend/.env
- Change port in frontend/vite.config.js

### CORS Errors
- Ensure FRONTEND_URL in backend/.env matches your frontend URL
- Check that both servers are running

### Socket.IO Connection Issues
- Verify backend is running on port 5000
- Check browser console for connection errors
- Ensure CORS is properly configured
