import { IWalletRepository } from '../../../core/repositories';
import { Wallet } from '../../../core/entities';

export class D1WalletRepository implements IWalletRepository {
    constructor(private db: D1Database) {}

    async findByUserId(userId: string): Promise<Wallet | null> {
        const stmt = this.db.prepare('SELECT * FROM wallets WHERE user_id = ?').bind(userId);
        const result = await stmt.first<{id: string, user_id: string, balance: number, updated_at: string}>();
        if (!result) return null;
        return {
            id: result.id,
            userId: result.user_id,
            balance: result.balance,
            updatedAt: result.updated_at
        };
    }

    async create(wallet: Wallet): Promise<void> {
        await this.db.prepare(
            'INSERT INTO wallets (id, user_id, balance, updated_at) VALUES (?, ?, ?, ?)'
        ).bind(wallet.id, wallet.userId, wallet.balance, wallet.updatedAt).run();
    }

    async updateBalance(walletId: string, newBalance: number): Promise<void> {
        await this.db.prepare(
            'UPDATE wallets SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).bind(newBalance, walletId).run();
    }

    async getAllWithUsers(): Promise<Array<{discordId: string, balance: number}>> {
        const { results } = await this.db.prepare(
            'SELECT users.discord_id, wallets.balance FROM wallets JOIN users ON wallets.user_id = users.id'
        ).all<{discord_id: string, balance: number}>();
        
        return results.map(row => ({
            discordId: row.discord_id,
            balance: row.balance
        }));
    }
}
