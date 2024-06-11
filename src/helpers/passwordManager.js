const crypto = require("crypto");

// Function to encrypt data using AES-256-CBC
function encrypt(text) {
  const secretKey = process.env.SECRET_KEY;
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(secretKey, "hex"),
      iv
    );
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
  } catch (error) {
    throw new Error(error);
  }
}

module.exports = { encrypt };
