/**
 * UI Controller for managing user interactions and form state
 */
export class UIController {
  constructor() {
    this.elements = this._getUIElements();
    this._setupEventListeners();
    this.timeoutPhase = 'initial'; // initial, extended, unlimited
    this.originalButtonText = 'Run Simulation';
  }

  _getUIElements() {
    const elements = {
      // Input elements
      numRuns: document.getElementById("numRuns"),
      maxValue: document.getElementById("maxValue"),
      initialProb: document.getElementById("initialProb"),
      decayFactor: document.getElementById("decayFactor"),
      visualization: document.getElementById("visualization"),
      colorScaling: document.getElementById("colorScaling"),
      
      // Display elements
      formulaInitial: document.getElementById("formulaInitial"),
      formulaDecay: document.getElementById("formulaDecay"),
      stats: document.getElementById("stats"),
      
      // Button elements
      runButton: document.querySelector('button[onclick="runSimulation()"]')
    };
    
    // Debug: Check if button was found
    if (!elements.runButton) {
      console.error("Run button not found! Trying alternative selector...");
      elements.runButton = document.querySelector('button');
      console.log("Found alternative button:", elements.runButton);
    } else {
      console.log("Run button found successfully:", elements.runButton.textContent);
    }
    
    return elements;
  }

  _setupEventListeners() {
    // Real-time formula updates
    this.elements.initialProb.addEventListener("input", () => this.updateFormula());
    this.elements.decayFactor.addEventListener("input", () => this.updateFormula());
  }

  /**
   * Get current simulation parameters from the UI
   * @returns {Object} Parameters object
   */
  getSimulationParameters() {
    return {
      numRuns: parseInt(this.elements.numRuns.value),
      maxValue: parseInt(this.elements.maxValue.value),
      initialProb: parseFloat(this.elements.initialProb.value),
      decayFactor: parseFloat(this.elements.decayFactor.value),
    };
  }

  /**
   * Get current visualization settings from the UI
   * @returns {Object} Visualization settings
   */
  getVisualizationSettings() {
    return {
      visualizationType: this.elements.visualization.value,
      colorScaling: this.elements.colorScaling.value,
    };
  }

  /**
   * Update the formula display
   */
  updateFormula() {
    const params = this.getSimulationParameters();
    this.elements.formulaInitial.textContent = params.initialProb.toFixed(2);
    this.elements.formulaDecay.textContent = params.decayFactor.toFixed(2);
  }

  /**
   * Set preset values
   * @param {number} initial - Initial probability
   * @param {number} decay - Decay factor
   * @param {string} name - Preset name
   */
  setPreset(initial, decay, name) {
    this.elements.initialProb.value = initial;
    this.elements.decayFactor.value = decay;
    this.updateFormula();
  }

  /**
   * Set button loading state
   * @param {boolean} isLoading - Whether button is in loading state
   */
  setButtonLoadingState(isLoading) {
    if (isLoading) {
      this.elements.runButton.textContent = "Simulating...";
      this.elements.runButton.disabled = true;
      this.elements.runButton.style.backgroundColor = "";
      this.elements.runButton.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
    } else {
      this._resetButtonToCurrentPhase();
    }
  }

  /**
   * Set timeout phase and update button appearance
   * @param {string} phase - 'initial', 'extended', or 'unlimited'
   * @param {Object} results - Optional results from previous simulation
   */
  setTimeoutPhase(phase, results = null) {
    this.timeoutPhase = phase;
    
    if (results) {
      const partialInfo = results.actualSuccesses > 0 ? 
        ` (${results.actualSuccesses}/${results.desiredSuccesses} so far)` : '';
        
      switch (phase) {
        case 'extended':
          this.elements.runButton.textContent = `Continue for up to 10 seconds${partialInfo}`;
          this.elements.runButton.style.background = "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)";
          this.elements.runButton.style.color = "white";
          this.elements.runButton.disabled = false;
          this.elements.runButton.title = "Continue simulation with extended 10-second time limit";
          break;
          
        case 'unlimited':
          this.elements.runButton.textContent = `Run without safety limit (not recommended)${partialInfo}`;
          this.elements.runButton.style.background = "linear-gradient(135deg, #d32f2f 0%, #c62828 100%)";
          this.elements.runButton.style.color = "white";
          this.elements.runButton.disabled = false;
          this.elements.runButton.title = "Continue simulation without time limits - may freeze browser!";
          break;
          
        case 'initial':
        default:
          this._resetButtonToCurrentPhase();
          break;
      }
    } else {
      this._resetButtonToCurrentPhase();
    }
  }

