const express = require('express');
const authController = require('../controllers/authController');

const app = express();
const port = 3000;

app.use('/auth', authController);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
