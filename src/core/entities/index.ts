export interface User {
    id: string; // e.g., user_abc123
    discordId: string;
    createdAt: string; // ISO 8601 string
}

export interface Wallet {
    id: string; // e.g., wallet_abc123
    userId: string;
    balance: number;
    updatedAt: string;
}

export interface Transaction {
    id: string; // e.g., tx_abc123
    walletId: string;
    amount: number;
    adminDiscordId: string;
    reason: string | null;
    createdAt: string;
}
