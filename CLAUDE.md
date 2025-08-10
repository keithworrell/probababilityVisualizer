# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **modular probability visualization tool** that simulates probabilistic counters reaching target values. The project has been refactored from a single-file application to a modern, modular ES6+ architecture with complete separation of concerns.

## Architecture

**Modular ES6+ Structure:**
```
src/
├── index.html              # Main application entry point
├── css/
│   └── styles.css          # All styling separated from HTML
├── js/
│   ├── ProbabilityVisualizer.js    # Main application orchestrator
│   ├── modules/                    # Core business logic modules
│   │   ├── SimulationEngine.js     # Probabilistic simulation logic
│   │   ├── VisualizationEngine.js  # Canvas rendering and heatmap generation
│   │   ├── StatisticsCalculator.js # Statistical analysis and display
│   │   └── UIController.js         # User interface state management
│   └── utils/                      # Utility classes
│       ├── EventBus.js            # Decoupled component communication
│       └── PresetManager.js       # Configuration preset management
```

**Root-Level Files:**
- `index.html`: Convenience wrapper that references `src/index.html`
- `README.md`: Comprehensive documentation and educational content
- `.nojekyll`: GitHub Pages configuration

**Core Components:**

1. **SimulationEngine**: Pure business logic for probabilistic simulations
   - Handles single and batch simulation runs
   - Fixed the "0 total runs" issue by tracking both completed and incomplete runs
   - Provides completion statistics and warnings for difficult parameter combinations

2. **VisualizationEngine**: Canvas-based rendering system
   - Density heatmap generation with color/transparency encoding
   - Multiple visualization modes (heatmap, lines, combined, peak trajectory)
   - Color scaling algorithms (linear, sqrt, log, percentile)

3. **StatisticsCalculator**: Statistical analysis and UI display
   - Comprehensive run statistics including completion rates
   - Enhanced to show both completed/total runs to address the original issue

4. **UIController**: Form state and user interaction management
   - Input validation and parameter retrieval
   - Real-time formula updates
   - Error and warning display system

5. **Utilities**: Supporting infrastructure
   - EventBus for decoupled communication between components
   - PresetManager for configuration management

**Key Mathematical Model:**
```
P(increment) = Initial Probability × (Decay Factor)^counter_value
```

## Development Workflow

**ES6 Module System** - Requires HTTP server for CORS compliance:

1. **Local Development**: 
   - **HTTP Server Required**: Use `python -m http.server 8080` or any local server
   - Open `http://localhost:8080` in browser (cannot open file:// directly due to ES6 modules)
   
2. **Entry Points**:
   - **Root**: `index.html` (convenience wrapper)
   - **Source**: `src/index.html` (main application)

3. **GitHub Pages**: Automatically serves from root `index.html`

**Testing**: Manual testing through browser interaction - no automated test framework

## Key Bug Fixes

**Original "0 Total Runs" Issue Fixed:**
- **Problem**: Original code only displayed runs that successfully reached the target value
- **Solution**: Modified SimulationEngine to track all attempts and display completion statistics
- **Enhancement**: Added warning messages when parameter combinations prevent successful runs
- **UI Update**: Statistics now show "X completed / Y total" instead of hiding failed runs

## Key Implementation Details

**Performance Considerations:**
- Canvas rendering for smooth visualization of up to 5000 simulation runs
- Grid-based density calculation with binning for memory efficiency
- Real-time parameter updates without re-simulation for visualization settings
- Event-driven architecture with minimal coupling between components

**Visualization Features:**
- Dual-encoding heatmaps (color for vertical density, transparency for horizontal density)
- Four color scaling algorithms for different analysis needs
- Peak trajectory mode for cleaner visualization of maximum values
- Real-time visualization updates independent of simulation data

**Code Quality:**
- Complete separation of concerns across modules
- ES6+ features including classes, modules, and async/await
- Event bus for decoupled component communication
- Comprehensive error handling and user feedback
- Input validation and parameter bounds checking

## Development Commands

**Local Development:**
```bash
# Start local server (required for ES6 modules)
python -m http.server 8080

# Navigate to
http://localhost:8080
```

**No Build System**: This remains a client-side only application with no build steps, transpilation, or bundling required.

## Deployment

**GitHub Pages Ready**: The root `index.html` serves as a wrapper that properly loads the modular source files. No build step required for deployment.