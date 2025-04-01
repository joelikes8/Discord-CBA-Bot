// Dashboard-related types
export interface SecurityState {
  antiNuke: boolean;
  antiHack: boolean;
  antiRaid: boolean;
  websiteFilter: boolean;
}

export interface ServerStats {
  securityScore: number;
  lastSecurityScore?: number;
  threatsBlocked: number;
  lastThreatsBlocked?: number;
  verifiedMembers: number;
  totalMembers: number;
  lastVerifiedMembers?: number;
  openTickets: number;
  needAttention: number;
}

export interface ActivityEvent {
  id: string;
  type: 'antiRaid' | 'verification' | 'ticket' | 'websiteFilter' | 'settings';
  icon: string;
  title: string;
  description: string;
  timestamp: string; // ISO string
  timeAgo: string; // Formatted time ago
}

export interface Ticket {
  id: string;
  status: 'open' | 'inProgress' | 'closed';
  title: string;
  user: string;
  timeAgo: string;
}

export interface BotCommand {
  command: string;
  description: string;
}

export interface CommandCategory {
  name: string;
  color: string;
  commands: BotCommand[];
}

export interface VerificationSettings {
  verifiedRole: string;
  robloxApiConnected: boolean;
}

export interface GuildData {
  id: string;
  name: string;
  memberCount: number;
  owner: {
    id: string;
    username: string;
    discriminator: string;
  };
}

export interface ActiveUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
}
