import { Client, Events, AuditLogEvent, GuildBan, GuildMember, Collection, PermissionFlagsBits } from 'discord.js';
import { logger } from '../utils/logger';
import { storage } from '../../storage';

// Define thresholds for suspicious activity
const DELETION_THRESHOLD = 3; // Number of deletions within timeframe to trigger anti-nuke
const DELETION_TIMEFRAME = 10000; // Timeframe in milliseconds (10 seconds)
const BAN_THRESHOLD = 3; // Number of bans within timeframe to trigger anti-nuke
const BAN_TIMEFRAME = 10000; // Timeframe in milliseconds (10 seconds)

// Recent actions tracking
const recentChannelDeletions = new Map<string, { userId: string, timestamps: number[] }>();
const recentRoleDeletions = new Map<string, { userId: string, timestamps: number[] }>();
const recentBans = new Map<string, { userId: string, timestamps: number[] }>();

export function setupAntiNuke(client: Client) {
  logger.info('Setting up Anti-Nuke protection');

  // Monitor channel deletions
  client.on(Events.ChannelDelete, async (channel) => {
    // Skip if channel doesn't have a guild (DM channels)
    if (!channel.guild) return;
    
    // Check if anti-nuke is enabled for this server
    const serverId = channel.guild.id;
    const settings = await storage.getSecuritySettings(serverId);
    
    if (!settings || !settings.antiNuke) {
      logger.debug(`Anti-Nuke disabled for server ${serverId}, ignoring channel deletion`);
      return;
    }

    try {
      // Fetch the audit logs to find who deleted the channel
      const auditLogs = await channel.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ChannelDelete,
      });

      const deletionLog = auditLogs.entries.first();
      if (!deletionLog) return;

      const { executor } = deletionLog;
      
      // Skip if the executor is a bot or the server owner
      if (executor?.bot || executor?.id === channel.guild.ownerId) return;
      
      // If this executor has deleted channels before, add to their count
      if (!recentChannelDeletions.has(serverId)) {
        recentChannelDeletions.set(serverId, { userId: executor!.id, timestamps: [Date.now()] });
      } else {
        const record = recentChannelDeletions.get(serverId)!;
        
        // If this is a different user, reset the record
        if (record.userId !== executor!.id) {
          recentChannelDeletions.set(serverId, { userId: executor!.id, timestamps: [Date.now()] });
        } else {
          // Filter out old timestamps outside the timeframe
          const recentTimestamps = record.timestamps.filter(
            timestamp => Date.now() - timestamp < DELETION_TIMEFRAME
          );
          
          // Add the new timestamp
          recentTimestamps.push(Date.now());
          record.timestamps = recentTimestamps;
          
          // Check if threshold exceeded
          if (recentTimestamps.length >= DELETION_THRESHOLD) {
            await handleNukeAttempt(channel.guild, executor!.id, 'mass_channel_deletion');
          }
        }
      }
    } catch (error) {
      logger.error('Error in anti-nuke channel deletion handler:', error);
    }
  });
  
  // Monitor role deletions
  client.on(Events.GuildRoleDelete, async (role) => {
    // Check if anti-nuke is enabled for this server
    const serverId = role.guild.id;
    const settings = await storage.getSecuritySettings(serverId);
    
    if (!settings || !settings.antiNuke) {
      logger.debug(`Anti-Nuke disabled for server ${serverId}, ignoring role deletion`);
      return;
    }

    try {
      // Fetch the audit logs to find who deleted the role
      const auditLogs = await role.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.RoleDelete,
      });

      const deletionLog = auditLogs.entries.first();
      if (!deletionLog) return;

      const { executor } = deletionLog;
      
      // Skip if the executor is a bot or the server owner
      if (executor?.bot || executor?.id === role.guild.ownerId) return;
      
      // If this executor has deleted roles before, add to their count
      if (!recentRoleDeletions.has(serverId)) {
        recentRoleDeletions.set(serverId, { userId: executor!.id, timestamps: [Date.now()] });
      } else {
        const record = recentRoleDeletions.get(serverId)!;
        
        // If this is a different user, reset the record
        if (record.userId !== executor!.id) {
          recentRoleDeletions.set(serverId, { userId: executor!.id, timestamps: [Date.now()] });
        } else {
          // Filter out old timestamps outside the timeframe
          const recentTimestamps = record.timestamps.filter(
            timestamp => Date.now() - timestamp < DELETION_TIMEFRAME
          );
          
          // Add the new timestamp
          recentTimestamps.push(Date.now());
          record.timestamps = recentTimestamps;
          
          // Check if threshold exceeded
          if (recentTimestamps.length >= DELETION_THRESHOLD) {
            await handleNukeAttempt(role.guild, executor!.id, 'mass_role_deletion');
          }
        }
      }
    } catch (error) {
      logger.error('Error in anti-nuke role deletion handler:', error);
    }
  });
  
  // Monitor member bans
  client.on(Events.GuildBanAdd, async (ban) => {
    // Check if anti-nuke is enabled for this server
    const serverId = ban.guild.id;
    const settings = await storage.getSecuritySettings(serverId);
    
    if (!settings || !settings.antiNuke) {
      logger.debug(`Anti-Nuke disabled for server ${serverId}, ignoring ban`);
      return;
    }

    try {
      // Fetch the audit logs to find who banned the user
      const auditLogs = await ban.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberBanAdd,
      });

      const banLog = auditLogs.entries.first();
      if (!banLog) return;

      const { executor } = banLog;
      
      // Skip if the executor is a bot or the server owner
      if (executor?.bot || executor?.id === ban.guild.ownerId) return;
      
      // If this executor has banned members before, add to their count
      if (!recentBans.has(serverId)) {
        recentBans.set(serverId, { userId: executor!.id, timestamps: [Date.now()] });
      } else {
        const record = recentBans.get(serverId)!;
        
        // If this is a different user, reset the record
        if (record.userId !== executor!.id) {
          recentBans.set(serverId, { userId: executor!.id, timestamps: [Date.now()] });
        } else {
          // Filter out old timestamps outside the timeframe
          const recentTimestamps = record.timestamps.filter(
            timestamp => Date.now() - timestamp < BAN_TIMEFRAME
          );
          
          // Add the new timestamp
          recentTimestamps.push(Date.now());
          record.timestamps = recentTimestamps;
          
          // Check if threshold exceeded
          if (recentTimestamps.length >= BAN_THRESHOLD) {
            await handleNukeAttempt(ban.guild, executor!.id, 'mass_ban');
          }
        }
      }
    } catch (error) {
      logger.error('Error in anti-nuke ban handler:', error);
    }
  });
}

