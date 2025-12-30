const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

/**
 * Alternative positioning approaches for certificate generation
 */

class AlternativePositioningService {
  
  /**
   * Method 1: Template-based positioning using predefined positions
   * This uses a configuration file with exact positions for different templates
   */
  static async generateWithTemplatePositions(templatePath, participantName, templateConfig) {
    const pdfDoc = await PDFDocument.load(fs.readFileSync(templatePath));
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const page = pdfDoc.getPages()[0];
    
    // Use predefined positions from template configuration
    const namePosition = templateConfig.namePosition || { x: 300, y: 200, align: 'center' };
    const fontSize = templateConfig.fontSize || 36;
    
    // Calculate text width for alignment
    const textWidth = helveticaBold.widthOfTextAtSize(participantName, fontSize);
    
    let drawX;
    if (namePosition.align === 'center') {
      drawX = namePosition.x - (textWidth / 2);
    } else if (namePosition.align === 'right') {
      drawX = namePosition.x - textWidth;
    } else {
      drawX = namePosition.x;
    }
    
    page.drawText(participantName, {
      x: drawX,
      y: namePosition.y,
      size: fontSize,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    
    return await pdfDoc.save();
  }
  
  /**
   * Method 2: Relative positioning based on template dimensions
   * This calculates positions as percentages of the page size
   */
  static async generateWithRelativePositions(templatePath, participantName, relativeConfig) {
    const pdfDoc = await PDFDocument.load(fs.readFileSync(templatePath));
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const page = pdfDoc.getPages()[0];
    
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    
    // Use relative percentages
    const nameRelativePos = relativeConfig.nameRelativePosition || { 
      xPercent: 0.5,  // 50% from left
      yPercent: 0.5,  // 50% from bottom
      align: 'center' 
    };
    
    const fontSize = relativeConfig.fontSize || 36;
    
    // Convert percentages to actual coordinates
    const anchorX = pageWidth * nameRelativePos.xPercent;
    const anchorY = pageHeight * nameRelativePos.yPercent;
    
    // Calculate text width for alignment
    const textWidth = helveticaBold.widthOfTextAtSize(participantName, fontSize);
    
    let drawX;
    if (nameRelativePos.align === 'center') {
      drawX = anchorX - (textWidth / 2);
    } else if (nameRelativePos.align === 'right') {
      drawX = anchorX - textWidth;
    } else {
      drawX = anchorX;
    }
    
    page.drawText(participantName, {
      x: drawX,
      y: anchorY,
      size: fontSize,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    
    return await pdfDoc.save();
  }
  
  /**
   * Method 3: Fixed position templates approach
   * Uses templates that have pre-defined name fields
   */
  static async generateWithFixedTemplate(templatePath, participantName, templateType = 'standard') {
    const pdfDoc = await PDFDocument.load(fs.readFileSync(templatePath));
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const page = pdfDoc.getPages()[0];
    
    // Predefined positions for different template types
    const templatePositions = {
      'standard': { x: 300, y: 200, align: 'center', fontSize: 36 },
      'formal': { x: 250, y: 250, align: 'left', fontSize: 32 },
      'modern': { x: 350, y: 180, align: 'center', fontSize: 40 },
      'compact': { x: 200, y: 220, align: 'center', fontSize: 28 }
    };
    
    const config = templatePositions[templateType] || templatePositions['standard'];
    
    // Calculate text width for alignment
    const textWidth = helveticaBold.widthOfTextAtSize(participantName, config.fontSize);
    
    let drawX;
    if (config.align === 'center') {
      drawX = config.x - (textWidth / 2);
    } else if (config.align === 'right') {
      drawX = config.x - textWidth;
    } else {
      drawX = config.x;
    }
    
    page.drawText(participantName, {
      x: drawX,
      y: config.y,
      size: config.fontSize,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    
    return await pdfDoc.save();
  }
  
  /**
   * Method 4: Smart positioning based on text length
   * Adjusts position based on the length of the participant name
   */
  static async generateWithSmartPositioning(templatePath, participantName, smartConfig = {}) {
    const pdfDoc = await PDFDocument.load(fs.readFileSync(templatePath));
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const page = pdfDoc.getPages()[0];
    
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    
    const fontSize = smartConfig.fontSize || 36;
    const basePosition = smartConfig.basePosition || { x: pageWidth / 2, y: pageHeight / 2 };
    
    // Calculate text width and adjust position based on length
    const textWidth = helveticaBold.widthOfTextAtSize(participantName, fontSize);
    const nameLength = participantName.length;
    
    // Smart adjustments based on name length
    let positionX = basePosition.x;
    let alignment = 'center';
    
    if (nameLength > 20) {
      // For very long names, use left alignment and adjust position
      positionX = basePosition.x - (textWidth * 0.1); // Slight left adjustment
      alignment = 'left';
    } else if (nameLength < 8) {
      // For short names, ensure proper centering
      positionX = basePosition.x;
      alignment = 'center';
    }
    
    let drawX;
    if (alignment === 'center') {
      drawX = positionX - (textWidth / 2);
    } else if (alignment === 'right') {
      drawX = positionX - textWidth;
    } else {
      drawX = positionX;
    }
    
    page.drawText(participantName, {
      x: drawX,
      y: basePosition.y,
      size: fontSize,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    
    return await pdfDoc.save();
  }
  
  /**
   * Method 5: Template overlay approach
   * Uses a separate overlay layer for name placement
   */
  static async generateWithOverlay(templatePath, participantName, overlayConfig) {
    const pdfDoc = await PDFDocument.load(fs.readFileSync(templatePath));
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const page = pdfDoc.getPages()[0];
    
    // Create overlay configuration
    const overlayPosition = overlayConfig.overlayPosition || { 
      x: 300, 
      y: 200, 
      align: 'center',
      fontSize: 36,
      color: { r: 0, g: 0, b: 0 }
    };
    
    // Calculate text width for alignment
    const textWidth = helveticaBold.widthOfTextAtSize(participantName, overlayPosition.fontSize);
    
    let drawX;
    if (overlayPosition.align === 'center') {
      drawX = overlayPosition.x - (textWidth / 2);
    } else if (overlayPosition.align === 'right') {
      drawX = overlayPosition.x - textWidth;
    } else {
      drawX = overlayPosition.x;
    }
    
    // Draw with overlay color
    page.drawText(participantName, {
      x: drawX,
      y: overlayPosition.y,
      size: overlayPosition.fontSize,
      font: helveticaBold,
      color: rgb(overlayPosition.color.r, overlayPosition.color.g, overlayPosition.color.b),
    });
    
    return await pdfDoc.save();
  }
}

module.exports = AlternativePositioningService;
