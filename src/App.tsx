import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, ScatterChart, Scatter,
  AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, Treemap
} from 'recharts';
import { Calendar, Users, TrendingUp, Filter, Download, RefreshCw, BarChart3, Activity, Clock, Target, Award, AlertTriangle, CheckCircle, XCircle, ArrowUp, ArrowDown, Minus, Eye, Settings, Grid3x3 as Grid3X3, List, PieChart as PieChartIcon, Bug, Layers, BookOpen, ChevronDown, ChevronUp, X } from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import { FilterModal } from './components/FilterModal';
import { TimeRangeSelector } from './components/TimeRangeSelector';
import { Login } from './components/Login';
import { exportToPDF } from './utils/pdfExport';

interface JiraIssue {
  board_name: string;
  issue_key: string;
  summary: string;
  status: string;
  assignee: string;
  reporter: string;
  issue_type: string;
  priority: string;
  created: string;
  updated: string;
  due_date: string;
  story_points: number;
  fix_versions: string;
  epic_link: string;
  epic_name?: string;
  fix_version_start_dates?: string;
  fix_version_release_dates?: string;
  fix_version_released?: string;
  fix_version_archived?: string;
  current_sprint?: string;
  sprint_spillover?: string;
  is_completed?: boolean;
  is_spillover?: number;
}

// Enhanced color schemes
const STATUS_COLORS = {
  'Done': '#10b981',
  'In Progress': '#f59e0b',
  'To Do': '#6b7280',
  'QA Tested': '#3b82f6',
  'Ready for Review': '#8b5cf6',
  'Blocked': '#ef4444',
  'New Request': '#06b6d4',
  'Analysis': '#f97316',
  'Deployed & Ready for QA': '#10b981',
  'QA in Progress': '#eab308'
};

const PRIORITY_COLORS = {
  'Highest': '#dc2626',
  'High': '#ea580c',
  'Medium': '#ca8a04',
  'Low': '#16a34a',
  'Lowest': '#0891b2'
};

