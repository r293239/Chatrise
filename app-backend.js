// app-backend.js - ChatRise Main App with Back4app Integration

let currentChatId = null;
let currentChatUser = null;

// Initialize app
document.addEventListener('DOMContentLoaded', async function() {
    showLoading(true);
    
    // Initialize backend
    const initResult = await ChatRiseBackend.init();
    
    if (initResult.success && initResult.user) {
        // User is logged in
        await loadApp(initResult.user);
    } else {
        // Redirect to login
        window.location.href = 'login.html';
    }
    
    showLoading(false);
});

// Load main app
async function loadApp(user) {
    try {
        // Update UI with user info
        document.getElementById('username').textContent = user.get('username');
        
        // Request notification permission
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
        
        // Load chats
        await loadChats();
        
        // Show app
        document.getElementById('appContainer').style.display = 'flex';
        
        // Set up real-time messaging
        setupRealtimeMessaging();
        
        showNotification('Welcome back!', 'success');
    } catch (error) {
        console.error('Error loading app:', error);
        showNotification('Error loading app: ' + error.message, 'error');
    }
}

// Load user's chats
async function loadChats() {
    try {
        const result = await ChatRiseChat.getChatList();
        
        if (result.success) {
            displayChats(result.chats);
        } else {
            console.error('Error loading chats:', result.error);
        }
    } catch (error) {
        console.error('Error loading chats:', error);
    }
}

// Display chats in sidebar
function displayChats(chats) {
    const chatList = document.getElementById('chatList');
    const noChats = document.getElementById('noChats');
    
    if (chats.length === 0) {
        noChats.style.display = 'block';
        return;
    }
    
    noChats.style.display = 'none';
    
    // Clear existing chats (except no-chats div)
    const existingChats = chatList.querySelectorAll('.chat-item');
    existingChats.forEach(chat => chat.remove());
    
    chats.forEach(chat => {
        const chatItem = createChatItem(chat);
        chatList.appendChild(chatItem);
    });
}

// Create chat item element
function createChatItem(chat) {
    const chatDiv = document.createElement('div');
    chatDiv.className = 'chat-item';
    chatDiv.setAttribute('data-chat-id', chat.get('recipientId'));
    
    const sender = chat.get('sender');
    const timestamp = formatTime(chat.get('timestamp'));
    
    chatDiv.innerHTML = `
        <img src="https://via.placeholder.com/50" alt="User" class="chat-avatar">
        <div class="chat-info">
            <div class="chat-name">${sender.get('username')}</div>
            <div class="chat-preview">${chat.get('message').substring(0, 30)}...</div>
        </div>
        <div class="chat-time">${timestamp}</div>
    `;
    
    chatDiv.addEventListener('click', () => {
        selectChat(chat.get('recipientId'), sender.get('username'));
    });
    
    return chatDiv;
}

// Select a chat
async function selectChat(userId, username) {
    try {
        // Update UI
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        
        document.querySelector(`[data-chat-id="${userId}"]`)?.classList.add('active');
        
        // Update current chat
        currentChatId = userId;
        currentChatUser = username;
        
        // Update chat header
        document.getElementById('currentChatName').textContent = username;
        document.getElementById('chatStatus').textContent = 'online'; // You can check real status
        
        // Show chat content
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('chatContent').style.display = 'flex';
        
        // Enable message input
        document.getElementById('messageInput').disabled = false;
        document.querySelector('.send-btn').disabled = false;
        
        // Load messages
        await loadMessages(userId);
        
        // Mark messages as read
        await ChatRiseChat.markAsRead(userId);
        
    } catch (error) {
        console.error('Error selecting chat:', error);
        showNotification('Error loading chat', 'error');
    }
}

