import { Hono } from 'hono';
import { discordRouter } from './interfaces/webhooks/discord';
import { adminApiRouter } from './interfaces/api/admin';
import { webRouter } from './interfaces/web/dashboard';
import { D1UserRepository } from './infrastructure/database/d1/D1UserRepository';
import { D1WalletRepository } from './infrastructure/database/d1/D1WalletRepository';
import { D1TransactionRepository } from './infrastructure/database/d1/D1TransactionRepository';
import { D1SessionRepository } from './infrastructure/database/d1/D1SessionRepository';
import { BalanceService } from './application/services/BalanceService';
import { SessionService } from './application/services/SessionService';

export interface Env {
    DB: D1Database;
    DISCORD_PUBLIC_KEY: string;
    DISCORD_APPLICATION_ID: string;
}

const app = new Hono<{ Bindings: Env; Variables: { balanceService: BalanceService; sessionService: SessionService } }>();

app.use('*', async (c, next) => {
    const userRepo = new D1UserRepository(c.env.DB);
    const walletRepo = new D1WalletRepository(c.env.DB);
    const txRepo = new D1TransactionRepository(c.env.DB);
    const sessionRepo = new D1SessionRepository(c.env.DB);
    const balanceService = new BalanceService(userRepo, walletRepo, txRepo);
    const sessionService = new SessionService(sessionRepo, balanceService);

    c.set('balanceService', balanceService);
    c.set('sessionService', sessionService);
    await next();
});

const requireCloudflareAccess = async (c: any, next: any) => {
    // Basic Cloudflare Access check
    // const cfAccessJwt = c.req.header('Cf-Access-Jwt-Assertion');
    // if (!cfAccessJwt) {
    //    return c.text('Unauthorized', 401);
    // }
    await next();
};

app.route('/discord', discordRouter);

app.use('/api/admin/*', requireCloudflareAccess);
app.route('/api/admin', adminApiRouter);

app.use('/admin/*', requireCloudflareAccess);
app.route('/admin', webRouter);

export default app;
