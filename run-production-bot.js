// This file demonstrates how to run the bot with the GitHub-friendly configuration
// For production use, you would replace these values with your actual tokens/IDs

const { run } = require('./server/bot/config');

// IMPORTANT: Replace the placeholder values below with your actual credentials
// before running this file

// You can run with just the token
// run('REPLACE_WITH_YOUR_DISCORD_BOT_TOKEN');

// Or with full configuration
run({
  token: 'REPLACE_WITH_YOUR_DISCORD_BOT_TOKEN', // Required
  robloxCookie: 'REPLACE_WITH_YOUR_ROBLOX_COOKIE', // Optional
  robloxGroupId: 'REPLACE_WITH_YOUR_GROUP_ID', // Optional
  // developmentMode: false // Set to false in production
});