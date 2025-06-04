export interface CurrencyRate {
  code: string;
  name: string;
  rate: number;
  symbol: string;
  flag?: string;
}

export interface CurrencyConversionResult {
  fromAmount: number;
  fromCurrency: string;
  toAmount: number;
  toCurrency: string;
  rate: number;
  date: Date;
}

export interface CurrencyUpdateEvent {
  currency: string;
  previousRate: number;
  currentRate: number;
  changePercent: number;
  timestamp: Date;
}
