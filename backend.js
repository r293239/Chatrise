// simple-backend.js - Fast & Simple Backend

// Initialize Parse immediately
Parse.initialize('z5FgipCE12ScJNuYMbJ19EY2c7AXCxp5nWX7BWHT', 'QNQTH3G4VuLA5gkPIiCtoXZjJJMcP7P5zYsETOPV');
Parse.serverURL = 'https://parseapi.back4app.com';

// Simple Auth Functions
const SimpleAuth = {
    // Quick login
    async login(username, password) {
        try {
            const user = await Parse.User.logIn(username, password);
            return { success: true, user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Quick register
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
    
    // Quick logout
    async logout() {
        try {
            await Parse.User.logOut();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Get current user
    getCurrentUser() {
        return Parse.User.current();
    }
};

// Simple Chat Functions
const SimpleChat = {
    // Send message quickly
    async sendMessage(recipientId, message) {
        try {
            const Message = Parse.Object.extend('Message');
            const msg = new Message();
            
            msg.set('sender', Parse.User.current());
            msg.set('recipientId', recipientId);
            msg.set('message', message);
            msg.set('timestamp', new Date());
            
            const result = await msg.save();
            return { success: true, message: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Get messages quickly (last 20)
    async getMessages(recipientId) {
        try {
            const Message = Parse.Object.extend('Message');
            const query = new Parse.Query(Message);
            const currentUser = Parse.User.current();
            
            // Simple query - just get recent messages
            query.limit(20);
            query.descending('timestamp');
            query.include('sender');
            
            const messages = await query.find();
            
            // Filter messages between current user and recipient
            const filtered = messages.filter(msg => {
                const sender = msg.get('sender');
                const recipient = msg.get('recipientId');
                
                return (sender.id === currentUser.id && recipient === recipientId) ||
                       (sender.id === recipientId && recipient === currentUser.id);
            });
            
            return { success: true, messages: filtered.reverse() };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

// Simple User Functions
const SimpleUsers = {
    // Get all users quickly
    async getAllUsers() {
        try {
            const query = new Parse.Query(Parse.User);
            query.limit(10); // Only get 10 users for speed
            
            const users = await query.find();
            return { success: true, users };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

// Export to window
window.SimpleAuth = SimpleAuth;
window.SimpleChat = SimpleChat;
window.SimpleUsers = SimpleUsers;
