import { 
  type User, type InsertUser, 
  type DiscordServer, type InsertDiscordServer,
  type SecuritySettings, type InsertSecuritySettings, 
  type RobloxVerification, type InsertRobloxVerification,
  type PendingVerification, type InsertPendingVerification,
  type SecurityLog, type InsertSecurityLog,
  type Ticket, type InsertTicket,
  type ServerStats, type InsertServerStats
} from "@shared/schema";
import { logger } from './bot/utils/logger';

// Interface for database operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Discord server operations
  getDiscordServer(id: string): Promise<DiscordServer | undefined>;
  getAllDiscordServers(): Promise<DiscordServer[]>;
  createDiscordServer(server: InsertDiscordServer): Promise<DiscordServer>;
  updateDiscordServer(id: string, server: Partial<DiscordServer>): Promise<DiscordServer | undefined>;
  
  // Security settings operations
  getSecuritySettings(serverId: string): Promise<SecuritySettings | undefined>;
  createSecuritySettings(settings: InsertSecuritySettings): Promise<SecuritySettings>;
  updateSecuritySettings(serverId: string, settings: Partial<SecuritySettings>): Promise<SecuritySettings | undefined>;
  
  // Roblox verification operations
  getRobloxVerification(id: number): Promise<RobloxVerification | undefined>;
  getRobloxVerifications(serverId: string): Promise<RobloxVerification[]>;
  getRobloxVerificationByDiscordId(discordUserId: string): Promise<RobloxVerification | undefined>;
  getRobloxVerificationByRobloxId(robloxUserId: string): Promise<RobloxVerification | undefined>;
  createRobloxVerification(verification: InsertRobloxVerification): Promise<RobloxVerification>;
  removeRobloxVerification(discordUserId: string): Promise<boolean>;
  
  // Pending verification operations
  getPendingVerification(id: number): Promise<PendingVerification | undefined>;
  getPendingVerificationByDiscordId(discordUserId: string): Promise<PendingVerification | undefined>;
  createPendingVerification(verification: InsertPendingVerification): Promise<PendingVerification>;
  removePendingVerification(id: number): Promise<boolean>;
  
  // Security logs operations
  getSecurityLog(id: number): Promise<SecurityLog | undefined>;
  getSecurityLogs(serverId: string): Promise<SecurityLog[]>;
  getRecentSecurityLogs(serverId: string, limit: number): Promise<SecurityLog[]>;
  createSecurityLog(log: InsertSecurityLog): Promise<SecurityLog>;
  
  // Ticket operations
  getTicket(id: number): Promise<Ticket | undefined>;
  getTicketByChannelId(channelId: string): Promise<Ticket | undefined>;
  getTicketByUser(serverId: string, userId: string): Promise<Ticket | undefined>;
  getAllTickets(serverId: string): Promise<Ticket[]>;
  getOpenTickets(serverId: string): Promise<Ticket[]>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: number, ticket: Partial<Ticket>): Promise<Ticket | undefined>;
  
  // Server stats operations
  getServerStats(serverId: string): Promise<ServerStats | undefined>;
  createServerStats(stats: InsertServerStats): Promise<ServerStats>;
  updateServerStats(serverId: string, stats: Partial<ServerStats>): Promise<ServerStats | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private discordServers: Map<string, DiscordServer>;
  private securitySettings: Map<string, SecuritySettings>;
  private robloxVerifications: Map<number, RobloxVerification>;
  private pendingVerifications: Map<number, PendingVerification>;
  private securityLogs: Map<number, SecurityLog>;
  private tickets: Map<number, Ticket>;
  private serverStats: Map<string, ServerStats>;
  
  private nextUserId: number;
  private nextVerificationId: number;
  private nextPendingVerificationId: number;
  private nextSecurityLogId: number;
  private nextTicketId: number;
  private nextServerStatsId: number;
  
  constructor() {
    this.users = new Map();
    this.discordServers = new Map();
    this.securitySettings = new Map();
    this.robloxVerifications = new Map();
    this.pendingVerifications = new Map();
    this.securityLogs = new Map();
    this.tickets = new Map();
    this.serverStats = new Map();
    
    this.nextUserId = 1;
    this.nextVerificationId = 1;
    this.nextPendingVerificationId = 1;
    this.nextSecurityLogId = 1;
    this.nextTicketId = 1;
    this.nextServerStatsId = 1;
    
    // Initialize with mock data for development
    this.initializeMockData();
  }
  
  // Initialize some mock data for development
  private async initializeMockData() {
    try {
      // Create a mock Discord server
      const mockServer: InsertDiscordServer = {
        id: '123456789012345678',
        name: 'Test Server',
        ownerId: '987654321098765432',
        memberCount: 203
      };
      
      await this.createDiscordServer(mockServer);
      
      // Create security settings for the server
      const mockSettings: InsertSecuritySettings = {
        serverId: mockServer.id,
        antiNuke: true,
        antiHack: true,
        antiRaid: true,
        websiteFilter: true,
        allowedDomains: ['roblox.com', 'docs.google.com', 'discord.com', 'github.com'],
        verifiedRoleId: 'Verified Member',
        logChannelId: 'log-channel'
      };
      
      await this.createSecuritySettings(mockSettings);
      
      // Create server stats
      const mockStats: InsertServerStats = {
        serverId: mockServer.id,
        securityScore: 87,
        threatsBlocked: 24,
        verifiedMembers: 158,
        totalMembers: 203,
        openTickets: 5
      };
      
      await this.createServerStats(mockStats);
      
      // Create some security logs
      const eventTypes = ['anti-raid', 'verification', 'websiteFilter', 'anti-hack', 'settings'];
      const actions = ['User banned', 'User verified', 'URL blocked', 'Suspicious activity', 'Settings updated'];
      
      for (let i = 0; i < 10; i++) {
        const mockLog: InsertSecurityLog = {
          serverId: mockServer.id,
          eventType: eventTypes[i % eventTypes.length],
          action: actions[i % actions.length],
          userId: i % 2 === 0 ? '123123123123123123' : undefined,
          details: `Log details for event ${i + 1}`
        };
        
        await this.createSecurityLog(mockLog);
      }
      
      // Create some tickets
      const issues = ['Verification Issue', 'Bot Command Help', 'Role Assignment', 'Roblox Rank Request', 'General Question'];
      const users = ['123123123123123123', '234234234234234234', '345345345345345345', '456456456456456456', '567567567567567567'];
      
      for (let i = 0; i < 5; i++) {
        const mockTicket: InsertTicket = {
          serverId: mockServer.id,
          channelId: `ticket-channel-${i + 1}`,
          userId: users[i],
          issue: issues[i],
          status: 'open'
        };
        
        await this.createTicket(mockTicket);
      }
      
      // Create some verifications
      for (let i = 0; i < 5; i++) {
        const mockVerification: InsertRobloxVerification = {
          discordUserId: users[i],
          robloxUserId: `${1000000 + i}`,
          robloxUsername: `RobloxUser${i + 1}`,
          serverId: mockServer.id
        };
        
        await this.createRobloxVerification(mockVerification);
      }
      
      logger.info('Initialized mock data for development');
    } catch (error) {
      logger.error('Error initializing mock data:', error);
    }
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.nextUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Discord server operations
  async getDiscordServer(id: string): Promise<DiscordServer | undefined> {
    return this.discordServers.get(id);
  }
  
  async getAllDiscordServers(): Promise<DiscordServer[]> {
    return Array.from(this.discordServers.values());
  }
  
  async createDiscordServer(server: InsertDiscordServer): Promise<DiscordServer> {
    const now = new Date();
    const discordServer: DiscordServer = {
      ...server,
      createdAt: now,
      updatedAt: now
    };
    this.discordServers.set(server.id, discordServer);
    return discordServer;
  }
  
  async updateDiscordServer(id: string, serverUpdate: Partial<DiscordServer>): Promise<DiscordServer | undefined> {
    const server = this.discordServers.get(id);
    if (!server) return undefined;
    
    const updatedServer: DiscordServer = {
      ...server,
      ...serverUpdate,
      updatedAt: new Date()
    };
    
    this.discordServers.set(id, updatedServer);
    return updatedServer;
  }
  
  // Security settings operations
  async getSecuritySettings(serverId: string): Promise<SecuritySettings | undefined> {
    return this.securitySettings.get(serverId);
  }
  
  async createSecuritySettings(settings: InsertSecuritySettings): Promise<SecuritySettings> {
    const now = new Date();
    const securitySettings: SecuritySettings = {
      ...settings,
      id: this.discordServers.size + 1,
      updatedAt: now
    };
    this.securitySettings.set(settings.serverId, securitySettings);
    return securitySettings;
  }
  
  async updateSecuritySettings(serverId: string, settingsUpdate: Partial<SecuritySettings>): Promise<SecuritySettings | undefined> {
    const settings = this.securitySettings.get(serverId);
    if (!settings) return undefined;
    
    const updatedSettings: SecuritySettings = {
      ...settings,
      ...settingsUpdate,
      updatedAt: new Date()
    };
    
    this.securitySettings.set(serverId, updatedSettings);
    return updatedSettings;
  }
  
  // Roblox verification operations
  async getRobloxVerification(id: number): Promise<RobloxVerification | undefined> {
    return this.robloxVerifications.get(id);
  }
  
  async getRobloxVerifications(serverId: string): Promise<RobloxVerification[]> {
    return Array.from(this.robloxVerifications.values())
      .filter(verification => verification.serverId === serverId);
  }
  
  async getRobloxVerificationByDiscordId(discordUserId: string): Promise<RobloxVerification | undefined> {
    return Array.from(this.robloxVerifications.values())
      .find(verification => verification.discordUserId === discordUserId);
  }
  
  async getRobloxVerificationByRobloxId(robloxUserId: string): Promise<RobloxVerification | undefined> {
    return Array.from(this.robloxVerifications.values())
      .find(verification => verification.robloxUserId === robloxUserId);
  }
  
  async createRobloxVerification(verification: InsertRobloxVerification): Promise<RobloxVerification> {
    const id = this.nextVerificationId++;
    const now = new Date();
    const robloxVerification: RobloxVerification = {
      ...verification,
      id,
      verifiedAt: now
    };
    this.robloxVerifications.set(id, robloxVerification);
    return robloxVerification;
  }
  
  async removeRobloxVerification(discordUserId: string): Promise<boolean> {
    const verification = await this.getRobloxVerificationByDiscordId(discordUserId);
    if (!verification) return false;
    
    this.robloxVerifications.delete(verification.id);
    return true;
  }
  
  // Pending verification operations
  async getPendingVerification(id: number): Promise<PendingVerification | undefined> {
    return this.pendingVerifications.get(id);
  }
  
  async getPendingVerificationByDiscordId(discordUserId: string): Promise<PendingVerification | undefined> {
    return Array.from(this.pendingVerifications.values())
      .find(verification => verification.discordUserId === discordUserId);
  }
  
  async createPendingVerification(verification: InsertPendingVerification): Promise<PendingVerification> {
    const id = this.nextPendingVerificationId++;
    const now = new Date();
    const pendingVerification: PendingVerification = {
      ...verification,
      id,
      createdAt: now
    };
    this.pendingVerifications.set(id, pendingVerification);
    return pendingVerification;
  }
  
  async removePendingVerification(id: number): Promise<boolean> {
    return this.pendingVerifications.delete(id);
  }
  
  // Security logs operations
  async getSecurityLog(id: number): Promise<SecurityLog | undefined> {
    return this.securityLogs.get(id);
  }
  
  async getSecurityLogs(serverId: string): Promise<SecurityLog[]> {
    return Array.from(this.securityLogs.values())
      .filter(log => log.serverId === serverId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  
  async getRecentSecurityLogs(serverId: string, limit: number): Promise<SecurityLog[]> {
    return Array.from(this.securityLogs.values())
      .filter(log => log.serverId === serverId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
  
  async createSecurityLog(log: InsertSecurityLog): Promise<SecurityLog> {
    const id = this.nextSecurityLogId++;
    const now = new Date();
    const securityLog: SecurityLog = {
      ...log,
      id,
      timestamp: now
    };
    this.securityLogs.set(id, securityLog);
    return securityLog;
  }
  
  // Ticket operations
  async getTicket(id: number): Promise<Ticket | undefined> {
    return this.tickets.get(id);
  }
  
  async getTicketByChannelId(channelId: string): Promise<Ticket | undefined> {
    return Array.from(this.tickets.values())
      .find(ticket => ticket.channelId === channelId);
  }
  
  async getTicketByUser(serverId: string, userId: string): Promise<Ticket | undefined> {
    return Array.from(this.tickets.values())
      .find(ticket => ticket.serverId === serverId && ticket.userId === userId && ticket.status === 'open');
  }
  
  async getAllTickets(serverId: string): Promise<Ticket[]> {
    return Array.from(this.tickets.values())
      .filter(ticket => ticket.serverId === serverId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async getOpenTickets(serverId: string): Promise<Ticket[]> {
    return Array.from(this.tickets.values())
      .filter(ticket => ticket.serverId === serverId && ticket.status === 'open')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const id = this.nextTicketId++;
    const now = new Date();
    const newTicket: Ticket = {
      ...ticket,
      id,
      createdAt: now,
      closedAt: null,
      closedBy: null,
      closedReason: null
    };
    this.tickets.set(id, newTicket);
    return newTicket;
  }
  
  async updateTicket(id: number, ticketUpdate: Partial<Ticket>): Promise<Ticket | undefined> {
    const ticket = this.tickets.get(id);
    if (!ticket) return undefined;
    
    const updatedTicket: Ticket = {
      ...ticket,
      ...ticketUpdate
    };
    
    this.tickets.set(id, updatedTicket);
    return updatedTicket;
  }
  
  // Server stats operations
  async getServerStats(serverId: string): Promise<ServerStats | undefined> {
    return this.serverStats.get(serverId);
  }
  
  async createServerStats(stats: InsertServerStats): Promise<ServerStats> {
    const id = this.nextServerStatsId++;
    const now = new Date();
    const serverStats: ServerStats = {
      ...stats,
      id,
      date: now
    };
    this.serverStats.set(stats.serverId, serverStats);
    return serverStats;
  }
  
  async updateServerStats(serverId: string, statsUpdate: Partial<ServerStats>): Promise<ServerStats | undefined> {
    const stats = this.serverStats.get(serverId);
    if (!stats) return undefined;
    
    const updatedStats: ServerStats = {
      ...stats,
      ...statsUpdate
    };
    
    this.serverStats.set(serverId, updatedStats);
    return updatedStats;
  }
}

// Export a singleton instance
export const storage = new MemStorage();
