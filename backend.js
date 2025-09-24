const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const Parse = require('parse/node');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize Parse SDK with Back4App credentials
Parse.initialize("z5FgipCE12ScJNuYMbJ19EY2c7AXCxp5nWX7BWHT", "ccIGiulAhYJ3oERH7djPHzkluDUqXru3c8suZrVl");
Parse.serverURL = 'https://parseapi.back4app.com/';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'chat.html'));
});

// Store active users in memory
let activeUsers = new Map();

// Define Parse Classes
const Message = Parse.Object.extend("Message");
const ChatUser = Parse.Object.extend("ChatUser");

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user joining
  socket.on('join', async (userData) => {
    try {
      console.log('User joining:', userData.name);
      
      // Create user in Back4App
      let user = new ChatUser();
      user.set("name", userData.name);
      user.set("avatar", userData.avatar || '👤');
      user.set("socketId", socket.id);
      user.set("isOnline", true);
      user.set("lastSeen", new Date());
      
      await user.save();
      console.log('User saved to database');
      
      // Store in memory
      activeUsers.set(socket.id, {
        id: user.id,
        socketId: socket.id,
        name: userData.name,
        avatar: userData.avatar || '👤',
        isOnline: true,
        lastSeen: new Date()
      });

      // Send current users
      const users = Array.from(activeUsers.values());
      socket.emit('users', users);
      
      // Send recent messages
      const messageQuery = new Parse.Query(Message);
      messageQuery.descending("createdAt");
      messageQuery.limit(50);
      messageQuery.include("sender");
      
      const messages = await messageQuery.find();
      const formattedMessages = messages.reverse().map(msg => {
        const sender = msg.get("sender");
        return {
          id: msg.id,
          text: msg.get("text"),
          sender: {
            id: sender.id,
            socketId: sender.get("socketId"),
            name: sender.get("name"),
            avatar: sender.get("avatar")
          },
          timestamp: msg.get("createdAt"),
          type: msg.get("type") || 'text'
        };
      });
      
      socket.emit('messages', formattedMessages);
      
      // Broadcast new user
      socket.broadcast.emit('user-joined', activeUsers.get(socket.id));
      
    } catch (error) {
      console.error('Error joining user:', error);
    }
  });

  // Handle sending messages
  socket.on('send-message', async (messageData) => {
    try {
      const userInfo = activeUsers.get(socket.id);
      if (!userInfo) return;

      // Get user from Back4App
      const userQuery = new Parse.Query(ChatUser);
      const user = await userQuery.get(userInfo.id);
      
      // Create message
      const message = new Message();
      message.set("text", messageData.text);
      message.set("sender", user);
      message.set("type", messageData.type || 'text');
      
      await message.save();
      
      // Format message
      const formattedMessage = {
        id: message.id,
        text: messageData.text,
        sender: {
          id: user.id,
          socketId: socket.id,
          name: user.get("name"),
          avatar: user.get("avatar")
        },
        timestamp: message.get("createdAt"),
        type: messageData.type || 'text'
      };
      
      // Broadcast message
      socket.broadcast.emit('new-message', formattedMessage);
      socket.emit('message-sent', formattedMessage);
      
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    const userInfo = activeUsers.get(socket.id);
    if (userInfo) {
      socket.broadcast.emit('user-typing', {
        userId: socket.id,
        userName: userInfo.name,
        isTyping: data.isTyping
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    try {
      const userInfo = activeUsers.get(socket.id);
      if (userInfo) {
        // Update user status in Back4App
        const userQuery = new Parse.Query(ChatUser);
        const user = await userQuery.get(userInfo.id);
        
        user.set("isOnline", false);
        user.set("lastSeen", new Date());
        await user.save();
        
        // Remove from memory
        activeUsers.delete(socket.id);
        
        // Broadcast user left
        socket.broadcast.emit('user-left', userInfo);
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
    
    console.log('User disconnected:', socket.id);
  });
});

// API Routes
app.get('/api/messages', async (req, res) => {
  try {
    const query = new Parse.Query(Message);
    query.descending("createdAt");
    query.limit(100);
    query.include("sender");
    
    const messages = await query.find();
    const formattedMessages = messages.map(msg => {
      const sender = msg.get("sender");
      return {
        id: msg.id,
        text: msg.get("text"),
        sender: {
          id: sender.id,
          name: sender.get("name"),
          avatar: sender.get("avatar")
        },
        timestamp: msg.get("createdAt"),
        type: msg.get("type") || 'text'
      };
    });
    
    res.json(formattedMessages.reverse());
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const query = new Parse.Query(ChatUser);
    query.descending("lastSeen");
    query.limit(50);
    
    const users = await query.find();
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.get("name"),
      avatar: user.get("avatar"),
      isOnline: user.get("isOnline"),
      lastSeen: user.get("lastSeen")
    }));
    
    res.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeUsers: activeUsers.size,
    uptime: process.uptime()
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Chatrise server running on port ${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} to start chatting`);
  console.log('💾 Connected to Back4App database');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});
