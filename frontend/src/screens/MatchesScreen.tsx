import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../services/api';

interface Match {
  id: string;
  matchedUser: {
    id: string;
    name: string;
    age: number;
    route: string;
    lastSeen: string;
  };
  matchedAt: string;
  lastMessage?: {
    text: string;
    timestamp: string;
    isFromMe: boolean;
  };
  unreadCount: number;
}

const MatchesScreen: React.FC = () => {
  const navigation = useNavigation();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/matches');
      setMatches(response.data.matches);
    } catch (error) {
      console.error('Error loading matches:', error);
      Alert.alert('Error', 'Failed to load matches');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMatches();
    setRefreshing(false);
  };

  const openChat = (match: Match) => {
    navigation.navigate('Chat' as never, {
      matchId: match.id,
      matchedUser: {
        id: match.matchedUser.id,
        name: match.matchedUser.name,
        route: match.matchedUser.route,
      },
    } as never);
  };

  const unmatch = async (matchId: string) => {
    Alert.alert(
      'Unmatch',
      'Are you sure you want to unmatch? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unmatch',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/matches/${matchId}`);
              setMatches(prev => prev.filter(match => match.id !== matchId));
              Alert.alert('Success', 'Unmatched successfully');
            } catch (error) {
              console.error('Error unmatching:', error);
              Alert.alert('Error', 'Failed to unmatch');
            }
          },
        },
      ]
    );
  };

  const renderMatch = ({ item }: { item: Match }) => (
    <TouchableOpacity
      style={styles.matchCard}
      onPress={() => openChat(item)}
      onLongPress={() => unmatch(item.id)}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.matchedUser.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unreadCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.matchInfo}>
        <View style={styles.matchHeader}>
          <Text style={styles.matchName}>{item.matchedUser.name}</Text>
          <Text style={styles.matchAge}>{item.matchedUser.age}</Text>
        </View>
        <Text style={styles.matchRoute}>{item.matchedUser.route}</Text>
        
        {item.lastMessage ? (
          <View style={styles.lastMessageContainer}>
            <Text style={styles.lastMessageText} numberOfLines={1}>
              {item.lastMessage.isFromMe ? 'You: ' : ''}{item.lastMessage.text}
            </Text>
            <Text style={styles.lastMessageTime}>
              {new Date(item.lastMessage.timestamp).toLocaleDateString()}
            </Text>
          </View>
        ) : (
          <Text style={styles.noMessagesText}>No messages yet</Text>
        )}
      </View>

      <View style={styles.matchActions}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => openChat(item)}
        >
          <Text style={styles.chatButtonText}>💬</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No Matches Yet</Text>
      <Text style={styles.emptyStateSubtitle}>
        Start commuting to discover and match with people on your route!
      </Text>
      <TouchableOpacity
        style={styles.startCommutingButton}
        onPress={() => navigation.navigate('Home' as never)}
      >
        <Text style={styles.startCommutingText}>Start Commuting</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Matches</Text>
        <Text style={styles.subtitle}>
          {matches.length} {matches.length === 1 ? 'match' : 'matches'}
        </Text>
      </View>

      <FlatList
        data={matches}
        renderItem={renderMatch}
        keyExtractor={(item) => item.id}
        style={styles.matchesList}
        contentContainerStyle={matches.length === 0 ? styles.emptyList : undefined}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
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
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  matchesList: {
    flex: 1,
  },
  emptyList: {
    flex: 1,
  },
  matchCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  matchInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  matchName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 10,
  },
  matchAge: {
    fontSize: 14,
    color: '#666',
  },
  matchRoute: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 5,
  },
  lastMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessageText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  lastMessageTime: {
    fontSize: 12,
    color: '#999',
  },
  noMessagesText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  matchActions: {
    justifyContent: 'center',
  },
  chatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatButtonText: {
    fontSize: 18,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  startCommutingButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  startCommutingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MatchesScreen; 