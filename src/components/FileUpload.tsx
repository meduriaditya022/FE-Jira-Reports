import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useJiraData } from '../contexts/JiraDataContext';
import { apiService } from '../services/apiService';

export const FileUpload: React.FC = () => {
  const { loadData, loading, error } = useJiraData();
  const [dragActive, setDragActive] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Check API health on component mount
  React.useEffect(() => {
    checkApiHealth();
  }, []);

  const checkApiHealth = async () => {
    try {
      await apiService.healthCheck();
      setApiStatus('online');
    } catch (error) {
      setApiStatus('offline');
    }
  };

  const handleFiles = async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    setUploadLoading(true);
    setUploadError(null);

    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());

      const processedData = lines.slice(1).filter(line => line.trim()).map(line => {
        const values = line.split(',').map(v => v.trim());
        const item: any = {};
        headers.forEach((header, index) => {
          item[header] = values[index] || '';
        });
        return item;
      });

      loadData(processedData);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* API Status Indicator */}
      <div className="mb-6 flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          {apiStatus === 'online' ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : apiStatus === 'offline' ? (
            <WifiOff className="h-5 w-5 text-red-500" />
          ) : (
            <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {apiStatus === 'online' && 'Connected to JIRA API'}
              {apiStatus === 'offline' && 'JIRA API Offline'}
              {apiStatus === 'checking' && 'Checking API Status...'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {apiStatus === 'online' && 'Data is automatically loaded from your JIRA backend'}
              {apiStatus === 'offline' && 'You can still upload CSV files manually'}
              {apiStatus === 'checking' && 'Verifying connection to backend service'}
            </p>
          </div>
        </div>
        <button
          onClick={checkApiHealth}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
        >
          Retry Connection
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Loading JIRA data from backend...
            </span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800 dark:text-red-200">
                  Failed to load data from backend: {error}
                </p>
                <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                  You can try refreshing or upload a CSV file manually below.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Upload Section - Show if API is offline or there's an error */}
      {(apiStatus === 'offline' || (error && !loading)) && (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Manual Data Upload
        </h2>

        {uploadError && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {uploadError}
                </p>
              </div>
            </div>
          </div>
        )}

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center space-y-2">
            <FileText className="h-12 w-12 text-gray-400" />
            <div>
              {uploadLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-lg font-medium text-blue-600">Processing...</span>
                </div>
              ) : (
                <>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-lg font-medium text-blue-600 hover:text-blue-500">
                      Click to upload
                    </span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="sr-only"
                      onChange={handleFileChange}
                      disabled={uploadLoading}
                    />
                  </label>
                  <p className="text-sm text-gray-500 mt-2">or drag and drop</p>
                </>
              )}
            </div>
            <p className="text-xs text-gray-500">CSV, XLSX, or XLS files</p>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};