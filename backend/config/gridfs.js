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

// middleware/gridfsUpload.js
const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const mongoose = require('mongoose');

// Use memory storage instead of disk storage
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

module.exports = upload;

// routes/upload.js - Updated for GridFS
const express = require('express');
const router = express.Router();
const upload = require('../middleware/gridfsUpload');
const Material = require('../models/Material');
const { getGfsBucket } = require('../config/gridfs');
const { formatFileSize } = require('../utils/fileHelpers');
const { Readable } = require('stream');

// Upload endpoint with GridFS
router.post('/upload', upload.array('pdfs'), async (req, res) => {
  try {
    const { links } = req.body;
    const uploadedMaterials = [];

    // Process links (same as before)
    if (links) {
      const linksData = JSON.parse(links);
      
      for (const linkData of linksData) {
        if (linkData.url && linkData.url.trim()) {
          const finalSubject = linkData.subject === 'custom' ? linkData.customSubject : linkData.subject;
          
          if (!finalSubject || finalSubject.trim() === '') {
            throw new Error(`Subject is required for link: ${linkData.url}`);
          }

          const material = new Material({
            type: 'link',
            title: linkData.title || linkData.url,
            url: linkData.url,
            subject: finalSubject.trim(),
            customSubject: linkData.subject === 'custom' ? linkData.customSubject : undefined,
            description: linkData.title || 'Link material',
            filePath: linkData.url
          });

          const savedMaterial = await material.save();
          uploadedMaterials.push(savedMaterial);
        }
      }
    }

    // Process PDF files with GridFS
    if (req.files && req.files.length > 0) {
      const gfsBucket = getGfsBucket();

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        
        const title = req.body[`pdf_${i}_title`] || file.originalname;
        const subject = req.body[`pdf_${i}_subject`];
        const customSubject = req.body[`pdf_${i}_customSubject`];

        const finalSubject = subject === 'custom' ? customSubject : subject;
        
        if (!finalSubject || finalSubject.trim() === '') {
          throw new Error(`Subject is required for PDF: ${file.originalname}`);
        }

        // Upload file to GridFS
        const uploadStream = gfsBucket.openUploadStream(file.originalname, {
          metadata: {
            originalName: file.originalname,
            mimeType: file.mimetype,
            uploadDate: new Date(),
            subject: finalSubject.trim(),
            title: title
          }
        });

        // Convert buffer to readable stream and pipe to GridFS
        const readableStream = new Readable();
        readableStream.push(file.buffer);
        readableStream.push(null);

        // Promise to handle the upload completion
        const gridFSUpload = new Promise((resolve, reject) => {
          uploadStream.on('error', reject);
          uploadStream.on('finish', resolve);
        });

        readableStream.pipe(uploadStream);
        await gridFSUpload;

        // Create material document with GridFS file ID
        const material = new Material({
          type: 'pdf',
          title: title,
          filename: file.originalname,
          filePath: uploadStream.id.toString(), // Store GridFS ObjectId as string
          gridfsId: uploadStream.id, // Store actual ObjectId for GridFS operations
          size: formatFileSize(file.size),
          originalName: file.originalname,
          mimeType: file.mimetype,
          subject: finalSubject.trim(),
          customSubject: subject === 'custom' ? customSubject : undefined,
          description: title || 'PDF material'
        });

        const savedMaterial = await material.save();
        uploadedMaterials.push(savedMaterial);
      }
    }

    if (uploadedMaterials.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid materials to upload.'
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${uploadedMaterials.length} materials`,
      data: uploadedMaterials
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to upload materials',
      error: error.message
    });
  }
});

// Route to download/view PDF from GridFS
router.get('/pdf/:id', async (req, res) => {
  try {
    const gfsBucket = getGfsBucket();
    const fileId = new require('mongoose').Types.ObjectId(req.params.id);

    // Check if file exists
    const files = await gfsBucket.find({ _id: fileId }).toArray();
    
    if (!files || files.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'PDF not found'
      });
    }

    const file = files[0];

    // Set appropriate headers for PDF
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${file.filename}"`,
      'Content-Length': file.length
    });

    // Create download stream and pipe to response
    const downloadStream = gfsBucket.openDownloadStream(fileId);
    downloadStream.pipe(res);

    downloadStream.on('error', (error) => {
      console.error('Download error:', error);
      res.status(500).json({
        success: false,
        message: 'Error downloading file'
      });
    });

  } catch (error) {
    console.error('PDF access error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to access PDF',
      error: error.message
    });
  }
});

// Route to get PDF metadata
router.get('/pdf/:id/info', async (req, res) => {
  try {
    const gfsBucket = getGfsBucket();
    const fileId = new require('mongoose').Types.ObjectId(req.params.id);

    const files = await gfsBucket.find({ _id: fileId }).toArray();
    
    if (!files || files.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'PDF not found'
      });
    }

    const file = files[0];
    
    res.json({
      success: true,
      data: {
        id: file._id,
        filename: file.filename,
        size: file.length,
        uploadDate: file.uploadDate,
        metadata: file.metadata
      }
    });

  } catch (error) {
    console.error('PDF info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get PDF info',
      error: error.message
    });
  }
});

// Route to delete PDF from GridFS
router.delete('/pdf/:id', async (req, res) => {
  try {
    const gfsBucket = getGfsBucket();
    const fileId = new require('mongoose').Types.ObjectId(req.params.id);

    // Delete from GridFS
    await gfsBucket.delete(fileId);

    // Also delete from Material collection
    await Material.findOneAndDelete({ gridfsId: fileId });

    res.json({
      success: true,
      message: 'PDF deleted successfully'
    });

  } catch (error) {
    console.error('PDF deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete PDF',
      error: error.message
    });
  }
});

module.exports = router;