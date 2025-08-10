/**
 * Manages preset configurations for the simulation
 */
export class PresetManager {
  constructor() {
    this.presets = {
      'classic-easy': {
        name: 'Classic Easy',
        initialProb: 0.6,
        decayFactor: 0.95,
        description: 'Easier starting probability with traditional decay - good for quick results'
      },
      'classic-hard': {
        name: 'Classic Hard',
        initialProb: 0.5,
        decayFactor: 0.95,
        description: 'Traditional diminishing returns - shows why reaching high values with decay is challenging'
      },
      'balanced': {
        name: 'Balanced',
        initialProb: 0.7,
        decayFactor: 0.98,
        description: 'Reasonable difficulty curve - good for seeing typical probability patterns'
      },
      'accelerating': {
        name: 'Slow Start, Accelerating',
        initialProb: 0.3,
        decayFactor: 1.05,
        description: 'Initially challenging, becomes easier - demonstrates momentum effects'
      },
      'fast-decay': {
        name: 'Fast Start, Decaying',
        initialProb: 0.9,
        decayFactor: 0.90,
        description: 'Strong start but rapid difficulty increase'
      },
      'extreme-acceleration': {
        name: 'Extreme Acceleration',
        initialProb: 0.1,
        decayFactor: 1.15,
        description: 'Nearly impossible start, exponential improvement - shows dramatic phase transitions'
      }
    };
  }

  /**
   * Get preset configuration by key
   * @param {string} key - Preset key
   * @returns {Object|null} Preset configuration or null if not found
   */
  getPreset(key) {
    return this.presets[key] || null;
  }

  /**
   * Get all available presets
   * @returns {Object} All presets
   */
  getAllPresets() {
    return { ...this.presets };
  }

  /**
   * Get preset keys
   * @returns {Array<string>} Array of preset keys
   */
  getPresetKeys() {
    return Object.keys(this.presets);
  }

  /**
   * Add or update a preset
   * @param {string} key - Preset key
   * @param {Object} preset - Preset configuration
   */
  setPreset(key, preset) {
    this.presets[key] = { ...preset };
  }

  /**
   * Remove a preset
   * @param {string} key - Preset key to remove
   * @returns {boolean} True if preset was removed, false if it didn't exist
   */
  removePreset(key) {
    if (this.presets[key]) {
      delete this.presets[key];
      return true;
    }
    return false;
  }

  /**
   * Generate preset buttons HTML
   * @returns {string} HTML string for preset buttons
   */
  generatePresetButtonsHTML() {
    return Object.entries(this.presets)
      .map(([key, preset]) => 
        `<button class="preset-btn" data-preset="${key}" title="${preset.description}">
          ${preset.name}
        </button>`
      ).join('');
  }
}