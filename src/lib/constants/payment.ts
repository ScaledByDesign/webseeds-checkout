/**
 * Payment and Tax Constants
 * 
 * Centralized constants for payment processing and tax calculations
 * to ensure consistency across the application.
 */

/**
 * US State Tax Rates
 * 
 * Tax rates for US states used in payment processing.
 * Rates are expressed as decimals (e.g., 0.0725 = 7.25%).
 */
export const TAX_RATES: Record<string, number> = {
  'CA': 0.0725,  // California: 7.25%
  'TX': 0.0625,  // Texas: 6.25%
  'NY': 0.08,    // New York: 8%
  'FL': 0.06,    // Florida: 6%
  'WA': 0.065,   // Washington: 6.5%
  'DEFAULT': 0.0 // No tax for other states
} as const;

/**
 * Calculate tax amount for a given subtotal and state
 * 
 * @param subtotal - The subtotal amount to calculate tax on
 * @param state - The US state code (e.g., 'CA', 'NY')
 * @returns The calculated tax amount
 */
export function calculateTax(subtotal: number, state?: string): number {
  const stateCode = state?.toUpperCase() || 'DEFAULT';
  const taxRate = TAX_RATES[stateCode] || TAX_RATES.DEFAULT;
  return parseFloat((subtotal * taxRate).toFixed(2));
}

/**
 * Get tax rate for a given state
 * 
 * @param state - The US state code (e.g., 'CA', 'NY')
 * @returns The tax rate as a decimal (e.g., 0.0725 for 7.25%)
 */
export function getTaxRate(state?: string): number {
  const stateCode = state?.toUpperCase() || 'DEFAULT';
  return TAX_RATES[stateCode] || TAX_RATES.DEFAULT;
}

/**
 * Get tax rate as percentage for display purposes
 * 
 * @param state - The US state code (e.g., 'CA', 'NY')
 * @returns The tax rate as a percentage (e.g., 7.25 for 7.25%)
 */
export function getTaxRatePercentage(state?: string): number {
  return getTaxRate(state) * 100;
}