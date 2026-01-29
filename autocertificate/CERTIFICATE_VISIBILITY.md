# Certificate Visibility System

This document describes the certificate visibility system that separates UI display from certificate validity, ensuring certificates remain verifiable via QR codes even when hidden from administrative dashboards.

## Overview

The system introduces two key concepts:

1. **Visibility Flag (`is_visible`)**: Controls whether certificates appear in administrative UI dashboards
2. **Soft Delete (`deleted_at`)**: Marks certificates as permanently revoked and invalid

## Key Features

- ✅ Hidden certificates remain fully valid for QR verification
- ✅ Hidden certificates can still be downloaded via direct links
- ✅ Soft-deleted certificates are completely invalidated
- ✅ Clean separation between UI clutter management and certificate validity
- ✅ Comprehensive API endpoints for visibility management

## Database Schema Changes

### New Columns in `certificates` table:

```sql
is_visible BOOLEAN DEFAULT TRUE NOT NULL COMMENT 'Controls UI visibility in dashboards. Hidden certificates remain valid for QR verification.'
deleted_at TIMESTAMP NULL COMMENT 'Soft delete timestamp for certificate revocation. NULL means certificate is not revoked.'
```

### New Indexes:

```sql
CREATE INDEX idx_certificates_visible ON certificates(is_visible);
CREATE INDEX idx_certificates_deleted_at ON certificates(deleted_at);
```

## API Endpoints

### Certificate Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/certificates/:id/hide` | Hide certificate from dashboard (remains valid) |
| `POST` | `/api/certificates/:id/unhide` | Restore certificate to dashboard |
| `DELETE` | `/api/certificates/:id/revoke` | Permanently revoke certificate (soft delete) |
| `GET` | `/api/certificates/:id/verify` | Verify certificate authenticity (ignores visibility) |
| `GET` | `/api/certificates/:id/download` | Download certificate PDF (ignores visibility) |

### Standard Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/certificates` | List visible certificates only |
| `GET` | `/api/certificates?includeHidden=true` | List all certificates (including hidden) |

## UI Changes

### Certificate Table

The certificate management table now includes:

- **Visibility Column**: Shows "Visible" or "Hidden" status
- **Hide/Unhide Actions**: Toggle visibility without affecting validity
- **Revoke Action**: Permanently invalidate certificate (with confirmation)

### Action Buttons

- **Hide**: Removes certificate from dashboard (remains verifiable)
- **Unhide**: Restores certificate to dashboard
- **Revoke**: Permanently invalidates certificate (cannot be restored)
- **Resend**: Send certificate email (existing functionality)

## Verification System

### QR Code Verification

- **Endpoint**: `GET /api/certificates/:id/verify`
- **Behavior**: Ignores visibility flag, respects soft delete
- **Response**: Certificate validity and details

### Verification Page

- **URL**: `/verify.html`
- **Features**: 
  - Manual certificate ID input
  - URL parameter support: `/verify.html?id=123`
  - Detailed certificate information display
  - Clear valid/invalid status indicators

## Use Cases

### 1. Hide Old Certificates
```bash
# Hide certificate from dashboard (remains valid)
POST /api/certificates/123/hide
```

### 2. Certificate Verification via QR
```bash
# Verify certificate (works even if hidden)
GET /api/certificates/123/verify
```

### 3. Download Hidden Certificate
```bash
# Download certificate PDF (works even if hidden)
GET /api/certificates/123/download
```

### 4. Revoke Invalid Certificate
```bash
# Permanently revoke certificate
DELETE /api/certificates/123/revoke
```

## Migration

Run the database migration to add the new columns:

```sql
-- Run this migration script
-- File: database/migrations/001_add_certificate_visibility.sql
```

## Security Considerations

1. **Hidden certificates** are still accessible via direct links and QR codes
2. **Soft-deleted certificates** are completely inaccessible and invalid
3. **Verification endpoints** ignore visibility to ensure QR codes always work
4. **Download endpoints** allow access to hidden but valid certificates

## Best Practices

1. **Hide certificates** when you want to clean up the dashboard but keep certificates valid
2. **Revoke certificates** only when certificates should be permanently invalidated
3. **Use QR verification** for public-facing certificate validation
4. **Regular cleanup** periodically hide old certificates to reduce dashboard clutter

## Example Workflow

1. **Generate certificates** for an event
2. **Send emails** to participants with certificate links
3. **Hide certificates** after event completion to clean dashboard
4. **Participants verify** certificates via QR codes (still works)
5. **Revoke only if** certificate was issued in error

## Technical Implementation Details

### Service Layer Changes

- `listCertificates()`: Respects `includeHidden` parameter
- `getCertificateById()`: Respects `includeHidden` parameter
- `getCertificateByIdForVerification()`: Ignores visibility, respects soft delete
- `hideCertificate()` / `unhideCertificate()`: Toggle visibility flag
- `softDeleteCertificate()`: Set `deleted_at` timestamp

### Controller Layer Changes

- New endpoints for visibility management
- Updated download endpoint to use verification function
- Comprehensive error handling and user feedback

### Frontend Changes

- Updated certificate table rendering
- New event handlers for visibility actions
- Added verification page for QR code validation
- Improved user feedback and confirmation dialogs

This system ensures that certificate management remains flexible while maintaining the integrity and accessibility of issued certificates.
