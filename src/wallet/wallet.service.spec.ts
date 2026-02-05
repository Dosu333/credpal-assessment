import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { Currency } from '../system/entities/currency.entity';
import { LedgerEntryType } from './entities/ledger.entity';
import { EXTERNAL_PROVIDER_ID } from 'src/common/constants/system-wallets.constant';

describe('WalletService (Double-Entry Logic)', () => {
  let service: WalletService;
  let dataSource: DataSource;
  let currencyRepo: Repository<Currency>;

  // Mock Data
  const mockUser = { id: 'user-123' };
  const mockCurrency = { code: 'NGN', isActive: true, decimalPlaces: 2 } as Currency;
  
  // Mock Transaction Manager
  const mockManager = {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((entity, dto) => dto),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, id: 'saved-id' })),
    getRepository: jest.fn().mockReturnValue({
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: getRepositoryToken(Currency),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: {
            // THE TRICK: Instantly execute the callback with our mock manager
            transaction: jest.fn().mockImplementation(async (cb) => cb(mockManager)),
          },
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    dataSource = module.get(DataSource);
    currencyRepo = module.get(getRepositoryToken(Currency));
  });

  afterEach(() => jest.clearAllMocks());

  describe('fundWallet (Double-Entry)', () => {
    it('should perform a complete double-entry transaction', async () => {
      // Arrange
      jest.spyOn(currencyRepo, 'findOne').mockResolvedValue(mockCurrency);
      
      // Mock: Transaction does NOT exist yet (Idempotency)
      mockManager.findOne.mockResolvedValueOnce(null); 
      
      // Mock: Wallets exist
      mockManager.findOne.mockResolvedValueOnce({ id: 'user-wallet-id' }); // User Wallet
      mockManager.findOne.mockResolvedValueOnce({ id: EXTERNAL_PROVIDER_ID }); // System Wallet

      // Mock: Balance Rows (Return null initially so it creates them)
      const mockBalanceRepo = {
        findOne: jest.fn().mockResolvedValue({ balance: 0 }), // Existing balance 0
        save: jest.fn(),
        create: jest.fn(),
      };
      mockManager.getRepository.mockReturnValue(mockBalanceRepo);

      const amount = 5000;
      await service.fundWallet(mockUser.id, amount, 'NGN', 'ref-123');

      // Verify Transaction Header Created
      expect(mockManager.save).toHaveBeenCalledWith(expect.objectContaining({
        amount: 5000,
        reference: 'ref-123',
        status: 'SUCCESS'
      }));

      // Verify Ledger Entries
      const saveCalls = mockManager.save.mock.calls;
      const ledgerCalls = saveCalls.filter(call => call[0].entryType !== undefined);
      
      expect(ledgerCalls).toHaveLength(2);
      
      // Check Debit Entry (External Provider)
      expect(ledgerCalls).toEqual(
        expect.arrayContaining([
          [expect.objectContaining({
            wallet: { id: EXTERNAL_PROVIDER_ID },
            entryType: LedgerEntryType.DEBIT,
            amount: 5000
          })],
          [expect.objectContaining({
            wallet: { id: 'user-wallet-id' }, // User wallet
            entryType: LedgerEntryType.CREDIT,
            amount: 5000
          })]
        ])
      );

      // Verify Balance Updates
      expect(mockBalanceRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should throw if currency is invalid', async () => {
      jest.spyOn(currencyRepo, 'findOne').mockResolvedValue(null);

      await expect(service.fundWallet('u1', 100, 'FAKE', 'ref'))
        .rejects.toThrow(BadRequestException);

      // Verify no DB writes happened
      expect(dataSource.transaction).toHaveBeenCalled();
      expect(mockManager.save).not.toHaveBeenCalled();
    });

    it('should return existing transaction if reference is duplicate (Idempotency)', async () => {
      jest.spyOn(currencyRepo, 'findOne').mockResolvedValue(mockCurrency);
      // Mock existing transaction
      mockManager.findOne.mockResolvedValueOnce({ id: 'tx-existing', reference: 'ref-123' });

      const result = await service.fundWallet('u1', 100, 'NGN', 'ref-123');

      expect(result).toEqual({ id: 'tx-existing', reference: 'ref-123' });
      // Ensure no new ledger entries were created
      expect(mockManager.save).not.toHaveBeenCalled();
    });
  });
});
