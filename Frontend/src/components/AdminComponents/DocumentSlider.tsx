import React, { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
} from "lucide-react";
import { InstructorDocument } from "../../types/Instructor";

interface DocumentSliderProps {
  documents: InstructorDocument[];
  initialIndex?: number;
  onDocumentSelect?: (doc: InstructorDocument) => void;
}

export const DocumentSlider: React.FC<DocumentSliderProps> = ({
  documents,
  initialIndex = 0,
  onDocumentSelect,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (documents.length > 0) {
      onDocumentSelect?.(documents[currentIndex]);
    }
  }, [currentIndex, documents, onDocumentSelect]);

  if (documents.length === 0) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <p className="text-gray-500">No documents available</p>
      </div>
    );
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : documents.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < documents.length - 1 ? prev + 1 : 0));
  };

  const currentDocument = documents[currentIndex];
  const isPdf = currentDocument.documentUrl?.toLowerCase().endsWith(".pdf");

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {currentDocument.documentType}
          </h3>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {currentIndex + 1} of {documents.length}
            </span>
            <div className="flex items-center gap-2">
              <a
                href={currentDocument.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Open in new tab"
              >
                <ExternalLink size={18} />
              </a>
              <a
                href={currentDocument.documentUrl}
                download
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Download"
              >
                <Download size={18} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Document Viewer */}
      <div className="relative">
        <div className="aspect-video bg-gray-100 flex items-center justify-center">
          {isPdf ? (
            <iframe
              src={`${currentDocument.documentUrl}#view=fitH`}
              title={currentDocument.documentType}
              className="w-full h-[70vh] border-0"
            >
              <p>PDF preview not available. Please open in new tab.</p>
            </iframe>
          ) : (
            <img
              src={currentDocument.documentUrl}
              alt={currentDocument.documentType}
              className="max-w-full max-h-[70vh] object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null; // Prevent infinite loop
                target.src =
                  "https://via.placeholder.com/800x600?text=No+Preview+Available";
              }}
            />
          )}
        </div>
        {/* Navigation Arrows */}
        {documents.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {documents.length > 1 && (
        <div className="px-6 py-4 bg-gray-50">
          <div className="flex gap-2 overflow-x-auto">
            {documents.map((doc, index) => {
              const url = doc.documentUrl?.toLowerCase() || "";
              const ext = url.split(".").pop() || "";

              const isImage = /\.(jpeg|jpg|png|gif|webp|bmp|svg)$/i.test(url);
              const isPdf = ext === "pdf";
              const isWord = /(doc|docx)$/i.test(ext);
              const isExcel = /(xls|xlsx|csv)$/i.test(ext);
              const isText = /(txt|rtf)$/i.test(ext);
              const isVideo = /(mp4|mov|avi|mkv|webm)$/i.test(ext);

              // Choose icon for non-image files
              const renderIcon = () => {
                if (isPdf)
                  return (
                    <div className="flex flex-col items-center justify-center h-full text-red-500">
                      <FileText size={24} />
                      <span className="text-[10px] text-gray-600 mt-1">
                        PDF
                      </span>
                    </div>
                  );
                if (isWord)
                  return (
                    <div className="flex flex-col items-center justify-center h-full text-blue-500">
                      <FileText size={24} />
                      <span className="text-[10px] text-gray-600 mt-1">
                        DOC
                      </span>
                    </div>
                  );
                if (isExcel)
                  return (
                    <div className="flex flex-col items-center justify-center h-full text-green-500">
                      <FileText size={24} />
                      <span className="text-[10px] text-gray-600 mt-1">
                        XLS
                      </span>
                    </div>
                  );
                if (isText)
                  return (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <FileText size={24} />
                      <span className="text-[10px] text-gray-600 mt-1">
                        TXT
                      </span>
                    </div>
                  );
                if (isVideo)
                  return (
                    <div className="flex flex-col items-center justify-center h-full text-purple-500">
                      <FileText size={24} />
                      <span className="text-[10px] text-gray-600 mt-1">
                        VID
                      </span>
                    </div>
                  );
                return (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <FileText size={24} />
                    <span className="text-[10px] text-gray-600 mt-1">FILE</span>
                  </div>
                );
              };

              return (
                <button
                  key={doc._id}
                  onClick={() => setCurrentIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentIndex
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {isImage ? (
                    <img
                      src={doc.documentUrl}
                      alt={doc.documentType}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src =
                          "https://via.placeholder.com/64x64?text=IMG";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      {renderIcon()}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
