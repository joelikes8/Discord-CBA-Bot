import { logger } from '../utils/logger';
import noblox from 'noblox.js';

// Cache to store usernames to IDs for quick lookup
const usernameCache = new Map<string, number>();
const idCache = new Map<number, string>();

// Store the connected group information
let connectedGroupId: number | null = null;
let isLoggedIn: boolean = false;

/**
 * Initialize the Roblox service by logging in with a cookie
 */
export async function initializeRobloxService(): Promise<boolean> {
  try {
    const cookie = process.env.ROBLOX_COOKIE;
    
    // Check if we're in development mode without a Roblox cookie
    if (!cookie) {
      if (process.env.NODE_ENV !== 'production') {
        logger.warn('ROBLOX_COOKIE is not defined in environment variables - using simulated mode for development');
        
        // Setup mock Roblox connection data for development
        isLoggedIn = true;
        connectedGroupId = 12345678;
        
        logger.info('Simulated Roblox connection established for development');
        return true;
      } else {
        logger.warn('ROBLOX_COOKIE is not defined in environment variables');
        return false;
      }
    }
    
    const currentUser = await noblox.setCookie(cookie);
    // Get the current user ID - noblox.js API has changed, so we need to use getCurrentUser
    const userInfo = await noblox.getCurrentUser();
    logger.info(`Logged into Roblox as ${userInfo.UserName} (${userInfo.UserID})`);
    
    // Set the connected group ID from environment variable
    const groupId = process.env.ROBLOX_GROUP_ID;
    if (groupId) {
      connectedGroupId = parseInt(groupId);
      logger.info(`Connected to Roblox group ${connectedGroupId}`);
      
      // Verify the bot account has permissions in the group
      try {
        const role = await noblox.getRankInGroup(connectedGroupId, userInfo.UserID);
        if (role > 0) {
          logger.info(`Bot has role in group with permission level ${role}`);
        } else {
          logger.warn(`Bot is not a member of the configured group ${connectedGroupId}`);
        }
      } catch (error) {
        logger.error(`Failed to verify group permissions: ${error}`);
      }
    } else {
      logger.warn('ROBLOX_GROUP_ID is not defined in environment variables');
    }
    
    isLoggedIn = true;
    return true;
  } catch (error) {
    logger.error('Failed to initialize Roblox service:', error);
    isLoggedIn = false;
    return false;
  }
}

/**
 * Check if the Roblox service is properly initialized
 */
export function isRobloxConnected(): boolean {
  return isLoggedIn;
}

/**
 * Get a Roblox user by username
 * @param username The Roblox username to lookup
 * @returns User ID and username if found, null otherwise
 */
export async function getRobloxUserByUsername(username: string): Promise<{ id: number, username: string } | null> {
  try {
    // Check if we're in development simulation mode
    if (process.env.NODE_ENV !== 'production' && process.env.ROBLOX_COOKIE === undefined) {
      // Return simulated data for development
      const mockId = Math.floor(100000 + Math.random() * 900000);
      usernameCache.set(username.toLowerCase(), mockId);
      idCache.set(mockId, username);
      return { id: mockId, username };
    }
    
    // Check cache first
    if (usernameCache.has(username.toLowerCase())) {
      const userId = usernameCache.get(username.toLowerCase())!;
      return { id: userId, username };
    }
    
    // Look up the user ID
    const userId = await noblox.getIdFromUsername(username);
    
    if (!userId) {
      return null;
    }
    
    // Get the actual username with correct capitalization
    const userInfo = await noblox.getUsernameFromId(userId);
    
    // Store in cache
    usernameCache.set(userInfo.toLowerCase(), userId);
    idCache.set(userId, userInfo);
    
    return { id: userId, username: userInfo };
  } catch (error) {
    logger.error(`Error getting Roblox user by username ${username}:`, error);
    return null;
  }
}

/**
 * Get a Roblox user by ID
 * @param userId The Roblox user ID to lookup
 * @returns Username if found, null otherwise
 */
