/**
 * Statistics calculator for simulation results
 */
export class StatisticsCalculator {
  /**
   * Calculate comprehensive statistics from simulation results
   * @param {Object} results - Results object from SimulationEngine
   * @param {number} maxValue - Target value
   * @returns {Object} Statistics object
   */
  calculateStats(results, maxValue) {
    if (!results || !results.hasAnyData) {
      return {
        completionRate: "0.0",
        avgLength: 0,
        medianLength: 0,
        maxLength: 0,
        minLength: 0,
        desiredRuns: results?.desiredSuccesses || 0,
        actualSuccesses: 0,
        totalAttempts: results?.totalAttempts || 0,
        reachedTarget: false,
        hitLimit: results?.hitAttemptLimit || false,
        avgIterations: 0,
        hasData: false,
      };
    }

    const { 
      completedRuns, 
      allAttempts, 
      desiredSuccesses,
      actualSuccesses,
      totalAttempts,
      actualCompletionRate,
      reachedDesiredCount,
      hitTimeLimit,
      totalTimeMs,
      timeoutPhase,
      averageIterations,
      averageSuccessfulIterations,
      averageRunTime
    } = results;
    
    // Calculate stats from completed runs for path length analysis
    let avgLength = 0, medianLength = 0, maxLength = 0, minLength = 0;
    
    if (completedRuns.length > 0) {
      const lengths = completedRuns.map((run) => run.length);
      avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      maxLength = Math.max(...lengths);
      minLength = Math.min(...lengths);

      // Calculate median length
      const sortedLengths = [...lengths].sort((a, b) => a - b);
      medianLength = sortedLengths[Math.floor(sortedLengths.length / 2)];
    }

    return {
      // Core metrics (now meaningful!)
      completionRate: actualCompletionRate.toFixed(1),
      desiredRuns: desiredSuccesses,
      actualSuccesses: actualSuccesses,
      totalAttempts: totalAttempts,
      reachedTarget: reachedDesiredCount,
      hitLimit: hitTimeLimit,
      
      // Path analysis (from successful runs only)
      avgLength: Math.round(avgLength),
      medianLength: medianLength,
      maxLength: maxLength,
      minLength: minLength,
      
      // Performance metrics
      avgIterations: Math.round(averageIterations),
      avgSuccessfulIterations: Math.round(averageSuccessfulIterations || avgLength),
      totalTimeMs: totalTimeMs,
      timeoutPhase: timeoutPhase,
      avgRunTime: averageRunTime ? Math.round(averageRunTime) : 0,
      
      hasData: true,
    };
  }

  /**
   * Display statistics in the UI
   * @param {Object} stats - Statistics object from calculateStats
   * @param {HTMLElement} statsContainer - DOM element to display stats
   */
  displayStats(stats, statsContainer) {
    if (!stats.hasData) {
      const statusMsg = stats.hitLimit 
        ? `Hit ${stats.totalAttempts} attempt limit with 0 successes` 
        : `${stats.totalAttempts} attempts, 0 completed`;
      
      statsContainer.innerHTML = `
        <div class="stat-card" style="grid-column: 1 / -1; background: #ffebee;">
          <div class="stat-label">No Successful Runs</div>
          <div class="stat-value" style="color: #c62828; font-size: 16px;">
            ${statusMsg}
          </div>
        </div>
      `;
      return;
    }

    // Status indicator for whether we reached the desired count
    const statusColor = stats.reachedTarget 
      ? '#2e7d32'  // Green - got all desired runs
      : stats.hitLimit 
        ? '#d32f2f'  // Red - hit attempt limit
        : '#f57c00'; // Orange - in progress or partial

    const statusText = stats.reachedTarget 
      ? `✓ Got ${stats.desiredRuns} successes`
      : stats.hitLimit 
        ? `⚠ Hit attempt limit`
        : `${stats.actualSuccesses}/${stats.desiredRuns}`;

    statsContainer.innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Parameter Efficiency</div>
        <div class="stat-value" style="color: ${stats.completionRate > 50 ? '#2e7d32' : stats.completionRate > 10 ? '#f57c00' : '#d32f2f'}">
          ${stats.completionRate}%
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Target Progress</div>
        <div class="stat-value" style="color: ${statusColor}; font-size: 18px;">
          ${statusText}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Elapsed Time</div>
        <div class="stat-value">${(stats.totalTimeMs / 1000).toFixed(1)}s</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Attempts</div>
        <div class="stat-value">${stats.totalAttempts}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg. Success Length</div>
        <div class="stat-value">${stats.avgLength || 'N/A'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg. Run Time</div>
        <div class="stat-value">${stats.avgRunTime ? stats.avgRunTime + 'ms' : 'N/A'}</div>
      </div>
    `;
  }
}