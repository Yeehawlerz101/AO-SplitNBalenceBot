import { Hono } from 'hono';
import { BalanceService } from '../../application/services/BalanceService';
import { DiscordLogService } from '../../application/services/DiscordLogService';
import { SettingsService } from '../../application/services/SettingsService';

export const adminApiRouter = new Hono<{ Bindings: { DISCORD_TOKEN: string }, Variables: { balanceService: BalanceService; discordLogService: DiscordLogService; settingsService: SettingsService } }>();

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
    const history = await balanceService.getHistory(discordId);
    
    const usernameCache = new Map<string, string>();
    const fetchUsername = async (id: string) => {
        if (usernameCache.has(id)) return usernameCache.get(id);
        try {
            const res = await fetch(`https://discord.com/api/v10/users/${id}`, {
                headers: { Authorization: `Bot ${c.env.DISCORD_TOKEN}` }
            });
            if (res.ok) {
                const data = await res.json();
                const name = data.username || id;
                usernameCache.set(id, name);
                return name;
            }
        } catch (e) {}              
        usernameCache.set(id, id);
        return id;
    };

    const historyWithNames = await Promise.all(
        history.map(async tx => ({
            ...tx,
            adminUsername: tx.adminDiscordId === 'WEB_ADMIN' ? 'Web Admin' : await fetchUsername(tx.adminDiscordId)
        }))
    );
    
    return c.json(historyWithNames);
});
