import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Currency } from './entities/currency.entity';
import { CreateCurrencyDto } from './dto/currency.dto';

@Injectable()
export class SystemService {
  constructor(
    @InjectRepository(Currency)
    private currencyRepo: Repository<Currency>,
  ) {}

  async createCurrency(dto: CreateCurrencyDto) {
    const existing = await this.currencyRepo.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Currency ${dto.code} already exists`);
    }

    const currency = this.currencyRepo.create(dto);
    return this.currencyRepo.save(currency);
  }

  async findAll() {
    return this.currencyRepo.find({ order: { code: 'ASC' } });
  }

  async toggleCurrency(code: string, isActive: boolean) {
    const currency = await this.currencyRepo.findOne({ where: { code } });
    if (!currency) throw new NotFoundException('Currency not found');

    currency.isActive = isActive;
    return this.currencyRepo.save(currency);
  }
}