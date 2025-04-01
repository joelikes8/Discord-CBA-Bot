// This file demonstrates how to run the bot with the GitHub-friendly configuration
// For production use, you would replace these values with your actual tokens/IDs

const { run } = require('./server/bot/config');

// You can run with just the token
// run('YOUR_DISCORD_BOT_TOKEN');

// Or with full configuration
run({
  token: 'YOUR_DISCORD_BOT_TOKEN',
  robloxCookie: 'YOUR_ROBLOX_SECURITY_COOKIE',
  robloxGroupId: 'YOUR_ROBLOX_GROUP_ID',
  // developmentMode: false // Set to false in production
});