const express = require('express');
const router = express.Router();
const Material = require('../models/Material');
const path = require('path');
const fs = require('fs');

// Get all materials with search and filter capabilities
router.get('/materials', async (req, res) => {
  try {
    const { 
      search, 
      type, 
      subject, 
      sortBy = 'uploadDate', 
      sortOrder = 'desc',
      page = 1,
      limit = 50
    } = req.query;

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
        { customSubject: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const materials = await Material.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Get total count for pagination
    const total = await Material.countDocuments(query);

    // Get unique subjects for filter options
    const subjects = await Material.distinct('subject');

    res.json({
      success: true,
      data: materials,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      },
      subjects: subjects,
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

// Get single material by ID
router.get('/materials/:id', async (req, res) => {
  try {
    const material = await Material.findOne({ id: req.params.id });
    
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    res.json({
      success: true,
      data: material
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

// Download PDF file
router.get('/materials/:id/download', async (req, res) => {
  try {
    const material = await Material.findOne({ id: req.params.id });
    
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    if (material.type !== 'pdf') {
      return res.status(400).json({
        success: false,
        message: 'This material is not a PDF file'
      });
    }

    const filePath = path.resolve(material.filePath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Increment download count
    await Material.updateOne(
      { id: req.params.id },
      { $inc: { downloadCount: 1 } }
    );

    // Set headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${material.originalName}"`);
    
    // Send file
    res.sendFile(filePath);

  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file',
      error: error.message
    });
  }
});

// Delete material
router.delete('/materials/:id', async (req, res) => {
  try {
    const material = await Material.findOne({ id: req.params.id });
    
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    // If it's a PDF, delete the file from filesystem
    if (material.type === 'pdf' && material.filePath) {
      const filePath = path.resolve(material.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete from database
    await Material.deleteOne({ id: req.params.id });

    res.json({
      success: true,
      message: 'Material deleted successfully'
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

module.exports = router;