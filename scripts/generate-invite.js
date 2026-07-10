// generate-invite.js
// Run this script from the terminal to get your bot's invite link

import fs from 'fs';
import path from 'path';

// Try to load DISCORD_APPLICATION_ID from .dev.vars if process.env doesn't have it
let appId = process.env.DISCORD_APPLICATION_ID;

const parseEnv = (filePath) => {
    try {
        const envPath = path.resolve(process.cwd(), filePath);
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const match = envContent.match(/DISCORD_APPLICATION_ID=["']?(\d+)["']?/);
        if (match) {
            appId = match[1];
        }
    } catch (e) {
        // File might not exist
    }
};

if (!appId) parseEnv('.dev.vars');
if (!appId) parseEnv('wrangler.toml');

if (!appId) {
    console.error('❌ Could not find DISCORD_APPLICATION_ID.');
    console.error('Please ensure it is set in your .dev.vars file or passed as an environment variable.');
    process.exit(1);
}

const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${appId}&permissions=2048&integration_type=0&scope=bot+applications.commands`;

console.log('✅ Bot Invite Link Generated!');
console.log('----------------------------------------------------');
console.log(inviteUrl);
console.log('----------------------------------------------------');
console.log('Ctrl+Click the link above to invite the bot to your server.');