const BOARD_COLORS = [
  '#3b82f6', '#60a5fa', '#2563eb', '#1d4ed8', '#1e40af',
  '#93c5fd', '#2563eb', '#3b82f6', '#1e3a8a', '#1e40af'
];

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [data, setData] = useState<JiraIssue[]>([]);
  const [filteredData, setFilteredData] = useState<JiraIssue[]>([]);
  const [filters, setFilters] = useState({
    boards: [] as string[],
    statuses: [] as string[],
    assignees: [] as string[],
    priorities: [] as string[],
    issue_types: [] as string[],
    fix_versions: [] as string[],
    version_released: 'all',
    sprints: [] as string[],
    show_spillover_only: false
  });
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [issueDetailsView, setIssueDetailsView] = useState<'all' | 'by-user' | 'by-board'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [error, setError] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sortBy, setSortBy] = useState<'completed' | 'pending' | 'points' | 'efficiency'>('completed');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [epicBoardFilter, setEpicBoardFilter] = useState<string>('all');
  const [issueDetailsExpanded, setIssueDetailsExpanded] = useState(true);
  const [showUserBreakdown, setShowUserBreakdown] = useState(false);
  const [showBoardBreakdown, setShowBoardBreakdown] = useState(false);
  const [epicBreakdownExpanded, setEpicBreakdownExpanded] = useState(true);
  const [issueFilters, setIssueFilters] = useState({
    board: '',
    status: '',
    assignee: '',
    priority: '',
    issueType: ''
  });

  const [timeRange, setTimeRange] = useState({
    type: 'preset' as 'preset' | 'custom' | 'sprint' | 'sprint-comparison',
    preset: '30',
    customStart: '',
    customEnd: '',
    selectedSprints: [] as string[]
  });

  const [showTimeRangeModal, setShowTimeRangeModal] = useState(false);

  // Fetch data from Flask API on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5050/api/jira/data');
        const result = await response.json();

        if (result.success && result.data) {
          console.log('Loaded JIRA data:', result.data.length, 'issues');
          setData(result.data);
          setFilteredData(result.data);
          setDataLoaded(true);
          setError(null);
        } else {
          setError(result.error || 'Failed to fetch data');
        }
      } catch (err) {
        console.error('Error fetching JIRA data:', err);
        setError('Unable to connect to JIRA API. Make sure the backend server is running on port 5000.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle CSV file upload (backup option)
  const handleFileLoad = (csvData: JiraIssue[]) => {
    console.log('Loaded CSV data:', csvData.length, 'issues');
    setData(csvData);
    setFilteredData(csvData);
    setDataLoaded(true);
    setLoading(false);
    setError(null);
  };

  // Apply filters
  useEffect(() => {
    let filtered = data;

    if (filters.boards.length > 0) {
      filtered = filtered.filter(item => filters.boards.includes(item.board_name));
    }

    if (filters.statuses.length > 0) {
      filtered = filtered.filter(item => filters.statuses.includes(item.status));
    }

    if (filters.assignees.length > 0) {
      filtered = filtered.filter(item => filters.assignees.includes(item.assignee));
    }

    if (filters.priorities.length > 0) {
      filtered = filtered.filter(item => filters.priorities.includes(item.priority));
    }

    if (filters.issue_types.length > 0) {
      filtered = filtered.filter(item => filters.issue_types.includes(item.issue_type));
    }

    if (filters.fix_versions.length > 0) {
      filtered = filtered.filter(item =>
        filters.fix_versions.some(version => item.fix_versions?.includes(version))
      );
    }

    if (filters.version_released !== 'all') {
      if (filters.version_released === 'released') {
        filtered = filtered.filter(item => item.fix_version_released?.includes('true'));
      } else if (filters.version_released === 'unreleased') {
        filtered = filtered.filter(item => item.fix_version_released?.includes('false'));
      }
    }

    if (filters.sprints.length > 0) {
      filtered = filtered.filter(item =>
        filters.sprints.some(sprint =>
          item.current_sprint?.includes(sprint) || item.sprint_spillover?.includes(sprint)
        )
      );
    }

    if (filters.show_spillover_only) {
      filtered = filtered.filter(item => item.sprint_spillover && item.sprint_spillover.length > 0);
    }

    setFilteredData(filtered);
  }, [filters, data]);

  // Enhanced metrics
  const metrics = useMemo(() => {
    const boards = [...new Set(filteredData.map(item => item.board_name))];
    const users = [...new Set(filteredData.map(item => item.assignee))].filter(u => u !== 'Unassigned');
    const totalStoryPoints = filteredData.reduce((sum, item) => sum + (item.story_points || 0), 0);
    const completedIssues = filteredData.filter(item =>
      ['Done', 'QA Tested', 'Deployed & Ready for QA'].includes(item.status)
    ).length;
    const blockedIssues = filteredData.filter(item => item.status === 'Blocked').length;
    const highPriorityIssues = filteredData.filter(item =>
      ['Highest', 'High'].includes(item.priority)
    ).length;
    const bugs = filteredData.filter(item => item.issue_type === 'Bug').length;
    const spilloverIssues = filteredData.filter(item => item.sprint_spillover && item.sprint_spillover.length > 0).length;

    const avgStoryPoints = filteredData.length > 0 ? totalStoryPoints / filteredData.length : 0;
    const completionRate = filteredData.length > 0 ? (completedIssues / filteredData.length * 100) : 0;

    return {
      totalIssues: filteredData.length,
      totalBoards: boards.length,
      totalUsers: users.length,
      totalStoryPoints,
      completedIssues,
      blockedIssues,
      highPriorityIssues,
      avgStoryPoints,
      completionRate,
      bugs,
      spilloverIssues
    };
  }, [filteredData]);

  // Enhanced chart data
  const boardData = useMemo(() => {
    const boardCounts = filteredData.reduce((acc, item) => {
      if (!acc[item.board_name]) {
        acc[item.board_name] = {
          name: item.board_name,
          total: 0,
          completed: 0,
          inProgress: 0,
          blocked: 0,
          points: 0
        };
      }
      acc[item.board_name].total += 1;
      acc[item.board_name].points += item.story_points || 0;

      if (['Done', 'QA Tested', 'Deployed & Ready for QA'].includes(item.status)) {
        acc[item.board_name].completed += 1;
      } else if (['In Progress', 'QA in Progress'].includes(item.status)) {
        acc[item.board_name].inProgress += 1;
      } else if (item.status === 'Blocked') {
        acc[item.board_name].blocked += 1;
      }

      return acc;
    }, {} as Record<string, any>);

    return Object.values(boardCounts).sort((a: any, b: any) => b.total - a.total);
  }, [filteredData]);

  const statusData = useMemo(() => {
    const statusCounts = filteredData.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
      fill: '#3b82f6'
    }));
  }, [filteredData]);

  const userPerformanceData = useMemo(() => {
    const userStats = filteredData.reduce((acc, item) => {
      if (item.assignee !== 'Unassigned') {
        if (!acc[item.assignee]) {
          acc[item.assignee] = {
            name: item.assignee,
            completed: 0,
            inProgress: 0,
            total: 0,
            points: 0,
            pending: 0,
            efficiency: 0
          };
        }
        acc[item.assignee].total += 1;
        acc[item.assignee].points += item.story_points || 0;

        if (['Done', 'QA Tested', 'Deployed & Ready for QA'].includes(item.status)) {
          acc[item.assignee].completed += 1;
        } else if (['In Progress', 'QA in Progress'].includes(item.status)) {
          acc[item.assignee].inProgress += 1;
        } else {
          acc[item.assignee].pending += 1;
        }
      }
      return acc;
    }, {} as Record<string, any>);

    const users = Object.values(userStats)
      .map((user: any) => ({
        ...user,
        efficiency: user.total > 0 ? (user.completed / user.total * 100) : 0
      }));

    // Apply sorting
    const sorted = users.sort((a: any, b: any) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'completed':
          return multiplier * (b.completed - a.completed);
        case 'pending':
          return multiplier * (b.pending - a.pending);
        case 'points':
          return multiplier * (b.points - a.points);
        case 'efficiency':
          return multiplier * (b.efficiency - a.efficiency);
        default:
          return multiplier * (b.points - a.points);
      }
    });

    return sorted.slice(0, 15);
  }, [filteredData, sortBy, sortOrder]);

  const priorityData = useMemo(() => {
    const priorityCounts = filteredData.reduce((acc, item) => {
      acc[item.priority] = (acc[item.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(priorityCounts).map(([name, value]) => ({
      name,
      value,
      fill: '#3b82f6'
    }));
  }, [filteredData]);

  const timelineData = useMemo(() => {
    const monthlyData = filteredData.reduce((acc, item) => {
      const month = new Date(item.created).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!acc[month]) {
        acc[month] = { month, created: 0, completed: 0 };
      }
      acc[month].created += 1;
      if (['Done', 'QA Tested', 'Deployed & Ready for QA'].includes(item.status)) {
        acc[month].completed += 1;
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.values(monthlyData).sort((a: any, b: any) =>
      new Date(a.month).getTime() - new Date(b.month).getTime()
    );
  }, [filteredData]);

  const issueTypeData = useMemo(() => {
    const typeCounts = filteredData.reduce((acc, item) => {
      acc[item.issue_type] = (acc[item.issue_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(typeCounts).map(([name, value]) => ({
      name,
      value,
      fill: '#3b82f6'
    }));
  }, [filteredData]);

  const spilloverData = useMemo(() => {
    const sprintCounts = filteredData.reduce((acc, item) => {
      if (item.sprint_spillover) {
        const sprints = item.sprint_spillover.split(';').map(s => s.trim()).filter(Boolean);
        sprints.forEach(sprint => {
          if (!acc[sprint]) {
            acc[sprint] = { name: sprint, spillover: 0, completed: 0 };
          }
          acc[sprint].spillover += 1;
          if (['Done', 'QA Tested', 'Deployed & Ready for QA'].includes(item.status)) {
            acc[sprint].completed += 1;
          }
        });
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.values(sprintCounts).sort((a: any, b: any) => b.spillover - a.spillover).slice(0, 10);
  }, [filteredData]);

  const detailedSpilloverData = useMemo(() => {
    const sprintBoardData = filteredData.reduce((acc, item) => {
      if (item.sprint_spillover) {
        const sprints = item.sprint_spillover.split(';').map(s => s.trim()).filter(Boolean);
        sprints.forEach(sprint => {
          if (!acc[sprint]) {
            acc[sprint] = { boards: {}, totalIssues: 0, totalCompleted: 0, totalPoints: 0 };
          }

          const board = item.board_name;
          if (!acc[sprint].boards[board]) {
            acc[sprint].boards[board] = {
              issues: [],
              count: 0,
              completed: 0,
              inProgress: 0,
              pending: 0,
              points: 0
            };
          }

          acc[sprint].totalIssues += 1;
          acc[sprint].totalPoints += item.story_points || 0;
          acc[sprint].boards[board].count += 1;
          acc[sprint].boards[board].points += item.story_points || 0;
          acc[sprint].boards[board].issues.push(item);

          if (['Done', 'QA Tested', 'Deployed & Ready for QA'].includes(item.status)) {
            acc[sprint].totalCompleted += 1;
            acc[sprint].boards[board].completed += 1;
          } else if (['In Progress', 'QA in Progress'].includes(item.status)) {
            acc[sprint].boards[board].inProgress += 1;
          } else {
            acc[sprint].boards[board].pending += 1;
          }
        });
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.entries(sprintBoardData)
      .map(([sprint, data]) => ({
        sprint,
        ...data,
        boards: Object.entries(data.boards).map(([board, stats]) => ({
          board,
          ...stats
        })).sort((a: any, b: any) => b.count - a.count)
      }))
      .sort((a, b) => b.totalIssues - a.totalIssues);
  }, [filteredData]);

  const bugData = useMemo(() => {
    const bugs = filteredData.filter(item => item.issue_type === 'Bug');
    const bugStatusCounts = bugs.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bugPriorityCounts = bugs.reduce((acc, item) => {
      acc[item.priority] = (acc[item.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: bugs.length,
      byStatus: Object.entries(bugStatusCounts).map(([name, value]) => ({
        name,
        value,
        fill: '#3b82f6'
      })),
      byPriority: Object.entries(bugPriorityCounts).map(([name, value]) => ({
        name,
        value,
        fill: '#3b82f6'
      }))
    };
  }, [filteredData]);

  const epicData = useMemo(() => {
    const dataToProcess = epicBoardFilter === 'all'
      ? filteredData
      : filteredData.filter(item => item.board_name === epicBoardFilter);

    const epics = dataToProcess.reduce((acc, item) => {
      const epicKey = item.epic_link || 'No Epic';
      const epicName = item.epic_name || 'No Epic';

      if (!acc[epicKey]) {
        acc[epicKey] = {
          key: epicKey,
          name: epicName,
          total: 0,
          completed: 0,
          inProgress: 0,
          todo: 0,
          blocked: 0,
          points: 0,
          issues: [],
          boards: new Set(),
          boardBreakdown: {} as Record<string, any>,
          issueTypes: {} as Record<string, number>
        };
      }

      acc[epicKey].total += 1;
      acc[epicKey].points += item.story_points || 0;
      acc[epicKey].issues.push(item);
      acc[epicKey].boards.add(item.board_name);

      const board = item.board_name;
      if (!acc[epicKey].boardBreakdown[board]) {
        acc[epicKey].boardBreakdown[board] = {
          total: 0,
          completed: 0,
          inProgress: 0,
          todo: 0,
          points: 0
        };
      }

      acc[epicKey].boardBreakdown[board].total += 1;
      acc[epicKey].boardBreakdown[board].points += item.story_points || 0;

      if (['Done', 'QA Tested', 'Deployed & Ready for QA'].includes(item.status)) {
        acc[epicKey].completed += 1;
        acc[epicKey].boardBreakdown[board].completed += 1;
      } else if (['In Progress', 'QA in Progress'].includes(item.status)) {
        acc[epicKey].inProgress += 1;
        acc[epicKey].boardBreakdown[board].inProgress += 1;
      } else if (item.status === 'Blocked') {
        acc[epicKey].blocked += 1;
      } else {
        acc[epicKey].todo += 1;
        acc[epicKey].boardBreakdown[board].todo += 1;
      }

      acc[epicKey].issueTypes[item.issue_type] = (acc[epicKey].issueTypes[item.issue_type] || 0) + 1;

      return acc;
    }, {} as Record<string, any>);

    return Object.values(epics)
      .map((epic: any) => ({
        ...epic,
        boards: Array.from(epic.boards),
        boardCount: epic.boards.size,
        completionRate: epic.total > 0 ? (epic.completed / epic.total * 100) : 0
      }))
      .sort((a: any, b: any) => b.total - a.total);
  }, [filteredData, epicBoardFilter]);

  const handleFilterChange = (filterType: string, value: string | boolean | string[]) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const issueDetailsFiltered = useMemo(() => {
    let result = filteredData;

    if (issueFilters.board) {
      result = result.filter(item => item.board_name === issueFilters.board);
    }
    if (issueFilters.status) {
      result = result.filter(item => item.status === issueFilters.status);
    }
    if (issueFilters.assignee) {
      result = result.filter(item => item.assignee === issueFilters.assignee);
    }
    if (issueFilters.priority) {
      result = result.filter(item => item.priority === issueFilters.priority);
    }
    if (issueFilters.issueType) {
      result = result.filter(item => item.issue_type === issueFilters.issueType);
    }

    return result;
  }, [filteredData, issueFilters]);

  const summaryData = useMemo(() => {
    const now = new Date();

    let primaryData: JiraIssue[] = [];
    let comparisonData: JiraIssue[] = [];

    if (timeRange.type === 'preset') {
      const days = parseInt(timeRange.preset || '30');
      const daysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const doubleDaysAgo = new Date(now.getTime() - days * 2 * 24 * 60 * 60 * 1000);

      primaryData = filteredData.filter(item => new Date(item.created) >= daysAgo);
      comparisonData = filteredData.filter(item => {
        const created = new Date(item.created);
        return created >= doubleDaysAgo && created < daysAgo;
      });
    } else if (timeRange.type === 'custom' && timeRange.customStart && timeRange.customEnd) {
      const startDate = new Date(timeRange.customStart);
      const endDate = new Date(timeRange.customEnd);
      const duration = endDate.getTime() - startDate.getTime();
      const prevStartDate = new Date(startDate.getTime() - duration);

      primaryData = filteredData.filter(item => {
        const created = new Date(item.created);
        return created >= startDate && created <= endDate;
      });
      comparisonData = filteredData.filter(item => {
        const created = new Date(item.created);
        return created >= prevStartDate && created < startDate;
      });
    } else if ((timeRange.type === 'sprint' || timeRange.type === 'sprint-comparison') && timeRange.selectedSprints && timeRange.selectedSprints.length > 0) {
      primaryData = filteredData.filter(item =>
        timeRange.selectedSprints.some(sprint =>
          item.current_sprint?.includes(sprint) || item.sprint_spillover?.includes(sprint)
        )
      );
    } else {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      primaryData = filteredData.filter(item => new Date(item.created) >= thirtyDaysAgo);
      comparisonData = filteredData.filter(item => {
        const created = new Date(item.created);
        return created >= sixtyDaysAgo && created < thirtyDaysAgo;
      });
    }

    const last30Days = primaryData;
    const prev30Days = comparisonData;

    const calculateMetrics = (items: any[]) => ({
      total: items.length,
      completed: items.filter(i => ['Done', 'QA Tested', 'Deployed & Ready for QA'].includes(i.status)).length,
      inProgress: items.filter(i => ['In Progress', 'QA in Progress'].includes(i.status)).length,
      blocked: items.filter(i => i.status === 'Blocked').length,
      points: items.reduce((sum, i) => sum + (i.story_points || 0), 0),
      completionRate: 0
    });

    const metrics30 = calculateMetrics(last30Days);
    const metrics60 = calculateMetrics(prev30Days);
    metrics30.completionRate = metrics30.total > 0 ? (metrics30.completed / metrics30.total * 100) : 0;
    metrics60.completionRate = metrics60.total > 0 ? (metrics60.completed / metrics60.total * 100) : 0;

    const versionGroups = primaryData.reduce((acc, item) => {
      const version = item.fix_versions || 'No Version';
      if (!acc[version]) {
        acc[version] = [];
      }
      acc[version].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    const versionComparison = Object.entries(versionGroups).map(([version, items]) => {
      const metrics = calculateMetrics(items);
      metrics.completionRate = metrics.total > 0 ? (metrics.completed / metrics.total * 100) : 0;
      return { version, ...metrics };
    }).sort((a, b) => b.total - a.total).slice(0, 10);

    const sprintGroups = filteredData.reduce((acc, item) => {
      const sprints = [];
      if (item.current_sprint) sprints.push(item.current_sprint);
      if (item.sprint_spillover) {
        sprints.push(...item.sprint_spillover.split(';').map(s => s.trim()).filter(Boolean));
      }

      if (sprints.length === 0) {
        sprints.push('No Sprint');
      }

      sprints.forEach(sprint => {
        if (!acc[sprint]) {
          acc[sprint] = [];
        }
        acc[sprint].push(item);
      });

      return acc;
    }, {} as Record<string, any[]>);

    const sprintComparison = Object.entries(sprintGroups).map(([sprint, items]) => {
      const metrics = calculateMetrics(items);
      metrics.completionRate = metrics.total > 0 ? (metrics.completed / metrics.total * 100) : 0;
      const velocity = metrics.points;
      return { sprint, ...metrics, velocity };
    }).sort((a, b) => {
      if (a.sprint === 'No Sprint') return 1;
      if (b.sprint === 'No Sprint') return -1;
      return a.sprint.localeCompare(b.sprint);
    });

    const boardPerformance = Object.entries(primaryData.reduce((acc, item) => {
      const board = item.board_name;
      if (!acc[board]) {
        acc[board] = [];
      }
      acc[board].push(item);
      return acc;
    }, {} as Record<string, any[]>)).map(([board, items]) => {
      const metrics = calculateMetrics(items);
      metrics.completionRate = metrics.total > 0 ? (metrics.completed / metrics.total * 100) : 0;
      const avgCycleTime = items.filter(i => i.resolved).length > 0
        ? items.filter(i => i.resolved).reduce((sum, i) => {
            const created = new Date(i.created).getTime();
            const resolved = new Date(i.resolved).getTime();
            return sum + (resolved - created) / (1000 * 60 * 60 * 24);
          }, 0) / items.filter(i => i.resolved).length
        : 0;
      return { board, ...metrics, avgCycleTime };
    }).sort((a, b) => b.completed - a.completed);

    const teamPerformance = Object.entries(primaryData.reduce((acc, item) => {
      const user = item.assignee || 'Unassigned';
      if (!acc[user]) {
        acc[user] = [];
      }
      acc[user].push(item);
      return acc;
    }, {} as Record<string, any[]>)).map(([user, items]) => {
      const metrics = calculateMetrics(items);
      metrics.completionRate = metrics.total > 0 ? (metrics.completed / metrics.total * 100) : 0;
      const efficiency = metrics.points > 0 ? (metrics.completed / metrics.points * 100) : 0;
      return { user, ...metrics, efficiency };
    }).sort((a, b) => b.completed - a.completed).slice(0, 15);

    const cardMovement = primaryData.reduce((acc, item) => {
      const status = item.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const cardMovementData = Object.entries(cardMovement).map(([status, count]) => ({
      status,
      count,
      fill: '#3b82f6'
    })).sort((a, b) => b.count - a.count);

    return {
      metrics30,
      metrics60,
      comparison: {
        totalChange: ((metrics30.total - metrics60.total) / (metrics60.total || 1) * 100),
        completedChange: ((metrics30.completed - metrics60.completed) / (metrics60.completed || 1) * 100),
        completionRateChange: metrics30.completionRate - metrics60.completionRate
      },
      versionComparison,
      sprintComparison,
      boardPerformance,
      teamPerformance,
      cardMovementData
    };
  }, [filteredData, timeRange]);

  const exportDataToPDF = () => {
    if (filteredData.length === 0) {
      alert('No data to export');
      return;
    }

    const chartData = {
      boardData,
      statusData,
      userPerformanceData,
      priorityData,
      spilloverData,
      bugData
    };

    exportToPDF(filteredData, metrics, chartData);
  };

  // Show error or file upload screen if no data is loaded
  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Modern Header */}
        <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                    JIRA Analytics Dashboard
                  </h1>
                  <p className="text-slate-600 text-sm">Advanced Project Analytics & Insights</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Error or File Upload Section */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {error && (
            <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-red-900 mb-2">Connection Error</h3>
                  <p className="text-red-700 mb-4">{error}</p>
                  <p className="text-sm text-red-600 mb-4">
                    To start the backend server, run: <code className="bg-red-100 px-2 py-1 rounded">python backend/jira_api.py</code>
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Retry Connection</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {error ? 'Backup Option: Upload CSV' : 'Loading JIRA Data...'}
            </h2>
            <p className="text-slate-600 mb-8">
              {error
                ? 'You can upload a CSV file as a backup option while the backend is offline.'
                : 'Fetching latest data from JIRA API...'}
            </p>
          </div>

          {error && <FileUploader onFileLoad={handleFileLoad} />}

          {!error && (
            <div className="flex items-center justify-center space-x-2">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-slate-700">Loading data...</span>
            </div>
          )}

          {error && (
            <div className="mt-8 text-center text-sm text-slate-500">
              <p>Expected CSV format: board_name, issue_key, summary, status, assignee, reporter, issue_type, priority, created, updated, due_date, story_points, fix_versions, epic_link</p>
            </div>
          )}
        </div>
      </div>
    );
  }


  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Modern Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                  FE Jira Dashboard
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilterModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {Object.values(filters).filter(v => v && v !== 'all' && v !== false).length > 0 && (
                  <span className="bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {Object.values(filters).filter(v => v && v !== 'all' && v !== false).length}
                  </span>
                )}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
              <button
                onClick={exportDataToPDF}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Export Data</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Filter Modal */}
      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
        data={data}
      />

      {showTimeRangeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setShowTimeRangeModal(false)}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-6 w-6 text-white" />
                    <h3 className="text-xl font-bold text-white">Time Range Selection</h3>
                  </div>
                  <button
                    onClick={() => setShowTimeRangeModal(false)}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="bg-white px-6 py-6 max-h-[70vh] overflow-y-auto">
                <TimeRangeSelector
                  value={timeRange}
                  onChange={setTimeRange}
                  availableSprints={[...new Set(data.flatMap(item => {
                    const sprints = [];
                    if (item.current_sprint) sprints.push(item.current_sprint);
                    if (item.sprint_spillover) sprints.push(...item.sprint_spillover.split(';').map((s: string) => s.trim()));
                    return sprints;
                  }))].filter(Boolean).sort()}
                />
              </div>

              <div className="bg-gray-50 px-6 py-4 flex items-center justify-end">
                <button
                  onClick={() => setShowTimeRangeModal(false)}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-colors"
                >
                  Apply Time Range
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation Tabs */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('summary')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === 'summary'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                <span>Summary</span>
              </button>
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                <span>Overview</span>
              </button>
              <button
                onClick={() => setActiveTab('epics')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === 'epics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Layers className="h-4 w-4" />
                <span>Epics ({epicData.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('bugs')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === 'bugs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Bug className="h-4 w-4" />
                <span>Bugs ({bugData.total})</span>
              </button>
              <button
                onClick={() => setActiveTab('spillover')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === 'spillover'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Clock className="h-4 w-4" />
                <span>Sprint Spillover ({metrics.spilloverIssues})</span>
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Users</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Enhanced Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Issues</p>
                <p className="text-2xl font-bold text-slate-900">{metrics.totalIssues}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Completed</p>
                <p className="text-2xl font-bold text-green-600">{metrics.completedIssues}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Blocked</p>
                <p className="text-2xl font-bold text-red-600">{metrics.blockedIssues}</p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">High Priority</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.highPriorityIssues}</p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Story Points</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.totalStoryPoints}</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Avg Points</p>
                <p className="text-2xl font-bold text-indigo-600">{metrics.avgStoryPoints.toFixed(1)}</p>
              </div>
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Activity className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Completion</p>
                <p className="text-2xl font-bold text-emerald-600">{metrics.completionRate.toFixed(1)}%</p>
              </div>
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Award className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Active Boards</p>
                <p className="text-2xl font-bold text-cyan-600">{metrics.totalBoards}</p>
              </div>
              <div className="p-2 bg-cyan-100 rounded-lg">
                <Grid3X3 className="h-5 w-5 text-cyan-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'summary' && (
          <>
            {/* Time Range Selector */}
            <div className="mb-6">
              <button
                onClick={() => setShowTimeRangeModal(true)}
                className="inline-flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Calendar className="h-4 w-4 mr-2 text-slate-600" />
                <span className="text-sm font-medium text-slate-900">
                  {timeRange.type === 'preset' && `Last ${timeRange.preset} Days`}
                  {timeRange.type === 'custom' && timeRange.customStart && timeRange.customEnd && `${timeRange.customStart} to ${timeRange.customEnd}`}
                  {timeRange.type === 'sprint' && timeRange.selectedSprints && timeRange.selectedSprints.length === 1 && `Sprint: ${timeRange.selectedSprints[0]}`}
                  {timeRange.type === 'sprint-comparison' && timeRange.selectedSprints && timeRange.selectedSprints.length > 1 && `Comparing ${timeRange.selectedSprints.length} Sprints`}
                </span>
              </button>
            </div>

            {/* Performance Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-medium text-slate-600 mb-2">
                  {timeRange.type === 'preset' && `Last ${timeRange.preset} Days`}
                  {timeRange.type === 'custom' && 'Selected Period'}
                  {(timeRange.type === 'sprint' || timeRange.type === 'sprint-comparison') && 'Selected Sprint(s)'}
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-3xl font-bold text-blue-600">{summaryData.metrics30.total}</div>
                    <div className="text-sm text-slate-500">Total Issues</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{summaryData.metrics30.completed}</div>
                      <div className="text-xs text-slate-500">Completed</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{summaryData.metrics30.points}</div>
                      <div className="text-xs text-slate-500">Story Points</div>
                    </div>
                  </div>
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-600">Completion Rate</span>
                      <span className="text-xs font-semibold text-slate-900">{summaryData.metrics30.completionRate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${summaryData.metrics30.completionRate}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Version Comparison</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={summaryData.versionComparison} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" />
                    <YAxis dataKey="version" type="category" width={100} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="completed" fill="#3b82f6" name="Completed" />
                    <Bar dataKey="inProgress" fill="#60a5fa" name="In Progress" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Board Performance Overview */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Board Performance Overview</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Board</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Completed</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">In Progress</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Points</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Completion %</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Avg Cycle Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {summaryData.boardPerformance.map((board, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{board.board}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{board.total}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{board.completed}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{board.inProgress}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{board.points}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-slate-900 mr-2">{board.completionRate.toFixed(1)}%</span>
                            <div className="w-16 bg-slate-200 rounded-full h-2">
                              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${board.completionRate}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{board.avgCycleTime.toFixed(1)} days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sprint Summary */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Sprint Summary</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Sprint</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Total Issues</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Completed</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">In Progress</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Blocked</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Story Points</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Velocity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Completion %</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {summaryData.sprintComparison.map((sprint, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{sprint.sprint}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{sprint.total}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{sprint.completed}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">{sprint.inProgress}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{sprint.blocked}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{sprint.points}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">{sprint.velocity}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-slate-900 mr-2">{sprint.completionRate.toFixed(1)}%</span>
                            <div className="w-16 bg-slate-200 rounded-full h-2">
                              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${sprint.completionRate}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Card Movement and Team Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Card Movement by Status</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={summaryData.cardMovementData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="status" angle={-45} textAnchor="end" height={100} fontSize={10} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" name="Issues" radius={[8, 8, 0, 0]}>
                      {summaryData.cardMovementData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Team Performance</h3>
                <div className="space-y-3 max-h-[350px] overflow-y-auto">
                  {summaryData.teamPerformance.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-900">{member.user}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {member.completed} completed • {member.points} points
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-blue-600">{member.completionRate.toFixed(1)}%</div>
                        <div className="text-xs text-slate-500">{member.total} total</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'overview' && (
          <>
            {/* Enhanced Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Board Performance Chart */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Board Performance Overview</h3>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={boardData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="completed" stackId="a" fill="#3b82f6" name="Completed" />
                <Bar dataKey="inProgress" stackId="a" fill="#60a5fa" name="In Progress" />
                <Bar dataKey="blocked" stackId="a" fill="#93c5fd" name="Blocked" />
                <Line type="monotone" dataKey="points" stroke="#3b82f6" strokeWidth={3} name="Story Points" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Status Distribution - Bar Chart */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Status Distribution</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={statusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* User Performance Radar */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Performers</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={userPerformanceData.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#3b82f6" name="Completed" />
                <Bar dataKey="inProgress" fill="#60a5fa" name="In Progress" />
                <Bar dataKey="points" fill="#93c5fd" name="Story Points" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Timeline Chart */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Issue Timeline</h3>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="created"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                  name="Created"
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stackId="2"
                  stroke="#10b981"
                  fill="#3b82f6"
                  fillOpacity={0.8}
                  name="Completed"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Additional Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Priority Distribution */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Priority Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Issue Types */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Issue Types</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={issueTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={11} angle={-20} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                  {issueTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* User Efficiency Bubble Chart */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">User Efficiency Map</h3>
            <ResponsiveContainer width="100%" height={250}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="total" name="Total Issues" label={{ value: 'Total Issues', position: 'insideBottom', offset: -5 }} />
                <YAxis dataKey="efficiency" name="Efficiency %" label={{ value: 'Efficiency %', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                  content={({ payload }) => {
                    if (payload && payload[0]) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
                          <p className="font-semibold text-sm">{data.name}</p>
                          <p className="text-xs text-slate-600">Total: {data.total}</p>
                          <p className="text-xs text-slate-600">Efficiency: {data.efficiency.toFixed(1)}%</p>
                          <p className="text-xs text-slate-600">Points: {data.points}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter data={userPerformanceData.slice(0, 15)} fill="#3b82f6" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
          </>
        )}

        {/* Bugs Tab */}
        {activeTab === 'bugs' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Bug Status Distribution</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={bugData.byStatus} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]}>
                    {bugData.byStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Bug Priority Distribution</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={bugData.byPriority}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                    {bugData.byPriority.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Sprint Spillover Tab */}
        {activeTab === 'spillover' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Sprint Spillover Analysis</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={spilloverData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={12} />
                    <YAxis />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="spillover" fill="#3b82f6" name="Spillover Issues" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="completed" fill="#10b981" name="Completed from Spillover" radius={[8, 8, 0, 0]} />
                    <Line type="monotone" dataKey="spillover" stroke="#3b82f6" strokeWidth={3} name="Trend" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Spillover by Board</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={(() => {
                    const spilloverIssues = filteredData.filter(item => item.sprint_spillover && item.sprint_spillover.length > 0);
                    const boardCounts = spilloverIssues.reduce((acc, item) => {
                      if (!acc[item.board_name]) {
                        acc[item.board_name] = { name: item.board_name, count: 0, completed: 0 };
                      }
                      acc[item.board_name].count += 1;
                      if (['Done', 'QA Tested', 'Deployed & Ready for QA'].includes(item.status)) {
                        acc[item.board_name].completed += 1;
                      }
                      return acc;
                    }, {} as Record<string, any>);
                    return Object.values(boardCounts).sort((a: any, b: any) => b.count - a.count);
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={11} />
                    <YAxis />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="count" fill="#f59e0b" name="Total Spillover" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Spillover by User with Project Breakdown */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Spillover Issues by User & Board</h3>
              <div className="space-y-4">
                {(() => {
                  const spilloverIssues = filteredData.filter(item => item.sprint_spillover && item.sprint_spillover.length > 0);
                  const userBoardStats = spilloverIssues.reduce((acc, item) => {
                    const user = item.assignee || 'Unassigned';
                    const board = item.board_name;

                    if (!acc[user]) {
                      acc[user] = { total: 0, boards: {} };
                    }

                    if (!acc[user].boards[board]) {
                      acc[user].boards[board] = { count: 0, completed: 0 };
                    }

                    acc[user].total += 1;
                    acc[user].boards[board].count += 1;

                    if (['Done', 'QA Tested', 'Deployed & Ready for QA'].includes(item.status)) {
                      acc[user].boards[board].completed += 1;
                    }

                    return acc;
                  }, {} as Record<string, any>);

                  return Object.entries(userBoardStats)
                    .sort(([, a], [, b]) => b.total - a.total)
                    .slice(0, 10)
                    .map(([user, stats]) => (
                      <details key={user} className="border border-slate-200 rounded-lg overflow-hidden">
                        <summary className="bg-gradient-to-r from-blue-50 to-sky-50 px-4 py-3 cursor-pointer hover:from-blue-100 hover:to-sky-100 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-sky-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                {user.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                              <div>
                                <span className="font-semibold text-slate-900">{user}</span>
                                <span className="text-sm text-slate-600 ml-2">({stats.total} spillover issues)</span>
                              </div>
                            </div>
                            <div className="text-sm text-slate-600">
                              {Object.keys(stats.boards).length} board(s)
                            </div>
                          </div>
                        </summary>
                        <div className="p-4 bg-white">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(stats.boards).map(([board, data]: [string, any]) => (
                              <div key={board} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                <div className="font-medium text-sm text-slate-900 mb-2">{board}</div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-600">Total: {data.count}</span>
                                  <span className="text-green-600 font-medium">Completed: {data.completed}</span>
                                  <span className="text-orange-600 font-medium">Pending: {data.count - data.completed}</span>
                                </div>
                                <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                                  <div
                                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                                    style={{ width: `${data.count > 0 ? (data.completed / data.count * 100) : 0}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </details>
                    ));
                })()}
              </div>
            </div>

            {/* Detailed Sprint Spillover by Board Report */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Sprint-by-Sprint Spillover Report</h3>
              <p className="text-sm text-slate-600 mb-4">Detailed breakdown of spillover stories moved per sprint and board</p>
              <div className="space-y-6">
                {detailedSpilloverData.map((sprintData: any) => (
                  <details key={sprintData.sprint} className="border-2 border-orange-200 rounded-lg overflow-hidden">
                    <summary className="bg-gradient-to-r from-blue-100 to-sky-100 px-4 py-4 cursor-pointer hover:from-blue-200 hover:to-sky-200 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-bold text-slate-900">{sprintData.sprint}</h4>
                          <p className="text-sm text-slate-600 mt-1">
                            {sprintData.boards.length} board(s) affected
                          </p>
                        </div>
                        <div className="flex items-center space-x-6">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-orange-600">{sprintData.totalIssues}</div>
                            <div className="text-xs text-slate-600">Total Spillover</div>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-green-600">{sprintData.totalCompleted}</div>
                            <div className="text-xs text-slate-600">Completed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-purple-600">{sprintData.totalPoints}</div>
                            <div className="text-xs text-slate-600">Story Points</div>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-blue-600">
                              {sprintData.totalIssues > 0 ? ((sprintData.totalCompleted / sprintData.totalIssues) * 100).toFixed(0) : 0}%
                            </div>
                            <div className="text-xs text-slate-600">Completion</div>
                          </div>
                        </div>
                      </div>
                    </summary>
                    <div className="p-6 bg-white">
                      <div className="space-y-4">
                        {sprintData.boards.map((boardData: any) => (
                          <div key={boardData.board} className="border border-slate-200 rounded-lg overflow-hidden">
                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h5 className="font-semibold text-slate-900">{boardData.board}</h5>
                                  <p className="text-xs text-slate-600 mt-1">
                                    {boardData.count} issues moved from this sprint
                                  </p>
                                </div>
                                <div className="flex items-center space-x-4">
                                  <div className="text-center">
                                    <div className="text-xl font-bold text-green-600">{boardData.completed}</div>
                                    <div className="text-xs text-slate-500">Done</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xl font-bold text-orange-600">{boardData.inProgress}</div>
                                    <div className="text-xs text-slate-500">In Progress</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xl font-bold text-slate-600">{boardData.pending}</div>
                                    <div className="text-xs text-slate-500">Pending</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xl font-bold text-purple-600">{boardData.points}</div>
                                    <div className="text-xs text-slate-500">Points</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="p-4">
                              <div className="mb-3">
                                <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                                  <span>Progress</span>
                                  <span>{boardData.count > 0 ? ((boardData.completed / boardData.count) * 100).toFixed(1) : 0}%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-3">
                                  <div
                                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all"
                                    style={{ width: `${boardData.count > 0 ? (boardData.completed / boardData.count * 100) : 0}%` }}
                                  />
                                </div>
                              </div>
                              <details className="mt-3">
                                <summary className="text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-700">
                                  View {boardData.count} spillover issue(s)
                                </summary>
                                <div className="mt-3 space-y-2">
                                  {boardData.issues.map((issue: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200 text-xs">
                                      <div className="flex-1 min-w-0">
                                        <span className="font-medium text-blue-600">{issue.issue_key}</span>
                                        <span className="mx-2 text-slate-400">•</span>
                                        <span className="text-slate-700 truncate">{issue.summary}</span>
                                      </div>
                                      <div className="flex items-center space-x-2 ml-2">
                                        <span
                                          className="inline-flex px-2 py-1 rounded-full text-white text-xs"
                                          style={{ backgroundColor: STATUS_COLORS[issue.status as keyof typeof STATUS_COLORS] || '#94a3b8' }}
                                        >
                                          {issue.status}
                                        </span>
                                        {issue.story_points > 0 && (
                                          <span className="text-slate-600">
                                            SP: <span className="font-medium">{issue.story_points}</span>
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Epics Tab */}
        {activeTab === 'epics' && (
          <>
            {/* Board Filter for Epics */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Filter className="h-5 w-5 text-slate-600" />
                  <span className="font-medium text-slate-900">Filter by Board:</span>
                </div>
                <select
                  value={epicBoardFilter}
                  onChange={(e) => setEpicBoardFilter(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="all">All Boards</option>
                  {[...new Set(filteredData.map(item => item.board_name))].sort().map(board => (
                    <option key={board} value={board}>{board}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Epic Status Distribution</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={epicData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={11} />
                    <YAxis />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="inProgress" stackId="a" fill="#f59e0b" name="In Progress" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="todo" stackId="a" fill="#6b7280" name="To Do" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="blocked" stackId="a" fill="#ef4444" name="Blocked" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Epic Story Points</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={epicData.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="points" fill="#8b5cf6" name="Story Points" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Epic Detailed Breakdown */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-slate-900">Epic Breakdown</h3>
                    <button
                      onClick={() => setEpicBreakdownExpanded(!epicBreakdownExpanded)}
                      className="p-1 hover:bg-slate-200 rounded transition-colors"
                      title={epicBreakdownExpanded ? "Collapse" : "Expand"}
                    >
                      {epicBreakdownExpanded ? (
                        <ChevronUp className="h-5 w-5 text-slate-600" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-slate-600" />
                      )}
                    </button>
                  </div>
                  <span className="text-sm text-slate-500">{epicData.length} epics</span>
                </div>
              </div>
              {epicBreakdownExpanded && (
                <div className="p-6 space-y-4">
                {epicData.map((epic: any) => (
                  <details key={epic.key} className="border border-slate-200 rounded-lg overflow-hidden">
                    <summary className="bg-gradient-to-r from-blue-50 to-sky-50 px-4 py-3 cursor-pointer hover:from-blue-100 hover:to-sky-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">{epic.name}</div>
                          <div className="text-sm text-slate-600 mt-1">
                            {epic.key !== 'No Epic' && <span className="font-mono text-xs">{epic.key}</span>}
                          </div>
                        </div>
                        <div className="flex items-center space-x-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{epic.total}</div>
                            <div className="text-xs text-slate-500">Issues</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">{epic.points}</div>
                            <div className="text-xs text-slate-500">Points</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{epic.completionRate.toFixed(0)}%</div>
                            <div className="text-xs text-slate-500">Complete</div>
                          </div>
                        </div>
                      </div>
                    </summary>
                    <div className="p-4 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                          <div className="text-sm text-green-700 font-medium">Completed</div>
                          <div className="text-2xl font-bold text-green-600">{epic.completed}</div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                          <div className="text-sm text-orange-700 font-medium">In Progress</div>
                          <div className="text-2xl font-bold text-orange-600">{epic.inProgress}</div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                          <div className="text-sm text-slate-700 font-medium">To Do</div>
                          <div className="text-2xl font-bold text-slate-600">{epic.todo}</div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-slate-700 mb-2">Boards ({epic.boards.length})</h4>
                        <div className="flex flex-wrap gap-2">
                          {epic.boards.map((board: string, idx: number) => (
                            <span key={idx} className="inline-flex px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                              {board}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-slate-700 mb-2">Issue Types</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {Object.entries(epic.issueTypes).map(([type, count]: [string, any]) => (
                            <div key={type} className="bg-slate-50 rounded-lg p-2 border border-slate-200">
                              <div className="text-xs text-slate-600">{type}</div>
                              <div className="text-lg font-bold text-slate-900">{count}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Board Level Breakdown */}
                      {epic.boards.length > 1 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-slate-700 mb-2">Board-Level Task Distribution</h4>
                          <div className="space-y-2">
                            {Object.entries(epic.boardBreakdown).map(([board, stats]: [string, any]) => (
                              <div key={board} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-slate-900">{board}</span>
                                  <span className="text-xs text-slate-600">{stats.total} tasks • {stats.points} pts</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                                  <div className="text-center">
                                    <div className="text-green-600 font-bold">{stats.completed}</div>
                                    <div className="text-slate-500">Done</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-orange-600 font-bold">{stats.inProgress}</div>
                                    <div className="text-slate-500">In Progress</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-slate-600 font-bold">{stats.todo}</div>
                                    <div className="text-slate-500">To Do</div>
                                  </div>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                  <div
                                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                                    style={{ width: `${stats.total > 0 ? (stats.completed / stats.total * 100) : 0}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="w-full bg-slate-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all"
                          style={{ width: `${epic.completionRate}%` }}
                        />
                      </div>
                    </div>
                  </details>
                ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">User Performance Overview</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={userPerformanceData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={11} />
                    <YAxis />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="inProgress" fill="#f59e0b" name="In Progress" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="pending" fill="#6b7280" name="Pending" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">User Story Points</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={userPerformanceData.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="points" fill="#8b5cf6" name="Story Points" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* User Detailed Breakdown by Board */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">User Performance by Board</h3>
              <div className="space-y-4">
                {(() => {
                  const userBoardStats = filteredData.reduce((acc, item) => {
                    const user = item.assignee || 'Unassigned';
                    const board = item.board_name;

                    if (!acc[user]) {
                      acc[user] = { total: 0, boards: {}, completed: 0, points: 0 };
                    }

                    if (!acc[user].boards[board]) {
                      acc[user].boards[board] = { count: 0, completed: 0, inProgress: 0, pending: 0, points: 0 };
                    }

                    acc[user].total += 1;
                    acc[user].boards[board].count += 1;
                    acc[user].boards[board].points += item.story_points || 0;
                    acc[user].points += item.story_points || 0;

                    if (['Done', 'QA Tested', 'Deployed & Ready for QA'].includes(item.status)) {
                      acc[user].boards[board].completed += 1;
                      acc[user].completed += 1;
                    } else if (['In Progress', 'QA in Progress'].includes(item.status)) {
                      acc[user].boards[board].inProgress += 1;
                    } else {
                      acc[user].boards[board].pending += 1;
                    }

                    return acc;
                  }, {} as Record<string, any>);

                  return Object.entries(userBoardStats)
                    .filter(([user]) => user !== 'Unassigned')
                    .sort(([, a], [, b]) => b.total - a.total)
                    .map(([user, stats]) => (
                      <details key={user} className="border border-slate-200 rounded-lg overflow-hidden">
                        <summary className="bg-gradient-to-r from-blue-50 to-sky-50 px-4 py-3 cursor-pointer hover:from-blue-100 hover:to-sky-100 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-sky-500 rounded-full flex items-center justify-center text-white font-semibold">
                                {user.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                              <div>
                                <span className="font-semibold text-slate-900">{user}</span>
                                <span className="text-sm text-slate-600 ml-2">({stats.total} issues)</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-6">
                              <div className="text-center">
                                <div className="text-xl font-bold text-green-600">{stats.completed}</div>
                                <div className="text-xs text-slate-500">Completed</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xl font-bold text-purple-600">{stats.points}</div>
                                <div className="text-xs text-slate-500">Points</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xl font-bold text-blue-600">
                                  {stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(0) : 0}%
                                </div>
                                <div className="text-xs text-slate-500">Efficiency</div>
                              </div>
                            </div>
                          </div>
                        </summary>
                        <div className="p-4 bg-white">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(stats.boards)
                              .sort(([, a]: [string, any], [, b]: [string, any]) => b.count - a.count)
                              .map(([board, data]: [string, any]) => (
                              <div key={board} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                <div className="font-medium text-sm text-slate-900 mb-2">{board}</div>
                                <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                                  <div>
                                    <div className="text-slate-500">Total</div>
                                    <div className="font-bold text-slate-900">{data.count}</div>
                                  </div>
                                  <div>
                                    <div className="text-slate-500">Completed</div>
                                    <div className="font-bold text-green-600">{data.completed}</div>
                                  </div>
                                  <div>
                                    <div className="text-slate-500">Points</div>
                                    <div className="font-bold text-purple-600">{data.points}</div>
                                  </div>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                  <div
                                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                                    style={{ width: `${data.count > 0 ? (data.completed / data.count * 100) : 0}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </details>
                    ));
                })()}
              </div>
            </div>
          </>
        )}

        {/* Enhanced Issue Details Table */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold text-slate-900">Issue Details Overview</h3>
                <button
                  onClick={() => setIssueDetailsExpanded(!issueDetailsExpanded)}
                  className="p-1 hover:bg-slate-200 rounded transition-colors"
                  title={issueDetailsExpanded ? "Collapse" : "Expand"}
                >
                  {issueDetailsExpanded ? (
                    <ChevronUp className="h-5 w-5 text-slate-600" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-600" />
                  )}
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-500">
                  {issueDetailsFiltered.length} of {filteredData.length} issues
                </span>
                {(issueFilters.board || issueFilters.status || issueFilters.assignee || issueFilters.priority || issueFilters.issueType) && (
                  <button
                    onClick={() => setIssueFilters({ board: '', status: '', assignee: '', priority: '', issueType: '' })}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Board</label>
                <select
                  value={issueFilters.board}
                  onChange={(e) => setIssueFilters(prev => ({ ...prev, board: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Boards</option>
                  {[...new Set(filteredData.map(item => item.board_name))].sort().map(board => (
                    <option key={board} value={board}>{board}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={issueFilters.status}
                  onChange={(e) => setIssueFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  {[...new Set(filteredData.map(item => item.status))].sort().map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Assignee</label>
                <select
                  value={issueFilters.assignee}
                  onChange={(e) => setIssueFilters(prev => ({ ...prev, assignee: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Assignees</option>
                  {[...new Set(filteredData.map(item => item.assignee))].sort().map(assignee => (
                    <option key={assignee} value={assignee}>{assignee}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
                <select
                  value={issueFilters.priority}
                  onChange={(e) => setIssueFilters(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Priorities</option>
                  {[...new Set(filteredData.map(item => item.priority))].sort().map(priority => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Issue Type</label>
                <select
                  value={issueFilters.issueType}
                  onChange={(e) => setIssueFilters(prev => ({ ...prev, issueType: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  {[...new Set(filteredData.map(item => item.issue_type))].sort().map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* View Tabs and Content */}
          {issueDetailsExpanded && (
            <>
              {/* Tab Navigation */}
              <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/30">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIssueDetailsView('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      issueDetailsView === 'all'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    All Issues
                  </button>
                  <button
                    onClick={() => setIssueDetailsView('by-user')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      issueDetailsView === 'by-user'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Grouped by User
                  </button>
                  <button
                    onClick={() => setIssueDetailsView('by-board')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      issueDetailsView === 'by-board'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Grouped by Board
                  </button>
                </div>
              </div>

              {/* All Issues Table */}
              {issueDetailsView === 'all' && (
                <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Issue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Board</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Summary</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Assignee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Points</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Version</th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-slate-200">
                  {issueDetailsFiltered.slice(0, 50).map((issue, index) => (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-blue-600">{issue.issue_key}</div>
                        <div className="text-xs text-slate-500">{issue.issue_type}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {issue.board_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 max-w-xs">
                        <div className="truncate" title={issue.summary}>
                          {issue.summary}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white"
                          style={{ backgroundColor: STATUS_COLORS[issue.status as keyof typeof STATUS_COLORS] || '#94a3b8' }}
                        >
                          {issue.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {issue.assignee}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white"
                          style={{ backgroundColor: PRIORITY_COLORS[issue.priority as keyof typeof PRIORITY_COLORS] || '#94a3b8' }}
                        >
                          {issue.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        <div className="flex items-center">
                          <span className="font-medium">{issue.story_points || 0}</span>
                          {issue.story_points > 0 && (
                            <div className="ml-2 w-8 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${Math.min(100, (issue.story_points / 13) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        <div className="max-w-xs">
                          <div className="text-xs font-medium text-slate-700 truncate" title={issue.fix_versions}>
                            {issue.fix_versions || 'No version'}
                          </div>
                          {issue.fix_version_release_dates && (
                            <div className="text-xs text-slate-500">
                              Release: {new Date(issue.fix_version_release_dates.split(', ')[0]).toLocaleDateString()}
                            </div>
                          )}
                          {issue.fix_version_released && (
                            <div className="flex items-center space-x-1">
                              <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full ${
                                issue.fix_version_released.includes('true')
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {issue.fix_version_released.includes('true') ? 'Released' : 'Pending'}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              )}

              {/* By User View */}
              {issueDetailsView === 'by-user' && (
                <div className="p-6">
                  {(() => {
                    const userGroups = issueDetailsFiltered.reduce((acc, issue) => {
                  const user = issue.assignee || 'Unassigned';
                  if (!acc[user]) {
                    acc[user] = [];
                  }
                  acc[user].push(issue);
                  return acc;
                }, {} as Record<string, typeof filteredData>);

                return Object.entries(userGroups)
                  .sort(([, a], [, b]) => b.length - a.length)
                  .map(([user, issues]) => {
                    const completedCount = issues.filter(issue =>
                      ['Done', 'QA Tested', 'Deployed & Ready for QA'].includes(issue.status)
                    ).length;
                    const totalPoints = issues.reduce((sum, issue) => sum + (issue.story_points || 0), 0);
                    const completionRate = issues.length > 0 ? (completedCount / issues.length * 100) : 0;

                    return (
                      <details key={user} className="mb-6 bg-white/50 rounded-lg border border-slate-200 overflow-hidden">
                        <summary className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 cursor-pointer hover:bg-gradient-to-r hover:from-slate-100 hover:to-blue-100 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-sky-500 rounded-full flex items-center justify-center text-white font-semibold">
                                {user.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-slate-900">{user}</h3>
                                <p className="text-sm text-slate-600">{issues.length} issues assigned</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-6">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                                <div className="text-xs text-slate-500">Completed</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">{totalPoints}</div>
                                <div className="text-xs text-slate-500">Story Points</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{completionRate.toFixed(1)}%</div>
                                <div className="text-xs text-slate-500">Completion Rate</div>
                              </div>
                            </div>
                          </div>
                        </summary>
                        <div className="p-6 bg-white">
                          <div className="space-y-3">
                            {issues.map((issue, index) => (
                              <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <span className="text-sm font-medium text-blue-600">{issue.issue_key}</span>
                                    <span className="text-xs text-slate-500">{issue.issue_type}</span>
                                    <span className="text-xs text-slate-500">•</span>
                                    <span className="text-xs text-slate-500">{issue.board_name}</span>
                                    {issue.fix_versions && (
                                      <>
                                        <span className="text-xs text-slate-500">•</span>
                                        <span className="text-xs text-slate-500">v{issue.fix_versions}</span>
                                      </>
                                    )}
                                  </div>
                                  <h4 className="text-sm font-medium text-slate-900 mb-1 truncate">
                                    {issue.summary}
                                  </h4>
                                  <div className="flex items-center space-x-2 text-xs text-slate-500">
                                    <span>Created: {new Date(issue.created).toLocaleDateString()}</span>
                                    {issue.due_date && (
                                      <>
                                        <span>•</span>
                                        <span>Due: {new Date(issue.due_date).toLocaleDateString()}</span>
                                      </>
                                    )}
                                    {issue.fix_version_release_dates && (
                                      <>
                                        <span>•</span>
                                        <span>Release: {new Date(issue.fix_version_release_dates.split(', ')[0]).toLocaleDateString()}</span>
                                      </>
                                    )}
                                    {issue.fix_version_released && (
                                      <>
                                        <span>•</span>
                                        <span className={`font-medium ${
                                          issue.fix_version_released.includes('true') ? 'text-green-600' : 'text-yellow-600'
                                        }`}>
                                          {issue.fix_version_released.includes('true') ? 'Released' : 'Pending'}
                                        </span>
                                      </>
                                    )}
                                    {issue.fix_versions && (
                                      <>
                                        <span>•</span>
                                        <span>Version: {issue.fix_versions}</span>
                                      </>
                                    )}
                                  </div>
                                  {(issue.fix_version_release_dates || issue.fix_version_released) && (
                                    <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                                      {issue.fix_version_release_dates && (
                                        <span>Release Date: {new Date(issue.fix_version_release_dates.split(', ')[0]).toLocaleDateString()}</span>
                                      )}
                                      {issue.fix_version_released && (
                                        <>
                                          {issue.fix_version_release_dates && <span>•</span>}
                                          <span className={`font-medium ${
                                            issue.fix_version_released.includes('true') ? 'text-green-600' : 'text-yellow-600'
                                          }`}>
                                            {issue.fix_version_released.includes('true') ? 'Released' : 'Pending Release'}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center space-x-3 ml-4">
                                  <span
                                    className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white"
                                    style={{ backgroundColor: STATUS_COLORS[issue.status as keyof typeof STATUS_COLORS] || '#94a3b8' }}
                                  >
                                    {issue.status}
                                  </span>
                                  <span
                                    className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white"
                                    style={{ backgroundColor: PRIORITY_COLORS[issue.priority as keyof typeof PRIORITY_COLORS] || '#94a3b8' }}
                                  >
                                    {issue.priority}
                                  </span>
                                  {issue.story_points > 0 && (
                                    <div className="flex items-center space-x-1">
                                      <span className="text-xs text-slate-500">SP:</span>
                                      <span className="text-sm font-medium text-slate-900">{issue.story_points}</span>
                                    </div>
                                  )}
                                  {issue.fix_versions && (
                                    <div className="flex items-center space-x-1">
                                      <span className="text-xs text-slate-500">v</span>
                                      <span className="text-xs font-medium text-slate-700">{issue.fix_versions.split(', ')[0]}</span>
                                      {issue.fix_version_released && (
                                        <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full ${
                                          issue.fix_version_released.includes('true')
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                          {issue.fix_version_released.includes('true') ? 'Released' : 'Pending'}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </details>
                    );
                  });
              })()}
            </div>
              )}

              {/* By Board View */}
              {issueDetailsView === 'by-board' && (
                <div className="p-6">
                  {(() => {
                    const boardGroups = issueDetailsFiltered.reduce((acc, issue) => {
                  const board = issue.board_name;
                  if (!acc[board]) {
                    acc[board] = [];
                  }
                  acc[board].push(issue);
                  return acc;
                }, {} as Record<string, typeof filteredData>);

                return Object.entries(boardGroups)
                  .sort(([, a], [, b]) => b.length - a.length)
                  .map(([board, issues]) => {
                    const statusCounts = issues.reduce((acc, issue) => {
                      acc[issue.status] = (acc[issue.status] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);

                    const totalPoints = issues.reduce((sum, issue) => sum + (issue.story_points || 0), 0);
                    const uniqueUsers = [...new Set(issues.map(issue => issue.assignee))].length;

                    return (
                      <div key={board} className="mb-8 bg-white/50 rounded-lg border border-slate-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-slate-900">{board}</h3>
                              <p className="text-sm text-slate-600">{issues.length} issues • {uniqueUsers} contributors</p>
                            </div>
                            <div className="flex items-center space-x-6">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{issues.length}</div>
                                <div className="text-xs text-slate-500">Total Issues</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">{totalPoints}</div>
                                <div className="text-xs text-slate-500">Story Points</div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {Object.entries(statusCounts).map(([status, count]) => (
                              <span
                                key={status}
                                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white"
                                style={{ backgroundColor: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#94a3b8' }}
                              >
                                {status}: {count}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {issues.slice(0, 12).map((issue, index) => (
                              <div key={index} className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-2">
                                  <span className="text-sm font-medium text-blue-600">{issue.issue_key}</span>
                                  <span
                                    className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white"
                                    style={{ backgroundColor: STATUS_COLORS[issue.status as keyof typeof STATUS_COLORS] || '#94a3b8' }}
                                  >
                                    {issue.status}
                                  </span>
                                </div>
                                <h4 className="text-sm font-medium text-slate-900 mb-2 line-clamp-2">
                                  {issue.summary}
                                </h4>
                                {issue.fix_versions && (
                                  <div className="mb-2">
                                    <span className="text-xs text-slate-500">Version: </span>
                                    <span className="text-xs font-medium text-slate-700">{issue.fix_versions}</span>
                                    {issue.fix_version_released && (
                                      <span className={`ml-2 inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full ${
                                        issue.fix_version_released.includes('true')
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {issue.fix_version_released.includes('true') ? 'Released' : 'Pending'}
                                      </span>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                  <span>{issue.assignee}</span>
                                  <div className="flex items-center space-x-2">
                                    <span
                                      className="inline-flex px-2 py-1 rounded-full text-white"
                                      style={{ backgroundColor: PRIORITY_COLORS[issue.priority as keyof typeof PRIORITY_COLORS] || '#94a3b8' }}
                                    >
                                      {issue.priority}
                                    </span>
                                    {issue.story_points > 0 && (
                                      <span className="text-xs text-slate-500">SP: {issue.story_points}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          {issues.length > 12 && (
                            <div className="mt-4 text-center">
                              <span className="text-sm text-slate-500">
                                Showing 12 of {issues.length} issues
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
              })()}
            </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;