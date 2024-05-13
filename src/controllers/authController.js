const statusCodes = require("../constants/statusCodes");
const emailer = require("../helpers/emailHelper");
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

  new sql.Request().query(deleteUserQuery, (err, result) => {
    if (err) {
      console.error("Error deleting user:", err);
    }

    if (result.rowsAffected[0] === 0) {
      console.log('User not found');
    }

    new sql.Request().query(deleteReservationsQuery, (err, result) => {
      if (err) {
        console.error("Error deleting reservations:", err);
      }else{
        let emailMessage = 'Your user name has been deleted';
        if (result.rowsAffected[0] === 0) {
          emailMessage += " but no associated reservations found to be deleted"
          console.log(emailMessage);
        }
        
        message.ack();
        emailer.sendDeleteUserEmail(Id, emailMessage);
      }

    });
  });
};


const resetPassword = (message) => {
  const data = message.data.toString();
  console.log('Received message:', data);
  const { Id } = JSON.parse(data);

  // Check if user exists
  const userQuery = `SELECT * FROM UserData WHERE Id = '${Id}'`;
  new sql.Request().query(userQuery, (err, result) => {
    if (err) {
      console.error("Error checking user existence:", err);
      // Handle error, maybe return an error response
    } else {
      // If no rows are returned, the user does not exist
      if (result.recordset.length === 0) {
        console.log("User does not exist.");
        // Handle the case where the user does not exist, maybe return an error response
      } else {
        console.log("User exists.");
        // Generate a random temporary password
        const tempPassword = Math.random().toString(36).slice(-8);

        // Update the user's password in the database with the temporary password
        const updateQuery = `UPDATE UserData SET Password = '${tempPassword}' WHERE Id = '${Id}'`;

        // Execute the update query
        new sql.Request().query(updateQuery, (err, result) => {
          if (err) {
            console.error("Error updating password:", err);
            // Handle error, maybe return an error response
          } else {
            console.log("Password reset successfully.");
            message.ack();
            emailer.sendTempPasswordEmail(Id, tempPassword);
          }
        });
      }
    }
  });
};


module.exports = {
  registerFunction,
  loginFunction,
  getUserById,
  deleteUser,
  resetPassword
};
