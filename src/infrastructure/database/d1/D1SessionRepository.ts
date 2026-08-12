import { ISessionRepository } from '../../../core/repositories';
import { SplitSession, SplitMember } from '../../../core/entities';

export class D1SessionRepository implements ISessionRepository {
    constructor(private db: D1Database) {}

    async createSession(name: string): Promise<SplitSession> {
        await this.db.prepare(
            "INSERT INTO split_sessions (name) VALUES (?)"
        ).bind(name).run();

        const session = await this.getSession(name);
        if (!session) throw new Error("Failed to create session");
        return session;
    }

    async getSession(name: string): Promise<SplitSession | null> {
        const result = await this.db.prepare(
            "SELECT * FROM split_sessions WHERE name = ?"
        ).bind(name).first<{name: string, total_amount: number, status: 'open' | 'closed', created_at: string}>();

        if (!result) return null;

        return {
            name: result.name,
            totalAmount: result.total_amount,
            status: result.status,
            createdAt: new Date(result.created_at)
        };
    }

    async getOpenSessions(): Promise<SplitSession[]> {
        const { results } = await this.db.prepare(
            "SELECT * FROM split_sessions WHERE status = 'open' ORDER BY created_at DESC LIMIT 25"
        ).all<{name: string, total_amount: number, status: 'open' | 'closed', created_at: string}>();

        return results.map(r => ({
            name: r.name,
            totalAmount: r.total_amount,
            status: r.status,
            createdAt: new Date(r.created_at)
        }));
    }

    async updateSessionAmount(name: string, amountToAdd: number): Promise<void> {
        await this.db.prepare(
            "UPDATE split_sessions SET total_amount = total_amount + ? WHERE name = ?"
        ).bind(amountToAdd, name).run();
    }

    async closeSession(name: string): Promise<void> {
        await this.db.prepare(
            "UPDATE split_sessions SET status = 'closed' WHERE name = ?"
        ).bind(name).run();
    }

    async addMembers(sessionName: string, discordIds: string[]): Promise<void> {
        if (discordIds.length === 0) return;
        
        const stmts = discordIds.map(id => {
            const uuid = crypto.randomUUID();
            return this.db.prepare(
                "INSERT INTO split_members (id, session_name, discord_id) VALUES (?, ?, ?)"
            ).bind(uuid, sessionName, id);
        });

        await this.db.batch(stmts);
    }

    async getMembers(sessionName: string): Promise<SplitMember[]> {
        const { results } = await this.db.prepare(
            "SELECT * FROM split_members WHERE session_name = ?"
        ).bind(sessionName).all<{id: string, session_name: string, discord_id: string}>();

        return results.map(r => ({
            id: r.id,
            sessionName: r.session_name,
            discordId: r.discord_id
        }));
    }

    async deleteSession(name: string): Promise<void> {
        await this.db.batch([
            this.db.prepare("DELETE FROM split_members WHERE session_name = ?").bind(name),
            this.db.prepare("DELETE FROM split_sessions WHERE name = ?").bind(name)
        ]);
    }
}
