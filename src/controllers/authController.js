const statusCodes = require("../constants/statusCodes");
const emailer = require("../helpers/emailHelper");
const bcrypt = require("bcrypt");
const sql = require("mssql");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const { encrypt } = require("../helpers/passwordManager");
const crypto = require("crypto");

// Register a new user
const registerFunction = (req, res) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).send("Missing Authorization Header");

  const base64Credentials = authHeader.split(" ")[1];
  const credentials = Buffer.from(base64Credentials, "base64").toString(
    "ascii"
  );
  const [username, password] = credentials.split(":");

  const encryptedPassword = encrypt(password);

  const { Fullname, Rol } = req.body;

  // Check if the username is already taken
  new sql.Request().query(
    `SELECT * FROM UserData WHERE Id = '${username}'`,
    async (err, result) => {
      if (err) {
        console.error("Error executing query:", err);
        return res
          .status(statusCodes.INTERNAL_SERVER_ERROR)
          .json({ message: "Internal server error" });
      }

      if (result.recordset.length > 0) {
        return res.status(statusCodes.OK).json("Id already exists");
      }

      new sql.Request()
        .input("Id", sql.NVarChar, username)
        .input("Fullname", sql.NVarChar, Fullname)
        .input("Rol", sql.NVarChar, Rol)
        .input("Password", sql.NVarChar, encryptedPassword)
        .query(
          "INSERT INTO UserData (Id, Fullname, Rol, Password) VALUES (@Id, @Fullname, @Rol, @Password)",
          (insertErr, insertResult) => {
            if (insertErr) {
              console.error("Error inserting user into database:", insertErr);
              return res
                .status(statusCodes.INTERNAL_SERVER_ERROR)
                .json({ message: "Internal server error" });
            }

            console.log("User registered successfully");
            res
              .status(statusCodes.OK)
              .json({ message: "User registered successfully" });
          }
        );
    }
  );
};

// Función de inicio de sesión
const loginFunction = (req, res) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).send("Missing Authorization Header");

  const base64Credentials = authHeader.split(" ")[1];
  const credentials = Buffer.from(base64Credentials, "base64").toString(
    "ascii"
  );
  const [username, password] = credentials.split(":");

  new sql.Request().query(
    `SELECT ud.Id AS UserId, ud.Fullname, ud.Rol, ud.Password, COALESCE(b.Id, NULL) AS BranchId FROM UserData ud LEFT JOIN  Branch b ON ud.Id = b.Admin WHERE  ud.Id = '${username}'`,
    (err, result) => {
      if (err) {
        console.error("Error ejecutando la consulta:", err);
        return res
          .status(statusCodes.INTERNAL_SERVER_ERROR)
          .json({ message: "Internal server error" });
      }

      const user = result.recordset[0];
      if (!user) {
        return res
          .status(statusCodes.UNAUTHORIZED)
          .json({ message: "Invalid username or password" });
      }
      const secretKey = process.env.SECRET_KEY;
      const [iv, encryptedPassword] = user.Password.split(":");
      const decipher = crypto.createDecipheriv(
        "aes-256-cbc",
        Buffer.from(secretKey, "hex"),
        Buffer.from(iv, "hex")
      );
      let decrypted = decipher.update(Buffer.from(encryptedPassword, "hex"));
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      if (decrypted.toString() === password) {
        const tokenKey = process.env.TOKEN_KEY;
        const token = jwt.sign(
          { userId: user.Id, username: user.Username },
          tokenKey,
          { expiresIn: "1h" }
        );

        res.status(statusCodes.OK).json({ user: user, jwt: token });
      } else {
        res.status(401).send("Invalid username or password");
      }
    }
  );
};

const getUserById = (req, res) => {
  const { Id } = req.query;
  console.log(`SELECT * FROM UserData WHERE Id = '${Id}'`);
  // Execute the SQL query to retrieve user data
  new sql.Request().query(
    `SELECT * FROM UserData WHERE Id = '${Id}'`,
    (err, result) => {
      if (err) {
        console.error("Error executing query:", err);
        return res
          .status(statusCodes.INTERNAL_SERVER_ERROR)
          .json({ message: "Internal server error" });
      }
      // Check if user exists
      const user = result.recordset[0];
      if (!user) {
        return res
          .status(statusCodes.OK)
          .json({ message: "Invalid username or password" });
      }
      res.status(statusCodes.OK).json(user);
    }
  );
};

