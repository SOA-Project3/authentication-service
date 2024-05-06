const express = require('express');
const authController = require('./controllers/authController');
const sql = require("mssql");
const app = express();
const port = 3000;

// SQL Server configuration
var config = {
    "user": "sqlserver", // Database username
    "password": "computines", // Database password
    "server": "34.69.60.15", // Server IP address
    "database": "restec-db", // Database name
    "options": {
        "encrypt": false // Disable encryption
    }
}

// Connect to SQL Server
sql.connect(config, err => {
    if (err) {
        throw err;
    }
    console.log("Connection Successful!");
});


app.use('/auth', authController);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

module.exports = {
  app
};
