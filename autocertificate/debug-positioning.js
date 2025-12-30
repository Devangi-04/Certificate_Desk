// Test coordinate conversion between frontend and backend
const { createCanvas } = require('canvas');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

async function testCoordinateConversion() {
    console.log('=== Testing Coordinate Conversion ===');
    
    // Test parameters
    const canvasWidth = 600;
    const canvasHeight = 400;
    const fontSize = 36;
    const text = "John Doe";
    const placementX = 0.5; // Center X
    const placementY = 0.5; // Center Y
    
    // Frontend calculation (Canvas)
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    
    // Test different font settings
    console.log('\n--- Testing different font settings ---');
    
    // Test 1: Basic Helvetica
    ctx.font = `${fontSize}px Helvetica`;
    const textWidth1 = ctx.measureText(text).width;
    console.log('1. Basic Helvetica:', textWidth1);
    
    // Test 2: Helvetica Bold
    ctx.font = `bold ${fontSize}px Helvetica`;
    const textWidth2 = ctx.measureText(text).width;
    console.log('2. Helvetica Bold:', textWidth2);
    
    // Test 3: Helvetica, Arial, sans-serif
    ctx.font = `${fontSize}px Helvetica, Arial, sans-serif`;
    const textWidth3 = ctx.measureText(text).width;
    console.log('3. Helvetica, Arial, sans-serif:', textWidth3);
    
    // Test 4: 600 bold Helvetica
    ctx.font = `600 ${fontSize}px Helvetica`;
    const textWidth4 = ctx.measureText(text).width;
    console.log('4. 600 weight Helvetica:', textWidth4);
    
    // Use the closest match
    const textWidth = textWidth2; // Use bold Helvetica
    const textHeight = fontSize * 1.2;
    
    // Calculate position using frontend logic
    let anchorX = placementX * canvasWidth;
    let anchorY = placementY * canvasHeight;
    anchorX -= textWidth / 2; // Center alignment
    const canvasY = canvasHeight - anchorY;
    const anchorYTop = canvasY - textHeight;
    
    console.log('\n--- Frontend (Canvas) calculation ---');
    console.log('Using text width:', textWidth);
    console.log({
        placement: { x: placementX, y: placementY },
        textDimensions: { textWidth, textHeight },
        anchorX,
        anchorY,
        canvasY,
        finalPosition: { left: anchorX, top: anchorYTop }
    });
    
    // Backend calculation (PDF)
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([canvasWidth, canvasHeight]);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pdfTextWidth = helveticaBold.widthOfTextAtSize(text, fontSize);
    
    const pdfTargetX = canvasWidth * placementX;
    const pdfTargetY = canvasHeight * placementY;
    const pdfDrawX = pdfTargetX - pdfTextWidth / 2;
    
    console.log('\n--- Backend (PDF) calculation ---');
    console.log('Using text width:', pdfTextWidth);
    console.log({
        placement: { x: placementX, y: placementY },
        pageDimensions: { width: canvasWidth, height: canvasHeight },
        textDimensions: { textWidth: pdfTextWidth, textHeight },
        calculated: { targetX: pdfTargetX, targetY: pdfTargetY, drawX: pdfDrawX },
        finalPosition: { x: pdfDrawX, y: pdfTargetY }
    });
    
    // Compare text widths
    console.log('\n--- Comparison ---');
    console.log('Text width difference:', Math.abs(textWidth - pdfTextWidth));
    console.log('Position difference X:', Math.abs(anchorX - pdfDrawX));
    console.log('Position difference Y:', Math.abs(anchorYTop - pdfTargetY));
    
    // Test if positions match
    const positionsMatch = Math.abs(anchorX - pdfDrawX) < 1 && Math.abs(anchorYTop - pdfTargetY) < 1;
    console.log('Positions match:', positionsMatch);
    
    return {
        frontend: { left: anchorX, top: anchorYTop },
        backend: { x: pdfDrawX, y: pdfTargetY },
        match: positionsMatch,
        textWidthDiff: Math.abs(textWidth - pdfTextWidth)
    };
}

testCoordinateConversion().then(result => {
    console.log('\n=== Test Result ===');
    console.log('Match:', result.match);
    console.log('Text width difference:', result.textWidthDiff);
    if (!result.match) {
        console.error('POSITION MISMATCH DETECTED!');
    } else {
        console.log('✅ Positions match correctly!');
    }
}).catch(console.error);
