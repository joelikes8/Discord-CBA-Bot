import { 
  SlashCommandBuilder, 
  CommandInteraction, 
  ChannelType, 
  EmbedBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ActionRowBuilder
} from 'discord.js';
import { hasPermission } from '../utils/permissions';
import { logger } from '../utils/logger';
import { storage } from '../../storage';

// /ticket command - creates a support ticket
export const ticketCommand = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Create a new support ticket')
    .addStringOption(option =>
      option.setName('issue')
        .setDescription('Brief description of your issue')
        .setRequired(true)),
  
  async execute(interaction: CommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    
    const issue = interaction.options.getString('issue');
    
    if (!issue) {
      return interaction.followUp({
        content: 'Please provide a description of your issue.',
        ephemeral: true
      });
    }
    
    try {
      // Get server settings
      const serverId = interaction.guildId;
      if (!serverId) {
        return interaction.followUp({
          content: 'This command can only be used in a server.',
          ephemeral: true
        });
      }
      
      // Create ticket channel
      const guild = interaction.guild;
      const ticketChannelName = `ticket-${interaction.user.username.toLowerCase()}-${Date.now().toString().slice(-4)}`;
      
      const ticketChannel = await guild?.channels.create({
        name: ticketChannelName,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          // Server default permissions
          {
            id: guild.id,
            deny: ['ViewChannel'],
          },
          // User who created the ticket
          {
            id: interaction.user.id,
            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
          },
          // Bot permissions
          {
            id: interaction.client.user.id,
            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
          },
          // Allow moderators/admins to see tickets
          {
            id: guild.roles.everyone.id,
            deny: ['ViewChannel'],
          }
        ],
      });
      
      if (!ticketChannel) {
        return interaction.followUp({
          content: 'Failed to create ticket channel. Please try again later.',
          ephemeral: true
        });
      }
      
      // Create welcome message in the ticket channel
      const ticketEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`Ticket: ${issue}`)
        .setDescription(`Thank you for creating a ticket. Our staff will assist you as soon as possible.`)
        .addFields(
          { name: 'Created By', value: `<@${interaction.user.id}>` },
          { name: 'Issue', value: issue }
        )
        .setTimestamp();
      
      const closeButton = new ButtonBuilder()
        .setCustomId('closeticket')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger);
      
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(closeButton);
      
      await ticketChannel.send({
        content: `<@${interaction.user.id}> has created a new ticket.`,
        embeds: [ticketEmbed],
        components: [row]
      });
      
      // Store ticket in the database
      await storage.createTicket({
        serverId,
        channelId: ticketChannel.id,
        userId: interaction.user.id,
        issue,
        status: 'open'
      });
      
      // Confirmation message to user
      await interaction.followUp({
        content: `Your ticket has been created in <#${ticketChannel.id}>`,
        ephemeral: true
      });
      
      logger.info(`User ${interaction.user.tag} created a ticket: ${issue}`);
    } catch (error) {
      logger.error('Error in ticket command:', error);
      await interaction.followUp({
        content: 'There was an error creating your ticket. Please try again later.',
        ephemeral: true
      });
    }
  }
};

// /closeticket command - closes a support ticket
export const closeTicketCommand = {
  data: new SlashCommandBuilder()
    .setName('closeticket')
    .setDescription('Close an existing support ticket')
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for closing the ticket')
        .setRequired(false)),
  
  async execute(interaction: CommandInteraction) {
    // Check if this is a ticket channel
    const ticket = await storage.getTicketByChannelId(interaction.channelId);
    
    if (!ticket) {
      return interaction.reply({
        content: 'This command can only be used in a ticket channel.',
        ephemeral: true
      });
    }
    
    // Check permissions: either ticket creator or staff can close
    const isTicketCreator = interaction.user.id === ticket.userId;
    const isStaff = hasPermission(interaction, 'MANAGE_CHANNELS');
    
    if (!isTicketCreator && !isStaff) {
      return interaction.reply({
        content: 'You do not have permission to close this ticket.',
        ephemeral: true
      });
    }
    
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    try {
      await interaction.deferReply();
      
      // Mark ticket as closed in database
      await storage.updateTicket(ticket.id, {
        status: 'closed',
        closedAt: new Date(),
        closedBy: interaction.user.id,
        closedReason: reason
      });
      
      // Send closure message
      const closureEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('Ticket Closed')
        .setDescription(`This ticket has been closed by <@${interaction.user.id}>`)
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'Ticket will be deleted in', value: '10 seconds' }
        )
        .setTimestamp();
      
      await interaction.followUp({ embeds: [closureEmbed] });
      
      // Delete the channel after delay
      setTimeout(async () => {
        try {
          if (interaction.channel) {
            await interaction.channel.delete();
          }
        } catch (error) {
          logger.error('Error deleting ticket channel:', error);
        }
      }, 10000);
      
      logger.info(`User ${interaction.user.tag} closed ticket #${ticket.id}: ${reason}`);
    } catch (error) {
      logger.error('Error in closeticket command:', error);
      await interaction.followUp({
        content: 'There was an error closing the ticket. Please try again later.'
      });
    }
  }
};

// /ticketpanel command - creates a panel for users to open tickets
export const ticketPanelCommand = {
  data: new SlashCommandBuilder()
    .setName('ticketpanel')
    .setDescription('Create a panel for users to open tickets')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to post the ticket panel in')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)),
  
  async execute(interaction: CommandInteraction) {
    // Check if user has permission
    if (!hasPermission(interaction, 'MANAGE_CHANNELS')) {
      return interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true
      });
    }
    
    const channel = interaction.options.getChannel('channel');
    
    if (!channel || !channel.isTextBased()) {
      return interaction.reply({
        content: 'Please provide a valid text channel.',
        ephemeral: true
      });
    }
    
    try {
      const ticketPanelEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('Support Tickets')
        .setDescription('Need help? Click the button below to create a support ticket.')
        .addFields(
          { name: 'How it works', value: 'A private channel will be created for you to discuss your issue with our staff.' },
          { name: 'Guidelines', value: 'Please provide a clear description of your issue when creating a ticket.' }
        );
      
      const ticketButton = new ButtonBuilder()
        .setCustomId('createticket')
        .setLabel('Create Ticket')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎫');
      
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(ticketButton);
      
      await channel.send({
        embeds: [ticketPanelEmbed],
        components: [row]
      });
      
      await interaction.reply({
        content: `Ticket panel created in <#${channel.id}>`,
        ephemeral: true
      });
      
      logger.info(`User ${interaction.user.tag} created a ticket panel in channel ${channel.name}`);
    } catch (error) {
      logger.error('Error in ticketpanel command:', error);
      await interaction.reply({
        content: 'There was an error creating the ticket panel. Please try again later.',
        ephemeral: true
      });
    }
  }
};
