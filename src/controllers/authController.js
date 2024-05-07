const statusCodes = require("../constants/statusCodes");
const bcrypt = require('bcrypt');
const sql = require("mssql");



// SQL Server configuration
var config = {
  "user": "sqlserver", // Database username
  "Password": "computines", // Database Password
  "server": "34.69.60.15", // Server IP address
  "database": "restec-db", // Database name
  "options": {
      "encrypt": false // Disable encryption
  }
}

// Register a new user

const registerFunction = async (req, res) => {
  console.log("Body "+req.body)
  const { Id, Fullname, Rol, Password } = req.body;

  console.log(Password)

  try {
    // Connect to the database
    await sql.connect(config);

    // Check if the username is already taken
    const result = await sql.query`SELECT * FROM UserData WHERE Id = ${Id}`;
    console.log("Result: " + result.recordset.length)
    if (result.recordset.length > 0) {
      return res.status(statusCodes.FORBIDDEN).json({ message: 'Id already exists' });
    }

    // Hash the Password
    const hashedPassword = await bcrypt.hash(Password, 10);

    console.log("Password: "+hashedPassword)

    // Insert the new user into the database
    await sql.query`INSERT INTO UserData (Id, Fullname, Rol, Password) VALUES (${Id}, ${Fullname}, ${Rol}, ${hashedPassword})`;

    res.status(statusCodes.CREATED).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
  } finally {
    // Close the connection
    await sql.close();
  }
};

// Authenticate user
const loginFunction = async (req, res) => {
  const { Id, Password } = req.body;

  try {
    // Connect to the database
    await sql.connect(config);

    // Retrieve user from the database
    const result = await sql.query`SELECT * FROM UserData WHERE Id = ${Id}`;
    const user = result.recordset[0];

    if (!user) {
      return res.status(statusCodes.FORBIDDEN).json({ message: 'Invalid username or Password' });
    }

    // Compare passwords
    const passwordMatch = await bcrypt.compare(Password, user.Password);
    if (!passwordMatch) {
      return res.status(statusCodes.FORBIDDEN).json({ message: 'Invalid username or Password' });
    }
    console.log("UserId: "+user.Id);
    console.log("UserName: "+user.Fullname);
    res.status(statusCodes.OK).json(user);
  } catch (error) {
    console.error('Error authenticating user:', error);
    res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
  } finally {
    // Close the connection
    await sql.close();
  }
};


module.exports = {
  registerFunction,
  loginFunction
};
