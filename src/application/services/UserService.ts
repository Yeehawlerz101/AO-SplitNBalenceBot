import { IUserRepository } from '../../core/repositories';

/**
 * UserService owns all Discord user identity concerns.
 *
 * Rule: The web interface MUST always display real Discord usernames,
 * never raw numeric IDs. This service is the single source of truth
 * for resolving a Discord ID → human-readable username.
 *
 * Resolution order:
 *   1. D1 database cache (written on every bot interaction — free & instant)
 *   2. Discord REST API fallback (last resort for users the bot has never seen)
 */
export class UserService {
    constructor(private userRepo: IUserRepository) {}

    /**
     * Write-through cache: call this on every Discord interaction so the
     * username is always fresh. Safe to fire-and-forget (no await needed
     * on the caller side if latency is a concern).
     */
    async upsertUsername(discordId: string, username: string): Promise<void> {
        if (!discordId || !username) return;
        await this.userRepo.upsertUsername(discordId, username);
    }

    /**
     * Batch-fetch cached usernames from D1.
     * Returns a Map<discordId, username>. IDs with no cached name are absent.
     */
    async getUsernameMap(discordIds: string[]): Promise<Map<string, string>> {
        const unique = [...new Set(discordIds.filter(Boolean))];
        return this.userRepo.getUsernamesByDiscordIds(unique);
    }

    /**
     * Resolve a single Discord ID to a username.
     * Checks the D1 cache first; falls back to the Discord REST API only
     * if the user has never interacted with the bot.
     *
     * RULE: Never return a raw numeric ID to the web UI — if both sources
     * fail, return a short placeholder like "Unknown User".
     */
    async resolveUsername(discordId: string, discordToken: string): Promise<string> {
        // 1. DB cache
        const map = await this.userRepo.getUsernamesByDiscordIds([discordId]);
        if (map.has(discordId)) return map.get(discordId)!;

        // 2. Discord REST API fallback
        try {
            const res = await fetch(`https://discord.com/api/v10/users/${discordId}`, {
                headers: { Authorization: `Bot ${discordToken}` }
            });
            if (res.ok) {
                const data: any = await res.json();
                const username = data.global_name || data.username;
                if (username) {
                    // Write-through so we don't hit the API again
                    await this.userRepo.upsertUsername(discordId, username);
                    return username;
                }
            }
        } catch (_) {
            // Network/API failure — fall through to placeholder
        }

        // 3. Placeholder — never expose raw numeric IDs to the UI
        return 'Unknown User';
    }

    /**
     * Resolve a batch of Discord IDs to usernames efficiently.
     * Performs one DB query for all IDs, then one Discord API call per
     * cache miss (rare — only for users who have never used the bot).
     */
    async resolveUsernames(
        discordIds: string[],
        discordToken: string
    ): Promise<Map<string, string>> {
        const unique = [...new Set(discordIds.filter(Boolean))];
        const resolved = await this.userRepo.getUsernamesByDiscordIds(unique);

        // Only hit the Discord API for IDs not in the DB cache
        const misses = unique.filter(id => !resolved.has(id));
        await Promise.all(
            misses.map(async id => {
                const name = await this.resolveUsername(id, discordToken);
                resolved.set(id, name);
            })
        );

        return resolved;
    }

    /**
     * One-shot sync: fetches all users who have no cached username from the
     * DB and resolves them via the Discord REST API, writing results back.
     * Returns a summary so callers can report progress.
     */
    async syncAllUsernames(discordToken: string): Promise<{ synced: number; failed: number; total: number }> {
        const ids = await this.userRepo.getDiscordIdsWithoutUsernames();
        let synced = 0;
        let failed = 0;

        await Promise.all(
            ids.map(async id => {
                try {
                    const res = await fetch(`https://discord.com/api/v10/users/${id}`, {
                        headers: { Authorization: `Bot ${discordToken}` }
                    });
                    if (res.ok) {
                        const data: any = await res.json();
                        const username = data.global_name || data.username;
                        if (username) {
                            await this.userRepo.upsertUsername(id, username);
                            synced++;
                            return;
                        }
                    }
                } catch (_) {}
                failed++;
            })
        );

        return { synced, failed, total: ids.length };
    }
}

