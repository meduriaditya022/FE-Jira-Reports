import React from 'react';
import { X, Filter as FilterIcon } from 'lucide-react';
import { MultiSelect } from './MultiSelect';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: any;
  onFilterChange: (filterType: string, value: string | boolean | string[]) => void;
  data: any[];
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  data
}) => {
  if (!isOpen) return null;

  const boards = [...new Set(data.map(item => item.board_name))];
  const statuses = [...new Set(data.map(item => item.status))];
  const assignees = [...new Set(data.map(item => item.assignee))];
  const priorities = [...new Set(data.map(item => item.priority))];
  const issueTypes = [...new Set(data.map(item => item.issue_type))];
  const versions = [...new Set(data.flatMap(item =>
    item.fix_versions ? item.fix_versions.split(', ').filter((v: string) => v.trim() !== '') : []
  ))].sort();

  const sprints = [...new Set(data.flatMap(item => {
    const sprints = [];
    if (item.current_sprint) sprints.push(item.current_sprint);
    if (item.sprint_spillover) sprints.push(...item.sprint_spillover.split(';').map((s: string) => s.trim()));
    return sprints;
  }))].filter(Boolean).sort();

  const clearAllFilters = () => {
    onFilterChange('boards', []);
    onFilterChange('statuses', []);
    onFilterChange('assignees', []);
    onFilterChange('priorities', []);
    onFilterChange('issue_types', []);
    onFilterChange('fix_versions', []);
    onFilterChange('version_released', 'all');
    onFilterChange('sprints', []);
    onFilterChange('show_spillover_only', false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FilterIcon className="h-6 w-6 text-white" />
                <h3 className="text-xl font-bold text-white">Advanced Filters</h3>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="bg-white px-6 py-6 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <MultiSelect
                label="Boards"
                options={boards}
                selected={filters.boards || []}
                onChange={(selected) => onFilterChange('boards', selected)}
                placeholder="All Boards"
              />

              <MultiSelect
                label="Statuses"
                options={statuses}
                selected={filters.statuses || []}
                onChange={(selected) => onFilterChange('statuses', selected)}
                placeholder="All Statuses"
              />

              <MultiSelect
                label="Assignees"
                options={assignees}
                selected={filters.assignees || []}
                onChange={(selected) => onFilterChange('assignees', selected)}
                placeholder="All Assignees"
              />

              <MultiSelect
                label="Priorities"
                options={priorities}
                selected={filters.priorities || []}
                onChange={(selected) => onFilterChange('priorities', selected)}
                placeholder="All Priorities"
              />

              <MultiSelect
                label="Issue Types"
                options={issueTypes}
                selected={filters.issue_types || []}
                onChange={(selected) => onFilterChange('issue_types', selected)}
                placeholder="All Types"
              />

              <MultiSelect
                label="Fix Versions"
                options={versions}
                selected={filters.fix_versions || []}
                onChange={(selected) => onFilterChange('fix_versions', selected)}
                placeholder="All Versions"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Release Status</label>
                <select
                  value={filters.version_released}
                  onChange={(e) => onFilterChange('version_released', e.target.value)}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="all">All Release Status</option>
                  <option value="released">Released Only</option>
                  <option value="unreleased">Unreleased Only</option>
                </select>
              </div>

              <MultiSelect
                label="Sprints"
                options={sprints}
                selected={filters.sprints || []}
                onChange={(selected) => onFilterChange('sprints', selected)}
                placeholder="All Sprints"
              />

              <div className="col-span-full">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.show_spillover_only}
                    onChange={(e) => onFilterChange('show_spillover_only', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Show Sprint Spillover Only</span>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
            <button
              onClick={clearAllFilters}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Clear All Filters
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
