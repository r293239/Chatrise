// backend.js - Simple Backend for ChatRise

// Initialize Parse immediately
Parse.initialize('z5FgipCE12ScJNuYMbJ19EY2c7AXCxp5nWX7BWHT', 'QNQTH3G4VuLA5gkPIiCtoXZjJJMcP7P5zYsETOPV');
Parse.serverURL = 'https://parseapi.back4app.com';

// Simple Backend Object
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
            
            const result = await user.signUp();
            return { success: true, user: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Logout
    async logout() {
        try {
            await Parse.User.logOut();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Get all users
    async getUsers() {
        try {
            const query = new Parse.Query(Parse.User);
            query.limit(20);
            const users = await query.find();
            return { success: true, users };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Send message
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
            
            const result = await msg.save();
            return { success: true, message: result };
        } catch (error) {
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
            const query = new Parse.Query(Message);
            
            // Get messages between current user and the other user
            const query1 = new Parse.Query(Message);
            query1.equalTo('sender', currentUser);
            query1.equalTo('recipientId', userId);
            
            const query2 = new Parse.Query(Message);
            query2.equalTo('recipientId', currentUser.id);
            query2.equalTo('sender', { __type: 'Pointer', className: '_User', objectId: userId });
            
            const mainQuery = Parse.Query.or(query1, query2);
            mainQuery.ascending('timestamp');
            mainQuery.limit(50);
            mainQuery.include('sender');
            
            const messages = await mainQuery.find();
            return { success: true, messages };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Get recent chats
    async getChats() {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) {
                return { success: false, error: 'Not logged in' };
            }
            
            const Message = Parse.Object.extend('Message');
            const query = new Parse.Query(Message);
            
            // Get messages where user is involved
            const query1 = new Parse.Query(Message);
            query1.equalTo('sender', currentUser);
            
            const query2 = new Parse.Query(Message);
            query2.equalTo('recipientId', currentUser.id);
            
            const mainQuery = Parse.Query.or(query1, query2);
            mainQuery.descending('timestamp');
            mainQuery.limit(100);
            mainQuery.include('sender');
            
            const messages = await mainQuery.find();
            
            // Group by chat partner
            const chatMap = new Map();
            const currentUserId = currentUser.id;
            
            messages.forEach(msg => {
                const sender = msg.get('sender');
                const recipientId = msg.get('recipientId');
                
                let partnerId, partnerName;
                
                if (sender.id === currentUserId) {
                    // Message sent by current user
                    partnerId = recipientId;
                    partnerName = 'User'; // We'll update this
                } else {
                    // Message received by current user
                    partnerId = sender.id;
                    partnerName = sender.get('username');
                }
                
                if (!chatMap.has(partnerId)) {
                    chatMap.set(partnerId, {
                        id: partnerId,
                        name: partnerName,
                        lastMessage: msg.get('message'),
                        timestamp: msg.get('timestamp')
                    });
                }
            });
            
            return { success: true, chats: Array.from(chatMap.values()) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

// Make Backend available globally
window.Backend = Backend;