export async function getRobloxUserById(userId: number): Promise<string | null> {
  try {
    // Check cache first
    if (idCache.has(userId)) {
      return idCache.get(userId)!;
    }
    
    // Look up the username
    const username = await noblox.getUsernameFromId(userId);
    
    if (!username) {
      return null;
    }
    
    // Store in cache
    usernameCache.set(username.toLowerCase(), userId);
    idCache.set(userId, username);
    
    return username;
  } catch (error) {
    logger.error(`Error getting Roblox user by ID ${userId}:`, error);
    return null;
  }
}

/**
 * Generate a random verification code
 * @returns A random verification code
 */
export function generateVerificationCode(): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters.charAt(randomIndex);
  }
  
  return code;
}

/**
 * Verify a Roblox user using a verification code in their profile
 * @param userId Roblox user ID
 * @param verificationCode The verification code to look for
 * @returns Whether the verification succeeded
 */
export async function verifyRobloxUser(userId: number, verificationCode: string): Promise<boolean> {
  try {
    // Check if we're in development simulation mode
    if (process.env.NODE_ENV !== 'production' && process.env.ROBLOX_COOKIE === undefined) {
      // Always return true in development mode for testing
      logger.info(`[DEV] Simulating verification of user ${userId} with code ${verificationCode}`);
      return true;
    }
    
    // Get the user's profile description
    const description = await noblox.getBlurb(userId);
    
    // Check if the verification code is in the description
    return description.includes(verificationCode);
  } catch (error) {
    logger.error(`Error verifying Roblox user ${userId}:`, error);
    return false;
  }
}

/**
 * Get available ranks in the connected Roblox group
 * @returns Array of group ranks with IDs and names
 */
export async function getRobloxGroupRanks(): Promise<{ id: number, name: string, rank: number }[]> {
  try {
    if (!connectedGroupId) {
      throw new Error('No group ID configured');
    }
    
    const roles = await noblox.getRoles(connectedGroupId);
    
    return roles.map(role => ({
      id: role.id,
      name: role.name,
      rank: role.rank
    }));
  } catch (error) {
    logger.error('Error getting Roblox group ranks:', error);
    return [];
  }
}

/**
 * Promote a user in the connected Roblox group
 * @param userId Roblox user ID to promote
 * @param rankId Rank ID to promote to
 * @returns Result of the promotion operation
 */
export async function promoteUserInGroup(userId: number, rankId: number): Promise<{ success: boolean, error?: string }> {
  try {
    if (!connectedGroupId) {
      return { success: false, error: 'No group ID configured' };
    }
    
    if (!isLoggedIn) {
      return { success: false, error: 'Not logged into Roblox' };
    }
    
    // Check if the user is in the group
    const currentRank = await noblox.getRankInGroup(connectedGroupId, userId);
    
    if (currentRank === 0) {
      return { success: false, error: 'User is not in the group' };
    }
    
    // Set the user's rank
    await noblox.setRank(connectedGroupId, userId, rankId);
    
    // Verify the rank was changed
    const newRank = await noblox.getRankInGroup(connectedGroupId, userId);
    const username = await getRobloxUserById(userId);
    
    logger.info(`Promoted user ${username} (${userId}) to rank ID ${rankId} in group ${connectedGroupId}`);
    
    return { success: true };
  } catch (error) {
    logger.error(`Error promoting user ${userId} in group:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error during promotion'
    };
  }
}

/**
 * Get information about the connected Roblox group
 * @returns Group information if available
 */
export async function getRobloxGroupInfo(): Promise<{ id: number, name: string, memberCount: number } | null> {
  try {
    if (!connectedGroupId) {
      return null;
    }
    
    const group = await noblox.getGroup(connectedGroupId);
    
    return {
      id: group.id,
      name: group.name,
      memberCount: group.memberCount
    };
  } catch (error) {
    logger.error('Error getting Roblox group info:', error);
    return null;
  }
}

/**
 * Refresh the Roblox connection
 * @returns Whether the reconnection was successful
 */
export async function refreshRobloxConnection(): Promise<boolean> {
  try {
    // Reset status
    isLoggedIn = false;
    
    // Try to initialize again
    return await initializeRobloxService();
  } catch (error) {
    logger.error('Error refreshing Roblox connection:', error);
    return false;
  }
}
