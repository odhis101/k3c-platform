import User, { IUser } from '../../models/User';

describe('User Model Tests', () => {
  const validUserData = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+254712345678',
    password: 'SecurePass123!',
  };

  describe('User Creation', () => {
    it('should create a valid user', async () => {
      const user = await User.create(validUserData);

      expect(user).toBeDefined();
      expect(user.name).toBe(validUserData.name);
      expect(user.email).toBe(validUserData.email.toLowerCase());
      expect(user.phone).toBe(validUserData.phone);
      expect(user.isVerified).toBe(false);
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('should hash password before saving', async () => {
      const user = await User.create(validUserData);
      const userWithPassword = await User.findById(user._id).select('+password');

      expect(userWithPassword?.password).toBeDefined();
      expect(userWithPassword?.password).not.toBe(validUserData.password);
      expect(userWithPassword?.password.length).toBeGreaterThan(20); // Hashed password
    });

    it('should not return password by default', async () => {
      const user = await User.create(validUserData);
      const foundUser = await User.findById(user._id);

      expect((foundUser as any).password).toBeUndefined();
    });
  });

  describe('User Validation', () => {
    it('should fail without required fields', async () => {
      const user = new User({});

      let error;
      try {
        await user.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
      expect(error.errors.email).toBeDefined();
      expect(error.errors.phone).toBeDefined();
      expect(error.errors.password).toBeDefined();
    });

    it('should fail with invalid email format', async () => {
      const user = new User({
        ...validUserData,
        email: 'invalid-email',
      });

      let error;
      try {
        await user.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.email).toBeDefined();
    });

    it('should fail with invalid phone number', async () => {
      const user = new User({
        ...validUserData,
        phone: '123456', // Invalid Kenyan phone
      });

      let error;
      try {
        await user.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.phone).toBeDefined();
    });

    it('should accept valid Kenyan phone formats', async () => {
      const phoneFormats = [
        '+254712345678',
        '+254112345678',
        '0712345678',
        '0112345678',
      ];

      for (let i = 0; i < phoneFormats.length; i++) {
        const phone = phoneFormats[i];
        const user = await User.create({
          ...validUserData,
          email: `testphone${i}@example.com`,
          phone,
        });

        expect(user).toBeDefined();
        expect(user.phone).toBe(phone);
      }
    });

    it('should fail with short name', async () => {
      const user = new User({
        ...validUserData,
        name: 'A', // Too short
      });

      let error;
      try {
        await user.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
    });

    it('should fail with short password', async () => {
      const user = new User({
        ...validUserData,
        password: 'short', // Less than 8 characters
      });

      let error;
      try {
        await user.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.password).toBeDefined();
    });

    it('should enforce unique email', async () => {
      await User.create(validUserData);

      let error;
      try {
        await User.create(validUserData);
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // MongoDB duplicate key error
    });

    it('should convert email to lowercase', async () => {
      const user = await User.create({
        ...validUserData,
        email: 'UPPERCASE@EXAMPLE.COM',
      });

      expect(user.email).toBe('uppercase@example.com');
    });
  });

  describe('Password Comparison', () => {
    it('should correctly compare valid password', async () => {
      const user = await User.create(validUserData);
      const userWithPassword = await User.findById(user._id).select('+password');

      const isMatch = await userWithPassword!.comparePassword(validUserData.password);
      expect(isMatch).toBe(true);
    });

    it('should reject invalid password', async () => {
      const user = await User.create(validUserData);
      const userWithPassword = await User.findById(user._id).select('+password');

      const isMatch = await userWithPassword!.comparePassword('WrongPassword123!');
      expect(isMatch).toBe(false);
    });
  });

  describe('User Updates', () => {
    it('should update user without re-hashing password', async () => {
      const user = await User.create(validUserData);
      const originalPasswordHash = (
        await User.findById(user._id).select('+password')
      )?.password;

      user.name = 'Jane Doe';
      await user.save();

      const updatedUser = await User.findById(user._id).select('+password');
      expect(updatedUser?.name).toBe('Jane Doe');
      expect(updatedUser?.password).toBe(originalPasswordHash);
    });

    it('should re-hash password when changed', async () => {
      const user = await User.create(validUserData);
      const originalPasswordHash = (
        await User.findById(user._id).select('+password')
      )?.password;

      const userToUpdate = await User.findById(user._id).select('+password');
      userToUpdate!.password = 'NewPassword123!';
      await userToUpdate!.save();

      const updatedUser = await User.findById(user._id).select('+password');
      expect(updatedUser?.password).not.toBe(originalPasswordHash);

      const isMatch = await updatedUser!.comparePassword('NewPassword123!');
      expect(isMatch).toBe(true);
    });
  });
});
