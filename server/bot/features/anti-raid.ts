import { Client, Events, GuildMember, Guild } from 'discord.js';
import { logger } from '../utils/logger';
import { storage } from '../../storage';

// Raid detection thresholds
const JOIN_THRESHOLD = 5; // Number of members joining
const JOIN_TIMEFRAME = 10000; // within 10 seconds
const NEW_ACCOUNT_THRESHOLD = 24 * 60 * 60 * 1000; // Account age threshold in ms (24 hours)
const SIMILAR_NAME_RATIO = 0.8; // Percentage of similar names to consider suspicious

// Track recent joins
interface JoinData {
  members: GuildMember[];
  timestamps: number[];
  isRaidActive: boolean;
  raidEndTimeout?: NodeJS.Timeout;
}

// Map to track joins per server
const recentJoins = new Map<string, JoinData>();

export function setupAntiRaid(client: Client) {
  logger.info('Setting up Anti-Raid protection');

  // Monitor member joins
  client.on(Events.GuildMemberAdd, async (member) => {
    // Check if anti-raid is enabled for this server
    const serverId = member.guild.id;
    const settings = await storage.getSecuritySettings(serverId);
    
    if (!settings || !settings.antiRaid) {
      logger.debug(`Anti-Raid disabled for server ${serverId}, ignoring member join`);
      return;
    }

    try {
      // Initialize entry for this server if it doesn't exist
      if (!recentJoins.has(serverId)) {
        recentJoins.set(serverId, {
          members: [],
          timestamps: [],
          isRaidActive: false,
        });
      }

      const joinData = recentJoins.get(serverId)!;
      
      // Filter out old timestamps and members outside the timeframe
      const currentTime = Date.now();
      const recentTimestamps = joinData.timestamps.filter(
        timestamp => currentTime - timestamp < JOIN_TIMEFRAME
      );
      
      const validMembers = joinData.members.filter((_, index) => 
        currentTime - joinData.timestamps[index] < JOIN_TIMEFRAME
      );
      
      // Add new member and timestamp
      recentTimestamps.push(currentTime);
      validMembers.push(member);
      
      // Update the map
      joinData.timestamps = recentTimestamps;
      joinData.members = validMembers;
      
      // Check for raid conditions
      if (recentTimestamps.length >= JOIN_THRESHOLD && !joinData.isRaidActive) {
        // Analyze the joining members to confirm if it's a raid
        if (isRaidDetected(validMembers)) {
          await handleRaid(member.guild, validMembers);
          
          // Set raid mode active
          joinData.isRaidActive = true;
          
          // Set a timeout to automatically end raid mode after a period
          if (joinData.raidEndTimeout) {
            clearTimeout(joinData.raidEndTimeout);
          }
          
          joinData.raidEndTimeout = setTimeout(async () => {
            await endRaidMode(member.guild);
            joinData.isRaidActive = false;
          }, 15 * 60 * 1000); // 15 minutes
        }
      } else if (joinData.isRaidActive) {
        // If we're already in raid mode, apply raid restrictions to this new member
        await applyRaidRestrictions(member);
      }
    } catch (error) {
      logger.error('Error in anti-raid member add handler:', error);
    }
  });
}

// Analyze members to determine if it's a raid
function isRaidDetected(members: GuildMember[]): boolean {
  // Check for new accounts (suspicious if many new accounts join at once)
  const newAccounts = members.filter(member => 
    Date.now() - member.user.createdTimestamp < NEW_ACCOUNT_THRESHOLD
  );
  
  if (newAccounts.length >= Math.ceil(members.length * 0.6)) {
    logger.warn(`Raid detection: High percentage of new accounts (${newAccounts.length}/${members.length})`);
    return true;
  }
  
  // Check for similar usernames/patterns
  const usernames = members.map(member => member.user.username.toLowerCase());
  let similarNames = 0;
  
  for (let i = 0; i < usernames.length; i++) {
    for (let j = i + 1; j < usernames.length; j++) {
      // Simple similarity check: shared prefix
      if (usernames[i].substring(0, 3) === usernames[j].substring(0, 3) && 
          usernames[i].length > 3 && usernames[j].length > 3) {
        similarNames++;
      }
      
      // Check for sequential numbering
      const numMatch1 = usernames[i].match(/(\D+)(\d+)$/);
      const numMatch2 = usernames[j].match(/(\D+)(\d+)$/);
      
      if (numMatch1 && numMatch2 && numMatch1[1] === numMatch2[1]) {
        const num1 = parseInt(numMatch1[2]);
        const num2 = parseInt(numMatch2[2]);
        
        if (Math.abs(num1 - num2) === 1) {
          similarNames++;
        }
      }
    }
  }
  
  // If more than a threshold of comparisons yielded similar names
  const totalComparisons = (usernames.length * (usernames.length - 1)) / 2;
  if (similarNames / totalComparisons >= SIMILAR_NAME_RATIO) {
    logger.warn(`Raid detection: High percentage of similar usernames (${similarNames}/${totalComparisons})`);
    return true;
  }
  
  return false;
}

