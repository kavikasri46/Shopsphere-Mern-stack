const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Order = require('./models/Order');

// Connect to MongoDB - Use 127.0.0.1 instead of localhost to avoid IPv6 issues
let mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shopsphere';
// Replace localhost with 127.0.0.1 to avoid IPv6 connection issues
mongoURI = mongoURI.replace('mongodb://localhost:', 'mongodb://127.0.0.1:');

mongoose.connect(mongoURI)
.then(() => console.log('✓ MongoDB connected for seeding'))
.catch(err => console.error('✗ MongoDB connection error:', err));

// Sample data
const seedData = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Order.deleteMany({});
    console.log('Cleared existing data');

    // Create users
    const admin = new User({
      username: 'admin',
      email: 'admin@shopsphere.com',
      password: 'admin123',
      role: 'admin'
    });
    await admin.save();
    console.log('Created admin user');

    const users = [];
    for (let i = 1; i <= 5; i++) {
      const user = new User({
        username: `user${i}`,
        email: `user${i}@example.com`,
        password: 'user123',
        role: 'user'
      });
      await user.save();
      users.push(user);
      console.log(`Created user${i}`);
    }

    // Create sample orders
    const products = [
      'MacBook Pro', 'iPhone 15', 'AirPods Pro', 'iPad Air', 'Apple Watch',
      'Samsung Galaxy S24', 'Dell XPS 15', 'Sony WH-1000XM5', 'Nintendo Switch',
      'PlayStation 5', 'Xbox Series X', 'Canon EOS R5', 'DJI Mavic 3',
      'Tesla Model 3', 'Nike Air Max', 'Adidas Ultraboost', 'Rolex Submariner'
    ];

    const statuses = ['pending', 'processing', 'completed', 'cancelled'];
    const orders = [];

    // Create orders for each user with various dates
    for (let i = 0; i < 50; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      const amount = Math.floor(Math.random() * 5000) + 50;
      
      // Create orders with dates spread over the last 6 months
      const daysAgo = Math.floor(Math.random() * 180);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);

      const order = new Order({
        userId: randomUser._id,
        product: randomProduct,
        amount: amount,
        status: randomStatus,
        createdAt: createdAt
      });
      orders.push(order);
    }

    // Add some orders for admin user
    for (let i = 0; i < 10; i++) {
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      const amount = Math.floor(Math.random() * 5000) + 50;
      
      const daysAgo = Math.floor(Math.random() * 180);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);

      const order = new Order({
        userId: admin._id,
        product: randomProduct,
        amount: amount,
        status: randomStatus,
        createdAt: createdAt
      });
      orders.push(order);
    }

    await Order.insertMany(orders);
    console.log(`Created ${orders.length} orders`);

    console.log('\n✅ Sample data seeded successfully!');
    console.log('\nLogin credentials:');
    console.log('Admin - Email: admin@shopsphere.com, Password: admin123');
    console.log('User1 - Email: user1@example.com, Password: user123');
    console.log('\nYou can now start the server and login to view the dashboard.');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
