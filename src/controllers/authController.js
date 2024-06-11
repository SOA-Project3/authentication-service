const statusCodes = require("../constants/statusCodes");
const emailer = require("../helpers/emailHelper");
const bcrypt = require('bcrypt');
const sql = require("mssql");
const jwt = require('jsonwebtoken');
const decrypt  = require("../helpers/passwordManager");



// Register a new user
const registerFunction = (req, res) => {
  const { Id, Fullname, Rol } = req.body;
  const Password = req.headers['password'];

  // Check if the username is already taken
  new sql.Request().query(`SELECT * FROM UserData WHERE Id = '${Id}'`, async (err, result) => {
    if (err) {
      console.error("Error executing query:", err);
      return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }

    if (result.recordset.length > 0) {
      return res.status(statusCodes.OK).json('Id already exists');
    }

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
        res.status(statusCodes.OK).json({ message: 'User registered successfully' });
      }); 
  });
};

// Función de inicio de sesión
const loginFunction = (req, res) => {
  const { Id } = req.body;
  const Password = req.headers['password'];


  new sql.Request().query(`SELECT * FROM UserData WHERE Id = '${Id}'`, (err, result) => {
    if (err) {
      console.error("Error ejecutando la consulta:", err);
      return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }

    const user = result.recordset[0];
    if (!user) {
      return res.status(statusCodes.OK).json({ message: 'Invalid username or password' });
    }

    try{
      const commingPassword = decrypt.decryptPassword(Password);
      const currentPassword = decrypt.decryptPassword(user.Password);
      if (commingPassword == currentPassword){
        const token = jwt.sign(
          { userId: user.Id, username: user.Username },
          'pepe', // Clave secreta segura
          { expiresIn: '1h' }
        );
    
      res.status(statusCodes.OK).json({ user, token });
      }else{
        res.status(statusCodes.OK).json({ message: 'Invalid username or password' });
        }
    }catch{
      res.status(statusCodes.OK).json({ message: 'Invalid username or password' });
    }
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
      return res.status(statusCodes.OK).json({ message: 'Invalid username or password' });
    }
    res.status(statusCodes.OK).json(user);
  });
};


async function deleteUser(req, res) {
  const { Id } = req.query;

  try {
    // Verificar si el usuario existe antes de intentar eliminarlo
    const checkUserRequest = new sql.Request();
    checkUserRequest.input('Id', sql.VarChar, Id);
    const checkUserResult = await checkUserRequest.query('SELECT * FROM UserData WHERE Id = @Id');

    if (checkUserResult.recordset.length === 0) {
      const message = 'User not found';
      console.log(message);
      return res.status(statusCodes.OK).json({ error: message });
    }

    // Eliminar el usuario
    const deleteUserRequest = new sql.Request();
    deleteUserRequest.input('Id', sql.VarChar, Id);
    await deleteUserRequest.query('DELETE FROM UserData WHERE Id = @Id');

    // Eliminar las reservas asociadas
    const deleteReservationsRequest = new sql.Request();
    deleteReservationsRequest.input('Id', sql.VarChar, Id);
    const deleteReservationsResult = await deleteReservationsRequest.query('DELETE FROM ScheduleSlots WHERE UserId = @Id');

    let emailMessage = 'Your user name has been deleted';
    if (deleteReservationsResult.rowsAffected[0] === 0) {
      emailMessage += " but no associated reservations found to be deleted";
    }
    console.log(emailMessage);

    // Enviar notificación por correo electrónico
    emailer.sendDeleteUserEmail(Id, emailMessage);

    return res.status(statusCodes.OK).json({ message: emailMessage });

  } catch (err) {
    console.error("Error executing query:", err);
    const message = 'Error occurred while deleting user or reservations';
    await emailer.sendDeleteUserEmail(Id, message);
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ error: message });
  } 
};

async function resetPassword(req, res) {
  const { Id } = req.query;

  try {
    // Verificar si el usuario existe
    const userRequest = new sql.Request();
    userRequest.input('Id', sql.VarChar, Id);
    const userResult = await userRequest.query('SELECT * FROM UserData WHERE Id = @Id');

    if (userResult.recordset.length === 0) {
      const message = "User does not exist.";
      console.log(message);
      return res.status(statusCodes.OK).json({ error: message });
    }

    console.log("User exists.");

    // Generar una contraseña temporal aleatoria
    const tempPassword = Math.random().toString(36).slice(-8);

    // Hash de la contraseña temporal
    const hashPassword = await bcrypt.hash(tempPassword, 10);

    // Actualizar la contraseña del usuario en la base de datos con la contraseña temporal hash
    const updateRequest = new sql.Request();
    updateRequest.input('Password', sql.VarChar, hashPassword);
    updateRequest.input('Id', sql.VarChar, Id);
    await updateRequest.query('UPDATE UserData SET Password = @Password WHERE Id = @Id');

    console.log("Password reset successfully.");

    // Enviar la contraseña temporal al correo electrónico del usuario
    await emailer.sendTempPasswordEmail(Id, tempPassword);

    return res.status(statusCodes.OK).json({ message: "Password reset successfully" });

  } catch (err) {
    console.error("Error executing query:", err);
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ error: "An error occurred while resetting the password" });
  } 
};

async function updatePassword(req, res) {
  const { Id, Password } = req.body;

  try {
    // Verificar si el usuario existe
    const userRequest = new sql.Request();
    userRequest.input('Id', sql.VarChar, Id);
    const userResult = await userRequest.query('SELECT * FROM UserData WHERE Id = @Id');

    if (userResult.recordset.length === 0) {
      const message = "User does not exist.";
      console.log(message);
      return res.status(statusCodes.OK).json({ error: message });
    }

    console.log("User exists.");

    // Hash de la nueva contraseña
    const hashPassword = await bcrypt.hash(Password, 10);

    // Actualizar la contraseña del usuario en la base de datos con la contraseña hash
    const updateRequest = new sql.Request();
    updateRequest.input('Password', sql.VarChar, hashPassword);
    updateRequest.input('Id', sql.VarChar, Id);
    await updateRequest.query('UPDATE UserData SET Password = @Password WHERE Id = @Id');

    console.log("Password updated successfully.");

    // Enviar confirmación de actualización de contraseña al correo electrónico del usuario
    await emailer.sendPasswordConfirmation(Id);

    return res.status(statusCodes.OK).json({ message: "Password updated successfully" });

  } catch (err) {
    console.error("Error executing query:", err);
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ error: "An error occurred while updating the password" });
  }
};




module.exports = {
  registerFunction,
  loginFunction,
  getUserById,
  deleteUser,
  resetPassword,
  updatePassword
};
