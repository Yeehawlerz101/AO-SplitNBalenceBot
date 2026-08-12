import { Hono } from 'hono';
import { BalanceService } from '../../application/services/BalanceService';
import { DiscordLogService } from '../../application/services/DiscordLogService';
import { SettingsService } from '../../application/services/SettingsService';

export const adminApiRouter = new Hono<{ Variables: { balanceService: BalanceService; discordLogService: DiscordLogService; settingsService: SettingsService } }>();

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
