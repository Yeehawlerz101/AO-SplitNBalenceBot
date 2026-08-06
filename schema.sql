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

CREATE TABLE split_sessions (
    name TEXT PRIMARY KEY,
    total_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE split_members (
    id TEXT PRIMARY KEY,
    session_name TEXT NOT NULL,
    discord_id TEXT NOT NULL,
    FOREIGN KEY (session_name) REFERENCES split_sessions(name) ON DELETE CASCADE
);

CREATE TABLE role_permissions (
    role_id TEXT PRIMARY KEY,
    permission TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE guild_settings (
    guild_id TEXT PRIMARY KEY,
    log_channel_id TEXT,
    bind_channel_id TEXT,
    split_tax REAL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
