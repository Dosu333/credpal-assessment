import {
  Injectable,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { lastValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Currency } from 'src/system/entities/currency.entity';

@Injectable()
export class FxService {
  private readonly logger = new Logger(FxService.name);
  private readonly baseUrl = 'https://v6.exchangerate-api.com/v6';
  private readonly SOFT_TTL_MS = 30 * 1000; // 30 Seconds

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectRepository(Currency)
        private currencyRepo: Repository<Currency>,
  ) {}

  async getExchangeRate(from: string, to: string): Promise<number> {
    const pair = `fx:rate:${from.toUpperCase()}:${to.toUpperCase()}`;

    // 1. Check Cache
    const cachedData = await this.cacheManager.get<CachedRate>(pair);

    if (cachedData) {
      const age = Date.now() - cachedData.timestamp;

      // When Data is Fresh (< 30s) -> Return immediately
      if (age < this.SOFT_TTL_MS) {
        return cachedData.rate;
      }

      // When Data is Stale (> 30s) -> Return stale & refresh in background
      this.fetchAndCacheRate(from, to, pair).catch((err) =>
        this.logger.error(`Background refresh failed for ${pair}`, err),
      );
      return cachedData.rate;
    }

    // Handle Cache Miss
    return this.fetchAndCacheRate(from, to, pair);
  }

  async getMarketRates(baseCurrency: string) {
    const base = baseCurrency.toUpperCase();
    const cacheKey = `fx:market:${base}`;

    // Check Cache
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    // Fetch Supported Currencies (DB)
    const supportedCurrencies = await this.currencyRepo.find({
      where: { isActive: true },
      select: ['code'],
    });

    // Fetch Rates from API
    const apiKey = this.configService.get<string>('FX_API_KEY');
    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.baseUrl}/${apiKey}/latest/${base}`),
      );
      const apiRates = response.data.conversion_rates

      // Filter & Format
      const filteredRates = {};
      supportedCurrencies.forEach((c) => {
        if (apiRates[c.code]) {
          filteredRates[c.code] = apiRates[c.code];
        }
      });

      // Cache
      await this.cacheManager.set(cacheKey, filteredRates, 60 * 1000);

      return {
        base: base,
        timestamp: Date.now(),
        rates: filteredRates,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch market rates for ${base}`, error);
      throw new HttpException(
        'Market data unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private async fetchAndCacheRate(
    from: string,
    to: string,
    key: string,
  ): Promise<number> {
    const apiKey = this.configService.get<string>('FX_API_KEY');

    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.baseUrl}/${apiKey}/pair/${from}/${to}`),
      );

      const rate = response.data.conversion_rate;

      // 3. Store with Metadata
      const payload: CachedRate = {
        rate,
        timestamp: Date.now(),
      };

      // Store in Redis
      await this.cacheManager.set(key, payload, 3600);

      this.logger.log(`FX Updated: ${key} = ${rate}`);
      return rate;
    } catch (error) {
      this.logger.error(`Failed to fetch FX rate for ${from}-${to}`, error);
      throw new HttpException(
        'Exchange rate service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}

interface CachedRate {
  rate: number;
  timestamp: number;
}
