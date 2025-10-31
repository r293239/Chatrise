// backend.js - Backend functionality for ChatRise
// © 2025 [Reuben Yee]. All rights reserved.

// Check if Backend already exists to prevent duplicate declaration
if (typeof Backend !== 'undefined') {
    console.log('⚠️ Backend already initialized, skipping...');
} else {
    class Backend {
        constructor() {
            this.isInitialized = false;
            this.currentUser = null;
            this.activityInterval = null;
            this.init();
        }

        init() {
            try {
                // Check if CONFIG is available
                if (typeof CONFIG === 'undefined') {
                    console.error('❌ CONFIG not found - make sure config.js is loaded');
                    return;
                }

                // Check if Parse is available
                if (typeof Parse === 'undefined') {
                    console.error('❌ Parse SDK not loaded');
                    return;
                }

                // Initialize Parse
                Parse.initialize(CONFIG.PARSE_APP_ID, CONFIG.PARSE_JS_KEY);
                Parse.serverURL = CONFIG.PARSE_SERVER_URL;
                
                console.log('🔧 Parse initialized with:', {
                    appId: CONFIG.PARSE_APP_ID ? '✓ Set' : '✗ Missing',
                    serverURL: CONFIG.PARSE_SERVER_URL ? '✓ Set' : '✗ Missing'
                });
                
                this.isInitialized = true;
                console.log('✅ Backend initialized successfully');
                
                // Set current user if logged in
                this.currentUser = Parse.User.current();
                if (this.currentUser) {
                    console.log('✅ User session restored:', this.currentUser.id, this.currentUser.get('username'));
                } else {
                    console.log('ℹ️ No user session found');
                }
            } catch (error) {
                console.error('❌ Backend initialization failed:', error);
                this.isInitialized = false;
            }
        }

        // =============== AUTHENTICATION ===============

        async register(username, email, password) {
            if (!this.isInitialized) {
                return { success: false, error: 'Backend not initialized. Please refresh the page.' };
            }

            try {
                console.log('🔐 Starting registration process...');
                
                // Create new Parse User
                const user = new Parse.User();
                user.set('username', username);
                user.set('email', email);
                user.set('password', password);
                
                console.log('📝 Creating user account...');
                
                const userResult = await user.signUp();
                console.log('✅ User account created successfully');
                
                this.currentUser = userResult;
                
                return {
                    success: true,
                    user: userResult
                };

            } catch (error) {
                console.error('❌ Registration failed:', error);
                let errorMessage = 'Registration failed';
                
                if (error.code === 202) {
                    errorMessage = 'Username already taken';
                } else if (error.code === 203) {
                    errorMessage = 'Email already registered';
                } else if (error.code === 125) {
                    errorMessage = 'Invalid email address';
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                return { success: false, error: errorMessage };
            }
        }

        async login(username, password) {
            if (!this.isInitialized) {
                return { success: false, error: 'Backend not initialized. Please refresh the page.' };
            }

            try {
                console.log('🔐 Attempting login...');
                const user = await Parse.User.logIn(username, password);
                console.log('✅ Login successful:', user.get('username'));
                
                this.currentUser = user;
                
                // Start activity tracking
                this.startActivityTracking();
                
                return { success: true, user: user };

            } catch (error) {
                console.error('❌ Login failed:', error);
                let errorMessage = 'Login failed';
                
                if (error.code === 101) {
                    errorMessage = 'Invalid username or password';
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                return { success: false, error: errorMessage };
            }
        }

        async logout() {
            try {
                this.stopActivityTracking();
                
                if (this.currentUser) {
                    await this.updateUserStatus(false);
                }
                
                await Parse.User.logOut();
                this.currentUser = null;
                console.log('✅ Logout successful');
                
                return { success: true };
            } catch (error) {
                console.error('❌ Logout failed:', error);
                return { success: false, error: error.message };
            }
        }

        // =============== USER MANAGEMENT ===============

        getCurrentUser() {
            return this.currentUser || Parse.User.current();
        }

        isLoggedIn() {
            const user = this.getCurrentUser();
            return !!(user && user.authenticated());
        }

        async updateUserStatus(isOnline = true) {
            if (!this.isLoggedIn()) return;

            try {
                const user = this.getCurrentUser();
                user.set('isOnline', isOnline);
                user.set('lastSeen', new Date());
                await user.save();
            } catch (error) {
                console.error('❌ Failed to update user status:', error);
            }
        }

        startActivityTracking() {
            this.updateUserStatus(true);
            
            this.activityInterval = setInterval(() => {
                if (this.isLoggedIn()) {
                    this.updateUserStatus(true);
                }
            }, 30000);
        }

        stopActivityTracking() {
            if (this.activityInterval) {
                clearInterval(this.activityInterval);
                this.activityInterval = null;
            }
        }

        // =============== USER SEARCH - USING CLOUD FUNCTIONS ===============

        async getUsersWithContactStatus() {
            if (!this.isLoggedIn()) {
                console.log('❌ getUsersWithContactStatus: User not logged in');
                return { success: false, error: 'Not logged in' };
            }

            try {
                console.log('🔍 Using Cloud Function: getUsersWithContactStatus...');
                const result = await Parse.Cloud.run('getUsersWithContactStatus');
                console.log(`✅ Cloud function returned ${result.length} users`);
                return { success: true, users: result };
            } catch (error) {
                console.error('❌ Cloud function getUsersWithContactStatus failed:', error);
                // Fallback to direct query
                console.log('🔍 Falling back to direct query...');
                return await this.getUsersWithContactStatusFallback();
            }
        }

        async getUsersWithContactStatusFallback() {
            try {
                console.log('🔍 Starting getUsersWithContactStatus...');
                console.log('🔍 Current user:', this.currentUser.id, this.currentUser.get('username'));
                
                const User = Parse.User;
                const query = new Parse.Query(User);
                
                query.notEqualTo('objectId', this.currentUser.id);
                query.limit(100);
                
                console.log('🔍 Query setup complete, executing...');
                
                const users = await query.find();
                console.log(`🔍 Query returned ${users.length} users (excluding current user)`);
                
                if (users.length === 0) {
                    console.log('❌ No other users found');
                    return { success: true, users: [] };
                }
                
                console.log('🔍 Found users:', users.map(u => ({
                    id: u.id,
                    username: u.get('username'),
                    email: u.get('email'),
                    isOnline: u.get('isOnline')
                })));
                
                const usersWithStatus = await Promise.all(
                    users.map(async (user) => {
                        try {
                            const contactStatus = await this.getContactStatus(user.id);
                            return {
                                id: user.id,
                                username: user.get('username'),
                                email: user.get('email'),
                                isOnline: user.get('isOnline') || false,
                                lastSeen: user.get('lastSeen'),
                                ...contactStatus
                            };
                        } catch (error) {
                            console.error(`❌ Error processing user ${user.id}:`, error);
                            return {
                                id: user.id,
                                username: user.get('username') || 'Unknown',
                                isOnline: false,
                                lastSeen: null,
                                isContact: false,
                                isPending: false
                            };
                        }
                    })
                );
                
                console.log('✅ Users with status processed:', usersWithStatus);
                return { success: true, users: usersWithStatus };

            } catch (error) {
                console.error('❌ Failed to load users:', error);
                return { 
                    success: false, 
                    error: error.message,
                    users: []
                };
            }
        }

        async searchUsers(searchTerm) {
            if (!this.isLoggedIn()) {
                return { success: false, error: 'Not logged in' };
            }

            try {
                console.log(`🔍 Using Cloud Function: searchUsers with "${searchTerm}"`);
                const result = await Parse.Cloud.run('searchUsers', { searchTerm });
                console.log(`✅ Cloud function returned ${result.length} users`);
                return { success: true, users: result };
            } catch (error) {
                console.error('❌ Cloud function searchUsers failed:', error);
                // Fallback to direct query
                return await this.searchUsersFallback(searchTerm);
            }
        }

        async searchUsersFallback(searchTerm) {
            try {
                console.log(`🔍 Searching users: "${searchTerm}"`);
                
                const User = Parse.User;
                const query = new Parse.Query(User);
                
                // Use case-insensitive search
                if (searchTerm && searchTerm.trim() !== '') {
                    query.matches('username', searchTerm, 'i');
                }
                query.notEqualTo('objectId', this.currentUser.id);
                query.limit(50);
                
                const users = await query.find();
                console.log(`✅ Search found ${users.length} users`);
                
                const usersWithStatus = await Promise.all(
                    users.map(async (user) => {
                        try {
                            const contactStatus = await this.getContactStatus(user.id);
                            return {
                                id: user.id,
                                username: user.get('username'),
                                email: user.get('email'),
                                isOnline: user.get('isOnline') || false,
                                lastSeen: user.get('lastSeen'),
                                ...contactStatus
                            };
                        } catch (error) {
                            console.error(`❌ Error processing user ${user.id}:`, error);
                            return {
                                id: user.id,
                                username: user.get('username') || 'Unknown',
                                isOnline: false,
                                lastSeen: null,
                                isContact: false,
                                isPending: false
                            };
                        }
                    })
                );
                
                return { success: true, users: usersWithStatus };

            } catch (error) {
                console.error('❌ User search failed:', error);
                return { 
                    success: false, 
                    error: error.message,
                    users: []
                };
            }
        }

        async getContactStatus(targetUserId) {
            try {
                const Contact = Parse.Object.extend('Contact');
                const query = new Parse.Query(Contact);
                
                query.containedIn('fromUser', [this.currentUser, Parse.User.createWithoutData(targetUserId)]);
                query.containedIn('toUser', [this.currentUser, Parse.User.createWithoutData(targetUserId)]);
                
                const contact = await query.first();
                
                if (!contact) {
                    return { 
                        isContact: false, 
                        isPending: false,
                        sentByMe: false
                    };
                }
                
                const status = contact.get('status');
                const isPending = status === 'pending';
                const isContact = status === 'accepted';
                const sentByMe = contact.get('fromUser').id === this.currentUser.id;
                
                return {
                    isContact,
                    isPending,
                    sentByMe,
                    contactId: contact.id
                };

            } catch (error) {
                console.error('❌ Failed to get contact status:', error);
                return { 
                    isContact: false, 
                    isPending: false,
                    sentByMe: false
                };
            }
        }

        // =============== CONTACTS ===============

        async addContact(userId, username) {
            if (!this.isLoggedIn()) {
                return { success: false, error: 'Not logged in' };
            }

            try {
                console.log(`👥 Adding contact: ${username} (${userId})`);
                
                // Use cloud function if available
                try {
                    console.log('🔍 Using Cloud Function: addContact...');
                    const result = await Parse.Cloud.run('addContact', { userId, username });
                    console.log('✅ Cloud function addContact succeeded');
                    return result;
                } catch (cloudError) {
                    console.log('🔍 Cloud function failed, falling back to direct method...');
                    // Fallback to direct method
                }

                // Prevent adding yourself
                if (userId === this.currentUser.id) {
                    return { success: false, error: 'Cannot add yourself as a contact' };
                }

                const Contact = Parse.Object.extend('Contact');
                const query = new Parse.Query(Contact);
                
                query.equalTo('fromUser', this.currentUser);
                query.equalTo('toUser', Parse.User.createWithoutData(userId));
                
                const existingContact = await query.first();
                
                if (existingContact) {
                    const status = existingContact.get('status');
                    if (status === 'pending') {
                        return { success: false, error: 'Contact request already sent' };
                    } else if (status === 'accepted') {
                        return { success: false, error: 'Contact already exists' };
                    }
                }
                
                const contact = new Contact();
                contact.set('fromUser', this.currentUser);
                contact.set('fromUsername', this.currentUser.get('username'));
                contact.set('toUser', Parse.User.createWithoutData(userId));
                contact.set('toUsername', username);
                contact.set('status', 'pending');
                contact.set('timestamp', new Date());
                
                await contact.save();
                console.log('✅ Contact request sent successfully');
                return { success: true, contact: contact };

            } catch (error) {
                console.error('❌ Failed to add contact:', error);
                let errorMessage = 'Failed to send contact request';
                
                if (error.code === 101) {
                    errorMessage = 'User not found';
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                return { success: false, error: errorMessage };
            }
        }

        async acceptContact(contactId) {
            if (!this.isLoggedIn()) {
                return { success: false, error: 'Not logged in' };
            }

            try {
                // Use cloud function if available
                try {
                    console.log('🔍 Using Cloud Function: acceptContact...');
                    const result = await Parse.Cloud.run('acceptContact', { contactId });
                    console.log('✅ Cloud function acceptContact succeeded');
                    return result;
                } catch (cloudError) {
                    console.log('🔍 Cloud function failed, falling back to direct method...');
                    // Fallback to direct method
                }

                const Contact = Parse.Object.extend('Contact');
                const query = new Parse.Query(Contact);
                
                const contact = await query.get(contactId);
                
                if (!contact) {
                    return { success: false, error: 'Contact request not found' };
                }
                
                const toUser = contact.get('toUser');
                if (toUser.id !== this.currentUser.id) {
                    return { success: false, error: 'Not authorized to accept this request' };
                }
                
                contact.set('status', 'accepted');
                await contact.save();
                return { success: true, contact: contact };

            } catch (error) {
                console.error('❌ Failed to accept contact:', error);
                return { success: false, error: error.message };
            }
        }

        async removeContact(contactId) {
            if (!this.isLoggedIn()) {
                return { success: false, error: 'Not logged in' };
            }

            try {
                const Contact = Parse.Object.extend('Contact');
                const query = new Parse.Query(Contact);
                
                const contact = await query.get(contactId);
                
                if (!contact) {
                    return { success: false, error: 'Contact not found' };
                }
                
                const fromUser = contact.get('fromUser');
                const toUser = contact.get('toUser');
                
                if (fromUser.id !== this.currentUser.id && toUser.id !== this.currentUser.id) {
                    return { success: false, error: 'Not authorized to remove this contact' };
                }
                
                await contact.destroy();
                return { success: true };

            } catch (error) {
                console.error('❌ Failed to remove contact:', error);
                return { success: false, error: error.message };
            }
        }

        async getContacts() {
            if (!this.isLoggedIn()) {
                return { success: false, error: 'Not logged in' };
            }

            try {
                console.log('👥 Loading contacts...');
                
                const Contact = Parse.Object.extend('Contact');
                const query = new Parse.Query(Contact);
                
                query.containedIn('fromUser', [this.currentUser]);
                query.containedIn('toUser', [this.currentUser]);
                query.equalTo('status', 'accepted');
                query.include('fromUser');
                query.include('toUser');
                
                const contacts = await query.find();
                console.log(`✅ Found ${contacts.length} contacts`);
                
                const formattedContacts = contacts.map(contact => {
                    try {
                        const fromUser = contact.get('fromUser');
                        const toUser = contact.get('toUser');
                        
                        const otherUser = fromUser.id === this.currentUser.id ? toUser : fromUser;
                        const otherUsername = fromUser.id === this.currentUser.id ? 
                            contact.get('toUsername') : contact.get('fromUsername');
                        
                        return {
                            contactId: contact.id,
                            userId: otherUser.id,
                            username: otherUsername || otherUser.get('username'),
                            isOnline: otherUser.get('isOnline') || false,
                            lastSeen: otherUser.get('lastSeen')
                        };
                    } catch (error) {
                        console.error('❌ Error processing contact:', error);
                        return null;
                    }
                }).filter(contact => contact !== null);
                
                return { success: true, contacts: formattedContacts };

            } catch (error) {
                console.error('❌ Failed to load contacts:', error);
                return { 
                    success: false, 
                    error: error.message,
                    contacts: []
                };
            }
        }

        async getPendingRequests() {
            if (!this.isLoggedIn()) {
                return { success: false, error: 'Not logged in' };
            }

            try {
                const Contact = Parse.Object.extend('Contact');
                const query = new Parse.Query(Contact);
                
                query.equalTo('toUser', this.currentUser);
                query.equalTo('status', 'pending');
                query.include('fromUser');
                
                const requests = await query.find();
                
                const formattedRequests = requests.map(contact => {
                    const fromUser = contact.get('fromUser');
                    
                    return {
                        contactId: contact.id,
                        fromUserId: fromUser.id,
                        fromUsername: contact.get('fromUsername'),
                        isOnline: fromUser.get('isOnline') || false,
                        timestamp: contact.get('timestamp')
                    };
                });
                
                return { success: true, requests: formattedRequests };

            } catch (error) {
                console.error('❌ Failed to load pending requests:', error);
                return { success: false, error: error.message };
            }
        }

        async getSentRequests() {
            if (!this.isLoggedIn()) {
                return { success: false, error: 'Not logged in' };
            }

            try {
                const Contact = Parse.Object.extend('Contact');
                const query = new Parse.Query(Contact);
                
                query.equalTo('fromUser', this.currentUser);
                query.equalTo('status', 'pending');
                query.include('toUser');
                
                const requests = await query.find();
                
                const formattedRequests = requests.map(contact => {
                    const toUser = contact.get('toUser');
                    
                    return {
                        contactId: contact.id,
                        toUserId: toUser.id,
                        toUsername: contact.get('toUsername'),
                        isOnline: toUser.get('isOnline') || false,
                        timestamp: contact.get('timestamp')
                    };
                });
                
                return { success: true, requests: formattedRequests };

            } catch (error) {
                console.error('❌ Failed to load sent requests:', error);
                return { success: false, error: error.message };
            }
        }

        // =============== MESSAGING ===============

        async sendMessage(receiverId, message) {
            if (!this.isLoggedIn()) {
                return { success: false, error: 'Not logged in' };
            }

            try {
                const Message = Parse.Object.extend('Message');
                const msg = new Message();
                
                msg.set('sender', this.currentUser);
                msg.set('receiver', Parse.User.createWithoutData(receiverId));
                msg.set('message', message);
                msg.set('timestamp', new Date());
                msg.set('isRead', false);
                
                await msg.save();
                return { success: true, message: msg };

            } catch (error) {
                console.error('❌ Failed to send message:', error);
                return { success: false, error: error.message };
            }
        }

        async sendGlobalMessage(message) {
            if (!this.isLoggedIn()) {
                return { success: false, error: 'Not logged in' };
            }

            try {
                // Use cloud function if available
                try {
                    console.log('🔍 Using Cloud Function: sendGlobalMessage...');
                    const result = await Parse.Cloud.run('sendGlobalMessage', { message });
                    console.log('✅ Cloud function sendGlobalMessage succeeded');
                    return result;
                } catch (cloudError) {
                    console.log('🔍 Cloud function failed, falling back to direct method...');
                    // Fallback to direct method
                }

                const GlobalMessage = Parse.Object.extend('GlobalMessage');
                const msg = new GlobalMessage();
                
                msg.set('sender', this.currentUser);
                msg.set('senderName', this.currentUser.get('username'));
                msg.set('message', message);
                msg.set('timestamp', new Date());
                
                await msg.save();
                return { success: true, message: msg };

            } catch (error) {
                console.error('❌ Failed to send global message:', error);
                return { success: false, error: error.message };
            }
        }

        async getMessages(userId) {
            if (!this.isLoggedIn()) {
                return { success: false, error: 'Not logged in' };
            }

            try {
                const Message = Parse.Object.extend('Message');
                const query = new Parse.Query(Message);
                
                query.containedIn('sender', [
                    this.currentUser,
                    Parse.User.createWithoutData(userId)
                ]);
                query.containedIn('receiver', [
                    this.currentUser,
                    Parse.User.createWithoutData(userId)
                ]);
                
                query.include('sender');
                query.include('receiver');
                query.descending('timestamp');
                query.limit(50);
                
                const messages = await query.find();
                return { success: true, messages: messages.reverse() };

            } catch (error) {
                console.error('❌ Failed to load messages:', error);
                return { success: false, error: error.message };
            }
        }

        async getGlobalMessages() {
            if (!this.isLoggedIn()) {
                return { success: false, error: 'Not logged in' };
            }

            try {
                // Use cloud function if available
                try {
                    console.log('🔍 Using Cloud Function: getGlobalMessages...');
                    const result = await Parse.Cloud.run('getGlobalMessages');
                    console.log(`✅ Cloud function returned ${result.length} messages`);
                    return { success: true, messages: result };
                } catch (cloudError) {
                    console.log('🔍 Cloud function failed, falling back to direct method...');
                    // Fallback to direct method
                }

                const GlobalMessage = Parse.Object.extend('GlobalMessage');
                const query = new Parse.Query(GlobalMessage);
                
                query.include('sender');
                query.descending('timestamp');
                query.limit(100);
                
                const messages = await query.find();
                return { success: true, messages: messages.reverse() };

            } catch (error) {
                console.error('❌ Failed to load global messages:', error);
                return { success: false, error: error.message };
            }
        }

        // =============== UTILITY FUNCTIONS ===============

        async getOnlineUsersCount() {
            try {
                // Use cloud function if available
                try {
                    console.log('🔍 Using Cloud Function: getOnlineUsersCount...');
                    const result = await Parse.Cloud.run('getOnlineUsersCount');
                    console.log(`✅ Cloud function returned ${result.count} online users`);
                    return result;
                } catch (cloudError) {
                    console.log('🔍 Cloud function failed, falling back to direct method...');
                    // Fallback to direct method
                }

                const User = Parse.User;
                const query = new Parse.Query(User);
                
                query.equalTo('isOnline', true);
                const count = await query.count();
                return { success: true, count: count };

            } catch (error) {
                console.error('❌ Failed to get online users count:', error);
                return { success: false, error: error.message };
            }
        }

        async getChats() {
            if (!this.isLoggedIn()) {
                return { success: false, error: 'Not logged in' };
            }

            try {
                const contactsResult = await this.getContacts();
                
                if (!contactsResult.success) {
                    return { success: true, chats: [] };
                }
                
                const chats = await Promise.all(
                    contactsResult.contacts.map(async (contact) => {
                        const Message = Parse.Object.extend('Message');
                        const query = new Parse.Query(Message);
                        
                        query.containedIn('sender', [
                            this.currentUser,
                            Parse.User.createWithoutData(contact.userId)
                        ]);
                        query.containedIn('receiver', [
                            this.currentUser,
                            Parse.User.createWithoutData(contact.userId)
                        ]);
                        
                        query.descending('timestamp');
                        query.limit(1);
                        
                        const lastMessage = await query.first();
                        
                        return {
                            id: contact.userId,
                            name: contact.username,
                            isOnline: contact.isOnline,
                            lastMessage: lastMessage ? lastMessage.get('message') : null,
                            timestamp: lastMessage ? lastMessage.get('timestamp') : contact.lastSeen
                        };
                    })
                );
                
                chats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                return { success: true, chats: chats };

            } catch (error) {
                console.error('❌ Failed to load chats:', error);
                return { success: false, error: error.message };
            }
        }

        // Test user login method
        async testUserLogin() {
            try {
                console.log('🧪 Testing user login: r29');
                const user = await Parse.User.logIn('r29', '123456');
                console.log('✅ Test user login successful:', user.get('username'));
                return { success: true, user: user };
            } catch (error) {
                console.error('❌ Test user login failed:', error);
                return { success: false, error: error.message };
            }
        }
    }

    // Create global instance
    window.Backend = new Backend();
}
