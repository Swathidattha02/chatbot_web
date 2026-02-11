# 🚀 Quick EmailJS Setup - 5 Minutes

## What You Need to Do:

### 1️⃣ Create EmailJS Account (2 min)
- Go to: https://www.emailjs.com/
- Sign up with your email
- Verify your email

### 2️⃣ Connect Gmail Service (1 min)
- Dashboard → **Email Services** → **Add New Service**
- Choose **Gmail**
- Sign in with: **swathidatthapasupuleti02@gmail.com**
- Copy the **Service ID** (looks like: `service_abc123`)

### 3️⃣ Create Email Template (1 min)
- Dashboard → **Email Templates** → **Create New Template**
- Copy this template:

**Subject:**
```
New Contact: {{from_name}}
```

**Body:**
```
Name: {{from_name}}
Email: {{from_email}}
School: {{school}}
Class: {{class}}
Phone: {{phone}}

Message:
{{message}}
```

**Settings:**
- To Email: `swathidatthapasupuleti02@gmail.com`
- From Name: `{{from_name}}`
- Reply To: `{{from_email}}`

- Copy the **Template ID** (looks like: `template_xyz789`)

### 4️⃣ Get Public Key (30 sec)
- Dashboard → **Account** → **General**
- Copy your **Public Key** (looks like: `user_1234567890`)

### 5️⃣ Update Contact.js (30 sec)
Open: `website_frontend/src/pages/Contact.js`

Find line ~30 and replace:
```javascript
const serviceId = 'YOUR_SERVICE_ID_HERE';
const templateId = 'YOUR_TEMPLATE_ID_HERE';
const publicKey = 'YOUR_PUBLIC_KEY_HERE';
```

### ✅ Done! Test it:
1. Go to: http://localhost:3000/contact
2. Fill the form
3. Check your email!

---

**Need the full guide?** See `EMAILJS_SETUP_GUIDE.md`