// Load messages for current chat
async function loadMessages(userId) {
    try {
        const result = await ChatRiseChat.getMessages(userId);
        
        if (result.success) {
            displayMessages(result.messages);
        } else {
            console.error('Error loading messages:', result.error);
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Display messages in chat area
function displayMessages(messages) {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';
    
    const currentUser = Parse.User.current();
    
    messages.forEach(message => {
        const messageDiv = document.createElement('div');
        const isOwn = message.get('sender').id === currentUser.id;
        
        messageDiv.className = `message ${isOwn ? 'sent' : 'received'}`;
        
        let content = message.get('message');
        
        // Handle file messages
        if (message.get('isFile') && message.get('fileUrl')) {
            const fileUrl = message.get('fileUrl');
            const fileName = message.get('fileName');
            const fileType = message.get('fileType');
            
            if (fileType?.startsWith('image/')) {
                content = `
                    <img src="${fileUrl}" alt="${fileName}" class="message-image" onclick="openImage('${fileUrl}')">
                    <br>${content}
                `;
            } else {
                content = `
                    <a href="${fileUrl}" target="_blank" class="message-file">
                        <i class="fas fa-file"></i> ${fileName}
                    </a>
                    <br>${content}
                `;
            }
        }
        
        messageDiv.innerHTML = `
            <div class="message-content">${content}</div>
            <div class="message-time">
                ${formatTime(message.get('timestamp'))}
                ${isOwn ? '<span class="message-status">✓✓</span>' : ''}
            </div>
        `;
        
        container.appendChild(messageDiv);
    });
    
    scrollToBottom();
}

// Send message
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const messageText = input.value.trim();
    
    if (!messageText || !currentChatId) return;
    
    try {
        // Disable send button
        document.querySelector('.send-btn').disabled = true;
        
        // Send message via backend
        const result = await ChatRiseChat.sendMessage(currentChatId, messageText);
        
        if (result.success) {
            // Clear input
            input.value = '';
            
            // Add message to UI immediately
            addMessageToUI(messageText, true, new Date());
            
            // Refresh messages to get server version
            setTimeout(() => loadMessages(currentChatId), 500);
        } else {
            showNotification('Failed to send message: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showNotification('Error sending message', 'error');
    } finally {
        // Re-enable send button
        document.querySelector('.send-btn').disabled = false;
    }
}

// Add message to UI
function addMessageToUI(text, sent, timestamp) {
    const container = document.getElementById('messagesContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sent ? 'sent' : 'received'}`;
    
    messageDiv.innerHTML = `
        <div class="message-content">${text}</div>
        <div class="message-time">
            ${formatTime(timestamp)}
            ${sent ? '<span class="message-status">✓</span>' : ''}
        </div>
    `;
    
    container.appendChild(messageDiv);
    scrollToBottom();
}

// Handle file upload
async function handleFileUpload(event) {
    const fileInput = event.target;
    
    if (!fileInput.files[0] || !currentChatId) return;
    
    try {
        showNotification('Uploading file...', 'info');
        
        const result = await ChatRiseFiles.uploadFile(fileInput, `Sent ${fileInput.files[0].name}`);
        
        if (result.success) {
            showNotification('File uploaded successfully!', 'success');
            
            // Refresh messages
            await loadMessages(currentChatId);
        } else {
            showNotification('Failed to upload file: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        showNotification('Error uploading file', 'error');
    } finally {
        // Clear file input
        fileInput.value = '';
    }
}

// Show user search modal
async function showUserSearch() {
    document.getElementById('userSearchModal').style.display = 'block';
    
    // Load all users initially
    const result = await ChatRiseUsers.getAllUsers();
    
    if (result.success) {
        displayUserResults(result.users);
    }
}

// Hide user search modal
function hideUserSearch() {
    document.getElementById('userSearchModal').style.display = 'none';
    document.getElementById('userSearchInput').value = '';
    document.getElementById('userResults').innerHTML = '';
}

// Search users
async function searchUsers() {
    const searchTerm = document.getElementById('userSearchInput').value.trim();
    
    if (searchTerm.length < 2) {
        // Show all users if search is too short
        const result = await ChatRiseUsers.getAllUsers();
        if (result.success) {
            displayUserResults(result.users);
        }
        return;
    }
    
    const result = await ChatRiseUsers.searchUsers(searchTerm);
    
    if (result.success) {
        displayUserResults(result.users);
    }
}

// Display user search results
function displayUserResults(users) {
    const resultsContainer = document.getElementById('userResults');
    resultsContainer.innerHTML = '';
    
    const currentUser = Parse.User.current();
    
    users.forEach(user => {
        // Don't show current user
        if (user.id === currentUser.id) return;
        
        const userDiv = document.createElement('div');
        userDiv.className = 'user-result';
        
        const isOnline = user.get('isOnline');
        const lastSeen = user.get('lastSeen');
        
        userDiv.innerHTML = `
            <img src="https://via.placeholder.com/40" alt="${user.get('username')}" class="user-avatar">
            <div class="user-info">
                <div class="user-name">${user.get('username')}</div>
                <div class="user-status ${isOnline ? 'online' : 'offline'}">
                    ${isOnline ? 'Online' : `Last seen ${formatTime(lastSeen)}`}
                </div>
            </div>
            <button onclick="startChat('${user.id}', '${user.get('username')}')" class="start-chat-btn">
                <i class="fas fa-comment"></i>
            </button>
        `;
        
        resultsContainer.appendChild(userDiv);
    });
    
    if (users.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">No users found</div>';
    }
}

// Start new chat
async function startChat(userId, username) {
    try {
        // Hide user search modal
        hideUserSearch();
        
        // Select the chat
        await selectChat(userId, username);
        
        showNotification(`Started chat with ${username}`, 'success');
    } catch (error) {
        console.error('Error starting chat:', error);
        showNotification('Error starting chat', 'error');
    }
}

// Setup real-time messaging
function setupRealtimeMessaging() {
    // Handle real-time messages
    window.addRealtimeMessage = function(message) {
        const senderId = message.get('sender').id;
        const senderUsername = message.get('sender').get('username');
        
        // If this message is for current chat, add it to UI
        if (senderId === currentChatId) {
            addMessageToUI(message.get('message'), false, message.get('timestamp'));
            
            // Mark as read
            ChatRiseChat.markAsRead(senderId);
        } else {
            // Update chat list or show notification
            loadChats();
            
            // Show notification
            if (Notification.permission === 'granted') {
                new Notification(`New message from ${senderUsername}`, {
                    body: message.get('message'),
                    icon: 'https://via.placeholder.com/64'
                });
            }
        }
    };
}

// Utility functions
function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function selectFile() {
    document.getElementById('fileInput').click();
}

function refreshMessages() {
    if (currentChatId) {
        loadMessages(currentChatId);
    }
}

function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    container.scrollTop = container.scrollHeight;
}

function formatTime(date) {
    if (!date) return '';
    
    const now = new Date();
    const messageDate = new Date(date);
    const diffInHours = (now - messageDate) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
        return messageDate.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
    } else if (diffInHours < 24 * 7) {
        return messageDate.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
        return messageDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
    }
}

function showLoading(show) {
    const loadingScreen = document.getElementById('loadingScreen');
    loadingScreen.style.display = show ? 'flex' : 'none';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    const colors = {
        success: '#00a884',
        error: '#dc3545',
        info: '#17a2b8'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 1000;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

function openImage(url) {
    window.open(url, '_blank');
}

// Logout function
async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            showLoading(true);
            
            const result = await ChatRiseAuth.logout();
            
            if (result.success) {
                window.location.href = 'login.html';
            } else {
                showNotification('Error logging out: ' + result.error, 'error');
                showLoading(false);
            }
        } catch (error) {
            console.error('Logout error:', error);
            showNotification('Error logging out', 'error');
            showLoading(false);
        }
    }
}

// Search chats
document.getElementById('searchInput').addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const chatItems = document.querySelectorAll('.chat-item');
    
    chatItems.forEach(item => {
        const chatName = item.querySelector('.chat-name')?.textContent.toLowerCase() || '';
        const chatPreview = item.querySelector('.chat-preview')?.textContent.toLowerCase() || '';
        
        if (chatName.includes(searchTerm) || chatPreview.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
});

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('userSearchModal');
    if (event.target === modal) {
        hideUserSearch();
    }
}

// Handle page visibility change
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Page is hidden - update status to away
        ChatRiseUsers.updateStatus(false);
    } else {
        // Page is visible - update status to online
        ChatRiseUsers.updateStatus(true);
        
        // Refresh chats and messages
        loadChats();
        if (currentChatId) {
            loadMessages(currentChatId);
        }
    }
});

// Auto-refresh chats every 30 seconds
setInterval(() => {
    if (!document.hidden) {
        loadChats();
    }
}, 30000);

// Handle connection errors
window.addEventListener('online', function() {
    showNotification('Connection restored', 'success');
    loadChats();
    if (currentChatId) {
        loadMessages(currentChatId);
    }
});

window.addEventListener('offline', function() {
    showNotification('Connection lost', 'error');
});

// Add CSS for new elements
const additionalCSS = `
.loading-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #111b21;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
}

.loading-spinner {
    text-align: center;
    color: #e9edef;
}

.loading-spinner i {
    font-size: 48px;
    color: #00a884;
    margin-bottom: 20px;
    animation: pulse 1.5s infinite;
}

.loading-spinner h2 {
    margin-bottom: 20px;
    font-size: 24px;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #313d44;
    border-top: 4px solid #00a884;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 20px auto;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.welcome-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    background: #0b141a;
}

.welcome-content {
    text-align: center;
    color: #8696a0;
}

.welcome-content i {
    font-size: 64px;
    color: #00a884;
    margin-bottom: 20px;
}

.welcome-content h2 {
    color: #e9edef;
    margin-bottom: 10px;
}

.no-chats {
    text-align: center;
    padding: 40px 20px;
    color: #8696a0;
}

.no-chats i {
    font-size: 48px;
    color: #00a884;
    margin-bottom: 15px;
}

.start-chat-btn {
    background: #00a884;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    margin-top: 10px;
    transition: background 0.2s;
}

.start-chat-btn:hover {
    background: #008a73;
}

.action-btn {
    background: none;
    border: none;
    color: #8696a0;
    cursor: pointer;
    font-size: 16px;
    padding: 8px;
    border-radius: 50%;
    transition: all 0.2s;
}

.action-btn:hover {
    color: #e9edef;
    background: #2a3942;
}

.user-result {
    display: flex;
    align-items: center;
    padding: 12px;
    border-bottom: 1px solid #313d44;
    transition: background 0.2s;
}

.user-result:hover {
    background: #2a3942;
}

.user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    margin-right: 12px;
}

.user-info {
    flex: 1;
}

.user-name {
    font-weight: 500;
    color: #e9edef;
    margin-bottom: 2px;
}

.user-status {
    font-size: 12px;
    color: #8696a0;
}

.user-status.online {
    color: #00a884;
}

.message-image {
    max-width: 200px;
    max-height: 200px;
    border-radius: 8px;
    cursor: pointer;
    margin-bottom: 5px;
}

.message-file {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #00a884;
    text-decoration: none;
    padding: 8px;
    background: rgba(0, 168, 132, 0.1);
    border-radius: 6px;
    margin-bottom: 5px;
}

.message-file:hover {
    background: rgba(0, 168, 132, 0.2);
}

.no-results {
    text-align: center;
    padding: 20px;
    color: #8696a0;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes slideOut {
    from {
        transform: translateX(0);
        opacity: 1;
    }
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}
`;

const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);
