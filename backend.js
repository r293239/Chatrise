// backend.js - Complete Backend Services
// © 2025 [Reuben Yee]. All rights reserved.

console.log('🔄 Initializing Backend Services...');

// Initialize Parse
try {
    Parse.initialize(CONFIG.PARSE_APP_ID, CONFIG.PARSE_JS_KEY);
    Parse.serverURL = CONFIG.PARSE_SERVER_URL;
    console.log('✅ Parse initialized successfully');
} catch (error) {
    console.error('❌ Parse initialization failed:', error);
}

// Initialize EmailJS if available
if (typeof emailjs !== 'undefined') {
    emailjs.init(CONFIG.EMAILJS_PUBLIC_KEY);
    console.log('✅ EmailJS initialized');
}

// COMPLETE BACKEND OBJECT
const Backend = {
    // Activity tracking
    activityInterval: null,
    
    // Check if user is logged in
    isLoggedIn() {
        const user = Parse.User.current();
        return !!user;
    },
    
    // Get current user
    getCurrentUser() {
        return Parse.User.current();
    },
    
    // Login with email verification check
    async login(username, password) {
        try {
            const user = await Parse.User.logIn(username, password);
            
            // Check if email is verified
            if (!user.get('emailVerified')) {
                await Parse.User.logOut();
                return { 
                    success: false, 
                    error: 'Please verify your email address before logging in.' 
                };
            }
            
            await this.updateUserStatus(true);
            return { success: true, user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Register with EmailJS
    async register(username, email, password) {
        try {
            const user = new Parse.User();
            user.set('username', username);
            user.set('email', email);
            user.set('password', password);
            user.set('isOnline', true);
            user.set('lastSeen', new Date());
            user.set('joinedAt', new Date());
            user.set('emailVerified', false);
            
            const result = await user.signUp();
            
            // Send verification email
            try {
                await emailjs.send(
                    CONFIG.EMAILJS_SERVICE_ID,
                    CONFIG.EMAILJS_TEMPLATE_ID,
                    {
                        to_name: username,
                        to_email: email,
                        user_id: result.id,
                        app_name: 'ChatRise',
                        verification_link: `${window.location.origin}/verify-email.html?userId=${result.id}`,
                        site_url: window.location.origin
                    }
                );
                console.log('✅ Verification email sent');
            } catch (emailError) {
                console.warn('Email sending failed:', emailError);
            }
            
            await this.updateUserStatus(true);
            return { success: true, user: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Verify email
    async verifyEmail(userId) {
        try {
            const query = new Parse.Query(Parse.User);
            const user = await query.get(userId);
            user.set('emailVerified', true);
            await user.save();
            return { success: true, user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Logout
    async logout() {
        try {
            await this.updateUserStatus(false);
            this.stopActivityTracking();
            await Parse.User.logOut();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Update user status
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
    
    // CONTACT SYSTEM
    async addContact(userId, username) {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) return { success: false, error: 'Not logged in' };
            
            const Contact = Parse.Object.extend('Contact');
            const contact = new Contact();
            
            contact.set('from', currentUser);
            contact.set('to', { __type: 'Pointer', className: '_User', objectId: userId });
            contact.set('fromUsername', currentUser.get('username'));
            contact.set('toUsername', username);
            contact.set('status', 'pending');
            contact.set('timestamp', new Date());
            
            const result = await contact.save();
            return { success: true, contact: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    async acceptContact(contactId) {
        try {
            const Contact = Parse.Object.extend('Contact');
            const query = new Parse.Query(Contact);
            const contact = await query.get(contactId);
            
            contact.set('status', 'accepted');
            contact.set('acceptedAt', new Date());
            await contact.save();
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    async removeContact(contactId) {
        try {
            const Contact = Parse.Object.extend('Contact');
            const query = new Parse.Query(Contact);
            const contact = await query.get(contactId);
            await contact.destroy();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    async getContactStatus(userId) {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) return { isContact: false, isPending: false };
            
            const Contact = Parse.Object.extend('Contact');
            const query1 = new Parse.Query(Contact);
            query1.equalTo('from', currentUser);
            query1.equalTo('to', { __type: 'Pointer', className: '_User', objectId: userId });
            
            const query2 = new Parse.Query(Contact);
            query2.equalTo('to', currentUser);
            query2.equalTo('from', { __type: 'Pointer', className: '_User', objectId: userId });
            
            const mainQuery = Parse.Query.or(query1, query2);
            const contacts = await mainQuery.find();
            
            if (contacts.length === 0) {
                return { isContact: false, isPending: false, canAdd: true };
            }
            
            const contact = contacts[0];
            const status = contact.get('status');
            const fromId = contact.get('from').id;
            const currentUserId = currentUser.id;
            
            return {
                isContact: status === 'accepted',
                isPending: status === 'pending',
                canAdd: false,
                contactId: contact.id,
                sentByMe: fromId === currentUserId,
                receivedByMe: fromId !== currentUserId
            };
        } catch (error) {
            return { isContact: false, isPending: false, canAdd: true };
        }
    },
    
    async getContacts() {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) return { success: false, error: 'Not logged in' };
            
            const Contact = Parse.Object.extend('Contact');
            const query1 = new Parse.Query(Contact);
            query1.equalTo('from', currentUser);
            query1.equalTo('status', 'accepted');
            query1.include('to');
            
            const query2 = new Parse.Query(Contact);
            query2.equalTo('to', currentUser);
            query2.equalTo('status', 'accepted');
            query2.include('from');
            
            const mainQuery = Parse.Query.or(query1, query2);
            mainQuery.descending('acceptedAt');
            
            const contacts = await mainQuery.find();
            const friends = [];
            
            for (const contact of contacts) {
                const fromUser = contact.get('from');
                const toUser = contact.get('to');
                const currentUserId = currentUser.id;
                
                const friend = fromUser.id === currentUserId ? toUser : fromUser;
                
                if (friend) {
                    friends.push({
                        contactId: contact.id,
                        userId: friend.id,
                        username: friend.get('username'),
                        isOnline: friend.get('isOnline') || false,
                        lastSeen: friend.get('lastSeen'),
                        acceptedAt: contact.get('acceptedAt')
                    });
                }
            }
            
            return { success: true, contacts: friends };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    async getPendingRequests() {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) return { success: false, error: 'Not logged in' };
            
            const Contact = Parse.Object.extend('Contact');
            const query = new Parse.Query(Contact);
            query.equalTo('to', currentUser);
            query.equalTo('status', 'pending');
            query.include('from');
            query.descending('timestamp');
            
            const requests = await query.find();
            const pendingRequests = requests.map(request => ({
                contactId: request.id,
                fromUserId: request.get('from').id,
                fromUsername: request.get('from').get('username'),
                timestamp: request.get('timestamp'),
                isOnline: request.get('from').get('isOnline') || false
            }));
            
            return { success: true, requests: pendingRequests };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    async getSentRequests() {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) return { success: false, error: 'Not logged in' };
            
            const Contact = Parse.Object.extend('Contact');
            const query = new Parse.Query(Contact);
            query.equalTo('from', currentUser);
            query.equalTo('status', 'pending');
            query.include('to');
            query.descending('timestamp');
            
            const requests = await query.find();
            const sentRequests = requests.map(request => ({
                contactId: request.id,
                toUserId: request.get('to').id,
                toUsername: request.get('to').get('username'),
                timestamp: request.get('timestamp'),
                isOnline: request.get('to').get('isOnline') || false
            }));
            
            return { success: true, requests: sentRequests };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // USER MANAGEMENT
    async getUsersWithContactStatus() {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) return { success: false, error: 'Not logged in' };
            
            const query = new Parse.Query(Parse.User);
            query.limit(100);
            query.descending('lastSeen');
            
            const users = await query.find();
            const usersWithStatus = [];
            
            for (const user of users) {
                if (user.id !== currentUser.id) {
                    const contactStatus = await this.getContactStatus(user.id);
                    usersWithStatus.push({
                        id: user.id,
                        username: user.get('username'),
                        email: user.get('email') || '',
                        isOnline: user.get('isOnline') || false,
                        lastSeen: user.get('lastSeen'),
                        ...contactStatus
                    });
                }
            }
            
            return { success: true, users: usersWithStatus };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    async searchUsers(searchTerm) {
        try {
            if (!searchTerm || searchTerm.length < 1) {
                return await this.getUsersWithContactStatus();
            }
            
            const query = new Parse.Query(Parse.User);
            query.contains('username', searchTerm);
            query.limit(50);
            query.descending('lastSeen');
            
            const users = await query.find();
            const currentUser = this.getCurrentUser();
            const usersWithStatus = [];
            
            for (const user of users) {
                if (user.id !== currentUser.id) {
                    const contactStatus = await this.getContactStatus(user.id);
                    usersWithStatus.push({
                        id: user.id,
                        username: user.get('username'),
                        email: user.get('email') || '',
                        isOnline: user.get('isOnline') || false,
                        lastSeen: user.get('lastSeen'),
                        ...contactStatus
                    });
                }
            }
            
            return { success: true, users: usersWithStatus };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
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
    
    // MESSAGING SYSTEM
    async sendMessage(recipientId, message) {
        try {
            const Message = Parse.Object.extend('Message');
            const msg = new Message();
            
            const currentUser = Parse.User.current();
            if (!currentUser) return { success: false, error: 'Not logged in' };
            
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
    
    async sendGlobalMessage(message) {
        try {
            const Message = Parse.Object.extend('Message');
            const msg = new Message();
            
            const currentUser = Parse.User.current();
            if (!currentUser) return { success: false, error: 'Not logged in' };
            
            msg.set('sender', currentUser);
            msg.set('senderName', currentUser.get('username'));
            msg.set('recipientId', 'GLOBAL_CHAT');
            msg.set('message', message);
            msg.set('timestamp', new Date());
            msg.set('isRead', true);
            msg.set('messageType', 'global');
            
            const result = await msg.save();
            return { success: true, message: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    async getMessages(userId) {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) return { success: false, error: 'Not logged in' };
            
            const Message = Parse.Object.extend('Message');
            const query1 = new Parse.Query(Message);
            query1.equalTo('sender', currentUser);
            query1.equalTo('recipientId', userId);
            query1.notEqualTo('messageType', 'global');
            
            const query2 = new Parse.Query(Message);
            query2.equalTo('recipientId', currentUser.id);
            query2.notEqualTo('messageType', 'global');
            
            const senderUser = new Parse.User();
            senderUser.id = userId;
            query2.equalTo('sender', senderUser);
            
            const mainQuery = Parse.Query.or(query1, query2);
            mainQuery.ascending('timestamp');
            mainQuery.limit(100);
            mainQuery.include('sender');
            
            const messages = await mainQuery.find();
            return { success: true, messages };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    async getGlobalMessages() {
        try {
            const Message = Parse.Object.extend('Message');
            const query = new Parse.Query(Message);
            
            query.equalTo('recipientId', 'GLOBAL_CHAT');
            query.equalTo('messageType', 'global');
            query.ascending('timestamp');
            query.limit(50);
            query.include('sender');
            
            const messages = await query.find();
            return { success: true, messages };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    async getChats() {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) return { success: false, error: 'Not logged in' };
            
            const Message = Parse.Object.extend('Message');
            const query1 = new Parse.Query(Message);
            query1.equalTo('sender', currentUser);
            query1.notEqualTo('messageType', 'global');
            
            const query2 = new Parse.Query(Message);
            query2.equalTo('recipientId', currentUser.id);
            query2.notEqualTo('messageType', 'global');
            
            const mainQuery = Parse.Query.or(query1, query2);
            mainQuery.descending('timestamp');
            mainQuery.limit(200);
            mainQuery.include('sender');
            
            const messages = await mainQuery.find();
            const chatMap = new Map();
            const currentUserId = currentUser.id;
            
            for (const msg of messages) {
                const sender = msg.get('sender');
                const recipientId = msg.get('recipientId');
                
                let partnerId, partnerName;
                
                if (sender && sender.id === currentUserId) {
                    partnerId = recipientId;
                    try {
                        const userQuery = new Parse.Query(Parse.User);
                        const partnerUser = await userQuery.get(partnerId);
                        partnerName = partnerUser.get('username') || 'Unknown User';
                    } catch (error) {
                        partnerName = 'Unknown User';
                    }
                } else if (sender) {
                    partnerId = sender.id;
                    partnerName = sender.get('username') || 'Unknown User';
                } else {
                    continue;
                }
                
                if (!chatMap.has(partnerId)) {
                    chatMap.set(partnerId, {
                        id: partnerId,
                        name: partnerName,
                        lastMessage: msg.get('message') || '',
                        timestamp: msg.get('timestamp'),
                        unreadCount: 0,
                        isOnline: false
                    });
                }
            }
            
            const chats = Array.from(chatMap.values());
            for (const chat of chats) {
                try {
                    const userQuery = new Parse.Query(Parse.User);
                    const partnerUser = await userQuery.get(chat.id);
                    chat.isOnline = partnerUser.get('isOnline') || false;
                    chat.lastSeen = partnerUser.get('lastSeen');
                } catch (error) {
                    chat.isOnline = false;
                }
            }
            
            chats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            return { success: true, chats };
        } catch (error) {
            return { success: false, error: error.message, chats: [] };
        }
    },
    
    // ACTIVITY TRACKING
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
    },
    
    startActivityTracking() {
        if (this.activityInterval) clearInterval(this.activityInterval);
        
        this.activityInterval = setInterval(async () => {
            if (this.isLoggedIn()) {
                await this.updateActivity();
            }
        }, 30000);
    },
    
    stopActivityTracking() {
        if (this.activityInterval) {
            clearInterval(this.activityInterval);
            this.activityInterval = null;
        }
    }
};

// Make Backend available globally
window.Backend = Backend;
console.log('✅ Backend Services initialized successfully');
console.log('Available methods:', Object.keys(Backend));
