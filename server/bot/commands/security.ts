import { SlashCommandBuilder, CommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { hasPermission } from '../utils/permissions';
import { logger } from '../utils/logger';
import { storage } from '../../storage';

// /securitystats command - shows current security status and recent threats
export const securityStatsCommand = {
  data: new SlashCommandBuilder()
    .setName('securitystats')
    .setDescription('Shows current security status and recent threats'),
  
  async execute(interaction: CommandInteraction) {
    await interaction.deferReply();
    
    try {
      // Get server ID
      const serverId = interaction.guildId;
      if (!serverId) {
        return interaction.followUp({
          content: 'This command can only be used in a server.',
        });
      }
      
      // Get security settings
      const settings = await storage.getSecuritySettings(serverId);
      
      if (!settings) {
        return interaction.followUp({
          content: 'Security settings not found for this server.',
        });
      }
      
      // Get server stats
      const stats = await storage.getServerStats(serverId);
      
      // Get recent logs (last 5)
      const recentLogs = await storage.getRecentSecurityLogs(serverId, 5);
      
      // Create security stats embed
      const statsEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('Security Statistics')
        .setDescription('Current security status and protection features')
        .addFields(
          { name: 'Security Score', value: `${stats?.securityScore || 0}/100`, inline: true },
          { name: 'Threats Blocked', value: `${stats?.threatsBlocked || 0}`, inline: true },
          { name: 'Verified Members', value: `${stats?.verifiedMembers || 0}/${stats?.totalMembers || 0}`, inline: true },
          { name: 'Protection Features', value: 
            `Anti-Nuke: ${settings.antiNuke ? '✅' : '❌'}\n` +
            `Anti-Hack: ${settings.antiHack ? '✅' : '❌'}\n` +
            `Anti-Raid: ${settings.antiRaid ? '✅' : '❌'}\n` +
            `Website Filter: ${settings.websiteFilter ? '✅' : '❌'}`
          }
        )
        .setTimestamp();
      
      // If we have recent logs, add them to the embed
      if (recentLogs && recentLogs.length > 0) {
        const logsField = recentLogs.map(log => 
          `• ${new Date(log.timestamp).toLocaleString()}: ${log.action} (${log.eventType})`
        ).join('\n');
        
        statsEmbed.addFields({ name: 'Recent Security Events', value: logsField });
      } else {
        statsEmbed.addFields({ name: 'Recent Security Events', value: 'No recent security events.' });
      }
      
      await interaction.followUp({ embeds: [statsEmbed] });
      
      logger.info(`User ${interaction.user.tag} checked security stats`);
    } catch (error) {
      logger.error('Error in securitystats command:', error);
      await interaction.followUp({
        content: 'There was an error fetching security statistics. Please try again later.',
      });
    }
  }
};

// /lockdown command - temporarily restricts server access during security incidents
export const lockdownCommand = {
  data: new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Temporarily restricts server access during security incidents')
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the lockdown')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Duration in minutes (default: 10)')
        .setRequired(false)),
  
  async execute(interaction: CommandInteraction) {
    // Check if user has permission to use this command
    if (!hasPermission(interaction, 'MANAGE_GUILD')) {
      return interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true
      });
    }
    
    await interaction.deferReply();
    
    const reason = interaction.options.getString('reason');
    const duration = interaction.options.getInteger('duration') || 10; // default 10 minutes
    
    if (!reason) {
      return interaction.followUp({
        content: 'Please provide a reason for the lockdown.',
      });
    }
    
    try {
      const guild = interaction.guild;
      
      if (!guild) {
        return interaction.followUp({
          content: 'This command can only be used in a server.',
        });
      }
      
      // Start lockdown - modify permissions for all channels
      // We'll only change @everyone permission for text channels
      const textChannels = guild.channels.cache.filter(channel => 
        channel.isTextBased() && !channel.isThread()
      );
      
      let lockedChannels = 0;
      
      for (const [_, channel] of textChannels) {
        try {
          // Save current permissions for restoration later
          const currentPerms = channel.permissionOverwrites.cache.get(guild.id);
          
          // Set new permissions to deny @everyone from sending messages
          await channel.permissionOverwrites.edit(guild.id, {
            SendMessages: false
          });
          
          lockedChannels++;
        } catch (err) {
          logger.error(`Failed to lock channel ${channel.id}:`, err);
        }
      }
      
      // Announce lockdown in the current channel
      const lockdownEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('🔒 SERVER LOCKDOWN ACTIVE')
        .setDescription(`This server is now in lockdown mode.`)
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'Duration', value: `${duration} minutes` },
          { name: 'Locked Channels', value: `${lockedChannels}` },
          { name: 'Initiated By', value: `<@${interaction.user.id}>` }
        )
        .setTimestamp();
      
      await interaction.followUp({ embeds: [lockdownEmbed] });
      
      // Log the lockdown
      logger.info(`User ${interaction.user.tag} initiated server lockdown: ${reason} (${duration} minutes)`);
      
      // Record the action in security logs
      await storage.createSecurityLog({
        serverId: interaction.guildId || '',
        eventType: 'lockdown',
        action: 'Server lockdown',
        userId: interaction.user.id,
        details: `Reason: ${reason}, Duration: ${duration} minutes`
      });
      
      // Set timer to end lockdown
      setTimeout(async () => {
        try {
          // Unlock all channels
          for (const [_, channel] of textChannels) {
            try {
              // Remove the send messages restriction
              await channel.permissionOverwrites.edit(guild.id, {
                SendMessages: null
              });
            } catch (err) {
              logger.error(`Failed to unlock channel ${channel.id}:`, err);
            }
          }
          
          // Announce end of lockdown
          const unlockEmbed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('🔓 SERVER LOCKDOWN ENDED')
            .setDescription(`The server lockdown has ended.`)
            .addFields(
              { name: 'Duration', value: `${duration} minutes` },
              { name: 'Unlocked Channels', value: `${lockedChannels}` }
            )
            .setTimestamp();
          
          await interaction.followUp({ embeds: [unlockEmbed] });
          
          // Log the lockdown end
          logger.info(`Server lockdown ended after ${duration} minutes`);
          
          // Record the action in security logs
          await storage.createSecurityLog({
            serverId: interaction.guildId || '',
            eventType: 'lockdown',
            action: 'Server lockdown ended',
            userId: interaction.client.user?.id || '',
            details: `Automatic unlock after ${duration} minutes`
          });
        } catch (error) {
          logger.error('Error ending lockdown:', error);
        }
      }, duration * 60 * 1000);
      
    } catch (error) {
      logger.error('Error in lockdown command:', error);
      await interaction.followUp({
        content: 'There was an error initiating the lockdown. Please try again later.',
      });
    }
  }
};

