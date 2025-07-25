// // routes/materials.js (Fixed version)
const express = require('express');
const router = express.Router();
const Material = require('../models/Material');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Debug middleware
router.use((req, res, next) => {
  console.log(`📚 Materials route: ${req.method} ${req.url}`);
  next();
});

// Health check for materials route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Materials service is healthy',
    timestamp: new Date().toISOString()
  });
});

// Get all materials (basic endpoint)
router.get('/', async (req, res) => {
  try {
    const materials = await Material.find()
      .sort({ uploadedAt: -1 })
      .limit(50)
      .exec();

    res.json({
      success: true,
      data: materials,
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

    // Build sort object - Fixed to handle different sort fields properly
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
        // Alternative format for compatibility
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

// Get material by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid material ID format'
      });
    }

    const material = await Material.findById(id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    // Update access count
    await material.recordAccess();

    res.json({
      success: true,
      data: material,
      message: 'Material retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching material:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch material',
      error: error.message
    });
  }
});

// Delete material
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid material ID format'
      });
    }

    const material = await Material.findByIdAndDelete(id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    res.json({
      success: true,
      message: 'Material deleted successfully',
      data: material
    });

  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete material',
      error: error.message
    });
  }
});

// Get subjects for dropdown
router.get('/meta/subjects', async (req, res) => {
  try {
    const subjects = await Material.distinct('subject');
    
    res.json({
      success: true,
      data: subjects,
      message: `Found ${subjects.length} unique subjects`
    });

  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subjects',
      error: error.message
    });
  }
});

// Get statistics
router.get('/meta/stats', async (req, res) => {
  try {
    const [totalMaterials, pdfCount, linkCount, subjects] = await Promise.all([
      Material.countDocuments(),
      Material.countDocuments({ type: 'pdf' }),
      Material.countDocuments({ type: 'link' }),
      Material.distinct('subject')
    ]);

    res.json({
      success: true,
      data: {
        totalMaterials,
        pdfCount,
        linkCount,
        subjectCount: subjects.length,
        subjects
      },
      message: 'Statistics retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

module.exports = router;