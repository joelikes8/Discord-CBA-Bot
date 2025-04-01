import { SlashCommandBuilder, EmbedBuilder, CommandInteraction } from 'discord.js';
import { getRobloxUserByUsername, generateVerificationCode } from '../services/roblox';
import { hasPermission } from '../utils/permissions';
import { logger } from '../utils/logger';
import { storage } from '../../storage';

// /verify command - links Discord and Roblox accounts
export const verifyCommand = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Link your Discord account with your Roblox account')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Your Roblox username')
        .setRequired(true)),
  
  async execute(interaction: CommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    
    const username = interaction.options.getString('username');
    
    if (!username) {
      return interaction.followUp({ content: 'Please provide your Roblox username.', ephemeral: true });
    }
    
    try {
      // Check if user is already verified
      const existingVerification = await storage.getRobloxVerificationByDiscordId(interaction.user.id);
      if (existingVerification) {
        return interaction.followUp({
          content: `You are already verified as ${existingVerification.robloxUsername}. Use /reverify if you need to change your account.`,
          ephemeral: true
        });
      }
      
      // Get Roblox user
      const robloxUser = await getRobloxUserByUsername(username);
      
      if (!robloxUser) {
        return interaction.followUp({
          content: `Could not find a Roblox user with the username ${username}.`,
          ephemeral: true
        });
      }
      
      // Generate verification code and store pending verification
      const verificationCode = generateVerificationCode();
      
      await storage.createPendingVerification({
        discordUserId: interaction.user.id,
        verificationCode,
        serverId: interaction.guildId || '',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // Expires in 30 minutes
      });
      
      // Create verification instructions embed
      const verificationEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('Roblox Verification')
        .setDescription(`Please follow these steps to verify your Roblox account:`)
        .addFields(
          { name: 'Step 1:', value: 'Go to your Roblox profile' },
          { name: 'Step 2:', value: 'Update your "About Me" section to include this code:' },
          { name: 'Verification Code:', value: `\`${verificationCode}\`` },
          { name: 'Step 3:', value: 'Once updated, run the **/checkverify** command' }
        )
        .setFooter({ text: 'This code will expire in 30 minutes' });
      
      await interaction.followUp({ embeds: [verificationEmbed], ephemeral: true });
      
      logger.info(`User ${interaction.user.tag} initiated verification for Roblox account ${username}`);
    } catch (error) {
      logger.error('Error in verify command:', error);
      await interaction.followUp({
        content: 'There was an error processing your verification. Please try again later.',
        ephemeral: true
      });
    }
  }
};

// /reverify command - allows re-verification with a different Roblox account
export const reverifyCommand = {
  data: new SlashCommandBuilder()
    .setName('reverify')
    .setDescription('Re-link your Discord account with a different Roblox account')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Your new Roblox username')
        .setRequired(true)),
  
  async execute(interaction: CommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // First, remove existing verification
      await storage.removeRobloxVerification(interaction.user.id);
      
      // Then, execute the verification process
      const verifyInteraction = { ...interaction };
      await verifyCommand.execute(verifyInteraction);
    } catch (error) {
      logger.error('Error in reverify command:', error);
      await interaction.followUp({
        content: 'There was an error processing your re-verification. Please try again later.',
        ephemeral: true
      });
    }
  }
};

// /whois command - check who a Discord user is on Roblox
export const whoisCommand = {
  data: new SlashCommandBuilder()
    .setName('whois')
    .setDescription('Check the Roblox account linked to a Discord user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The Discord user to check')
        .setRequired(true)),
  
  async execute(interaction: CommandInteraction) {
    const user = interaction.options.getUser('user');
    
    if (!user) {
      return interaction.reply({ content: 'Please provide a valid Discord user.', ephemeral: true });
    }
    
    try {
      const verification = await storage.getRobloxVerificationByDiscordId(user.id);
      
      if (!verification) {
        return interaction.reply({
          content: `${user.tag} has not verified a Roblox account.`,
          ephemeral: true
        });
      }
      
      // Create embed with Roblox info
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('Roblox Verification Info')
        .setDescription(`Information about ${user.tag}'s linked Roblox account:`)
        .addFields(
          { name: 'Roblox Username', value: verification.robloxUsername },
          { name: 'Roblox User ID', value: verification.robloxUserId },
          { name: 'Verified On', value: new Date(verification.verifiedAt).toLocaleString() }
        )
        .setThumbnail(user.displayAvatarURL());
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Error in whois command:', error);
      await interaction.reply({
        content: 'There was an error fetching verification info. Please try again later.',
        ephemeral: true
      });
    }
  }
};
