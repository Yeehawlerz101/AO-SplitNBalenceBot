import { InteractionResponseType, InteractionType } from 'discord-interactions';
import { BalanceService } from '../../../application/services/BalanceService';
import { SessionService } from '../../../application/services/SessionService';

export const handleDiscordInteraction = async (
    interaction: any, 
    balanceService: BalanceService,
    sessionService: SessionService,
    applicationId: string
): Promise<any> => {
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

        switch (name) {
            case 'bal': {
                const userStr = options?.find((o: any) => o.name === 'user')?.value || '';
                const amount = options?.find((o: any) => o.name === 'amount')?.value;
                const adminId = interaction.member?.user?.id || interaction.user?.id;

                const match = /<@!?(\d+)>/.exec(userStr);
                const targetUserId = match ? match[1] : null;

                if (!targetUserId || amount === undefined) {
                    return { type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: 'Please mention a valid user (e.g. @Username) and provide an amount.' } };
                }

                const { newBalance } = await balanceService.modifyBalance(targetUserId, amount, adminId, 'Adjusted via /bal');
                const isPositive = amount >= 0;
                
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
                const adminId = interaction.member?.user?.id || interaction.user?.id;

                const match = /<@!?(\d+)>/.exec(userStr);
                const targetUserId = match ? match[1] : null;

                if (!targetUserId) {
                    return { type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: 'Please mention a valid user (e.g. @Username).' } };
                }

                await balanceService.wipeBalance(targetUserId, adminId);
                
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
                const targetUserId = interaction.member?.user?.id || interaction.user?.id;
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
                let targetUserId = interaction.member?.user?.id || interaction.user?.id;
                
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
                    const adminId = interaction.member?.user?.id || interaction.user?.id;

                    try {
                        const { session, splitAmount, members } = await sessionService.closeSession(sessionName, adminId);
                        const mentionsList = members.map(id => `<@${id}>`).join(', ');
                        return {
                            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                            data: {
                                embeds: [{
                                    title: '🔒 Party Closed & Paid Out',
                                    description: `**Session:** ${sessionName}\n**Final Pool:** ${session.totalAmount.toLocaleString()}\n\n**Split Amount:** +${splitAmount.toLocaleString()} per user\n\n**Recipients:**\n${mentionsList}`,
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
                const note = options?.find((o: any) => o.name === 'note')?.value;
                const adminId = interaction.member?.user?.id || interaction.user?.id;

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

                const paidUsers: { id: string, amountPaid: number }[] = [];

                for (const userId of usersArray) {
                    const balance = await balanceService.getBalance(userId);
                    if (balance > 0) {
                        const reason = note ? `Payout: ${note}` : 'Payout via /close';
                        // Subtract exact balance to set it to 0
                        await balanceService.modifyBalance(userId, -balance, adminId, reason);
                        paidUsers.push({ id: userId, amountPaid: balance });
                    }
                }

                if (paidUsers.length === 0) {
                    return {
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            embeds: [{
                                title: '💰 Payout Complete',
                                description: 'None of the mentioned users had an outstanding positive balance.',
                                color: 0x95a5a6
                            }]
                        }
                    };
                }

                const payoutList = paidUsers.map(u => `<@${u.id}>: **-${u.amountPaid.toLocaleString()}**`).join('\n');
                const totalPaid = paidUsers.reduce((sum, u) => sum + u.amountPaid, 0);

                return {
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        embeds: [{
                            title: '💰 Payout Complete',
                            description: `Successfully paid out **${totalPaid.toLocaleString()}** total silver to ${paidUsers.length} users and zeroed their balances.\n\n${note ? `**Note:** ${note}\n\n` : ''}**Paid Out:**\n${payoutList}`,
                            color: 0xf1c40f
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
