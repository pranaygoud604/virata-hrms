import { GeoFenceLocation } from '@prisma/client';

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance between two lat/lng points, in meters. */
export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/** True if the given point falls within the radius of at least one active geo-fence location. */
export function isWithinAnyGeofence(
  lat: number,
  lng: number,
  locations: Pick<GeoFenceLocation, 'latitude' | 'longitude' | 'radiusMeters'>[],
): boolean {
  return locations.some(
    (loc) => haversineDistanceMeters(lat, lng, loc.latitude, loc.longitude) <= loc.radiusMeters,
  );
}
