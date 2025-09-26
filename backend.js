
// Enhanced Backend with Email-based Contact System - Complete backend.js

// Initialize Parse immediately
Parse.initialize('z5FgipCE12ScJNuYMbJ19EY2c7AXCxp5nWX7BWHT', 'QNQTH3G4VuLA5gkPIiCtoXZjJJMcP7P5zYsETOPV');
Parse.serverURL = 'https://parseapi.back4app.com';

// Enhanced Backend Object with Email-based Contact Management
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
    
    // Register - Updated with profile fields
    async register(username, email, password) {
        try {
            const user = new Parse.User();
            user.set('username', username);
            user.set('email', email);
            user.set('password', password);
            user.set('isOnline', true);
            user.set('lastSeen', new Date());
            user.set('joinedAt', new Date());
            user.set('description', ''); // User description/bio
            user.set('profilePicture', null); // Profile picture file
            
            const result = await user.signUp();
            await this.updateUserStatus(true);
            return { success: true, user: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // =============== PROFILE MANAGEMENT FUNCTIONS ===============
    
    // Update username
    async updateUsername(newUsername, currentPassword) {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) {
                return { success: false, error: 'Not logged in' };
            }
            
            // Verify current password first
            const verifyResult = await this.verifyPassword(currentPassword);
            if (!verifyResult.success) {
                return { success: false, error: 'Current password is incorrect' };
            }
            
            // Check if username is already taken
            const query = new Parse.Query(Parse.User);
            query.equalTo('username', newUsername);
            query.notEqualTo('objectId', currentUser.id);
            const existingUser = await query.first();
            
            if (existingUser) {
                return { success: false, error: 'Username is already taken' };
            }
            
            // Update username
            currentUser.set('username', newUsername);
            await currentUser.save();
            
            return { success: true, message: 'Username updated successfully' };
        } catch (error) {
            console.error('Update username error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Update password
    async updatePassword(currentPassword, newPassword) {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) {
                return { success: false, error: 'Not logged in' };
            }
            
            // Verify current password first
            const verifyResult = await this.verifyPassword(currentPassword);
            if (!verifyResult.success) {
                return { success: false, error: 'Current password is incorrect' };
            }
            
            // Update password
            currentUser.set('password', newPassword);
            await currentUser.save();
            
            return { success: true, message: 'Password updated successfully' };
        } catch (error) {
            console.error('Update password error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Verify current password
    async verifyPassword(password) {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) {
                return { success: false, error: 'Not logged in' };
            }
            
            // Store current user session
            const currentSessionToken = currentUser.getSessionToken();
            
            // Attempt to login with current username and provided password
            const username = currentUser.get('username');
            const testUser = await Parse.User.logIn(username, password);
            
            // Restore original session if different user was logged in during test
            if (testUser.id === currentUser.id) {
                return { success: true };
            } else {
                // This shouldn't happen but handle it anyway
                await Parse.User.logOut();
                await Parse.User.become(currentSessionToken);
                return { success: false, error: 'Invalid password' };
            }
        } catch (error) {
            return { success: false, error: 'Invalid password' };
        }
    },
    
    // Update description/bio
    async updateDescription(description) {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) {
                return { success: false, error: 'Not logged in' };
            }
            
            // Validate description length
            if (description && description.length > 500) {
                return { success: false, error: 'Description must be 500 characters or less' };
            }
            
            currentUser.set('description', description || '');
            await currentUser.save();
            
            return { success: true, message: 'Description updated successfully' };
        } catch (error) {
            console.error('Update description error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Upload profile picture
    async updateProfilePicture(fileInput) {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) {
                return { success: false, error: 'Not logged in' };
            }
            
            if (!fileInput.files || fileInput.files.length === 0) {
                return { success: false, error: 'No file selected' };
            }
            
            const file = fileInput.files[0];
            
            // Validate file type
            if (!file.type.startsWith('image/')) {
                return { success: false, error: 'Please select an image file' };
            }
            
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                return { success: false, error: 'File size must be less than 5MB' };
            }
            
            // Create Parse file
            const parseFile = new Parse.File(`profile_${currentUser.id}_${Date.now()}.${file.type.split('/')[1]}`, file);
            
            // Save file to Parse
            const savedFile = await parseFile.save();
            
            // Delete old profile picture if exists
            const oldProfilePicture = currentUser.get('profilePicture');
            if (oldProfilePicture) {
                try {
                    await oldProfilePicture.destroy();
                } catch (error) {
                    console.warn('Could not delete old profile picture:', error);
                }
            }
            
            // Update user with new profile picture
            currentUser.set('profilePicture', savedFile);
            await currentUser.save();
            
            return { 
                success: true, 
                message: 'Profile picture updated successfully',
                profilePictureUrl: savedFile.url()
            };
        } catch (error) {
            console.error('Update profile picture error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Get user profile (with profile picture and description)
    async getUserProfile(userId) {
        try {
            const query = new Parse.Query(Parse.User);
            const user = await query.get(userId);
            
            const profilePicture = user.get('profilePicture');
            
            return {
                success: true,
                profile: {
                    id: user.id,
                    username: user.get('username'),
                    email: user.get('email'),
                    description: user.get('description') || '',
                    profilePictureUrl: profilePicture ? profilePicture.url() : null,
                    isOnline: user.get('isOnline') || false,
                    lastSeen: user.get('lastSeen'),
                    joinedAt: user.get('joinedAt')
                }
            };
        } catch (error) {
            console.error('Get user profile error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Get current user's full profile
    async getCurrentUserProfile() {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) {
                return { success: false, error: 'Not logged in' };
            }
            
            // Refresh user data
            await currentUser.fetch();
            
            const profilePicture = currentUser.get('profilePicture');
            
            return {
                success: true,
                profile: {
                    id: currentUser.id,
                    username: currentUser.get('username'),
                    email: currentUser.get('email'),
                    description: currentUser.get('description') || '',
                    profilePictureUrl: profilePicture ? profilePicture.url() : null,
                    isOnline: currentUser.get('isOnline') || false,
                    lastSeen: currentUser.get('lastSeen'),
                    joinedAt: currentUser.get('joinedAt')
                }
            };
        } catch (error) {
            console.error('Get current user profile error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // =============== EMAIL-BASED CONTACT SYSTEM FUNCTIONS ===============
    
    // Add contact by email (send friend request)
    async addContactByEmail(email) {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) {
                return { success: false, error: 'Not logged in' };
            }
            
            // Validate email format
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return { success: false, error: 'Please enter a valid email address' };
            }
            
            // Check if trying to add own email
            if (email.toLowerCase() === currentUser.get('email').toLowerCase()) {
                return { success: false, error: 'Cannot add yourself as contact' };
            }
            
            // Find user by email
            const userQuery = new Parse.Query(Parse.User);
            userQuery.equalTo('email', email.toLowerCase());
            const targetUser = await userQuery.first();
            
            if (!targetUser) {
                return { success: false, error: 'No user found with this email address' };
            }
            
            // Check if contact already exists
            const existingContact = await this.getContactStatus(targetUser.id);
            if (existingContact.isContact || existingContact.isPending) {
                return { success: false, error: 'Contact already exists or request pending' };
            }
            
            const Contact = Parse.Object.extend('Contact');
            const contact = new Contact();
            
            contact.set('from', currentUser);
            contact.set('to', targetUser);
            contact.set('fromUsername', currentUser.get('username'));
            contact.set('toUsername', targetUser.get('username'));
            contact.set('fromEmail', currentUser.get('email'));
            contact.set('toEmail', targetUser.get('email'));
            contact.set('status', 'pending');
            contact.set('timestamp', new Date());
            
            const result = await contact.save();
            return { 
                success: true, 
                contact: result,
                message: `Contact request sent to ${targetUser.get('username')} (${email})`
            };
        } catch (error) {
            console.error('Add contact by email error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Search for users by email
    async searchUserByEmail(email) {
        try {
            const currentUser = Parse.User.current();
            if (!currentUser) {
                return { success: false, error: 'Not logged in' };
            }
            
            // Validate email format
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return { success: false, error: 'Please enter a valid email address' };
            }
            
            // Check if trying to search own email
            if (email.toLowerCase() === currentUser.get('email').toLowerCase()) {
                return { success: false, error: 'Cannot search for yourself' };
            }
            
            // Find user by email
            const userQuery = new Parse.Query(Parse.User);
            userQuery.equalTo('email', email.toLowerCase());
            const user = await userQuery.first();
            
            if (!user) {
                return { success: false, error: 'No user found with this email address' };
            }
            
            // Get contact status
            const contactStatus = await this.getContactStatus(user.id);
            const profilePicture = user.get('profilePicture');
            
            return {
                success: true,
                user: {
                    id: user.id,
                    username: user.get('username'),
                    email: user.get('email'),
                    description: user.get('description') || '',
                    profilePictureUrl: profilePicture ? profilePicture.url() : null,
                    isOnline: user.get('isOnline') || false,
                    lastSeen: user.get('lastSeen'),
                    ...contactStatus
                }
            };
        } catch (error) {
            console.error('Search user by email error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Legacy function - now wraps addContactByEmail for backward compatibility
    async addContact(userId, username) {
        try {
            // Get user by ID to find their email
            const userQuery = new Parse.Query(Parse.User);
            const user = await userQuery.get(userId);
            const email = user.get('email');
            
            return await this.addContactByEmail(email);
        } catch (error) {
            console.error('Add contact legacy error:', error);
            return { success: false, error: error.message };
        }
    },
    // List all other users (for sending requests)
async listUsers() {
    try {
        const currentUser = Parse.User.current();

        const query = new Parse.Query(Parse.User);
        query.notEqualTo('objectId', currentUser.id); // exclude yourself
        query.select('username'); // only send safe fields
        const results = await query.find();

        return results.map(user => ({
            id: user.id,
            username: user.get('username'),
        }));
    } catch (error) {
        console.error('List users error:', error);
        return [];
    }
},

    // Accept contact request
    async acceptContact(contactId) {
        try {
            const Contact = Parse.Object.extend('Contact');
            const query = new Parse.Query(Contact);
            const contact = await query.get(contactId);
            
            // Verify this request was sent to current user
            const currentUser = Parse.User.current();
            const toUser = contact.get('to');
            
            if (!toUser || toUser.id !== currentUser.id) {
                return { success: false, error: 'Unauthorized' };
            }
            
            contact.set('status', 'accepted');
            contact.set('acceptedAt', new Date());
            await contact.save();
            
            return { success: true };
        } catch (error) {
            console.error('Accept contact error:', error);
            return { success: false, error: error.message };
        }
    },
    
 // List all other users for sending contact requests
app.get('/users', async (req, res) => {
    try {
        const users = await backend.listUsers();
        res.json({ success: true, users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
   
    // Reject/Remove contact
    async removeContact(contactId) {
        try {
            const Contact = Parse.Object.extend('Contact');
            const query = new Parse.Query(Contact);
            const contact = await query.get(contactId);
            
            // Verify user has permission to delete this contact
            const currentUser = Parse.User.current();
            const fromUser = contact.get('from');
            const toUser = contact.get('to');
            
            if ((!fromUser || fromUser.id !== currentUser.id) && 
                (!toUser || toUser.id !== currentUser.id)) {
                return { success: false, error: 'Unauthorized' };
            }
            
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
    
    // Get all contacts (accepted friends) - ENHANCED with profiles
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
            
            // Process contacts to get friend info with profiles
            const friends = [];
            for (const contact of contacts) {
                const fromUser = contact.get('from');
                const toUser = contact.get('to');
                const currentUserId = currentUser.id;
                
                // Determine which user is the friend
                const friend = fromUser.id === currentUserId ? toUser : fromUser;
                
                if (friend) {
                    const profilePicture = friend.get('profilePicture');
                    
                    friends.push({
                        contactId: contact.id,
                        userId: friend.id,
                        username: friend.get('username'),
                        email: friend.get('email'),
                        description: friend.get('description') || '',
                        profilePictureUrl: profilePicture ? profilePicture.url() : null,
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
    
    // Get pending contact requests (received) - ENHANCED with profiles
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
            
            const pendingRequests = requests.map(request => {
                const fromUser = request.get('from');
                const profilePicture = fromUser.get('profilePicture');
                
                return {
                    contactId: request.id,
                    fromUserId: fromUser.id,
                    fromUsername: fromUser.get('username'),
                    fromEmail: fromUser.get('email'),
                    description: fromUser.get('description') || '',
                    profilePictureUrl: profilePicture ? profilePicture.url() : null,
                    timestamp: request.get('timestamp'),
                    isOnline: fromUser.get('isOnline') || false,
                    lastSeen: fromUser.get('lastSeen')
                };
            });
            
            return { success: true, requests: pendingRequests };
        } catch (error) {
            console.error('Get pending requests error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Get sent requests (pending requests sent by current user) - ENHANCED with profiles
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
            
            const sentRequests = requests.map(request => {
                const toUser = request.get('to');
                const profilePicture = toUser.get('profilePicture');
                
                return {
                    contactId: request.id,
                    toUserId: toUser.id,
                    toUsername: toUser.get('username'),
                    toEmail: toUser.get('email'),
                    description: toUser.get('description') || '',
                    profilePictureUrl: profilePicture ? profilePicture.url() : null,
                    timestamp: request.get('timestamp'),
                    isOnline: toUser.get('isOnline') || false,
                    lastSeen: toUser.get('lastSeen')
                };
            });
            
            return { success: true, requests: sentRequests };
        } catch (error) {
            console.error('Get sent requests error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // =============== LEGACY FUNCTIONS (Updated for email system) ===============
    
    // Get all users with contact status - DEPRECATED in favor of email-based system
    async getUsersWithContactStatus() {
        try {
            // Return empty list since we're now using email-based system
            return { success: true, users: [], message: 'Use email-based contact system instead' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Search users - DEPRECATED in favor of searchUserByEmail
    async searchUsers(searchTerm) {
        try {
            // Check if search term is an email
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(searchTerm)) {
                const result = await this.searchUserByEmail(searchTerm);
                if (result.success) {
                    return { success: true, users: [result.user] };
                } else {
                    return { success: true, users: [] };
                }
            }
            
            // If not email, return empty results
            return { success: true, users: [], message: 'Please search using email addresses' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // =============== MESSAGING FUNCTIONS ===============
    
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
            console.error('Update status error:', error);
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
            console.error('Get online users count error:', error);
            return { success: false, error: error.message, count: 0 };
        }
    },
    
    // Send private message
    async sendMessage(recipientId, message) {
        try {
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
                
                let partnerId, partnerName, isOnline = false;
                
                if (sender && sender.id === currentUserId) {
                    partnerId = recipientId;
                    try {
                        const userQuery = new Parse.Query(Parse.User);
                        const partnerUser = await userQuery.get(partnerId);
                        partnerName = partnerUser.get('username') || 'Unknown User';
                        isOnline = partnerUser.get('isOnline') || false;
                    } catch (error) {
                        partnerName = 'Unknown User';
                        console.warn('Could not fetch partner user:', error);
                    }
                } else if (sender) {
                    partnerId = sender.id;
                    partnerName = sender.get('username') || 'Unknown User';
                    isOnline = sender.get('isOnline') || false;
                } else {
                    continue;
                }
                
                if (partnerId && !chatMap.has(partnerId)) {
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
                        isOnline: isOnline
                    });
                }
            }
            
            const chats = Array.from(chatMap.values());
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
            console.error('Get unread count error:', error);
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
            console.error('Update activity error:', error);
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
        if (Backend.isLoggedIn() && !document.hidden) {
            await Backend.updateActivity();
        }
    }, 30000);
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
            await Backend.updateUserStatus(false);
            Backend.stopActivityTracking();
        } else {
            await Backend.updateUserStatus(true);
            Backend.startActivityTracking();
        }
    }
});

// Handle page unload
window.addEventListener('beforeunload', async () => {
    if (Backend.isLoggedIn()) {
        await Backend.updateUserStatus(false);
        Backend.stopActivityTracking();
    }
});

// Make Backend available globally
window.Backend = Backend;
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
            console.error('Send message error:', error);
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
            
            const senderUser = { __type: 'Pointer', className: '_User', objectId: userId };
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
            
            const savePromises = messages.map(message => {
                message.set('isRead', true);
                return message.save();
            });
            
            await Promise.all(savePromises);
            return { success: true };
        } catch (error) {
            console.error('Mark messages as read error:', error);
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
