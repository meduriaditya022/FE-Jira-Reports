import React, { useState } from 'react';
import { Calendar, Check } from 'lucide-react';
import { MultiSelect } from './MultiSelect';

interface TimeRange {
  type: 'preset' | 'custom' | 'sprint' | 'sprint-comparison';
  preset?: string;
  customStart?: string;
  customEnd?: string;
  selectedSprints?: string[];
}

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  availableSprints: string[];
}

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  value,
  onChange,
  availableSprints
}) => {
  const [showCustom, setShowCustom] = useState(false);

  const presetOptions = [
    { label: 'Last 30 Days', value: '30' },
    { label: 'Last 60 Days', value: '60' },
    { label: 'Last 90 Days', value: '90' },
    { label: 'Last 6 Months', value: '180' },
    { label: 'Last Year', value: '365' },
  ];

  const handlePresetChange = (preset: string) => {
    onChange({ type: 'preset', preset });
    setShowCustom(false);
  };

  const handleCustomDateChange = (field: 'customStart' | 'customEnd', dateValue: string) => {
    onChange({
      type: 'custom',
      customStart: field === 'customStart' ? dateValue : value.customStart,
      customEnd: field === 'customEnd' ? dateValue : value.customEnd,
    });
  };

  const handleSprintSelection = (sprints: string[]) => {
    onChange({
      type: sprints.length > 1 ? 'sprint-comparison' : 'sprint',
      selectedSprints: sprints,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">Time Range Selection</label>

        <div className="space-y-2">
          {presetOptions.map(option => (
            <label
              key={option.value}
              className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors"
            >
              <input
                type="radio"
                name="timeRange"
                checked={value.type === 'preset' && value.preset === option.value}
                onChange={() => handlePresetChange(option.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-900">{option.label}</span>
              {value.type === 'preset' && value.preset === option.value && (
                <Check className="h-4 w-4 text-blue-600 ml-auto" />
              )}
            </label>
          ))}

          <label
            className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors"
          >
            <input
              type="radio"
              name="timeRange"
              checked={value.type === 'custom'}
              onChange={() => {
                setShowCustom(true);
                onChange({ type: 'custom', customStart: '', customEnd: '' });
              }}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <Calendar className="h-4 w-4 text-slate-600" />
            <span className="text-sm text-slate-900">Custom Date Range</span>
            {value.type === 'custom' && (
              <Check className="h-4 w-4 text-blue-600 ml-auto" />
            )}
          </label>

          {(showCustom || value.type === 'custom') && (
            <div className="ml-7 space-y-3 p-4 bg-slate-50 rounded-lg">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={value.customStart || ''}
                  onChange={(e) => handleCustomDateChange('customStart', e.target.value)}
                  className="block w-full rounded-lg border-slate-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={value.customEnd || ''}
                  onChange={(e) => handleCustomDateChange('customEnd', e.target.value)}
                  className="block w-full rounded-lg border-slate-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-200">
        <div className="mb-3">
          <label className="block text-sm font-medium text-slate-700 mb-1">Sprint Selection</label>
          <p className="text-xs text-slate-500 mb-3">Select one or multiple sprints to view or compare data</p>
        </div>

        <MultiSelect
          label=""
          options={availableSprints}
          selected={value.selectedSprints || []}
          onChange={handleSprintSelection}
          placeholder="Select sprints to view or compare"
        />

        {value.selectedSprints && value.selectedSprints.length > 1 && (
          <div className="mt-2 p-2 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800">
              Comparing {value.selectedSprints.length} sprints
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
