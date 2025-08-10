/**
 * Robust progress indicator for simulation phases
 */
export class ProgressIndicator {
  constructor() {
    this.elements = {
      indicator: document.getElementById('progressIndicator'),
      text: document.getElementById('progressText'),
      bar: document.getElementById('progressBar'),
      details: document.getElementById('progressDetails'),
      button: document.getElementById('runButton'),
      stopButton: document.getElementById('stopButton')
    };
    
    this.isVisible = false;
    this.currentPhase = 'initial';
  }

  /**
   * Show progress indicator for extended/unlimited phases
   * @param {string} phase - 'extended' or 'unlimited'
   * @param {Object} initialData - Initial progress data
   */
  show(phase, initialData = {}) {
    if (phase === 'initial') {
      this.hide();
      return;
    }

    console.log(`🔍 Showing progress indicator for ${phase} phase`);
    
    this.currentPhase = phase;
    this.isVisible = true;
    
    // Show the progress indicator
    this.elements.indicator.style.display = 'block';
    
    // Update colors based on phase
    const colors = {
      extended: {
        bg: '#fff3cd',
        border: '#ff9800',
        bar: 'linear-gradient(90deg, #ff9800, #f57c00)',
        text: '#856404'
      },
      unlimited: {
        bg: '#ffebee',
        border: '#d32f2f',
        bar: 'linear-gradient(90deg, #d32f2f, #c62828)',
        text: '#c62828'
      }
    };
    
    const color = colors[phase];
    this.elements.indicator.style.background = color.bg;
    this.elements.indicator.style.borderColor = color.border;
    this.elements.indicator.style.color = color.text;
    this.elements.bar.style.background = color.bar;
    
    // Update button state
    if (this.elements.button) {
      this.elements.button.disabled = true;
      this.elements.button.style.background = color.bar;
      this.elements.button.style.opacity = '0.7';
    }
    
    // Show stop button for unlimited phase
    if (this.elements.stopButton) {
      this.elements.stopButton.style.display = phase === 'unlimited' ? 'inline-block' : 'none';
    }
    
    // Initial progress update
    this.update({
      successes: 0,
      target: 100,
      attempts: 0,
      elapsedMs: 0,
      ...initialData
    });
  }

  /**
   * Update progress indicator with current data
   * @param {Object} progress - Progress data
   * @param {number} progress.successes - Current successes
   * @param {number} progress.target - Target successes  
   * @param {number} progress.attempts - Total attempts
   * @param {number} progress.elapsedMs - Elapsed time in milliseconds
   */
  update(progress) {
    if (!this.isVisible || this.currentPhase === 'initial') {
      return;
    }

    const { successes, target, attempts, elapsedMs } = progress;
    const elapsedSec = (elapsedMs / 1000).toFixed(1);
    const progressPercent = target > 0 ? Math.min((successes / target) * 100, 100) : 0;
    
    // Update progress bar
    if (this.elements.bar) {
      this.elements.bar.style.width = `${progressPercent}%`;
    }
    
    // Update main text
    if (this.elements.text) {
      const phaseText = this.currentPhase === 'extended' 
        ? `Extended Phase (${elapsedSec}s / 10s)`
        : `Unlimited Phase (${elapsedSec}s elapsed)`;
      this.elements.text.textContent = `${phaseText} - ${successes}/${target} successes`;
    }
    
    // Update details
    if (this.elements.details) {
      const efficiency = attempts > 0 ? ((successes / attempts) * 100).toFixed(1) : '0.0';
      this.elements.details.textContent = `${attempts} total attempts • ${efficiency}% efficiency`;
    }
    
    console.log(`📊 Progress: ${successes}/${target} (${progressPercent.toFixed(1)}%) in ${elapsedSec}s`);
  }

  /**
   * Show completion message and then hide
   * @param {Object} results - Final simulation results
   */
  showCompletion(results) {
    if (!this.isVisible) return;
    
    const { actualSuccesses, desiredSuccesses, totalTimeMs, reachedDesiredCount } = results;
    const elapsedSec = (totalTimeMs / 1000).toFixed(1);
    
    // Update to completion state
    if (this.elements.text) {
      const statusText = reachedDesiredCount 
        ? `✅ Completed! ${actualSuccesses}/${desiredSuccesses} successes` 
        : `⏱ Timeout: ${actualSuccesses}/${desiredSuccesses} successes`;
      this.elements.text.textContent = `${statusText} (${elapsedSec}s)`;
    }
    
    if (this.elements.bar) {
      this.elements.bar.style.width = '100%';
      this.elements.bar.style.background = reachedDesiredCount 
        ? 'linear-gradient(90deg, #4caf50, #2e7d32)'
        : 'linear-gradient(90deg, #ff9800, #f57c00)';
    }
    
    if (this.elements.details) {
      this.elements.details.textContent = reachedDesiredCount 
        ? 'All desired successes achieved!' 
        : 'Click button to continue or adjust parameters';
    }
    
    // Auto-hide after 3 seconds if completed successfully
    if (reachedDesiredCount) {
      setTimeout(() => {
        this.hide();
      }, 3000);
    }
  }

  /**
   * Hide progress indicator and restore button
   */
  hide() {
    console.log('🔍 Hiding progress indicator');
    
    this.isVisible = false;
    this.currentPhase = 'initial';
    
    if (this.elements.indicator) {
      this.elements.indicator.style.display = 'none';
    }
    
    // Restore button
    if (this.elements.button) {
      this.elements.button.disabled = false;
      this.elements.button.style.background = '';
      this.elements.button.style.opacity = '';
      this.elements.button.textContent = 'Run Simulation';
    }
    
    // Hide and reset stop button
    if (this.elements.stopButton) {
      this.elements.stopButton.style.display = 'none';
      this.elements.stopButton.textContent = 'Stop Simulation';
      this.elements.stopButton.style.background = '#dc2626';
    }
  }

  /**
   * Check if progress indicator is currently visible
   * @returns {boolean} Whether indicator is visible
   */
  isShowing() {
    return this.isVisible;
  }
}