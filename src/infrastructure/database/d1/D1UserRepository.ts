import { IUserRepository } from '../../../core/repositories';
import { User } from '../../../core/entities';

export class D1UserRepository implements IUserRepository {
    constructor(private db: D1Database) {}

    async findById(id: string): Promise<User | null> {
        const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?').bind(id);
        const result = await stmt.first<{id: string, discord_id: string, username: string | null, created_at: string}>();
        if (!result) return null;
        return {
            id: result.id,
            discordId: result.discord_id,
            username: result.username ?? undefined,
            createdAt: result.created_at
        };
    }

    async findByDiscordId(discordId: string): Promise<User | null> {
        const stmt = this.db.prepare('SELECT * FROM users WHERE discord_id = ?').bind(discordId);
        const result = await stmt.first<{id: string, discord_id: string, username: string | null, created_at: string}>();
        if (!result) return null;
        return {
            id: result.id,
            discordId: result.discord_id,
            username: result.username ?? undefined,
            createdAt: result.created_at
        };
    }

    async create(user: User): Promise<void> {
        await this.db.prepare(
            'INSERT INTO users (id, discord_id, created_at) VALUES (?, ?, ?)'
        ).bind(user.id, user.discordId, user.createdAt).run();
    }

    /** Write-through: stores the Discord username for fast lookup on the web panel. */
    async upsertUsername(discordId: string, username: string): Promise<void> {
        await this.db.prepare(
            'UPDATE users SET username = ? WHERE discord_id = ?'
        ).bind(username, discordId).run();
    }

    /**
     * Batch-fetch cached usernames for a list of Discord IDs.
     * Returns a Map<discordId, username> — entries without a cached name are omitted.
     */
    async getUsernamesByDiscordIds(discordIds: string[]): Promise<Map<string, string>> {
        const map = new Map<string, string>();
        if (discordIds.length === 0) return map;

        const placeholders = discordIds.map(() => '?').join(', ');
        const { results } = await this.db
            .prepare(`SELECT discord_id, username FROM users WHERE discord_id IN (${placeholders}) AND username IS NOT NULL`)
            .bind(...discordIds)
            .all<{ discord_id: string; username: string }>();

        for (const row of results) {
            map.set(row.discord_id, row.username);
        }
        return map;
    }

    /** Returns all Discord IDs in the DB that have no cached username yet. */
    async getDiscordIdsWithoutUsernames(): Promise<string[]> {
        const { results } = await this.db
            .prepare('SELECT discord_id FROM users WHERE username IS NULL')
            .all<{ discord_id: string }>();
        return results.map(r => r.discord_id);
    }
}


