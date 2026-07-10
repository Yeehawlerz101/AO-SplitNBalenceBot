import { IUserRepository, IWalletRepository, ITransactionRepository } from '../../core/repositories';
import { User, Wallet, Transaction } from '../../core/entities';
import { nanoid } from 'nanoid';

export class BalanceService {
    constructor(
        private userRepo: IUserRepository,
        private walletRepo: IWalletRepository,
        private transactionRepo: ITransactionRepository
    ) {}

    /**
     * Modifies the balance of a user. If the user doesn't exist, it creates one.
     */
    async modifyBalance(
        targetDiscordId: string, 
        amount: number, 
        adminDiscordId: string, 
        reason?: string
    ): Promise<{ newBalance: number, transactionId: string }> {
        let user = await this.userRepo.findByDiscordId(targetDiscordId);
        
        if (!user) {
            user = {
                id: `user_${nanoid(10)}`,
                discordId: targetDiscordId,
                createdAt: new Date().toISOString()
            };
            await this.userRepo.create(user);
        }

        let wallet = await this.walletRepo.findByUserId(user.id);
        
        if (!wallet) {
            wallet = {
                id: `wallet_${nanoid(10)}`,
                userId: user.id,
                balance: 0,
                updatedAt: new Date().toISOString()
            };
            await this.walletRepo.create(wallet);
        }

        const newBalance = wallet.balance + amount;
        await this.walletRepo.updateBalance(wallet.id, newBalance);

        const transaction: Transaction = {
            id: `tx_${nanoid(10)}`,
            walletId: wallet.id,
            amount: amount,
            adminDiscordId: adminDiscordId,
            reason: reason || null,
            createdAt: new Date().toISOString()
        };

        await this.transactionRepo.create(transaction);

        return { newBalance, transactionId: transaction.id };
    }

    /**
     * Wipes a user's wallet completely.
     */
    async wipeBalance(targetDiscordId: string, adminDiscordId: string): Promise<void> {
        const user = await this.userRepo.findByDiscordId(targetDiscordId);
        if (!user) return; // User doesn't exist, nothing to wipe

        const wallet = await this.walletRepo.findByUserId(user.id);
        if (!wallet) return; // No wallet, nothing to wipe

        const wipeAmount = -wallet.balance;
        if (wipeAmount !== 0) {
            await this.modifyBalance(targetDiscordId, wipeAmount, adminDiscordId, "WIPE");
        }
    }

    /**
     * Retrieves the current balance.
     */
    async getBalance(targetDiscordId: string): Promise<number> {
        const user = await this.userRepo.findByDiscordId(targetDiscordId);
        if (!user) return 0;
        
        const wallet = await this.walletRepo.findByUserId(user.id);
        return wallet ? wallet.balance : 0;
    }

    /**
     * Retrieves the transaction history for a user.
     */
    async getHistory(targetDiscordId: string): Promise<Transaction[]> {
        const user = await this.userRepo.findByDiscordId(targetDiscordId);
        if (!user) return [];
        
        const wallet = await this.walletRepo.findByUserId(user.id);
        if (!wallet) return [];

        return await this.transactionRepo.findByWalletId(wallet.id, 50); // Get last 50
    }
    
    /**
     * Gets all users and wallets for the admin web UI.
     */
    async getAllUsersWithBalances(): Promise<Array<{discordId: string, balance: number}>> {
        return await this.walletRepo.getAllWithUsers();
    }

    /**
     * Gets statistics on silver issued per admin.
     */
    async getIssuerStats(): Promise<Array<{adminDiscordId: string, totalAmount: number, txCount: number}>> {
        return await this.transactionRepo.getIssuerStats();
    }

    /**
     * Gets statistics on loot splits.
     */
    async getLootSplitStats(): Promise<Array<{note: string, totalAmount: number, splitCount: number, recentDate: string}>> {
        return await this.transactionRepo.getLootSplitStats();
    }
}
