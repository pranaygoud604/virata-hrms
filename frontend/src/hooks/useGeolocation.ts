import { useCallback, useState } from "react";

interface Coords {
  latitude: number;
  longitude: number;
}

export function useGeolocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const locate = useCallback((): Promise<Coords> => {
    setLocating(true);
    setError(null);
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const message = "Geolocation is not supported by this browser.";
        setError(message);
        setLocating(false);
        reject(new Error(message));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const c = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          setCoords(c);
          setLocating(false);
          resolve(c);
        },
        (err) => {
          const message = err.code === err.PERMISSION_DENIED ? "Location permission denied." : err.message;
          setError(message);
          setLocating(false);
          reject(new Error(message));
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  }, []);

  return { coords, error, locating, locate };
}
