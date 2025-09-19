// Check if user is logged in
document.addEventListener('DOMContentLoaded', function() {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }
    
    loadUserData();
    initializeChat();
});

// Check login status
function isLoggedIn() {
    return localStorage.getItem('chatrise_user') !== null;
}

// Load user data
function loadUserData() {
    const userData = JSON.parse(localStorage.getItem('chatrise_user'));
    if (userData) {
        document.getElementById('username').textContent = userData.username;
    }
}

// Initialize chat functionality
function initializeChat() {
    loadMessages();
    setupChatListeners();
    setupSearch();
}

// Sample messages data
const messages = {
    john: [
        { text: "Hey there! How are you?", time: "12:30", sent: false },
        { text: "I'm doing great, thanks! How about you?", time: "12:32", sent: true },
        { text: "Pretty good! Working on a new project.", time: "12:35", sent: false }
    ],
    jane: [
        { text: "Good morning!", time: "09:15", sent: false },
        { text: "Morning! Ready for the meeting?", time: "09:16", sent: true },
        { text: "Yes, see you at 10!", time: "09:17", sent: false }
    ],
    group: [
        { text: "Team meeting at 3 PM today", time: "10:00", sent: false },
        { text: "I'll be there", time: "10:15", sent: true },
        { text: "Same here", time: "10:16", sent: false }
    ]
};

let currentChat = 'john';

// Load messages for current chat
function loadMessages() {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';
    
    if (messages[currentChat]) {
        messages[currentChat].forEach(msg => {
            addMessageToUI(msg.text, msg.sent, msg.time);
        });
    }
    
    scrollToBottom();
}

// Add message to UI
function addMessageToUI(text, sent, time) {
    const container = document.getElementById('messagesContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sent ? 'sent' : 'received'}`;
    
    messageDiv.innerHTML = `
        <div class="message-content">${text}</div>
        <div class="message-time">${time}</div>
    `;
    
    container.appendChild(messageDiv);
}

// Send message
function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (text === '') return;
    
    const time = getCurrentTime();
    
    // Add to messages data
    if (!messages[currentChat]) {
        messages[currentChat] = [];
    }
    messages[currentChat].push({ text, time, sent: true });
    
    // Add to UI
    addMessageToUI(text, true, time);
    
    // Clear input
    input.value = '';
    
    // Scroll to bottom
    scrollToBottom();
    
    // Simulate received message (for demo)
    setTimeout(() => {
        const responses = [
            "That's interesting!",
            "I see what you mean.",
            "Thanks for sharing!",
            "Got it!",
            "Let me think about that.",
            "Sounds good!",
            "I agree with you."
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        const responseTime = getCurrentTime();
        
        messages[currentChat].push({ text: randomResponse, time: responseTime, sent: false });
        addMessageToUI(randomResponse, false, responseTime);
        scrollToBottom();
    }, 1000 + Math.random() * 2000);
}

// Handle Enter key press
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Get current time
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
}

// Scroll to bottom of messages
function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    container.scrollTop = container.scrollHeight;
}

// Setup chat list listeners
function setupChatListeners() {
    const chatItems = document.querySelectorAll('.chat-item');
    
    chatItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all items
            chatItems.forEach(i => i.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Update current chat
            currentChat = this.getAttribute('data-chat');
            
            // Update chat header
            const chatName = this.querySelector('.chat-name').textContent;
            document.getElementById('currentChatName').textContent = chatName;
            
            // Load messages for this chat
            loadMessages();
        });
    });
}

// Setup search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const chatItems = document.querySelectorAll('.chat-item');
        
        chatItems.forEach(item => {
            const chatName = item.querySelector('.chat-name').textContent.toLowerCase();
            const chatPreview = item.querySelector('.chat-preview').textContent.toLowerCase();
            
            if (chatName.includes(searchTerm) || chatPreview.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('chatrise_user');
        window.location.href = 'login.html';
    }
}

// File attachment (placeholder)
document.querySelector('.attach-btn').addEventListener('click', function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx';
    
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (file) {
            const fileName = file.name;
            const time = getCurrentTime();
            
            // Add file message to chat
            if (!messages[currentChat]) {
                messages[currentChat] = [];
            }
            
            messages[currentChat].push({ 
                text: `📎 ${fileName}`, 
                time, 
                sent: true 
            });
            
            addMessageToUI(`📎 ${fileName}`, true, time);
            scrollToBottom();
        }
    };
    
    input.click();
});

