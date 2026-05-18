import { Test, TestingModule } from '@nestjs/testing';
import { CurrencyService } from './currency.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const MOCK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  AUD: 1.53,
  CAD: 1.36,
  CHF: 0.89,
  CNY: 7.24,
  HKD: 7.82,
  NZD: 1.63,
  SEK: 10.42,
  KRW: 1325,
  SGD: 1.34,
  NOK: 10.55,
  MXN: 17.15,
  INR: 83.1,
  BRL: 4.97,
  ZAR: 18.63,
  TRY: 28.7,
  AED: 3.67,
};

describe('CurrencyService', () => {
  let service: CurrencyService;

  beforeEach(async () => {
    mockedAxios.get = jest.fn().mockResolvedValue({ data: { rates: MOCK_RATES } });

    const module: TestingModule = await Test.createTestingModule({
      providers: [CurrencyService],
    }).compile();

    service = module.get<CurrencyService>(CurrencyService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getSupportedCurrencies', () => {
    it('returns at least 20 currencies', () => {
      const currencies = service.getSupportedCurrencies();
      expect(currencies.length).toBeGreaterThanOrEqual(20);
    });

    it('includes major currencies', () => {
      const currencies = service.getSupportedCurrencies();
      ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'].forEach(c =>
        expect(currencies).toContain(c),
      );
    });
  });

  describe('getExchangeRate', () => {
    it('returns 1 for same currency', async () => {
      const rate = await service.getExchangeRate('USD', 'USD');
      expect(rate).toBe(1);
    });

    it('converts USD to EUR correctly', async () => {
      const rate = await service.getExchangeRate('USD', 'EUR');
      expect(rate).toBeCloseTo(0.92, 5);
    });

    it('converts EUR to GBP correctly (cross-rate)', async () => {
      const rate = await service.getExchangeRate('EUR', 'GBP');
      expect(rate).toBeCloseTo(MOCK_RATES['GBP'] / MOCK_RATES['EUR'], 5);
    });

    it('throws for unsupported from-currency', async () => {
      await expect(service.getExchangeRate('XYZ', 'USD')).rejects.toThrow('Unsupported currency: XYZ');
    });

    it('throws for unsupported to-currency', async () => {
      await expect(service.getExchangeRate('USD', 'XYZ')).rejects.toThrow('Unsupported currency: XYZ');
    });
  });

  describe('convert', () => {
    it('converts amount from USD to JPY', async () => {
      const result = await service.convert(100, 'USD', 'JPY');
      expect(result).toBeCloseTo(14950, 0);
    });

    it('rounds to 2 decimal places', async () => {
      const result = await service.convert(1, 'USD', 'EUR');
      const decimals = result.toString().split('.')[1]?.length ?? 0;
      expect(decimals).toBeLessThanOrEqual(2);
    });

    it('returns same amount for same currency', async () => {
      const result = await service.convert(42.5, 'USD', 'USD');
      expect(result).toBe(42.5);
    });
  });

  describe('caching', () => {
    it('fetches rates only once when called multiple times', async () => {
      await service.getExchangeRate('USD', 'EUR');
      await service.getExchangeRate('USD', 'GBP');
      await service.convert(100, 'EUR', 'JPY');
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('uses stale cache when API fails after initial fetch', async () => {
      await service.getExchangeRate('USD', 'EUR'); // populate cache
      mockedAxios.get = jest.fn().mockRejectedValue(new Error('Network error'));
      // Force cache expiry by manipulating internal state
      (service as any).cache.fetchedAt = 0;
      const rate = await service.getExchangeRate('USD', 'EUR');
      expect(rate).toBeCloseTo(0.92, 5);
    });
  });
});
