CREATE TABLE role_permissions (
    role_id TEXT PRIMARY KEY,
    permission TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE guild_settings (
    guild_id TEXT PRIMARY KEY,
    log_channel_id TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
