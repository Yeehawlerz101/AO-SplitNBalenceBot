import { InteractionResponseType, InteractionType } from 'discord-interactions';
import { BalanceService } from '../../../application/services/BalanceService';
import { SessionService } from '../../../application/services/SessionService';
import { SettingsService } from '../../../application/services/SettingsService';
import { DiscordLogService } from '../../../application/services/DiscordLogService';

export async function handleDiscordInteraction(
    interaction: any, 
    balanceService: BalanceService, 
    sessionService: SessionService,
    settingsService: SettingsService,
    discordLogService: DiscordLogService,
    applicationId: string
) {
    if (interaction.type === InteractionType.PING) {
        return { type: InteractionResponseType.PONG };
    }

    if (interaction.type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE) {
        const { name, options } = interaction.data;
        if (name === 'split') {
            const subCommand = options?.[0];
            const focusedOption = subCommand?.options?.find((o: any) => o.focused);
            
            if (focusedOption?.name === 'name') {
                const query = focusedOption.value.toLowerCase();
                const openSessions = await sessionService.getOpenSessions();
                
                const choices = openSessions
                    .filter(s => s.name.toLowerCase().includes(query))
                    .slice(0, 25)
                    .map(s => ({
                        name: `${s.name} (${s.totalAmount.toLocaleString()} silver)`,
                        value: s.name
                    }));

                return {
                    type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
                    data: { choices }
                };
            }
        }
        return { type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT, data: { choices: [] } };
    }

    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
        const { name, options } = interaction.data;
        const guildId = interaction.guild_id;
        const member = interaction.member;
        const adminId = member?.user?.id || interaction.user?.id;

        // PERMISSION MIDDLEWARE
        if (member) {
            const isOwner = member.user?.id === interaction.guild?.owner_id;
            const hasAdminPerm = (BigInt(member.permissions || '0') & BigInt(8)) === BigInt(8);
            
            let allowed = isOwner || hasAdminPerm;
            
            if (!allowed) {
                // Determine required perms based on command
                let reqPerms: string[] = [];
                if (['bal', 'wipe', 'perms', 'setlog', 'invite'].includes(name)) reqPerms = ['ADMIN'];
                if (name === 'split' || name === 'close') reqPerms = ['ADMIN', 'SPLIT_MANAGER'];

                // Commands that everyone can run
                if (['wallet', 'history', 'help'].includes(name)) reqPerms = [];

                if (reqPerms.length > 0) {
                    allowed = await settingsService.hasPermission(member.roles || [], reqPerms);
                } else {
                    // Check if banned from basic commands
                    const hasBannedRole = await settingsService.hasPermission(member.roles || [], ['BANNED']);
                    if (hasBannedRole) allowed = false;
                    else allowed = true;
                }
            }
            
            if (!allowed) {
                return { type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: '❌ You do not have permission to run this command, or you are banned from using the bot.', flags: 64 } };
            }
        }

        switch (name) {
            case 'perms': {
                const action = options?.find((o: any) => o.name === 'action')?.value;
                const permission = options?.find((o: any) => o.name === 'permission')?.value;
                const roleId = options?.find((o: any) => o.name === 'role')?.value;

                if (action === 'allow') {
                    await settingsService.setRolePermission(roleId, permission);
                    await discordLogService.sendLog(guildId, `🛡️ <@${adminId}> **GRANTED** \`${permission}\` permission to role <@&${roleId}>`);
                    return { type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: `Successfully assigned \`${permission}\` permission to <@&${roleId}>.` } };
                } else {
                    await settingsService.removeRolePermission(roleId);
                    await discordLogService.sendLog(guildId, `🛡️ <@${adminId}> **REVOKED** permissions from role <@&${roleId}>`);
                    return { type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: `Successfully removed permissions from <@&${roleId}>.` } };
                }
            }
            case 'setlog': {
                const channelId = options?.find((o: any) => o.name === 'channel')?.value;
                await settingsService.setLogChannel(guildId, channelId);
                return { type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: `Audit logs will now be sent to <#${channelId}>.` } };
            }
            case 'bal': {
                const userStr = options?.find((o: any) => o.name === 'user')?.value || '';
                const amount = options?.find((o: any) => o.name === 'amount')?.value;

                const match = /<@!?(\d+)>/.exec(userStr);
                const targetUserId = match ? match[1] : null;

                if (!targetUserId || amount === undefined) {
                    return { type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: 'Please mention a valid user (e.g. @Username) and provide an amount.' } };
                }

                const { newBalance } = await balanceService.modifyBalance(targetUserId, amount, adminId, 'Adjusted via /bal');
                const isPositive = amount >= 0;
                
                await discordLogService.sendLog(guildId, `💰 <@${adminId}> modified <@${targetUserId}>'s balance by **${isPositive ? '+' : ''}${amount.toLocaleString()}**. New Balance: ${newBalance.toLocaleString()}`);

                return {
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        embeds: [{
                            title: isPositive ? '📈 Balance Increased' : '📉 Balance Decreased',
                            description: `<@${targetUserId}>'s balance was updated by **${isPositive ? '+' + amount.toLocaleString() : amount.toLocaleString()}**.\n\n**New Balance:** ${newBalance.toLocaleString()}`,
                            color: isPositive ? 0x2ecc71 : 0xe74c3c
                        }]
                    }
                };
            }
            case 'wipe': {
                const userStr = options?.find((o: any) => o.name === 'user')?.value || '';

                const match = /<@!?(\d+)>/.exec(userStr);
                const targetUserId = match ? match[1] : null;

                if (!targetUserId) {
                    return { type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: 'Please mention a valid user (e.g. @Username).' } };
                }

                await balanceService.wipeBalance(targetUserId, adminId);
                await discordLogService.sendLog(guildId, `🧹 <@${adminId}> completely wiped the balance of <@${targetUserId}>.`);
                
                return {
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        embeds: [{
                            title: '🧹 Balance Wiped',
                            description: `The silver balance for <@${targetUserId}> has been completely wiped.`,
                            color: 0x95a5a6
                        }]
                    }
                };
            }
            case 'wallet': {
                const targetUserId = adminId;
                const balance = await balanceService.getBalance(targetUserId);
                
                return {
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        embeds: [{
                            title: '💰 Your Wallet',
                            description: `Your current silver balance is: **${balance.toLocaleString()}**`,
                            color: 0xf1c40f
                        }]
                    }
                };
            }
            case 'history': {
                const userStr = options?.find((o: any) => o.name === 'user')?.value;
                let targetUserId = adminId;
                
                if (userStr) {
                    const match = /<@!?(\d+)>/.exec(userStr);
                    if (match) {
                        targetUserId = match[1];
                    } else {
                        return { type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: 'Please mention a valid user (e.g. @Username).' } };
                    }
                }
                
                const targetUsername = `<@${targetUserId}>`;

                const history = await balanceService.getHistory(targetUserId);
                const currentBalance = await balanceService.getBalance(targetUserId);
                
                if (history.length === 0) {
                    return {
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            embeds: [{
                                title: `📊 Transaction History`,
                                description: `No transaction history found for ${targetUsername}.\n\n**Current Balance:** ${currentBalance.toLocaleString()}`,
                                color: 0xe74c3c
                            }]
                        }
                    };
                }

                const historyStr = history.slice(0, 5).map(tx => {
                    const isPositive = tx.amount >= 0;
                    const emoji = isPositive ? '📈' : '📉';
                    const sign = isPositive ? '+' : '';
                    const unixTimestamp = Math.floor(new Date(tx.createdAt).getTime() / 1000);
                    const timeString = `<t:${unixTimestamp}:F> (<t:${unixTimestamp}:R>)`;
                    return `${emoji} **${sign}${tx.amount.toLocaleString()}** (by <@${tx.adminDiscordId}>)\n└ 🕒 ${timeString}`;
                }).join('\n\n');

                return {
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        embeds: [{
                            title: `📊 Transaction History`,
                            description: `**User:** ${targetUsername}\n**Current Balance:** ${currentBalance.toLocaleString()}\n\n**Last 5 transactions:**\n\n${historyStr}`,
                            color: 0x3498db
                        }]
                    }
                };
            }
            case 'help': {
                return {
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        embeds: [{
                            title: '📚 AO-SplitNBalenceBot Help & Setup',
                            description: `Welcome to the official Albion Online Loot Splitting and Balance Bot!\n\nThis bot acts as a central treasury ledger, allowing your guild to easily track who is owed silver from fame farms, ganking sessions, and Avalonian roads.\n\n### 🔧 Initial Setup\n1. Use \`/perms\` to allow your Officer roles to have \`Admin\` access.\n2. Use \`/setlog\` to bind a text channel so all splits and balance changes are recorded for transparency.\n3. Head to the web dashboard to see all balances and active tabs at a glance!\n\n### ⚔️ Active Party Sessions (Splits)\nRun these commands during an active play session to track loot dynamically:\n- \`/split start\` - Start an active party and tag members (e.g., \`users: @Bob @Alice\`).\n- \`/split update\` - Add or subtract silver from the party's running pool.\n- \`/split close\` - Close the party. The pool is divided equally and added to the members' balances!\n\n*Note: Users with the \`Banned\` role are automatically skipped during split calculations.*\n\n### 💰 Ledger Management\n- \`/bal\` - (Admin) Manually adjust a user's owed balance (can be positive or negative).\n- \`/close\` - (Admin) Explicitly pay out users and zero out their balances. Use this after trading them in-game!\n- \`/wipe\` - (Admin) Forcibly wipe a user's balance to zero without tracking it as a payout.\n- \`/wallet\` - Check your own current silver balance.\n- \`/history\` - View the last 5 transactions for any user.\n\n### ⚙️ Admin Tools\n- \`/perms\` - Grant or revoke \`Admin\`, \`Split Manager\`, or \`Banned\` access to a Discord role.\n- \`/setlog\` - Set the audit log channel.`,
                            color: 0x3498db
                        }]
                    }
                };
            }
            case 'invite': {
                const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${applicationId}&permissions=2048&integration_type=0&scope=bot+applications.commands`;
                return {
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        embeds: [{
                            title: '🤖 Bot Invite',
                            description: `[Click here to invite the bot to your server](${inviteUrl})`,
                            color: 0x9b59b6
                        }]
                    }
                };
            }
            case 'split': {
                const subCommand = options?.[0];
                const subName = subCommand?.name;
                const subOptions = subCommand?.options;

                if (subName === 'start') {
                    const sessionName = subOptions?.find((o: any) => o.name === 'name')?.value;
                    const usersStr = subOptions?.find((o: any) => o.name === 'users')?.value || '';

                    const mentionRegex = /<@!?(\d+)>/g;
                    let match;
                    const userIds = new Set<string>();
                    while ((match = mentionRegex.exec(usersStr)) !== null) {
                        userIds.add(match[1]);
                    }
                    const usersArray = Array.from(userIds);

                    if (usersArray.length === 0) {
                        return { type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: 'No users were mentioned.' } };
                    }

                    try {
                        await sessionService.startSession(sessionName, usersArray);
                        await discordLogService.sendLog(guildId, `⛺ <@${adminId}> started active session \`${sessionName}\` with ${usersArray.length} members.`);

                        const mentionsList = usersArray.map(id => `<@${id}>`).join(', ');
                        return {
                            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                            data: {
                                embeds: [{
                                    title: '⛺ Party Started',
                                    description: `**Session Name:** ${sessionName}\n**Members (${usersArray.length}):**\n${mentionsList}\n\nUse \`/split update\` to add or deduct silver from the party pool!`,
                                    color: 0x3498db
                                }]
                            }
                        };
                    } catch (err: any) {
                        return { type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: err.message } };
                    }
                } 
                else if (subName === 'update') {
                    const sessionName = subOptions?.find((o: any) => o.name === 'name')?.value;
                    const amount = subOptions?.find((o: any) => o.name === 'amount')?.value;
                    const note = subOptions?.find((o: any) => o.name === 'note')?.value || '';

                    try {
                        const session = await sessionService.updateSession(sessionName, amount);
                        const isPositive = amount >= 0;
                        await discordLogService.sendLog(guildId, `📝 <@${adminId}> updated session \`${sessionName}\` pool by **${isPositive ? '+' : ''}${amount.toLocaleString()}**. New Total: ${session.totalAmount.toLocaleString()}`);

                        return {
                            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                            data: {
                                embeds: [{
                                    title: '📝 Party Pool Updated',
                                    description: `**Session:** ${sessionName}\n**Update:** ${isPositive ? '+' : ''}${amount.toLocaleString()} silver\n${note ? `**Note:** ${note}\n` : ''}\n**New Total Pool:** ${session.totalAmount.toLocaleString()}`,
                                    color: isPositive ? 0x2ecc71 : 0xe74c3c
                                }]
                            }
                        };
                    } catch (err: any) {
                        return { type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: err.message } };
                    }
                }
                else if (subName === 'close') {
                    const sessionName = subOptions?.find((o: any) => o.name === 'name')?.value;

                    try {
                        // Check for banned members
                        const allSessionMembers = await sessionService.getMembers(sessionName);
                        const bannedUserIds: string[] = [];
                        
                        for (const userId of allSessionMembers) {
                            const roles = await discordLogService.getMemberRoles(guildId, userId);
                            const isBanned = await settingsService.hasPermission(roles, ['BANNED']);
                            if (isBanned) {
                                bannedUserIds.push(userId);
                            }
                        }

                        const { session, splitAmount, members, skipped } = await sessionService.closeSession(sessionName, adminId, bannedUserIds);
                        
                        let description = `**Session:** ${sessionName}\n**Final Pool:** ${session.totalAmount.toLocaleString()}\n\n**Split Amount:** +${splitAmount.toLocaleString()} per user\n\n**Recipients:**\n${members.map(id => `<@${id}>`).join(', ') || 'None'}`;

                        if (skipped.length > 0) {
                            description += `\n\n**Skipped (Banned):**\n${skipped.map(id => `<@${id}>`).join(', ')}`;
                        }

                        await discordLogService.sendLog(guildId, `🔒 <@${adminId}> closed session \`${sessionName}\`. Split **${session.totalAmount.toLocaleString()}** silver across ${members.length} members (+${splitAmount.toLocaleString()} each).${skipped.length > 0 ? ` Skipped ${skipped.length} banned users.` : ''}`);

                        return {
                            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                            data: {
                                embeds: [{
                                    title: '🔒 Party Closed & Paid Out',
                                    description: description,
                                    color: 0x9b59b6
                                }]
                            }
                        };
                    } catch (err: any) {
                        return { type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: err.message } };
                    }
                }

                return { type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: 'Invalid split subcommand' } };
            }
            case 'close': {
                const usersStr = options?.find((o: any) => o.name === 'users')?.value || '';
                const note = options?.find((o: any) => o.name === 'note')?.value || 'Payout Complete';

                const mentionRegex = /<@!?(\d+)>/g;
                let match;
                const userIds = new Set<string>();
                while ((match = mentionRegex.exec(usersStr)) !== null) {
                    userIds.add(match[1]);
                }

                const usersArray = Array.from(userIds);

                if (usersArray.length === 0) {
                    return { type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: 'No users were mentioned. Please mention users like @User1 @User2' } };
                }

                let totalPaidOut = 0;
                const payoutDetails: { id: string, amount: number }[] = [];
                const skippedBanned: string[] = [];

                for (const userId of usersArray) {
                    const roles = await discordLogService.getMemberRoles(guildId, userId);
                    const isBanned = await settingsService.hasPermission(roles, ['BANNED']);
                    
                    if (isBanned) {
                        skippedBanned.push(userId);
                        continue;
                    }

                    const currentBalance = await balanceService.getBalance(userId);
                    if (currentBalance > 0) {
                        await balanceService.modifyBalance(userId, -currentBalance, adminId, `Payout: ${note}`);
                        totalPaidOut += currentBalance;
                        payoutDetails.push({ id: userId, amount: currentBalance });
                    }
                }

                if (payoutDetails.length === 0) {
                    let msg = `No users had a positive balance to pay out.`;
                    if (skippedBanned.length > 0) {
                        msg += `\n\n**Skipped (Banned):**\n${skippedBanned.map(id => `<@${id}>`).join(', ')}`;
                    }

                    return {
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            embeds: [{
                                title: '💰 Payout Complete',
                                description: msg,
                                color: 0x95a5a6
                            }]
                        }
                    };
                }

                const mentionsList = payoutDetails.map(d => `<@${d.id}> (-${d.amount.toLocaleString()})`).join('\n');
                
                let description = `Successfully zeroed out balances for ${payoutDetails.length} users.\n**Total Paid Out:** ${totalPaidOut.toLocaleString()} silver\n**Note:** ${note}\n\n**Recipients:**\n${mentionsList}`;
                if (skippedBanned.length > 0) {
                    description += `\n\n**Skipped (Banned):**\n${skippedBanned.map(id => `<@${id}>`).join(', ')}`;
                }
                
                await discordLogService.sendLog(guildId, `💸 <@${adminId}> executed an explicit payout command. Zeroed out balances for ${payoutDetails.length} users. Total paid: ${totalPaidOut.toLocaleString()}.${skippedBanned.length > 0 ? ` Skipped ${skippedBanned.length} banned users.` : ''}`);

                return {
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        embeds: [{
                            title: '💰 Payout Complete',
                            description: description,
                            color: 0x2ecc71
                        }]
                    }
                };
            }
            default:
                return { type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: 'Unknown command' } };
        }
    }

    return { error: 'Unknown interaction type' };
};