// Handle a detected nuke attempt
async function handleNukeAttempt(guild: any, userId: string, reason: string) {
  logger.warn(`Anti-Nuke triggered in server ${guild.id} - Nuke attempt by user ${userId}: ${reason}`);
  
  try {
    // Get member to take action against
    const member = await guild.members.fetch(userId);
    
    if (member) {
      // Only take action if the member doesn't have ADMINISTRATOR permission and isn't the owner
      const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
      const isOwner = guild.ownerId === userId;
      
      if (!isAdmin && !isOwner) {
        // Remove all roles from the user to prevent further damage
        await member.roles.set([]);
        
        // Option: Ban the user
        await guild.members.ban(userId, {
          reason: `[SECURITY] Auto-ban: Anti-Nuke triggered (${reason})`,
          deleteMessageSeconds: 7 * 24 * 60 * 60 // Delete messages from the last 7 days
        });
        
        // Log to security logs
        await storage.createSecurityLog({
          serverId: guild.id,
          eventType: 'anti-nuke',
          action: 'Auto-ban',
          userId,
          details: `User banned for nuke attempt: ${reason}`
        });
        
        // Increment threats blocked counter
        const stats = await storage.getServerStats(guild.id);
        if (stats) {
          await storage.updateServerStats(guild.id, {
            ...stats,
            threatsBlocked: stats.threatsBlocked + 1
          });
        }
        
        // Send notification to log channel if configured
        const settings = await storage.getSecuritySettings(guild.id);
        if (settings && settings.logChannelId) {
          const logChannel = await guild.channels.fetch(settings.logChannelId);
          if (logChannel) {
            await logChannel.send({
              embeds: [{
                title: '🛑 Anti-Nuke Protection Activated',
                description: `Suspicious activity detected and blocked`,
                color: 0xED4245, // Red
                fields: [
                  { name: 'User', value: `<@${userId}> (${userId})` },
                  { name: 'Reason', value: `${reason}` },
                  { name: 'Action Taken', value: 'User banned and incident logged' },
                  { name: 'Time', value: new Date().toLocaleString() }
                ]
              }]
            });
          }
        }
      } else {
        logger.warn(`Anti-Nuke triggered by admin/owner ${userId} in server ${guild.id}, no action taken`);
        
        // Still log the incident
        await storage.createSecurityLog({
          serverId: guild.id,
          eventType: 'anti-nuke',
          action: 'Warning only',
          userId,
          details: `Admin/Owner triggered anti-nuke: ${reason}, no action taken`
        });
      }
    }
  } catch (error) {
    logger.error(`Error handling nuke attempt by user ${userId} in server ${guild.id}:`, error);
  }
}
