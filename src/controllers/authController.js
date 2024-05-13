const statusCodes = require("../constants/statusCodes");
const bcrypt = require('bcrypt');
const sql = require("mssql");


// Register a new user
const registerFunction = (req, res) => {
  const { Id, Fullname, Rol, Password } = req.body;

  // Check if the username is already taken
  new sql.Request().query(`SELECT * FROM UserData WHERE Id = '${Id}'`, async (err, result) => {
    if (err) {
      console.error("Error executing query:", err);
      return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }

    if (result.recordset.length > 0) {
      return res.status(statusCodes.FORBIDDEN).json('Id already exists');
    }

    try {
      new sql.Request()
      .input('Id', sql.NVarChar, Id)
      .input('Fullname', sql.NVarChar, Fullname)
      .input('Rol', sql.NVarChar, Rol)
      .input('Password', sql.NVarChar, Password)
      .query('INSERT INTO UserData (Id, Fullname, Rol, Password) VALUES (@Id, @Fullname, @Rol, @Password)', (insertErr, insertResult) => {
        if (insertErr) {
          console.error("Error inserting user into database:", insertErr);
          return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
        }

        console.log('User registered successfully');
        res.status(statusCodes.CREATED).json({ message: 'User registered successfully' });
      });
    } catch (hashingError) {
      console.error('Error hashing password:', hashingError);
      return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }
  });
};

const loginFunction = (req, res) => {
  const { Id, Password } = req.body;
  // Execute the SQL query to retrieve user data
  new sql.Request().query(`SELECT * FROM UserData WHERE Id = '${Id}'`, (err, result) => {
    if (err) {
      console.error("Error executing query:", err);
      return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }

    // Check if user exists
    const user = result.recordset[0];
    if (!user) {
      return res.status(statusCodes.FORBIDDEN).json({ message: 'Invalid username or password' });
    }

    // Compare passwords
    bcrypt.compare(Password, user.Password, (compareErr, passwordMatch) => {
      if (compareErr) {
        console.error("Error comparing passwords:", compareErr);
        return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
      }

      if (!passwordMatch) {
        return res.status(statusCodes.FORBIDDEN).json({ message: 'Invalid username or password' });
      }

      // Passwords match, return user data
      res.status(statusCodes.OK).json(user);
    });
  });
};

const getUserById = (req, res) => {
  const { Id } = req.query;
  console.log(`SELECT * FROM UserData WHERE Id = '${Id}'`);
  // Execute the SQL query to retrieve user data
  new sql.Request().query(`SELECT * FROM UserData WHERE Id = '${Id}'`, (err, result) => {
    if (err) {
      console.error("Error executing query:", err);
      return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }

    // Check if user exists
    const user = result.recordset[0];
    if (!user) {
      return res.status(statusCodes.FORBIDDEN).json({ message: 'Invalid username or password' });
    }
    res.status(statusCodes.OK).json(user);
  });
};


const deleteUser = (message) => {

  const data = message.data.toString();
  console.log('Received message:', data);
  const { Id } = JSON.parse(data);
  
  const deleteUserQuery = `DELETE FROM UserData WHERE Id = '${Id}'`;
  console.log(deleteUserQuery);
  
  const deleteReservationsQuery = `DELETE FROM ScheduleSlots WHERE UserId = '${Id}'`;

  // Execute the delete queries
  new sql.Request().query(deleteUserQuery, (err, result) => {
    if (err) {
      console.error("Error deleting user:", err);
    }

    // Check if any rows were affected by the delete query
    if (result.rowsAffected[0] === 0) {
      console.log('User not found');
    }

    new sql.Request().query(deleteReservationsQuery, (err, result) => {
      if (err) {
        console.error("Error deleting reservations:", err);
      }

      // Check if any rows were affected by the delete query
      if (result.rowsAffected[0] === 0) {
        console.log("User deleted but no associated reservations found.");
      }

      // Acknowledge the message to remove it from the subscription
      message.ack();
      // SEND EMAIL    
      console.log("Send Email")
    });
  });
};


module.exports = {
  registerFunction,
  loginFunction,
  getUserById,
  deleteUser
};
