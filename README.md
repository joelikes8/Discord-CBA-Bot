# Discord Security Bot

A comprehensive Discord bot with advanced security features, Roblox verification, and ticket management capabilities.

## Features

### Security Features
- **Anti-Nuke Protection**: Prevents unauthorized mass actions like channel deletions
- **Anti-Hack Protection**: Detects and responds to suspicious account activity
- **Anti-Raid Protection**: Identifies and mitigates coordinated server raids
- **Website Filtering**: Blocks messages with unauthorized links (allows Roblox and Google Docs by default)

### Roblox Integration
- **Verification System**: Links Discord accounts to Roblox accounts
- **Role Management**: Automatically assigns roles based on Roblox group ranks
- **Promotion Commands**: Allows authorized users to promote members in the Roblox group

### Support System
- **Ticket Management**: Creates private support channels for users
- **Verification Help**: Provides assistance with the verification process
- **User-friendly Commands**: Simple slash commands for all functionality

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```
   DISCORD_TOKEN=your_token_here
   ROBLOX_COOKIE=your_cookie_here (optional)
   ROBLOX_GROUP_ID=your_group_id_here (optional)
   ```
4. Start the bot:
   ```bash
   npm run dev
   ```

## GitHub-Friendly Configuration

Instead of using environment variables, you can use the `run()` method in your own script. This is especially useful for GitHub repositories where you want to make setup easier for contributors:

```javascript
// Import the bot configuration
import { run } from './server/bot/config';

// Simple usage with just a token
run('INSERT YOUR DISCORD BOT TOKEN HERE');

// Or use the full configuration object for more options
run({
  token: 'INSERT YOUR DISCORD BOT TOKEN HERE',
  robloxCookie: 'INSERT YOUR ROBLOX COOKIE HERE',  // Optional
  robloxGroupId: '123456789',                      // Optional
  developmentMode: true                            // Optional
});
```

This approach allows you to:
1. Make it clear where users need to insert their token
2. Keep configuration in code rather than environment variables
3. Provide easy setup instructions in your GitHub README
4. Enable optional features like Roblox integration easily

## Commands

### Verification Commands
- `/verify`: Initiates the Roblox verification process
- `/reverify`: Re-does the verification if you change accounts (as requested by user)
- `/whois @user`: Shows the Roblox account linked to a Discord user

### Roblox Management
- `/promote [username] [rank]`: Promotes a Roblox user to a specific rank in the group (as requested by user)
- `/groupinfo`: Displays information about the connected Roblox group
- `/ranks`: Lists all available ranks in the Roblox group

### Security Commands
- `/securitystats`: Shows current security status and recent threats
- `/lockdown [reason]`: Temporarily restricts server access during incidents
- `/allowsite [url]`: Adds a website to the allowed URLs list (Admin only)

### Ticket Commands
- `/ticket [issue]`: Creates a new support ticket
- `/closeticket [reason]`: Closes an active ticket
- `/ticketpanel`: Creates a ticket panel for users (Admin only)

## Dashboard

The bot includes a web dashboard for easy management:
- View security statistics
- Control security features
- Manage verification settings
- Monitor tickets
- View command documentation

## Configuration

Security settings can be adjusted through the dashboard or by using commands:
- Toggle Anti-Nuke protection
- Toggle Anti-Hack protection
- Toggle Anti-Raid protection
- Toggle Website Filtering (allows Roblox and Google Docs by default, blocks other sites)
- Customize allowed domains for Website Filter
- Set verified role for Roblox verification

### Default Allowed Websites
The Website Filter module allows the following sites by default:
- roblox.com and all subdomains
- docs.google.com (Google Docs)
- drive.google.com (Google Drive)

Additional allowed domains can be added using the `/allowsite` command or through the dashboard.

## License

This project is licensed under the MIT License - see the LICENSE file for details.