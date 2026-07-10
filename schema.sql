DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS wallets;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    discord_id TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wallets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    balance REAL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    wallet_id TEXT NOT NULL,
    amount REAL NOT NULL,
    admin_discord_id TEXT NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
);
