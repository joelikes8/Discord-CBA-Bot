// Configuration module for the Discord bot
import { Client } from 'discord.js';
import { logger } from './utils/logger';
import { initializeBot, shutdownBot } from './index';
import { refreshRobloxConnection } from './services/roblox';

/**
 * Configuration options for the bot
 */
export interface BotConfig {
  /** Discord bot token (required) */
  token: string;
  /** Roblox cookie for authentication (optional) */
  robloxCookie?: string;
  /** Roblox group ID for promotion commands (optional) */
  robloxGroupId?: string;
  /** Enable development mode with mocked connections (optional) */
  developmentMode?: boolean;
}

/**
 * Run the bot with the provided token and optional configuration
 * This format is GitHub-friendly as it allows users to easily replace the token
 * 
 * @param token Your Discord bot token (string) or full configuration object
 * @returns The Discord.js client instance
 * 
 * @example
 * // Simple usage with just a token
 * run('YOUR_DISCORD_BOT_TOKEN');
 * 
 * @example
 * // Advanced usage with full configuration
 * run({
 *   token: 'YOUR_DISCORD_BOT_TOKEN',
 *   robloxCookie: 'YOUR_ROBLOX_COOKIE',
 *   robloxGroupId: '123456789'
 * });
 */
export async function run(tokenOrConfig: string | BotConfig) {
  try {
    // Parse configuration
    const config: BotConfig = typeof tokenOrConfig === 'string' 
      ? { token: tokenOrConfig } 
      : tokenOrConfig;
    
    // Set the token in the environment
    process.env.DISCORD_TOKEN = config.token;
    
    // Optional: Set Roblox configuration if provided
    if (config.robloxCookie) {
      process.env.ROBLOX_COOKIE = config.robloxCookie;
      
      if (config.robloxGroupId) {
        process.env.ROBLOX_GROUP_ID = config.robloxGroupId;
        logger.info(`Roblox group ID configured: ${config.robloxGroupId}`);
      }
      
      // Refresh the Roblox connection with new credentials
      await refreshRobloxConnection();
    }
    
    // Set development mode if specified
    if (config.developmentMode) {
      process.env.NODE_ENV = 'development';
      logger.info('Running in development mode');
    }
    
    // Start the bot
    logger.info('Starting the Discord bot...');
    const client = await initializeBot();
    
    // Setup shutdown handlers
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT signal, shutting down bot');
      await shutdownBot();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM signal, shutting down bot');
      await shutdownBot();
      process.exit(0);
    });
    
    return client;
  } catch (error) {
    logger.error('Failed to start bot:', error);
    throw error;
  }
}

/**
 * Example usage:
 * 
 * // Import the bot configuration
 * import { run } from './bot/config';
 * 
 * // Run the bot with your token
 * run('INSERT YOUR DISCORD BOT TOKEN HERE');
 */