const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }

  jwt.verify(token, 'pepe', (err, decoded) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to authenticate token' });
    }

    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  });
};

module.exports = verifyToken;