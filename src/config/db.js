const mongoose = require('mongoose');

/**
 * Configure separate connections for different MongoDB instances
 */

// Connection for standard data (Users, Documents, etc.)
const coolifyConn = mongoose.createConnection(process.env.MONGO_URI_COOLIFY || process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Connection for embeddings data (Atlas only for Vector Search)
const atlasConn = mongoose.createConnection(process.env.MONGO_URI_ATLAS, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

coolifyConn.on('connected', () => {
  console.log(`✅ Coolify MongoDB Connected: ${coolifyConn.host}`);
});

coolifyConn.on('error', (err) => {
  console.error(`❌ Coolify MongoDB Connection Error: ${err.message}`);
});

atlasConn.on('connected', () => {
  console.log(`✅ Atlas MongoDB Connected: ${atlasConn.host}`);
});

atlasConn.on('error', (err) => {
  console.error(`❌ Atlas MongoDB Connection Error: ${err.message}`);
});

module.exports = {
  coolifyConn,
  atlasConn,
};
