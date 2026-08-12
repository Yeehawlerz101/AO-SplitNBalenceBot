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

    const usernameCache = new Map<string, string>();
    const fetchUsername = async (discordId: string) => {
        if (usernameCache.has(discordId)) return usernameCache.get(discordId);
        try {
            const res = await fetch(`https://discord.com/api/v10/users/${discordId}`, {
                headers: { Authorization: `Bot ${c.env.DISCORD_TOKEN}` }
            });
            if (res.ok) {
                const data: any = await res.json();
                const name = data.username || discordId;
                usernameCache.set(discordId, name);
                return name;
            }
        } catch (e) { }
        usernameCache.set(discordId, discordId);
        return discordId;
    };

    const usersWithUsernames = await Promise.all(
        usersWithBalances.map(async u => ({
            ...u,
            username: await fetchUsername(u.discordId)
        }))
    );

    const days = c.req.query('days') || 'lifetime';
    let startDate = '1970-01-01';
    if (days !== 'lifetime') {
        const numDays = parseInt(days, 10);
        if (!isNaN(numDays)) {
            const date = new Date();
            date.setDate(date.getDate() - numDays);
            startDate = date.toISOString().split('T')[0];
        }
    }

    // Fetch activity leaderboard
    let activityLeaderboard = await activityService.getActivityLeaderboard(startDate, '2099-12-31');
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

    const openSessions = await sessionService.getAllSessionsWithMembers();
    const allSessionsWithUsernames = await Promise.all(
        openSessions.map(async s => ({
            session: s.session,
            memberUsernames: await Promise.all(s.members.map(fetchUsername))
        }))
    );

    const currentBalanceLabels = usersWithUsernames.map(u => u.username);
    const currentBalanceData = usersWithUsernames.map(u => u.balance);

    const earnings = await balanceService.getEarningsPerUser(startDate, '2099-12-31');
    const earningsWithUsernames = await Promise.all(
        earnings.map(async e => ({
            ...e,
            username: await fetchUsername(e.discordId)
        }))
    );

    const balanceLabels = earningsWithUsernames.map(e => e.username);
    const balanceData = earningsWithUsernames.map(e => e.earned);

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
            <!-- Bootstrap JS --><script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.1/dist/js/bootstrap.bundle.min.js"></script>
            <!-- Chart.js -->
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <style>
                body { padding: 20px; }
                .chart-container { position: relative; height:40vh; width:100%; flex-grow: 1; }
                
                .dashboard-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1.5rem;
                }
                .dashboard-grid[data-cols="1"] {
                    grid-template-columns: 1fr;
                }
                .dashboard-grid[data-cols="3"] {
                    grid-template-columns: repeat(3, 1fr);
                }
                
                @media (max-width: 992px) {
                    .dashboard-grid, .dashboard-grid[data-cols="3"], .dashboard-grid[data-cols="2"] {
                        grid-template-columns: 1fr;
                    }
                }
                
                .dashboard-card {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    margin-bottom: 0 !important;
                }
            </style>
        </head>
        <body>
            <div class="container-fluid">
                <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                    <h1 class="mb-0">Albion Online Silver Balances</h1>
                    <div class="btn-group" role="group">
                        <button type="button" class="btn btn-secondary col-btn" data-col="1">1 Col</button>
                        <button type="button" class="btn btn-primary col-btn active" data-col="2">2 Cols</button>
                        <button type="button" class="btn btn-secondary col-btn" data-col="3">3 Cols</button>
                    </div>
                </div>

                <div class="dashboard-grid" id="mainGrid" data-cols="2">
                
                    <!-- 1. Current Owed Balance -->
                    <div class="card p-3 dashboard-card">
                        <h2 class="h5 mb-3">Current Owed Balance</h2>
                        <div class="chart-container">
                            <canvas id="currentBalanceChart"></canvas>
                        </div>
                    </div>

                    <!-- 2. Users Ledger -->
                    <div class="card p-3 dashboard-card">
                        <h2 class="h5 mb-3">Users Ledger</h2>
                        <div class="table-responsive">
                            <table id="usersTable" class="table table-hover table-striped">
                                <thead>
                                    <tr>
                                        <th>Discord ID</th>
                                        <th class="text-end">Owed Balance</th>
                                        <th class="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${usersWithUsernames.map(u => html`
                                        <tr>
                                            <td>${u.username}</td>
                                            <td class="text-end text-warning fw-bold">${u.balance.toLocaleString()}</td>
                                            <td class="text-end">
                                                <button class="btn btn-sm btn-info history-btn me-1" data-id="${u.discordId}" data-name="${u.username}">History</button>
                                                <button class="btn btn-sm btn-danger wipe-btn" data-id="${u.discordId}">Wipe</button>
                                            </td>
                                        </tr>
                                    `)}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- 3. Activity Tracker -->
                    <div class="card p-3 dashboard-card">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h2 class="h5 mb-0">Activity Tracker (Splits Attended)</h2>
                            <select class="form-select form-select-sm w-auto" id="dateFilter" onchange="window.location.search = '?days=' + this.value">
                                <option value="7" ${days === '7' ? 'selected' : ''}>Last 7 Days</option>
                                <option value="30" ${days === '30' ? 'selected' : ''}>Last 30 Days</option>
                                <option value="60" ${days === '60' ? 'selected' : ''}>Last 60 Days</option>
                                <option value="90" ${days === '90' ? 'selected' : ''}>Last 90 Days</option>
                                <option value="lifetime" ${days === 'lifetime' ? 'selected' : ''}>Lifetime</option>
                            </select>
                        </div>
                        <div class="chart-container">
                            <canvas id="activityChart"></canvas>
                        </div>
                    </div>

                    <!-- 4. Active Party Tabs -->
                    <div class="card p-3 dashboard-card">
                        <h2 class="h5 mb-3">Party Tabs</h2>
                        <div class="table-responsive">
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
                                    ${allSessionsWithUsernames.map(s => html`
                                        <tr>
                                            <td class="fw-bold">${s.session.name}</td>
                                            <td>
                                                <small class="text-muted">
                                                    ${s.memberUsernames.slice(0, 3).join(', ')}
                                                    ${s.memberUsernames.length > 3 ? ` + ${s.memberUsernames.length - 3} more` : ''}
                                                </small>
                                            </td>
                                            <td>${s.session.status === 'open' ? raw('<span class="badge text-bg-success">Open</span>') : raw('<span class="badge text-bg-secondary">Closed</span>')}</td>
                                            <td class="text-end text-success fw-bold">${s.session.totalAmount.toLocaleString()}</td>
                                        </tr>
                                    `)}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- 5. Silver Earned Overview -->
                    <div class="card p-3 dashboard-card">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h2 class="h5 mb-0">Silver Earned Overview</h2>
                            <select class="form-select form-select-sm w-auto" onchange="window.location.search = '?days=' + this.value">
                                <option value="7" ${days === '7' ? 'selected' : ''}>Last 7 Days</option>
                                <option value="30" ${days === '30' ? 'selected' : ''}>Last 30 Days</option>
                                <option value="60" ${days === '60' ? 'selected' : ''}>Last 60 Days</option>
                                <option value="90" ${days === '90' ? 'selected' : ''}>Last 90 Days</option>
                                <option value="lifetime" ${days === 'lifetime' ? 'selected' : ''}>Lifetime</option>
                            </select>
                        </div>
                        <div class="chart-container">
                            <canvas id="balanceChart"></canvas>
                        </div>
                    </div>

                    <!-- 6. Issuer Statistics -->
                    <div class="card p-3 dashboard-card">
                        <h2 class="h5 mb-3">Issuer Statistics</h2>
                        <div class="table-responsive">
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

            
            <!-- History Modal -->
            <div class="modal fade" id="historyModal" tabindex="-1" aria-labelledby="historyModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered modal-lg text-light">
                    <div class="modal-content text-bg-dark">
                        <div class="modal-header border-secondary">
                            <h5 class="modal-title" id="historyModalLabel">Transaction History</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="table-responsive">
                                <table id="historyDataTable" class="table table-hover table-striped table-dark w-100">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Amount</th>
                                            <th>Admin</th>
                                            <th>Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody id="historyTableBody">
                                        <!-- Populated via JS -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="modal-footer border-secondary">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
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
                        order: [], // Preserve SQL sorting (Open first)
                        pageLength: 5,
                        lengthMenu: [5, 10, 25]
                    });
                    $('#issuerTable').DataTable({
                        order: [[1, 'desc']],
                        pageLength: 5,
                        lengthMenu: [5, 10, 25]
                    });

                    $('.wipe-btn').on('click', function() {
                        const id = $(this).data('id');
                        if (confirm("Are you sure you want to forcibly wipe this user's balance to 0?")) {
                            $.post('/api/admin/wipe/' + id, function() {
                                location.reload();
                            });
                        }
                    });
                    
                    
                    let historyDataTable = null;
                    $('.history-btn').on('click', function() {
                        const id = $(this).data('id');
                        const name = $(this).data('name');
                        $('#historyModalLabel').text('Transaction History: ' + name);
                        
                        $.get('/api/admin/history/' + id, function(data) {
                            if (historyDataTable) {
                                historyDataTable.destroy();
                            }
                            
                            const tbody = $('#historyTableBody');
                            tbody.empty();
                            
                            data.forEach(tx => {
                                const date = new Date(tx.createdAt).toLocaleString();
                                const amountClass = tx.amount >= 0 ? 'text-success' : 'text-danger';
                                const amountSign = tx.amount > 0 ? '+' : '';
                                
                                let adminDisplay = tx.adminUsername || tx.adminDiscordId;
                                if (tx.adminDiscordId === id) {
                                    adminDisplay = '<abbr title="Self-Added" class="text-warning text-decoration-underline"><i>' + adminDisplay + '*</i></abbr>';
                                }
                                
                                tbody.append(
                                    '<tr>' +
                                        '<td>' + date + '</td>' +
                                        '<td class="fw-bold ' + amountClass + '">' + amountSign + tx.amount.toLocaleString() + '</td>' +
                                        '<td>' + adminDisplay + '</td>' +
                                        '<td>' + (tx.reason || '-') + '</td>' +
                                    '</tr>'
                                );
                            });
                            
                            historyDataTable = $('#historyDataTable').DataTable({
                                order: [[0, 'desc']],
                                pageLength: 5,
                                lengthMenu: [5, 10, 25]
                            });
                            
                            const modal = new bootstrap.Modal(document.getElementById('historyModal'));
                            modal.show();
                        });
                    });
                    
                    // Column Toggle Logic
                    $('.col-btn').on('click', function() {
                        $('.col-btn').removeClass('btn-primary').addClass('btn-secondary');
                        $(this).removeClass('btn-secondary').addClass('btn-primary');
                        $('#mainGrid').attr('data-cols', $(this).data('col'));
                        
                        // Give browser time to reflow grid before telling chart.js to resize
                        setTimeout(() => {
                            window.dispatchEvent(new Event('resize'));
                        }, 50);
                    });
                });

                const currentBalanceLabels = ${raw(JSON.stringify(currentBalanceLabels))};
                const currentBalanceData = ${raw(JSON.stringify(currentBalanceData))};
                
                const currentBalCtx = document.getElementById('currentBalanceChart');
                new Chart(currentBalCtx, {
                    type: 'bar',
                    data: {
                        labels: currentBalanceLabels,
                        datasets: [{
                            label: 'Current Owed Balance',
                            data: currentBalanceData,
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

                const balCtx = document.getElementById('balanceChart');
                new Chart(balCtx, {
                    type: 'bar',
                    data: {
                        labels: ${raw(JSON.stringify(balanceLabels))},
                        datasets: [{
                            label: 'Silver Earned',
                            data: ${raw(JSON.stringify(balanceData))},
                            backgroundColor: 'rgba(192, 192, 192, 0.4)',
                            borderColor: 'rgba(160, 160, 160, 1)',
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