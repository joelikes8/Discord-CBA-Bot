import { SlashCommandBuilder, EmbedBuilder, CommandInteraction, GuildMember, PermissionFlagsBits, ChatInputCommandInteraction } from 'discord.js';
import { getRobloxUserByUsername, generateVerificationCode, verifyRobloxUser, getUserGroupRole } from '../services/roblox';
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
  
  async execute(interaction: ChatInputCommandInteraction) {
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
      
      // Store temporary data in the pendingVerification
      await storage.createPendingVerification({
        discordUserId: interaction.user.id,
        verificationCode,
        serverId: interaction.guildId || '',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // Expires in 30 minutes
        pendingRobloxUsername: robloxUser.username,
        pendingRobloxUserId: robloxUser.id.toString()
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
  
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // First, remove existing verification
      await storage.removeRobloxVerification(interaction.user.id);
      
      // Then, execute the verification process
      await verifyCommand.execute(interaction);
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
  
  async execute(interaction: ChatInputCommandInteraction) {
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

// /checkverify command - completes the verification process by checking the profile
export const checkVerifyCommand = {
  data: new SlashCommandBuilder()
    .setName('checkverify')
    .setDescription('Complete your Roblox verification process'),
  
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Check for pending verification
      const pendingVerification = await storage.getPendingVerificationByDiscordId(interaction.user.id);
      
      if (!pendingVerification) {
        return interaction.followUp({
          content: 'You do not have a pending verification. Please use /verify first.',
          ephemeral: true
        });
      }
      
      // Check if verification has expired
      if (new Date() > new Date(pendingVerification.expiresAt)) {
        await storage.removePendingVerification(pendingVerification.id);
        return interaction.followUp({
          content: 'Your verification has expired. Please start again with /verify.',
          ephemeral: true
        });
      }
      
      // Get Roblox username from the verification code
      // We'll need to find the right Roblox user
      // First, check if they're already verified and trying again
      const existingVerification = await storage.getRobloxVerificationByDiscordId(interaction.user.id);
      let robloxUserId = 0;
      let robloxUsername = '';
      
      if (existingVerification) {
        // Use existing info
        robloxUserId = parseInt(existingVerification.robloxUserId);
        robloxUsername = existingVerification.robloxUsername;
      } else if (pendingVerification.pendingRobloxUsername && pendingVerification.pendingRobloxUserId) {
        // Use the Roblox info stored with the pending verification
        robloxUserId = parseInt(pendingVerification.pendingRobloxUserId);
        robloxUsername = pendingVerification.pendingRobloxUsername;
      } else {
        // We don't have enough information to proceed
        return interaction.followUp({
          content: 'Could not determine which Roblox account you are verifying. Please run /verify again with your Roblox username.',
          ephemeral: true
        });
      }
      
      // Verify the code is in their profile
      const isVerified = await verifyRobloxUser(robloxUserId, pendingVerification.verificationCode);
      
      if (!isVerified) {
        return interaction.followUp({
          content: 'Verification failed. Please make sure you added the verification code to your Roblox profile "About Me" section, and try again.',
          ephemeral: true
        });
      }
      
      // Get group role if available
      const groupRole = await getUserGroupRole(robloxUserId);
      
      // Create verification record
      await storage.createRobloxVerification({
        discordUserId: interaction.user.id,
        robloxUserId: robloxUserId.toString(),
        robloxUsername,
        serverId: interaction.guildId || '',
      });
      
      // Clean up pending verification
      await storage.removePendingVerification(pendingVerification.id);
      
      // Log the successful verification
      logger.info(`User ${interaction.user.tag} verified as Roblox user ${robloxUsername} (${robloxUserId})`);
      
      // Create security log entry
      await storage.createSecurityLog({
        serverId: interaction.guildId || '',
        eventType: 'verification',
        action: 'success',
        userId: interaction.user.id,
        details: `Verified as Roblox user ${robloxUsername} (${robloxUserId})`
      });
      
      // Update nickname and assign verified role if available
      try {
        if (interaction.guild && interaction.member) {
          const member = interaction.member as GuildMember;
          
          // First, try to get server's security settings to find the verified role ID
          const securitySettings = await storage.getSecuritySettings(interaction.guildId || '');
          
          // Only update if the bot has permission to manage nicknames
          if (interaction.guild.members.me?.permissions.has(PermissionFlagsBits.ManageNicknames)) {
            const baseNickname = member.displayName.includes('[') 
              ? member.displayName.split('[')[0].trim() 
              : member.displayName;
            
            let newNickname = `${baseNickname} [${robloxUsername}`;
            
            // Add group rank if available
            if (groupRole) {
              newNickname += ` | ${groupRole.name}`;
            }
            
            newNickname += ']';
            
            // Make sure nickname isn't too long (Discord limit is 32 characters)
            if (newNickname.length > 32) {
              newNickname = newNickname.substring(0, 29) + '...]';
            }
            
            await member.setNickname(newNickname);
            logger.info(`Updated nickname for ${interaction.user.tag} to ${newNickname}`);
          }
          
          // Assign verified role if it's configured and bot has permission
          if (securitySettings?.verifiedRoleId && 
              interaction.guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
            try {
              // Get the role by ID
              const verifiedRole = interaction.guild.roles.cache.get(securitySettings.verifiedRoleId);
              
              if (verifiedRole) {
                await member.roles.add(verifiedRole);
                logger.info(`Assigned verified role to ${interaction.user.tag}`);
              } else {
                logger.warn(`Verified role with ID ${securitySettings.verifiedRoleId} not found in server`);
              }
            } catch (roleError) {
              logger.error('Error assigning verified role:', roleError);
            }
          }
        }
      } catch (error) {
        logger.error('Error updating nickname or assigning role:', error);
        // We'll continue even if nickname/role update fails
      }
      
      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('Verification Successful!')
        .setDescription(`You have been verified as ${robloxUsername}`)
        .addFields(
          { name: 'Roblox User ID', value: robloxUserId.toString() }
        );
      
      // Add group role if available
      if (groupRole) {
        successEmbed.addFields(
          { name: 'Group Rank', value: groupRole.name }
        );
      }
      
      await interaction.followUp({ embeds: [successEmbed], ephemeral: true });
    } catch (error) {
      logger.error('Error in checkverify command:', error);
      await interaction.followUp({
        content: 'There was an error processing your verification. Please try again later.',
        ephemeral: true
      });
    }
  }
};
