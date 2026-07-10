import { User, Wallet, Transaction } from '../entities';

export interface IUserRepository {
    findById(id: string): Promise<User | null>;
    findByDiscordId(discordId: string): Promise<User | null>;
    create(user: User): Promise<void>;
}

export interface IWalletRepository {
    findByUserId(userId: string): Promise<Wallet | null>;
    create(wallet: Wallet): Promise<void>;
    updateBalance(walletId: string, newBalance: number): Promise<void>;
    getAllWithUsers(): Promise<Array<{discordId: string, balance: number}>>;
}

export interface ITransactionRepository {
    create(transaction: Transaction): Promise<void>;
    findByWalletId(walletId: string, limit?: number): Promise<Transaction[]>;
    getIssuerStats(): Promise<Array<{adminDiscordId: string, totalAmount: number, txCount: number}>>;
}
