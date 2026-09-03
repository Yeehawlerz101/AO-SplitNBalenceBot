import { Hono } from 'hono';
import { BalanceService } from '../../application/services/BalanceService';
import { DiscordLogService } from '../../application/services/DiscordLogService';
import { SettingsService } from '../../application/services/SettingsService';
import { UserService } from '../../application/services/UserService';

export const adminApiRouter = new Hono<{ Bindings: { DISCORD_TOKEN: string }, Variables: { balanceService: BalanceService; discordLogService: DiscordLogService; settingsService: SettingsService; userService: UserService } }>();

adminApiRouter.get('/users', async (c) => {
    const balanceService = c.get('balanceService');
    const users = await balanceService.getAllUsersWithBalances();
    return c.json(users);
});

adminApiRouter.post('/wipe/:discordId', async (c) => {
    const discordId = c.req.param('discordId');
    const balanceService = c.get('balanceService');
    const discordLogService = c.get('discordLogService');
    const settingsService = c.get('settingsService');

    await balanceService.wipeBalance(discordId, 'WEB_ADMIN');

    const guildId = await settingsService.getFirstGuildId();
    if (guildId) {
        await discordLogService.sendLog(guildId, `🧹 **WEB ADMIN** completely wiped the balance of <@${discordId}> via the Web Dashboard.`);
    }

    return c.json({ success: true });
});

adminApiRouter.get('/history/:discordId', async (c) => {
    const discordId = c.req.param('discordId');
    const balanceService = c.get('balanceService');
    const userService = c.get('userService');
    const history = await balanceService.getHistory(discordId);

    // Collect all unique admin IDs from the transaction history
    const adminIds = [...new Set(
        history
            .map(tx => tx.adminDiscordId)
            .filter(id => id !== 'WEB_ADMIN')
    )];

    // Single batch DB query + Discord API fallback for cache misses
    const usernameMap = await userService.resolveUsernames(adminIds, c.env.DISCORD_TOKEN);

    const historyWithNames = history.map(tx => ({
        ...tx,
        adminUsername: tx.adminDiscordId === 'WEB_ADMIN'
            ? 'Web Admin'
            : (usernameMap.get(tx.adminDiscordId) ?? 'Unknown User')
    }));

    return c.json(historyWithNames);
});

adminApiRouter.post('/sync-usernames', async (c) => {
    const userService = c.get('userService');
    const result = await userService.syncAllUsernames(c.env.DISCORD_TOKEN);
    return c.json(result);
});


