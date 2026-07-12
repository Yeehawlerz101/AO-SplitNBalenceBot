import { SettingsService } from './SettingsService';

export class DiscordLogService {
    constructor(
        private settingsService: SettingsService,
        private discordToken: string
    ) {}

    async sendLog(guildId: string, message: string): Promise<void> {
        if (!guildId) return;

        const logChannelId = await this.settingsService.getLogChannel(guildId);
        if (!logChannelId) return;

        try {
            await fetch(`https://discord.com/api/v10/channels/${logChannelId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bot ${this.discordToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: message
                })
            });
        } catch (e) {
            console.error("Failed to send discord log:", e);
        }
    }

    async getMemberRoles(guildId: string, userId: string): Promise<string[]> {
        if (!guildId || !userId) return [];
        try {
            const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
                headers: {
                    'Authorization': `Bot ${this.discordToken}`
                }
            });
            if (res.ok) {
                const data: any = await res.json();
                return data.roles || [];
            }
        } catch (e) {
            console.error("Failed to fetch member roles:", e);
        }
        return [];
    }
}
