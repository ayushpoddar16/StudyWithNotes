// Updated models/Material.js for GridFS
const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['link', 'pdf'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  customSubject: {
    type: String
  },
  description: {
    type: String
  },
  
  // For links
  url: {
    type: String,
    required: function() {
      return this.type === 'link';
    }
  },
  
  // For PDFs stored in GridFS
  filename: {
    type: String,
    required: function() {
      return this.type === 'pdf';
    }
  },
  filePath: {
    type: String, // Store GridFS ObjectId as string for easy access
    required: function() {
      return this.type === 'pdf';
    }
  },
  gridfsId: {
    type: mongoose.Schema.Types.ObjectId, // Actual ObjectId for GridFS operations
    required: function() {
      return this.type === 'pdf';
    }
  },
  originalName: {
    type: String
  },
  size: {
    type: String // Formatted file size (e.g., "2.5 MB")
  },
  mimeType: {
    type: String
  },
  
  // Metadata and search features
  tags: [{
    type: String
  }],
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  accessCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better search performance
materialSchema.index({ subject: 1, type: 1 });
materialSchema.index({ title: 'text', description: 'text', tags: 'text' });
materialSchema.index({ uploadedAt: -1 });
materialSchema.index({ gridfsId: 1 });

// Virtual to get PDF access URL
materialSchema.virtual('pdfUrl').get(function() {
  if (this.type === 'pdf' && this.gridfsId) {
    return `/api/upload/pdf/${this.gridfsId}`;
  }
  return null;
});

// Virtual to get formatted upload date
materialSchema.virtual('formattedUploadDate').get(function() {
  return this.uploadedAt.toLocaleDateString();
});

// Method to increment access count
materialSchema.methods.recordAccess = function() {
  this.lastAccessed = new Date();
  this.accessCount += 1;
  return this.save();
};

// Static method to get materials by subject
materialSchema.statics.getBySubject = function(subject, limit = 10) {
  return this.find({ subject })
    .sort({ uploadedAt: -1 })
    .limit(limit);
};

// Static method to search materials
materialSchema.statics.searchMaterials = function(query, options = {}) {
  const searchQuery = {
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } }
    ]
  };
  
  if (options.type) {
    searchQuery.type = options.type;
  }
  
  if (options.subject) {
    searchQuery.subject = options.subject;
  }
  
  return this.find(searchQuery)
    .sort({ uploadedAt: -1 })
    .limit(options.limit || 20);
};

module.exports = mongoose.model('Material', materialSchema);