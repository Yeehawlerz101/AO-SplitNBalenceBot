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
    getLootSplitStats(): Promise<Array<{note: string, totalAmount: number, splitCount: number, recentDate: string}>>;
}

import { SplitSession, SplitMember } from '../entities';

export interface ISessionRepository {
    createSession(name: string): Promise<SplitSession>;
    getSession(name: string): Promise<SplitSession | null>;
    getOpenSessions(): Promise<SplitSession[]>;
    updateSessionAmount(name: string, amountToAdd: number): Promise<void>;
    closeSession(name: string): Promise<void>;
    
    addMembers(sessionName: string, discordIds: string[]): Promise<void>;
    getMembers(sessionName: string): Promise<SplitMember[]>;
}
