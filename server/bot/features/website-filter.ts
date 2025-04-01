import { Client, Events, Message } from 'discord.js';
import { logger } from '../utils/logger';
import { storage } from '../../storage';

// Default allowed domains
const DEFAULT_ALLOWED_DOMAINS = [
  'roblox.com',
  'www.roblox.com',
  'docs.google.com',
  'drive.google.com',
  'discord.com',
  'discord.gg',
  'media.discordapp.net',
  'cdn.discordapp.com',
  'tenor.com',
  'giphy.com',
  'github.com',
  'youtube.com',
  'youtu.be',
  'twitch.tv'
];

// URL regex pattern
const URL_PATTERN = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

export function setupWebsiteFilter(client: Client) {
  logger.info('Setting up Website Filter protection');

  // Monitor messages for URLs
  client.on(Events.MessageCreate, async (message: Message) => {
    // Ignore messages from bots and DMs
    if (message.author.bot || !message.guild) return;
    
    // Check if website filter is enabled for this server
    const serverId = message.guild.id;
    const settings = await storage.getSecuritySettings(serverId);
    
    if (!settings || !settings.websiteFilter) {
      logger.debug(`Website Filter disabled for server ${serverId}, ignoring message`);
      return;
    }
    
    try {
      // Extract URLs from the message
      const urls = extractUrls(message.content);
      
      if (urls.length === 0) return;
      
      // Check if any URL is not allowed
      const allowedDomains = settings.allowedDomains?.length > 0 
        ? settings.allowedDomains 
        : DEFAULT_ALLOWED_DOMAINS;
      
      const blockedUrls = [];
      
      for (const url of urls) {
        const domain = extractDomain(url);
        
        if (domain && !isAllowedDomain(domain, allowedDomains)) {
          blockedUrls.push(url);
        }
      }
      
      if (blockedUrls.length > 0) {
        await handleBlockedUrls(message, blockedUrls);
      }
    } catch (error) {
      logger.error('Error in website filter message handler:', error);
    }
  });

  // Monitor message edits too
  client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
    // Ignore messages from bots and DMs
    if (newMessage.author?.bot || !newMessage.guild) return;
    
    // Ensure the message content can be accessed
    if (!newMessage.content) return;
    
    // Check if website filter is enabled for this server
    const serverId = newMessage.guild.id;
    const settings = await storage.getSecuritySettings(serverId);
    
    if (!settings || !settings.websiteFilter) {
      logger.debug(`Website Filter disabled for server ${serverId}, ignoring message update`);
      return;
    }
    
    try {
      // Extract URLs from the message
      const urls = extractUrls(newMessage.content);
      
      if (urls.length === 0) return;
      
      // Check if any URL is not allowed
      const allowedDomains = settings.allowedDomains?.length > 0 
        ? settings.allowedDomains 
        : DEFAULT_ALLOWED_DOMAINS;
      
      const blockedUrls = [];
      
      for (const url of urls) {
        const domain = extractDomain(url);
        
        if (domain && !isAllowedDomain(domain, allowedDomains)) {
          blockedUrls.push(url);
        }
      }
      
      if (blockedUrls.length > 0) {
        await handleBlockedUrls(newMessage as Message, blockedUrls);
      }
    } catch (error) {
      logger.error('Error in website filter message update handler:', error);
    }
  });
}

// Extract URLs from a string
function extractUrls(text: string): string[] {
  if (!text) return [];
  return Array.from(text.matchAll(URL_PATTERN), m => m[0]);
}

// Extract domain from a URL
function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase();
  } catch (e) {
    return null;
  }
}

// Check if a domain is in the allowed list
function isAllowedDomain(domain: string, allowedDomains: string[]): boolean {
  // Handle subdomains by checking if the domain ends with an allowed domain
  return allowedDomains.some(allowedDomain => {
    // Exact match
    if (domain === allowedDomain) return true;
    
    // Subdomain match (e.g. sub.example.com should match example.com)
    if (domain.endsWith(`.${allowedDomain}`)) return true;
    
    return false;
  });
}

// Handle messages with blocked URLs
async function handleBlockedUrls(message: Message, blockedUrls: string[]) {
  logger.warn(`Website Filter blocked URLs in message ${message.id} by ${message.author.tag} (${message.author.id}): ${blockedUrls.join(', ')}`);
  
  try {
    // Delete the message
    await message.delete();
    
    // Notify the user privately
    try {
      await message.author.send({
        embeds: [{
          title: '⚠️ Message Removed',
          description: 'Your message has been removed because it contained a blocked website link.',
          color: 0xED4245, // Red
          fields: [
            { name: 'Blocked URL(s)', value: blockedUrls.join('\n') },
            { name: 'Server', value: message.guild!.name },
            { name: 'Note', value: 'If you believe this is an error, please contact a server moderator.' }
          ],
          timestamp: new Date().toISOString()
        }]
      });
    } catch (dmError) {
      logger.error(`Failed to DM user ${message.author.id} about blocked URL:`, dmError);
    }
    
    // Log the incident
    await storage.createSecurityLog({
      serverId: message.guild!.id,
      eventType: 'websiteFilter',
      action: 'URL blocked',
      userId: message.author.id,
      details: `Blocked URLs: ${blockedUrls.join(', ')}`
    });
    
    // Increment threats blocked counter
    const stats = await storage.getServerStats(message.guild!.id);
    if (stats) {
      await storage.updateServerStats(message.guild!.id, {
        ...stats,
        threatsBlocked: stats.threatsBlocked + 1
      });
    }
    
    // Notify in log channel if configured
    const settings = await storage.getSecuritySettings(message.guild!.id);
    if (settings && settings.logChannelId) {
      const logChannel = await message.guild!.channels.fetch(settings.logChannelId);
      if (logChannel && logChannel.isTextBased()) {
        await logChannel.send({
          embeds: [{
            title: '🔒 Website Filter Activated',
            description: `Blocked message with suspicious URL`,
            color: 0xFEE75C, // Yellow
            fields: [
              { name: 'User', value: `<@${message.author.id}> (${message.author.tag})` },
              { name: 'Channel', value: `<#${message.channel.id}>` },
              { name: 'Blocked URL(s)', value: blockedUrls.join('\n') },
              { name: 'Time', value: new Date().toLocaleString() }
            ]
          }]
        });
      }
    }
  } catch (error) {
    logger.error(`Error handling blocked URLs in message ${message.id}:`, error);
  }
}
