/**
 * Main application class that orchestrates all components
 */
import { SimulationEngine } from './modules/SimulationEngine.js';
import { VisualizationEngine } from './modules/VisualizationEngine.js';
import { StatisticsCalculator } from './modules/StatisticsCalculator.js';
import { UIController } from './modules/UIController.js';
import { PresetManager } from './utils/PresetManager.js';
import { EventBus } from './utils/EventBus.js';
import { ProgressIndicator } from './utils/ProgressIndicator.js';

export class ProbabilityVisualizer {
  constructor() {
    this.eventBus = new EventBus();
    this.initializeComponents();
    this.setupEventListeners();
    this.currentData = {
      runs: [],
      stats: null,
      maxValue: 20
    };
    this.previousResults = null; // Store results for continuation
    this.isStopped = false; // Track if simulation was stopped by user
    this.pauseStartTime = null; // Track when simulation was paused
    this.totalPausedTime = 0; // Cumulative time spent paused
  }

  initializeComponents() {
    // Get canvas element
    const canvas = document.getElementById("canvas");
    if (!canvas) {
      throw new Error("Canvas element not found");
    }

    // Initialize all components
    this.simulationEngine = new SimulationEngine();
    this.visualizationEngine = new VisualizationEngine(canvas);
    this.statisticsCalculator = new StatisticsCalculator();
    this.uiController = new UIController();
    this.presetManager = new PresetManager();
    this.progressIndicator = new ProgressIndicator();

    console.log("All components initialized successfully");
  }

  setupEventListeners() {
    // Listen for UI events
    this.eventBus.on('simulation:start', (params) => {
      this.runSimulation(params);
    });

    this.eventBus.on('visualization:update', (settings) => {
      this.updateVisualization(settings);
    });

    this.eventBus.on('preset:apply', (presetKey) => {
      this.applyPreset(presetKey);
    });

    // Setup visualization change listeners
    const visualizationSelect = document.getElementById("visualization");
    const colorScalingSelect = document.getElementById("colorScaling");

    if (visualizationSelect) {
      visualizationSelect.addEventListener("change", () => {
        this.redrawVisualization();
      });
    }

    if (colorScalingSelect) {
      colorScalingSelect.addEventListener("change", () => {
        this.redrawVisualization();
      });
    }

    // Setup preset buttons
    this.setupPresetButtons();
    
    // Setup input field listeners to clear extended UI
    this.setupInputFieldListeners();
  }

  setupPresetButtons() {
    const presetContainer = document.querySelector('.preset-buttons');
    if (!presetContainer) return;

    // Clear existing buttons and add new ones
    presetContainer.innerHTML = '';
    
    Object.entries(this.presetManager.getAllPresets()).forEach(([key, preset]) => {
      const button = document.createElement('button');
      button.className = 'preset-btn';
      button.textContent = preset.name;
      button.title = preset.description;
      button.addEventListener('click', () => this.applyPreset(key));
      presetContainer.appendChild(button);
    });
  }

