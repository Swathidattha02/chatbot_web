# EmailJS Setup Guide for Contact Form

## Overview
This guide will help you set up EmailJS to receive contact form submissions at swathidatthapasupuleti02@gmail.com

## Step 1: Create EmailJS Account

1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Click "Sign Up" and create a free account
3. Verify your email address

## Step 2: Add Email Service

1. After logging in, go to **Email Services** in the dashboard
2. Click **Add New Service**
3. Choose **Gmail** as your email service
4. Click **Connect Account** and sign in with your Gmail account (swathidatthapasupuleti02@gmail.com)
5. Give your service a name (e.g., "Contact Form Service")
6. Copy the **Service ID** (you'll need this later)
7. Click **Create Service**

## Step 3: Create Email Template

1. Go to **Email Templates** in the dashboard
2. Click **Create New Template**
3. Use this template structure:

### Template Content:

**Subject:**
```
New Contact Form Submission from {{from_name}}
```

**Body:**
```
You have received a new message from your website contact form.

Student Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: {{from_name}}
Email: {{from_email}}
School: {{school}}
Class: {{class}}
Phone: {{phone}}

Message:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{message}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This email was sent from the contact form on your educational platform.
Reply directly to this email to respond to {{from_name}}.
```

4. In the **Settings** tab:
   - Set **To Email** to: `swathidatthapasupuleti02@gmail.com`
   - Set **From Name** to: `{{from_name}}`
   - Set **Reply To** to: `{{from_email}}`

5. Copy the **Template ID** (you'll need this later)
6. Click **Save**

## Step 4: Get Your Public Key

1. Go to **Account** → **General** in the dashboard
2. Find your **Public Key** (it looks like: `user_xxxxxxxxxxxxx`)
3. Copy this key

## Step 5: Update the Contact.js File

Open `website_frontend/src/pages/Contact.js` and replace the placeholder values:

```javascript
// Replace these lines (around line 30-32):
const serviceId = 'service_your_id';      // Replace with your Service ID
const templateId = 'template_your_id';    // Replace with your Template ID
const publicKey = 'your_public_key';      // Replace with your Public Key
```

**Example:**
```javascript
const serviceId = 'service_abc123';
const templateId = 'template_xyz789';
const publicKey = 'user_1234567890abcdef';
```

## Step 6: Test the Contact Form

1. Start your frontend server: `npm start`
2. Navigate to `/contact` in your browser
3. Fill out the form with test data
4. Click "Send Message"
5. Check your email at swathidatthapasupuleti02@gmail.com

## Troubleshooting

### Email not received?
- Check your spam/junk folder
- Verify all IDs are correctly copied
- Check the EmailJS dashboard for error logs
- Ensure your Gmail account is properly connected

### "Failed to send" error?
- Check browser console for detailed error messages
- Verify your Public Key is correct
- Make sure you're not exceeding the free tier limit (200 emails/month)

### Template variables not working?
- Ensure variable names in the template match exactly: `{{from_name}}`, `{{from_email}}`, etc.
- Variable names are case-sensitive

## Free Tier Limits

EmailJS free tier includes:
- 200 emails per month
- 2 email services
- Unlimited templates
- Basic support

If you need more, consider upgrading to a paid plan.

## Security Notes

- The Public Key is safe to use in frontend code
- Never share your Private Key
- EmailJS handles all email sending securely
- Form data is sent directly to EmailJS servers

## Additional Features

You can enhance the contact form by:
- Adding email validation
- Implementing rate limiting
- Adding a CAPTCHA to prevent spam
- Storing submissions in your database as backup

---

**Need Help?**
- EmailJS Documentation: https://www.emailjs.com/docs/
- EmailJS Support: https://www.emailjs.com/support/
