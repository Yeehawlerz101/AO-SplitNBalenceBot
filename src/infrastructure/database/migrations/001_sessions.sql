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
