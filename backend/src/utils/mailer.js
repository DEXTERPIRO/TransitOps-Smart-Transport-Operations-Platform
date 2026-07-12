const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.EMAIL_USER) {
    console.log('[Email] Skipped — EMAIL_USER not configured');
    return;
  }
  await transporter.sendMail({
    from: `"TransitOps" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

module.exports = { sendEmail };
