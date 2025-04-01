import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeBot, shutdownBot, client } from './bot/index';
import { refreshRobloxConnection, isRobloxConnected } from './bot/services/roblox';
import { logger } from './bot/utils/logger';

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize the bot
  try {
    await initializeBot();
  } catch (error) {
    logger.error('Failed to initialize bot:', error);
  }

  // API routes
  
  // Dashboard stats
  app.get('/api/dashboard/stats', async (req, res) => {
    try {
      // Use the default server for now (future: add server selection)
      const servers = await storage.getAllDiscordServers();
      if (!servers || servers.length === 0) {
        return res.status(404).json({ message: 'No servers found' });
      }
      
      const serverId = servers[0].id;
      const stats = await storage.getServerStats(serverId);
      
      if (!stats) {
        return res.status(404).json({ message: 'Server stats not found' });
      }
      
      res.json({
        securityScore: stats.securityScore,
        lastSecurityScore: stats.securityScore - 5, // Mock previous score
        threatsBlocked: stats.threatsBlocked,
        lastThreatsBlocked: stats.threatsBlocked - 12,
        verifiedMembers: stats.verifiedMembers,
        totalMembers: stats.totalMembers,
        lastVerifiedMembers: stats.verifiedMembers - 23,
        openTickets: stats.openTickets,
        needAttention: 2 // Mock value
      });
    } catch (error) {
      logger.error('Error fetching dashboard stats:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
  });
  
  // Recent activity
  app.get('/api/dashboard/activity', async (req, res) => {
    try {
      const servers = await storage.getAllDiscordServers();
      if (!servers || servers.length === 0) {
        return res.status(404).json({ message: 'No servers found' });
      }
      
      const serverId = servers[0].id;
      const logs = await storage.getRecentSecurityLogs(serverId, 10);
      
      if (!logs) {
        return res.json([]);
      }
      
      const activities = logs.map(log => {
        // Determine icon based on event type
        let type = 'settings';
        if (log.eventType === 'anti-raid') type = 'antiRaid';
        if (log.eventType === 'anti-nuke') type = 'antiRaid';
        if (log.eventType === 'anti-hack') type = 'antiRaid';
        if (log.eventType === 'websiteFilter') type = 'websiteFilter';
        if (log.eventType === 'verification') type = 'verification';
        if (log.eventType === 'ticket') type = 'ticket';
        
        // Calculate time ago
        const now = new Date();
        const timestamp = new Date(log.timestamp);
        const diffMs = now.getTime() - timestamp.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        let timeAgo = '';
        if (diffDays > 0) {
          timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else if (diffHours > 0) {
          timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffMins > 0) {
          timeAgo = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        } else {
          timeAgo = 'just now';
        }
        
        return {
          id: log.id.toString(),
          type,
          icon: '',
          title: log.action,
          description: log.details || '',
          timestamp: timestamp.toISOString(),
          timeAgo
        };
      });
      
      res.json(activities);
    } catch (error) {
      logger.error('Error fetching activity log:', error);
      res.status(500).json({ message: 'Failed to fetch activity log' });
    }
  });
  
  // Command documentation
  app.get('/api/dashboard/commands', async (req, res) => {
    // Since this is static data, we can return it directly
    res.json([
      {
        name: 'Verification Commands',
        color: 'hsl(235, 86%, 65%)',
        commands: [
          {
            command: '/verify',
            description: 'Initiates the Roblox verification process, linking Discord and Roblox accounts.'
          },
          {
            command: '/reverify',
            description: 'Re-does the verification process if you changed accounts or had issues.'
          },
          {
            command: '/whois @user',
            description: 'Shows the Roblox account linked to the mentioned Discord user.'
          }
        ]
      },
      {
        name: 'Roblox Management',
        color: 'hsl(150, 86%, 65%)',
        commands: [
          {
            command: '/promote [username] [rank]',
            description: 'Promotes the given Roblox user to the specified rank in the linked group.'
          },
          {
            command: '/groupinfo',
            description: 'Displays information about the connected Roblox group.'
          },
          {
            command: '/ranks',
            description: 'Lists all available ranks in the Roblox group.'
          }
        ]
      },
      {
        name: 'Security Commands',
        color: 'hsl(0, 86%, 65%)',
        commands: [
          {
            command: '/securitystats',
            description: 'Shows current security status and recent threats.'
          },
          {
            command: '/lockdown [reason]',
            description: 'Temporarily restricts server access during security incidents.'
          },
          {
            command: '/allowsite [url]',
            description: 'Adds a website to the allowed URLs list (Admin only).'
          }
        ]
      },
      {
        name: 'Ticket Commands',
        color: 'hsl(60, 86%, 65%)',
        commands: [
          {
            command: '/ticket [issue]',
            description: 'Creates a new support ticket with the specified issue.'
          },
          {
            command: '/closeticket [reason]',
            description: 'Closes an active ticket channel with the given reason.'
          },
          {
            command: '/ticketpanel',
            description: 'Creates a ticket panel for users to open support tickets (Admin only).'
          }
        ]
      }
    ]);
  });
  
  // Security settings
  app.get('/api/security/settings', async (req, res) => {
    try {
      const servers = await storage.getAllDiscordServers();
      if (!servers || servers.length === 0) {
        return res.status(404).json({ message: 'No servers found' });
      }
      
      const serverId = servers[0].id;
      const settings = await storage.getSecuritySettings(serverId);
      
      if (!settings) {
        return res.status(404).json({ message: 'Security settings not found' });
      }
      
      res.json({
        antiNuke: settings.antiNuke,
        antiHack: settings.antiHack,
        antiRaid: settings.antiRaid,
        websiteFilter: settings.websiteFilter
      });
    } catch (error) {
      logger.error('Error fetching security settings:', error);
      res.status(500).json({ message: 'Failed to fetch security settings' });
    }
  });
  
  // Update security settings
  app.post('/api/security/settings', async (req, res) => {
    try {
      const { antiNuke, antiHack, antiRaid, websiteFilter } = req.body;
      
      const servers = await storage.getAllDiscordServers();
      if (!servers || servers.length === 0) {
        return res.status(404).json({ message: 'No servers found' });
      }
      
      const serverId = servers[0].id;
      const settings = await storage.getSecuritySettings(serverId);
      
      if (!settings) {
        return res.status(404).json({ message: 'Security settings not found' });
      }
      
      // Update settings
      await storage.updateSecuritySettings(serverId, {
        ...settings,
        antiNuke,
        antiHack,
        antiRaid,
        websiteFilter
      });
      
      // Log the settings change
      await storage.createSecurityLog({
        serverId,
        eventType: 'settings',
        action: 'Security settings updated',
        details: 'Updated security feature settings'
      });
      
      res.json({
        success: true,
        message: 'Security settings updated successfully'
      });
    } catch (error) {
      logger.error('Error updating security settings:', error);
      res.status(500).json({ message: 'Failed to update security settings' });
    }
  });
  
  // Security logs
  app.get('/api/security/logs', async (req, res) => {
    try {
      const servers = await storage.getAllDiscordServers();
      if (!servers || servers.length === 0) {
        return res.status(404).json({ message: 'No servers found' });
      }
      
      const serverId = servers[0].id;
      const logs = await storage.getRecentSecurityLogs(serverId, 20);
      
      if (!logs) {
        return res.json([]);
      }
      
      // Format logs similar to activity API
      const formattedLogs = logs.map(log => {
        // Determine type based on event type
        let type = 'settings';
        if (log.eventType === 'anti-raid') type = 'antiRaid';
        if (log.eventType === 'anti-nuke') type = 'antiRaid';
        if (log.eventType === 'anti-hack') type = 'antiRaid';
        if (log.eventType === 'websiteFilter') type = 'websiteFilter';
        if (log.eventType === 'verification') type = 'verification';
        if (log.eventType === 'ticket') type = 'ticket';
        
        // Calculate time ago
        const now = new Date();
        const timestamp = new Date(log.timestamp);
        const diffMs = now.getTime() - timestamp.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        let timeAgo = '';
        if (diffDays > 0) {
          timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else if (diffHours > 0) {
          timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffMins > 0) {
          timeAgo = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        } else {
          timeAgo = 'just now';
        }
        
        return {
          id: log.id.toString(),
          type,
          icon: '',
          title: log.action,
          description: log.details || '',
          timestamp: timestamp.toISOString(),
          timeAgo
        };
      });
      
      res.json(formattedLogs);
    } catch (error) {
      logger.error('Error fetching security logs:', error);
      res.status(500).json({ message: 'Failed to fetch security logs' });
    }
  });
  
  // Verification settings
  app.get('/api/verification/settings', async (req, res) => {
    try {
      const servers = await storage.getAllDiscordServers();
      if (!servers || servers.length === 0) {
        return res.status(404).json({ message: 'No servers found' });
      }
      
      const serverId = servers[0].id;
      const settings = await storage.getSecuritySettings(serverId);
      
      if (!settings) {
        return res.status(404).json({ message: 'Security settings not found' });
      }
      
      // Check Roblox API connection
      const robloxApiConnected = isRobloxConnected();
      
      res.json({
        verifiedRole: settings.verifiedRoleId || 'Verified Member',
        robloxApiConnected
      });
    } catch (error) {
      logger.error('Error fetching verification settings:', error);
      res.status(500).json({ message: 'Failed to fetch verification settings' });
    }
  });
  
  // Update verification settings
  app.post('/api/verification/settings', async (req, res) => {
    try {
      const { verifiedRole } = req.body;
      
      const servers = await storage.getAllDiscordServers();
      if (!servers || servers.length === 0) {
        return res.status(404).json({ message: 'No servers found' });
      }
      
      const serverId = servers[0].id;
      const settings = await storage.getSecuritySettings(serverId);
      
      if (!settings) {
        return res.status(404).json({ message: 'Security settings not found' });
      }
      
      // Update verified role ID
      await storage.updateSecuritySettings(serverId, {
        ...settings,
        verifiedRoleId: verifiedRole
      });
      
      // Log the settings change
      await storage.createSecurityLog({
        serverId,
        eventType: 'verification',
        action: 'Verification settings updated',
        details: `Updated verified role to ${verifiedRole}`
      });
      
      res.json({
        success: true,
        message: 'Verification settings updated successfully'
      });
    } catch (error) {
      logger.error('Error updating verification settings:', error);
      res.status(500).json({ message: 'Failed to update verification settings' });
    }
  });
  
  // Refresh Roblox connection
  app.post('/api/verification/refresh-connection', async (req, res) => {
    try {
      const result = await refreshRobloxConnection();
      
      res.json({
        success: result,
        connected: isRobloxConnected(),
        message: result ? 'Roblox connection refreshed successfully' : 'Failed to refresh Roblox connection'
      });
    } catch (error) {
      logger.error('Error refreshing Roblox connection:', error);
      res.status(500).json({ message: 'Failed to refresh Roblox connection' });
    }
  });
  
  // List all verifications
  app.get('/api/verification/list', async (req, res) => {
    try {
      const servers = await storage.getAllDiscordServers();
      if (!servers || servers.length === 0) {
        return res.status(404).json({ message: 'No servers found' });
      }
      
      const serverId = servers[0].id;
      const verifications = await storage.getRobloxVerifications(serverId);
      
      res.json(verifications || []);
    } catch (error) {
      logger.error('Error fetching verification list:', error);
      res.status(500).json({ message: 'Failed to fetch verification list' });
    }
  });
  
  // List server roles
  app.get('/api/server/roles', async (req, res) => {
    try {
      // Mock roles for now
      res.json([
        'Verified Member',
        'Roblox Player',
        'Community Member',
        'Guest',
        'Member',
        'VIP'
      ]);
    } catch (error) {
      logger.error('Error fetching server roles:', error);
      res.status(500).json({ message: 'Failed to fetch server roles' });
    }
  });
  
  // List server channels
  app.get('/api/server/channels', async (req, res) => {
    try {
      // Mock channels for now
      res.json([
        'general',
        'announcements',
        'bot-commands',
        'admin-chat',
        'mod-logs',
        'welcome'
      ]);
    } catch (error) {
      logger.error('Error fetching server channels:', error);
      res.status(500).json({ message: 'Failed to fetch server channels' });
    }
  });
  
  // Get server info
  app.get('/api/server/info', async (req, res) => {
    try {
      const servers = await storage.getAllDiscordServers();
      if (!servers || servers.length === 0) {
        return res.status(404).json({ message: 'No servers found' });
      }
      
      const server = servers[0];
      
      res.json({
        id: server.id,
        name: server.name,
        memberCount: server.memberCount,
        owner: {
          id: server.ownerId,
          username: 'Server Owner',
          discriminator: '0001'
        }
      });
    } catch (error) {
      logger.error('Error fetching server info:', error);
      res.status(500).json({ message: 'Failed to fetch server info' });
    }
  });
  
  // Get tickets
  app.get('/api/tickets/list', async (req, res) => {
    try {
      const servers = await storage.getAllDiscordServers();
      if (!servers || servers.length === 0) {
        return res.status(404).json({ message: 'No servers found' });
      }
      
      const serverId = servers[0].id;
      const openTickets = await storage.getOpenTickets(serverId);
      
      if (!openTickets || openTickets.length === 0) {
        return res.json([]);
      }
      
      const tickets = openTickets.map(ticket => {
        // Calculate time ago
        const now = new Date();
        const created = new Date(ticket.createdAt);
        const diffMs = now.getTime() - created.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        
        let timeAgo = '';
        if (diffHours > 0) {
          timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffMins > 0) {
          timeAgo = `${diffMins} min ago`;
        } else {
          timeAgo = 'just now';
        }
        
        return {
          id: ticket.id.toString(),
          status: ticket.status as 'open' | 'inProgress' | 'closed',
          title: ticket.issue,
          user: ticket.userId,
          timeAgo
        };
      });
      
      res.json(tickets);
    } catch (error) {
      logger.error('Error fetching tickets:', error);
      res.status(500).json({ message: 'Failed to fetch tickets' });
    }
  });
  
  // Get all tickets (open and closed)
  app.get('/api/tickets/all', async (req, res) => {
    try {
      const servers = await storage.getAllDiscordServers();
      if (!servers || servers.length === 0) {
        return res.status(404).json({ message: 'No servers found' });
      }
      
      const serverId = servers[0].id;
      const allTickets = await storage.getAllTickets(serverId);
      
      res.json(allTickets || []);
    } catch (error) {
      logger.error('Error fetching all tickets:', error);
      res.status(500).json({ message: 'Failed to fetch all tickets' });
    }
  });
  
  // Bot settings
  app.get('/api/settings', async (req, res) => {
    try {
      const servers = await storage.getAllDiscordServers();
      if (!servers || servers.length === 0) {
        return res.status(404).json({ message: 'No servers found' });
      }
      
      const serverId = servers[0].id;
      const settings = await storage.getSecuritySettings(serverId);
      
      if (!settings) {
        return res.status(404).json({ message: 'Security settings not found' });
      }
      
      res.json({
        prefix: process.env.BOT_PREFIX || '!',
        logChannelId: settings.logChannelId,
        deleteCommands: false,
        debugMode: process.env.NODE_ENV !== 'production'
      });
    } catch (error) {
      logger.error('Error fetching bot settings:', error);
      res.status(500).json({ message: 'Failed to fetch bot settings' });
    }
  });
  
  // Update bot settings
  app.post('/api/settings', async (req, res) => {
    try {
      const { prefix, logChannelId, deleteCommands, debugMode } = req.body;
      
      const servers = await storage.getAllDiscordServers();
      if (!servers || servers.length === 0) {
        return res.status(404).json({ message: 'No servers found' });
      }
      
      const serverId = servers[0].id;
      const settings = await storage.getSecuritySettings(serverId);
      
      if (!settings) {
        return res.status(404).json({ message: 'Security settings not found' });
      }
      
      // Update log channel ID in settings
      await storage.updateSecuritySettings(serverId, {
        ...settings,
        logChannelId
      });
      
      // Set environment variables (would need to be persisted properly in a real app)
      process.env.BOT_PREFIX = prefix;
      process.env.DELETE_COMMANDS = String(deleteCommands);
      process.env.DEBUG_MODE = String(debugMode);
      
      // Log the settings change
      await storage.createSecurityLog({
        serverId,
        eventType: 'settings',
        action: 'Bot settings updated',
        details: 'Updated bot configuration settings'
      });
      
      res.json({
        success: true,
        message: 'Bot settings updated successfully'
      });
    } catch (error) {
      logger.error('Error updating bot settings:', error);
      res.status(500).json({ message: 'Failed to update bot settings' });
    }
  });
  
  // Reset bot
  app.post('/api/bot/reset', async (req, res) => {
    try {
      logger.info('Resetting bot...');
      
      // Shutdown the bot
      await shutdownBot();
      
      // Initialize the bot again
      await initializeBot();
      
      res.json({
        success: true,
        message: 'Bot has been reset successfully'
      });
    } catch (error) {
      logger.error('Error resetting bot:', error);
      res.status(500).json({ message: 'Failed to reset bot' });
    }
  });

  // Create and return the HTTP server
  const httpServer = createServer(app);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT. Shutting down bot...');
    await shutdownBot();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM. Shutting down bot...');
    await shutdownBot();
    process.exit(0);
  });

  return httpServer;
}
