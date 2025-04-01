// Example usage of the Discord bot with GitHub-friendly token configuration
import { run } from './server/bot/config.js';

// IMPORTANT: Replace this placeholder with your actual Discord bot token
// Simple usage with just a Discord token
run('REPLACE_WITH_YOUR_DISCORD_BOT_TOKEN');

// Advanced usage with all configuration options
/*
run({
  token: 'REPLACE_WITH_YOUR_DISCORD_BOT_TOKEN', // Required
  robloxCookie: 'REPLACE_WITH_YOUR_ROBLOX_COOKIE', // Optional
  robloxGroupId: 'REPLACE_WITH_YOUR_GROUP_ID', // Optional
  developmentMode: false // Set to false in production
});
*/