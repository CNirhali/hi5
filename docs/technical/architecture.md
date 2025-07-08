# Technical Architecture: Commute Connect

## 🏗️ System Overview

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   Backend API   │    │   Real-time     │
│  (React Native) │◄──►│   (Node.js)     │◄──►│   Services      │
│                 │    │                 │    │  (Socket.io)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Location      │    │   Database      │    │   Push          │
│   Services      │    │  (MongoDB)      │    │ Notifications   │
│  (Mapbox/GPS)   │    │                 │    │  (Firebase)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📱 Frontend Architecture (React Native)

### Technology Stack
- **React Native** - Cross-platform mobile development
- **Expo** - Development platform and tools
- **TypeScript** - Type safety and better development experience
- **Redux Toolkit** - State management
- **React Navigation** - Navigation between screens
- **Expo Location** - Location services
- **Socket.io Client** - Real-time communication

### Project Structure
```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/         # Buttons, inputs, etc.
│   │   ├── commute/        # Commute-specific components
│   │   ├── chat/           # Chat-related components
│   │   └── profile/        # Profile components
│   ├── screens/            # Screen components
│   │   ├── onboarding/     # Onboarding flow
│   │   ├── commute/        # Commute mode screens
│   │   ├── chat/           # Chat screens
│   │   └── settings/       # Settings screens
│   ├── services/           # API and external services
│   │   ├── api/           # REST API calls
│   │   ├── location/      # Location services
│   │   ├── socket/        # Real-time communication
│   │   └── notifications/ # Push notifications
│   ├── store/             # Redux store and slices
│   │   ├── slices/        # Redux slices
│   │   └── store.ts       # Store configuration
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript type definitions
│   └── constants/         # App constants
├── assets/                # Images, fonts, etc.
└── app.json              # Expo configuration
```

### Key Components

#### 1. **Location Service**
```typescript
interface LocationService {
  startTracking(): Promise<void>;
  stopTracking(): void;
  getCurrentLocation(): Promise<Location>;
  getRouteInfo(location: Location): Promise<RouteInfo>;
  isOnRoute(location: Location, route: Route): boolean;
}
```

#### 2. **Real-time Communication**
```typescript
interface SocketService {
  connect(): void;
  disconnect(): void;
  joinRoute(routeId: string): void;
  leaveRoute(routeId: string): void;
  sendWave(toUserId: string): void;
  onUserNearby(callback: (user: NearbyUser) => void): void;
  onWaveReceived(callback: (wave: Wave) => void): void;
}
```

#### 3. **State Management**
```typescript
interface AppState {
  user: UserState;
  commute: CommuteState;
  nearby: NearbyUsersState;
  chat: ChatState;
  settings: SettingsState;
}
```

## 🖥️ Backend Architecture (Node.js)

### Technology Stack
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Primary database
- **Redis** - Caching and session storage
- **Socket.io** - Real-time communication
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **Joi** - Input validation
- **Winston** - Logging

### Project Structure
```
backend/
├── src/
│   ├── controllers/        # Request handlers
│   │   ├── auth.ts        # Authentication
│   │   ├── users.ts       # User management
│   │   ├── commute.ts     # Commute features
│   │   ├── matching.ts    # Matching logic
│   │   └── chat.ts        # Chat functionality
│   ├── models/            # Database models
│   │   ├── User.ts        # User model
│   │   ├── Route.ts       # Route model
│   │   ├── Wave.ts        # Wave model
│   │   └── Chat.ts        # Chat model
│   ├── services/          # Business logic
│   │   ├── location.ts    # Location processing
│   │   ├── matching.ts    # Matching algorithm
│   │   ├── notifications.ts # Push notifications
│   │   └── privacy.ts     # Privacy controls
│   ├── middleware/        # Express middleware
│   │   ├── auth.ts        # Authentication middleware
│   │   ├── validation.ts  # Input validation
│   │   ├── rateLimit.ts   # Rate limiting
│   │   └── privacy.ts     # Privacy checks
│   ├── routes/            # API routes
│   │   ├── auth.ts        # Authentication routes
│   │   ├── users.ts       # User routes
│   │   ├── commute.ts     # Commute routes
│   │   └── chat.ts        # Chat routes
│   ├── utils/             # Utility functions
│   ├── config/            # Configuration
│   └── types/             # TypeScript types
├── tests/                 # Test files
└── package.json           # Dependencies
```

### API Endpoints

#### Authentication
```
POST   /api/auth/register     # User registration
POST   /api/auth/login        # User login
POST   /api/auth/logout       # User logout
POST   /api/auth/refresh      # Refresh token
```

#### Users
```
GET    /api/users/profile     # Get user profile
PUT    /api/users/profile     # Update profile
DELETE /api/users/profile     # Delete account
POST   /api/users/verify      # Verify phone number
```

#### Commute
```
POST   /api/commute/start     # Start commute mode
POST   /api/commute/stop      # Stop commute mode
GET    /api/commute/nearby    # Get nearby users
POST   /api/commute/wave      # Send wave to user
GET    /api/commute/routes    # Get available routes
```

