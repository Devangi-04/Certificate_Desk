# Certificate ID Format: CD/YEAR/NO

## Overview

The certificate system now uses a professional certificate ID format: **CD/CERTIFICATE_YEAR/CERTIFICATE_NO**

This format provides:
- **CD**: Certificate Desk identifier
- **YEAR**: 4-digit year of issuance
- **NO**: 6-digit sequential number within the year

## Examples

- `CD/2024/000001` - First certificate of 2024
- `CD/2024/000123` - 123rd certificate of 2024
- `CD/2025/000001` - First certificate of 2025

## Database Schema

### New Columns

**Migration**: `004_add_certificate_number.sql`

```sql
certificate_number INTEGER NULL      -- Sequential number within year
certificate_year INTEGER NULL        -- Year of issuance
certificate_full_id VARCHAR(50) NULL -- Full ID in CD/YEAR/NO format
```

### Indexes

```sql
CREATE INDEX idx_certificates_year_number ON certificates(certificate_year, certificate_number);
CREATE INDEX idx_certificates_full_id ON certificates(certificate_full_id);
```

## Implementation Details

### Automatic ID Generation

**Location**: `src/services/certificateService.js` - `ensureCertificateRecord()`

```javascript
// Generate certificate number and year
const currentYear = new Date().getFullYear();
const [yearResult] = await query(
  'SELECT COALESCE(MAX(certificate_number), 0) + 1 as next_number FROM certificates WHERE certificate_year = $1',
  [currentYear]
);
const certificateNumber = yearResult.next_number;
const certificateFullId = `CD/${currentYear}/${String(certificateNumber).padStart(6, '0')}`;
```

### Features

1. **Year-Based Reset**: Numbers reset to 000001 each new year
2. **Zero-Padded**: 6-digit format with leading zeros
3. **Unique**: Guaranteed unique within each year
4. **Professional**: Clean, readable format
5. **Sortable**: Chronologically sortable by year and number

## User Interface Updates

### Verification Page

**Location**: `/verify.html`

**Display**:
```
Certificate ID: CD/2024/000123
```

The certificate ID is displayed prominently at the top of certificate details.

### Admin Dashboard

**Certificate Table**:
- New "Certificate ID" column
- Shows full CD/YEAR/NO format
- Bold formatting for emphasis

## API Changes

### Verification Endpoint

**Response Format**:
```json
{
  "valid": true,
  "certificate": {
    "id": 123,
    "certificate_full_id": "CD/2024/000123",
    "participant_name": "John Doe",
    "template_name": "Course Completion",
    "created_at": "2024-01-15T10:30:00Z",
    "status": "generated",
    "delivery_status": "sent",
    "verification_url": "https://your-domain.com/verify.html?id=123",
    "qr_code_path": "qr-codes/qr-certificate-123-1640995200000.png"
  }
}
```

### QR Code Content

QR codes still use the numeric ID for URLs:
```
https://your-domain.com/verify.html?id=123
```

But the verification page displays the formatted ID.

## Migration Process

### For Existing Certificates

1. **Run Migration**: `004_add_certificate_number.sql`
2. **Backfill Data**: Existing certificates get formatted IDs
3. **Sequential Numbers**: New certificates get sequential numbers

### Backfill Logic

Existing certificates will be assigned:
- Current year as certificate_year
- Sequential numbers based on creation order
- Formatted certificate_full_id

## Benefits

### 1. **Professional Appearance**
- Clean, standardized format
- Easy to read and communicate
- Looks official and organized

### 2. **Year-Based Organization**
- Natural grouping by year
- Easy to identify issuance period
- Annual reset for manageable numbers

### 3. **Sequential Numbering**
- No gaps in numbering within year
- Easy to track certificate volume
- Predictable format

### 4. **System Integration**
- Works with existing QR system
- Compatible with verification system
- Maintains all current functionality

## Usage Examples

### Certificate Generation

```bash
POST /api/certificates/generate
{
  "templateId": 1,
  "participantIds": [1, 2, 3]
}
```

**Result**:
- Certificate 1: `CD/2024/000001`
- Certificate 2: `CD/2024/000002`
- Certificate 3: `CD/2024/000003`

### Certificate Verification

```bash
GET /api/certificates/123/verify
```

**Response**:
```json
{
  "valid": true,
  "certificate": {
    "certificate_full_id": "CD/2024/000123",
    ...
  }
}
```

### Admin Dashboard View

| Name | Email | Template | Certificate ID | Status |
|------|-------|----------|----------------|--------|
| John Doe | john@email.com | Course Completion | **CD/2024/000123** | Generated |

## Technical Considerations

### Database Performance

- Indexed on year and number for fast queries
- Efficient sequential number generation
- Minimal overhead for existing functionality

### Backward Compatibility

- Existing numeric IDs still work
- QR codes unchanged
- API endpoints maintain compatibility

### Error Handling

- Graceful fallback for missing certificate_full_id
- Year-based numbering prevents conflicts
- Database constraints ensure data integrity

## Future Enhancements

### Possible Extensions

1. **Prefix Customization**: Allow different prefixes (CD, TR, etc.)
2. **Date Range Support**: Custom date ranges instead of calendar year
3. **Batch Numbering**: Group certificates by events
4. **Check Digit**: Add validation digit for error detection

### Reporting

- Annual certificate statistics
- Number ranges by year
- Growth tracking over time

## Summary

The **CD/YEAR/NO** format provides a professional, organized certificate identification system that:

- ✅ Generates unique, sequential IDs annually
- ✅ Displays professionally formatted IDs
- ✅ Maintains backward compatibility
- ✅ Integrates seamlessly with existing systems
- ✅ Supports year-based organization
- ✅ Provides clean, readable format

This enhancement improves the professional appearance of certificates while maintaining all existing functionality and QR code verification capabilities.
