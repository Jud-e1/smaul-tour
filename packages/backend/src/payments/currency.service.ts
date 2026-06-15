import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';

const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'AUD',
  'CAD',
  'CHF',
  'CNY',
  'HKD',
  'NZD',
  'SEK',
  'KRW',
  'SGD',
  'NOK',
  'MXN',
  'INR',
  'BRL',
  'ZAR',
  'TRY',
  'AED',
];

const API_URL = process.env.EXCHANGE_RATE_API_URL ?? 'https://open.er-api.com/v6/latest/USD';

interface RateCache {
  rates: Record<string, number>;
  fetchedAt: number;
}

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private cache: RateCache | null = null;

  getSupportedCurrencies(): string[] {
    return [...SUPPORTED_CURRENCIES];
  }

  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    const rates = await this.getRates();

    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    if (from === to) return 1;

    const fromRate = rates[from];
    const toRate = rates[to];

    if (!fromRate) throw new Error(`Unsupported currency: ${from}`);
    if (!toRate) throw new Error(`Unsupported currency: ${to}`);

    return toRate / fromRate;
  }

  async convert(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    return Math.round(amount * rate * 100) / 100;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async refreshRates(): Promise<void> {
    this.logger.log('Refreshing exchange rates...');
    this.cache = null;
    await this.getRates();
  }

  private async getRates(): Promise<Record<string, number>> {
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (this.cache && Date.now() - this.cache.fetchedAt < oneDayMs) {
      return this.cache.rates;
    }

    try {
      const response = await axios.get<{ rates: Record<string, number> }>(API_URL);
      const rates = response.data.rates;
      this.cache = { rates, fetchedAt: Date.now() };
      this.logger.log('Exchange rates updated successfully');
      return rates;
    } catch (error) {
      this.logger.error('Failed to fetch exchange rates', error);
      if (this.cache) {
        this.logger.warn('Using stale exchange rate cache');
        return this.cache.rates;
      }
      throw new Error('Exchange rates unavailable');
    }
  }
}