// /allowsite command - adds a website to the allowed URLs list
export const allowSiteCommand = {
  data: new SlashCommandBuilder()
    .setName('allowsite')
    .setDescription('Adds a website to the allowed URLs list (Admin only)')
    .addStringOption(option =>
      option.setName('url')
        .setDescription('Domain to allow (e.g., example.com)')
        .setRequired(true)),
  
  async execute(interaction: CommandInteraction) {
    // Check if user has permission to use this command
    if (!hasPermission(interaction, 'ADMINISTRATOR')) {
      return interaction.reply({
        content: 'You do not have administrator permission to use this command.',
        ephemeral: true
      });
    }
    
    const url = interaction.options.getString('url');
    
    if (!url) {
      return interaction.reply({
        content: 'Please provide a valid domain.',
        ephemeral: true
      });
    }
    
    // Clean the URL by removing protocol and path
    let domain = url.toLowerCase().trim();
    domain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    
    try {
      const serverId = interaction.guildId;
      if (!serverId) {
        return interaction.reply({
          content: 'This command can only be used in a server.',
          ephemeral: true
        });
      }
      
      // Get current settings
      const settings = await storage.getSecuritySettings(serverId);
      
      if (!settings) {
        return interaction.reply({
          content: 'Security settings not found for this server.',
          ephemeral: true
        });
      }
      
      // Check if domain is already allowed
      if (settings.allowedDomains.includes(domain)) {
        return interaction.reply({
          content: `The domain ${domain} is already in the allowed list.`,
          ephemeral: true
        });
      }
      
      // Add domain to allowed list
      settings.allowedDomains.push(domain);
      
      // Update settings
      await storage.updateSecuritySettings(serverId, {
        ...settings,
        allowedDomains: settings.allowedDomains
      });
      
      await interaction.reply({
        content: `Added ${domain} to the allowed domains list.`,
        ephemeral: true
      });
      
      // Log the action
      logger.info(`User ${interaction.user.tag} added ${domain} to allowed domains list`);
      
      // Record the action in security logs
      await storage.createSecurityLog({
        serverId,
        eventType: 'websiteFilter',
        action: 'Domain whitelisted',
        userId: interaction.user.id,
        details: `Added ${domain} to allowed domains list`
      });
    } catch (error) {
      logger.error('Error in allowsite command:', error);
      await interaction.reply({
        content: 'There was an error adding the domain to the allowed list. Please try again later.',
        ephemeral: true
      });
    }
  }
};
