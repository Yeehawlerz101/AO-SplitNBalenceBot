import { Hono } from 'hono';
import { BalanceService } from '../../application/services/BalanceService';

export const adminApiRouter = new Hono<{ Variables: { balanceService: BalanceService } }>();

adminApiRouter.get('/users', async (c) => {
    const balanceService = c.get('balanceService');
    const users = await balanceService.getAllUsersWithBalances();
    return c.json(users);
});
