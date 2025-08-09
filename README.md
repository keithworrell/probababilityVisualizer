# Probabilistic Counter Visualization

An interactive visualization tool for exploring probabilistic processes and understanding how different probability structures affect outcomes. Watch as hundreds of simulated "counters" race toward their target, revealing beautiful patterns in the underlying mathematics.

## 🎯 What It Does

This tool simulates a probabilistic counter that attempts to reach a target value. At each step, the counter has a probability of incrementing (moving up) or decrementing (moving down), with the probability determined by:

```
P(increment) = Initial Probability × (Decay Factor)^current_value
```

- **Decay Factor < 1.0**: Progress becomes harder as you climb (diminishing returns)
- **Decay Factor = 1.0**: Constant difficulty throughout
- **Decay Factor > 1.0**: Progress accelerates - success breeds success!

## 🚀 Features

### Simulation Parameters

- **Number of Runs**: Simulate 10-5000 parallel attempts
- **Target Value**: Set any goal from 5 to 100
- **Initial Probability**: Starting chance of success (0.01 to 1.0)
- **Decay Factor**: How probability changes with progress (0.5 to 1.5)

### Visualization Modes

1. **Density Heatmap**: Shows the full path density of all runs
2. **Individual Lines**: Displays actual trajectory paths with transparency
3. **Combined View**: Overlays lines on the heatmap
4. **Peak Trajectory**: Shows only maximum values reached per time window (cleaner visualization)

### Color Scaling Options

- **Linear**: Direct proportional mapping
- **Square Root**: Balanced visibility across density ranges
- **Logarithmic**: Emphasizes variations in low-density areas
- **Percentile**: Rank-based coloring independent of absolute values

### Visual Encoding

- **Color (Blue → Red)**: Represents vertical density - how many runs pass through each value
- **Transparency**: Represents horizontal density - time compression in each pixel
- **Result**: Hottest, most opaque areas show where paths converge and linger

## 📊 Understanding the Visualizations

### Reading the Heatmap

- **X-axis**: Time (iterations)
- **Y-axis**: Counter value (0 to target)
- **Color Intensity**: Number of runs at that position
- **Transparency**: Time density at that position

### What Patterns Reveal

- **Horizontal bands**: Common "resting states" where counters get stuck
- **Diagonal streams**: Successful progression paths
- **Dark convergence zones**: Bottlenecks in the probability landscape
- **Spread patterns**: How randomness affects different stages

## 🎮 Quick Start Examples

### Preset Configurations

1. **Classic Hard** (50%, 0.95 decay)

   - Traditional diminishing returns
   - Shows why reaching 20 with 0.95 decay is nearly impossible

2. **Balanced** (70%, 0.98 decay)

   - Reasonable difficulty curve
   - Good for seeing typical probability patterns

3. **Slow Start, Accelerating** (30%, 1.05 growth)

   - Initially challenging, becomes easier
   - Demonstrates momentum effects

4. **Extreme Acceleration** (10%, 1.15 growth)
   - Nearly impossible start, exponential improvement
   - Shows dramatic phase transitions

## 🔬 Educational Uses

### Probability & Statistics

- Visualize random walks with state-dependent probabilities
- Understand convergence and divergence in stochastic processes
- Explore the impact of initial conditions on outcomes

### Game Design

- Model progression systems and difficulty curves
- Understand player retention mechanics
- Design balanced risk/reward systems

### Business & Economics

- Model growth scenarios with changing success rates
- Visualize compound effects and tipping points
- Understand path-dependent outcomes

## 💡 Interesting Experiments

1. **Single Run Analysis**: Set runs=1 to see individual path behavior
2. **Phase Transitions**: Try decay=1.01 vs 0.99 to see dramatic differences
3. **Bottleneck Discovery**: Look for horizontal bands showing natural barriers
4. **Scaling Laws**: Compare target=10, 20, 40 to see how difficulty scales
5. **Extreme Parameters**: Try initial=0.01 with decay=1.3 for dramatic curves

## 🛠️ Technical Implementation

### Core Algorithm

```javascript
while (counter < target) {
  p = initialProb * Math.pow(decayFactor, counter);
  if (Math.random() < p) {
    counter++; // Win: move up
  } else {
    counter = Math.max(0, counter - 1); // Lose: move down (min 0)
  }
}
```

### Visualization Strategy

- Canvas-based rendering for performance
- Grid binning for density calculation
- Dual-density tracking (vertical and horizontal)
- Real-time parameter adjustment without re-simulation

## 📈 Insights from the Mathematics

The beauty of this system lies in how small parameter changes create dramatically different outcomes:

- **Critical Decay Values**: Around 0.97-0.98, the system transitions from "nearly impossible" to "achievable"
- **Acceleration Threshold**: Decay factors above 1.0 create positive feedback loops
- **Initial Probability Impact**: Low initial values can be overcome with high decay factors > 1.0
- **Time Complexity**: Expected completion time grows exponentially as decay factor decreases below 1.0

## 🎨 About the Design

The visualization uses a carefully crafted color gradient and transparency system to encode two dimensions of information simultaneously. This approach was specifically designed to handle the "collapse" problem when multiple time points map to single pixels, preserving information that would otherwise be lost.

## 📝 License

This educational tool is provided as-is for learning and experimentation with probabilistic systems.

---

_Created to explore the beautiful patterns hidden in probability and help build intuition for stochastic processes._
