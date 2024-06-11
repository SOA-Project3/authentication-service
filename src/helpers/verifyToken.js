const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const tokenKey = process.env.TOKEN_KEY;
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).send("Missing Authorization Header");

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }

  jwt.verify(token, tokenKey, (err, decoded) => {
    if (err) {
      return res.status(500).json({ message: "Failed to authenticate token" });
    }

    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  });
};

module.exports = verifyToken;
