// Simple coordinate test to identify the issue
console.log('=== COORDINATE SYSTEM TEST ===');

// Test what happens with center position
const testX = 0.5;
const testY = 0.5;
const canvasWidth = 600;
const canvasHeight = 400;

// Frontend calculation (what we currently do)
const frontendX = testX * canvasWidth; // 300
const frontendY = testY * canvasHeight; // 200

// Backend calculation (what certificate generation does)
const backendX = canvasWidth * testX; // 300
const backendY = canvasHeight * testY; // 200

console.log('Test: X=0.5, Y=0.5 on 600x400 canvas');
console.log('Frontend calculates:', { x: frontendX, y: frontendY });
console.log('Backend calculates:', { x: backendX, y: backendY });
console.log('Match:', frontendX === backendX && frontendY === backendY);

// But wait - PDF coordinates have Y=0 at bottom!
// So if Y=0.5, that means middle from bottom
// In canvas coordinates (Y=0 at top), this should be:
const canvasYFromTop = canvasHeight - backendY; // 400 - 200 = 200
console.log('PDF Y=200 (from bottom) = Canvas Y=' + canvasYFromTop + ' (from top)');

// So the issue might be that we're treating Y=0.5 as center from top
// But PDF treats Y=0.5 as center from bottom
console.log('');
console.log('ISSUE: If you place name at visual center (top-based Y=0.5)');
console.log('PDF will draw it at Y=200 from bottom = visual center');
console.log('But if you want it at visual center, you need to save Y=0.5');
console.log('The coordinate systems should match...');

// Let me check if the issue is in the Y conversion
console.log('');
console.log('CONVERSION TEST:');
console.log('If you save Y=0.5, PDF draws at Y=200 from bottom');
console.log('In 400px canvas, Y=200 from bottom = Y=200 from top (center)');
console.log('So Y=0.5 should appear at center...');

// Maybe the issue is that we're not accounting for text height?
const textHeight = 36;
console.log('Text height adjustment:');
console.log('PDF draws at baseline Y=200');
console.log('Text extends from baseline up to Y=' + (200 + textHeight));
console.log('Visual center of text would beuto Y=' + (200 + textHeight/2));
