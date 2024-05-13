const nodemailer = require('nodemailer');

const sendTempPasswordEmail = (recipientEmail, tempPassword) => {
  // Create a Nodemailer transporter
  let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // Your SMTP server host
    port: 587, // Your SMTP server port (typically 587 for TLS)
    secure: false, // Set to true if your SMTP server requires TLS
    auth: {
      user: 'soagrupo6@gmail.com', // Your email address
      pass: 'lumo ovap ebck qrnv' // Your email password or application-specific password
    }
  });

  // Send email
  transporter.sendMail({
    from: 'soagrupo6@gmail.com',
    to: recipientEmail,
    subject: 'Password Reset',
    text: `Your temporary password is: ${tempPassword}. Please use this password to login and reset your password.`,
  }, (err, info) => {
    if (err) {
      console.error("Error sending email:", err);
      // Handle error, maybe return an error response
    } else {
      console.log("Email sent:", info.response);
      // Email sent successfully, maybe log success or return a success response
    }
  });
};

const sendDeleteUserEmail = (recipientEmail, message) => {
    // Create a Nodemailer transporter
    let transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', // Your SMTP server host
      port: 587, // Your SMTP server port (typically 587 for TLS)
      secure: false, // Set to true if your SMTP server requires TLS
      auth: {
        user: 'soagrupo6@gmail.com', // Your email address
        pass: 'lumo ovap ebck qrnv' // Your email password or application-specific password
      }
    });
  
    // Send email
    transporter.sendMail({
      from: 'soagrupo6@gmail.com',
      to: recipientEmail,
      subject: 'Elimination of user confirmation',
      text: `Please be aware that: ${message}. We are sad that you are leaving us, if you have any suggestion feel free to contact us.`,
    }, (err, info) => {
      if (err) {
        console.error("Error sending email:", err);
        // Handle error, maybe return an error response
      } else {
        console.log("Email sent:", info.response);
        // Email sent successfully, maybe log success or return a success response
      }
    });
  };

module.exports = {
    sendTempPasswordEmail,
    sendDeleteUserEmail
}