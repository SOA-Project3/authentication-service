const express = require("express");
const bodyParser = require("body-parser");
const authController = require("./controllers/authController");
const { PubSub } = require("@google-cloud/pubsub");
const sql = require("mssql");
const verifyToken = require("./helpers/verifyToken");
const cors = require("cors");
require("dotenv").config();

const app = express();
const router = express.Router();
const port = 3001;

const keyFilename = process.env.keyfile;
const pubsub = new PubSub({
  keyFilename: keyFilename,
});

// Use the cors middleware
app.use(cors());

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// SQL Server configuration
var config = {
  user: "sqlserver", // Database username
  password: "computines", // Database password
  server: "34.69.60.15", // Server IP address
  database: "restec-db", // Database name
  options: {
    encrypt: false, // Disable encryption
  },
};

// Connect to SQL Server
sql.connect(config, (err) => {
  if (err) {
    throw err;
  }
  console.log("Connection Successful!");
});

router.post("/register", authController.registerFunction);
router.post("/login", authController.loginFunction);
router.get("/getUserbyId", verifyToken, authController.getUserById);
router.delete("/deleteUser", verifyToken, authController.deleteUser);
router.get("/resetPassword", verifyToken, authController.resetPassword);
router.post("/updatePassword", verifyToken, authController.updatePassword);

app.use(router);
app.listen(port, () => {
  console.log(`Server is running at ${port}`);
});

module.exports = {
  app,
};
