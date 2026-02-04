import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { OtpLog } from './entities/otp-log.entity';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: Repository<User>;
  let otpRepo: Repository<OtpLog>;
  let dataSource: DataSource;
  let eventEmitter: EventEmitter2;

  // Mock Data
  const mockUser = { id: 'user-123', email: 'test@example.com', isVerified: false };
  const mockOtp = { 
    id: 'otp-123', 
    code: '123456', 
    expiresAt: new Date(Date.now() + 10000), // Future date
    isUsed: false,
    user: mockUser
  };

  // Mocking the Transaction Manager
  const mockEntityManager = {
    create: jest.fn().mockImplementation((entity, dto) => dto),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, id: 'new-id' })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(OtpLog),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn().mockImplementation(async (cb) => {
              return await cb(mockEntityManager);
            }),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get(getRepositoryToken(User));
    otpRepo = module.get(getRepositoryToken(OtpLog));
    dataSource = module.get(DataSource);
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a user and emit an event', async () => {
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(null); // User doesn't exist
      jest.spyOn(bcrypt, 'genSalt').mockImplementation(() => 'salt');
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => 'hashed_password');

      const result = await service.register('test@example.com', 'password123');

      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(dataSource.transaction).toHaveBeenCalled();
      
      // Verify actions inside the transaction
      expect(mockEntityManager.create).toHaveBeenCalledTimes(2); // User + OTP
      expect(mockEntityManager.save).toHaveBeenCalledTimes(2);
      expect(eventEmitter.emit).toHaveBeenCalledWith('user.registered', expect.any(Object));
      expect(result).toEqual({ message: 'Registration successful. Check your email for OTP.' });
    });

    it('should throw ConflictException if email exists', async () => {
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as User);

      await expect(service.register('test@example.com', 'pass')).rejects.toThrow(ConflictException);
      expect(dataSource.transaction).not.toHaveBeenCalled(); // Should fail early
    });
  });

  describe('verifyOtp', () => {
    it('should successfully verify a valid OTP', async () => {
      jest.spyOn(otpRepo, 'findOne').mockResolvedValue(mockOtp as OtpLog);

      const result = await service.verifyOtp('test@example.com', '123456');

      expect(mockUser.isVerified).toBe(true);
      expect(mockOtp.isUsed).toBe(true);
      expect(userRepo.save).toHaveBeenCalledWith(mockUser);
      expect(otpRepo.save).toHaveBeenCalledWith(mockOtp);
      expect(result.message).toContain('verified successfully');
    });

    it('should throw BadRequest if OTP is invalid', async () => {
      jest.spyOn(otpRepo, 'findOne').mockResolvedValue(null);

      await expect(service.verifyOtp('test', '000000')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequest if OTP is expired', async () => {
      const expiredOtp = { ...mockOtp, expiresAt: new Date(Date.now() - 10000) };
      jest.spyOn(otpRepo, 'findOne').mockResolvedValue(expiredOtp as OtpLog);

      await expect(service.verifyOtp('test', '123456')).rejects.toThrow(BadRequestException);
    });
  });
});