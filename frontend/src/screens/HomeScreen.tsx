import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import LocationService, { LocationData, RouteInfo } from '../services/LocationService';
import SocketService, { NearbyUser, WaveData } from '../services/SocketService';

interface User {
  id: string;
  name: string;
  age: number;
  route: string;
  distance: string;
}

const HomeScreen: React.FC = () => {
  const { user, token, logout } = useAuth();
  const [isCommuteMode, setIsCommuteMode] = useState(false);
  const [nearbyUsers, setNearbyUsers] = useState<User[]>([]);
  const [currentRoute, setCurrentRoute] = useState<RouteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    wavesSent: 0,
    wavesReceived: 0,
    matches: 0,
  });
  const [pendingWaves, setPendingWaves] = useState<WaveData[]>([]);
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  const locationUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Connect to socket when component mounts
    if (token) {
      SocketService.connect(token);
      
      // Set up socket event listeners
      SocketService.onUserNearby(handleUserNearby);
      SocketService.onUserLeft(handleUserLeft);
      SocketService.onWaveReceived(handleWaveReceived);
      SocketService.onWaveResponded(handleWaveResponded);
      SocketService.onMatch(handleMatch);
    }

    return () => {
      // Cleanup socket listeners
      SocketService.offUserNearby();
      SocketService.offUserLeft();
      SocketService.offWaveReceived();
      SocketService.offWaveResponded();
      SocketService.offMatch();
      SocketService.disconnect();
      
      // Stop location tracking
      if (locationUpdateInterval.current) {
        clearInterval(locationUpdateInterval.current);
      }
      LocationService.stopLocationTracking();
    };
  }, [user]);

  const handleUserNearby = (user: NearbyUser) => {
    setNearbyUsers(prev => {
      const exists = prev.find(u => u.id === user.id);
      if (!exists) {
        return [...prev, user];
      }
      return prev;
    });
  };

  const handleUserLeft = (userId: string) => {
    setNearbyUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleWaveReceived = (wave: WaveData) => {
    setPendingWaves(prev => [...prev, wave]);
    Alert.alert(
      'Wave Received! 👋',
      'Someone on your route sent you a wave!',
      [
        {
          text: 'Accept',
          onPress: () => respondToWave(wave.id, 'accept'),
        },
        {
          text: 'Reject',
          onPress: () => respondToWave(wave.id, 'reject'),
          style: 'cancel',
        },
      ]
    );
  };

  const handleWaveResponded = (wave: WaveData) => {
    setPendingWaves(prev => prev.filter(w => w.id !== wave.id));
    if (wave.status === 'accepted') {
      Alert.alert('Match! 💕', 'Your wave was accepted!');
      setStats(prev => ({ ...prev, matches: prev.matches + 1 }));
    }
  };

  const handleMatch = (matchData: { userId: string; user: NearbyUser }) => {
    Alert.alert('New Match! 💕', `You matched with ${matchData.user.name}!`);
    setStats(prev => ({ ...prev, matches: prev.matches + 1 }));
  };

  const respondToWave = (waveId: string, response: 'accept' | 'reject') => {
    SocketService.respondToWave(waveId, response);
    setPendingWaves(prev => prev.filter(w => w.id !== waveId));
  };

  const startLocationTracking = async () => {
    const success = await LocationService.startLocationTracking(
      (location: LocationData) => {
        // Update location on server
        if (currentRoute?.routeId) {
          SocketService.updateLocation({
            latitude: location.latitude,
            longitude: location.longitude,
          });
        }
      },
      (error: string) => {
        Alert.alert('Location Error', error);
      }
    );

    if (success) {
      setIsLocationTracking(true);
    }
  };

  const toggleCommuteMode = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      if (!isCommuteMode) {
        // Start commute mode
        const location = await LocationService.getCurrentLocation();
        if (!location) {
          Alert.alert('Error', 'Unable to get your location');
          return;
        }

        // Detect route
        const routeInfo = await LocationService.detectRoute(location);
        setCurrentRoute(routeInfo);

        // Start location tracking
        await startLocationTracking();

        // Join route on socket
        if (routeInfo.routeId) {
          SocketService.joinRoute(routeInfo.routeId);
        }

        // Call backend to start commute mode
        await api.post('/commute/start', {
          routeId: routeInfo.routeId,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
        });

        setIsCommuteMode(true);
        Alert.alert('Commute Mode Started! 🚇', `You're now visible on ${routeInfo.routeName}`);
      } else {
        // Stop commute mode
        LocationService.stopLocationTracking();
        setIsLocationTracking(false);

        if (currentRoute?.routeId) {
          SocketService.leaveRoute(currentRoute.routeId);
        }

        await api.post('/commute/stop');
        setIsCommuteMode(false);
        setCurrentRoute(null);
        setNearbyUsers([]);
        Alert.alert('Commute Mode Stopped', 'You\'re no longer visible to other commuters');
      }
    } catch (error) {
      console.error('Error toggling commute mode:', error);
      Alert.alert('Error', 'Failed to toggle commute mode');
    } finally {
      setIsLoading(false);
    }
  };

  const sendWave = async (userId: string) => {
    try {
      SocketService.sendWave(userId);
      setStats(prev => ({ ...prev, wavesSent: prev.wavesSent + 1 }));
      Alert.alert('Wave Sent! 👋', 'Your wave has been sent');
    } catch (error) {
      console.error('Error sending wave:', error);
      Alert.alert('Error', 'Failed to send wave');
    }
  };

  const fetchNearbyUsers = async () => {
    if (!isCommuteMode) return;

    try {
      const response = await api.get('/commute/nearby');
      setNearbyUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching nearby users:', error);
    }
  };

  useEffect(() => {
    if (isCommuteMode) {
      fetchNearbyUsers();
      // Refresh nearby users every 30 seconds
      const interval = setInterval(fetchNearbyUsers, 30000);
      return () => clearInterval(interval);
    }
  }, [isCommuteMode]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Commute Connect</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        <Text style={styles.welcomeText}>Welcome, {user?.name}!</Text>
        <Text style={styles.subtitle}>Ready to connect on your commute?</Text>
      </View>

      <View style={styles.commuteSection}>
        <View style={styles.commuteHeader}>
          <Text style={styles.sectionTitle}>Commute Mode</Text>
          <Switch
            value={isCommuteMode}
            onValueChange={toggleCommuteMode}
            disabled={isLoading}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isCommuteMode ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>
              {isCommuteMode ? 'Stopping commute mode...' : 'Starting commute mode...'}
            </Text>
          </View>
        )}

        {isCommuteMode && currentRoute && (
          <View style={styles.routeInfo}>
            <Text style={styles.routeText}>Current Route: {currentRoute.routeName}</Text>
            <Text style={styles.directionText}>Direction: {currentRoute.direction}</Text>
            <Text style={styles.statusText}>
              Status: {isLocationTracking ? '🟢 Active' : '🔴 Inactive'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Your Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.wavesSent}</Text>
            <Text style={styles.statLabel}>Waves Sent</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.wavesReceived}</Text>
            <Text style={styles.statLabel}>Waves Received</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.matches}</Text>
            <Text style={styles.statLabel}>Matches</Text>
          </View>
        </View>
      </View>

      {isCommuteMode && (
        <View style={styles.nearbySection}>
          <Text style={styles.sectionTitle}>
            Nearby Commuters ({nearbyUsers.length})
          </Text>
          {nearbyUsers.length === 0 ? (
            <Text style={styles.noUsersText}>
              No other commuters nearby yet. Keep commuting mode on to discover people!
            </Text>
          ) : (
            nearbyUsers.map((nearbyUser) => (
              <View key={nearbyUser.id} style={styles.userCard}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{nearbyUser.name}</Text>
                  <Text style={styles.userDetails}>
                    {nearbyUser.age} • {nearbyUser.route} • {nearbyUser.distance}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.waveButton}
                  onPress={() => sendWave(nearbyUser.id)}
                >
                  <Text style={styles.waveButtonText}>👋 Wave</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      )}

      {pendingWaves.length > 0 && (
        <View style={styles.pendingSection}>
          <Text style={styles.sectionTitle}>Pending Waves ({pendingWaves.length})</Text>
          {pendingWaves.map((wave) => (
            <View key={wave.id} style={styles.pendingWave}>
              <Text style={styles.pendingText}>Wave from User {wave.fromUserId}</Text>
              <View style={styles.pendingActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => respondToWave(wave.id, 'accept')}
                >
                  <Text style={styles.actionButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => respondToWave(wave.id, 'reject')}
                >
                  <Text style={styles.actionButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    padding: 8,
    backgroundColor: '#ff6b6b',
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
  profileSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  commuteSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
  },
  commuteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  routeInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  routeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
  },
  directionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  nearbySection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
  },
  noUsersText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 10,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  userDetails: {
    fontSize: 14,
    color: '#666',
  },
  waveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  waveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  pendingSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
  },
  pendingWave: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  pendingText: {
    fontSize: 16,
    color: '#856404',
    marginBottom: 10,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#28a745',
  },
  rejectButton: {
    backgroundColor: '#dc3545',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default HomeScreen; 