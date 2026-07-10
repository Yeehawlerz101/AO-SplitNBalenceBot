import { ITransactionRepository } from '../../../core/repositories';
import { Transaction } from '../../../core/entities';

export class D1TransactionRepository implements ITransactionRepository {
    constructor(private db: D1Database) {}

    async create(transaction: Transaction): Promise<void> {
        await this.db.prepare(
            'INSERT INTO transactions (id, wallet_id, amount, admin_discord_id, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(
            transaction.id, 
            transaction.walletId, 
            transaction.amount, 
            transaction.adminDiscordId, 
            transaction.reason, 
            transaction.createdAt
        ).run();
    }

    async findByWalletId(walletId: string, limit: number = 50): Promise<Transaction[]> {
        const { results } = await this.db.prepare(
            'SELECT * FROM transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT ?'
        ).bind(walletId, limit).all<{
            id: string, 
            wallet_id: string, 
            amount: number, 
            admin_discord_id: string, 
            reason: string | null, 
            created_at: string
        }>();

        return results.map(row => ({
            id: row.id,
            walletId: row.wallet_id,
            amount: row.amount,
            adminDiscordId: row.admin_discord_id,
            reason: row.reason,
            createdAt: row.created_at
        }));
    }

    async getIssuerStats(): Promise<Array<{adminDiscordId: string, totalAmount: number, txCount: number}>> {
        const { results } = await this.db.prepare(
            'SELECT admin_discord_id, SUM(amount) as total_amount, COUNT(*) as tx_count FROM transactions GROUP BY admin_discord_id ORDER BY total_amount DESC'
        ).all<{admin_discord_id: string, total_amount: number, tx_count: number}>();

        return results.map(row => ({
            adminDiscordId: row.admin_discord_id,
            totalAmount: row.total_amount,
            txCount: row.tx_count
        }));
    }

    async getLootSplitStats(): Promise<Array<{note: string, totalAmount: number, splitCount: number, recentDate: string}>> {
        const { results } = await this.db.prepare(
            "SELECT reason, SUM(amount) as total_amount, COUNT(*) as split_count, MAX(created_at) as recent_date FROM transactions WHERE reason LIKE 'Split: %' GROUP BY reason ORDER BY recent_date DESC"
        ).all<{reason: string, total_amount: number, split_count: number, recent_date: string}>();

        return results.map(row => ({
            note: row.reason.replace('Split: ', ''),
            totalAmount: row.total_amount,
            splitCount: row.split_count,
            recentDate: row.recent_date
        }));
    }
}
