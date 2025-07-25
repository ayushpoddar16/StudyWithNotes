// // routes/upload.js (Fixed ObjectId usage)
// const express = require('express');
// const router = express.Router();
// const upload = require('../middleware/gridfsUpload');
// const Material = require('../models/Material');
// const { getGfsBucket } = require('../config/gridfs');
// const { formatFileSize } = require('../utils/fileHelpers');
// const { extractTagsFromDescription, extractTagsFromFilename } = require('../utils/tagExtractor');
// const { Readable } = require('stream');
// const mongoose = require('mongoose');

// // Upload endpoint with GridFS - No local file storage
// router.post('/upload', upload.array('pdfs'), async (req, res) => {
//   try {
//     const { links } = req.body;
//     const uploadedMaterials = [];

//     // Process links (unchanged)
//     if (links) {
//       const linksData = JSON.parse(links);
      
//       for (const linkData of linksData) {
//         if (linkData.url && linkData.url.trim()) {
//           const finalSubject = linkData.subject === 'custom' ? linkData.customSubject : linkData.subject;
          
//           if (!finalSubject || finalSubject.trim() === '') {
//             throw new Error(`Subject is required for link: ${linkData.url}`);
//           }

//           // Extract tags from title/description
//           const tags = [
//             ...extractTagsFromDescription(linkData.title),
//             ...extractTagsFromDescription(linkData.description)
//           ];

//           const material = new Material({
//             type: 'link',
//             title: linkData.title || linkData.url,
//             url: linkData.url,
//             subject: finalSubject.trim(),
//             customSubject: linkData.subject === 'custom' ? linkData.customSubject : undefined,
//             description: linkData.description || linkData.title || 'Link material',
//             tags: [...new Set(tags)], // Remove duplicates
//             filePath: linkData.url
//           });

//           const savedMaterial = await material.save();
//           uploadedMaterials.push(savedMaterial);
//         }
//       }
//     }

//     // Process PDF files with GridFS - Store directly in MongoDB
//     if (req.files && req.files.length > 0) {
//       const gfsBucket = getGfsBucket();

//       for (let i = 0; i < req.files.length; i++) {
//         const file = req.files[i];
        
//         const title = req.body[`pdf_${i}_title`] || file.originalname;
//         const subject = req.body[`pdf_${i}_subject`];
//         const customSubject = req.body[`pdf_${i}_customSubject`];
//         const description = req.body[`pdf_${i}_description`] || title;

//         const finalSubject = subject === 'custom' ? customSubject : subject;
        
//         if (!finalSubject || finalSubject.trim() === '') {
//           throw new Error(`Subject is required for PDF: ${file.originalname}`);
//         }

//         // Extract tags from filename and description
//         const tags = [
//           ...extractTagsFromFilename(file.originalname),
//           ...extractTagsFromDescription(description),
//           ...extractTagsFromDescription(title)
//         ];

//         // Upload file to GridFS - Direct MongoDB storage
//         const uploadStream = gfsBucket.openUploadStream(file.originalname, {
//           metadata: {
//             originalName: file.originalname,
//             mimeType: file.mimetype,
//             uploadDate: new Date(),
//             subject: finalSubject.trim(),
//             title: title,
//             description: description,
//             tags: [...new Set(tags)] // Remove duplicates
//           }
//         });

//         // Convert buffer to readable stream and pipe to GridFS
//         const readableStream = new Readable();
//         readableStream.push(file.buffer);
//         readableStream.push(null);

//         // Promise to handle the upload completion
//         const gridFSUpload = new Promise((resolve, reject) => {
//           uploadStream.on('error', reject);
//           uploadStream.on('finish', resolve);
//         });

//         readableStream.pipe(uploadStream);
//         await gridFSUpload;

//         // Create material document with GridFS file ID
//         const material = new Material({
//           type: 'pdf',
//           title: title,
//           filename: file.originalname,
//           filePath: uploadStream.id.toString(), // Store GridFS ObjectId as string
//           gridfsId: uploadStream.id, // Store actual ObjectId for GridFS operations
//           size: formatFileSize(file.size),
//           originalName: file.originalname,
//           mimeType: file.mimetype,
//           subject: finalSubject.trim(),
//           customSubject: subject === 'custom' ? customSubject : undefined,
//           description: description,
//           tags: [...new Set(tags)] // Store tags in Material document too
//         });

//         const savedMaterial = await material.save();
//         uploadedMaterials.push(savedMaterial);

//         console.log(`✅ PDF uploaded to GridFS: ${file.originalname} (ID: ${uploadStream.id})`);
//       }
//     }

//     if (uploadedMaterials.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'No valid materials to upload.'
//       });
//     }

//     res.status(201).json({
//       success: true,
//       message: `Successfully uploaded ${uploadedMaterials.length} materials`,
//       data: uploadedMaterials
//     });

//   } catch (error) {
//     console.error('Upload error:', error);
    
//     res.status(500).json({
//       success: false,
//       message: 'Failed to upload materials',
//       error: error.message
//     });
//   }
// });

// // Route to download/view PDF from GridFS
// router.get('/pdf/:id', async (req, res) => {
//   try {
//     const gfsBucket = getGfsBucket();
    
//     // FIX: Proper ObjectId instantiation
//     let fileId;
//     try {
//       fileId = new mongoose.Types.ObjectId(req.params.id);
//     } catch (objectIdError) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid file ID format'
//       });
//     }

