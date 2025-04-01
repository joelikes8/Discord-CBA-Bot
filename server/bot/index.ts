import { Client, IntentsBitField, Events, GatewayIntentBits, Collection } from 'discord.js';
import { registerCommands } from './commands';
import { setupAntiNuke } from './features/anti-nuke';
import { setupAntiHack } from './features/anti-hack';
import { setupAntiRaid } from './features/anti-raid';
import { setupWebsiteFilter } from './features/website-filter';
import { setupTicketSystem } from './features/ticket-system';
import { logger } from './utils/logger';

// Bot client
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
  ],
});

// Initialize the bot
export async function initializeBot() {
  // Log when the bot is ready
  client.once(Events.ClientReady, (readyClient) => {
    logger.info(`Bot logged in as ${readyClient.user.tag}`);
  });

  // Register all commands
  registerCommands(client);
  
  // Setup security features
  setupAntiNuke(client);
  setupAntiHack(client);
  setupAntiRaid(client);
  setupWebsiteFilter(client);
  setupTicketSystem(client);

  // Error handling
  client.on(Events.Error, (error) => {
    logger.error('Discord client error:', error);
  });

  // Get the token from environment variables
  const token = process.env.DISCORD_TOKEN;
  
  if (!token) {
    logger.error('DISCORD_TOKEN is not defined in the environment variables');
    throw new Error('DISCORD_TOKEN is required');
  }

  try {
    // Check if this is a development mock token
    if (token === 'mock_token_for_development') {
      logger.warn('Using mock token - Discord bot will simulate connections but not actually connect');
      logger.info('Bot initialized in development mode (simulated)');
      return client;
    }
    
    // Login to Discord with the bot token
    await client.login(token);
    logger.info('Bot initialized successfully');
    return client;
  } catch (error) {
    logger.error('Failed to initialize bot:', error);
    throw error;
  }
}

// Shutdown function
export async function shutdownBot() {
  if (client) {
    logger.info('Shutting down bot...');
    client.destroy();
    logger.info('Bot shutdown complete');
  }
}
