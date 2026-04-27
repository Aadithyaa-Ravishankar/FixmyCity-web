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
      return;
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000, // allow 10 seconds cache to speed up lock
      ...options
    };

    const handleError = (error: GeolocationPositionError, isFallback: boolean) => {
      // If high accuracy fails with timeout or unavailable, try fallback once
      if (!isFallback && defaultOptions.enableHighAccuracy && (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE)) {
        console.warn('High accuracy failed, retrying with low accuracy...', error);
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          (err) => handleError(err, true),
          { ...defaultOptions, enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
        );
        return;
      }

      let msg = 'Unable to retrieve your location';
      if (error.code === error.PERMISSION_DENIED) {
        msg = 'Location access denied. Check device permissions or ensure you are on HTTPS.';
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        msg = 'Location unavailable. Please turn on GPS or Location Services.';
      } else if (error.code === error.TIMEOUT) {
        msg = 'Location request timed out. Please try again.';
      }
      
      // Development/Testing Fallback
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('192.168.')) {
        console.warn(`Geolocation failed (${msg}). Using mock Chengalpattu location for development.`);
        resolve({ latitude: 12.6934, longitude: 79.9756 });
        return;
      }

      reject(new Error(msg));
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => handleError(error, false),
      defaultOptions
    );
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
    // Using BigDataCloud free client-side reverse geocoding (no CORS issues, very reliable for dev)
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    
    if (!response.ok) throw new Error('Geocoding service unavailable');
    
    const data = await response.json();
    if (data) {
      const locality = data.locality || data.city || '';
      const state = data.principalSubdivision || '';
      
      const parts = [locality, state].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : 'Unknown Area';
    }
    return 'Unknown Area';
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return 'Coordinates Locked (Address formatting failed)';
  }
};
