import React, { useState } from "react";
import {
  Upload,
  Link,
  FileText,
  Plus,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { useNavigate } from 'react-router-dom';
const UploadPage = () => {
  const [activeTab, setActiveTab] = useState("links");
  const [links, setLinks] = useState([
    { url: "", title: "", subject: "", customSubject: "" },
  ]);
  const [pdfs, setPdfs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  // Subject categories - Expanded list
  const subjects = {
    mathematics: {
      name: "Mathematics",
    },
    physics: {
      name: "Physics",
    },
    chemistry: {
      name: "Chemistry",
    },
    biology: {
      name: "Biology",
    },
    computer_science: {
      name: "Computer Science",
    },
    engineering: {
      name: "Engineering",
    },
    business: {
      name: "Business",
    },
    literature: {
      name: "Literature",
    },
    history: {
      name: "History",
    },
    languages: {
      name: "Languages",
    },
  };

  const addLinkField = () => {
    setLinks([
      ...links,
      { url: "", title: "", subject: "", customSubject: "" },
    ]);
  };

  const updateLink = (index, field, value) => {
    const updatedLinks = links.map((link, i) => {
      if (i === index) {
        // If subject changes, reset customSubject
        if (field === "subject") {
          return { ...link, [field]: value, customSubject: "" };
        }
        return { ...link, [field]: value };
      }
      return link;
    });
    setLinks(updatedLinks);
  };

  const removeLink = (index) => {
    if (links.length > 1) {
      setLinks(links.filter((_, i) => i !== index));
    }
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const pdfFiles = files
      .filter((file) => file.type === "application/pdf")
      .map((file) => ({
        file,
        title: "",
        subject: "",
        customSubject: "",
      }));

    setPdfs([...pdfs, ...pdfFiles]);
  };

  const removePdf = (index) => {
    setPdfs(pdfs.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
  setUploading(true);

  try {
    // Validate links before submission
    const validLinks = links.filter(link => link.url.trim());
    const invalidLinks = validLinks.filter(link => {
      const subject = link.subject === 'custom' ? link.customSubject : link.subject;
      return !subject || subject.trim() === '';
    });

    if (invalidLinks.length > 0) {
      alert('Please select a subject for all links before uploading.');
      setUploading(false);
      return;
    }

    // Validate PDFs before submission
    const invalidPdfs = pdfs.filter(pdf => {
      const subject = pdf.subject === 'custom' ? pdf.customSubject : pdf.subject;
      return !subject || subject.trim() === '';
    });

    if (invalidPdfs.length > 0) {
      alert('Please select a subject for all PDF files before uploading.');
      setUploading(false);
      return;
    }

    // Check if there's anything to upload
    if (validLinks.length === 0 && pdfs.length === 0) {
      alert('Please add at least one link or PDF file to upload.');
      setUploading(false);
      return;
    }

    const formData = new FormData();

    // Add links data (only valid links with subjects)
    if (validLinks.length > 0) {
      formData.append('links', JSON.stringify(validLinks));
    }

    // Add PDF files with consistent field naming
    pdfs.forEach((pdfData, index) => {
      formData.append('pdfs', pdfData.file);
      formData.append(`pdf_${index}_title`, pdfData.title || pdfData.file.name);
      formData.append(`pdf_${index}_subject`, pdfData.subject);
      formData.append(`pdf_${index}_customSubject`, pdfData.customSubject || '');
    });

    // ✅ FIXED: Correct API endpoint
    const response = await fetch('http://localhost:5000/api/upload/upload', {
      method: 'POST',
      body: formData
    });

    // Check if response is HTML (404 page) instead of JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}. Check if the API endpoint exists.`);
    }

    const result = await response.json();

    if (response.ok && result.success) {
      alert(`Success! Uploaded ${result.data.length} materials.`);
      
      // Reset form
      setLinks([{ url: "", title: "", subject: "", customSubject: "" }]);
      setPdfs([]);
    } else {
      throw new Error(result.message || result.error || 'Upload failed');
    }

  } catch (error) {
    console.error("Upload failed:", error);
    alert(`Upload failed: ${error.message}`);
  } finally {
    setUploading(false);
  }
};

  const goToSearchPage = () => {
    // In a real app with routing, you'd navigate here
    navigate("/search");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            StudyMaterial Hub
          </h1>
          <p className="text-gray-600">
            Upload and organize your study materials by subject
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setActiveTab("links")}
              className={`px-4 py-2 rounded-md transition-all duration-200 ${
                activeTab === "links"
                  ? "bg-blue-500 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Link className="w-4 h-4 inline mr-2" />
              Links
            </button>
            <button
              onClick={() => setActiveTab("pdfs")}
              className={`px-4 py-2 rounded-md transition-all duration-200 ${
                activeTab === "pdfs"
                  ? "bg-blue-500 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              PDFs
            </button>
          </div>

          <button
            onClick={goToSearchPage}
            className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Search Materials
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          {activeTab === "links" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Add Study Links
                </h2>
                <button
                  onClick={addLinkField}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Link
                </button>
              </div>

              <div className="space-y-6">
                {links.map((link, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-medium text-gray-700">
                        Link {index + 1}
                      </h3>
                      {links.length > 1 && (
                        <button
                          onClick={() => removeLink(index)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          URL *
                        </label>
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) =>
                            updateLink(index, "url", e.target.value)
                          }
                          placeholder="https://example.com"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Title
                        </label>
                        <input
                          type="text"
                          value={link.title}
                          onChange={(e) =>
                            updateLink(index, "title", e.target.value)
                          }
                          placeholder="Link title"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <BookOpen className="w-4 h-4 inline mr-1" />
                          Subject *
                        </label>
                        <select
                          value={link.subject}
                          onChange={(e) =>
                            updateLink(index, "subject", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select a subject</option>
                          {Object.entries(subjects).map(([key, subject]) => (
                            <option key={key} value={key}>
                              {subject.name}
                            </option>
                          ))}
                          <option value="custom">✏️ Add Custom Subject</option>
                        </select>
                      </div>

                      {link.subject === "custom" && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <BookOpen className="w-4 h-4 inline mr-1" />
                            Custom Subject *
                          </label>
                          <input
                            type="text"
                            value={link.customSubject}
                            onChange={(e) =>
                              updateLink(index, "customSubject", e.target.value)
                            }
                            placeholder="Enter your custom subject"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required={link.subject === "custom"}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "pdfs" && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                Upload PDF Files
              </h2>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  Drag and drop PDF files here, or click to select
                </p>
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="pdf-upload"
                />
                <label
                  htmlFor="pdf-upload"
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer transition-colors"
                >
                  Select PDF Files
                </label>
              </div>

              {pdfs.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-700 mb-4">
                    Selected Files:
                  </h3>
                  <div className="space-y-2">
                    {pdfs.map((pdf, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center">
                            <FileText className="w-5 h-5 text-red-500 mr-2" />
                            <span className="text-gray-700">
                              {pdf.file.name}
                            </span>
                            <span className="text-gray-500 text-sm ml-2">
                              ({(pdf.file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                          <button
                            onClick={() => removePdf(index)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Title
                            </label>
                            <input
                              type="text"
                              value={pdf.title}
                              onChange={(e) => {
                                const updated = [...pdfs];
                                updated[index].title = e.target.value;
                                setPdfs(updated);
                              }}
                              placeholder="PDF Title"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Subject
                            </label>
                            <select
                              value={pdf.subject}
                              onChange={(e) => {
                                const updated = [...pdfs];
                                updated[index].subject = e.target.value;
                                if (e.target.value !== "custom") {
                                  updated[index].customSubject = "";
                                }
                                setPdfs(updated);
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select a subject</option>
                              {Object.entries(subjects).map(
                                ([key, subject]) => (
                                  <option key={key} value={key}>
                                    {subject.name}
                                  </option>
                                )
                              )}
                              <option value="custom">
                                ✏️ Add Custom Subject
                              </option>
                            </select>
                          </div>

                          {pdf.subject === "custom" && (
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Custom Subject
                              </label>
                              <input
                                type="text"
                                value={pdf.customSubject}
                                onChange={(e) => {
                                  const updated = [...pdfs];
                                  updated[index].customSubject = e.target.value;
                                  setPdfs(updated);
                                }}
                                placeholder="Enter your custom subject"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={
                uploading ||
                (links.every((link) => !link.url.trim()) && pdfs.length === 0)
              }
              className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 ${
                uploading ||
                (links.every((link) => !link.url.trim()) && pdfs.length === 0)
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-green-500 text-white hover:bg-green-600 shadow-lg hover:shadow-xl"
              }`}
            >
              {uploading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Uploading...
                </div>
              ) : (
                "Upload Materials"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;