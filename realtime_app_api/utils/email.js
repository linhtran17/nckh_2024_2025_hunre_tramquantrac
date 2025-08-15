const nodemailer = require('nodemailer');
require('dotenv').config();

const sendEmail = async (to, subject, message) => {
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text: message,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Đã gửi email thành công đến ${to}: ${info.response}`);
    return true;
  } catch (error) {
    console.error(`Lỗi gửi email đến ${to}:`, error.message);
    return false;
  }
};

module.exports = { sendEmail };