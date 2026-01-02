#!/bin/bash

echo "🚀 Brevo Setup Script for Certificate Desk"
echo "=========================================="

echo ""
echo "📋 Step 1: Create Brevo Account"
echo "--------------------------------"
echo "1. Go to https://www.brevo.com"
echo "2. Click 'Sign Up' → 'Free Plan'"
echo "3. Fill in your details and verify email"
echo "4. Complete your profile"
echo ""
read -p "Press Enter once you have created your Brevo account..."

echo ""
echo "🔑 Step 2: Get SMTP Credentials"
echo "--------------------------------"
echo "1. Log into your Brevo dashboard"
echo "2. Go to 'Transactional' → 'SMTP & API'"
echo "3. Click 'Generate New Key'"
echo "4. Name it 'Certificate Desk'"
echo "5. Copy the SMTP credentials"
echo ""
read -p "Press Enter once you have your SMTP credentials..."

echo ""
echo "⚙️ Step 3: Update Environment Variables"
echo "--------------------------------------"
echo "Please update your .env file with these values:"
echo ""
echo "SMTP_HOST=smtp-relay.brevo.com"
echo "SMTP_PORT=587"
echo "SMTP_SECURE=false"
echo "SMTP_USER=your-brevo-email@example.com"
echo "SMTP_PASSWORD=your-brevo-smtp-api-key"
echo "EMAIL_FROM=\"Certificates Desk <your-brevo-email@example.com>\""
echo ""

echo "📝 Your .env file should look like this:"
echo "========================================"
cat << 'EOF'
PORT=4000

DATABASE_URL=your-database-url
BLOB_READ_WRITE_TOKEN=your-blob-token

# Email Configuration - Brevo SMTP
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-actual-brevo-email@example.com
SMTP_PASSWORD=your-actual-brevo-smtp-api-key
EMAIL_FROM="Certificates Desk <your-actual-brevo-email@example.com>"

CERT_TEXT_X=420
CERT_TEXT_Y=310
CERT_FONT_SIZE=36
CERT_FONT_COLOR=#1f2933
CERT_TEXT_ALIGN=center
EOF

echo ""
echo "✅ Step 4: Test Configuration"
echo "------------------------------"
echo "Once you've updated your .env file:"
echo "1. Restart your application"
echo "2. Try sending a test certificate to 1 participant"
echo "3. Check the console logs for success"
echo ""

echo "🎯 Expected Results with Brevo:"
echo "--------------------------------"
echo "• 300 emails/day free limit"
echo "• 1 second delay between emails"
echo "• 300 emails = 5 minutes total time"
echo "• Professional deliverability"
echo "• Email analytics in Brevo dashboard"
echo ""

echo "🚨 Important Notes:"
echo "-------------------"
echo "• Brevo requires domain verification for best deliverability"
echo "• Check your Brevo dashboard for email statistics"
echo "• Monitor your daily usage (300/day limit)"
echo "• Rate limiting is already configured for Brevo"
echo ""

echo "✨ Setup Complete!"
echo "=================="
echo "Your Certificate Desk is now ready to use Brevo SMTP!"
echo "You can send up to 300 emails per day for free!"
echo ""
