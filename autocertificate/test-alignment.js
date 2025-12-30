const { PDFDocument, StandardFonts } = require('pdf-lib');

async function testAlignment() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 396]); // Standard letter size in points
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const testTexts = [
    { text: 'Left Aligned Text', align: 'left', x: 100 },
    { text: 'Center Aligned Text', align: 'center', x: 306 }, // Half of page width
    { text: 'Right Aligned Text', align: 'right', x: 512 } // Full page width
  ];
  
  const fontSize = 24;
  const fontHeight = helveticaBold.heightAtSize(fontSize);
  
  testTexts.forEach((test, index) => {
    const textWidth = helveticaBold.widthOfTextAtSize(test.text, fontSize);
    let drawX;
    
    if (test.align === 'center') {
      drawX = test.x - (textWidth / 2);
    } else if (test.align === 'right') {
      drawX = test.x - textWidth;
    } else { // 'left'
      drawX = test.x;
    }
    
    const y = 300 - (index * 50);
    
    console.log(`Text: "${test.text}"`);
    console.log(`Align: ${test.align}`);
    console.log(`Target X: ${test.x}, Text Width: ${textWidth}`);
    console.log(`Draw X: ${drawX}`);
    console.log(`Y: ${y}`);
    console.log('---');
    
    page.drawText(test.text, {
      x: drawX,
      y: y,
      size: fontSize,
      font: helveticaBold,
      color: { red: 0, green: 0, blue: 0 }
    });
  });
  
  const pdfBytes = await pdfDoc.save();
  const fs = require('fs');
  fs.writeFileSync('alignment-test.pdf', pdfBytes);
  console.log('Test PDF created: alignment-test.pdf');
}

testAlignment().catch(console.error);
