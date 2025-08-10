/**
 * Core simulation engine for probabilistic counter runs
 */
export class SimulationEngine {
  constructor() {
    this.defaultIterationSafetyLimit = 10000000; // 10M iterations - much higher safety limit
    this.isRunning = false;
    this.shouldStop = false;
  }

  /**
   * Simulate a single probabilistic counter run (runs until completion or iteration limit)
   * @param {number} initialProb - Starting probability of increment
   * @param {number} decayFactor - Factor by which probability changes per level
   * @param {number} maxValue - Target value to reach
   * @param {number} maxTimeMs - Legacy parameter (no longer used for timeouts)
   * @param {number} iterationSafetyLimit - Safety limit to prevent infinite loops (default: 100,000)
   * @param {boolean} allowYielding - Whether to yield during long runs for browser responsiveness
   * @param {Function} progressCallback - Callback for progress updates during long runs
   * @param {Object} progressData - Current progress data for callback
   * @returns {Promise<Object>} Result object with complete path, timing metrics, and completion status
   */
  async simulateRun(initialProb, decayFactor, maxValue, maxTimeMs = 5000, iterationSafetyLimit = this.defaultIterationSafetyLimit, allowYielding = false, progressCallback = null, progressData = null) {
    const startTime = performance.now();
    const path = [];
    let counter = 0;
    let iterations = 0;

    // Keep running until we reach maxValue or hit iteration safety limit
    while (counter < maxValue && iterations < iterationSafetyLimit) {
      // Yield control periodically during long individual runs
      if (iterations % 1000 === 0) {
        // Yield control during long individual runs if allowed (for browser responsiveness)
        if (allowYielding) {
          // Update progress during long runs
          if (progressCallback && progressData) {
            const elapsed = performance.now() - startTime;
            console.log(`📊 Long run in progress: ${iterations} steps, ${elapsed.toFixed(0)}ms, counter at ${counter}`);
            progressCallback({
              ...progressData,
              elapsedMs: progressData.elapsedMs + elapsed
            });
          }
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      
      path.push(counter);

      // Calculate probability of going up using user-defined initial probability
      const pUp = initialProb * Math.pow(decayFactor, counter);

      // Cap probability at 0 and 1
      const cappedPUp = Math.max(0, Math.min(1, pUp));

      // Determine if counter goes up or down
      if (Math.random() < cappedPUp) {
        counter++;
      } else {
        counter = Math.max(0, counter - 1);
      }

      iterations++;
    }

    // Add final state if we reached maxValue
    if (counter === maxValue) {
      path.push(maxValue);
    }

    const totalTime = performance.now() - startTime;
    const hitIterationLimit = iterations >= iterationSafetyLimit;
    const completed = counter === maxValue;

    return {
      path,
      completed,
      iterations,
      timeMs: totalTime, // Keep timing for difficulty metrics
      hitIterationLimit,
      reason: completed ? 'success' : 
              hitIterationLimit ? 'iteration_limit' : 'unknown'
    };
  }

  /**
   * Stop the current simulation
   */
  stop() {
    this.shouldStop = true;
    
    // Track when pause started for accurate time calculation
    if (this.isRunning) {
      this.pauseStartTime = performance.now();
    }
  }
  
  /**
   * Get actual simulation time excluding paused periods
   */
  getSimulationTime(startTime, pausedTime, pauseStartTime) {
    const currentTime = performance.now();
    const wallClockTime = currentTime - startTime;
    
    // If currently paused, add time since pause started
    const currentPausedTime = pauseStartTime ? pausedTime + (currentTime - pauseStartTime) : pausedTime;
    
    return wallClockTime - currentPausedTime;
  }

  /**
   * Run simulations asynchronously until we get the desired number of successes or hit time limit
   * @param {Object} params - Simulation parameters
   * @param {number} params.numRuns - Number of SUCCESSFUL runs desired
   * @param {number} params.initialProb - Initial probability
   * @param {number} params.decayFactor - Decay factor
   * @param {number} params.maxValue - Target value
   * @param {number} params.totalTimeLimit - Total time limit in milliseconds (2000, 10000, or null for unlimited)
   * @param {number} params.singleRunTimeLimit - Time limit per individual run in milliseconds
   * @param {Function} params.progressCallback - Optional callback for progress updates
   * @returns {Promise<Object>} Promise that resolves to results containing all runs and completion stats
   */
  async runMultipleSimulations({ 
    numRuns, 
    initialProb, 
    decayFactor, 
    maxValue, 
    totalTimeLimit = 2000,
    singleRunTimeLimit = 1000,
    progressCallback = null,
    // Continuation parameters
    existingResults = null
  }) {
    this.isRunning = true;
    this.shouldStop = false;
    this.lastYieldTime = null; // Reset yield tracking
    
    const startTime = performance.now();
    let pausedTime = 0; // Track time spent paused
    let pauseStartTime = null;
    
    // Initialize with existing data if continuing, otherwise start fresh
    const allAttempts = existingResults ? [...existingResults.allAttempts] : [];
    const completedRuns = existingResults ? [...existingResults.completedRuns] : [];
    const failedRuns = existingResults ? [...existingResults.failedRuns] : [];
    
    let totalAttempts = existingResults ? existingResults.totalAttempts : 0;
    let successfulRuns = existingResults ? existingResults.actualSuccesses : 0;
    
    // Track cumulative time from previous phases (only actual simulation time)
    const previousTimeMs = existingResults ? existingResults.totalSimulationTimeMs || existingResults.totalTimeMs : 0;
    
    const timeoutName = totalTimeLimit === 2000 ? '2-second' : 
                       totalTimeLimit === 10000 ? '10-second' : 'unlimited';
    
    console.log(`Starting simulation: seeking ${numRuns} successful runs with ${timeoutName} time limit`);
    
    // Keep running until we get numRuns successes, hit time limit, or are stopped
    while (successfulRuns < numRuns && !this.shouldStop) {
      // Check total time limit
      const elapsed = performance.now() - startTime;
      if (totalTimeLimit && elapsed > totalTimeLimit) {
        console.log(`Hit ${timeoutName} time limit at ${elapsed.toFixed(0)}ms`);
        break;
      }
      
      // Safety check for unlimited mode - warn after 60 seconds, offer to stop after 120 seconds
      if (!totalTimeLimit && elapsed > 60000) {
        if (elapsed > 120000) {
          console.warn(`Unlimited simulation running for ${(elapsed/1000).toFixed(0)}s - consider stopping to prevent browser freeze`);
          if (elapsed > 300000) { // 5 minutes absolute safety limit
            console.error(`Stopping simulation after 5 minutes for browser safety`);
            break;
          }
        }
      }
      
      // Increment attempts counter before starting (so progress shows current attempt)
      totalAttempts++;
      
      // Run single simulation with individual time limit
      // Enable yielding for unlimited phase to prevent browser hangs
      const allowYielding = totalTimeLimit === null;
      // For unlimited phase, use much higher iteration limit (effectively no limit)
      const iterationLimit = totalTimeLimit === null ? Number.MAX_SAFE_INTEGER : this.defaultIterationSafetyLimit;
      // Prepare progress data for individual run updates
      const progressData = {
        successes: successfulRuns,
        target: numRuns,
        attempts: totalAttempts,
        elapsedMs: previousTimeMs + (performance.now() - startTime)
      };
      
      const result = await this.simulateRun(initialProb, decayFactor, maxValue, singleRunTimeLimit, iterationLimit, allowYielding, progressCallback, progressData);
      allAttempts.push(result);
      
      if (result.completed) {
        completedRuns.push(result.path);
        successfulRuns++;
      } else {
        failedRuns.push(result);
      }
      
      // For extended/unlimited phases, provide frequent async updates with DOM yielding
      const elapsedMs = performance.now() - startTime;
      const isExtendedOrUnlimited = totalTimeLimit > 2000 || totalTimeLimit === null;
      
      // Time-based yielding - yield if we haven't yielded recently
      const timeSinceLastYield = performance.now() - (this.lastYieldTime || startTime);
      const yieldInterval = totalTimeLimit === null ? 100 : 250; // 100ms for unlimited, 250ms for extended
      
      const shouldYield = isExtendedOrUnlimited && (
        timeSinceLastYield > yieldInterval || // Primary: Time-based yielding
        (successfulRuns > 0 && successfulRuns % 2 === 0) // Secondary: Every 2 successes
      );
      
      if (shouldYield) {
        console.log(`🔄 Yielding after ${timeSinceLastYield.toFixed(0)}ms - Successes: ${successfulRuns}/${numRuns}, Attempts: ${totalAttempts}`);
        
        // Update progress and yield to browser for DOM updates
        if (progressCallback) {
          progressCallback({
            successes: successfulRuns,
            target: numRuns,
            attempts: totalAttempts,
            elapsedMs: previousTimeMs + elapsedMs // Include time from previous phases
          });
        }
        
        // Track yield time for more reliable time-based yielding
        this.lastYieldTime = performance.now();
        
        // Yield to browser for DOM updates - this is the key!
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      // Console logging for large runs
      if (numRuns >= 50 && (successfulRuns % 10 === 0 || successfulRuns === numRuns)) {
        const elapsedSec = elapsedMs / 1000;
        console.log(`Progress: ${successfulRuns}/${numRuns} successes in ${totalAttempts} attempts (${elapsedSec.toFixed(1)}s)`);
      }
      
      // Track timing for difficulty metrics (informational only)
      if (result.timeMs > 10000) { // Log runs taking >10 seconds for interest
        console.log(`📊 Long run completed: ${result.timeMs.toFixed(0)}ms (${result.iterations.toLocaleString()} steps) - challenging parameters!`);
      }
    }
    
    this.isRunning = false;
    const totalTimeMs = previousTimeMs + (performance.now() - startTime);
    const parameterEfficiency = totalAttempts > 0 ? (successfulRuns / totalAttempts) * 100 : 0;
    const reachedDesiredCount = successfulRuns === numRuns;
    const hitTimeLimit = totalTimeLimit && totalTimeMs >= totalTimeLimit;
    const wasStopped = this.shouldStop;
    
    console.log(`Simulation ${wasStopped ? 'stopped' : 'complete'}: ${successfulRuns}/${numRuns} successes in ${totalAttempts} attempts (${parameterEfficiency.toFixed(1)}% efficiency, ${(totalTimeMs/1000).toFixed(1)}s)`);
    
    return {
      // Core results
      completedRuns,
      allAttempts,
      failedRuns,
      
      // Statistics
      desiredSuccesses: numRuns,
      actualSuccesses: successfulRuns,
      totalAttempts,
      actualCompletionRate: parameterEfficiency, // Keep old name for compatibility
      parameterEfficiency,
      totalTimeMs,
      totalSimulationTimeMs: totalTimeMs, // Actual simulation time for pause tracking
      
      // Status flags
      reachedDesiredCount,
      hitTimeLimit,
      wasStopped,
      hasAnyData: successfulRuns > 0,
      
      // Timeout information
      timeoutPhase: totalTimeLimit === 2000 ? 'initial' : 
                   totalTimeLimit === 10000 ? 'extended' : 'unlimited',
      
      // For compatibility with existing visualization code
      allPaths: completedRuns,
      completionRate: parameterEfficiency,
      totalCompleted: successfulRuns,
      totalIncomplete: failedRuns.length,
      
      // Performance metrics
      averageIterations: allAttempts.length > 0 ? 
        allAttempts.reduce((sum, run) => sum + run.iterations, 0) / allAttempts.length : 0,
      averageSuccessfulIterations: completedRuns.length > 0 ?
        completedRuns.reduce((sum, run) => sum + run.length, 0) / completedRuns.length : 0,
      averageRunTime: allAttempts.length > 0 ?
        allAttempts.reduce((sum, run) => sum + run.timeMs, 0) / allAttempts.length : 0,
    };
  }
}