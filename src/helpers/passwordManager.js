const crypto = require('crypto');

const key = Buffer.from('97345688501354567590123456789012', 'utf8'); // 32-byte key
const iv = Buffer.from('9464567890123457', 'utf8'); // 16-byte IV

function decryptPassword(encryptedPassword) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedPassword, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
module.exports = {
    decryptPassword
}