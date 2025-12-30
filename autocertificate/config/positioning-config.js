/**
 * Flexible positioning configuration for certificate generation
 * This allows easy adjustment of name placement without code changes
 */

module.exports = {
  // Method 1: Percentage-based positioning (recommended)
  percentage: {
    enabled: true,
    namePosition: {
      xPercent: 0.5,    // 50% from left edge
      yPercent: 0.4,    // 40% from bottom edge
      align: 'center'   // 'left', 'center', or 'right'
    },
    fontSize: 36,
    adjustments: {
      // Fine-tune positioning if needed
      xOffset: 0,       // Additional X offset
      yOffset: 0        // Additional Y offset
    }
  },

  // Method 2: Fixed coordinate positioning
  fixed: {
    enabled: false,
    namePosition: {
      x: 300,           // Fixed X coordinate
      y: 200,           // Fixed Y coordinate
      align: 'center'   // 'left', 'center', or 'right'
    },
    fontSize: 36
  },

  // Method 3: Template-specific positioning
  templateSpecific: {
    enabled: false,
    // Use template ID as key for specific positioning
    1: { xPercent: 0.5, yPercent: 0.45, align: 'center' },
    2: { xPercent: 0.3, yPercent: 0.5, align: 'left' },
    3: { xPercent: 0.7, yPercent: 0.35, align: 'right' }
  },

  // Method 4: Smart positioning based on text length
  smart: {
    enabled: false,
    basePosition: {
      xPercent: 0.5,
      yPercent: 0.4,
      align: 'center'
    },
    adjustments: {
      longName: {      // Names > 20 characters
        xPercent: 0.4,
        align: 'left'
      },
      shortName: {     // Names < 8 characters
        xPercent: 0.5,
        align: 'center'
      }
    }
  },

  // Debug settings
  debug: {
    enabled: true,
    logPositioning: true,
    showCalculations: true
  },

  // Default fallback settings
  fallback: {
    xPercent: 0.5,
    yPercent: 0.4,
    align: 'center',
    fontSize: 36
  }
};
