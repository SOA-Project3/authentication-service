const express = require('express');
const bodyParser = require('body-parser');
const statusCodes = require("../constants/statusCodes");
const bcrypt = require('bcrypt');

const router = express.Router();
router.use(bodyParser.json());



// Register a new user
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  // Check if the username is already taken
  if (users.find(user => user.username === username)) { // check if username exists in database
    return res.status(statusCodes.FORBIDDEN).json({ message: 'Username already exists' });
  }
  try{
    const hashedPassword = await bcrypt.hash(password, 10);
    // Store the new user in the database
    // Insert user into data base
    // need to encode password
    res.status(statusCodes.CREATED).json({ message: 'User registered successfully' });
  }catch{
    res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
  }
});

// Authenticate user
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  // Find the user by username
  const user = users.find(user => user.username === username);
  // get username and password from database 
  // need to encode password
  // Check if the user exists and the password is correct
  if (!user || user.password !== password) {
    return res.status(statusCodes.FORBIDDEN).json({ message: 'Invalid username or password' });
  }
  try{
    // Compare the provided password with the hashed password
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    // Authentication successful
    res.status(statusCodes.CREATED).json({ message: 'Authentication successful' });
  }catch{
    res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
  }
});

module.exports = router;
