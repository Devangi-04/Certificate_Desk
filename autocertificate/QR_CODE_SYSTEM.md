# QR Code System for Certificate Verification

This document describes the complete QR code implementation for certificate verification in your Certificate Desk system.

## Overview

The QR code system automatically generates unique QR codes for each certificate that link to a verification page. This allows anyone with a smartphone or device to scan the QR code and instantly verify the certificate's authenticity.

## Where QR Codes Are Set

### 1. **Automatic Generation During Certificate Creation**

**Location**: `src/services/certificateService.js` in the `generateCertificates()` function

**Process**:
- When certificates are generated, QR codes are automatically created
- Each certificate gets a unique QR code containing the verification URL
- QR codes are stored as PNG files in the `storage/qr-codes/` directory
- Database stores both the QR code path and verification URL

**Code Flow**:
```javascript
// After PDF generation
const { qrCodePath, verificationUrl } = await generateCertificateQRCode(record.id, baseUrl);
await updateCertificateWithQRCode(record.id, qrCodePath, verificationUrl);
```

### 2. **QR Code Service**

**Location**: `src/services/qrCodeService.js`

**Functions**:
- `generateCertificateQRCode()` - Creates QR code image and saves to storage
- `generateQRCodeDataURL()` - Creates QR code as data URL for PDF embedding
- `updateCertificateWithQRCode()` - Updates database with QR code info

### 3. **Database Storage**

**Table**: `certificates`
**New Columns**:
```sql
qr_code_path VARCHAR(500) NULL -- Path to QR code image file
verification_url VARCHAR(1000) NULL -- Full verification URL
```

## QR Code Content

Each QR code contains a URL in this format:
```
https://your-domain.com/verify.html?id={certificateId}
```

**Example**: `https://your-domain.com/verify.html?id=123`

## API Endpoints

### QR Code Access
- `GET /api/certificates/:id/qr` - Serve QR code image
- `GET /api/certificates/:id/verify` - Verify certificate (includes QR info)

### Certificate Management
- `POST /api/certificates/:id/hide` - Hide from dashboard (QR still works)
- `POST /api/certificates/:id/unhide` - Restore to dashboard
- `DELETE /api/certificates/:id/revoke` - Permanently revoke (QR stops working)

## Frontend Integration

### Certificate Table
The admin dashboard now includes:
- **QR Code Column**: Direct link to view/download QR code
- **Verification Column**: Direct link to verification page
- **Visibility Management**: Hide/unhide actions

### Verification Page
**Location**: `/verify.html`

**Features**:
- Manual certificate ID input
- URL parameter support: `/verify.html?id=123`
- Displays QR code image when certificate is valid
- Shows complete certificate details
- Mobile-responsive design

## User Experience

### 1. **Certificate Generation**
```
Admin uploads template → Adds participants → Generates certificates
↓
System automatically creates PDFs + QR codes for each certificate
↓
QR codes stored and verification URLs generated
```

### 2. **Certificate Distribution**
```
Certificates sent via email with download links
↓
Recipients can scan QR codes (if printed) or use verification links
↓
Anyone can verify certificate authenticity instantly
```

### 3. **Verification Process**
```
User scans QR code with phone → Opens verification page
↓
System checks certificate status (ignores visibility, respects soft delete)
↓
Shows certificate details and validity status
```

## File Structure

```
storage/
├── generated/          # Certificate PDFs
├── qr-codes/          # QR code images
│   ├── qr-certificate-123-1640995200000.png
│   ├── qr-certificate-124-1640995200001.png
│   └── ...
└── templates/          # Certificate templates
```

## Security Features

### 1. **Visibility Separation**
- Hidden certificates remain verifiable via QR codes
- Only soft-deleted certificates become invalid
- Admins can clean dashboard without affecting verification

### 2. **Verification Logic**
```javascript
// QR verification ignores visibility flag
WHERE id = $1 AND deleted_at IS NULL
```

### 3. **Caching**
- QR code images cached for 1 year
- Verification URLs are permanent
- Efficient serving of static QR images

## Configuration

### Environment Variables
```env
BASE_URL=https://your-domain.com  # For QR code URLs
```

### QR Code Settings
```javascript
{
  width: 200,           // QR code size in pixels
  margin: 1,            // Border around QR code
  color: {
    dark: '#000000',    // Black dots
    light: '#FFFFFF'    // White background
  }
}
```

## Migration

Run the database migration to add QR code support:

```sql
-- File: database/migrations/002_add_qr_code_support.sql
```

## Usage Examples

### 1. **Generate Certificate with QR Code**
```bash
POST /api/certificates/generate
{
  "templateId": 1,
  "participantIds": [1, 2, 3],
  "sendEmail": true
}
```

### 2. **Verify Certificate via QR**
```bash
# QR code contains: https://your-domain.com/verify.html?id=123
# User scans and opens verification page
```

### 3. **Access QR Code Image**
```bash
GET /api/certificates/123/qr
# Returns PNG image of QR code
```

### 4. **Verify Certificate API**
```bash
GET /api/certificates/123/verify
# Returns JSON with certificate validity and details
```

## Benefits

1. **Instant Verification**: Anyone can verify certificates without login
2. **Professional Appearance**: QR codes add modern, tech-savvy element
3. **Flexibility**: Hidden certificates remain verifiable
4. **Security**: Soft delete system for actual revocation
5. **Mobile-Friendly**: Optimized for smartphone scanning
6. **Automatic**: No manual QR code generation required

## Troubleshooting

### QR Code Not Generated
- Check `qrCodeService.js` logs for errors
- Verify storage directory permissions
- Ensure `qrcode` package is installed

### Verification Not Working
- Check if certificate is soft-deleted
- Verify certificate ID exists
- Check network connectivity to verification URL

### QR Code Image Not Loading
- Verify QR code file exists in storage
- Check file path in database
- Ensure static file serving is configured

This QR code system seamlessly integrates with your existing certificate management while providing robust verification capabilities that work even when certificates are hidden from the administrative dashboard.
