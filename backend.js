// Initialize Parse immediately
Parse.initialize('z5FgipCE12ScJNuYMbJ19EY2c7AXCxp5nWX7BWHT', 'QNQTH3G4VuLA5gkPIiCtoXZjJJMcP7P5zYsETOPV');
Parse.serverURL = 'https://parseapi.back4app.com';

// Enhanced Backend Object with Contact System - FIXED VERSION
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
            user.set('description', '');
            user.set('profilePicture', null);
            
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
            this.stopActivityTracking();
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
    
    // =============== CONTACT SYSTEM FUNCTIONS (FIXED) ===============
    
    // Add contact (send friend request)
    async addContact(userId, username) {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) {
                return { success: false, error: 'Not logged in' };
            }
            
            // Check if contact already exists
            const existingContact = await this.getContactStatus(userId);
            if (existingContact.isContact || existingContact.isPending) {
                return { success: false, error: 'Contact already exists or request pending' };
            }
            
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
            console.error('Add contact error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Accept contact request
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
            console.error('Accept contact error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Reject/Remove contact
    async removeContact(contactId) {
        try {
            const Contact = Parse.Object.extend('Contact');
            const query = new Parse.Query(Contact);
            const contact = await query.get(contactId);
            await contact.destroy();
            
            return { success: true };
        } catch (error) {
            console.error('Remove contact error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Get contact status between current user and another user
    async getContactStatus(userId) {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) return { isContact: false, isPending: false };
            
            const Contact = Parse.Object.extend('Contact');
            
            // Check if we sent a request to them or they sent to us
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
            console.error('Get contact status error:', error);
            return { isContact: false, isPending: false, canAdd: true };
        }
    },
    
    // Get all contacts (accepted friends)
    async getContacts() {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) {
                return { success: false, error: 'Not logged in' };
            }
            
            const Contact = Parse.Object.extend('Contact');
            
            // Get contacts where current user is 'from' or 'to' and status is accepted
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
            
            // Process contacts to get friend info
            const friends = [];
            for (const contact of contacts) {
                const fromUser = contact.get('from');
                const toUser = contact.get('to');
                const currentUserId = currentUser.id;
                
                // Determine which user is the friend
                const friend = fromUser.id === currentUserId ? toUser : fromUser;
                
                if (friend) {
                    friends.push({
                        contactId: contact.id,
                        userId: friend.id,
                        username: friend.get('username'),
                        email: friend.get('email') || '',
                        isOnline: friend.get('isOnline') || false,
                        lastSeen: friend.get('lastSeen'),
                        acceptedAt: contact.get('acceptedAt')
                    });
                }
            }
            
            return { success: true, contacts: friends };
        } catch (error) {
            console.error('Get contacts error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Get pending contact requests (received)
    async getPendingRequests() {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) {
                return { success: false, error: 'Not logged in' };
            }
            
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
            console.error('Get pending requests error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Get sent requests (pending requests sent by current user)
    async getSentRequests() {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) {
                return { success: false, error: 'Not logged in' };
            }
            
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
            console.error('Get sent requests error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // =============== USER LISTING FUNCTIONS (FIXED) ===============
    
    // Get all users with contact status - FIXED VERSION
    async getUsersWithContactStatus() {
        try {
            console.log('Loading users with contact status...');
            
            const query = new Parse.Query(Parse.User);
            query.limit(100);
            query.descending('isOnline');
            query.descending('lastSeen');
            
            const users = await query.find();
            const currentUser = this.getCurrentUser();
            
            console.log('Found', users.length, 'total users');
            
            // Filter out current user and add contact status
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
            
            console.log('Returning', usersWithStatus.length, 'users with status');
            return { success: true, users: usersWithStatus };
        } catch (error) {
            console.error('Get users with contact status error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Get all users (legacy function)
    async getUsers() {
        return await this.getUsersWithContactStatus();
    },
    
    // Search users - FIXED VERSION
    async searchUsers(searchTerm) {
        try {
            if (!searchTerm || searchTerm.length < 2) {
                return await this.getUsersWithContactStatus();
            }
            
            const query = new Parse.Query(Parse.User);
            query.contains('username', searchTerm);
            query.limit(50);
            query.descending('isOnline');
            query.descending('lastSeen');
            
            const users = await query.find();
            const currentUser = this.getCurrentUser();
            
            // Filter out current user and add contact status
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
            console.error('Search users error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // =============== MESSAGING FUNCTIONS ===============
    
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
    
    // Send global message
    async sendGlobalMessage(message) {
        try {
            const Message = Parse.Object.extend('Message');
            const msg = new Message();
            
            const currentUser = Parse.User.current();
            if (!currentUser) {
                return { success: false, error: 'Not logged in' };
            }
            
            msg.set('sender', currentUser);
            msg.set('senderName', currentUser.get('username'));
            msg.set('recipientId', 'GLOBAL_CHAT');
            msg.set('message', message);
            msg.set('timestamp', new Date());
            msg.set('isRead', true);
            msg.set('messageType', 'global');
            msg.set('isGlobal', true);
            
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
            await this.markMessagesAsRead(userId);
            
            return { success: true, messages };
        } catch (error) {
            console.error('Get messages error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Get global messages
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
    
    // Get recent chats
    async getChats() {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) {
                return { success: false, error: 'Not logged in' };
            }
            
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
                        console.warn('Could not fetch partner user:', error);
                    }
                } else if (sender) {
                    partnerId = sender.id;
                    partnerName = sender.get('username') || 'Unknown User';
                } else {
                    continue;
                }
                
                if (!chatMap.has(partnerId)) {
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
                    console.warn('Could not update online status:', error);
                }
            }
            
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
            query.notEqualTo('messageType', 'global');
            
            return await query.count();
        } catch (error) {
            return 0;
        }
    },
    
    // Update user activity
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

Backend.startActivityTracking = function() {
    if (activityInterval) clearInterval(activityInterval);
    
    activityInterval = setInterval(async () => {
        if (Backend.isLoggedIn()) {
            await Backend.updateActivity();
        }
    }, 30000);
};

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
            Backend.stopActivityTracking();
        } else {
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
