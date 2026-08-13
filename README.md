# Albion Online Split & Balance Bot ⚔️

A robust Discord bot and web dashboard built on Cloudflare Workers and D1 Database, designed to manage guild loot splits and track owed silver balances in Albion Online!

## ✨ Features
- **Dynamic Loot Splits**: Start stateful party sessions, seamlessly add/deduct silver from the central pool as the night progresses, and close the tab to automatically pay out members evenly.
- **Banned User Filtering**: Grant users a 'Banned' role to automatically skip them during payout calculations if they are known to steal or hoard loot.
- **Audit Logging**: Bind the bot to a text channel to automatically generate easily-searchable, plain-text receipts for every single transaction, split, and payout.
- **Role-Based Permissions**: Use Discord roles to explicitly grant your officers access to Admin tools or Split Management, keeping the bot completely locked down from standard members.
- **Web Dashboard**: An ultra-fast, premium-looking web interface built on Halfmoon CSS and Chart.js, featuring DataTables for instant searching and pagination through ledgers and active party tabs.

---

## 🚀 Setup & Installation (Cloudflare Workers)

### For Windows Users (Automated)
Simply run `setup.bat`! The wizard will prompt you for your Discord Bot credentials, install dependencies, register your slash commands, and apply your D1 database migrations. 

To update the bot later, just run `update.bat`.

### Manual Setup
1. **Clone the Repo** and run `npm install`.
2. **Create a D1 Database** in your Cloudflare dashboard and bind it in `wrangler.toml`:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "albion-balances"
   database_id = "YOUR_DATABASE_ID"
   migrations_dir = "migrations"
   ```
3. **Configure Secrets**: 
   - **Local Development**: Create a `.dev.vars` file in the root with:
     ```env
     DISCORD_PUBLIC_KEY="your_public_key"
     DISCORD_APPLICATION_ID="your_app_id"
     DISCORD_TOKEN="your_bot_token"
     ```
   - **Production**: Run `npx wrangler secret put DISCORD_TOKEN` (and the others) to store them securely.
4. **Execute Migrations** to build the database schema:
   - Local: `npx wrangler d1 migrations apply albion-balances --local`
   - Remote: `npx wrangler d1 migrations apply albion-balances --remote`
5. **Deploy & Register**: 
   - Register the slash commands: `npm run register`
   - Deploy your worker: `npm run deploy`
   - Grab your Worker URL and paste it into the **Interactions Endpoint URL** field in the Discord Developer Portal.

---

## 🛠️ Discord Bot Setup & Configuration

Once the bot is invited to your server, you need to configure it:

1. **Permissions Setup**: By default, only the Server Owner and Discord Administrators can use the bot's core features. 
   - Use `/perms action="Allow" permission="Admin" role="@Officers"` to give your officers full control.
   - Use `/perms action="Allow" permission="Split Manager" role="@Shotcallers"` to let shotcallers run splits without having full admin rights.
   - Use `/perms action="Allow" permission="Banned" role="@LootGoblins"` to completely ban users from the bot and skip them during split payouts.

2. **Audit Log Setup**:
   - Create a text channel in your server (e.g., `#treasury-logs`).
   - Run `/setlog channel="#treasury-logs"` so the bot can drop plain-text receipts of all transactions, making them easily searchable using Discord's native search bar.

---

## 📚 Command Reference

### ⚔️ Active Party Sessions (Splits)
Run these commands during an active play session to track loot dynamically:
- `/split start name="Ava Roads Group" users="@Player1 @Player2"` - Start an active party and lock in the roster.
- `/split update name="Ava Roads Group" amount="500000"` - Add or subtract silver from the running pool.
- `/split close name="Ava Roads Group"` - Close the party. The pool is divided equally and added to the members' balances! *(Banned users are automatically skipped).*

### 💰 Ledger Management
- `/bal user="@User" amount="100000"` - (Admin) Manually adjust a user's owed balance (can be positive or negative).
- `/close users="@User1 @User2"` - (Admin) Explicitly pay out users and zero out their balances. Use this after trading them in-game!
- `/wipe user="@User"` - (Admin) Forcibly wipe a user's balance to zero without tracking it as a payout.
- `/wallet` - Check your own current silver balance.
- `/history user="@User"` - View the last 5 transactions for any user.

### ⚙️ Admin Tools
- `/perms action="..." permission="..." role="..."` - Grant or revoke `Admin`, `Split Manager`, or `Banned` access to a Discord role.
- `/setlog channel="#logs"` - Set the audit log channel.
- `/invite` - Generate an invite link for the bot.
- `/help` - Display an up-to-date list of commands and setup instructions natively in Discord.

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