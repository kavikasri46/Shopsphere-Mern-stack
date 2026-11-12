import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import './Chart.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const STATUS_META = [
  { key: 'completed', label: 'Completed', color: '#28a745' },
  { key: 'processing', label: 'Processing', color: '#0d6efd' },
  { key: 'pending', label: 'Pending', color: '#ffc107' },
  { key: 'cancelled', label: 'Cancelled', color: '#dc3545' }
];

function OrderStatusChart({ statusDistribution = {}, statusRevenue = {} }) {
  const counts = STATUS_META.map(s => statusDistribution[s.key] || 0);
  const total = counts.reduce((sum, count) => sum + count, 0);

  const chartData = {
    labels: STATUS_META.map(s => s.label),
    datasets: [
      {
        data: counts,
        backgroundColor: STATUS_META.map(s => s.color),
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 6
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 16,
          usePointStyle: true,
          font: { size: 12 }
        }
      },
      title: {
        display: true,
        text: 'Order Status Breakdown',
        font: {
          size: 18,
          weight: 'bold'
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const meta = STATUS_META[context.dataIndex];
            const count = context.parsed || 0;
            const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
            const rev = statusRevenue[meta.key] || 0;
            return `${meta.label}: ${count} (${pct}%) — $${rev.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }
        }
      }
    }
  };

  return (
    <div className="chart-container">
      <div className="chart-wrapper">
        {total === 0 ? (
          <p className="chart-empty">No order status data available yet</p>
        ) : (
          <Doughnut data={chartData} options={options} />
        )}
      </div>
    </div>
  );
}

export default OrderStatusChart;

