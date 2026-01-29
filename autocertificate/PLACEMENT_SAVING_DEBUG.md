# Placement Saving Debug Guide

## Problem: Placement is not saving

I've added extensive debugging to help identify where the issue is occurring. Please follow these steps:

## Step 1: Test Text Positioning

1. **Open template placement modal**
2. **Keep QR code disabled** (checkbox unchecked)
3. **Click on template** to position text
4. **Click "Save Placement"**
5. **Check browser console** for these logs:
   ```
   === SAVING PLACEMENT ===
   Current template ID: [number]
   Placement data being saved: [object]
   QR Data: [object]
   QR enabled: false
   ```

## Step 2: Test QR Positioning

1. **Enable QR code** (check the checkbox)
2. **Click on template** to position QR code
3. **Adjust QR size** if needed
4. **Click "Save Placement"**
5. **Check browser console** for these logs:
   ```
   === SAVING PLACEMENT ===
   Current template ID: [number]
   Placement data being saved: [object with qr_x_ratio, qr_y_ratio, qr_size]
   QR Data: [object]
   QR enabled: true
   QR position being saved: { x: [number], y: [number], size: [number] }
   ```

## Step 3: Check Server Logs

Look for these logs in your server console:

### Template Controller:
```
=== TEMPLATE CONTROLLER: UPDATE PLACEMENT ===
Template ID: [number]
Request body: [object]
Controller received updated template: [object]
```

### Template Service:
```
=== TEMPLATE SERVICE: UPDATE PLACEMENT ===
Template ID: [number]
Received QR data: { qr_x_ratio: [value], qr_y_ratio: [value], qr_size: [value] }
All received data: [object]
Normalized QR data: { normalizedQrX: [value], normalizedQrY: [value], normalizedQrSize: [value] }
Updated template QR data: { qr_x_ratio: [value], qr_y_ratio: [value], qr_size: [value] }
```

## Step 4: Verify Database

Run this query in Neon to check if data is being saved:

```sql
SELECT 
    id,
    original_name,
    qr_x_ratio,
    qr_y_ratio,
    qr_size,
    text_x_ratio,
    text_y_ratio,
    text_font_size
FROM templates 
WHERE id = [your_template_id];
```

## Common Issues & Solutions

### Issue 1: QR Data Not Being Sent
**Symptoms**: `qr_x_ratio: null, qr_y_ratio: null, qr_size: null` in save data
**Cause**: QR positioning not captured properly
**Solution**: Check if `qrData.enabled` is true and `qrData.x/y` are set

### Issue 2: Backend Not Receiving Data
**Symptoms**: Empty request body in controller logs
**Cause**: Frontend not sending data properly
**Solution**: Check if saveData object is constructed correctly

### Issue 3: Database Not Updating
**Symptoms**: Service logs show data but database remains unchanged
**Cause**: SQL query failing or columns not existing
**Solution**: Verify database schema has QR columns

### Issue 4: Data Not Loading on Reopen
**Symptoms**: Saved data loads but QR positioning resets
**Cause**: QR data not being loaded from template
**Solution**: Check `openPlacementModal` QR data loading logic

## Debugging Checklist

### Frontend:
- [ ] QR checkbox state is correct
- [ ] QR preview appears when enabled
- [ ] Click events fire and capture coordinates
- [ ] saveData object contains QR data when enabled
- [ ] Network request shows correct payload

### Backend:
- [ ] Controller receives request body
- [ ] Service processes QR data correctly
- [ ] Database query executes without errors
- [ ] Updated template data is returned

### Database:
- [ ] QR columns exist in templates table
- [ ] Data is being written to database
- [ ] Data can be retrieved from database

## Quick Test Commands

### Test API Directly:
```bash
curl -X PUT http://localhost:4000/api/templates/1/placement \
  -H "Content-Type: application/json" \
  -d '{
    "qr_x_ratio": 0.85,
    "qr_y_ratio": 0.15,
    "qr_size": 80
  }'
```

### Check Database:
```sql
-- Check if QR columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'templates' AND column_name LIKE 'qr_%';

-- Check specific template
SELECT * FROM templates WHERE id = 1;
```

## Expected Console Output

### Successful Text Save:
```
=== SAVING PLACEMENT ===
Current template ID: 1
Placement data being saved: {
  text_x_pixels: 300,
  text_y_ratio: 0.5,
  qr_x_ratio: null,
  qr_y_ratio: null,
  qr_size: null
}
QR enabled: false
```

### Successful QR Save:
```
=== SAVING PLACEMENT ===
Current template ID: 1
Placement data being saved: {
  text_x_pixels: 300,
  text_y_ratio: 0.5,
  qr_x_ratio: 0.85,
  qr_y_ratio: 0.15,
  qr_size: 80
}
QR enabled: true
QR position being saved: { x: 0.85, y: 0.15, size: 80 }
```

## Next Steps

1. **Run the debugging steps above**
2. **Share the console output** if you see errors
3. **Check the database** to verify data persistence
4. **Test both text and QR positioning** separately

The extensive logging will help us identify exactly where the issue is occurring in the data flow from frontend → controller → service → database.
