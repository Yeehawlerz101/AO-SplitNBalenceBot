const commands = [
  {
    name: 'bal',
    description: 'Modifies a user\'s silver balance.',
    options: [
      {
        name: 'user',
        description: 'The user whose balance you want to modify',
        type: 6, // USER type
        required: true,
      },
      {
        name: 'amount',
        description: 'The amount to add or subtract',
        type: 4, // INTEGER type
        required: true,
      },
    ],
  },
  {
    name: 'wipe',
    description: 'Wipes a user\'s balance entirely.',
    options: [
      {
        name: 'user',
        description: 'The user whose balance you want to wipe',
        type: 6, // USER type
        required: true,
      },
    ],
  },
  {
    name: 'wallet',
    description: 'Shows your current silver balance.',
  },
  {
    name: 'history',
    description: 'Shows transaction history.',
    options: [
      {
        name: 'user',
        description: 'The user whose history you want to see',
        type: 6, // USER type
        required: false,
      },
    ],
  },
  {
    name: 'invite',
    description: 'Generates an invite link for the bot with the correct permissions.',
  },
];

import fs from 'fs';
import path from 'path';

let token = process.env.DISCORD_TOKEN;
let applicationId = process.env.DISCORD_APPLICATION_ID;

const parseEnv = (filePath) => {
    try {
        const content = fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf-8');
        if (!token) {
            const match = content.match(/DISCORD_TOKEN=["']?([^"'\n\r]+)["']?/);
            if (match) token = match[1];
        }
        if (!applicationId) {
            const match = content.match(/DISCORD_APPLICATION_ID=["']?([^"'\n\r]+)["']?/);
            if (match) applicationId = match[1];
        }
    } catch (e) {}
};

parseEnv('.dev.vars');
parseEnv('wrangler.toml');

if (!token || !applicationId) {
    console.error('Missing DISCORD_TOKEN or DISCORD_APPLICATION_ID environment variables.');
    process.exit(1);
}

async function registerCommands() {
    const url = `https://discord.com/api/v10/applications/${applicationId}/commands`;

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bot ${token}`
        },
        body: JSON.stringify(commands)
    });

    if (response.ok) {
        console.log('Successfully registered application commands.');
    } else {
        console.error('Failed to register commands:', await response.text());
    }
}

registerCommands();
