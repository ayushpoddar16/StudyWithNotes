// models/Material.js
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
  
  // For PDFs
  filename: {
    type: String,
    required: function() {
      return this.type === 'pdf';
    }
  },
  filePath: {
    type: String,
    required: function() {
      return this.type === 'pdf';
    }
  },
  gridfsId: {
    type: mongoose.Schema.Types.ObjectId,
    required: function() {
      return this.type === 'pdf';
    }
  },
  originalName: {
    type: String
  },
  size: {
    type: String
  },
  mimeType: {
    type: String
  },
  
  // Metadata
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

// Index for better search performance
materialSchema.index({ subject: 1, type: 1 });
materialSchema.index({ title: 'text', description: 'text' });

// Virtual to get PDF access URL
materialSchema.virtual('pdfUrl').get(function() {
  if (this.type === 'pdf' && this.gridfsId) {
    return `/api/pdf/${this.gridfsId}`;
  }
  return null;
});

// Method to increment access count
materialSchema.methods.recordAccess = function() {
  this.lastAccessed = new Date();
  this.accessCount += 1;
  return this.save();
};

module.exports = mongoose.model('Material', materialSchema);