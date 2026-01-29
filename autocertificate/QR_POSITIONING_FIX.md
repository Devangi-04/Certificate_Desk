# QR Code Positioning Fix

## Problem
QR codes were not visible and could not be positioned on the template because:
1. No visual preview element existed
2. Canvas click handler only supported text positioning
3. QR positioning controls were not properly connected

## Solution Implemented

### 1. Added QR Preview Element
**Location**: `public/index.html`
```html
<div class="qr-preview" id="qr-preview" style="display: none;">QR</div>
```

### 2. Updated Canvas Click Handler
**Location**: `public/app.js` - `handleCanvasClick()`

**New Logic**:
```javascript
// Check if QR mode is enabled
if (qrData.enabled) {
  // Position QR code
  qrData.x = xCss / displayedWidth;
  qrData.y = yCss / displayedHeight;
  updateQrPosition(qrData.x, qrData.y);
  updateQrPreview();
} else {
  // Position text (existing functionality)
  // ... existing text positioning code
}
```

### 3. Added QR Preview Function
**Location**: `public/app.js` - `updateQrPreview()`

**Features**:
- Visual blue dashed border
- Semi-transparent background
- "QR" text in center
- Resizable based on QR size setting
- Positioned exactly where QR will appear on certificate

### 4. Enhanced QR Controls
**Updated Functions**:
- `updateQrControls()` - Shows/hides QR preview
- Event listeners update preview in real-time
- Size changes immediately reflected in preview

## How to Use QR Positioning

### Step 1: Enable QR Code
1. Open template placement modal
2. Check "Enable QR Code on Certificate"
3. QR positioning controls appear

### Step 2: Position QR Code
1. **Click directly on the template** where you want the QR code
2. Blue dashed preview box appears at click position
3. Position badge shows X/Y percentages
4. Adjust QR size if needed (40-200 pixels)

### Step 3: Save Placement
1. Click "Save Placement"
2. QR positioning data saved to template
3. Future certificates will have QR codes at this position

## Visual Feedback

### QR Preview Appearance:
- **Border**: Blue dashed line
- **Background**: Light blue semi-transparent
- **Text**: "QR" in blue, centered
- **Size**: Matches selected QR size
- **Position**: Exact placement where QR will be embedded

### Position Badge:
- Shows: `X 85% · Y 15%` format
- Updates in real-time as you click
- Shows "Not positioned" when disabled

## Technical Details

### QR Data Structure:
```javascript
let qrData = { 
  enabled: false,    // QR code enabled/disabled
  x: 0.85,         // X position (0-1 ratio)
  y: 0.15,         // Y position (0-1 ratio)  
  size: 80         // QR size in pixels
};
```

### Click Behavior:
- **QR Mode ON**: Click positions QR code
- **QR Mode OFF**: Click positions text (existing behavior)
- **Real-time preview**: Immediate visual feedback

### Event Listeners:
- Checkbox toggle: Shows/hides QR preview
- Size input: Updates preview size
- Canvas click: Positions QR or text based on mode

## Troubleshooting

### QR Preview Not Showing:
1. Ensure "Enable QR Code" checkbox is checked
2. Check that QR positioning controls are visible
3. Verify template image is loaded

### QR Not Positioning:
1. Make sure you're in QR mode (checkbox checked)
2. Click directly on the template image
3. Check console for "QR POSITION CAPTURED" message

### Preview Size Wrong:
1. Adjust QR size input (40-200 pixels)
2. Preview updates automatically
3. Size affects final QR code in PDF

## Result

✅ **QR codes are now fully positionable**
- Visual preview shows exactly where QR will appear
- Click-to-position functionality working
- Real-time size and position updates
- Seamless integration with existing text positioning

The QR positioning system now provides the same intuitive click-and-place experience as text positioning, with clear visual feedback and real-time updates.
