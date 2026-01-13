import request from 'supertest';
import app from '../../app';
import User from '../../models/User';

describe('Auth Routes', () => {
  const validUserData = {
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    phone: '+254712345678',
    password: 'SecurePass123!',
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Registration successful!');
      expect(response.body.data.user.name).toBe(validUserData.name);
      expect(response.body.data.user.email).toBe(validUserData.email);
      expect(response.body.data.user.phone).toBe(validUserData.phone);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined(); // Password should not be returned
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();
    });

    it('should fail with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should fail with invalid phone number', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          email: 'different@example.com',
          phone: '123456', // Invalid Kenyan phone
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should fail with short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          email: 'different2@example.com',
          phone: '+254712345679',
          password: 'short',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should fail if email already exists', async () => {
      // Create first user
      await User.create(validUserData);

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          phone: '+254712345679',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        'Email already registered. Please login instead.'
      );
    });

    it('should fail if phone already exists', async () => {
      // Create first user
      await User.create(validUserData);

      // Try to register with same phone
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          email: 'different3@example.com',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Phone number already registered.');
    });

    it('should accept valid Kenyan phone formats', async () => {
      const phoneFormats = ['0712345678', '+254112345678', '0112345678'];

      for (let i = 0; i < phoneFormats.length; i++) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            ...validUserData,
            email: `user${i}@example.com`,
            phone: phoneFormats[i],
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.phone).toBe(phoneFormats[i]);
      }
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a user for login tests
      await User.create(validUserData);
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUserData.email,
          password: validUserData.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful!');
      expect(response.body.data.user.email).toBe(validUserData.email);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should fail with incorrect email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: validUserData.password,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password.');
    });

    it('should fail with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUserData.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password.');
    });

    it('should fail with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: validUserData.password,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should fail with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUserData.email,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should fail with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'not-an-email',
          password: validUserData.password,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /api/auth/me', () => {
    let token: string;

    beforeEach(async () => {
      // Register and get token
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      token = response.body.data.token;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(validUserData.email);
      expect(response.body.data.user.name).toBe(validUserData.name);
      expect(response.body.data.user.phone).toBe(validUserData.phone);
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should fail without token', async () => {
      const response = await request(app).get('/api/auth/me').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. No token provided.');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid or expired token.');
    });

    it('should fail with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. No token provided.');
    });
  });
});
