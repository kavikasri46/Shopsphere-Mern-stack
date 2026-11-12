import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import './Chart.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function MonthlySalesChart({ monthlySales = [] }) {
  const [metric, setMetric] = useState('revenue');
  const ordered = [...monthlySales].reverse();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const chartData = {
    labels: ordered.map(item => `${monthNames[item.month - 1]} ${item.year}`),
    datasets: [
      {
        label: metric === 'revenue' ? 'Revenue ($)' : 'Completed Orders',
        data: ordered.map(item => (metric === 'revenue' ? item.revenue : item.orders)),
        backgroundColor: metric === 'revenue' ? 'rgba(102, 126, 234, 0.8)' : 'rgba(118, 75, 162, 0.8)',
        borderColor: metric === 'revenue' ? 'rgba(102, 126, 234, 1)' : 'rgba(118, 75, 162, 1)',
        borderWidth: 2,
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            if (metric === 'revenue') {
              return `Revenue: $${context.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
            return `Completed Orders: ${context.parsed.y}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: metric === 'orders' ? 0 : undefined,
          callback: function(value) {
            return metric === 'revenue' ? '$' + value.toLocaleString() : value;
          }
        }
      }
    }
  };

  return (
    <div className="chart-container">
      <div className="chart-header-row">
        <h2>{metric === 'revenue' ? 'Monthly Sales Revenue' : 'Monthly Completed Orders'}</h2>
        <div className="chart-toggle-group">
          <button
            type="button"
            className={`chart-toggle-btn ${metric === 'revenue' ? 'active' : ''}`}
            onClick={() => setMetric('revenue')}
          >
            Revenue
          </button>
          <button
            type="button"
            className={`chart-toggle-btn ${metric === 'orders' ? 'active' : ''}`}
            onClick={() => setMetric('orders')}
          >
            Orders
          </button>
        </div>
      </div>
      <div className="chart-wrapper">
        {ordered.length === 0 ? (
          <p className="chart-empty">No completed monthly sales data yet</p>
        ) : (
          <Bar data={chartData} options={options} />
        )}
      </div>
    </div>
  );
}

export default MonthlySalesChart;
