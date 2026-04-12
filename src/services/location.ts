export interface Position {
  latitude: number;
  longitude: number;
}

const CACHE_KEY_POS = 'fixmycity_last_pos';
const CACHE_KEY_ADDR = 'fixmycity_last_addr';

export const getCurrentLocation = (options?: PositionOptions): Promise<Position> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          let msg = 'Unable to retrieve your location';
          if (error.code === error.PERMISSION_DENIED) msg = 'Location access denied by user';
          else if (error.code === error.POSITION_UNAVAILABLE) msg = 'Location information is unavailable';
          else if (error.code === error.TIMEOUT) msg = 'Location request timed out';
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
          ...options
        }
      );
    }
  });
};

export const saveLocationToCache = (pos: Position, address: string) => {
  try {
    localStorage.setItem(CACHE_KEY_POS, JSON.stringify(pos));
    localStorage.setItem(CACHE_KEY_ADDR, address);
  } catch (e) {
    console.error('Failed to save location to cache:', e);
  }
};

export const getCachedLocation = (): { position: Position | null, address: string } => {
  try {
    const posStr = localStorage.getItem(CACHE_KEY_POS);
    const address = localStorage.getItem(CACHE_KEY_ADDR) || '';
    const position = posStr ? JSON.parse(posStr) : null;
    return { position, address };
  } catch (e) {
    return { position: null, address: '' };
  }
};

// Haversine formula to calculate distance between two lat/lon points in kilometers
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

export const formatDistance = (km: number): String => {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
};

export const getAddressFromCoordinates = async (lat: number, lon: number): Promise<string> => {
  try {
    // Basic reverse geocoding via OpenStreetMap Nominatim API (free)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      { headers: { 'User-Agent': 'FixmyCityWeb/1.0' } }
    );
    if (!response.ok) throw new Error('Geocoding service unavailable');
    
    const data = await response.json();
    if (data && data.address) {
      const road = data.address.road || data.address.pedestrian || data.address.cycleway || '';
      const suburb = data.address.suburb || data.address.neighbourhood || data.address.village || '';
      const city = data.address.city || data.address.town || data.address.county || '';
      
      const parts = [road, suburb, city].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : 'Unknown Location';
    }
    return 'Unknown Location';
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return 'Location unavailable';
  }
};
