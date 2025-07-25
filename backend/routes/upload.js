const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const Material = require('../models/Material');
const path = require('path');
const fs = require('fs');
const { formatFileSize } = require('../utils/fileHelpers');

// Upload endpoint for both links and PDFs
router.post('/upload', upload.array('pdfs'), async (req, res) => {
  const uploadedFiles = []; // Track uploaded files for cleanup on error
  
  try {
    const { links } = req.body;
    const uploadedMaterials = [];

    // Process links
    if (links) {
      const linksData = JSON.parse(links);
      
      for (const linkData of linksData) {
        if (linkData.url && linkData.url.trim()) {
          // Validate subject for links
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
            filePath: linkData.url // For links, use URL as filePath
          });

          const savedMaterial = await material.save();
          uploadedMaterials.push(savedMaterial);
        }
      }
    }

    // Process PDF files
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        uploadedFiles.push(file.path); // Track file for potential cleanup
        
        // Fixed field name matching - use consistent naming
        const title = req.body[`pdf_${i}_title`] || file.originalname;
        const subject = req.body[`pdf_${i}_subject`];
        const customSubject = req.body[`pdf_${i}_customSubject`];

        // Validate subject for PDFs
        const finalSubject = subject === 'custom' ? customSubject : subject;
        
        if (!finalSubject || finalSubject.trim() === '') {
          throw new Error(`Subject is required for PDF: ${file.originalname}`);
        }

        // Create material document
        const material = new Material({
          type: 'pdf',
          title: title,
          filename: file.filename,
          filePath: file.path, // Use the actual file path instead of empty string
          size: formatFileSize(file.size),
          originalName: file.originalname,
          mimeType: file.mimetype,
          subject: finalSubject.trim(),
          customSubject: subject === 'custom' ? customSubject : undefined,
          description: title || 'PDF material'
        });

        const savedMaterial = await material.save();
        uploadedMaterials.push(savedMaterial);

        // Only delete the file AFTER successful database save if you don't want to keep files
        // Comment out the deletion code below if you want to keep the files
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
            console.log(`✅ Deleted uploaded file: ${file.path}`);
          }
        } catch (deleteError) {
          console.error(`❌ Error deleting file ${file.path}:`, deleteError);
          // Continue execution even if file deletion fails
        }
      }
    }

    // Check if any materials were uploaded
    if (uploadedMaterials.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid materials to upload. Please provide at least one link or PDF with required fields.'
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${uploadedMaterials.length} materials`,
      data: uploadedMaterials
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up any uploaded files if there was an error
    if (uploadedFiles.length > 0) {
      uploadedFiles.forEach(filePath => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🧹 Cleaned up file after error: ${filePath}`);
          }
        } catch (cleanupError) {
          console.error(`❌ Error cleaning up file ${filePath}:`, cleanupError);
        }
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to upload materials',
      error: error.message
    });
  }
});

module.exports = router;