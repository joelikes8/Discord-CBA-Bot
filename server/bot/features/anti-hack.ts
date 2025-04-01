import { Client, Events, GuildMember, PermissionFlagsBits, AuditLogEvent } from 'discord.js';
import { logger } from '../utils/logger';
import { storage } from '../../storage';

// Suspicious patterns and thresholds
const SUSPICIOUS_PERMISSIONS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageWebhooks
];

const PERMISSION_CHANGES_THRESHOLD = 3; // Number of permission changes in timeframe to trigger
const PERMISSION_CHANGES_TIMEFRAME = 30000; // 30 seconds

// Keep track of recent permission changes
const recentPermissionChanges = new Map<string, { userId: string, timestamps: number[] }>();

export function setupAntiHack(client: Client) {
  logger.info('Setting up Anti-Hack protection');

  // Monitor role updates
  client.on(Events.GuildRoleUpdate, async (oldRole, newRole) => {
    // Check if anti-hack is enabled for this server
    const serverId = newRole.guild.id;
    const settings = await storage.getSecuritySettings(serverId);
    
    if (!settings || !settings.antiHack) {
      logger.debug(`Anti-Hack disabled for server ${serverId}, ignoring role update`);
      return;
    }

    try {
      // Check if any dangerous permissions were added
      const oldPermissions = oldRole.permissions.bitfield;
      const newPermissions = newRole.permissions.bitfield;
      
      // If permissions didn't change or were reduced, ignore
      if (oldPermissions >= newPermissions) return;
      
      // Check if any suspicious permissions were added
      const suspiciousPermissionsAdded = SUSPICIOUS_PERMISSIONS.some(permission => 
        !(oldPermissions & permission) && (newPermissions & permission)
      );
      
      if (!suspiciousPermissionsAdded) return;
      
      // Fetch the audit logs to find who updated the role
      const auditLogs = await newRole.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.RoleUpdate,
      });

      const roleUpdateLog = auditLogs.entries.first();
      if (!roleUpdateLog) return;

      const { executor } = roleUpdateLog;
      
      // Skip if the executor is a bot or the server owner
      if (executor?.bot || executor?.id === newRole.guild.ownerId) return;
      
      // Track the permission change
      if (!recentPermissionChanges.has(serverId)) {
        recentPermissionChanges.set(serverId, { userId: executor!.id, timestamps: [Date.now()] });
      } else {
        const record = recentPermissionChanges.get(serverId)!;
        
        // If this is a different user, reset the record
        if (record.userId !== executor!.id) {
          recentPermissionChanges.set(serverId, { userId: executor!.id, timestamps: [Date.now()] });
        } else {
          // Filter out old timestamps outside the timeframe
          const recentTimestamps = record.timestamps.filter(
            timestamp => Date.now() - timestamp < PERMISSION_CHANGES_TIMEFRAME
          );
          
          // Add the new timestamp
          recentTimestamps.push(Date.now());
          record.timestamps = recentTimestamps;
          
          // Check if threshold exceeded
          if (recentTimestamps.length >= PERMISSION_CHANGES_THRESHOLD) {
            await handleSuspiciousActivity(newRole.guild, executor!.id, 'suspicious_permission_changes');
            
            // Reset permissions to previous state
            await newRole.setPermissions(oldPermissions, 'Anti-Hack protection - suspicious permission escalation detected');
          }
        }
      }
    } catch (error) {
      logger.error('Error in anti-hack role update handler:', error);
    }
  });

  // Monitor new webhook creation (often used in hacks)
  client.on(Events.WebhooksUpdate, async (channel) => {
    // Check if anti-hack is enabled for this server
    const serverId = channel.guild.id;
    const settings = await storage.getSecuritySettings(serverId);
    
    if (!settings || !settings.antiHack) {
      logger.debug(`Anti-Hack disabled for server ${serverId}, ignoring webhook update`);
      return;
    }

    try {
      // Fetch the audit logs to find who created the webhook
      const auditLogs = await channel.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.WebhookCreate,
      });

      const webhookLog = auditLogs.entries.first();
      if (!webhookLog) return;

      const { executor } = webhookLog;
      
      // Skip if the executor is a bot or the server owner
      if (executor?.bot || executor?.id === channel.guild.ownerId) return;
      
      // Get the member
      const member = await channel.guild.members.fetch(executor!.id);
      
      // If the member has been in the server for less than 7 days and created a webhook, 
      // that's suspicious and we'll monitor it
      if (member && Date.now() - member.joinedTimestamp! < 7 * 24 * 60 * 60 * 1000) {
        // Log this as suspicious activity
        await storage.createSecurityLog({
          serverId: channel.guild.id,
          eventType: 'anti-hack',
          action: 'Suspicious webhook creation',
          userId: executor!.id,
          details: `New member created webhook in channel ${channel.name}`
        });
        
        // Don't ban immediately, but fetch the webhook and monitor it
        const webhooks = await channel.fetchWebhooks();
        const newWebhook = webhooks.find(wh => wh.owner?.id === executor!.id);
        
        if (newWebhook) {
          // Log the webhook details for monitoring
          logger.warn(`Suspicious webhook created by ${executor!.tag} (${executor!.id}) in ${channel.guild.name}: ${newWebhook.name} (${newWebhook.id})`);
          
          // Optionally, could delete suspicious webhooks automatically
          // await newWebhook.delete('Anti-Hack protection - suspicious webhook creation');
        }
      }
    } catch (error) {
      logger.error('Error in anti-hack webhook handler:', error);
    }
  });

  // Monitor token login attempts from unusual locations
  client.on(Events.ClientWarn, async (warning) => {
    // Check for login attempt warnings which may indicate token compromise
    if (warning.includes('Login attempt') && warning.includes('unusual location')) {
      logger.warn(`Potential token compromise detected: ${warning}`);
      
      // Here we could implement additional security measures like:
      // - Automatically regenerating the bot token
      // - Notifying the bot owner
      // - Temporarily reducing the bot's permissions as a precaution
    }
  });

  // Monitor changes to integration (often used in account takeovers)
  client.on(Events.GuildIntegrationsUpdate, async (guild) => {
    // Check if anti-hack is enabled for this server
    const settings = await storage.getSecuritySettings(guild.id);
    
    if (!settings || !settings.antiHack) {
      logger.debug(`Anti-Hack disabled for server ${guild.id}, ignoring integrations update`);
      return;
    }

    try {
      // Fetch the audit logs to find who updated integrations
      const auditLogs = await guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.IntegrationCreate,
      });

      const integrationLog = auditLogs.entries.first();
      if (!integrationLog) return;

      const { executor } = integrationLog;
      
      // Skip if the executor is a bot or the server owner
      if (executor?.bot || executor?.id === guild.ownerId) return;
      
      // Log this as potentially suspicious activity
      await storage.createSecurityLog({
        serverId: guild.id,
        eventType: 'anti-hack',
        action: 'Integration update',
        userId: executor!.id,
        details: `User updated server integrations`
      });
      
      // Notify in log channel if configured
      if (settings.logChannelId) {
        const logChannel = await guild.channels.fetch(settings.logChannelId);
        if (logChannel && logChannel.isTextBased()) {
          await logChannel.send({
            embeds: [{
              title: '⚠️ Integration Update Detected',
              description: `Server integrations were updated by <@${executor!.id}>. This is being logged for security monitoring.`,
              color: 0xFEE75C, // Yellow
              timestamp: new Date().toISOString()
            }]
          });
        }
      }
    } catch (error) {
      logger.error('Error in anti-hack integrations update handler:', error);
    }
  });
}

