// Example usage of the Discord bot with GitHub-friendly token configuration
import { run } from './server/bot/config.js';

// Simple usage with just a Discord token
run('INSERT YOUR DISCORD BOT TOKEN HERE');

// Advanced usage with all configuration options
/*
run({
  token: 'INSERT YOUR DISCORD BOT TOKEN HERE',
  robloxCookie: 'INSERT YOUR ROBLOX COOKIE HERE',
  robloxGroupId: 'INSERT YOUR ROBLOX GROUP ID HERE',
  developmentMode: false
});
*/