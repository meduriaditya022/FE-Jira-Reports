import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';

interface MultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Select...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const removeOption = (option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter(item => item !== option));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 cursor-pointer hover:border-blue-400 transition-colors min-h-[42px]"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 flex flex-wrap gap-1">
            {selected.length === 0 ? (
              <span className="text-gray-400 text-sm">{placeholder}</span>
            ) : (
              selected.map(item => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded"
                >
                  {item}
                  <button
                    onClick={(e) => removeOption(item, e)}
                    className="hover:text-blue-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            )}
          </div>
          <div className="flex items-center gap-1">
            {selected.length > 0 && (
              <button
                onClick={clearAll}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No options available</div>
          ) : (
            options.map(option => (
              <div
                key={option}
                onClick={() => toggleOption(option)}
                className={`px-3 py-2 cursor-pointer hover:bg-blue-50 flex items-center justify-between ${
                  selected.includes(option) ? 'bg-blue-50' : ''
                }`}
              >
                <span className="text-sm text-gray-900">{option}</span>
                {selected.includes(option) && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
