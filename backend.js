// backend.js - Enhanced Backend for ChatRise with Global Chat

// Initialize Parse immediately
Parse.initialize('z5FgipCE12ScJNuYMbJ19EY2c7AXCxp5nWX7BWHT', 'QNQTH3G4VuLA5gkPIiCtoXZjJJMcP7P5zYsETOPV');
Parse.serverURL = 'https://parseapi.back4app.com';

// Enhanced Backend Object
const Backend = {
    
    // Check if user is logged in
    isLoggedIn() {
        return Parse.User.current() !== null;
    },
    
    // Get current user
    getCurrentUser() {
        return Parse.User.current();
    },
    
    // Login
    async login(username, password) {
        try {
            const user = await Parse.User.logIn(username, password);
            await this.updateUserStatus(true);
            return { success: true, user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Register
    async register(username, email, password) {
        try {
            const user = new Parse.User();
            user.set('username', username);
            user.set('email', email);
            user.set('password', password);
            user.set('isOnline', true);
            user.set('lastSeen', new Date());
            user.set('joinedAt', new Date());
            
            const result = await user.signUp();
            await this.updateUserStatus(true);
            return { success: true, user: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Logout
    async logout() {
        try {
            await this.updateUserStatus(false);
            await Parse.User.logOut();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Update user online status
    async updateUserStatus(isOnline) {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) return { success: false, error: 'Not logged in' };
            
            currentUser.set('isOnline', isOnline);
            currentUser.set('lastSeen', new Date());
            await currentUser.save();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Get all users with online status
    async getUsers() {
        try {
            const query = new Parse.Query(Parse.User);
            query.limit(50);
            query.descending('isOnline');
            query.descending('lastSeen');
            const users = await query.find();
            return { success: true, users };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Get online users count
    async getOnlineUsersCount() {
        try {
            const query = new Parse.Query(Parse.User);
            query.equalTo('isOnline', true);
            const count = await query.count();
            return { success: true, count };
        } catch (error) {
            return { success: false, error: error.message, count: 0 };
        }
    },
    
    // Send private message
    async sendMessage(recipientId, message) {
        try {
            const Message = Parse.Object.extend('Message');
            const msg = new Message();
            
            const currentUser = Parse.User.current();
            if (!currentUser) {
                return { success: false, error: 'Not logged in' };
            }
            
            msg.set('sender', currentUser);
            msg.set('senderName', currentUser.get('username'));
            msg.set('recipientId', recipientId);
            msg.set('message', message);
            msg.set('timestamp', new Date());
            msg.set('isRead', false);
            msg.set('messageType', 'private');
            
            const result = await msg.save();
            return { success: true, message: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Send global message - FIXED VERSION
    async sendGlobalMessage(message) {
        try {
            // Use the same Message class but with a special flag for global messages
            const Message = Parse.Object.extend('Message');
            const msg = new Message();
            
            const currentUser = Parse.User.current();
            if (!currentUser) {
                return { success: false, error: 'Not logged in' };
            }
            
            msg.set('sender', currentUser);
            msg.set('senderName', currentUser.get('username'));
            msg.set('recipientId', 'GLOBAL_CHAT'); // Special identifier for global messages
            msg.set('message', message);
            msg.set('timestamp', new Date());
            msg.set('isRead', true); // Global messages are always "read"
            msg.set('messageType', 'global');
            msg.set('isGlobal', true); // Additional flag to easily identify global messages
            
            const result = await msg.save();
            return { success: true, message: result };
        } catch (error) {
            console.error('Global message send error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Get messages between users
    async getMessages(userId) {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) {
                return { success: false, error: 'Not logged in' };
            }
            
            const Message = Parse.Object.extend('Message');
            
            // Create queries for both directions of messages
            const query1 = new Parse.Query(Message);
            query1.equalTo('sender', currentUser);
            query1.equalTo('recipientId', userId);
            query1.notEqualTo('messageType', 'global'); // Exclude global messages
            
            const query2 = new Parse.Query(Message);
            query2.equalTo('recipientId', currentUser.id);
            query2.notEqualTo('messageType', 'global'); // Exclude global messages
            
            // Create a user pointer for the sender query
            const senderUser = new Parse.User();
            senderUser.id = userId;
            query2.equalTo('sender', senderUser);
            
            const mainQuery = Parse.Query.or(query1, query2);
            mainQuery.ascending('timestamp');
            mainQuery.limit(100);
            mainQuery.include('sender');
            
            const messages = await mainQuery.find();
            
            // Mark messages as read
            await this.markMessagesAsRead(userId);
            
            return { success: true, messages };
        } catch (error) {
            console.error('Get messages error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Get global messages - FIXED VERSION
    async getGlobalMessages() {
        try {
            const Message = Parse.Object.extend('Message');
            const query = new Parse.Query(Message);
            
            // Query for global messages using the special identifier
            query.equalTo('recipientId', 'GLOBAL_CHAT');
            query.equalTo('messageType', 'global');
            query.ascending('timestamp');
            query.limit(50); // Limit to last 50 global messages
            query.include('sender');
            
            const messages = await query.find();
            console.log('Global messages loaded:', messages.length); // Debug log
            return { success: true, messages };
        } catch (error) {
            console.error('Global messages error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Mark messages as read
    async markMessagesAsRead(senderId) {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) return { success: false };
            
            const Message = Parse.Object.extend('Message');
            const query = new Parse.Query(Message);
            query.equalTo('recipientId', currentUser.id);
            query.equalTo('sender', { __type: 'Pointer', className: '_User', objectId: senderId });
            query.equalTo('isRead', false);
            
            const messages = await query.find();
            
            for (const message of messages) {
                message.set('isRead', true);
                await message.save();
            }
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Get recent chats - UPDATED to exclude global messages
    async getChats() {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) {
                return { success: false, error: 'Not logged in' };
            }
            
            const Message = Parse.Object.extend('Message');
            
            // Get messages where user is involved (excluding global messages)
            const query1 = new Parse.Query(Message);
            query1.equalTo('sender', currentUser);
            query1.notEqualTo('messageType', 'global'); // Exclude global messages
            
            const query2 = new Parse.Query(Message);
            query2.equalTo('recipientId', currentUser.id);
            query2.notEqualTo('messageType', 'global'); // Exclude global messages
            
            const mainQuery = Parse.Query.or(query1, query2);
            mainQuery.descending('timestamp');
            mainQuery.limit(200);
            mainQuery.include('sender');
            
            const messages = await mainQuery.find();
            
            // Group by chat partner
            const chatMap = new Map();
            const currentUserId = currentUser.id;
            
            for (const msg of messages) {
                const sender = msg.get('sender');
                const recipientId = msg.get('recipientId');
                
                let partnerId, partnerName;
                
                if (sender && sender.id === currentUserId) {
                    // Message sent by current user
                    partnerId = recipientId;
                    // Get partner name from user query
                    try {
                        const userQuery = new Parse.Query(Parse.User);
                        const partnerUser = await userQuery.get(partnerId);
                        partnerName = partnerUser.get('username') || 'Unknown User';
                    } catch (error) {
                        partnerName = 'Unknown User';
                        console.warn('Could not fetch partner user:', error);
                    }
                } else if (sender) {
                    // Message received by current user
                    partnerId = sender.id;
                    partnerName = sender.get('username') || 'Unknown User';
                } else {
                    // Skip if sender is null
                    continue;
                }
                
                if (!chatMap.has(partnerId)) {
                    // Get unread count
                    let unreadCount = 0;
                    try {
                        unreadCount = await this.getUnreadCount(partnerId);
                    } catch (error) {
                        console.warn('Could not get unread count:', error);
                    }
                    
                    chatMap.set(partnerId, {
                        id: partnerId,
                        name: partnerName,
                        lastMessage: msg.get('message') || '',
                        timestamp: msg.get('timestamp'),
                        unreadCount: unreadCount,
                        isOnline: false // Will be updated below
                    });
                }
            }
            
            // Update online status for each chat partner
            const chats = Array.from(chatMap.values());
            for (const chat of chats) {
                try {
                    const userQuery = new Parse.Query(Parse.User);
                    const partnerUser = await userQuery.get(chat.id);
                    chat.isOnline = partnerUser.get('isOnline') || false;
                    chat.lastSeen = partnerUser.get('lastSeen');
                } catch (error) {
                    chat.isOnline = false;
                    console.warn('Could not update online status:', error);
                }
            }
            
            // Sort by timestamp
            chats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            return { success: true, chats };
        } catch (error) {
            console.error('Get chats error:', error);
            return { success: false, error: error.message, chats: [] };
        }
    },
    
    // Get unread message count
    async getUnreadCount(senderId) {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) return 0;
            
            const Message = Parse.Object.extend('Message');
            const query = new Parse.Query(Message);
            query.equalTo('recipientId', currentUser.id);
            query.equalTo('sender', { __type: 'Pointer', className: '_User', objectId: senderId });
            query.equalTo('isRead', false);
            query.notEqualTo('messageType', 'global'); // Exclude global messages from unread count
            
            return await query.count();
        } catch (error) {
            return 0;
        }
    },
    
    // Search users
    async searchUsers(searchTerm) {
        try {
            if (!searchTerm || searchTerm.length < 2) {
                return this.getUsers();
            }
            
            const query = new Parse.Query(Parse.User);
            query.contains('username', searchTerm.toLowerCase());
            query.limit(20);
            query.descending('isOnline');
            query.descending('lastSeen');
            
            const users = await query.find();
            return { success: true, users };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Real-time subscriptions (for future use)
    async subscribeToMessages(callback) {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) return null;
            
            const Message = Parse.Object.extend('Message');
            const query = new Parse.Query(Message);
            query.equalTo('recipientId', currentUser.id);
            
            const subscription = await query.subscribe();
            subscription.on('create', callback);
            
            return subscription;
        } catch (error) {
            console.error('Subscription error:', error);
            return null;
        }
    },
    
    // Subscribe to global messages - FIXED VERSION
    async subscribeToGlobalMessages(callback) {
        try {
            const Message = Parse.Object.extend('Message');
            const query = new Parse.Query(Message);
            query.equalTo('recipientId', 'GLOBAL_CHAT');
            query.equalTo('messageType', 'global');
            
            const subscription = await query.subscribe();
            subscription.on('create', callback);
            
            return subscription;
        } catch (error) {
            console.error('Global subscription error:', error);
            return null;
        }
    },
    
    // Update user activity (keep alive)
    async updateActivity() {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) return { success: false };
            
            currentUser.set('lastSeen', new Date());
            currentUser.set('isOnline', true);
            await currentUser.save();
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

// Auto-update user activity every 30 seconds
let activityInterval = null;

// Start activity tracking
Backend.startActivityTracking = function() {
    if (activityInterval) clearInterval(activityInterval);
    
    activityInterval = setInterval(async () => {
        if (Backend.isLoggedIn()) {
            await Backend.updateActivity();
        }
    }, 30000); // 30 seconds
};

// Stop activity tracking
Backend.stopActivityTracking = function() {
    if (activityInterval) {
        clearInterval(activityInterval);
        activityInterval = null;
    }
};

// Handle page visibility changes
document.addEventListener('visibilitychange', async () => {
    if (Backend.isLoggedIn()) {
        if (document.hidden) {
            // Page is hidden, user might be away
            Backend.stopActivityTracking();
        } else {
            // Page is visible, user is back
            await Backend.updateActivity();
            Backend.startActivityTracking();
        }
    }
});

// Handle page unload
window.addEventListener('beforeunload', async () => {
    if (Backend.isLoggedIn()) {
        await Backend.updateUserStatus(false);
    }
});

// Make Backend available globally
window.Backend = Backend;
