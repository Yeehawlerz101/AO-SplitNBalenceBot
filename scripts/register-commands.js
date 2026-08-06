const commands = [
  {
    name: 'bal',
    description: 'Modifies a user\'s silver balance.',
    options: [
      {
        name: 'user',
        description: 'Mention the user whose balance you want to modify (e.g. @Username)',
        type: 3, // STRING type
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
        description: 'Mention the user whose balance you want to wipe (e.g. @Username)',
        type: 3, // STRING type
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
        description: 'Mention the user whose history you want to see (e.g. @Username)',
        type: 3, // STRING type
        required: false,
      },
    ],
  },
  {
    name: 'invite',
    description: 'Generates an invite link for the bot with the correct permissions.',
  },
  {
    name: 'split',
    description: 'Manage active loot split sessions',
    options: [
      {
        name: 'start',
        description: 'Start a new loot split session',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'name',
            description: 'A unique name for this split session (e.g. "Ava Roads")',
            type: 3, // STRING
            required: true,
          },
          {
            name: 'users',
            description: 'Mention the users in this split (e.g. @user1 @user2)',
            type: 3, // STRING
            required: true,
          },
        ]
      },
      {
        name: 'update',
        description: 'Add or deduct silver from an active split session',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'name',
            description: 'The name of the active split session',
            type: 3, // STRING
            required: true,
            autocomplete: true,
          },
          {
            name: 'amount',
            description: 'Amount to add (positive) or deduct (negative)',
            type: 4, // INTEGER
            required: true,
          },
          {
            name: 'note',
            description: 'A note for this update',
            type: 3, // STRING
            required: false,
          },
        ]
      },
      {
        name: 'close',
        description: 'Close an active split session and distribute the silver to the users',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'name',
            description: 'The name of the active split session to close',
            type: 3, // STRING
            required: true,
            autocomplete: true,
          },
        ]
      }
    ],
  },
  {
    name: 'close',
    description: 'Pays out mentioned users, zeroing out their owed balances',
    options: [
      {
        name: 'users',
        description: 'Mention the users who were paid out (e.g. @user1 @user2)',
        type: 3, // STRING type
        required: true,
      },
      {
        name: 'note',
        description: 'Optional note for the payout',
        type: 3, // STRING type
        required: false,
      },
    ],
  },
  {
    name: 'perms',
    description: 'Manage role permissions for the bot',
    options: [
      {
        name: 'action',
        description: 'Allow or Disallow a permission',
        type: 3, // STRING
        required: true,
        choices: [
          { name: 'Allow', value: 'allow' },
          { name: 'Disallow', value: 'disallow' }
        ]
      },
      {
        name: 'permission',
        description: 'The permission level to assign',
        type: 3, // STRING
        required: true,
        choices: [
          { name: 'Admin', value: 'ADMIN' },
          { name: 'Split Manager', value: 'SPLIT_MANAGER' },
          { name: 'Banned', value: 'BANNED' }
        ]
      },
      {
        name: 'role',
        description: 'The Discord role to apply this to',
        type: 8, // ROLE
        required: true,
      }
    ]
  },
  {
    name: 'setlog',
    description: 'Set a channel for bot audit logs',
    options: [
      {
        name: 'channel',
        description: 'The channel to send plain-text logs to',
        type: 7, // CHANNEL
        required: true,
      }
    ]
  },
  {
    name: 'help',
    description: 'Display all commands and bot features',
    options: []
  },
  {
    name: 'config',
    description: 'Configure bot settings',
    options: [
      {
        name: 'setting',
        description: 'The setting to configure',
        type: 3, // STRING
        required: true,
        choices: [
          { name: 'bind-channel', value: 'bind-channel' },
          { name: 'split-tax', value: 'split-tax' }
        ]
      },
      {
        name: 'value',
        description: 'The value for the setting (Channel mention or number)',
        type: 3, // STRING
        required: true
      }
    ]
  },
  {
    name: 'activity',
    description: 'Track who has been in splits between two dates',
    options: [
      {
        name: 'start-date',
        description: 'Start date (Format: YYYY-MM-DD)',
        type: 3, // STRING
        required: true
      },
      {
        name: 'end-date',
        description: 'End date (Format: YYYY-MM-DD)',
        type: 3, // STRING
        required: true
      }
    ]
  }
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