// Handle suspicious activity
async function handleSuspiciousActivity(guild: any, userId: string, reason: string) {
  logger.warn(`Anti-Hack triggered in server ${guild.id} - Suspicious activity by user ${userId}: ${reason}`);
  
  try {
    // Get security settings to determine action
    const settings = await storage.getSecuritySettings(guild.id);
    
    // Log the incident
    await storage.createSecurityLog({
      serverId: guild.id,
      eventType: 'anti-hack',
      action: 'Suspicious activity detected',
      userId,
      details: `Suspicious activity: ${reason}`
    });
    
    // Increment threats blocked counter
    const stats = await storage.getServerStats(guild.id);
    if (stats) {
      await storage.updateServerStats(guild.id, {
        ...stats,
        threatsBlocked: stats.threatsBlocked + 1
      });
    }
    
    // Get member
    const member = await guild.members.fetch(userId);
    
    // Only take action against non-admin members
    if (member && !member.permissions.has(PermissionFlagsBits.Administrator) && guild.ownerId !== userId) {
      // Remove dangerous permissions by removing roles
      await member.roles.set([]);
      
      // Send notification to log channel if configured
      if (settings && settings.logChannelId) {
        const logChannel = await guild.channels.fetch(settings.logChannelId);
        if (logChannel && logChannel.isTextBased()) {
          await logChannel.send({
            embeds: [{
              title: '🔒 Anti-Hack Protection Activated',
              description: `Suspicious activity detected and blocked`,
              color: 0xED4245, // Red
              fields: [
                { name: 'User', value: `<@${userId}> (${userId})` },
                { name: 'Reason', value: `${reason}` },
                { name: 'Action Taken', value: 'User roles removed to prevent potential damage' },
                { name: 'Time', value: new Date().toLocaleString() }
              ]
            }]
          });
        }
      }
    } else {
      // If it's an admin/owner, just log and notify
      if (settings && settings.logChannelId) {
        const logChannel = await guild.channels.fetch(settings.logChannelId);
        if (logChannel && logChannel.isTextBased()) {
          await logChannel.send({
            embeds: [{
              title: '⚠️ Admin Suspicious Activity',
              description: `Suspicious activity detected from an administrator or owner`,
              color: 0xFEE75C, // Yellow
              fields: [
                { name: 'User', value: `<@${userId}> (${userId})` },
                { name: 'Reason', value: `${reason}` },
                { name: 'Action Taken', value: 'None - user has admin privileges' },
                { name: 'Time', value: new Date().toLocaleString() }
              ]
            }]
          });
        }
      }
    }
  } catch (error) {
    logger.error(`Error handling suspicious activity by user ${userId} in server ${guild.id}:`, error);
  }
}