// Emoji button (placeholder)
document.querySelector('.emoji-btn').addEventListener('click', function() {
    const emojis = ['😀', '😂', '❤️', '👍', '👎', '😊', '😢', '😮', '😡', '🔥', '💯', '✨'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    
    const input = document.getElementById('messageInput');
    input.value += randomEmoji;
    input.focus();
});

// Online status simulation
function simulateOnlineStatus() {
    const statusElements = document.querySelectorAll('.header-status');
    const statuses = ['online', 'last seen recently', 'last seen 5 minutes ago'];
    
    setInterval(() => {
        statusElements.forEach(element => {
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            element.textContent = randomStatus;
        });
    }, 10000); // Update every 10 seconds
}

// Initialize online status
simulateOnlineStatus();

// Typing indicator simulation
function showTypingIndicator() {
    const container = document.getElementById('messagesContainer');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message received typing-indicator';
    typingDiv.id = 'typing-indicator';
    
    typingDiv.innerHTML = `
        <div class="message-content">
            <span class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </span>
        </div>
    `;
    
    container.appendChild(typingDiv);
    scrollToBottom();
    
    // Remove after 3 seconds
    setTimeout(() => {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }, 3000);
}

// Add CSS for typing indicator
const typingCSS = `
.typing-indicator .message-content {
    background: #202c33 !important;
    padding: 15px 20px !important;
}

.typing-dots {
    display: inline-flex;
    gap: 4px;
}

.typing-dots span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #8696a0;
    animation: typing 1.4s infinite;
}

.typing-dots span:nth-child(2) {
    animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
    animation-delay: 0.4s;
}

@keyframes typing {
    0%, 60%, 100% {
        transform: translateY(0);
        opacity: 0.4;
    }
    30% {
        transform: translateY(-10px);
        opacity: 1;
    }
}
`;

// Add typing CSS to page
const styleSheet = document.createElement('style');
styleSheet.textContent = typingCSS;
document.head.appendChild(styleSheet);

// Message status indicators
function updateMessageStatus(messageElement, status) {
    const statusIcons = {
        sent: '✓',
        delivered: '✓✓',
        read: '✓✓'
    };
    
    let statusSpan = messageElement.querySelector('.message-status');
    if (!statusSpan) {
        statusSpan = document.createElement('span');
        statusSpan.className = 'message-status';
        messageElement.querySelector('.message-time').appendChild(statusSpan);
    }
    
    statusSpan.textContent = statusIcons[status];
    statusSpan.style.color = status === 'read' ? '#53bdeb' : '#8696a0';
}

// Simulate message statuses
function simulateMessageStatuses() {
    const sentMessages = document.querySelectorAll('.message.sent');
    
    sentMessages.forEach((msg, index) => {
        setTimeout(() => {
            updateMessageStatus(msg, 'delivered');
            
            setTimeout(() => {
                updateMessageStatus(msg, 'read');
            }, 1000 + Math.random() * 2000);
        }, 500 + index * 200);
    });
}

// Run message status simulation when page loads
setTimeout(simulateMessageStatuses, 1000);

// Context menu for messages (right-click)
document.addEventListener('contextmenu', function(e) {
    if (e.target.closest('.message')) {
        e.preventDefault();
        showContextMenu(e.pageX, e.pageY, e.target.closest('.message'));
    }
});

function showContextMenu(x, y, messageElement) {
    // Remove existing context menu
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.position = 'absolute';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.background = '#2a3942';
    menu.style.border = '1px solid #313d44';
    menu.style.borderRadius = '8px';
    menu.style.zIndex = '1000';
    menu.style.minWidth = '120px';
    
    const options = ['Reply', 'Copy', 'Forward', 'Delete'];
    
    options.forEach(option => {
        const item = document.createElement('div');
        item.textContent = option;
        item.style.padding = '10px 15px';
        item.style.cursor = 'pointer';
        item.style.color = '#e9edef';
        item.style.fontSize = '14px';
        
        item.onmouseover = () => item.style.background = '#3c4b54';
        item.onmouseout = () => item.style.background = 'transparent';
        
        item.onclick = () => {
            handleContextMenuAction(option, messageElement);
            menu.remove();
        };
        
        menu.appendChild(item);
    });
    
    document.body.appendChild(menu);
    
    // Remove menu when clicking elsewhere
    setTimeout(() => {
        document.addEventListener('click', function removeMenu() {
            menu.remove();
            document.removeEventListener('click', removeMenu);
        });
    }, 10);
}

function handleContextMenuAction(action, messageElement) {
    const messageText = messageElement.querySelector('.message-content').textContent;
    
    switch(action) {
        case 'Copy':
            navigator.clipboard.writeText(messageText).then(() => {
                showNotification('Message copied to clipboard');
            });
            break;
        case 'Delete':
            if (confirm('Delete this message?')) {
                messageElement.remove();
            }
            break;
        case 'Reply':
            const input = document.getElementById('messageInput');
            input.value = `Reply to: "${messageText.substring(0, 30)}..." - `;
            input.focus();
            break;
        case 'Forward':
            showNotification('Forward feature coming soon!');
            break;
    }
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #00a884;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 1000;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add notification animations
const notificationCSS = `
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

const notificationStyle = document.createElement('style');
notificationStyle.textContent = notificationCSS;
document.head.appendChild(notificationStyle);
