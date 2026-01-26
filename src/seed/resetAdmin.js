require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

/**
 * Reset Admin User
 * Deletes existing admin and creates a new one with current .env credentials
 * Run this script with: node src/seed/resetAdmin.js
 */
const resetAdmin = async () => {
  try {
    // Connect to database
    await connectDB();

    // Get admin credentials from environment variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || 'Admin User';

    // Validate environment variables
    if (!adminEmail || !adminPassword) {
      console.error('❌ Error: ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env file');
      process.exit(1);
    }

    // Delete existing admin if exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      await User.deleteOne({ email: adminEmail });
      console.log('🗑️  Old admin user deleted');
    }

    // Create new admin user
    const admin = await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword, // Will be hashed by pre-save hook
      role: 'admin',
    });

    console.log('✅ Admin user created successfully with new password!');
    console.log('─────────────────────────────────');
    console.log(`📧 Email: ${admin.email}`);
    console.log(`👤 Name: ${admin.name}`);
    console.log(`🔑 Role: ${admin.role}`);
    console.log(`🔐 Password: ${adminPassword}`);
    console.log(`🆔 ID: ${admin._id}`);
    console.log('─────────────────────────────────');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting admin:', error.message);
    process.exit(1);
  }
};

// Run reset function
resetAdmin();
