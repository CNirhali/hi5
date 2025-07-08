import * as Location from 'expo-location';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface RouteInfo {
  routeId: string;
  routeName: string;
  direction: string;
  isOnRoute: boolean;
}

class LocationService {
  private locationSubscription: Location.LocationSubscription | null = null;
  private isTracking = false;

  async requestPermissions(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  }

  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        timestamp: location.timestamp,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  async startLocationTracking(
    onLocationUpdate: (location: LocationData) => void,
    onError?: (error: string) => void
  ): Promise<boolean> {
    if (this.isTracking) {
      return true;
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      onError?.('Location permission denied');
      return false;
    }

    try {
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000, // Update every 30 seconds
          distanceInterval: 50, // Update every 50 meters
        },
        (location) => {
          const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || 0,
            timestamp: location.timestamp,
          };
          onLocationUpdate(locationData);
        }
      );

      this.isTracking = true;
      return true;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      onError?.('Failed to start location tracking');
      return false;
    }
  }

  stopLocationTracking(): void {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
    this.isTracking = false;
  }

  // Mock route detection - in real app, this would use transit APIs
  async detectRoute(location: LocationData): Promise<RouteInfo> {
    // Mock: Detect if user is near a subway line
    // In NYC, this would check proximity to actual subway stations
    const mockRoutes = [
      { id: '6-train', name: '6 Train', direction: 'Uptown' },
      { id: 'l-train', name: 'L Train', direction: 'Manhattan' },
      { id: 'n-train', name: 'N Train', direction: 'Queens' },
    ];

    // Simple mock logic - in real app, this would use actual transit data
    const randomRoute = mockRoutes[Math.floor(Math.random() * mockRoutes.length)];
    
    return {
      routeId: randomRoute.id,
      routeName: randomRoute.name,
      direction: randomRoute.direction,
      isOnRoute: Math.random() > 0.3, // 70% chance of being on route
    };
  }

  // Calculate distance between two points
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance * 1000; // Convert to meters
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

export default new LocationService(); 