// Handle a detected raid
async function handleRaid(guild: Guild, members: GuildMember[]) {
  logger.warn(`Anti-Raid triggered in server ${guild.id} - Raid detected with ${members.length} members`);
  
  try {
    // Get security settings
    const settings = await storage.getSecuritySettings(guild.id);
    
    // Log the incident
    await storage.createSecurityLog({
      serverId: guild.id,
      eventType: 'anti-raid',
      action: 'Raid detected',
      details: `Raid with ${members.length} members detected and mitigated`
    });
    
    // Increment threats blocked counter
    const stats = await storage.getServerStats(guild.id);
    if (stats) {
      await storage.updateServerStats(guild.id, {
        ...stats,
        threatsBlocked: stats.threatsBlocked + 1
      });
    }
    
    // Apply restrictions to all members in the suspected raid
    for (const member of members) {
      await applyRaidRestrictions(member);
    }
    
    // Notify in log channel if configured
    if (settings && settings.logChannelId) {
      const logChannel = await guild.channels.fetch(settings.logChannelId);
      if (logChannel && logChannel.isTextBased()) {
        await logChannel.send({
          embeds: [{
            title: '🛡️ Anti-Raid Protection Activated',
            description: `A raid has been detected and mitigated`,
            color: 0xED4245, // Red
            fields: [
              { name: 'Members Affected', value: `${members.length} suspicious joins` },
              { name: 'Action Taken', value: 'Restricted new members from sending messages' },
              { name: 'Time', value: new Date().toLocaleString() },
              { name: 'Note', value: 'Raid mode will automatically end in 15 minutes or use /endraid command' }
            ]
          }]
        });
      }
    }
  } catch (error) {
    logger.error(`Error handling raid in server ${guild.id}:`, error);
  }
}

// Apply restrictions to a member during raid mode
async function applyRaidRestrictions(member: GuildMember) {
  try {
    // Option 1: Add a timeout to the member
    await member.timeout(3 * 60 * 60 * 1000, 'Anti-Raid protection'); // 3 hour timeout
    
    // Option 2: Alternatively, you could kick the member
    // await member.kick('Anti-Raid protection');
    
    // Option 3: Or assign a restricted role with limited permissions
    // const restrictedRole = await member.guild.roles.fetch('RESTRICTED_ROLE_ID');
    // if (restrictedRole) {
    //   await member.roles.set([restrictedRole]);
    // }
    
    logger.info(`Applied raid restrictions to member ${member.user.tag} (${member.id}) in server ${member.guild.id}`);
  } catch (error) {
    logger.error(`Error applying raid restrictions to member ${member.id}:`, error);
  }
}

// End raid mode
async function endRaidMode(guild: Guild) {
  logger.info(`Ending raid mode in server ${guild.id}`);
  
  try {
    // Clear the raid data for this server
    const joinData = recentJoins.get(guild.id);
    if (joinData) {
      joinData.isRaidActive = false;
      joinData.members = [];
      joinData.timestamps = [];
      
      if (joinData.raidEndTimeout) {
        clearTimeout(joinData.raidEndTimeout);
        joinData.raidEndTimeout = undefined;
      }
    }
    
    // Log the raid mode end
    await storage.createSecurityLog({
      serverId: guild.id,
      eventType: 'anti-raid',
      action: 'Raid mode ended',
      details: 'Raid protection has been deactivated'
    });
    
    // Notify in log channel if configured
    const settings = await storage.getSecuritySettings(guild.id);
    if (settings && settings.logChannelId) {
      const logChannel = await guild.channels.fetch(settings.logChannelId);
      if (logChannel && logChannel.isTextBased()) {
        await logChannel.send({
          embeds: [{
            title: '✅ Raid Mode Deactivated',
            description: `The server is no longer in raid protection mode`,
            color: 0x57F287, // Green
            timestamp: new Date().toISOString()
          }]
        });
      }
    }
  } catch (error) {
    logger.error(`Error ending raid mode in server ${guild.id}:`, error);
  }
}
