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
                
                // Initialize EmailJS if available
                if (typeof emailjs !== 'undefined' && CONFIG.EMAILJS_PUBLIC_KEY) {
                    try {
                        emailjs.init(CONFIG.EMAILJS_PUBLIC_KEY);
                        console.log('✅ EmailJS initialized');
                    } catch (emailError) {
                        console.warn('⚠️ EmailJS initialization failed:', emailError);
                    }
                }
                
                this.isInitialized = true;
                console.log('✅ Backend initialized successfully');
                
                // Set current user if logged in
                this.currentUser = Parse.User.current();
                if (this.currentUser) {
                    console.log('✅ User session restored:', this.currentUser.get('username'));
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
                
                // Try to send verification email
                let emailResult = { success: false, error: 'Email service not available' };
                try {
                    if (typeof Parse.Cloud.run === 'function') {
                        console.log('📧 Sending verification email...');
                        emailResult = await Parse.Cloud.run('sendVerificationEmail', {
                            userId: userResult.id,
                            email: email
                        });
                        console.log('✅ Verification email process completed');
                    }
                } catch (emailError) {
                    console.warn('⚠️ Email verification service unavailable:', emailError);
                }

                this.currentUser = userResult;
                
                return {
                    success: true,
                    user: userResult,
                    emailSent: emailResult.success,
                    emailError: emailResult.error
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

        // =============== CONTACTS ===============

        async addContact(userId, username) {
            if (!this.isLoggedIn()) {
                return { success: false, error: 'Not logged in' };
            }

            try {
                const Contact = Parse.Object.extend('Contact');
                const query = new Parse.Query(Contact);
                
                query.equalTo('fromUser', this.currentUser);
                query.equalTo('toUser', Parse.User.createWithoutData(userId));
                
                const existingContact = await query.first();
                
                if (existingContact) {
                    return { success: false, error: 'Contact already exists' };
                }
                
                const contact = new Contact();
                contact.set('fromUser', this.currentUser);
                contact.set('fromUsername', this.currentUser.get('username'));
                contact.set('toUser', Parse.User.createWithoutData(userId));
                contact.set('toUsername', username);
                contact.set('status', 'pending');
                contact.set('timestamp', new Date());
                
                await contact.save();
                return { success: true, contact: contact };

            } catch (error) {
                console.error('❌ Failed to add contact:', error);
                return { success: false, error: error.message };
            }
        }

        async acceptContact(contactId) {
            if (!this.isLoggedIn()) {
                return { success: false, error: 'Not logged in' };
            }

            try {
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
                const Contact = Parse.Object.extend('Contact');
                const query = new Parse.Query(Contact);
                
                query.containedIn('fromUser', [this.currentUser]);
                query.containedIn('toUser', [this.currentUser]);
                query.equalTo('status', 'accepted');
                query.include('fromUser');
                query.include('toUser');
                
                const contacts = await query.find();
                
                const formattedContacts = contacts.map(contact => {
                    const fromUser = contact.get('fromUser');
                    const toUser = contact.get('toUser');
                    
                    const otherUser = fromUser.id === this.currentUser.id ? toUser : fromUser;
                    const otherUsername = fromUser.id === this.currentUser.id ? 
                        contact.get('toUsername') : contact.get('fromUsername');
                    
                    return {
                        contactId: contact.id,
                        userId: otherUser.id,
                        username: otherUsername,
                        isOnline: otherUser.get('isOnline') || false,
                        lastSeen: otherUser.get('lastSeen')
                    };
                });
                
                return { success: true, contacts: formattedContacts };

            } catch (error) {
                console.error('❌ Failed to load contacts:', error);
                return { success: false, error: error.message };
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

        // =============== USER SEARCH ===============

        async searchUsers(searchTerm) {
            if (!this.isLoggedIn()) {
                return { success: false, error: 'Not logged in' };
            }

            try {
                const User = Parse.User;
                const query = new Parse.Query(User);
                
                query.matches('username', new RegExp(searchTerm, 'i'));
                query.notEqualTo('objectId', this.currentUser.id);
                query.limit(20);
                
                const users = await query.find();
                
                const usersWithStatus = await Promise.all(
                    users.map(async (user) => {
                        const contactStatus = await this.getContactStatus(user.id);
                        return {
                            id: user.id,
                            username: user.get('username'),
                            isOnline: user.get('isOnline') || false,
                            lastSeen: user.get('lastSeen'),
                            ...contactStatus
                        };
                    })
                );
                
                return { success: true, users: usersWithStatus };

            } catch (error) {
                console.error('❌ User search failed:', error);
                return { success: false, error: error.message };
            }
        }

        async getUsersWithContactStatus() {
            if (!this.isLoggedIn()) {
                return { success: false, error: 'Not logged in' };
            }

            try {
                const User = Parse.User;
                const query = new Parse.Query(User);
                
                query.notEqualTo('objectId', this.currentUser.id);
                query.limit(50);
                
                const users = await query.find();
                
                const usersWithStatus = await Promise.all(
                    users.map(async (user) => {
                        const contactStatus = await this.getContactStatus(user.id);
                        return {
                            id: user.id,
                            username: user.get('username'),
                            isOnline: user.get('isOnline') || false,
                            lastSeen: user.get('lastSeen'),
                            ...contactStatus
                        };
                    })
                );
                
                return { success: true, users: usersWithStatus };

            } catch (error) {
                console.error('❌ Failed to load users:', error);
                return { success: false, error: error.message };
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
                    return { isContact: false, isPending: false };
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
                return { isContact: false, isPending: false };
            }
        }

        // =============== UTILITY FUNCTIONS ===============

        async getOnlineUsersCount() {
            try {
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

        // =============== EMAIL VERIFICATION ===============

        async verifyEmail(userId, token) {
            if (!this.isInitialized) {
                return { success: false, error: 'Backend not initialized' };
            }

            try {
                const result = await Parse.Cloud.run('verifyEmail', {
                    userId: userId,
                    token: token
                });
                return result;
            } catch (error) {
                console.error('❌ Email verification failed:', error);
                return { success: false, error: error.message };
            }
        }

        async resendVerificationEmail() {
            if (!this.isLoggedIn()) {
                return { success: false, error: 'Not logged in' };
            }

            try {
                const user = this.currentUser;
                const email = user.get('email');
                
                if (!email) {
                    return { success: false, error: 'No email address found' };
                }
                
                const result = await Parse.Cloud.run('resendVerificationEmail', {
                    email: email
                });
                return result;

            } catch (error) {
                console.error('❌ Failed to resend verification email:', error);
                return { success: false, error: error.message };
            }
        }

        async checkEmailVerification() {
            if (!this.isLoggedIn()) {
                return { success: false, error: 'Not logged in' };
            }

            try {
                await this.currentUser.fetch();
                const isVerified = this.currentUser.get('emailVerified');
                return { success: true, verified: isVerified };

            } catch (error) {
                console.error('❌ Failed to check email verification:', error);
                return { success: false, error: error.message };
            }
        }
    }

    // Create global instance
    window.Backend = new Backend();
}
