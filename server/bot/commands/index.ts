import { Client, REST, Routes, Collection, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { verifyCommand, reverifyCommand, whoisCommand, checkVerifyCommand } from './verification';
import { promoteCommand } from './promotion';
import { ticketCommand, closeTicketCommand, ticketPanelCommand } from './tickets';
import { securityStatsCommand, lockdownCommand, allowSiteCommand, disallowSiteCommand } from './security';
import { logger } from '../utils/logger';

// Augment the Client interface
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, any>;
  }
}

const commands = [
  verifyCommand,
  reverifyCommand,
  whoisCommand,
  checkVerifyCommand,
  promoteCommand,
  ticketCommand,
  closeTicketCommand,
  ticketPanelCommand,
  securityStatsCommand,
  lockdownCommand,
  allowSiteCommand,
  disallowSiteCommand
];

export function registerCommands(client: Client) {
  client.commands = new Collection<string, any>();
  
  // Register each command in the collection
  for (const command of commands) {
    client.commands.set(command.data.name, command);
    logger.info(`Registered command: ${command.data.name}`);
  }
  
  // Handle slash commands
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    const command = client.commands.get(interaction.commandName);
    
    if (!command) {
      logger.warn(`Command not found: ${interaction.commandName}`);
      return;
    }
    
    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error(`Error executing command ${interaction.commandName}:`, error);
      
      const errorReply = {
        content: 'There was an error executing this command.',
        ephemeral: true
      };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorReply);
      } else {
        await interaction.reply(errorReply);
      }
    }
  });
  
  // Deploy slash commands when the bot is ready
  client.once('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN || '');
    const commandsData = commands.map(command => command.data.toJSON());
    
    try {
      logger.info('Started refreshing application commands.');
      
      // Global commands
      await rest.put(
        Routes.applicationCommands(client.application?.id || ''),
        { body: commandsData }
      );
      
      logger.info('Successfully reloaded application commands.');
    } catch (error) {
      logger.error('Failed to deploy slash commands:', error);
    }
  });
}
