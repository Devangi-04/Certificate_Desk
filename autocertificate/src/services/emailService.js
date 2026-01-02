const nodemailer = require('nodemailer');
const path = require('path');
const { readFromStorage } = require('../utils/fileStorage');

const smtpPort = Number(process.env.SMTP_PORT || 587);
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: process.env.SMTP_SECURE === 'true' || smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Rate limiting for Brevo SMTP (300 emails/day)
const EMAIL_DELAY_MS = 2000; // 2 seconds between emails (30 emails/minute, extra safe for Brevo)
let lastEmailSent = 0;

async function delayEmailSending() {
  const now = Date.now();
  const timeSinceLastEmail = now - lastEmailSent;
  
  if (timeSinceLastEmail < EMAIL_DELAY_MS) {
    const delayTime = EMAIL_DELAY_MS - timeSinceLastEmail;
    console.log(`Rate limiting: Waiting ${delayTime}ms before sending next email...`);
    await new Promise(resolve => setTimeout(resolve, delayTime));
  }
  
  lastEmailSent = Date.now();
}

async function sendCertificateEmail(participant, certificate, options = {}) {
  if (!participant.email) {
    throw new Error('Participant email is missing');
  }
  if (!certificate.pdf_path) {
    throw new Error('Certificate PDF not generated yet');
  }

  // Rate limiting: Wait before sending email
  await delayEmailSending();

  // Add memory management
  if (global.gc) {
    global.gc(); // Force garbage collection if available
  }

  const pdfBuffer = await readFromStorage(certificate.pdf_path);
  let filename = `certificate-${participant.id}.pdf`;
  try {
    if (certificate.pdf_path) {
      if (certificate.pdf_path.startsWith('http://') || certificate.pdf_path.startsWith('https://')) {
        filename = path.basename(new URL(certificate.pdf_path).pathname) || filename;
      } else {
        filename = path.basename(certificate.pdf_path) || filename;
      }
    }
  } catch (err) {
    // Ignore filename parsing errors and fall back to default
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: participant.email,
    subject:
      options.subject ||
      `Your Certificate${options.eventName ? ` - ${options.eventName}` : ''}`,
    text:
      options.text ||
      `Hi ${participant.full_name},\n\nPlease find your certificate attached.\n\nRegards,\nCertificates Desk`,
    attachments: [
      {
        filename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };

  console.log(`Sending email to: ${participant.email} (${participant.full_name})`);
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to: ${participant.email} - Message ID: ${info.messageId}`);
    
    // Clear memory after successful send
    pdfBuffer = null;
    
    return info;
  } catch (error) {
    console.error(`Failed to send email to ${participant.email}:`, error.message);
    
    // Clear memory on error
    pdfBuffer = null;
    
    // Add retry logic for transient errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      console.log(`Retrying email to ${participant.email} after 5 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return sendCertificateEmail(participant, certificate, options);
    }
    
    throw error;
  }
}

module.exports = {
  transporter,
  sendCertificateEmail,
};
