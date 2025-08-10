/**
 * Visualization engine for rendering simulation results
 */
export class VisualizationEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.margin = { top: 20, right: 20, bottom: 40, left: 40 };
    
    // Store heatmap data for tooltip access
    this.currentHeatmapData = null;
    this.currentRuns = null;
    this.currentVisualizationType = null;
    this.currentMaxValue = null;
    
    // Tooltip element (will be created when needed)
    this.tooltip = null;
    this.isTooltipActive = false;
    
    this._setupTooltipHandlers();
  }

  /**
   * Clear the canvas
   */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Display no data message
   */
  showNoDataMessage(customMessage = null) {
    this.clear();
    this.ctx.font = "16px Arial";
    this.ctx.fillStyle = "#999";
    this.ctx.textAlign = "center";
    
    const message = customMessage || 'No visualization data available.\nTry adjusting parameters or click "Run Simulation".';
    
    const lines = message.split('\n');
    const startY = this.canvas.height / 2 - (lines.length - 1) * 10;
    
    lines.forEach((line, index) => {
      this.ctx.fillText(line, this.canvas.width / 2, startY + index * 20);
    });
  }

  /**
   * Create heatmap data from simulation runs
   */
  createHeatmap(runs, colorScaling, visualizationType, maxValue) {
    if (!runs || runs.length === 0) {
      return {
        colorDensity: [],
        alphaDensity: [],
        gridWidth: 0,
        gridHeight: 0,
      };
    }

    const maxLength = Math.max(...runs.map((run) => run.length));
    const gridWidth = Math.min(maxLength, 1000);
    const gridHeight = maxValue + 1;

    // Track both count and horizontal collapse
    const verticalDensity = Array(gridHeight)
      .fill(null)
      .map(() => Array(gridWidth).fill(0));
    const horizontalDensity = Array(gridHeight)
      .fill(null)
      .map(() => Array(gridWidth).fill(0));

    if (visualizationType === "peak") {
      this._calculatePeakDensity(runs, verticalDensity, horizontalDensity, maxLength, gridWidth, gridHeight);
    } else {
      this._calculateFullDensity(runs, verticalDensity, horizontalDensity, maxLength, gridWidth, gridHeight);
    }

    const scaledDensity = this._applyColorScaling(verticalDensity, colorScaling, gridWidth, gridHeight);
    const normalizedAlpha = this._normalizeAlphaDensity(horizontalDensity, gridWidth, gridHeight);

    return {
      colorDensity: scaledDensity,
      alphaDensity: normalizedAlpha,
      rawVerticalDensity: verticalDensity,
      rawHorizontalDensity: horizontalDensity,
      gridWidth,
      gridHeight,
      maxLength,
      totalRuns: runs.length,
    };
  }

  _calculatePeakDensity(runs, verticalDensity, horizontalDensity, maxLength, gridWidth, gridHeight) {
    runs.forEach((run) => {
      const peakValues = Array(gridWidth).fill(-1);
      const peakCounts = Array(gridWidth).fill(0);

      run.forEach((value, index) => {
        const x = Math.floor((index * gridWidth) / maxLength);
        if (x < gridWidth) {
          peakValues[x] = Math.max(peakValues[x], value);
          peakCounts[x]++;
        }
      });

      peakValues.forEach((peak, x) => {
        if (peak >= 0) {
          verticalDensity[peak][x]++;
          horizontalDensity[peak][x] += peakCounts[x];
        }
      });
    });
  }

  _calculateFullDensity(runs, verticalDensity, horizontalDensity, maxLength, gridWidth, gridHeight) {
    runs.forEach((run) => {
      const binCounts = Array(gridHeight)
        .fill(null)
        .map(() => Array(gridWidth).fill(0));

      run.forEach((value, index) => {
        const x = Math.floor((index * gridWidth) / maxLength);
        if (x < gridWidth) {
          binCounts[value][x]++;
        }
      });

      for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
          if (binCounts[y][x] > 0) {
            verticalDensity[y][x]++;
            horizontalDensity[y][x] += binCounts[y][x];
          }
        }
      }
    });
  }

  _applyColorScaling(verticalDensity, colorScaling, gridWidth, gridHeight) {
    const flatDensity = verticalDensity.flat().filter((d) => d > 0);
    let scaledDensity = Array(gridHeight)
      .fill(null)
      .map(() => Array(gridWidth).fill(0));

    if (flatDensity.length === 0) return scaledDensity;

    switch (colorScaling) {
      case "sqrt":
        const maxSqrt = Math.sqrt(Math.max(...flatDensity));
        for (let y = 0; y < gridHeight; y++) {
          for (let x = 0; x < gridWidth; x++) {
            scaledDensity[y][x] = Math.sqrt(verticalDensity[y][x]) / maxSqrt;
          }
        }
        break;

      case "log":
        const maxLog = Math.log(Math.max(...flatDensity) + 1);
        for (let y = 0; y < gridHeight; y++) {
          for (let x = 0; x < gridWidth; x++) {
            scaledDensity[y][x] = Math.log(verticalDensity[y][x] + 1) / maxLog;
          }
        }
        break;

      case "percentile":
        const uniqueValues = [...new Set(flatDensity)].sort((a, b) => a - b);
        const percentileMap = new Map();
        uniqueValues.forEach((val, idx) => {
          percentileMap.set(val, idx / (uniqueValues.length - 1));
        });
        percentileMap.set(0, 0);

        for (let y = 0; y < gridHeight; y++) {
          for (let x = 0; x < gridWidth; x++) {
            scaledDensity[y][x] = percentileMap.get(verticalDensity[y][x]) || 0;
          }
        }
        break;

      case "linear":
      default:
        const maxLinear = Math.max(...flatDensity);
        for (let y = 0; y < gridHeight; y++) {
          for (let x = 0; x < gridWidth; x++) {
            scaledDensity[y][x] = verticalDensity[y][x] / maxLinear;
          }
        }
        break;
    }

    return scaledDensity;
  }

  _normalizeAlphaDensity(horizontalDensity, gridWidth, gridHeight) {
    const maxHorizontal = Math.max(...horizontalDensity.flat());
    const normalizedAlpha = Array(gridHeight)
      .fill(null)
      .map(() => Array(gridWidth).fill(0));

    if (maxHorizontal > 0) {
      for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
          normalizedAlpha[y][x] = Math.sqrt(horizontalDensity[y][x] / maxHorizontal);
        }
      }
    }

    return normalizedAlpha;
  }

  /**
   * Get color for heatmap visualization
   */
  getHeatmapColor(colorValue, alphaValue) {
    if (colorValue === 0 && alphaValue === 0) return "rgba(255, 255, 255, 0)";

    let r, g, b;
    if (colorValue < 0.2) {
      const t = colorValue * 5;
      r = 30 + t * 20;
      g = 30 + t * 20;
      b = 60 + t * 90;
    } else if (colorValue < 0.4) {
      const t = (colorValue - 0.2) * 5;
      r = 50;
      g = 50 + t * 100;
      b = 150;
    } else if (colorValue < 0.6) {
      const t = (colorValue - 0.4) * 5;
      r = 50 + t * 205;
      g = 150 + t * 50;
      b = 150 - t * 150;
    } else if (colorValue < 0.8) {
      const t = (colorValue - 0.6) * 5;
      r = 255;
      g = 200 - t * 50;
      b = 0;
    } else {
      const t = (colorValue - 0.8) * 5;
      r = 255;
      g = 150 - t * 100;
      b = 50 - t * 50;
    }

    const alpha = Math.min(0.1 + alphaValue * 0.9, 1);
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
  }

  /**
   * Draw the complete visualization
   */
  drawVisualization(runs, visualizationType, colorScaling, maxValue) {
    this.clear();

    if (!runs || runs.length === 0) {
      this.showNoDataMessage();
      // Clear stored data when no data to show
      this.currentHeatmapData = null;
      this.currentRuns = null;
      return;
    }

    // Store current visualization state for tooltip access
    this.currentRuns = runs;
    this.currentVisualizationType = visualizationType;
    this.currentMaxValue = maxValue;

    const plotWidth = this.canvas.width - this.margin.left - this.margin.right;
    const plotHeight = this.canvas.height - this.margin.top - this.margin.bottom;

    // Draw heatmap/peak visualization
    if (["heatmap", "both", "peak"].includes(visualizationType)) {
      this._drawHeatmap(runs, visualizationType, colorScaling, maxValue, plotWidth, plotHeight);
    }

    // Draw individual lines
    if (["lines", "both"].includes(visualizationType)) {
      this._drawLines(runs, visualizationType, maxValue, plotWidth, plotHeight);
    }

    // Draw axes and labels
    this._drawAxes(runs, maxValue, plotWidth, plotHeight);
    this._drawLabels(visualizationType, colorScaling, runs);
  }

  _drawHeatmap(runs, visualizationType, colorScaling, maxValue, plotWidth, plotHeight) {
    const heatmapData = this.createHeatmap(
      runs,
      colorScaling,
      visualizationType,
      maxValue
    );
    
    // Store heatmap data for tooltip access
    this.currentHeatmapData = heatmapData;
    
    const { colorDensity, alphaDensity, gridWidth, gridHeight } = heatmapData;
    const cellWidth = plotWidth / gridWidth;
    const cellHeight = plotHeight / gridHeight;

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const colorValue = colorDensity[y][x];
        const alphaValue = alphaDensity[y][x];
        if (colorValue > 0 || alphaValue > 0) {
          this.ctx.fillStyle = this.getHeatmapColor(colorValue, alphaValue);
          this.ctx.fillRect(
            this.margin.left + x * cellWidth,
            this.margin.top + plotHeight - (y + 1) * cellHeight,
            cellWidth + 1,
            cellHeight + 1
          );
        }
      }
    }
  }

  _drawLines(runs, visualizationType, maxValue, plotWidth, plotHeight) {
    const maxLength = Math.max(...runs.map((run) => run.length));

    this.ctx.globalAlpha = visualizationType === "both" ? 0.02 : 0.05;
    this.ctx.strokeStyle = "purple";
    this.ctx.lineWidth = 1;

    runs.forEach((run) => {
      this.ctx.beginPath();
      run.forEach((value, index) => {
        const x = this.margin.left + (index / maxLength) * plotWidth;
        const y = this.margin.top + plotHeight - (value / maxValue) * plotHeight;

        if (index === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      });
      this.ctx.stroke();
    });

    this.ctx.globalAlpha = 1;
  }

  _drawAxes(runs, maxValue, plotWidth, plotHeight) {
    this.ctx.strokeStyle = "#333";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(this.margin.left, this.margin.top);
    this.ctx.lineTo(this.margin.left, this.margin.top + plotHeight);
    this.ctx.lineTo(this.margin.left + plotWidth, this.margin.top + plotHeight);
    this.ctx.stroke();

    // Grid lines and labels
    this.ctx.strokeStyle = "#ddd";
    this.ctx.lineWidth = 0.5;
    this.ctx.fillStyle = "#666";
    this.ctx.font = "10px Arial";

    // Y-axis
    const yStep = maxValue <= 20 ? 5 : 10;
    for (let i = 0; i <= maxValue; i += yStep) {
      const y = this.margin.top + plotHeight - (i / maxValue) * plotHeight;
      this.ctx.beginPath();
      this.ctx.moveTo(this.margin.left, y);
      this.ctx.lineTo(this.margin.left + plotWidth, y);
      this.ctx.stroke();
      this.ctx.textAlign = "right";
      this.ctx.fillText(i.toString(), this.margin.left - 5, y + 3);
    }

    // X-axis
    const maxLength = Math.max(...runs.map((run) => run.length));
    this.ctx.textAlign = "center";
    for (let i = 0; i <= 5; i++) {
      const x = this.margin.left + (i / 5) * plotWidth;
      const iterValue = Math.round((i / 5) * maxLength);
      this.ctx.fillText(iterValue.toString(), x, this.margin.top + plotHeight + 15);
    }

    // Axis titles
    this.ctx.font = "12px Arial";
    this.ctx.fillStyle = "#333";
    this.ctx.save();
    this.ctx.translate(15, this.canvas.height / 2);
    this.ctx.rotate(-Math.PI / 2);
    this.ctx.textAlign = "center";
    this.ctx.fillText("Counter Value", 0, 0);
    this.ctx.restore();
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      `Iterations (longest run: ${maxLength})`,
      this.canvas.width / 2,
      this.canvas.height - 5
    );
  }

  _drawLabels(visualizationType, colorScaling, runs) {
    const scalingLabel = {
      linear: "Linear",
      sqrt: "Square Root",
      log: "Logarithmic",
      percentile: "Percentile",
    }[colorScaling] || "Linear";

    const modeLabel = {
      heatmap: "Full Path Density",
      lines: "Individual Paths",
      both: "Combined View",
      peak: "Peak Trajectory",
    }[visualizationType] || "Full Path";

    this.ctx.font = "10px Arial";
    this.ctx.fillStyle = "#888";
    this.ctx.textAlign = "right";
    this.ctx.fillText(
      `Mode: ${modeLabel} | Scaling: ${scalingLabel}`,
      this.canvas.width - 25,
      15
    );
  }

  /**
   * Setup tooltip event handlers
   * @private
   */
  _setupTooltipHandlers() {
    // Mouse move handler with throttling
    let throttleTimer = null;
    this.canvas.addEventListener('mousemove', (e) => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        this._handleMouseMove(e);
        throttleTimer = null;
      }, 16); // ~60fps
    });

    // Mouse leave handler
    this.canvas.addEventListener('mouseleave', () => {
      this._hideTooltip();
    });
  }

  /**
   * Handle mouse movement over canvas
   * @private
   */
  _handleMouseMove(e) {
    if (!this.currentHeatmapData || !this.currentRuns) {
      this._hideTooltip();
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    // Check if mouse is within plot area
    const plotWidth = this.canvas.width - this.margin.left - this.margin.right;
    const plotHeight = this.canvas.height - this.margin.top - this.margin.bottom;
    
    if (canvasX < this.margin.left || canvasX > this.margin.left + plotWidth ||
        canvasY < this.margin.top || canvasY > this.margin.top + plotHeight) {
      this._hideTooltip();
      return;
    }

    // Convert to grid coordinates
    const gridCoords = this._canvasToGridCoordinates(canvasX, canvasY, plotWidth, plotHeight);
    if (!gridCoords) {
      this._hideTooltip();
      return;
    }

    // Get tooltip data
    const tooltipData = this._getTooltipData(gridCoords.gridX, gridCoords.gridY);
    if (tooltipData) {
      this._showTooltip(e.clientX, e.clientY, tooltipData);
    } else {
      this._hideTooltip();
    }
  }

  /**
   * Convert canvas coordinates to grid coordinates
   * @private
   */
  _canvasToGridCoordinates(canvasX, canvasY, plotWidth, plotHeight) {
    if (!this.currentHeatmapData) return null;

    const { gridWidth, gridHeight } = this.currentHeatmapData;
    
    // Convert to relative plot coordinates (0-1)
    const relX = (canvasX - this.margin.left) / plotWidth;
    const relY = (this.margin.top + plotHeight - canvasY) / plotHeight;
    
    // Convert to grid coordinates
    const gridX = Math.floor(relX * gridWidth);
    const gridY = Math.floor(relY * gridHeight);
    
    // Validate bounds
    if (gridX < 0 || gridX >= gridWidth || gridY < 0 || gridY >= gridHeight) {
      return null;
    }
    
    return { gridX, gridY };
  }

  /**
   * Get tooltip data for specific grid coordinates
   * @private
   */
  _getTooltipData(gridX, gridY) {
    if (!this.currentHeatmapData) return null;

    const {
      rawVerticalDensity,
      rawHorizontalDensity,
      colorDensity,
      alphaDensity,
      gridWidth,
      gridHeight,
      maxLength,
      totalRuns
    } = this.currentHeatmapData;

    // Get raw density values
    const verticalCount = rawVerticalDensity[gridY][gridX];
    const horizontalCount = rawHorizontalDensity[gridY][gridX];
    const scaledColorValue = colorDensity[gridY][gridX];
    const scaledAlphaValue = alphaDensity[gridY][gridX];

    // Skip empty cells
    if (verticalCount === 0 && horizontalCount === 0) {
      return null;
    }

    // Calculate data coordinates
    const counterValue = gridY;
    const timePosition = (gridX / gridWidth) * maxLength;
    const timeStart = Math.floor(timePosition);
    const timeEnd = Math.floor(((gridX + 1) / gridWidth) * maxLength);
    
    // Calculate percentages
    const runPercentage = totalRuns > 0 ? ((verticalCount / totalRuns) * 100).toFixed(1) : '0.0';
    
    return {
      counterValue,
      timeStart,
      timeEnd: Math.max(timeStart + 1, timeEnd),
      verticalCount,
      horizontalCount,
      runPercentage,
      totalRuns,
      scaledColorValue: (scaledColorValue * 100).toFixed(1),
      scaledAlphaValue: (scaledAlphaValue * 100).toFixed(1),
      visualizationType: this.currentVisualizationType
    };
  }

  /**
   * Create tooltip DOM element if it doesn't exist
   * @private
   */
  _createTooltip() {
    if (this.tooltip) return;

    this.tooltip = document.createElement('div');
    this.tooltip.style.cssText = `
      position: fixed;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-family: monospace;
      pointer-events: none;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.15s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      max-width: 250px;
      line-height: 1.3;
    `;
    document.body.appendChild(this.tooltip);
  }

  /**
   * Show tooltip with data
   * @private
   */
  _showTooltip(mouseX, mouseY, data) {
    this._createTooltip();
    
    const {
      counterValue,
      timeStart,
      timeEnd,
      verticalCount,
      horizontalCount,
      runPercentage,
      totalRuns,
      scaledColorValue,
      scaledAlphaValue,
      visualizationType
    } = data;

    // Build tooltip content based on visualization type
    let content = '';
    
    if (visualizationType === 'peak') {
      content = `<strong>Peak Trajectory</strong><br/>`;
      content += `Counter Value: ${counterValue}<br/>`;
      content += `Time Window: ${timeStart}-${timeEnd}<br/>`;
      content += `Runs w/ Peak Here: ${verticalCount} (${runPercentage}%)<br/>`;
      content += `Data Points: ${horizontalCount}`;
    } else {
      content = `<strong>Path Density</strong><br/>`;
      content += `Counter Value: ${counterValue}<br/>`;
      content += `Time Steps: ${timeStart}-${timeEnd}<br/>`;
      content += `Runs Passing Through: ${verticalCount} (${runPercentage}%)<br/>`;
      content += `Total Data Points: ${horizontalCount}<br/>`;
      if (horizontalCount > verticalCount) {
        const avgSteps = (horizontalCount / verticalCount).toFixed(1);
        content += `Avg. Steps per Run: ${avgSteps}`;
      }
    }
    
    this.tooltip.innerHTML = content;
    
    // Position tooltip near mouse but avoid edges
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let x = mouseX + 15;
    let y = mouseY - 10;
    
    // Adjust position to stay in viewport
    if (x + tooltipRect.width > viewportWidth - 10) {
      x = mouseX - tooltipRect.width - 15;
    }
    if (y < 10) {
      y = mouseY + 25;
    }
    if (y + tooltipRect.height > viewportHeight - 10) {
      y = mouseY - tooltipRect.height - 25;
    }
    
    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
    this.tooltip.style.opacity = '1';
    
    this.isTooltipActive = true;
  }

  /**
   * Hide tooltip
   * @private
   */
  _hideTooltip() {
    if (this.tooltip && this.isTooltipActive) {
      this.tooltip.style.opacity = '0';
      this.isTooltipActive = false;
    }
  }

  /**
   * Cleanup tooltip on destroy
   */
  destroy() {
    if (this.tooltip) {
      document.body.removeChild(this.tooltip);
      this.tooltip = null;
    }
  }
}