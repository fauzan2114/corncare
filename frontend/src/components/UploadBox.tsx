import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';

interface UploadBoxProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

export const UploadBox: React.FC<UploadBoxProps> = ({ onFileSelect, isLoading }) => {
  const { t } = useTranslation();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isLoading,
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`relative p-12 border-3 border-dashed rounded-2xl text-center cursor-pointer transition-all duration-300 transform overflow-hidden group ${
        isDragActive 
          ? 'border-green-500 bg-gradient-to-br from-green-50 to-blue-50 scale-105 shadow-2xl' 
          : 'border-gray-300 hover:border-green-400 hover:bg-gradient-to-br hover:from-gray-50 hover:to-green-50/30 hover:scale-102 hover:shadow-xl'
      } ${isLoading ? 'opacity-50 cursor-not-started pointer-events-none' : ''}`}
    >
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 via-blue-400/10 to-purple-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* Shimmer Effect */}
      {isDragActive && (
        <div className="absolute inset-0 animate-shimmer"></div>
      )}

      {/* Hide native input to avoid default browser text like 'No file chosen' */}
      <input {...getInputProps()} hidden />
      
      <div className="relative space-y-6">
        {/* Animated Icon */}
        <div className="flex justify-center">
          <div className={`relative transition-all duration-300 ${isDragActive ? 'scale-125' : 'group-hover:scale-110'}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-blue-400 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative h-24 w-24 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-all duration-300 transform group-hover:rotate-3">
              <svg className="h-12 w-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xl font-bold text-gray-900 group-hover:text-green-700 transition-colors">
            {isDragActive ? '📥 Drop your image here!' : t('detect.dropzone.title')}
          </p>
          <p className="mt-2 text-gray-600 font-medium max-w-sm mx-auto">
            {t('detect.dropzone.description')}
          </p>
        </div>

        {/* Features */}
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200 shadow-sm group-hover:border-green-300 group-hover:shadow-md transition-all">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-gray-700 font-medium">JPG, JPEG, PNG</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200 shadow-sm group-hover:border-blue-300 group-hover:shadow-md transition-all">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-gray-700 font-medium">Max 10MB</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200 shadow-sm group-hover:border-purple-300 group-hover:shadow-md transition-all">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-gray-700 font-medium">Secure & Private</span>
          </div>
        </div>

        {/* Click to Upload Text */}
        <p className="text-sm text-gray-500 font-medium">
          <span className="text-green-600 font-bold cursor-pointer hover:text-green-700">Click to browse</span> or drag and drop
        </p>
      </div>
    </div>
  );
};
