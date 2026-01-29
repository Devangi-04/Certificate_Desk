# QR Codes on Certificates - Complete Implementation

## 🎯 **Answer: Yes, QR codes will be embedded directly on the certificates!**

QR codes are now automatically embedded directly into the certificate PDFs during generation, making them scannable from printed or digital certificates.

## How QR Codes Are Set on Certificates

### 1. **Automatic Embedding During PDF Generation**

**Location**: `src/services/certificateService.js` - `generateCertificates()` function

**Process**:
```javascript
// Generate QR code as data URL for embedding
const qrCodeDataURL = await generateQRCodeDataURL(certificateRecord.id, baseUrl);

// Embed QR code in PDF if template has positioning
if (template.qr_x_ratio !== null && template.qr_y_ratio !== null) {
  // Convert QR data URL to image bytes
  const qrBase64 = qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
  const qrImageBytes = Buffer.from(qrBase64, 'base64');
  
  // Embed QR code image in PDF
  const qrImage = await pdfDoc.embedPng(qrImageBytes);
  page.drawImage(qrImage, {
    x: qrX - qrImageDims.width / 2,
    y: pageHeight - qrY - qrImageDims.height / 2,
    width: qrImageDims.width,
    height: qrImageDims.height,
  });
}
```

### 2. **Template-Based Positioning System**

**Database Columns** (Migration: `003_add_qr_positioning.sql`):
```sql
qr_x_ratio NUMERIC(6,4) NULL    -- X position (0-1, from left)
qr_y_ratio NUMERIC(6,4) NULL    -- Y position (0-1, from top)  
qr_size INTEGER NULL DEFAULT 80 -- QR code size in pixels
```

### 3. **Visual Positioning Interface**

**Location**: Template Placement Modal in admin dashboard

**Features**:
- **Enable QR Code**: Checkbox to turn QR codes on/off for template
- **QR Size Control**: Slider/input for QR code dimensions (40-200px)
- **Click-to-Position**: Click on template to position QR code
- **Position Display**: Shows X/Y percentages for precise placement

## User Experience

### For Administrators:
1. **Upload Template** → Go to "Edit Placement"
2. **Enable QR Code** → Check "Enable QR Code on Certificate"
3. **Position QR Code** → Click on template where QR should appear
4. **Set Size** → Adjust QR code size (default 80px)
5. **Save Placement** → QR positioning saved to template
6. **Generate Certificates** → QR codes automatically embedded

### For Certificate Recipients:
1. **Receive Certificate** → PDF with embedded QR code
2. **Scan QR Code** → Opens verification page
3. **Verify Authenticity** → Instant certificate validation

## Technical Implementation

### QR Code Generation Flow:
```
Certificate Generation Request
    ↓
Generate Certificate PDF
    ↓
Generate QR Code Data URL
    ↓
Embed QR Code in PDF (if positioned)
    ↓
Save PDF with QR Code
    ↓
Generate Separate QR File (for API access)
    ↓
Update Database with QR Info
```

### QR Code Content:
Each QR code contains: `https://your-domain.com/verify.html?id={certificateId}`

### File Storage:
- **Embedded QR**: Directly in certificate PDF
- **Separate QR File**: `storage/qr-codes/qr-certificate-{id}-{timestamp}.png`
- **Database**: QR path and verification URL stored

## Configuration Options

### Template Settings:
- **QR Enabled**: Boolean flag to include/exclude QR codes
- **QR Position**: X/Y coordinates (0-1 ratio from top-left)
- **QR Size**: Pixel dimensions (40-200px range)

### Default Behavior:
- **Position**: Bottom-right (X: 85%, Y: 15%)
- **Size**: 80 pixels
- **Format**: PNG with black dots on white background

## API Endpoints

### QR Code Access:
- `GET /api/certificates/:id/qr` - Standalone QR code image
- `GET /api/certificates/:id/verify` - Verification with QR info

### Template Management:
- `PUT /api/templates/:id/placement` - Save QR positioning data

## Frontend Integration

### Placement Modal Controls:
```html
<!-- QR Code Position -->
<div class="qr-group">
  <span>QR Code Position</span>
  <div class="qr-controls">
    <label class="checkbox">
      <input type="checkbox" id="enable-qr" />
      <span>Enable QR Code on Certificate</span>
    </label>
    <div id="qr-position-controls">
      <label>
        <span>QR Size</span>
        <input type="number" id="qr-size" min="40" max="200" value="80" />
        <span>pixels</span>
      </label>
    </div>
  </div>
</div>
```

### JavaScript State Management:
```javascript
let qrData = { 
  enabled: false, 
  x: 0.85, 
  y: 0.15, 
  size: 80 
};
```

## Benefits

### 1. **Professional Appearance**
- QR codes add modern, tech-savvy element
- Clean integration with certificate design
- Customizable positioning and size

### 2. **Instant Verification**
- No need to type certificate IDs
- Mobile-friendly scanning
- Direct access to verification page

### 3. **Security**
- QR codes link to official verification
- Tamper-evident verification system
- Works with visibility management (hidden certificates still verifiable)

### 4. **Flexibility**
- Optional per template
- Customizable positioning
- Various size options

## Migration Requirements

Run these migrations in order:
1. `001_add_certificate_visibility.sql` - Visibility system
2. `002_add_qr_code_support.sql` - QR code storage
3. `003_add_qr_positioning.sql` - QR positioning data

## Example Usage

### 1. Enable QR Codes on Template:
```javascript
// Via admin interface or API
PUT /api/templates/123/placement
{
  "qr_x_ratio": 0.85,
  "qr_y_ratio": 0.15, 
  "qr_size": 80
}
```

### 2. Generate Certificate with QR:
```bash
POST /api/certificates/generate
{
  "templateId": 123,
  "participantIds": [1, 2, 3]
}
```

### 3. Result:
- Certificate PDFs with embedded QR codes
- Scannable verification links
- Professional, secure certificates

## Troubleshooting

### QR Code Not Appearing:
- Check template has QR positioning data
- Verify QR code is enabled in template settings
- Ensure certificate generation completed successfully

### QR Code Not Scanning:
- Verify QR code size is adequate (minimum 40px)
- Check QR code has good contrast in certificate design
- Ensure verification URL is accessible

### Position Issues:
- Use placement modal to fine-tune position
- Check X/Y ratios are between 0-1
- Verify QR size is appropriate for template

## Summary

**Yes, QR codes are now directly embedded on certificates!** 

The system provides:
- ✅ Automatic QR code embedding during PDF generation
- ✅ Visual positioning interface for administrators  
- ✅ Customizable QR code size and placement
- ✅ Seamless integration with existing certificate workflow
- ✅ Mobile-friendly verification system
- ✅ Professional appearance with security features

QR codes make certificates instantly verifiable while maintaining the clean separation between UI visibility and certificate validity that you requested.
