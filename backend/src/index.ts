import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import authRoutes from './routes/auth';
import commuteRoutes from './routes/commute';
import chatRoutes from './routes/chat';
import socketManager from './socket/socketManager';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 4000;

// Initialize Socket.io
socketManager.initialize(server);

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/commute', commuteRoutes);
app.use('/api/chat', chatRoutes);

app.get('/', (req, res) => res.send('Commute Connect API running!'));

server.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 