import { Injectable, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { lastValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FxService {
  private readonly baseUrl = 'https://v6.exchangerate-api.com/v6';

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getExchangeRate(from: string, to: string): Promise<number> {
    const pair = `${from.toUpperCase()}_${to.toUpperCase()}`;
    
    // Check Cache
    const cachedRate = await this.cacheManager.get<number>(pair);
    if (cachedRate) {
      return cachedRate;
    }

    // Fetch from External API
    const apiKey = this.configService.get<string>('FX_API_KEY'); 
    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.baseUrl}/${apiKey}/pair/${from}/${to}`)
      );

      const rate = response.data.conversion_rate;

      // Cache result
      await this.cacheManager.set(pair, rate);

      return rate;
    } catch (error) {
      console.error(`FX Error [${pair}]:`, error.message);
      throw new HttpException(
        'Exchange rate service temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}