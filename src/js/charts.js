(function(){
  // Chart refresh hooks and functionality
  window.__RM_LOADED = window.__RM_LOADED || [];
  window.__RM_LOADED.push('charts.js');
  let fpChart, fpChartCtx;
  const sel = document.getElementById('fpHistorySelect');
  const lim = document.getElementById('fpHistoryLimit');

  function initCharts() {
    // Initialize floorplan history chart
    const canvas = document.getElementById('fpHistoryChart');
    if (canvas) {
      fpChartCtx = canvas.getContext('2d');
      fpChart = new Chart(fpChartCtx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'Price',
            data: [],
            borderColor: '#22d3ee',
            backgroundColor: 'rgba(34, 211, 238, 0.1)',
            tension: 0.1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: false,
              ticks: {
                callback: function(value) {
                  return '$' + value.toLocaleString();
                }
              }
            }
          }
        }
      });
    }

    // Wire chart controls
    if (sel) {
      sel.addEventListener('change', refreshChartsFromRentRoll);
    }
    if (lim) {
      lim.addEventListener('change', refreshChartsFromRentRoll);
    }
  }

  function refreshChartsFromRentRoll() {
    if (!fpChart) return;
    
    try {
      const rows = Array.isArray(window.normRows) ? window.normRows : [];
      if (!rows.length) return;
      
      const selectedFp = sel?.value || '';
      const limit = Number(lim?.value) || 12;
      
      if (!selectedFp) {
        fpChart.data.labels = [];
        fpChart.data.datasets[0].data = [];
        fpChart.update();
        return;
      }
      
      // Filter data for selected floorplan
      const fpData = rows.filter(r => String(r.FP_CODE || r.Floorplan || '').trim() === selectedFp);
      
      // Group by month and calculate average price
      const monthlyData = new Map();
      fpData.forEach(row => {
        const month = monthKey(row.LeaseEnd || row.Lease_End || '');
        if (!month) return;
        
        const price = Number(row.Price || row.CurrentRent || 0);
        if (!monthlyData.has(month)) {
          monthlyData.set(month, { total: 0, count: 0 });
        }
        monthlyData.get(month).total += price;
        monthlyData.get(month).count += 1;
      });
      
      // Sort by month and limit
      const sortedMonths = Array.from(monthlyData.keys()).sort().slice(-limit);
      const labels = sortedMonths;
      const data = sortedMonths.map(month => {
        const info = monthlyData.get(month);
        return info.count > 0 ? info.total / info.count : 0;
      });
      
      fpChart.data.labels = labels;
      fpChart.data.datasets[0].data = data;
      fpChart.update();
      
    } catch (e) {
      console.error('Error refreshing charts:', e);
    }
  }

  function monthKey(dt) {
    const d = new Date(dt);
    if (isNaN(d)) return null;
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }

  function updateChartData(floorplan, prices) {
    if (!fpChart) return;
    
    // Update chart with new pricing data
    const labels = prices.map((_, i) => `Month ${i + 1}`);
    fpChart.data.labels = labels;
    fpChart.data.datasets[0].data = prices;
    fpChart.update();
  }

  function clearCharts() {
    if (fpChart) {
      fpChart.data.labels = [];
      fpChart.data.datasets[0].data = [];
      fpChart.update();
    }
  }

  // Expose functions to global scope
  window.initCharts = initCharts;
  window.refreshChartsFromRentRoll = refreshChartsFromRentRoll;
  window.updateChartData = updateChartData;
  window.clearCharts = clearCharts;

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', initCharts);
})();
