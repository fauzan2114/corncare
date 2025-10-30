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
      className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
        isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {/* Hide native input to avoid default browser text like 'No file chosen' */}
      <input {...getInputProps()} hidden />
      <div className="space-y-4">
        <div className="text-4xl">📷</div>
        <div>
          <p className="text-lg font-medium">{t('detect.dropzone.title')}</p>
          <p className="mt-1 text-gray-500">{t('detect.dropzone.description')}</p>
        </div>
        <p className="text-sm text-gray-400">{t('detect.dropzone.formats')}</p>
      </div>
    </div>
  );
};
