import { ISessionRepository } from '../../core/repositories';
import { SplitSession } from '../../core/entities';
import { BalanceService } from './BalanceService';

export class SessionService {
    constructor(
        private sessionRepo: ISessionRepository,
        private balanceService: BalanceService
    ) {}

    async getOpenSessions(): Promise<SplitSession[]> {
        return await this.sessionRepo.getOpenSessions();
    }

    async getOpenSessionsWithMembers(): Promise<{session: SplitSession, members: string[]}[]> {
        const sessions = await this.sessionRepo.getOpenSessions();
        const result = [];
        for (const s of sessions) {
            const members = await this.sessionRepo.getMembers(s.name);
            result.push({
                session: s,
                members: members.map(m => m.discordId)
            });
        }
        return result;
    }

    async startSession(name: string, discordIds: string[]): Promise<SplitSession> {
        const existing = await this.sessionRepo.getSession(name);
        if (existing && existing.status === 'open') {
            throw new Error(`A session named "${name}" is already open.`);
        }
        if (existing && existing.status === 'closed') {
            throw new Error(`A session named "${name}" already exists and is closed. Please use a unique name.`);
        }

        const session = await this.sessionRepo.createSession(name);
        
        // Remove duplicates from discordIds
        const uniqueIds = Array.from(new Set(discordIds));
        await this.sessionRepo.addMembers(name, uniqueIds);

        return session;
    }

    async updateSession(name: string, amount: number): Promise<SplitSession> {
        const session = await this.sessionRepo.getSession(name);
        if (!session) throw new Error(`Session "${name}" not found.`);
        if (session.status === 'closed') throw new Error(`Session "${name}" is already closed.`);

        await this.sessionRepo.updateSessionAmount(name, amount);
        return (await this.sessionRepo.getSession(name))!;
    }

    async closeSession(name: string, adminDiscordId: string): Promise<{session: SplitSession, splitAmount: number, members: string[]}> {
        const session = await this.sessionRepo.getSession(name);
        if (!session) throw new Error(`Session "${name}" not found.`);
        if (session.status === 'closed') throw new Error(`Session "${name}" is already closed.`);

        const members = await this.sessionRepo.getMembers(name);
        if (members.length === 0) {
            await this.sessionRepo.closeSession(name);
            return { session, splitAmount: 0, members: [] };
        }

        const splitAmount = Math.floor(session.totalAmount / members.length);

        // Distribute funds
        await Promise.all(members.map(m => 
            this.balanceService.modifyBalance(m.discordId, splitAmount, adminDiscordId, `Split: ${name}`)
        ));

        await this.sessionRepo.closeSession(name);
        const closedSession = (await this.sessionRepo.getSession(name))!;

        return { session: closedSession, splitAmount, members: members.map(m => m.discordId) };
    }
}
