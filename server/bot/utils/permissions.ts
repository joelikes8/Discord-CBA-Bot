import { CommandInteraction, PermissionFlagsBits, GuildMember } from 'discord.js';
import { logger } from './logger';

// Type for Discord permission names
type PermissionName = 
  | 'ADMINISTRATOR'
  | 'MANAGE_GUILD'
  | 'MANAGE_ROLES'
  | 'MANAGE_CHANNELS'
  | 'KICK_MEMBERS'
  | 'BAN_MEMBERS'
  | 'MODERATE_MEMBERS'
  | 'MANAGE_MESSAGES'
  | 'MANAGE_WEBHOOKS'
  | 'MANAGE_THREADS'
  | 'MANAGE_EVENTS'
  | 'MANAGE_NICKNAMES'
  | 'MANAGE_EMOJIS_AND_STICKERS';

// Map permission names to PermissionFlagsBits values
const permissionMap: Record<PermissionName, bigint> = {
  'ADMINISTRATOR': PermissionFlagsBits.Administrator,
  'MANAGE_GUILD': PermissionFlagsBits.ManageGuild,
  'MANAGE_ROLES': PermissionFlagsBits.ManageRoles,
  'MANAGE_CHANNELS': PermissionFlagsBits.ManageChannels,
  'KICK_MEMBERS': PermissionFlagsBits.KickMembers,
  'BAN_MEMBERS': PermissionFlagsBits.BanMembers,
  'MODERATE_MEMBERS': PermissionFlagsBits.ModerateMembers,
  'MANAGE_MESSAGES': PermissionFlagsBits.ManageMessages,
  'MANAGE_WEBHOOKS': PermissionFlagsBits.ManageWebhooks,
  'MANAGE_THREADS': PermissionFlagsBits.ManageThreads,
  'MANAGE_EVENTS': PermissionFlagsBits.ManageEvents,
  'MANAGE_NICKNAMES': PermissionFlagsBits.ManageNicknames,
  'MANAGE_EMOJIS_AND_STICKERS': PermissionFlagsBits.ManageEmojisAndStickers
};

/**
 * Check if a user has a specific permission
 * @param interaction The command interaction
 * @param permission The permission to check
 * @returns Boolean indicating if the user has the permission
 */
export function hasPermission(interaction: CommandInteraction, permission: PermissionName): boolean {
  try {
    // Get the GuildMember who initiated the interaction
    const member = interaction.member as GuildMember;
    
    if (!member) {
      logger.warn(`hasPermission: No member associated with interaction from ${interaction.user.tag}`);
      return false;
    }
    
    // Admin always has all permissions
    if (member.permissions.has(PermissionFlagsBits.Administrator)) {
      return true;
    }
    
    // Server owner always has all permissions
    if (interaction.guild?.ownerId === member.id) {
      return true;
    }
    
    // Check the specific permission
    const permissionFlag = permissionMap[permission];
    if (!permissionFlag) {
      logger.warn(`hasPermission: Unknown permission "${permission}"`);
      return false;
    }
    
    return member.permissions.has(permissionFlag);
  } catch (error) {
    logger.error(`Error checking permission ${permission}:`, error);
    return false;
  }
}

/**
 * Check if a user has the Bot Manager role or appropriate permissions
 * @param interaction The command interaction
 * @returns Boolean indicating if the user can manage the bot
 */
export function isBotManager(interaction: CommandInteraction): boolean {
  try {
    // Get the GuildMember who initiated the interaction
    const member = interaction.member as GuildMember;
    
    if (!member) {
      return false;
    }
    
    // Admin or server owner can always manage the bot
    if (
      member.permissions.has(PermissionFlagsBits.Administrator) ||
      interaction.guild?.ownerId === member.id
    ) {
      return true;
    }
    
    // Check for a Bot Manager role
    const hasBotManagerRole = member.roles.cache.some(role => 
      role.name.toLowerCase().includes('bot manager') || 
      role.name.toLowerCase().includes('bot admin')
    );
    
    if (hasBotManagerRole) {
      return true;
    }
    
    // Check for relevant permissions
    const hasRelevantPermissions = member.permissions.has([
      PermissionFlagsBits.ManageGuild,
      PermissionFlagsBits.ManageRoles
    ]);
    
    return hasRelevantPermissions;
  } catch (error) {
    logger.error('Error checking bot manager status:', error);
    return false;
  }
}

/**
 * Check if a member is a moderator (has moderation permissions)
 * @param member The guild member to check
 * @returns Boolean indicating if the member is a moderator
 */
export function isModerator(member: GuildMember): boolean {
  try {
    // Admin or server owner are always moderators
    if (
      member.permissions.has(PermissionFlagsBits.Administrator) ||
      member.guild.ownerId === member.id
    ) {
      return true;
    }
    
    // Check for a moderator role
    const hasModRole = member.roles.cache.some(role => 
      role.name.toLowerCase().includes('mod') || 
      role.name.toLowerCase().includes('moderator') ||
      role.name.toLowerCase().includes('admin')
    );
    
    if (hasModRole) {
      return true;
    }
    
    // Check for moderation permissions
    const hasModPermissions = member.permissions.has([
      PermissionFlagsBits.ModerateMembers,
      PermissionFlagsBits.KickMembers,
      PermissionFlagsBits.BanMembers,
      PermissionFlagsBits.ManageMessages
    ]);
    
    return hasModPermissions;
  } catch (error) {
    logger.error('Error checking moderator status:', error);
    return false;
  }
}
