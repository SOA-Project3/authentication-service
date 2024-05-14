const { mockRequest, mockResponse } = require('jest-mock-req-res');
const sql = require('mssql');
const bcrypt = require('bcrypt');
const { registerFunction, loginFunction, getUserById, updatePassword} = require('./src/controllers/authController');
jest.mock('bcrypt');
jest.mock('mssql');
jest.mock('./src/helpers/emailHelper'); // Mocking the email helper module

describe('registerFunction', () => {
  it('should register a new user but Id already exist', async () => {
    const req = mockRequest({
      body: {
        Id: 'testId',
        Fullname: 'Test User',
        Rol: 'user',
        Password: 'testPassword'
      }
    });
    const res = mockResponse();

    sql.Request.mockImplementation(() => {
      return {
        query: jest.fn().mockImplementation((query, callback) => {
          if (query.includes('SELECT * FROM UserData WHERE Id =')) {
            // Mock that user does not exist
            callback(null, { recordset: [1] });
          }
        }),
        input: jest.fn(),
      };
    });

    await registerFunction(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('loginFunction', () => {
  it('should successfully login user with correct credentials', async () => {
    const req = mockRequest({
      body: {
        Id: 'testId',
        Password: 'testPassword'
      }
    });
    const res = mockResponse();

    const mockUser = { Id: 'testId', Password: 'hashedPassword' };
    const mockResult = { recordset: [mockUser] };

    sql.Request.mockImplementation(() => {
      return {
        query: jest.fn().mockImplementation((query, callback) => {
          // Mock successful user retrieval
          callback(null, mockResult);
        })
      };
    });

    bcrypt.compare.mockImplementation((password, hashedPassword, callback) => {
      // Mock password comparison
      callback(null, true); // Passwords match
    });

    await loginFunction(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockUser);
  });

  it('should return Forbidden status when user does not exist', async () => {
    const req = mockRequest({
      body: {
        Id: 'nonExistingId',
        Password: 'testPassword'
      }
    });
    const res = mockResponse();

    const mockResult = { recordset: [] }; // Empty recordset indicates user doesn't exist

    sql.Request.mockImplementation(() => {
      return {
        query: jest.fn().mockImplementation((query, callback) => {
          // Mock user not found
          callback(null, mockResult);
        })
      };
    });

    await loginFunction(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid username or password' });
  });

  it('should return Internal Server Error status when there is a database error', async () => {
    const req = mockRequest({
      body: {
        Id: 'testId',
        Password: 'testPassword'
      }
    });
    const res = mockResponse();

    sql.Request.mockImplementation(() => {
      return {
        query: jest.fn().mockImplementation((query, callback) => {
          // Mock database error
          callback(new Error('Database error'));
        })
      };
    });

    await loginFunction(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
  });

  it('should return Internal Server Error status when there is a bcrypt error', async () => {
    const req = mockRequest({
      body: {
        Id: 'testId',
        Password: 'testPassword'
      }
    });
    const res = mockResponse();

    const mockResult = { recordset: [{ Id: 'testId', Password: 'hashedPassword' }] };

    sql.Request.mockImplementation(() => {
      return {
        query: jest.fn().mockImplementation((query, callback) => {
          // Mock successful user retrieval
          callback(null, mockResult);
        })
      };
    });

    bcrypt.compare.mockImplementation((password, hashedPassword, callback) => {
      // Mock bcrypt error
      callback(new Error('Bcrypt error'));
    });

    await loginFunction(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
  });
});

describe('getUserById', () => {
  it('should return user data when user with provided ID exists', async () => {
    const req = mockRequest({
      query: {
        Id: 'testId'
      }
    });
    const res = mockResponse();

    const mockUser = { Id: 'testId', Fullname: 'Test User', Rol: 'user', Password: 'hashedPassword' };
    const mockResult = { recordset: [mockUser] };

    sql.Request.mockImplementation(() => {
      return {
        query: jest.fn().mockImplementation((query, callback) => {
          // Mock successful user retrieval
          callback(null, mockResult);
        })
      };
    });

    await getUserById(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockUser);
  });

  it('should return Forbidden status when user with provided ID does not exist', async () => {
    const req = mockRequest({
      query: {
        Id: 'nonExistingId'
      }
    });
    const res = mockResponse();

    const mockResult = { recordset: [] }; // Empty recordset indicates user doesn't exist

    sql.Request.mockImplementation(() => {
      return {
        query: jest.fn().mockImplementation((query, callback) => {
          // Mock user not found
          callback(null, mockResult);
        })
      };
    });

    await getUserById(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid username or password' });
  });

  it('should return Internal Server Error status when there is a database error', async () => {
    const req = mockRequest({
      query: {
        Id: 'testId'
      }
    });
    const res = mockResponse();

    sql.Request.mockImplementation(() => {
      return {
        query: jest.fn().mockImplementation((query, callback) => {
          // Mock database error
          callback(new Error('Database error'));
        })
      };
    });

    await getUserById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
  });
});

