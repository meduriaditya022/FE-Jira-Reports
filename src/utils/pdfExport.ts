import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToPDF = async (data: any[], metrics: any, chartData: any) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Title
  pdf.setFontSize(20);
  pdf.setTextColor(30, 64, 175);
  pdf.text('JIRA Analytics Dashboard Report', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 10;
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });

  // Summary Metrics
  yPosition += 15;
  pdf.setFontSize(16);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Summary Metrics', 14, yPosition);

  yPosition += 10;
  pdf.setFontSize(10);

  const metricsData = [
    ['Total Issues', metrics.totalIssues.toString()],
    ['Completed Issues', metrics.completedIssues.toString()],
    ['Blocked Issues', metrics.blockedIssues.toString()],
    ['High Priority Issues', metrics.highPriorityIssues.toString()],
    ['Total Story Points', metrics.totalStoryPoints.toString()],
    ['Average Story Points', metrics.avgStoryPoints.toFixed(2)],
    ['Completion Rate', `${metrics.completionRate.toFixed(1)}%`],
    ['Active Boards', metrics.totalBoards.toString()],
  ];

  autoTable(pdf, {
    startY: yPosition,
    head: [['Metric', 'Value']],
    body: metricsData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: 14, right: 14 },
  });

  // Board Performance
  yPosition = (pdf as any).lastAutoTable.finalY + 15;

  if (yPosition > pageHeight - 40) {
    pdf.addPage();
    yPosition = 20;
  }

  pdf.setFontSize(16);
  pdf.text('Board Performance', 14, yPosition);
  yPosition += 5;

  const boardData = chartData.boardData.map((board: any) => [
    board.name,
    board.completed.toString(),
    board.inProgress.toString(),
    board.blocked.toString(),
    board.points.toString(),
  ]);

  autoTable(pdf, {
    startY: yPosition,
    head: [['Board', 'Completed', 'In Progress', 'Blocked', 'Points']],
    body: boardData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: 14, right: 14 },
  });

  // Status Distribution
  yPosition = (pdf as any).lastAutoTable.finalY + 15;

  if (yPosition > pageHeight - 40) {
    pdf.addPage();
    yPosition = 20;
  }

  pdf.setFontSize(16);
  pdf.text('Status Distribution', 14, yPosition);
  yPosition += 5;

  const statusData = chartData.statusData.map((status: any) => [
    status.name,
    status.value.toString(),
  ]);

  autoTable(pdf, {
    startY: yPosition,
    head: [['Status', 'Count']],
    body: statusData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: 14, right: 14 },
  });

  // Top Performers
  yPosition = (pdf as any).lastAutoTable.finalY + 15;

  if (yPosition > pageHeight - 40) {
    pdf.addPage();
    yPosition = 20;
  }

  pdf.setFontSize(16);
  pdf.text('Top Performers', 14, yPosition);
  yPosition += 5;

  const performerData = chartData.userPerformanceData.slice(0, 10).map((user: any) => [
    user.name,
    user.completed.toString(),
    user.inProgress.toString(),
    user.points.toString(),
    `${user.efficiency.toFixed(1)}%`,
  ]);

  autoTable(pdf, {
    startY: yPosition,
    head: [['User', 'Completed', 'In Progress', 'Points', 'Efficiency']],
    body: performerData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: 14, right: 14 },
  });

  // Priority Distribution
  yPosition = (pdf as any).lastAutoTable.finalY + 15;

  if (yPosition > pageHeight - 40) {
    pdf.addPage();
    yPosition = 20;
  }

  pdf.setFontSize(16);
  pdf.text('Priority Distribution', 14, yPosition);
  yPosition += 5;

  const priorityData = chartData.priorityData.map((priority: any) => [
    priority.name,
    priority.value.toString(),
  ]);

  autoTable(pdf, {
    startY: yPosition,
    head: [['Priority', 'Count']],
    body: priorityData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: 14, right: 14 },
  });

  // Issue Details (Top 50)
  pdf.addPage();
  yPosition = 20;

  pdf.setFontSize(16);
  pdf.text('Issue Details (Top 50)', 14, yPosition);
  yPosition += 5;

  const issueData = data.slice(0, 50).map((issue: any) => [
    issue.issue_key,
    issue.board_name.substring(0, 20),
    issue.summary.substring(0, 30),
    issue.status,
    issue.assignee.substring(0, 15),
    issue.priority,
    issue.story_points?.toString() || '0',
  ]);

  autoTable(pdf, {
    startY: yPosition,
    head: [['Issue', 'Board', 'Summary', 'Status', 'Assignee', 'Priority', 'Points']],
    body: issueData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    margin: { left: 14, right: 14 },
  });

  // Save the PDF
  pdf.save(`jira-analytics-report-${new Date().toISOString().split('T')[0]}.pdf`);
};
