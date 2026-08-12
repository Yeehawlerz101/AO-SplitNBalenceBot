import { Hono } from 'hono';
import { verifyKey } from 'discord-interactions';
import { BalanceService } from '../../application/services/BalanceService';
import { SessionService } from '../../application/services/SessionService';
import { SettingsService } from '../../application/services/SettingsService';
import { DiscordLogService } from '../../application/services/DiscordLogService';
import { ActivityService } from '../../application/services/ActivityService';
import { handleDiscordInteraction } from '../../infrastructure/discord/commands';

export const discordRouter = new Hono<{ Bindings: { DISCORD_PUBLIC_KEY: string, DISCORD_APPLICATION_ID: string, DISCORD_TOKEN: string }, Variables: { balanceService: BalanceService, sessionService: SessionService, settingsService: SettingsService, activityService: ActivityService } }>();

discordRouter.post('/interaction', async (c) => {
    const signature = c.req.header('x-signature-ed25519');
    const timestamp = c.req.header('x-signature-timestamp');
    const body = await c.req.text();

    if (!signature || !timestamp) {
        return c.text('Bad request signature', 401);
    }

    const isValidRequest = await verifyKey(
        body,
        signature,
        timestamp,
        c.env.DISCORD_PUBLIC_KEY
    );

    if (!isValidRequest) {
        return c.text('Bad request signature', 401);
    }

    const interaction = JSON.parse(body);
    console.log('--- NEW INTERACTION ---');
    console.log(JSON.stringify(interaction, null, 2));
    
    const balanceService = c.get('balanceService');
    const sessionService = c.get('sessionService');
    const settingsService = c.get('settingsService');
    const activityService = c.get('activityService');
    const discordLogService = new DiscordLogService(settingsService, c.env.DISCORD_TOKEN);

    const response: any = await handleDiscordInteraction(interaction, balanceService, sessionService, settingsService, activityService, discordLogService, c.env.DISCORD_APPLICATION_ID);
    
    if (response.deferredCallback) {
        c.executionCtx.waitUntil(response.deferredCallback());
        delete response.deferredCallback; // Don't send this in the JSON
    }

    console.log('--- SENDING RESPONSE ---');
    console.log(JSON.stringify(response, null, 2));
    
    return c.json(response);
});