  /**
   * Reset button to its normal appearance for current phase
   * @private
   */
  _resetButtonToCurrentPhase() {
    this.elements.runButton.textContent = this.originalButtonText;
    this.elements.runButton.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
    this.elements.runButton.style.color = "white";
    this.elements.runButton.disabled = false;
    this.elements.runButton.title = "Run simulation with 2-second initial time limit";
    this.timeoutPhase = 'initial';
  }

  /**
   * Get current timeout phase
   * @returns {string} Current timeout phase
   */
  getTimeoutPhase() {
    return this.timeoutPhase;
  }

  /**
   * Update button with live progress during extended/unlimited phases
   * @param {Object} progress - Progress information
   * @param {number} progress.successes - Current successful runs
   * @param {number} progress.target - Target successful runs
   * @param {number} progress.elapsedMs - Time elapsed in milliseconds
   * @param {string} phase - Current timeout phase
   */
  updateProgressIndicator(progress, phase) {
    console.log(`🔄 Progress Update: ${progress.successes}/${progress.target} in ${phase} phase (${(progress.elapsedMs/1000).toFixed(1)}s)`);
    
    if (phase === 'initial') {
      console.log("Skipping progress update for initial phase");
      return; // No progress indication needed for initial phase
    }

    if (!this.elements.runButton) {
      console.error("Run button not found during progress update!");
      return;
    }

    const elapsedSec = (progress.elapsedMs / 1000).toFixed(1);
    const progressText = `${progress.successes}/${progress.target}`;
    
    let newText = '';
    switch (phase) {
      case 'extended':
        newText = `Running... ${progressText} successes (${elapsedSec}s / 10s)`;
        this.elements.runButton.style.background = "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)";
        break;
        
      case 'unlimited':
        newText = `Running... ${progressText} successes (${elapsedSec}s elapsed)`;
        this.elements.runButton.style.background = "linear-gradient(135deg, #d32f2f 0%, #c62828 100%)";
        break;
    }
    
    console.log(`Setting button text to: "${newText}"`);
    this.elements.runButton.textContent = newText;
    this.elements.runButton.disabled = true; // Prevent multiple clicks
  }

  /**
   * Show completion state for extended/unlimited phases
   * @param {Object} results - Final simulation results
   */
  showCompletionState(results) {
    const elapsedSec = (results.totalTimeMs / 1000).toFixed(1);
    const resultText = results.reachedDesiredCount ? 
      `Completed! ${results.actualSuccesses}/${results.desiredSuccesses} in ${elapsedSec}s` :
      `Stopped: ${results.actualSuccesses}/${results.desiredSuccesses} in ${elapsedSec}s`;
    
    this.elements.runButton.textContent = resultText;
    this.elements.runButton.disabled = false;
    
    // Reset to normal appearance after a brief display
    setTimeout(() => {
      this._resetButtonToCurrentPhase();
    }, 2000);
  }

  /**
   * Validate input parameters
   * @returns {Object} Validation result with isValid flag and errors
   */
  validateParameters() {
    const params = this.getSimulationParameters();
    const errors = [];

    if (params.numRuns < 1 || params.numRuns > 5000) {
      errors.push("Number of runs must be between 1 and 5000");
    }

    if (params.maxValue < 1 || params.maxValue > 100) {
      errors.push("Target value must be between 1 and 100");
    }

    if (params.initialProb <= 0 || params.initialProb > 1) {
      errors.push("Initial probability must be between 0 and 1");
    }

    if (params.decayFactor <= 0 || params.decayFactor > 2) {
      errors.push("Decay factor must be between 0 and 2");
    }

    return {
      isValid: errors.length === 0,
      errors,
      params
    };
  }

  /**
   * Show error message to user
   * @param {string} message - Error message to display
   */
  showError(message) {
    // You could implement a toast notification or modal here
    alert(`Error: ${message}`);
  }

  /**
   * Show warning message to user
   * @param {string} message - Warning message to display
   */
  showWarning(message) {
    console.warn(`Warning: ${message}`);
    
    // Show as a temporary alert-style notification
    const existingWarning = document.getElementById('warning-banner');
    if (existingWarning) {
      existingWarning.remove();
    }
    
    const warningBanner = document.createElement('div');
    warningBanner.id = 'warning-banner';
    warningBanner.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #fff3cd;
      color: #856404;
      border: 1px solid #ffeaa7;
      border-radius: 8px;
      padding: 12px 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      max-width: 80%;
      font-size: 14px;
      text-align: center;
    `;
    warningBanner.innerHTML = `
      <div style="margin-bottom: 8px;">${message}</div>
      <button onclick="this.parentElement.remove()" style="
        background: #856404;
        color: white;
        border: none;
        padding: 4px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      ">Dismiss</button>
    `;
    
    document.body.appendChild(warningBanner);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
      if (warningBanner.parentNode) {
        warningBanner.remove();
      }
    }, 8000);
  }
}