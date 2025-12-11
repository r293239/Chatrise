// config.js - Configuration file
// © 2025 [Reuben Yee]. All rights reserved.

const CONFIG = {
    PARSE_APP_ID: 'z5FgipCE12ScJNuYMbJ19EY2c7AXCxp5nWX7BWHT',
    PARSE_JS_KEY: 'QNQTH3G4VuLA5gkPIiCtoXZjJJMcP7P5zYsETOPV',
    PARSE_SERVER_URL: 'https://parseapi.back4app.com/',
    PARSE_MASTER_KEY: 'SQPqpYpZ0UeXFvwWujyAz3wq1EFGSMwxYRcXlPWz',
    PARSE_CLIENT_KEY: 'uY5HJk030v4qEqWt4YdNWPOupzUzrYhzsswOoUXO',
    EMAILJS_PUBLIC_KEY: 'deRsF9u2c6Z5ee142',
    EMAILJS_SERVICE_ID: 'service_bh1l88z',
    EMAILJS_TEMPLATE_ID: 'template_fchb4ci'
};

// Initialize Parse with ALL KEYS
Parse.initialize(
    CONFIG.PARSE_APP_ID,
    CONFIG.PARSE_JS_KEY,
    CONFIG.PARSE_CLIENT_KEY  // Add client key here too
);
Parse.serverURL = CONFIG.PARSE_SERVER_URL;

// CRITICAL: Set master key globally
Parse.masterKey = CONFIG.PARSE_MASTER_KEY;

// Also set it on the Parse object
Parse.CoreManager.set('MASTER_KEY', CONFIG.PARSE_MASTER_KEY);

// Debug: Verify master key is set
console.log('✅ Parse initialized');
console.log('✅ Master Key available:', !!Parse.masterKey);
console.log('✅ Master Key set globally:', !!Parse.CoreManager.get('MASTER_KEY'));

Parse.Cloud.beforeSave('_User', function(request, response) {
    const user = request.object;
    
    // Ensure bio is never too long
    if (user.get('bio') && user.get('bio').length > 500) {
        user.set('bio', user.get('bio').substring(0, 500));
    }
    
    // Can add more validation here when needed
    response.success();
});

window.CONFIG = CONFIG;
