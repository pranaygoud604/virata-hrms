import { haversineDistanceMeters, isWithinAnyGeofence } from './geofence.util';

describe('geofence.util', () => {
  describe('haversineDistanceMeters', () => {
    it('returns 0 for identical points', () => {
      expect(haversineDistanceMeters(17.4126, 78.4482, 17.4126, 78.4482)).toBeCloseTo(0, 3);
    });

    it('returns a realistic distance between two known Hyderabad points (~5.3km apart)', () => {
      // Banjara Hills to Hitech City, roughly 5-6km apart.
      const distance = haversineDistanceMeters(17.4126, 78.4482, 17.4483, 78.3915);
      expect(distance).toBeGreaterThan(5000);
      expect(distance).toBeLessThan(8000);
    });
  });

  describe('isWithinAnyGeofence', () => {
    const office = { latitude: 17.4126, longitude: 78.4482, radiusMeters: 200 };

    it('is true when the point is inside the radius', () => {
      // ~20m offset in latitude only, well within a 200m radius.
      expect(isWithinAnyGeofence(17.41278, 78.4482, [office])).toBe(true);
    });

    it('is false when the point is well outside the radius', () => {
      expect(isWithinAnyGeofence(17.45, 78.5, [office])).toBe(false);
    });

    it('is false when there are no active geo-fence locations', () => {
      expect(isWithinAnyGeofence(17.4126, 78.4482, [])).toBe(false);
    });

    it('is true when within range of the second of multiple locations', () => {
      const siteB = { latitude: 17.45, longitude: 78.5, radiusMeters: 150 };
      expect(isWithinAnyGeofence(17.45001, 78.50001, [office, siteB])).toBe(true);
    });
  });
});
