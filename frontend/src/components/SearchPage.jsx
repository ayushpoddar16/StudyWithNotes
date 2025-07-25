import React, { useState, useEffect } from 'react';
import { Search, Link, FileText, ExternalLink, Download, Filter, ArrowLeft, Calendar, Tag, BookOpen } from 'lucide-react';

const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [sortBy, setSortBy] = useState('uploadDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [materials, setMaterials] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 12
  });

  // API Base URL - adjust this to match your backend
  const API_BASE_URL ='http://localhost:5000/api';

  // Fetch materials from backend
  const fetchMaterials = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.itemsPerPage.toString(),
        sortBy,
        sortOrder
      });

      if (searchTerm.trim()) {
        params.append('search', searchTerm);
      }
      if (filterType !== 'all') {
        params.append('type', filterType);
      }
      if (filterSubject !== 'all') {
        params.append('subject', filterSubject);
      }

      const response = await fetch(`${API_BASE_URL}/materials?${params}`);
      const data = await response.json();

      if (data.success) {
        setMaterials(data.data);
        setPagination(data.pagination);
        setSubjects(data.subjects || []);
      } else {
        console.error('Failed to fetch materials:', data.message);
        setMaterials([]);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchMaterials();
  }, []);

  // Refetch when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchMaterials(1); // Reset to first page when filters change
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filterType, filterSubject, sortBy, sortOrder]);

  const handleDownload = async (material) => {
    try {
      const response = await fetch(`${API_BASE_URL}/materials/${material.id}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = material.originalName || material.title;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        alert(`Download failed: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed. Please try again.');
    }
  };

  const handleOpenLink = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const goToUploadPage = () => {
    // Replace with your routing logic
    window.location.href = '/upload'; // or use navigate if using React Router
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchMaterials(newPage);
    }
  };

  const getSubjectDisplayName = (subject) => {
    const subjectMap = {
      mathematics: 'Mathematics',
      physics: 'Physics',
      chemistry: 'Chemistry',
      biology: 'Biology',
      computer_science: 'Computer Science',
      engineering: 'Engineering',
      business: 'Business',
      literature: 'Literature',
      history: 'History',
      languages: 'Languages'
    };
    return subjectMap[subject] || subject;
  };

  if (loading && materials.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your study materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Study Materials</h1>
            <p className="text-gray-600">Search and organize your learning resources</p>
          </div>
          <button
            onClick={goToUploadPage}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Upload
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search materials by title, description, or subject..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex gap-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="link">Links Only</option>
                <option value="pdf">PDFs Only</option>
              </select>

              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Subjects</option>
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {getSubjectDisplayName(subject)}
                  </option>
                ))}
              </select>

              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="uploadDate-desc">Newest First</option>
                <option value="uploadDate-asc">Oldest First</option>
                <option value="title-asc">Title A-Z</option>
                <option value="title-desc">Title Z-A</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="flex justify-between items-center text-sm text-gray-600">
            <div>
              Showing {materials.length} of {pagination.totalItems} materials
              {loading && <span className="ml-2 text-blue-500">Loading...</span>}
            </div>
            <div>
              Page {pagination.currentPage} of {pagination.totalPages}
            </div>
          </div>
        </div>

        {/* Materials Grid */}
        {materials.length === 0 && !loading ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Search className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No materials found</h3>
            <p className="text-gray-500">
              {searchTerm || filterType !== 'all' || filterSubject !== 'all' 
                ? 'Try adjusting your search terms or filters' 
                : 'Upload some materials to get started'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {materials.map((material) => (
                <div key={material.id} className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
                  {/* Card Header */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        {material.type === 'link' ? (
                          <Link className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0" />
                        ) : (
                          <FileText className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                        )}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          material.type === 'link' 
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {material.type.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(material.uploadDate || material.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2">
                      {material.title}
                    </h3>
                    
                    {material.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                        {material.description}
                      </p>
                    )}

                    {/* Subject */}
                    {material.subject && (
                      <div className="flex items-center mb-3">
                        <BookOpen className="w-4 h-4 text-purple-500 mr-1" />
                        <span className="text-sm text-purple-700 bg-purple-50 px-2 py-1 rounded">
                          {getSubjectDisplayName(material.subject)}
                        </span>
                      </div>
                    )}

                    {material.type === 'pdf' && material.downloadCount > 0 && (
                      <p className="text-xs text-gray-500 mb-3">Downloads: {material.downloadCount}</p>
                    )}

                    {/* Action Button */}
                    <div className="mt-4">
                      {material.type === 'link' ? (
                        <button
                          onClick={() => handleOpenLink(material.url)}
                          className="w-full flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open Link
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDownload(material)}
                          className="w-full flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 bg-white rounded-lg shadow-lg p-4">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {[...Array(Math.min(5, pagination.totalPages))].map((_, index) => {
                  const pageNum = Math.max(1, pagination.currentPage - 2) + index;
                  if (pageNum > pagination.totalPages) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 text-sm rounded ${
                        pageNum === pagination.currentPage
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SearchPage;