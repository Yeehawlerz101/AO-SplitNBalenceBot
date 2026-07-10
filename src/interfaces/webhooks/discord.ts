import { Hono } from 'hono';
import { verifyKey } from 'discord-interactions';
import { BalanceService } from '../../application/services/BalanceService';
import { handleDiscordInteraction } from '../../infrastructure/discord/commands';

export const discordRouter = new Hono<{ Bindings: { DISCORD_PUBLIC_KEY: string, DISCORD_APPLICATION_ID: string }, Variables: { balanceService: BalanceService } }>();

discordRouter.post('/interaction', async (c) => {
    const signature = c.req.header('x-signature-ed25519');
    const timestamp = c.req.header('x-signature-timestamp');
    const body = await c.req.text();

    if (!signature || !timestamp) {
        return c.text('Bad request signature', 401);
    }

    // const isValidRequest = await verifyKey(
    //     body,
    //     signature,
    //     timestamp,
    //     c.env.DISCORD_PUBLIC_KEY
    // );

    // if (!isValidRequest) {
    //     return c.text('Bad request signature', 401);
    // }

    const interaction = JSON.parse(body);
    const balanceService = c.get('balanceService');

    const response = await handleDiscordInteraction(interaction, balanceService, c.env.DISCORD_APPLICATION_ID);
    return c.json(response);
});
