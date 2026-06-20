'use client';

import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';
import type { ScanReport } from '@/types/scan';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TrendsChartProps {
  reports: ScanReport[];
  groupBy: 'project' | 'none';
}

function formatDate(value?: string | null) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString([], {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const COLORS = ['#10b981', '#60a5fa', '#f59e0b', '#ef4444', '#8a8a80', '#38c46a'];

export function TrendsChart({ reports, groupBy }: TrendsChartProps) {
  const chartData = useMemo(() => {
    let datasets: any[] = [];

    if (groupBy === 'project') {
      const groups: Record<string, ScanReport[]> = {};
      reports.forEach(r => {
        const proj = r.project_name || 'Unlabeled';
        if (!groups[proj]) groups[proj] = [];
        groups[proj].push(r);
      });

      Object.keys(groups).forEach((proj, i) => {
        const sorted = [...groups[proj]].sort((a, b) =>
          new Date(a.created_at || a.timestamp || 0).getTime() -
          new Date(b.created_at || b.timestamp || 0).getTime()
        );

        datasets.push({
          label: proj,
          data: sorted.map(r => ({
            x: formatDate(r.created_at || r.timestamp),
            y: r.safety_score
          })),
          borderColor: COLORS[i % COLORS.length],
          backgroundColor: COLORS[i % COLORS.length] + '22',
          tension: 0.3,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6
        });
      });
    } else {
      const sorted = [...reports].sort((a, b) =>
        new Date(a.created_at || a.timestamp || 0).getTime() -
        new Date(b.created_at || b.timestamp || 0).getTime()
      );

      datasets.push({
        label: 'Safety Scores',
        data: sorted.map(r => ({
          x: formatDate(r.created_at || r.timestamp),
          y: r.safety_score
        })),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        tension: 0.2,
        fill: true,
        pointRadius: 5
      });
    }

    const allLabels = Array.from(new Set(datasets.flatMap(ds => ds.data.map((d: any) => d.x))))
      .sort((a: any, b: any) => new Date(a).getTime() - new Date(b).getTime());

    return {
      labels: allLabels,
      datasets
    };
  }, [reports, groupBy]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          padding: 15,
          color: 'rgba(242, 242, 237, 0.68)', // var(--muted)
          font: { size: 10, family: 'Inter, sans-serif' }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 23, 21, 0.95)',
        titleColor: '#f2f2ed',
        bodyColor: '#f2f2ed',
        borderColor: 'rgba(255, 255, 255, 0.11)',
        borderWidth: 1,
        padding: 10,
        displayColors: true
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: 'rgba(242, 242, 237, 0.44)',
          font: { size: 9 }
        }
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: {
          stepSize: 20,
          color: 'rgba(242, 242, 237, 0.44)',
          font: { size: 9 }
        }
      }
    }
  };

  return <Line data={chartData} options={options} />;
}
