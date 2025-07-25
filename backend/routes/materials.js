// const express = require('express');
// const router = express.Router();
// const Material = require('../models/Material');
// const mongoose = require('mongoose');
// const path = require('path');
// const fs = require('fs');

// // Get all materials with search and filter capabilities
// router.get('/search', async (req, res) => {
//   try {
//     const { 
//       search, 
//       type, 
//       subject, 
//       sortBy = 'uploadedAt',
//       sortOrder = 'desc',
//       page = 1,
//       limit = 12
//     } = req.query;

//     console.log('Materials search params:', { search, type, subject, sortBy, sortOrder, page, limit });

//     // Build query
//     let query = {};

//     // Filter by type
//     if (type && type !== 'all') {
//       query.type = type;
//     }

//     // Filter by subject
//     if (subject && subject !== 'all') {
//       query.subject = subject;
//     }

//     // Search functionality
//     if (search && search.trim()) {
//       query.$or = [
//         { title: { $regex: search, $options: 'i' } },
//         { description: { $regex: search, $options: 'i' } },
//         { subject: { $regex: search, $options: 'i' } },
//         { customSubject: { $regex: search, $options: 'i' } },
//         { tags: { $in: [new RegExp(search, 'i')] } }
//       ];
//     }

//     // Build sort object - Fixed to handle different sort fields properly
//     const sortOptions = {};
    
//     // Validate sortBy field
//     const validSortFields = ['uploadedAt', 'title', 'createdAt', 'lastAccessed', 'accessCount'];
//     const sortField = validSortFields.includes(sortBy) ? sortBy : 'uploadedAt';
    
//     // Validate sortOrder
//     const order = (sortOrder === 'asc' || sortOrder === 'desc') ? sortOrder : 'desc';
    
//     sortOptions[sortField] = order === 'desc' ? -1 : 1;
    
//     console.log('Final sort options:', sortOptions);

//     // Execute query with pagination
//     const materials = await Material.find(query)
//       .sort(sortOptions)
//       .limit(parseInt(limit))
//       .skip((parseInt(page) - 1) * parseInt(limit))
//       .exec();

//     // Get total count for pagination
//     const total = await Material.countDocuments(query);

//     // Get unique subjects for filter options
//     const subjects = await Material.distinct('subject');

//     res.json({
//       success: true,
//       data: materials,
//       subjects: subjects,
//       pagination: {
//         currentPage: parseInt(page),
//         totalPages: Math.ceil(total / parseInt(limit)),
//         totalItems: total,
//         itemsPerPage: parseInt(limit),
//         // Alternative format for compatibility
//         page: parseInt(page),
//         limit: parseInt(limit),
//         total: total,
//         pages: Math.ceil(total / parseInt(limit))
//       },
//       debug: {
//         query: query,
//         sortOptions: sortOptions,
//         totalFound: total
//       },
//       message: `Found ${materials.length} materials`
//     });

//   } catch (error) {
//     console.error('Error fetching materials:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch materials',
//       error: error.message
//     });
//   }
// });


// module.exports = router;
const express = require('express');
const router = express.Router();
const Material = require('../models/Material');
const mongoose = require('mongoose');

// Get all materials with search and filter capabilities
router.get('/search', async (req, res) => {
  try {
    const { 
      search,
      type,
      subject,
      sortBy = 'uploadedAt',
      sortOrder = 'desc',
      page = 1,
      limit = 12
    } = req.query;

    console.log('Materials search params:', { search, type, subject, sortBy, sortOrder, page, limit });

    // Build query
    let query = {};

    // Filter by type
    if (type && type !== 'all') {
      query.type = type;
    }

    // Filter by subject
    if (subject && subject !== 'all') {
      query.subject = subject;
    }

    // Search functionality
    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { customSubject: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Build sort object
    const sortOptions = {};
    
    // Validate sortBy field
    const validSortFields = ['uploadedAt', 'title', 'createdAt', 'lastAccessed', 'accessCount'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'uploadedAt';
    
    // Validate sortOrder
    const order = (sortOrder === 'asc' || sortOrder === 'desc') ? sortOrder : 'desc';
    
    sortOptions[sortField] = order === 'desc' ? -1 : 1;
    
    console.log('Final sort options:', sortOptions);

    // Execute query with pagination
    const materials = await Material.find(query)
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .exec();

    // Get total count for pagination
    const total = await Material.countDocuments(query);

    // Get unique subjects for filter options
    const subjects = await Material.distinct('subject');

    res.json({
      success: true,
      data: materials,
      subjects: subjects,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit),
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      },
      debug: {
        query: query,
        sortOptions: sortOptions,
        totalFound: total
      },
      message: `Found ${materials.length} materials`
    });

  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch materials',
      error: error.message
    });
  }
});

// Health check for materials route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Materials routes working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;