import nodemailer from "nodemailer";
import { config } from "../config/env.js"; 

export const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: config.emailUser,
      pass: config.emailPass,
    },
  });

  const mailOptions = {
    from: `"English Test Generator" <${config.emailUser}>`,
    to: options.email, 
    subject: options.subject, 
    html: options.html, 
  };

  await transporter.sendMail(mailOptions);
};