# Albion Online Silver Balance Bot

A Discord bot built on Cloudflare Workers, Hono, and D1 to manage Albion Online silver balances.

## Setup Instructions

### 1. Database Initialization
This bot uses Cloudflare D1 (Serverless SQLite).
To set it up locally:
```bash
# Create the local tables
npx wrangler d1 execute albion-balances --local --file=./schema.sql
```

### 2. Discord Configuration
Create a `.dev.vars` file in the root of your project:
```env
DISCORD_TOKEN="your_bot_token"
DISCORD_PUBLIC_KEY="your_public_key"
DISCORD_APPLICATION_ID="your_application_id"
```

### 3. Register Slash Commands
Whenever you update or add new slash commands, run the registration script:
```bash
npm run register
```

### 4. Invite the Bot
To quickly generate an invite URL with the correct permissions for your server:
```bash
npm run invite
```

---

## Local Testing with Tailscale Funnel

Since this bot uses HTTP Interactions, Discord needs a public HTTPS URL to reach your local worker. You can easily do this using **Tailscale Funnel**.

1. **Start the Local Worker**
   By default, this is configured to run on port `8080`:
   ```bash
   npm run dev
   ```
   *(The Web UI is now accessible locally at `http://127.0.0.1:8080/admin`)*

2. **Expose the Port via Tailscale Funnel**
   In a new terminal window, run:
   ```bash
   tailscale funnel 8080
   ```
   *(This will give you a public URL like `https://your-machine.tailnet.ts.net`)*

3. **Link to Discord**
   - Go to the [Discord Developer Portal](https://discord.com/developers/applications).
   - Select your application.
   - On the **General Information** page, paste your Tailscale URL into the **Interactions Endpoint URL** field, appending `/discord/interaction`.
     > Example: `https://your-machine.tailnet.ts.net/discord/interaction`
   - Click **Save Changes**. If Discord verifies the URL successfully, you're good to go!

---

## Architecture & Domain Driven Design

This application uses DDD to separate concerns:
- **Core**: Defines the Entities (\`User\`, \`Wallet\`, \`Transaction\`) and the Interfaces for the repositories.
- **Application**: The \`BalanceService\` manages all business logic natively.
- **Infrastructure**: Holds the SQLite implementations for Cloudflare D1 and handles the raw Discord command execution.
- **Interfaces**: Hono Web Routers for the Web UI, Admin APIs, and Discord HTTP Webhooks.