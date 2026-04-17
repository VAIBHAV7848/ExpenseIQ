/* ========================================
   ExpenseIQ — Chart.js Wrapper
   ======================================== */

const Charts = {
  instances: {},

  getThemeConfig() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return {
      textColor: isLight ? '#475569' : '#94a3b8',
      gridColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
      tooltipBg: isLight ? 'rgba(255,255,255,0.95)' : 'rgba(17,24,39,0.95)',
      tooltipTitle: isLight ? '#0f172a' : '#f1f5f9',
      tooltipText: isLight ? '#475569' : '#94a3b8',
      tooltipBorder: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'
    };
  },

  destroy(id) {
    if (this.instances[id]) {
      this.instances[id].destroy();
      delete this.instances[id];
    }
  },

  updateAllThemes() {
    Object.keys(this.instances).forEach(id => {
      const chart = this.instances[id];
      const theme = this.getThemeConfig();
      
      if (chart.options.scales?.x) {
        chart.options.scales.x.grid.color = theme.gridColor;
        chart.options.scales.x.ticks.color = theme.textColor;
      }
      if (chart.options.scales?.y) {
        chart.options.scales.y.grid.color = theme.gridColor;
        chart.options.scales.y.ticks.color = theme.textColor;
      }
      if (chart.options.scales?.r) {
        chart.options.scales.r.grid.color = theme.gridColor;
        chart.options.scales.r.angleLines.color = theme.gridColor;
        chart.options.scales.r.pointLabels.color = theme.textColor;
      }
      if (chart.options.plugins?.legend) {
        chart.options.plugins.legend.labels.color = theme.textColor;
      }
      if (chart.options.plugins?.tooltip) {
        chart.options.plugins.tooltip.backgroundColor = theme.tooltipBg;
        chart.options.plugins.tooltip.titleColor = theme.tooltipTitle;
        chart.options.plugins.tooltip.bodyColor = theme.tooltipText;
        chart.options.plugins.tooltip.borderColor = theme.tooltipBorder;
      }
      chart.update();
    });
  },

  _getDefaultOptions() {
    const theme = this.getThemeConfig();
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800, easing: 'easeInOutQuart' },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: theme.textColor, font: { family: 'Inter', size: 12 }, usePointStyle: true, padding: 20 }
        },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.tooltipTitle,
          bodyColor: theme.tooltipText,
          borderColor: theme.tooltipBorder,
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          bodyFont: { family: 'Inter', size: 13 },
          titleFont: { family: 'Inter', size: 14, weight: 'bold' },
          usePointStyle: true,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              if (context.parsed.y !== null) {
                label += Utils.formatCurrency(context.parsed.y);
              } else {
                label += Utils.formatCurrency(context.parsed);
              }
              return label;
            }
          }
        }
      }
    };
  },

  createLineChart(id, labels, datasets) {
    this.destroy(id);
    const ctx = document.getElementById(id);
    if (!ctx) return;
    
    const options = this._getDefaultOptions();
    const theme = this.getThemeConfig();
    
    options.scales = {
      x: { grid: { color: theme.gridColor }, ticks: { color: theme.textColor, font: { family: 'Inter' } } },
      y: { 
        grid: { color: theme.gridColor }, 
        ticks: { 
          color: theme.textColor, font: { family: 'Inter' },
          callback: function(value) { return '₹' + (value >= 1000 ? (value/1000) + 'k' : value); }
        } 
      }
    };
    
    // Helper: hex color to rgba string
    function hexToRgba(hex, alpha) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
    }

    // Add gradient fills to area datasets
    datasets.forEach(ds => {
      if (ds.fill) {
        ds.backgroundColor = (context) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return 'transparent';
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          const color = ds.borderColor || '#6366f1';
          gradient.addColorStop(0, hexToRgba(color, 0));
          gradient.addColorStop(1, hexToRgba(color, 0.2));
          return gradient;
        };
      }
      ds.pointBackgroundColor = ds.borderColor;
      ds.pointBorderColor = '#fff';
      ds.pointBorderWidth = 2;
      ds.pointRadius = 0;
      ds.pointHoverRadius = 6;
      ds.pointHoverBorderWidth = 3;
    });

    this.instances[id] = new Chart(ctx, { type: 'line', data: { labels, datasets }, options });
    return this.instances[id];
  },

  createBarChart(id, labels, datasets) {
    this.destroy(id);
    const ctx = document.getElementById(id);
    if (!ctx) return;
    
    const options = this._getDefaultOptions();
    const theme = this.getThemeConfig();
    
    options.scales = {
      x: { grid: { display: false }, ticks: { color: theme.textColor, font: { family: 'Inter' } } },
      y: { 
        grid: { color: theme.gridColor }, 
        ticks: { 
          color: theme.textColor, font: { family: 'Inter' },
          callback: function(value) { return '₹' + (value >= 1000 ? (value/1000) + 'k' : value); }
        } 
      }
    };

    datasets.forEach(ds => {
      ds.borderRadius = 4;
      ds.borderSkipped = false;
    });

    this.instances[id] = new Chart(ctx, { type: 'bar', data: { labels, datasets }, options });
    return this.instances[id];
  },

  createDonutChart(id, labels, data, colors) {
    this.destroy(id);
    const ctx = document.getElementById(id);
    if (!ctx) return;
    
    const options = this._getDefaultOptions();
    options.cutout = '75%';
    
    this.instances[id] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors, borderWidth: 0 }]
      },
      options
    });
    return this.instances[id];
  }
};
