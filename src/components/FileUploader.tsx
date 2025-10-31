import React, { useCallback } from 'react';
import { Upload, FileText } from 'lucide-react';

interface FileUploaderProps {
  onFileLoad: (data: any[]) => void;
  className?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileLoad, className = '' }) => {
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    try {
      console.log('Starting to read file:', file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        const data = lines.slice(1)
          .filter(line => line.trim() !== '')
          .map(line => {
            // Handle CSV parsing with proper comma handling
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
          console.log('CSV content length:', csv.length);
          console.log('First 500 characters:', csv.substring(0, 500));
          
            values.push(current.trim()); // Add the last value
          console.log('Total lines:', lines.length);
          
            
          console.log('Headers found:', headers);
            const obj: any = {};
            
            headers.forEach((header, index) => {
              let value = values[index] || '';
              // Remove quotes if present
              if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
              }
              
              // Convert numeric fields
              if (header === 'story_points') {
                obj[header] = parseFloat(value) || 0;
              } else {
                obj[header] = value;
              }
            });
            
            return obj;
          });
        
        console.log('Parsed CSV data:', data.length, 'rows');
        if (data.length > 0) {
          console.log('Sample row:', data[0]);
          console.log('Headers in sample:', Object.keys(data[0]));
        }
        console.log('Unique boards:', [...new Set(data.map(d => d.board_name))]);
        
        onFileLoad(data);
        } catch (parseError) {
          console.error('Error parsing CSV:', parseError);
          alert('Error parsing CSV file. Please check the format.');
        }
      };
      
      reader.onerror = () => {
        console.error('File reading failed');
        alert('Error reading file. Please try again.');
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('Error loading file:', error);
      alert('Error loading file. Please try again.');
    }
  }, [onFileLoad]);

  return (
    <div className={`border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors ${className}`}>
      <div className="flex flex-col items-center space-y-2">
        <FileText className="h-12 w-12 text-gray-400" />
        <div>
          <label htmlFor="file-upload" className="cursor-pointer">
            <span className="text-lg font-medium text-blue-600 hover:text-blue-500">
              Upload CSV file
            </span>
            <input
              id="file-upload"
              name="file-upload"
              type="file"
              accept=".csv"
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>
          <p className="text-sm text-gray-500 mt-2">or drag and drop</p>
        </div>
        <p className="text-sm text-gray-400">Upload your JIRA export CSV file to get started</p>
      </div>
    </div>
  );
};