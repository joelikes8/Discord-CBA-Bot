import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { getRobloxUserByUsername, getRobloxGroupRanks, promoteUserInGroup } from '../services/roblox';
import { hasPermission } from '../utils/permissions';
import { logger } from '../utils/logger';
import { storage } from '../../storage';

// /promote command - promotes a Roblox user to a specific rank in the Roblox group
export const promoteCommand = {
  data: new SlashCommandBuilder()
    .setName('promote')
    .setDescription('Promote a Roblox user to a specific rank in the group')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('The Roblox username to promote')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('rank')
        .setDescription('The rank to promote to')
        .setRequired(true)),
  
  async execute(interaction: CommandInteraction) {
    // Check if user has permission to promote users
    if (!hasPermission(interaction, 'MANAGE_ROLES')) {
      return interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true
      });
    }
    
    await interaction.deferReply();
    
    const username = interaction.options.getString('username');
    const rankName = interaction.options.getString('rank');
    
    if (!username || !rankName) {
      return interaction.followUp({
        content: 'Please provide both a Roblox username and a rank.',
      });
    }
    
    try {
      // Get Roblox user
      const robloxUser = await getRobloxUserByUsername(username);
      
      if (!robloxUser) {
        return interaction.followUp({
          content: `Could not find a Roblox user with the username ${username}.`,
        });
      }
      
      // Get available ranks in the group
      const availableRanks = await getRobloxGroupRanks();
      const targetRank = availableRanks.find(rank => 
        rank.name.toLowerCase() === rankName.toLowerCase()
      );
      
      if (!targetRank) {
        return interaction.followUp({
          content: `Invalid rank: ${rankName}. Available ranks: ${availableRanks.map(r => r.name).join(', ')}`,
        });
      }
      
      // Promote user
      const result = await promoteUserInGroup(robloxUser.id, targetRank.id);
      
      if (result.success) {
        await interaction.followUp({
          content: `Successfully promoted ${username} to ${targetRank.name} in the group.`,
        });
        
        // Log the promotion
        logger.info(`User ${interaction.user.tag} promoted Roblox user ${username} to rank ${targetRank.name}`);
        
        // Record the action in security logs
        await storage.createSecurityLog({
          serverId: interaction.guildId || '',
          eventType: 'promotion',
          action: 'User promotion',
          userId: interaction.user.id,
          details: `Promoted Roblox user ${username} to rank ${targetRank.name}`
        });
      } else {
        await interaction.followUp({
          content: `Failed to promote ${username}: ${result.error}`,
        });
      }
    } catch (error) {
      logger.error('Error in promote command:', error);
      await interaction.followUp({
        content: 'There was an error processing the promotion. Please try again later.',
      });
    }
  }
};
