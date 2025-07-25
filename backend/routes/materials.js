const express = require('express');
const router = express.Router();
const Material = require('../models/Material');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Get all materials with search and filter capabilities
router.get('/search', async (req, res) => {
  try {
    const { 
      search, 
      type, 
      subject, 
      sortBy = 'uploadedAt',  // Changed to match your Material model
      sortOrder = 'desc',
      page = 1,
      limit = 12
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
        { customSubject: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Build sort object
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

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
router.get('/:id', async (req, res) => {
  try {
    // Try to find by MongoDB _id first, then by custom id field
    let material;
    
    try {
      // Check if it's a valid ObjectId
      if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        material = await Material.findById(req.params.id);
      }
    } catch (error) {
      console.log('Not a valid ObjectId, trying custom id field');
    }
    
    // If not found by _id, try custom id field
    if (!material) {
      material = await Material.findOne({ id: req.params.id });
    }
    
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

// Download PDF file (GridFS compatible)
router.get('/:id/download', async (req, res) => {
  try {
    let material;
    
    // Try to find material by different ID formats
    try {
      if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        material = await Material.findById(req.params.id);
      }
    } catch (error) {
      // Not a valid ObjectId
    }
    
    if (!material) {
      material = await Material.findOne({ id: req.params.id });
    }
    
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

    // If it's a GridFS file
    if (material.gridfsId) {
      const { getGfsBucket } = require('../config/gridfs');
      const gfsBucket = getGfsBucket();
      
      let fileId;
      try {
        fileId = new mongoose.Types.ObjectId(material.gridfsId);
      } catch (objectIdError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid GridFS file ID'
        });
      }

      // Check if file exists in GridFS
      const files = await gfsBucket.find({ _id: fileId }).toArray();
      
      if (!files || files.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'File not found in GridFS'
        });
      }

      const file = files[0];

      // Increment access count
      try {
        await material.recordAccess();
      } catch (accessError) {
        console.error('Error updating access count:', accessError);
      }

      // Set headers for file download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${material.originalName || material.filename}"`);
      
      // Create download stream and pipe to response
      const downloadStream = gfsBucket.openDownloadStream(fileId);
      downloadStream.pipe(res);

      downloadStream.on('error', (error) => {
        console.error('Download error:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Error downloading file'
          });
        }
      });

      return;
    }

    // Legacy file system handling (for backward compatibility)
    if (material.filePath) {
      const filePath = path.resolve(material.filePath);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File not found on server'
        });
      }

      // Increment download count for legacy files
      await Material.updateOne(
        { _id: material._id },
        { $inc: { accessCount: 1 }, lastAccessed: new Date() }
      );

      // Set headers for file download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${material.originalName || material.filename}"`);
      
      // Send file
      res.sendFile(filePath);
      return;
    }

    return res.status(404).json({
      success: false,
      message: 'File path not found'
    });

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
router.delete('/:id', async (req, res) => {
  try {
    let material;
    
    // Try to find material by different ID formats
    try {
      if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        material = await Material.findById(req.params.id);
      }
    } catch (error) {
      // Not a valid ObjectId
    }
    
    if (!material) {
      material = await Material.findOne({ id: req.params.id });
    }
    
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    // If it's a GridFS file, delete from GridFS
    if (material.gridfsId) {
      const { getGfsBucket } = require('../config/gridfs');
      const gfsBucket = getGfsBucket();
      
      try {
        const fileId = new mongoose.Types.ObjectId(material.gridfsId);
        await gfsBucket.delete(fileId);
        console.log(`Deleted file from GridFS: ${material.gridfsId}`);
      } catch (gridfsError) {
        console.error('Error deleting from GridFS:', gridfsError);
        // Continue with material deletion even if GridFS deletion fails
      }
    }

    // If it's a legacy PDF, delete the file from filesystem
    if (material.type === 'pdf' && material.filePath && !material.gridfsId) {
      const filePath = path.resolve(material.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted legacy file: ${filePath}`);
      }
    }

    // Delete from database
    await Material.findByIdAndDelete(material._id);

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

// Get all materials (main route, compatible with your frontend)
router.get('/', async (req, res) => {
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
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const materials = await Material.find(query)
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .exec();

    // Get total count for pagination
    const total = await Material.countDocuments(query);

    // Get unique subjects for filter dropdown
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
      }
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

module.exports = router;