#### Chat
```
GET    /api/chat/conversations # Get chat list
GET    /api/chat/:id/messages  # Get messages
POST   /api/chat/:id/messages  # Send message
DELETE /api/chat/:id           # Delete conversation
```

## 🗄️ Database Design

### MongoDB Collections

#### Users Collection
```javascript
{
  _id: ObjectId,
  email: String,
  phone: String,
  passwordHash: String,
  profile: {
    name: String,
    age: Number,
    photos: [String],
    interests: [String],
    lookingFor: String, // 'friendship', 'dating', 'both'
    bio: String
  },
  commute: {
    routes: [{
      routeId: String,
      name: String,
      type: String, // 'subway', 'bus', 'train'
      isActive: Boolean
    }],
    preferences: {
      visibilityMode: String, // 'manual', 'automatic'
      locationPrecision: String, // 'exact', 'route'
      commuteHours: {
        start: String, // '06:00'
        end: String    // '09:00'
      }
    }
  },
  privacy: {
    isVisible: Boolean,
    lastSeen: Date,
    blockedUsers: [ObjectId]
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### Routes Collection
```javascript
{
  _id: ObjectId,
  routeId: String,
  name: String,
  type: String, // 'subway', 'bus', 'train'
  city: String,
  stops: [{
    id: String,
    name: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  }],
  activeUsers: [ObjectId],
  createdAt: Date
}
```

#### Waves Collection
```javascript
{
  _id: ObjectId,
  fromUser: ObjectId,
  toUser: ObjectId,
  routeId: String,
  status: String, // 'pending', 'accepted', 'rejected', 'expired'
  expiresAt: Date,
  createdAt: Date
}
```

#### Chats Collection
```javascript
{
  _id: ObjectId,
  participants: [ObjectId],
  messages: [{
    sender: ObjectId,
    content: String,
    timestamp: Date,
    isRead: Boolean
  }],
  lastMessage: {
    content: String,
    timestamp: Date,
    sender: ObjectId
  },
  createdAt: Date,
  updatedAt: Date
}
```

## 🔄 Real-time Communication

### Socket.io Events

#### Client to Server
```javascript
// Join/leave routes
'socket:join-route'     // Join a specific route
'socket:leave-route'    // Leave a route
'socket:update-location' // Update user location

// Wave system
'socket:send-wave'      // Send wave to user
'socket:respond-wave'   // Respond to wave

// Chat
'socket:send-message'   // Send chat message
'socket:typing'         // Typing indicator
```

#### Server to Client
```javascript
// User presence
'user:nearby'           // New user nearby
'user:left'             // User left area
'user:location-update'  // User location changed

// Wave system
'wave:received'         // Received new wave
'wave:responded'        // Wave was responded to
'wave:expired'          // Wave expired

// Chat
'message:received'      // New message
'message:delivered'     // Message delivered
'message:read'          // Message read
```

## 🔒 Privacy & Security

### Data Protection
- **End-to-end encryption** for all messages
- **Location anonymization** - only route-level precision
- **Time-limited data retention** - location data deleted after 24 hours
- **GDPR compliance** - user data control and deletion
- **Regular security audits** and penetration testing

### Privacy Controls
```typescript
interface PrivacySettings {
  visibilityMode: 'manual' | 'automatic';
  locationPrecision: 'exact' | 'route';
  commuteHours: {
    start: string;
    end: string;
  };
  blockedUsers: string[];
  dataRetention: {
    locationData: number; // hours
    chatHistory: number;  // days
  };
}
```

## 📊 Performance & Scalability

### Caching Strategy
- **Redis** for session storage and real-time data
- **MongoDB** for persistent data
- **CDN** for static assets and images
- **Rate limiting** to prevent abuse

### Scaling Considerations
- **Horizontal scaling** with load balancers
- **Database sharding** by geographic regions
- **Microservices architecture** for future growth
- **Auto-scaling** based on demand

### Performance Targets
- **API response time** < 200ms
- **Real-time message delivery** < 100ms
- **Location updates** < 5 seconds
- **App startup time** < 3 seconds

## 🧪 Testing Strategy

### Test Types
- **Unit tests** for business logic
- **Integration tests** for API endpoints
- **E2E tests** for critical user flows
- **Performance tests** for scalability
- **Security tests** for vulnerabilities

### Testing Tools
- **Jest** for unit and integration tests
- **Supertest** for API testing
- **Detox** for E2E mobile testing
- **Artillery** for load testing

## 🚀 Deployment & DevOps

### Infrastructure
- **AWS** for cloud hosting
- **Docker** for containerization
- **Kubernetes** for orchestration
- **CI/CD** with GitHub Actions

### Monitoring
- **Application monitoring** with New Relic
- **Error tracking** with Sentry
- **Log aggregation** with ELK stack
- **Performance monitoring** with DataDog

---

**This architecture prioritizes privacy, real-time performance, and scalability while maintaining a simple and maintainable codebase.** 