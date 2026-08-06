import { D1Database } from '@cloudflare/workers-types';

export class ActivityService {
    constructor(private db: D1Database) {}

    async getActivityLeaderboard(startDate: string, endDate: string): Promise<{ discordId: string, splitsAttended: number }[]> {
        // endDate is expected to be 'YYYY-MM-DD', to make it inclusive we can append ' 23:59:59'
        const endDateTime = `${endDate} 23:59:59`;
        
        const query = `
            SELECT sm.discord_id as discordId, COUNT(sm.id) as splitsAttended
            FROM split_members sm
            JOIN split_sessions ss ON sm.session_name = ss.name
            WHERE ss.created_at >= ? AND ss.created_at <= ?
            GROUP BY sm.discord_id
            ORDER BY splitsAttended DESC
        `;

        const { results } = await this.db.prepare(query).bind(startDate, endDateTime).all<{discordId: string, splitsAttended: number}>();
        return results;
    }
}
