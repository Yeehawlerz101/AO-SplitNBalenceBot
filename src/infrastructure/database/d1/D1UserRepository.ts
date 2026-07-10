import { IUserRepository } from '../../../core/repositories';
import { User } from '../../../core/entities';

export class D1UserRepository implements IUserRepository {
    constructor(private db: D1Database) {}

    async findById(id: string): Promise<User | null> {
        const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?').bind(id);
        const result = await stmt.first<{id: string, discord_id: string, created_at: string}>();
        if (!result) return null;
        return {
            id: result.id,
            discordId: result.discord_id,
            createdAt: result.created_at
        };
    }

    async findByDiscordId(discordId: string): Promise<User | null> {
        const stmt = this.db.prepare('SELECT * FROM users WHERE discord_id = ?').bind(discordId);
        const result = await stmt.first<{id: string, discord_id: string, created_at: string}>();
        if (!result) return null;
        return {
            id: result.id,
            discordId: result.discord_id,
            createdAt: result.created_at
        };
    }

    async create(user: User): Promise<void> {
        await this.db.prepare(
            'INSERT INTO users (id, discord_id, created_at) VALUES (?, ?, ?)'
        ).bind(user.id, user.discordId, user.createdAt).run();
    }
}
