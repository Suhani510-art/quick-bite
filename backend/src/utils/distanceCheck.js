/**
 * Distance & delivery time check using OpenRouteService API
 * Checks if food will still be valid when it reaches the buyer
 */


const ORS_API_KEY = process.env.ORS_API_KEY;

// ── Geocode address to coordinates ──────────────────────────────
const geocodeAddress = async (address) => {
  const url = `https://api.openrouteservice.org/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(address)}&size=1`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.features || data.features.length === 0) {
    throw new Error(`Could not find location: ${address}`);
  }

  const [lng, lat] = data.features[0].geometry.coordinates;
  return { lat, lng };
};

// ── Get driving duration in minutes ─────────────────────────────
const getDrivingDuration = async (fromCoords, toCoords) => {
  const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${fromCoords.lng},${fromCoords.lat}&end=${toCoords.lng},${toCoords.lat}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.features || data.features.length === 0) {
    throw new Error('Could not calculate route');
  }

  // Duration is in seconds — convert to minutes
  const durationSeconds = data.features[0].properties.segments[0].duration;
  return Math.ceil(durationSeconds / 60);
};

/**
 * Main function — check if delivery is possible before expiry
 *
 * @param {string} restaurantAddress - Seller's restaurant address
 * @param {string} buyerAddress      - Buyer's delivery address
 * @param {Date}   expiryTime        - Deal expiry time
 * @returns {{
 *   canDeliver: boolean,
 *   durationMinutes: number,
 *   minutesRemaining: number,
 *   message: string
 * }}
 */
export const checkDeliveryFeasibility = async (
  restaurantAddress,
  buyerAddress,
  expiryTime
) => {
  try {
    // Minutes remaining until expiry
    const now = new Date();
    const minutesRemaining = Math.floor((new Date(expiryTime) - now) / 60000);

    // Already expired
    if (minutesRemaining <= 0) {
      return {
        canDeliver: false,
        durationMinutes: 0,
        minutesRemaining: 0,
        message: 'This deal has already expired.',
      };
    }

    // Geocode both addresses
    const [restaurantCoords, buyerCoords] = await Promise.all([
      geocodeAddress(restaurantAddress),
      geocodeAddress(buyerAddress),
    ]);

    // Get driving duration
    const durationMinutes = await getDrivingDuration(restaurantCoords, buyerCoords);

    // Add 15 min buffer for packing + handover
    const totalTimeNeeded = durationMinutes + 15;

    const canDeliver = minutesRemaining > totalTimeNeeded;

    return {
      canDeliver,
      durationMinutes,
      minutesRemaining,
      message: canDeliver
        ? `Delivery possible! (~${durationMinutes} min drive, ${minutesRemaining} min until expiry)`
        : `Cannot deliver! Food will expire in ${minutesRemaining} min but delivery takes ~${totalTimeNeeded} min.`,
    };
  } catch (error) {
    console.error('Distance check error:', error.message);
    // Agar API fail ho toh allow karo — graceful degradation
    return {
      canDeliver: true,
      durationMinutes: 0,
      minutesRemaining: 0,
      message: 'Distance check unavailable — proceeding with order.',
    };
  }
};