export class SettingsService {
    constructor(private db: D1Database) {}

    async setRolePermission(roleId: string, permission: string): Promise<void> {
        await this.db.prepare(
            "INSERT INTO role_permissions (role_id, permission) VALUES (?, ?) ON CONFLICT(role_id) DO UPDATE SET permission = excluded.permission"
        ).bind(roleId, permission).run();
    }

    async removeRolePermission(roleId: string): Promise<void> {
        await this.db.prepare(
            "DELETE FROM role_permissions WHERE role_id = ?"
        ).bind(roleId).run();
    }

    async getRolePermission(roleId: string): Promise<string | null> {
        const result = await this.db.prepare(
            "SELECT permission FROM role_permissions WHERE role_id = ?"
        ).bind(roleId).first<{permission: string}>();
        
        return result?.permission || null;
    }

    async setLogChannel(guildId: string, channelId: string): Promise<void> {
        await this.db.prepare(
            "INSERT INTO guild_settings (guild_id, log_channel_id) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET log_channel_id = excluded.log_channel_id"
        ).bind(guildId, channelId).run();
    }

    async getLogChannel(guildId: string): Promise<string | null> {
        const result = await this.db.prepare(
            "SELECT log_channel_id FROM guild_settings WHERE guild_id = ?"
        ).bind(guildId).first<{log_channel_id: string}>();

        return result?.log_channel_id || null;
    }

    async hasPermission(userRoleIds: string[], requiredPermissions: string[]): Promise<boolean> {
        if (!userRoleIds || userRoleIds.length === 0) return false;

        const placeholders = userRoleIds.map(() => '?').join(',');
        const query = `SELECT permission FROM role_permissions WHERE role_id IN (${placeholders})`;
        const { results } = await this.db.prepare(query).bind(...userRoleIds).all<{permission: string}>();

        for (const row of results) {
            if (row.permission === 'BANNED') return false; // Explicitly reject banned users
            if (requiredPermissions.includes(row.permission)) return true;
        }

        return false;
    }
}