async function deleteUser(req, res) {
  const { Id } = req.query;

  try {
    // Verificar si el usuario existe antes de intentar eliminarlo
    const checkUserRequest = new sql.Request();
    checkUserRequest.input("Id", sql.VarChar, Id);
    const checkUserResult = await checkUserRequest.query(
      "SELECT * FROM UserData WHERE Id = @Id"
    );

    if (checkUserResult.recordset.length === 0) {
      const message = "User not found";
      console.log(message);
      return res.status(statusCodes.OK).json({ error: message });
    }

    // Eliminar el usuario
    const deleteUserRequest = new sql.Request();
    deleteUserRequest.input("Id", sql.VarChar, Id);
    await deleteUserRequest.query("DELETE FROM UserData WHERE Id = @Id");

    // Eliminar las reservas asociadas
    const deleteReservationsRequest = new sql.Request();
    deleteReservationsRequest.input("Id", sql.VarChar, Id);
    const deleteReservationsResult = await deleteReservationsRequest.query(
      "DELETE FROM ScheduleSlots WHERE UserId = @Id"
    );

    let emailMessage = "Your user name has been deleted";
    if (deleteReservationsResult.rowsAffected[0] === 0) {
      emailMessage += " but no associated reservations found to be deleted";
    }
    console.log(emailMessage);

    // Enviar notificación por correo electrónico
    emailer.sendDeleteUserEmail(Id, emailMessage);

    return res.status(statusCodes.OK).json({ message: emailMessage });
  } catch (err) {
    console.error("Error executing query:", err);
    const message = "Error occurred while deleting user or reservations";
    await emailer.sendDeleteUserEmail(Id, message);
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: message });
  }
}

async function resetPassword(req, res) {
  const { Id } = req.query;

  try {
    // Verificar si el usuario existe
    const userRequest = new sql.Request();
    userRequest.input("Id", sql.VarChar, Id);
    const userResult = await userRequest.query(
      "SELECT * FROM UserData WHERE Id = @Id"
    );

    if (userResult.recordset.length === 0) {
      const message = "User does not exist.";
      console.log(message);
      return res.status(statusCodes.OK).json({ error: message });
    }

    console.log("User exists.");

    // Generar una contraseña temporal aleatoria
    const tempPassword = Math.random().toString(36).slice(-8);

    const encrypted = decrypt.encryptPassword(tempPassword);

    // Actualizar la contraseña del usuario en la base de datos con la contraseña temporal hash
    const updateRequest = new sql.Request();
    updateRequest.input("Password", sql.VarChar, hashPassword);
    updateRequest.input("Id", sql.VarChar, Id);
    await updateRequest.query(
      "UPDATE UserData SET Password = @Password WHERE Id = @Id"
    );

    console.log("Password reset successfully.");

    // Enviar la contraseña temporal al correo electrónico del usuario
    await emailer.sendTempPasswordEmail(Id, tempPassword);

    return res
      .status(statusCodes.OK)
      .json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("Error executing query:", err);
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "An error occurred while resetting the password" });
  }
}

async function updatePassword(req, res) {
  const { Id, Password } = req.body;

  try {
    // Verificar si el usuario existe
    const userRequest = new sql.Request();
    userRequest.input("Id", sql.VarChar, Id);
    const userResult = await userRequest.query(
      "SELECT * FROM UserData WHERE Id = @Id"
    );

    if (userResult.recordset.length === 0) {
      const message = "User does not exist.";
      console.log(message);
      return res.status(statusCodes.OK).json({ error: message });
    }

    console.log("User exists.");

    // Actualizar la contraseña del usuario en la base de datos con la contraseña hash
    const updateRequest = new sql.Request();
    updateRequest.input("Password", sql.VarChar, hashPassword);
    updateRequest.input("Id", sql.VarChar, Id);
    await updateRequest.query(
      "UPDATE UserData SET Password = @Password WHERE Id = @Id"
    );

    console.log("Password updated successfully.");

    // Enviar confirmación de actualización de contraseña al correo electrónico del usuario
    await emailer.sendPasswordConfirmation(Id);

    return res
      .status(statusCodes.OK)
      .json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error executing query:", err);
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "An error occurred while updating the password" });
  }
}

module.exports = {
  registerFunction,
  loginFunction,
  getUserById,
  deleteUser,
  resetPassword,
  updatePassword,
};
