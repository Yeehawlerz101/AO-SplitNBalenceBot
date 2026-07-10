import { Hono } from 'hono';
import { html, raw } from 'hono/html';
import { BalanceService } from '../../application/services/BalanceService';

export const webRouter = new Hono<{ Bindings: { DISCORD_TOKEN: string }, Variables: { balanceService: BalanceService } }>();

webRouter.get('/', async (c) => {
    const balanceService = c.get('balanceService');
    const usersWithBalances = await balanceService.getAllUsersWithBalances();

    const fetchUsername = async (discordId: string) => {
        try {
            const res = await fetch(`https://discord.com/api/v10/users/${discordId}`, {
                headers: { Authorization: `Bot ${c.env.DISCORD_TOKEN}` }
            });
            if (res.ok) {
                const data: any = await res.json();
                return data.username || discordId;
            }
        } catch (e) {}
        return discordId;
    };

    const usersWithUsernames = await Promise.all(
        usersWithBalances.map(async u => ({
            ...u,
            username: await fetchUsername(u.discordId)
        }))
    );

    const issuerStats = await balanceService.getIssuerStats();
    const issuerStatsWithUsernames = await Promise.all(
        issuerStats.map(async issuer => ({
            ...issuer,
            username: await fetchUsername(issuer.adminDiscordId)
        }))
    );

    // Prepare data for Chart.js
    const labels = usersWithUsernames.map(u => u.username);
    const data = usersWithUsernames.map(u => u.balance);

    return c.html(html`
        <!DOCTYPE html>
        <html lang="en" data-bs-theme="dark">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Admin Dashboard</title>
            <!-- Halfmoon CSS -->
            <link href="https://cdn.jsdelivr.net/npm/halfmoon@2.0.1/css/halfmoon.min.css" rel="stylesheet">
            <!-- Chart.js -->
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <style>
                body { padding: 20px; }
                .chart-container { position: relative; height:40vh; width:100%; margin-bottom: 2rem; }
            </style>
        </head>
        <body>
            <div class="container-fluid">
                <h1 class="mb-4">Albion Online Silver Balances</h1>

                <div class="row">
                    <div class="col-12 col-lg-8">
                        <div class="card p-3 mb-4">
                            <h2 class="h5">Balance Overview</h2>
                            <div class="chart-container">
                                <canvas id="balanceChart"></canvas>
                            </div>
                        </div>
                    </div>
                    <div class="col-12 col-lg-4">
                        <div class="card p-3 mb-4">
                            <h2 class="h5">Users Table</h2>
                            <table class="table table-hover table-striped">
                                <thead>
                                    <tr>
                                        <th>Discord ID</th>
                                        <th class="text-end">Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${usersWithUsernames.map(u => html`
                                        <tr>
                                            <td>${u.username}</td>
                                            <td class="text-end">${u.balance.toLocaleString()}</td>
                                        </tr>
                                    `)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="row mt-4">
                    <div class="col-12">
                        <div class="card p-3 mb-4">
                            <h2 class="h5">Issuer Statistics</h2>
                            <table class="table table-hover table-striped">
                                <thead>
                                    <tr>
                                        <th>Admin Issuer</th>
                                        <th class="text-end">Total Transactions</th>
                                        <th class="text-end">Net Silver Issued</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${issuerStatsWithUsernames.map(issuer => html`
                                        <tr>
                                            <td>${issuer.username}</td>
                                            <td class="text-end">${issuer.txCount}</td>
                                            <td class="text-end ${issuer.totalAmount >= 0 ? 'text-success' : 'text-danger'}">
                                                ${issuer.totalAmount > 0 ? '+' : ''}${issuer.totalAmount.toLocaleString()}
                                            </td>
                                        </tr>
                                    `)}
                                    ${issuerStatsWithUsernames.length === 0 ? html`<tr><td colspan="3" class="text-center">No transactions yet</td></tr>` : ''}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <script>
                const ctx = document.getElementById('balanceChart');
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ${raw(JSON.stringify(labels))},
                        datasets: [{
                            label: 'Silver Balance',
                            data: ${raw(JSON.stringify(data))},
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            </script>
        </body>
        </html>
    `);
});
