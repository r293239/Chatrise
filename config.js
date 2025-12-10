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

// Then initialize Parse
Parse.initialize(
    CONFIG.PARSE_APP_ID,
    CONFIG.PARSE_JS_KEY
);
Parse.serverURL = CONFIG.PARSE_SERVER_URL;
Parse.masterKey = CONFIG.PARSE_MASTER_KEY;
Parse.clientKey = CONFIG.PARSE_CLIENT_KEY;

// Make CONFIG available globally
window.CONFIG = CONFIG;
