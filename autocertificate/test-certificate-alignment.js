const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

async function testCertificateAlignment() {
  console.log('Testing certificate name alignment...');
  
  // Create a test PDF
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 396]); // Standard letter size
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const testCases = [
    { name: 'John Doe', align: 'left', targetX: 100, expected: 'left' },
    { name: 'Jane Smith', align: 'center', targetX: 306, expected: 'center' },
    { name: 'Bob Johnson', align: 'right', targetX: 512, expected: 'right' }
  ];
  
  const fontSize = 24;
  
  testCases.forEach((test, index) => {
    const text = test.name;
    const textWidth = helveticaBold.widthOfTextAtSize(text, fontSize);
    const fontHeight = helveticaBold.heightAtSize(fontSize);
    
    // Calculate draw position based on alignment
    let drawX;
    if (test.align === 'center') {
      drawX = test.targetX - (textWidth / 2);
    } else if (test.align === 'right') {
      drawX = test.targetX - textWidth;
    } else { // 'left'
      drawX = test.targetX;
    }
    
    const y = 300 - (index * 50);
    
    console.log(`\nTest: ${test.name}`);
    console.log(`Alignment: ${test.align}`);
    console.log(`Target X: ${test.targetX}`);
    console.log(`Text Width: ${textWidth}`);
    console.log(`Draw X: ${drawX}`);
    console.log(`Y: ${y}`);
    
    // Draw the text
    page.drawText(text, {
      x: drawX,
      y: y,
      size: fontSize,
      font: helveticaBold,
      color: rgb(0, 0, 0)
    });
    
    // Draw alignment markers for verification
    page.drawLine({
      start: { x: test.targetX, y: y - 5 },
      end: { x: test.targetX, y: y + fontHeight + 5 },
      color: rgb(1, 0, 0),
      thickness: 1
    });
  });
  
  const pdfBytes = await pdfDoc.save();
  const fs = require('fs');
  fs.writeFileSync('alignment-test-certificates.pdf', pdfBytes);
  console.log('\nTest PDF created: alignment-test-certificates.pdf');
  console.log('Red lines show target positions for each alignment');
}

testCertificateAlignment().catch(console.error);
