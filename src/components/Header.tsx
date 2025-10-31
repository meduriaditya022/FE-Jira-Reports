import React from 'react';
import { BarChart3, Download, Moon, Sun, RefreshCw } from 'lucide-react';
import { useJiraData } from '../contexts/JiraDataContext';

interface HeaderProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  onExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({ darkMode, toggleDarkMode, onExport }) => {
  const { refreshData, loading, lastUpdated } = useJiraData();

  const handleRefresh = async () => {
    await refreshData();
  };

  const formatLastUpdated = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <h1 className="ml-3 text-2xl font-bold text-gray-900 dark:text-white">
              FE Jira Dashboard
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {lastUpdated && (
              <div className="hidden sm:block text-sm text-gray-500 dark:text-gray-400">
                Last updated: {formatLastUpdated(lastUpdated)}
              </div>
            )}
            
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
            
            <button
              onClick={onExport}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </button>
            
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};