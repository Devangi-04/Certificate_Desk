const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');

/**
 * Simple positioning test tool
 * This allows you to test different positioning settings easily
 */

async function testPositioning() {
  // Load a sample PDF (replace with your actual template path)
  const templatePath = './templates/sample-certificate.pdf';
  
  if (!fs.existsSync(templatePath)) {
    console.log('Creating a test certificate template...');
    // Create a simple test certificate if template doesn't exist
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    
    // Add some basic content to make it look like a certificate
    page.drawText('CERTIFICATE OF PARTICIPATION', {
      x: 100,
      y: 350,
      size: 20,
      color: rgb(0, 0, 0),
    });
    
    page.drawText('This is to certify that', {
      x: 100,
      y: 300,
      size: 12,
      color: rgb(0, 0, 0),
    });
    
    // Save the test template
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(templatePath, pdfBytes);
  }
  
  // Test different positioning configurations
  const testConfigs = [
    { name: 'Center Top', xPercent: 0.5, yPercent: 0.7, align: 'center', color: 'red' },
    { name: 'Center Middle', xPercent: 0.5, yPercent: 0.5, align: 'center', color: 'blue' },
    { name: 'Center Bottom', xPercent: 0.5, yPercent: 0.3, align: 'center', color: 'green' },
    { name: 'Left Side', xPercent: 0.2, yPercent: 0.5, align: 'left', color: 'orange' },
    { name: 'Right Side', xPercent: 0.8, yPercent: 0.5, align: 'right', color: 'purple' },
    { name: 'Custom Position', xPercent: 0.4, yPercent: 0.4, align: 'center', color: 'brown' }
  ];
  
  for (let i = 0; i < testConfigs.length; i++) {
    const config = testConfigs[i];
    await generateTestCertificate(templatePath, `Test Name ${i + 1}`, config, i + 1);
  }
  
  console.log('Test certificates generated! Check the output folder.');
  console.log('Each certificate shows a different positioning configuration.');
  console.log('Find the one that matches your desired placement and update config/positioning-config.js accordingly.');
}

async function generateTestCertificate(templatePath, participantName, config, testNumber) {
  const pdfDoc = await PDFDocument.load(fs.readFileSync(templatePath));
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.getPages()[0];
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  
  const fontSize = 36;
  const textWidth = helveticaBold.widthOfTextAtSize(participantName, fontSize);
  
  // Calculate positioning
  const anchorX = pageWidth * config.xPercent;
  const anchorY = pageHeight * config.yPercent;
  
  let drawX;
  if (config.align === 'center') {
    drawX = anchorX - (textWidth / 2);
  } else if (config.align === 'right') {
    drawX = anchorX - textWidth;
  } else {
    drawX = anchorX;
  }
  
  // Draw the name
  page.drawText(participantName, {
    x: drawX,
    y: anchorY,
    size: fontSize,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  
  // Add a marker to show the anchor point
  const markerSize = 5;
  page.drawRectangle({
    x: anchorX - markerSize/2,
    y: anchorY - markerSize/2,
    width: markerSize,
    height: markerSize,
    color: rgb(1, 0, 0), // Red marker
  });
  
  // Add configuration info
  page.drawText(`Test ${testNumber}: ${config.name}`, {
    x: 50,
    y: 50,
    size: 10,
    color: rgb(0.5, 0.5, 0.5),
  });
  
  page.drawText(`X: ${config.xPercent * 100}%, Y: ${config.yPercent * 100}%, Align: ${config.align}`, {
    x: 50,
    y: 35,
    size: 10,
    color: rgb(0.5, 0.5, 0.5),
  });
  
  // Save the test certificate
  const pdfBytes = await pdfDoc.save();
  const filename = `./output/test-certificate-${testNumber}-${config.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
  fs.writeFileSync(filename, pdfBytes);
  
  console.log(`Generated: ${filename}`);
  console.log(`  Position: ${config.xPercent * 100}% from left, ${config.yPercent * 100}% from bottom`);
  console.log(`  Alignment: ${config.align}`);
  console.log(`  Anchor point marked with red square`);
  console.log('');
}

testPositioning().catch(console.error);
