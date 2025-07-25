require('dotenv').config();
const mongoose = require('mongoose');
const Material = require('../models/Material');

const seedData = [
  {
    type: 'link',
    title: 'React Documentation',
    url: 'https://reactjs.org/docs',
    description: 'Official React documentation for learning React concepts',
    tags: ['react', 'frontend', 'javascript']
  },
  {
    type: 'link',
    title: 'MongoDB Tutorial', 
    url: 'https://docs.mongodb.com/manual/tutorial',
    description: 'Complete guide to MongoDB database operations',
    tags: ['mongodb', 'database', 'backend']
  },
  {
    type: 'pdf',
    title: 'JavaScript Fundamentals.pdf',
    filename: 'sample-javascript.pdf',
    filePath: '/uploads/sample-javascript.pdf',
    size: '2.5 MB',
    originalName: 'JavaScript Fundamentals.pdf',
    description: 'Comprehensive guide to JavaScript programming',
    tags: ['javascript', 'programming', 'fundamentals']
  }
];

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📊 Connected to MongoDB');

    const count = await Material.countDocuments();
    if (count === 0) {
      await Material.insertMany(seedData);
      console.log('✅ Database seeded with initial data');
    } else {
      console.log('📋 Database already contains data, skipping seed');
    }

    await mongoose.connection.close();
    console.log('📊 Database connection closed');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();