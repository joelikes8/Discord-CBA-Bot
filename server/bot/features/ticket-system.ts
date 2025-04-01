import { 
  Client, 
  Events, 
  ButtonInteraction, 
  ChannelType, 
  TextChannel, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  PermissionFlagsBits 
} from 'discord.js';
import { logger } from '../utils/logger';
import { storage } from '../../storage';

export function setupTicketSystem(client: Client) {
  logger.info('Setting up Ticket System');

  // Handle button interactions for tickets
  client.on(Events.InteractionCreate, async (interaction) => {
    // Only handle button interactions
    if (!interaction.isButton()) return;
    
    // Handle ticket panel button
    if (interaction.customId === 'createticket') {
      await handleCreateTicket(interaction);
    }
    
    // Handle close ticket button
    if (interaction.customId === 'closeticket') {
      await handleCloseTicket(interaction);
    }
  });
}

// Handle ticket creation from button
async function handleCreateTicket(interaction: ButtonInteraction) {
  await interaction.deferReply({ ephemeral: true });
  
  try {
    const { guild, user } = interaction;
    
    if (!guild) {
      return interaction.followUp({
        content: 'This command can only be used in a server.',
        ephemeral: true
      });
    }
    
    // Check if user already has an open ticket
    const existingTicket = await storage.getTicketByUser(guild.id, user.id);
    
    if (existingTicket && existingTicket.status === 'open') {
      return interaction.followUp({
        content: `You already have an open ticket in <#${existingTicket.channelId}>`,
        ephemeral: true
      });
    }
    
    // Create ticket channel
    const ticketChannelName = `ticket-${user.username.toLowerCase()}-${Date.now().toString().slice(-4)}`;
    
    const ticketChannel = await guild.channels.create({
      name: ticketChannelName,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        // Server default permissions
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        // User who created the ticket
        {
          id: user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
        // Bot permissions
        {
          id: client.user!.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
        // Allow moderators to see tickets (you could add specific role IDs here)
      ],
    });
    
    // Create an embed for the ticket
    const ticketEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('Support Ticket')
      .setDescription(`Thank you for creating a ticket. Our staff will assist you as soon as possible.`)
      .addFields(
        { name: 'Created By', value: `<@${user.id}>` },
        { name: 'Ticket ID', value: ticketChannelName }
      )
      .setTimestamp();
    
    // Create close button
    const closeButton = new ButtonBuilder()
      .setCustomId('closeticket')
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger);
    
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(closeButton);
    
    // Send the welcome message in the ticket channel
    await ticketChannel.send({
      content: `<@${user.id}> has created a new ticket.`,
      embeds: [ticketEmbed],
      components: [row]
    });
    
    // Store ticket in the database
    await storage.createTicket({
      serverId: guild.id,
      channelId: ticketChannel.id,
      userId: user.id,
      issue: 'Support Request', // Default issue
      status: 'open'
    });
    
    // Notify user
    await interaction.followUp({
      content: `Your ticket has been created in <#${ticketChannel.id}>`,
      ephemeral: true
    });
    
    logger.info(`User ${user.tag} created a ticket in server ${guild.name}`);
    
    // Update server stats
    const stats = await storage.getServerStats(guild.id);
    if (stats) {
      await storage.updateServerStats(guild.id, {
        ...stats,
        openTickets: stats.openTickets + 1
      });
    }
  } catch (error) {
    logger.error('Error in createticket handler:', error);
    await interaction.followUp({
      content: 'There was an error creating your ticket. Please try again later.',
      ephemeral: true
    });
  }
}

// Handle closing a ticket
async function handleCloseTicket(interaction: ButtonInteraction) {
  await interaction.deferReply();
  
  try {
    const { guild, channel, user } = interaction;
    
    if (!guild || !channel) {
      return interaction.followUp({
        content: 'This command can only be used in a server channel.',
      });
    }
    
    // Verify this is a ticket channel
    const ticket = await storage.getTicketByChannelId(channel.id);
    
    if (!ticket) {
      return interaction.followUp({
        content: 'This channel is not a ticket channel.',
      });
    }
    
    // Check if user is allowed to close the ticket
    const isTicketCreator = user.id === ticket.userId;
    const isStaff = interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels);
    
    if (!isTicketCreator && !isStaff) {
      return interaction.followUp({
        content: 'You do not have permission to close this ticket.',
      });
    }
    
    // Mark the ticket as closed in the database
    await storage.updateTicket(ticket.id, {
      status: 'closed',
      closedAt: new Date(),
      closedBy: user.id,
      closedReason: 'Closed via button'
    });
    
    // Create closure notification
    const closedEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('Ticket Closed')
      .setDescription(`This ticket has been closed by <@${user.id}>`)
      .addFields(
        { name: 'Ticket', value: channel.name },
        { name: 'Note', value: 'This channel will be deleted in 10 seconds.' }
      )
      .setTimestamp();
    
    await interaction.followUp({
      embeds: [closedEmbed]
    });
    
    // Update server stats
    const stats = await storage.getServerStats(guild.id);
    if (stats) {
      await storage.updateServerStats(guild.id, {
        ...stats,
        openTickets: Math.max(0, stats.openTickets - 1)
      });
    }
    
    logger.info(`Ticket ${channel.name} closed by ${user.tag} in server ${guild.name}`);
    
    // Delete the channel after a delay
    setTimeout(async () => {
      try {
        await channel.delete();
      } catch (error) {
        logger.error(`Error deleting ticket channel ${channel.id}:`, error);
      }
    }, 10000);
  } catch (error) {
    logger.error('Error in closeticket handler:', error);
    await interaction.followUp({
      content: 'There was an error closing the ticket. Please try again later.',
    });
  }
}
