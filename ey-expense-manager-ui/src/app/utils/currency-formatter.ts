/**
 * Utility class for currency formatting functions
 */
export class CurrencyFormatter {
  /**
   * Format a currency value with the TND symbol and proper formatting
   */
  static formatCurrency(amount: number): string {
    if (amount === undefined || amount === null) {
      return '0.00 TND';
    }
    
    try {
      return new Intl.NumberFormat('fr-TN', {
        style: 'currency',
        currency: 'TND',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (e) {
      console.error('Error formatting currency:', e);
      return amount.toFixed(2) + ' TND';
    }
  }
  
  /**
   * Format a currency value in compact notation for small spaces
   */
  static formatCompactCurrency(amount: number): string {
    if (amount === undefined || amount === null) {
      return '0 TND';
    }
    
    try {
      if (amount >= 1000000) {
        return `${(amount / 1000000).toFixed(1)}M TND`;
      } else if (amount >= 1000) {
        return `${(amount / 1000).toFixed(1)}K TND`;
      } else {
        return `${amount.toFixed(2)} TND`;
      }
    } catch (e) {
      console.error('Error formatting compact currency:', e);
      return amount.toFixed(2) + ' TND';
    }
  }
}