//     // Check if file exists in GridFS
//     const files = await gfsBucket.find({ _id: fileId }).toArray();
    
//     if (!files || files.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'PDF not found'
//       });
//     }

//     const file = files[0];

//     // Update access count in Material document
//     try {
//       const material = await Material.findOne({ gridfsId: fileId });
//       if (material) {
//         await material.recordAccess();
//       }
//     } catch (accessError) {
//       console.error('Error updating access count:', accessError);
//       // Continue with file serving even if access count update fails
//     }

//     // Set appropriate headers for PDF
//     res.set({
//       'Content-Type': 'application/pdf',
//       'Content-Disposition': `inline; filename="${file.filename}"`,
//       'Content-Length': file.length,
//       'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
//       'ETag': file._id.toString()
//     });

//     // Create download stream and pipe to response
//     const downloadStream = gfsBucket.openDownloadStream(fileId);
//     downloadStream.pipe(res);

//     downloadStream.on('error', (error) => {
//       console.error('Download error:', error);
//       if (!res.headersSent) {
//         res.status(500).json({
//           success: false,
//           message: 'Error downloading file'
//         });
//       }
//     });

//   } catch (error) {
//     console.error('PDF access error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to access PDF',
//       error: error.message
//     });
//   }
// });


// module.exports = router;
const express = require('express');
const router = express.Router();
const upload = require('../middleware/gridfsUpload');
const Material = require('../models/Material');
const { getGfsBucket } = require('../config/gridfs');
const { formatFileSize } = require('../utils/fileHelpers');
const { extractTagsFromDescription, extractTagsFromFilename } = require('../utils/tagExtractor');
const { Readable } = require('stream');
const mongoose = require('mongoose');

// Upload endpoint with GridFS - No local file storage
router.post('/', upload.array('pdfs'), async (req, res) => {
  try {
    const { links } = req.body;
    const uploadedMaterials = [];

    // Process links (unchanged)
    if (links) {
      const linksData = JSON.parse(links);
      
      for (const linkData of linksData) {
        if (linkData.url && linkData.url.trim()) {
          const finalSubject = linkData.subject === 'custom' ? linkData.customSubject : linkData.subject;
          
          if (!finalSubject || finalSubject.trim() === '') {
            throw new Error(`Subject is required for link: ${linkData.url}`);
          }

          // Extract tags from title/description
          const tags = [
            ...extractTagsFromDescription(linkData.title),
            ...extractTagsFromDescription(linkData.description)
          ];

          const material = new Material({
            type: 'link',
            title: linkData.title || linkData.url,
            url: linkData.url,
            subject: finalSubject.trim(),
            customSubject: linkData.subject === 'custom' ? linkData.customSubject : undefined,
            description: linkData.description || linkData.title || 'Link material',
            tags: [...new Set(tags)], // Remove duplicates
            filePath: linkData.url
          });

          const savedMaterial = await material.save();
          uploadedMaterials.push(savedMaterial);
        }
      }
    }

    // Process PDF files with GridFS - Store directly in MongoDB
    if (req.files && req.files.length > 0) {
      const gfsBucket = getGfsBucket();

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        
        const title = req.body[`pdf_${i}_title`] || file.originalname;
        const subject = req.body[`pdf_${i}_subject`];
        const customSubject = req.body[`pdf_${i}_customSubject`];
        const description = req.body[`pdf_${i}_description`] || title;

        const finalSubject = subject === 'custom' ? customSubject : subject;
        
        if (!finalSubject || finalSubject.trim() === '') {
          throw new Error(`Subject is required for PDF: ${file.originalname}`);
        }

        // Extract tags from filename and description
        const tags = [
          ...extractTagsFromFilename(file.originalname),
          ...extractTagsFromDescription(description),
          ...extractTagsFromDescription(title)
        ];

        // Upload file to GridFS - Direct MongoDB storage
        const uploadStream = gfsBucket.openUploadStream(file.originalname, {
          metadata: {
            originalName: file.originalname,
            mimeType: file.mimetype,
            uploadDate: new Date(),
            subject: finalSubject.trim(),
            title: title,
            description: description,
            tags: [...new Set(tags)] // Remove duplicates
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
          description: description,
          tags: [...new Set(tags)] // Store tags in Material document too
        });

        const savedMaterial = await material.save();
        uploadedMaterials.push(savedMaterial);

        console.log(`✅ PDF uploaded to GridFS: ${file.originalname} (ID: ${uploadStream.id})`);
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
    
    // Proper ObjectId validation
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file ID format'
      });
    }

    const fileId = new mongoose.Types.ObjectId(req.params.id);

    // Check if file exists in GridFS
    const files = await gfsBucket.find({ _id: fileId }).toArray();
    
    if (!files || files.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'PDF not found'
      });
    }

    const file = files[0];

    // Update access count in Material document
    try {
      const material = await Material.findOne({ gridfsId: fileId });
      if (material) {
        await material.recordAccess();
      }
    } catch (accessError) {
      console.error('Error updating access count:', accessError);
      // Continue with file serving even if access count update fails
    }

    // Set appropriate headers for PDF
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${file.filename}"`,
      'Content-Length': file.length,
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      'ETag': file._id.toString()
    });

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

  } catch (error) {
    console.error('PDF access error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to access PDF',
      error: error.message
    });
  }
});

// Health check for upload routes
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Upload routes working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;