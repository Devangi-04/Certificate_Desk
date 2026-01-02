const nodemailer = require('nodemailer');

async function testBrevoSMTP() {
  console.log('🧪 Testing Brevo SMTP Configuration...');
  console.log('=====================================');

  // Check environment variables
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;

  console.log(`📧 SMTP Host: ${smtpHost}`);
  console.log(`👤 SMTP User: ${smtpUser}`);
  console.log(`🔑 SMTP Password: ${smtpPassword ? '***configured***' : '***missing***'}`);

  if (!smtpHost || !smtpUser || !smtpPassword) {
    console.error('❌ Missing SMTP configuration in environment variables!');
    console.log('\nPlease update your .env file with:');
    console.log('SMTP_HOST=smtp-relay.brevo.com');
    console.log('SMTP_USER=your-brevo-email@example.com');
    console.log('SMTP_PASSWORD=your-brevo-smtp-api-key');
    return false;
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: 587,
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });

  try {
    // Test connection
    console.log('\n🔍 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!');

    // Test email sending (optional - uncomment to test)
    /*
    console.log('\n📧 Sending test email...');
    const testEmail = await transporter.sendMail({
      from: process.env.EMAIL_FROM || smtpUser,
      to: smtpUser, // Send test email to yourself
      subject: '🧪 Brevo SMTP Test - Certificate Desk',
      text: 'This is a test email from your Certificate Desk application using Brevo SMTP.',
      html: '<h2>🧪 Brevo SMTP Test</h2><p>This is a test email from your Certificate Desk application using Brevo SMTP.</p>',
    });
    
    console.log('✅ Test email sent successfully!');
    console.log(`📬 Message ID: ${testEmail.messageId}`);
    */

    console.log('\n🎉 Brevo SMTP is configured correctly!');
    console.log('📊 You can now send up to 300 emails per day with Brevo!');
    
    return true;

  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔧 Authentication Error - Check these:');
      console.log('• SMTP_USER is correct (your Brevo email)');
      console.log('• SMTP_PASSWORD is correct (your Brevo API key)');
      console.log('• API key has SMTP permissions');
    } else if (error.code === 'ECONNECTION') {
      console.log('\n🔧 Connection Error - Check these:');
      console.log('• SMTP_HOST is correct (smtp-relay.brevo.com)');
      console.log('• Port 587 is accessible');
      console.log('• No firewall blocking SMTP');
    }
    
    return false;
  }
}

// Run the test
testBrevoSMTP().then(success => {
  if (success) {
    console.log('\n✅ Ready to send certificates with Brevo!');
  } else {
    console.log('\n❌ Please fix the configuration before sending certificates.');
  }
});
