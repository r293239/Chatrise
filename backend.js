// backend.js - Back4app Integration for ChatRise

// Back4app Configuration
const BACK4APP_CONFIG = {
    appId: 'z5FgipCE12ScJNuYMbJ19EY2c7AXCxp5nWX7BWHT',
    jsKey: 'QNQTH3G4VuLA5gkPIiCtoXZjJJMcP7P5zYsETOPV',
    serverURL: 'https://parseapi.back4app.com'
};

// Initialize Parse SDK
Parse.initialize(BACK4APP_CONFIG.appId, BACK4APP_CONFIG.jsKey);
Parse.serverURL = BACK4APP_CONFIG.serverURL;

// User Authentication Class
class ChatRiseAuth {
    // Register new user
    static async register(username, email, password) {
        try {
            const user = new Parse.User();
            user.set('username', username);
            user.set('email', email);
            user.set('password', password);
            user.set('isOnline', true);
            user.set('lastSeen', new Date());
            
            const result = await user.signUp();
            return { success: true, user: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // Login user
    static async login(username, password) {
        try {
            const user = await Parse.User.logIn(username, password);
            
            // Update online status
            user.set('isOnline', true);
            user.set('lastSeen', new Date());
            await user.save();
            
            return { success: true, user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // Logout user
    static async logout() {
        try {
            const user = Parse.User.current();
            if (user) {
                user.set('isOnline', false);
                user.set('lastSeen', new Date());
                await user.save();
            }
            
            await Parse.User.logOut();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // Get current user
    static getCurrentUser() {
        return Parse.User.current();
    }
    
    // Check if user is logged in
    static isLoggedIn() {
        return Parse.User.current() !== null;
    }
}

// Chat Management Class
class ChatRiseChat {
    // Send message
    static async sendMessage(recipientId, message, chatType = 'private') {
        try {
            const Message = Parse.Object.extend('Message');
            const newMessage = new Message();
            
            const currentUser = Parse.User.current();
            if (!currentUser) throw new Error('User not logged in');
            
            newMessage.set('sender', currentUser);
            newMessage.set('recipientId', recipientId);
            newMessage.set('message', message);
            newMessage.set('chatType', chatType);
            newMessage.set('timestamp', new Date());
            newMessage.set('isRead', false);
            newMessage.set('isDelivered', true);
            
            const result = await newMessage.save();
            return { success: true, message: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // Get messages between users
    static async getMessages(recipientId, limit = 50) {
        try {
            const Message = Parse.Object.extend('Message');
            const query = new Parse.Query(Message);
            const currentUser = Parse.User.current();
            
            if (!currentUser) throw new Error('User not logged in');
            
            // Query for messages between current user and recipient
            const query1 = new Parse.Query(Message);
            query1.equalTo('sender', currentUser);
            query1.equalTo('recipientId', recipientId);
            
            const query2 = new Parse.Query(Message);
            query2.equalTo('recipientId', currentUser.id);
            query2.equalTo('sender', { __type: 'Pointer', className: '_User', objectId: recipientId });
            
            const mainQuery = Parse.Query.or(query1, query2);
            mainQuery.ascending('timestamp');
            mainQuery.limit(limit);
            mainQuery.include('sender');
            
            const messages = await mainQuery.find();
            return { success: true, messages };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // Get user's chat list
    static async getChatList() {
        try {
            const Message = Parse.Object.extend('Message');
            const query = new Parse.Query(Message);
            const currentUser = Parse.User.current();
            
            if (!currentUser) throw new Error('User not logged in');
            
            // Get latest messages for each chat
            query.equalTo('sender', currentUser);
            query.descending('timestamp');
            query.limit(100);
            query.include('sender');
            
            const messages = await query.find();
            
            // Group by recipient and get latest message
            const chatMap = new Map();
            messages.forEach(msg => {
                const recipientId = msg.get('recipientId');
                if (!chatMap.has(recipientId) || 
                    msg.get('timestamp') > chatMap.get(recipientId).get('timestamp')) {
                    chatMap.set(recipientId, msg);
                }
            });
            
            return { success: true, chats: Array.from(chatMap.values()) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // Mark messages as read
    static async markAsRead(senderId) {
        try {
            const Message = Parse.Object.extend('Message');
            const query = new Parse.Query(Message);
            const currentUser = Parse.User.current();
            
            query.equalTo('recipientId', currentUser.id);
            query.equalTo('sender', { __type: 'Pointer', className: '_User', objectId: senderId });
            query.equalTo('isRead', false);
            
            const unreadMessages = await query.find();
            
            unreadMessages.forEach(msg => {
                msg.set('isRead', true);
            });
            
            await Parse.Object.saveAll(unreadMessages);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// User Management Class
class ChatRiseUsers {
    // Search users
    static async searchUsers(searchTerm) {
        try {
            const query = new Parse.Query(Parse.User);
            query.contains('username', searchTerm);
            query.limit(20);
            
            const users = await query.find();
            return { success: true, users };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // Get all users (for demo)
    static async getAllUsers() {
        try {
            const query = new Parse.Query(Parse.User);
            query.limit(50);
            query.descending('createdAt');
            
            const users = await query.find();
            return { success: true, users };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // Update user status
    static async updateStatus(isOnline) {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) throw new Error('User not logged in');
            
            currentUser.set('isOnline', isOnline);
            currentUser.set('lastSeen', new Date());
            
            await currentUser.save();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Real-time functionality using Parse LiveQuery
class ChatRiseLive {
    static subscription = null;
    
    // Subscribe to new messages
    static async subscribeToMessages(callback) {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) throw new Error('User not logged in');
            
            const Message = Parse.Object.extend('Message');
            const query = new Parse.Query(Message);
            query.equalTo('recipientId', currentUser.id);
            
            this.subscription = await query.subscribe();
            
            this.subscription.on('create', (message) => {
                callback('new_message', message);
            });
            
            this.subscription.on('update', (message) => {
                callback('message_updated', message);
            });
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // Unsubscribe from messages
    static unsubscribe() {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
    }
}

// File Upload Class
class ChatRiseFiles {
    // Upload file
    static async uploadFile(fileInput, messageText = '') {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) throw new Error('User not logged in');
            
            const file = fileInput.files[0];
            if (!file) throw new Error('No file selected');
            
            // Create Parse File
            const parseFile = new Parse.File(file.name, file);
            await parseFile.save();
            
            // Create file message
            const Message = Parse.Object.extend('Message');
            const newMessage = new Message();
            
            newMessage.set('sender', currentUser);
            newMessage.set('message', messageText || `Shared ${file.name}`);
            newMessage.set('fileUrl', parseFile.url());
            newMessage.set('fileName', file.name);
            newMessage.set('fileType', file.type);
            newMessage.set('timestamp', new Date());
            newMessage.set('isFile', true);
            
            const result = await newMessage.save();
            return { success: true, message: result, fileUrl: parseFile.url() };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Initialize ChatRise Backend
class ChatRiseBackend {
    static async init() {
        try {
            // Check if user is already logged in
            const currentUser = Parse.User.current();
            if (currentUser) {
                // Update online status
                await ChatRiseUsers.updateStatus(true);
                
                // Subscribe to real-time messages
                await ChatRiseLive.subscribeToMessages((type, message) => {
                    this.handleRealtimeMessage(type, message);
                });
                
                return { success: true, user: currentUser };
            }
            
            return { success: true, user: null };
        } catch (error) {
            console.error('Backend initialization error:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Handle real-time messages
    static handleRealtimeMessage(type, message) {
        if (type === 'new_message') {
            // Add message to UI
            if (window.addRealtimeMessage) {
                window.addRealtimeMessage(message);
            }
            
            // Show notification
            if (Notification.permission === 'granted') {
                new Notification(`New message from ${message.get('sender').get('username')}`, {
                    body: message.get('message'),
                    icon: '/favicon.ico'
                });
            }
        }
    }
    
    // Cleanup on app close
    static cleanup() {
        ChatRiseLive.unsubscribe();
        ChatRiseUsers.updateStatus(false);
    }
}

// Export for use in other files
window.ChatRiseAuth = ChatRiseAuth;
window.ChatRiseChat = ChatRiseChat;
window.ChatRiseUsers = ChatRiseUsers;
window.ChatRiseLive = ChatRiseLive;
window.ChatRiseFiles = ChatRiseFiles;
window.ChatRiseBackend = ChatRiseBackend;

// Handle page unload
window.addEventListener('beforeunload', () => {
    ChatRiseBackend.cleanup();
});
