import { Hono } from 'hono';
import { html, raw } from 'hono/html';
import { BalanceService } from '../../application/services/BalanceService';
import { SessionService } from '../../application/services/SessionService';
import { ActivityService } from '../../application/services/ActivityService';

export const webRouter = new Hono<{ Bindings: { DISCORD_TOKEN: string }, Variables: { balanceService: BalanceService, sessionService: SessionService, activityService: ActivityService } }>();

webRouter.get('/', async (c) => {
    const balanceService = c.get('balanceService');
    const sessionService = c.get('sessionService');
    const activityService = c.get('activityService');

    let usersWithBalances = await balanceService.getAllUsersWithBalances();
    // Filter out users with 0 balance
    usersWithBalances = usersWithBalances.filter(u => u.balance !== 0);

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

    // Fetch activity leaderboard (all time)
    let activityLeaderboard = await activityService.getActivityLeaderboard('1970-01-01', '2099-12-31');
    activityLeaderboard = activityLeaderboard.filter(a => a.splitsAttended > 0);
    
    const activityWithUsernames = await Promise.all(
        activityLeaderboard.map(async a => ({
            ...a,
            username: await fetchUsername(a.discordId)
        }))
    );

    const issuerStats = await balanceService.getIssuerStats();
    const issuerStatsWithUsernames = await Promise.all(
        issuerStats.map(async issuer => ({
            ...issuer,
            username: await fetchUsername(issuer.adminDiscordId)
        }))
    );

    const openSessions = await sessionService.getOpenSessionsWithMembers();
    const openSessionsWithUsernames = await Promise.all(
        openSessions.map(async s => ({
            session: s.session,
            memberUsernames: await Promise.all(s.members.map(fetchUsername))
        }))
    );

    const balanceLabels = usersWithUsernames.map(u => u.username);
    const balanceData = usersWithUsernames.map(u => u.balance);

    const activityLabels = activityWithUsernames.map(a => a.username);
    const activityData = activityWithUsernames.map(a => a.splitsAttended);

    return c.html(html`
        <!DOCTYPE html>
        <html lang="en" data-bs-theme="dark">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Admin Dashboard</title>
            <!-- Halfmoon CSS -->
            <link href="https://cdn.jsdelivr.net/npm/halfmoon@2.0.1/css/halfmoon.min.css" rel="stylesheet">
            <!-- DataTables CSS -->
            <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/dataTables.bootstrap5.min.css">
            <!-- jQuery -->
            <script src="https://code.jquery.com/jquery-3.7.0.min.js"></script>
            <!-- DataTables JS -->
            <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
            <script src="https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap5.min.js"></script>
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

                <!-- Balances Row -->
                <div class="row">
                    <div class="col-12 col-lg-7">
                        <div class="card p-3 mb-4">
                            <h2 class="h5">Balance Overview</h2>
                            <div class="chart-container">
                                <canvas id="balanceChart"></canvas>
                            </div>
                        </div>
                    </div>
                    <div class="col-12 col-lg-5">
                        <div class="card p-3 mb-4">
                            <h2 class="h5">Users Ledger</h2>
                            <table id="usersTable" class="table table-hover table-striped">
                                <thead>
                                    <tr>
                                        <th>Discord ID</th>
                                        <th class="text-end">Owed Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${usersWithUsernames.map(u => html`
                                        <tr>
                                            <td>${u.username}</td>
                                            <td class="text-end text-warning fw-bold">${u.balance.toLocaleString()}</td>
                                        </tr>
                                    `)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Activity & Active Tabs Row -->
                <div class="row mt-4">
                    <div class="col-12 col-lg-7">
                        <div class="card p-3 mb-4">
                            <h2 class="h5">Activity Tracker (Splits Attended)</h2>
                            <div class="chart-container">
                                <canvas id="activityChart"></canvas>
                            </div>
                        </div>
                    </div>
                    <div class="col-12 col-lg-5">
                        <div class="card p-3 mb-4">
                            <h2 class="h5">Active Party Tabs</h2>
                            <table id="activeSplitsTable" class="table table-hover table-striped">
                                <thead>
                                    <tr>
                                        <th>Session Name</th>
                                        <th>Roster</th>
                                        <th>Status</th>
                                        <th class="text-end">Current Pool</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${openSessionsWithUsernames.map(s => html`
                                        <tr>
                                            <td class="fw-bold">${s.session.name}</td>
                                            <td>
                                                <small class="text-muted">
                                                    ${s.memberUsernames.slice(0, 3).join(', ')}
                                                    ${s.memberUsernames.length > 3 ? ` + ${s.memberUsernames.length - 3} more` : ''}
                                                </small>
                                            </td>
                                            <td><span class="badge text-bg-success">Open</span></td>
                                            <td class="text-end text-success fw-bold">${s.session.totalAmount.toLocaleString()}</td>
                                        </tr>
                                    `)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Issuer Stats Row -->
                <div class="row mt-4">
                    <div class="col-12">
                        <div class="card p-3 mb-4">
                            <h2 class="h5">Issuer Statistics</h2>
                            <table id="issuerTable" class="table table-hover table-striped">
                                <thead>
                                    <tr>
                                        <th>Admin</th>
                                        <th class="text-end">Tx Count</th>
                                        <th class="text-end">Net Flow</th>
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
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <script>
                $(document).ready(function() {
                    $('#usersTable').DataTable({
                        order: [[1, 'desc']],
                        pageLength: 5,
                        lengthMenu: [5, 10, 25, 50]
                    });
                    $('#activeSplitsTable').DataTable({
                        order: [[3, 'desc']],
                        pageLength: 5,
                        lengthMenu: [5, 10, 25]
                    });
                    $('#issuerTable').DataTable({
                        order: [[1, 'desc']],
                        pageLength: 5,
                        lengthMenu: [5, 10, 25]
                    });
                });

                const balCtx = document.getElementById('balanceChart');
                new Chart(balCtx, {
                    type: 'bar',
                    data: {
                        labels: ${raw(JSON.stringify(balanceLabels))},
                        datasets: [{
                            label: 'Owed Silver Balance',
                            data: ${raw(JSON.stringify(balanceData))},
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: { beginAtZero: true }
                        }
                    }
                });

                const actCtx = document.getElementById('activityChart');
                new Chart(actCtx, {
                    type: 'line',
                    data: {
                        labels: ${raw(JSON.stringify(activityLabels))},
                        datasets: [{
                            label: 'Splits Attended',
                            data: ${raw(JSON.stringify(activityData))},
                            backgroundColor: 'rgba(129, 140, 248, 0.2)',
                            borderColor: 'rgba(129, 140, 248, 1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: { beginAtZero: true }
                        }
                    }
                });
            </script>
        </body>
        </html>
    `);
});