  setupInputFieldListeners() {
    // List of input field IDs that should clear extended UI when clicked
    const inputFields = ['numRuns', 'maxValue', 'initialProb', 'decayFactor'];
    
    inputFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        // Clear extended UI on focus (when user clicks in the field)
        field.addEventListener('focus', () => {
          console.log(`🎛️ Input field "${fieldId}" focused - clearing extended UI`);
          this.clearExtendedUI();
        });
      }
    });
  }

  clearExtendedUI() {
    // Clear extended run UI state
    this.progressIndicator.hide();
    this.uiController.setButtonLoadingState(false);
    this.uiController.setTimeoutPhase('initial');
    this.previousResults = null; // Clear continuation data
    
    // Clear any warning messages
    const existingWarning = document.getElementById('warning-banner');
    if (existingWarning) {
      existingWarning.remove();
    }
  }

  /**
   * Apply a preset configuration
   */
  applyPreset(presetKey) {
    const preset = this.presetManager.getPreset(presetKey);
    if (!preset) {
      console.error(`Preset '${presetKey}' not found`);
      return;
    }

    console.log(`📝 Applying preset "${preset.name}":`, {
      initialProb: preset.initialProb,
      decayFactor: preset.decayFactor
    });
    
    // Clear any extended run UI when changing presets
    this.clearExtendedUI();
    
    this.uiController.setPreset(preset.initialProb, preset.decayFactor, preset.name);
    
    // Don't auto-run - let user click "Run Simulation" when ready
    console.log(`✅ Preset "${preset.name}" applied. Click "Run Simulation" to start.`);
  }

  /**
   * Run the simulation with current or provided parameters
   */
  async runSimulation(providedParams = null) {
    try {
      // Get parameters from UI or use provided ones
      const validation = this.uiController.validateParameters();
      if (!validation.isValid) {
        validation.errors.forEach(error => this.uiController.showError(error));
        return;
      }

      const params = providedParams || validation.params;
      const currentPhase = this.uiController.getTimeoutPhase();
      
      // Reset pause tracking for fresh simulations (not continuations)
      if (!this.isStopped && currentPhase === 'initial') {
        this.totalPausedTime = 0;
        this.pauseStartTime = null;
      }
      
      // Set loading state and show progress for extended phases
      this.uiController.setButtonLoadingState(true);
      this.currentData.maxValue = params.maxValue;

      console.log(`🚀 Starting ${currentPhase} phase simulation:`, {
        initialProb: params.initialProb,
        decayFactor: params.decayFactor, 
        maxValue: params.maxValue,
        numRuns: params.numRuns
      });

      // Determine time limits based on current phase
      let totalTimeLimit, singleRunTimeLimit;
      switch (currentPhase) {
        case 'initial':
          totalTimeLimit = 2000; // 2 seconds total
          singleRunTimeLimit = 500; // 0.5 seconds per individual run
          break;
        case 'extended':
          totalTimeLimit = 10000; // 10 seconds total
          singleRunTimeLimit = 2000; // 2 seconds per individual run
          this.progressIndicator.show('extended', { target: params.numRuns });
          break;
        case 'unlimited':
          totalTimeLimit = null; // No time limit
          singleRunTimeLimit = 30000; // But still cap individual runs at 30s
          this.progressIndicator.show('unlimited', { target: params.numRuns });
          break;
      }

      // Enhanced parameters with time limits and robust progress callback
      const enhancedParams = { 
        ...params, 
        totalTimeLimit,
        singleRunTimeLimit,
        progressCallback: (progress) => {
          // Only update progress if not stopped/paused
          if (!this.isStopped) {
            // Adjust elapsed time to exclude paused time
            if (this.pauseStartTime) {
              const pausedDuration = performance.now() - this.pauseStartTime;
              this.totalPausedTime += pausedDuration;
              this.pauseStartTime = null; // Reset after accounting for pause
            }
            
            // Update progress with adjusted time
            const adjustedProgress = {
              ...progress,
              elapsedMs: progress.elapsedMs - this.totalPausedTime
            };
            
            this.progressIndicator.update(adjustedProgress);
          }
        },
        // Pass existing results if continuing from previous phase
        existingResults: (currentPhase !== 'initial') ? this.previousResults : null
      };
      
      // Debug logging for data continuation
      if (currentPhase !== 'initial' && this.previousResults) {
        console.log(`🔄 Continuing ${currentPhase} phase with existing data:`, {
          previousSuccesses: this.previousResults.actualSuccesses,
          previousAttempts: this.previousResults.totalAttempts,
          previousTime: (this.previousResults.totalTimeMs / 1000).toFixed(1) + 's'
        });
      }

      // Run simulation asynchronously with proper DOM yielding
      const results = await this.simulationEngine.runMultipleSimulations(enhancedParams);
      
      console.log('✅ Simulation complete:', {
        phase: results.timeoutPhase,
        desiredSuccesses: results.desiredSuccesses,
        actualSuccesses: results.actualSuccesses,
        totalAttempts: results.totalAttempts,
        reachedTarget: results.reachedDesiredCount,
        hitTimeLimit: results.hitTimeLimit,
        timeElapsed: (results.totalTimeMs / 1000).toFixed(1) + 's',
        efficiency: results.actualCompletionRate.toFixed(1) + '%'
      });

      // Show completion state in progress indicator
      if (this.progressIndicator.isShowing()) {
        this.progressIndicator.showCompletion(results);
      }

      // Store results for potential continuation
      this.previousResults = results;
      
      // Handle timeout progression
      this._handleTimeoutProgression(results, params);

      // Store results - use allPaths for visualization
      this.currentData.runs = results.allPaths;
      
      // Calculate and display statistics
      this.currentData.stats = this.statisticsCalculator.calculateStats(results, params.maxValue);

      const statsElement = document.getElementById("stats");
      if (statsElement) {
        this.statisticsCalculator.displayStats(this.currentData.stats, statsElement);
      }

      // Draw visualization
      const settings = this.uiController.getVisualizationSettings();
      
      if (results.hasAnyData) {
        this.visualizationEngine.drawVisualization(
          this.currentData.runs,
          settings.visualizationType,
          settings.colorScaling,
          this.currentData.maxValue
        );
      } else {
        this.visualizationEngine.showNoDataMessage(
          `No successes achieved in ${(results.totalTimeMs/1000).toFixed(1)} seconds.\nTry adjusting parameters or continuing with extended time limit.`
        );
      }

      // Emit completion event
      this.eventBus.emit('simulation:complete', {
        results,
        params,
        stats: this.currentData.stats
      });

    } catch (error) {
      console.error('❌ Simulation error:', error);
      this.uiController.showError(`Simulation failed: ${error.message}`);
      this.visualizationEngine.showNoDataMessage();
      this.progressIndicator.hide();
      this.uiController.setButtonLoadingState(false);
    }
  }

  /**
   * Redraw visualization with current data and new settings
   */
  redrawVisualization() {
    if (!this.currentData.runs || this.currentData.runs.length === 0) {
      this.visualizationEngine.showNoDataMessage();
      return;
    }

    const settings = this.uiController.getVisualizationSettings();
    this.visualizationEngine.drawVisualization(
      this.currentData.runs,
      settings.visualizationType,
      settings.colorScaling,
      this.currentData.maxValue
    );
  }

  /**
   * Update visualization with new settings
   */
  updateVisualization(settings) {
    this.redrawVisualization();
  }

  /**
   * Handle timeout progression and UI state changes
   * @private
   */
  _handleTimeoutProgression(results, params) {
    const currentPhase = this.uiController.getTimeoutPhase();
    
    if (results.reachedDesiredCount) {
      // Success! Show completion state, then reset to initial
      if (currentPhase === 'extended' || currentPhase === 'unlimited') {
        this.uiController.showCompletionState(results);
      } else {
        this.uiController.setTimeoutPhase('initial');
      }
      this._provideFeedback(results, params);
      
    } else if (results.hitTimeLimit) {
      // Hit time limit - progress to next phase
      
      if (currentPhase === 'initial') {
        // Move to extended phase
        this.uiController.setTimeoutPhase('extended', results);
        this.uiController.showWarning(
          `⏱ Hit 2-second limit with ${results.actualSuccesses}/${results.desiredSuccesses} successes. ` +
          `Click the yellow button to continue with 10-second limit.`
        );
        
      } else if (currentPhase === 'extended') {
        // Move to unlimited phase  
        this.uiController.setTimeoutPhase('unlimited', results);
        this.uiController.showWarning(
          `⏱ Hit 10-second limit with ${results.actualSuccesses}/${results.desiredSuccesses} successes. ` +
          `Click the red button to continue without time limits (may freeze browser).`
        );
        
      } else {
        // Unlimited phase hit some kind of limit (unexpected)
        this.uiController.showCompletionState(results);
        this._provideFeedback(results, params);
      }
      
    } else {
      // Stopped or completed without hitting time limit
      if (currentPhase === 'extended' || currentPhase === 'unlimited') {
        this.uiController.showCompletionState(results);
      } else {
        this.uiController.setTimeoutPhase('initial');
      }
      this._provideFeedback(results, params);
    }
  }

  /**
   * Provide intelligent feedback based on simulation results
   * @private
   */
  _provideFeedback(results, params) {
    const { initialProb, decayFactor, maxValue, numRuns } = params;
    
    if (!results.hasAnyData) {
      let suggestions = [];
      
      // Analyze parameters and suggest specific improvements
      if (decayFactor < 0.9) {
        suggestions.push(`increase decay factor (${decayFactor} → 0.95+)`);
      }
      if (initialProb < 0.5) {
        suggestions.push(`increase initial probability (${initialProb} → 0.6+)`);
      }
      if (maxValue > 25) {
        suggestions.push(`lower target value (${maxValue} → 20)`);
      }
      
      const suggestionText = suggestions.length > 0 
        ? ` Try: ${suggestions.join(', ')}.`
        : ` Parameters may be too challenging.`;
        
      this.uiController.showWarning(
        `⚠️ Got 0 successes in ${results.totalAttempts} attempts!${suggestionText}`
      );
      
    } else if (results.hitAttemptLimit && !results.reachedDesiredCount) {
      const efficiency = ((results.actualSuccesses / results.totalAttempts) * 100).toFixed(1);
      this.uiController.showWarning(
        `⏱ Hit attempt limit: got ${results.actualSuccesses}/${numRuns} successes ` +
        `in ${results.totalAttempts} attempts (${efficiency}% efficiency). ` +
        `Consider easier parameters for full visualization.`
      );
      
    } else if (results.actualCompletionRate > 80) {
      // Very high efficiency - suggest making it more challenging
      let challenges = [];
      if (decayFactor > 1.0) {
        challenges.push(`lower decay factor (${decayFactor} → 0.98)`);
      }
      if (initialProb > 0.7) {
        challenges.push(`lower initial probability (${initialProb} → 0.5)`);
      }
      if (maxValue < 25) {
        challenges.push(`increase target (${maxValue} → 30+)`);
      }
      
      if (challenges.length > 0) {
        this.uiController.showWarning(
          `💡 High efficiency (${results.actualCompletionRate.toFixed(1)}%) - ` +
          `for more interesting patterns, try: ${challenges.join(', ')}.`
        );
      }
      
    } else if (results.reachedDesiredCount && results.actualCompletionRate < 50) {
      // Good challenging parameters
      console.log(
        `✅ Good parameters: ${results.actualCompletionRate.toFixed(1)}% efficiency ` +
        `(${results.actualSuccesses} successes in ${results.totalAttempts} attempts)`
      );
    }
  }

  /**
   * Initialize the application
   */
  init() {
    try {
      // Update initial formula display
      this.uiController.updateFormula();
      
      // Run initial simulation with a slight delay to ensure DOM is ready
      setTimeout(() => {
        try {
          this.runSimulation();
        } catch (error) {
          console.error("Initial simulation failed:", error);
          this.visualizationEngine.showNoDataMessage();
        }
      }, 100);
      
      console.log("Probability Visualizer initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Probability Visualizer:", error);
      this.uiController.showError(`Initialization failed: ${error.message}`);
    }
  }

  /**
   * Handle stop/continue button functionality
   */
  handleStopContinue() {
    const stopButton = document.getElementById('stopButton');
    
    if (stopButton.textContent === 'Stop Simulation') {
      // Stop the simulation
      this.simulationEngine.stop();
      this.isStopped = true;
      this.pauseStartTime = performance.now(); // Mark when pause started
      
      // Change button to continue
      stopButton.textContent = 'Continue Simulation';
      stopButton.style.background = '#22c55e'; // Green
      
      console.log('⏸️ Simulation paused - timer will freeze');
      
    } else if (stopButton.textContent === 'Continue Simulation') {
      // Continue the simulation
      if (this.pauseStartTime) {
        // Add the paused time to total
        this.totalPausedTime += performance.now() - this.pauseStartTime;
        this.pauseStartTime = null;
      }
      
      this.isStopped = false;
      
      // Change button back to stop
      stopButton.textContent = 'Stop Simulation';
      stopButton.style.background = '#dc2626'; // Red
      
      console.log('▶️ Simulation resumed - timer will resume');
      
      // Continue simulation from where we left off
      this.runSimulation();
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.eventBus.removeAllListeners();
    console.log("Probability Visualizer destroyed");
  }
}

// Global functions for backward compatibility (called from HTML)
window.setPreset = function(initial, decay, name) {
  if (window.app) {
    console.log(`Setting preset: ${name} (${initial}, ${decay})`);
    window.app.uiController.setPreset(initial, decay, name);
    // Reset progress and run simulation
    window.app.progressIndicator.hide();
    window.app.runSimulation().catch(error => {
      console.error('Error in preset simulation:', error);
    });
  }
};

window.runSimulation = function() {
  if (window.app) {
    window.app.runSimulation().catch(error => {
      console.error('Error in manual simulation:', error);
    });
  }
};

window.redrawVisualization = function() {
  if (window.app) {
    window.app.redrawVisualization();
  }
};