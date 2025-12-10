// config.js - ChatRise Configuration File
// Parse Backend Configuration

// Initialize Parse with your app credentials
Parse.initialize(
    "z5FgipCE12ScJNuYMbJ19EY2c7AXCxp5nWX7BWHT", // Application ID
    "QNQTH3G4VuLA5gkPIiCtoXZjJJMcP7P5zYsETOPV"  // JavaScript Key
);

// Set the Parse server URL
Parse.serverURL = 'https://parseapi.back4app.com/';

// MASTER KEY - Required for administrative access
Parse.masterKey = "SQPqpYpZ0UeXFvwWujyAz3wq1EFGSMwxYRcXlPWz";

// CLIENT KEY - For client-side operations
Parse.clientKey = "uY5HJk030v4qEqWt4YdNWPOupzUzrYhzsswOoUXO";

// Optional: Enable verbose logging for debugging
Parse.verbose = true;

// EmailJS Configuration for sending emails (contact requests, etc.)
const emailjsConfig = {
    serviceId: "service_f5dz9kv",       // Your EmailJS service ID
    templateId: "template_k5o9ooj",     // Your EmailJS template ID  
    userId: "KTJqW_DmeM1b8z8Z4"         // Your EmailJS user ID
};

// Optional: You can also expose these to window for easy access
window.Parse = Parse;
window.emailjsConfig = emailjsConfig;

console.log('✅ Parse initialized with Application ID:', Parse.applicationId);
console.log('✅ Server URL:', Parse.serverURL);
console.log('✅ Master Key available:', !!Parse.masterKey);
console.log('✅ Client Key available:', !!Parse.clientKey);
