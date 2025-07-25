// config/gridfs.js
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

let gfsBucket;

// Initialize GridFS bucket after MongoDB connection
mongoose.connection.once('open', () => {
  gfsBucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'uploads' // Collection name will be uploads.files and uploads.chunks
  });
  console.log('📁 GridFS initialized');
});

const getGfsBucket = () => {
  if (!gfsBucket) {
    throw new Error('GridFS not initialized. Make sure MongoDB is connected.');
  }
  return gfsBucket;
};

module.exports = { getGfsBucket };