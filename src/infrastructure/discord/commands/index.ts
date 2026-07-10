import { InteractionResponseType, InteractionType } from 'discord-interactions';
import { BalanceService } from '../../../application/services/BalanceService';

export const handleDiscordInteraction = async (
    interaction: any, 
    balanceService: BalanceService,
    applicationId: string
): Promise<any> => {
    if (interaction.type === InteractionType.PING) {
        return { type: InteractionResponseType.PONG };
    }

    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
        const { name, options } = interaction.data;

        switch (name) {
            case 'bal': {
                const targetUserId = options?.find((o: any) => o.name === 'user')?.value;
                const amount = options?.find((o: any) => o.name === 'amount')?.value;
                const adminId = interaction.member?.user?.id || interaction.user?.id;

                if (!targetUserId || amount === undefined) {
                    return { type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: 'Missing parameters.' } };
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
                const targetUserId = options?.find((o: any) => o.name === 'user')?.value;
                const adminId = interaction.member?.user?.id || interaction.user?.id;

                if (!targetUserId) {
                    return { type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: 'Missing parameters.' } };
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
                const targetUserId = options?.find((o: any) => o.name === 'user')?.value || interaction.member?.user?.id || interaction.user?.id;
                
                const resolvedUsers = interaction.data?.resolved?.users;
                const targetUserObj = resolvedUsers && resolvedUsers[targetUserId] ? resolvedUsers[targetUserId] : (interaction.member?.user || interaction.user);
                const targetUsername = targetUserObj?.username || `<@${targetUserId}>`;

                const history = await balanceService.getHistory(targetUserId);
                const currentBalance = await balanceService.getBalance(targetUserId);
                
                if (history.length === 0) {
                    return {
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            embeds: [{
                                title: `📊 Transaction History: ${targetUsername}`,
                                description: `No transaction history found.\n\n**Current Balance:** ${currentBalance.toLocaleString()}`,
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
                            title: `📊 Transaction History: ${targetUsername}`,
                            description: `**Current Balance:** ${currentBalance.toLocaleString()}\n\n**Last 5 transactions:**\n\n${historyStr}`,
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
            default:
                return { type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: 'Unknown command' } };
        }
    }

    return { error: 'Unknown interaction type' };
};
