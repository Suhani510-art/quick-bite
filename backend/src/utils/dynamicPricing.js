/**
 * Dynamic Pricing Algorithm
 *
 * Price curve:
 *   - More than 24h until expiry  → 100% of original price
 *   - 12h until expiry            → ~75% of original price
 *   - 6h until expiry             → ~50% of original price
 *   - 1h until expiry             → ~20% of original price
 *   - Expired                     → 0 (deal inactive)
 *
 * Formula: uses a linear decay within a configurable window.
 */

const FULL_PRICE_WINDOW_HOURS = 24;   // no discount before this threshold
const MIN_PRICE_PERCENTAGE    = 0.15; // floor: never go below 15% of original
const DECAY_WINDOW_HOURS      = 24;   // decay happens over this many hours

/**
 * Calculate the current dynamic price of a deal.
 *
 * @param {number} originalPrice  - The listed original price
 * @param {Date}   expiryTime     - When the deal expires
 * @returns {{
 *   currentPrice: number,
 *   discountPercent: number,
 *   hoursUntilExpiry: number,
 *   isExpired: boolean
 * }}
 */
export const calculateDynamicPrice = (originalPrice, expiryTime) => {
  const now             = new Date();
  const msUntilExpiry   = expiryTime - now;
  const hoursUntilExpiry = msUntilExpiry / (1000 * 60 * 60);

  // Already expired
  if (hoursUntilExpiry <= 0) {
    return {
      currentPrice:    0,
      discountPercent: 100,
      hoursUntilExpiry: 0,
      isExpired:       true,
    };
  }

  // Still far from expiry — full price
  if (hoursUntilExpiry >= FULL_PRICE_WINDOW_HOURS) {
    return {
      currentPrice:    parseFloat(originalPrice.toFixed(2)),
      discountPercent: 0,
      hoursUntilExpiry: parseFloat(hoursUntilExpiry.toFixed(2)),
      isExpired:       false,
    };
  }

  // Within decay window — linear interpolation between 100% and MIN_PRICE_PERCENTAGE
  // ratio = 1 when 24h away, ratio = 0 when expired
  const ratio        = hoursUntilExpiry / DECAY_WINDOW_HOURS;
  const priceRatio   = MIN_PRICE_PERCENTAGE + (1 - MIN_PRICE_PERCENTAGE) * ratio;
  const currentPrice = parseFloat((originalPrice * priceRatio).toFixed(2));
  const discountPercent = parseFloat(((1 - priceRatio) * 100).toFixed(1));

  return {
    currentPrice,
    discountPercent,
    hoursUntilExpiry: parseFloat(hoursUntilExpiry.toFixed(2)),
    isExpired: false,
  };
};

/**
 * Attach dynamic pricing info to a deal object (plain JS object, not Mongoose doc).
 * Call this before sending any deal in an API response.
 *
 * @param {Object} deal - Plain deal object (after .toObject() or .lean())
 * @returns {Object}    - Deal with pricing fields injected
 */
export const attachDynamicPrice = (deal) => {
  const pricing = calculateDynamicPrice(deal.originalPrice, deal.expiryTime);
  return {
    ...deal,
    ...pricing,
  };
};