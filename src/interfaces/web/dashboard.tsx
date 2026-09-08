/** @jsxImportSource hono/jsx */
import { Hono } from 'hono';
import { raw } from 'hono/html';
import { BalanceService } from '../../application/services/BalanceService';
import { SessionService } from '../../application/services/SessionService';
import { ActivityService } from '../../application/services/ActivityService';
import { UserService } from '../../application/services/UserService';

export const webRouter = new Hono<{ Bindings: { DISCORD_TOKEN: string }, Variables: { balanceService: BalanceService, sessionService: SessionService, activityService: ActivityService, userService: UserService } }>();

// --- PRIMITIVE UI COMPONENTS ---

const Button = ({ children, variant, id, className = '', ...props }: any) => {
    const baseStyle = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2";
    let variantStyle = "bg-brand text-white hover:bg-brand-hover shadow-sm";

    if (variant === 'secondary') variantStyle = "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700";
    if (variant === 'outline') variantStyle = "border border-zinc-700 bg-transparent hover:bg-zinc-800 text-zinc-300";
    if (variant === 'danger') variantStyle = "bg-red-950/50 text-red-400 hover:bg-red-900 border border-red-900/50";

    return (
        <button id={id} className={`${baseStyle} ${variantStyle} ${className}`} {...props}>
            {children}
        </button>
    );
};

const Card = ({ title, children, headerAction, className = '' }: any) => {
    return (
        <article className={`rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-100 shadow flex flex-col h-full min-w-0 ${className}`}>
            <div className="flex flex-col space-y-1.5 p-5 pb-4">
                <div className="flex justify-between items-center gap-4">
                    <h3 className="font-semibold leading-none tracking-tight text-lg m-0">{title}</h3>
                    {headerAction && <div>{headerAction}</div>}
                </div>
            </div>
            <div className="p-5 pt-0 flex-1 flex flex-col min-w-0">
                {children}
            </div>
        </article>
    );
};

// --- DOMAIN COMPONENTS ---

const UsersLedger = ({ users }: { users: any[] }) => (
    <Card title="Users Ledger">
        <div className="relative w-full overflow-auto flex-1">
            <table id="usersTable" className="w-full text-sm text-left">
                <thead className="text-zinc-400 border-b border-zinc-800">
                    <tr>
                        <th className="h-10 px-2 font-medium">Discord ID</th>
                        <th className="h-10 px-2 font-medium text-right">Owed Balance</th>
                        <th className="h-10 px-2 font-medium text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                    {users.map(u => (
                        <tr className="transition-colors hover:bg-zinc-800/30">
                            <td className="p-2 align-middle">{u.username}</td>
                            <td className="p-2 align-middle text-right font-bold text-brand">
                                {u.balance.toLocaleString()}
                            </td>
                            <td className="p-2 align-middle text-right">
                                <Button variant="secondary" className="history-btn mr-2 h-7 px-3 text-xs" data-id={u.discordId} data-name={u.username}>History</Button>
                                <Button variant="danger" className="wipe-btn h-7 px-3 text-xs" data-id={u.discordId}>Wipe</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </Card>
);

const ActiveSplitsTab = ({ sessions }: { sessions: any[] }) => (
    <Card title="Party Tabs">
        <div className="relative w-full overflow-auto flex-1">
            <table id="activeSplitsTable" className="w-full text-sm text-left">
                <thead className="text-zinc-400 border-b border-zinc-800">
                    <tr>
                        <th className="h-10 px-2 font-medium">Session Name</th>
                        <th className="h-10 px-2 font-medium">Roster</th>
                        <th className="h-10 px-2 font-medium">Status</th>
                        <th className="h-10 px-2 font-medium text-right">Current Pool</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                    {sessions.map(s => (
                        <tr className="transition-colors hover:bg-zinc-800/30">
                            <td className="p-2 align-middle font-bold text-zinc-200">{s.session.name}</td>
                            <td className="p-2 align-middle text-zinc-400">
                                <small>
                                    {s.memberUsernames.slice(0, 3).join(', ')}
                                    {s.memberUsernames.length > 3 ? ` + ${s.memberUsernames.length - 3} more` : ''}
                                </small>
                            </td>
                            <td className="p-2 align-middle">
                                {s.session.status === 'open'
                                    ? <span className="inline-flex items-center rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">Open</span>
                                    : <span className="inline-flex items-center rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-400">Closed</span>
                                }
                            </td>
                            <td className="p-2 align-middle text-right font-bold text-brand">
                                {s.session.totalAmount.toLocaleString()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </Card>
);

const IssuerStatsTab = ({ stats }: { stats: any[] }) => (
    <Card title="Issuer Statistics">
        <div className="relative w-full overflow-auto flex-1">
            <table id="issuerTable" className="w-full text-sm text-left">
                <thead className="text-zinc-400 border-b border-zinc-800">
                    <tr>
                        <th className="h-10 px-2 font-medium">Admin</th>
                        <th className="h-10 px-2 font-medium text-right">Tx Count</th>
                        <th className="h-10 px-2 font-medium text-right">Net Flow</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                    {stats.map(issuer => (
                        <tr className="transition-colors hover:bg-zinc-800/30">
                            <td className="p-2 align-middle">{issuer.username}</td>
                            <td className="p-2 align-middle text-right text-zinc-400">{issuer.txCount}</td>
                            <td className={`p-2 align-middle text-right font-medium ${issuer.totalAmount >= 0 ? 'text-brand' : 'text-red-400'}`}>
                                {issuer.totalAmount > 0 ? '+' : ''}{issuer.totalAmount.toLocaleString()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </Card>
);

// --- LAYOUT & MAIN PAGE ---

const DashboardLayout = ({ title, children, scripts }: any) => (
    <html lang="en" className="dark">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>{title}</title>

            {/* Tailwind CSS CDN */}
            <script src="https://cdn.tailwindcss.com"></script>

            {/* Tailwind Configuration */}
            <script dangerouslySetInnerHTML={{
                __html: `
            tailwind.config = {
                darkMode: 'class',
                theme: {
                    extend: {
                        colors: {
                            // 👇 EDIT THIS COLOR to completely change the theme of the dashboard 👇
                            brand: {
                                DEFAULT: '#da51b3', // Pink (Default)
                                hover: '#c1208b',   // Darker Pink
                                muted: '#a50e91'    // Deep Pink
                            }
                        }
                    }
                }
            }
        `}}></script>

            {/* DataTables base CSS (neutral) */}
            <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/jquery.dataTables.min.css" />
            <style dangerouslySetInnerHTML={{
                __html: `
            /* Fix DataTables with Tailwind Dark Mode */
            .dataTables_wrapper .dataTables_length, .dataTables_wrapper .dataTables_filter, .dataTables_wrapper .dataTables_info, .dataTables_wrapper .dataTables_processing, .dataTables_wrapper .dataTables_paginate {
                color: #a1a1aa !important; /* zinc-400 */
                font-size: 0.875rem;
                margin-bottom: 0.5rem;
            }
            .dataTables_wrapper .dataTables_paginate .paginate_button {
                color: #a1a1aa !important;
            }
            .dataTables_wrapper .dataTables_paginate .paginate_button.current {
                background: #27272a !important; /* zinc-800 */
                border-color: #3f3f46 !important; /* zinc-700 */
                color: #f4f4f5 !important;
            }
            table.dataTable tbody tr { background-color: transparent !important; }
            table.dataTable.no-footer { border-bottom: 1px solid #27272a !important; }
            .dataTables_wrapper select, .dataTables_wrapper input {
                background-color: #18181b;
                border: 1px solid #3f3f46;
                color: #f4f4f5;
                border-radius: 0.375rem;
                padding: 0.25rem 0.5rem;
            }
            
            /* Dialog Backdrop */
            dialog::backdrop {
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(4px);
            }
        `}}></style>
        </head>
        <body className="bg-[#0a0a0a] text-zinc-300 min-h-screen p-4 md:p-8 selection:bg-brand selection:text-white">
            <div className="mx-auto w-[95%] max-w-[1600px]">
                {children}
            </div>

            {/* History Modal - Native Dialog styled with Tailwind */}
            <dialog id="historyModal" className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-0 w-full max-w-3xl text-zinc-100 open:animate-in open:fade-in open:zoom-in-95">
                <div className="flex flex-col h-full max-h-[80vh]">
                    <div className="flex justify-between items-center p-5 border-b border-zinc-800">
                        <h3 id="historyModalLabel" className="font-semibold text-lg m-0">Transaction History</h3>
                        <button onClick={raw("document.getElementById('historyModal').close()")} className="text-zinc-400 hover:text-white transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                    </div>
                    <div className="p-5 overflow-auto flex-1">
                        <table id="historyDataTable" className="w-full text-sm text-left">
                            <thead className="text-zinc-400 border-b border-zinc-800">
                                <tr>
                                    <th className="h-10 px-2 font-medium">Date</th>
                                    <th className="h-10 px-2 font-medium">Amount</th>
                                    <th className="h-10 px-2 font-medium">Admin</th>
                                    <th className="h-10 px-2 font-medium">Reason</th>
                                </tr>
                            </thead>
                            <tbody id="historyTableBody" className="divide-y divide-zinc-800">
                            </tbody>
                        </table>
                    </div>
                    <div className="p-5 border-t border-zinc-800 flex justify-end">
                        <Button variant="secondary" onClick={raw("document.getElementById('historyModal').close()")}>Close</Button>
                    </div>
                </div>
            </dialog>

            {/* JS Dependencies */}
            <script src="https://code.jquery.com/jquery-3.7.0.min.js"></script>
            <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            {scripts && <script dangerouslySetInnerHTML={{ __html: scripts }}></script>}
        </body>
    </html>
);

// --- ROUTER ROUTE ---

webRouter.get('/', async (c) => {
    const balanceService = c.get('balanceService');
    const sessionService = c.get('sessionService');
    const activityService = c.get('activityService');
    const userService = c.get('userService');

    let usersWithBalances = await balanceService.getAllUsersWithBalances();
    usersWithBalances = usersWithBalances.filter(u => u.balance !== 0);
    const totalStandingBalance = usersWithBalances.reduce((sum, u) => sum + u.balance, 0);

    const allDiscordIds = [...usersWithBalances.map(u => u.discordId)];
    const usernameMap = await userService.resolveUsernames(allDiscordIds, c.env.DISCORD_TOKEN);
    const getUsername = (id: string) => usernameMap.get(id) ?? 'Unknown User';

    const usersWithUsernames = usersWithBalances.map(u => ({
        ...u,
        username: getUsername(u.discordId)
    }));

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

    let activityLeaderboard = await activityService.getActivityLeaderboard(startDate, '2099-12-31');
    activityLeaderboard = activityLeaderboard.filter(a => a.splitsAttended > 0);

    const remainingIds = [...activityLeaderboard.map(a => a.discordId)];
    const remainingMap = await userService.resolveUsernames(remainingIds, c.env.DISCORD_TOKEN);
    remainingMap.forEach((v, k) => usernameMap.set(k, v));

    const activityWithUsernames = activityLeaderboard.map(a => ({
        ...a,
        username: getUsername(a.discordId)
    }));

    const issuerStats = await balanceService.getIssuerStats();
    const issuerIdsToResolve = issuerStats.map(i => i.adminDiscordId).filter(id => id !== 'WEB_ADMIN');
    const issuerMap = await userService.resolveUsernames(issuerIdsToResolve, c.env.DISCORD_TOKEN);
    issuerMap.forEach((v, k) => usernameMap.set(k, v));

    const issuerStatsWithUsernames = issuerStats.map(issuer => ({
        ...issuer,
        username: issuer.adminDiscordId === 'WEB_ADMIN' ? 'Web Admin' : getUsername(issuer.adminDiscordId)
    }));

    const openSessions = await sessionService.getAllSessionsWithMembers();
    const memberIds = openSessions.flatMap(s => s.members);
    const memberMap = await userService.resolveUsernames(memberIds, c.env.DISCORD_TOKEN);
    memberMap.forEach((v, k) => usernameMap.set(k, v));

    const allSessionsWithUsernames = openSessions.map(s => ({
        session: s.session,
        memberUsernames: s.members.map(id => getUsername(id))
    }));

    const currentBalanceLabels = usersWithUsernames.map(u => u.username);
    const currentBalanceData = usersWithUsernames.map(u => u.balance);

    const earnings = await balanceService.getEarningsPerUser(startDate, '2099-12-31');
    const earningsIds = earnings.map(e => e.discordId);
    const earningsMap = await userService.resolveUsernames(earningsIds, c.env.DISCORD_TOKEN);
    earningsMap.forEach((v, k) => usernameMap.set(k, v));

    const earningsWithUsernames = earnings.map(e => ({
        ...e,
        username: getUsername(e.discordId)
    }));

    const balanceLabels = earningsWithUsernames.map(e => e.username);
    const balanceData = earningsWithUsernames.map(e => e.earned);

    const activityLabels = activityWithUsernames.map(a => a.username);
    const activityData = activityWithUsernames.map(a => a.splitsAttended);

    const debtOverTime = await balanceService.getDebtOverTime(startDate, '2099-12-31');
    const debtDays = debtOverTime.map(d => d.day);
    const debtNewData = debtOverTime.map(d => d.newDebt);
    const debtTotalData = debtOverTime.map(d => d.totalDebt);

    const clientScripts = `
        function showToast(message, type) {
            type = type || 'success';
            const brandColor = tailwind.config.theme.extend.colors.brand.DEFAULT;
            const color = type === 'success' ? brandColor : type === 'warning' ? '#f59e0b' : '#ef4444';
            
            const t = document.createElement('div');
            t.className = "fixed bottom-5 right-5 z-50 p-4 rounded-lg shadow-xl border-l-4 bg-zinc-900 text-zinc-100 flex items-center gap-3 transition-all transform translate-y-0 opacity-100";
            t.style.borderColor = color;
            t.innerHTML = '<div>' + message + '</div>';
            
            document.body.appendChild(t);
            setTimeout(() => {
                t.style.opacity = '0';
                t.style.transform = 'translateY(10px)';
                setTimeout(() => t.remove(), 300);
            }, 4000);
        }

        $(document).ready(function() {
            $('#usersTable').DataTable({ order: [[1, 'desc']], pageLength: 5, lengthMenu: [5, 10, 25, 50], dom: '<"flex justify-between items-center mb-2"lf>rt<"flex justify-between items-center mt-2"ip>' });
            $('#activeSplitsTable').DataTable({ order: [], pageLength: 5, lengthMenu: [5, 10, 25], dom: '<"flex justify-between items-center mb-2"lf>rt<"flex justify-between items-center mt-2"ip>' });
            $('#issuerTable').DataTable({ order: [[1, 'desc']], pageLength: 5, lengthMenu: [5, 10, 25], dom: '<"flex justify-between items-center mb-2"lf>rt<"flex justify-between items-center mt-2"ip>' });

            $('#usersTable').on('click', '.wipe-btn', function() {
                const id = $(this).data('id');
                if (confirm("Are you sure you want to forcibly wipe this user's balance to 0?")) {
                    $.post('/api/admin/wipe/' + id, function() { location.reload(); });
                }
            });
            
            let historyDataTable = null;
            $('#usersTable').on('click', '.history-btn', function() {
                const id = $(this).data('id');
                const name = $(this).data('name');
                $('#historyModalLabel').text('Transaction History: ' + name);
                
                $.get('/api/admin/history/' + id, function(data) {
                    if (historyDataTable) historyDataTable.destroy();
                    const tbody = $('#historyTableBody');
                    tbody.empty();
                    
                    data.forEach(tx => {
                        const date = new Date(tx.createdAt).toLocaleString();
                        const amountColor = tx.amount >= 0 ? 'text-brand' : 'text-red-400';
                        const amountSign = tx.amount > 0 ? '+' : '';
                        
                        let adminDisplay = tx.adminUsername || tx.adminDiscordId;
                        if (tx.adminDiscordId === id) adminDisplay = '<u class="text-amber-500 decoration-dotted cursor-help" title="Self-Added"><i>' + adminDisplay + '*</i></u>';
                        
                        tbody.append(
                            '<tr class="transition-colors hover:bg-zinc-800/30">' +
                                '<td class="p-2 align-middle text-zinc-300">' + date + '</td>' +
                                '<td class="p-2 align-middle font-bold ' + amountColor + '">' + amountSign + tx.amount.toLocaleString() + '</td>' +
                                '<td class="p-2 align-middle text-zinc-200">' + adminDisplay + '</td>' +
                                '<td class="p-2 align-middle text-zinc-400">' + (tx.reason || '-') + '</td>' +
                            '</tr>'
                        );
                    });
                    
                    historyDataTable = $('#historyDataTable').DataTable({ order: [[0, 'desc']], pageLength: 5, lengthMenu: [5, 10, 25], dom: '<"flex justify-between items-center mb-2"lf>rt<"flex justify-between items-center mt-2"ip>' });
                    document.getElementById('historyModal').showModal();
                });
            });
            
            $('#syncBtn').on('click', function() {
                const btn = $(this);
                btn.prop('disabled', true).text('Syncing...');
                $.post('/api/admin/sync-usernames')
                    .done(function(data) {
                        const msg = data.total === 0 ? 'All usernames are already synced!' : 'Synced ' + data.synced + ' of ' + data.total + ' usernames (' + data.failed + ' failed).';
                        showToast(msg, data.failed > 0 ? 'warning' : 'success');
                        if (data.synced > 0) setTimeout(function() { location.reload(); }, 1500);
                    })
                    .fail(function() { showToast('Sync failed. Check logs.', 'danger'); })
                    .always(function() { btn.prop('disabled', false).text('Sync Usernames'); });
            });

            $('.col-btn').on('click', function() {
                $('.col-btn').removeClass('bg-zinc-700 text-white').addClass('text-zinc-400 hover:text-zinc-200');
                $(this).removeClass('text-zinc-400 hover:text-zinc-200').addClass('bg-zinc-700 text-white');
                
                const cols = $(this).data('col');
                const grid = $('#mainGrid');
                
                // Remove existing grid col classes
                grid.removeClass('lg:grid-cols-1 lg:grid-cols-2 lg:grid-cols-3');
                grid.addClass('lg:grid-cols-' + cols);
                
                // Force Chart.js to recalculate its canvas dimensions explicitly
                setTimeout(() => {
                    Object.values(Chart.instances).forEach(chart => chart.resize());
                }, 100);
            });
        });

        // Dynamic Brand Color for Charts
        const brandColor = tailwind.config.theme.extend.colors.brand.DEFAULT;
        const brandBg = tailwind.config.theme.extend.colors.brand.DEFAULT + '33'; // 20% opacity hex
        const chartOptions = { responsive: true, maintainAspectRatio: false, color: '#a1a1aa', scales: { y: { beginAtZero: true, grid: { color: '#27272a' }, ticks: { color: '#a1a1aa' } }, x: { grid: { color: '#27272a' }, ticks: { color: '#a1a1aa' } } } };

        const currentBalanceLabels = ${JSON.stringify(currentBalanceLabels)};
        const currentBalanceData = ${JSON.stringify(currentBalanceData)};
        new Chart(document.getElementById('currentBalanceChart'), {
            type: 'bar',
            data: { labels: currentBalanceLabels, datasets: [{ label: 'Current Owed Balance', data: currentBalanceData, backgroundColor: brandBg, borderColor: brandColor, borderWidth: 1, borderRadius: 4 }] },
            options: chartOptions
        });

        const balanceLabels = ${JSON.stringify(balanceLabels)};
        const balanceData = ${JSON.stringify(balanceData)};
        new Chart(document.getElementById('balanceChart'), {
            type: 'bar',
            data: { labels: balanceLabels, datasets: [{ label: 'Silver Earned', data: balanceData, backgroundColor: 'rgba(161, 161, 170, 0.2)', borderColor: '#a1a1aa', borderWidth: 1, borderRadius: 4 }] },
            options: chartOptions
        });

        const activityLabels = ${JSON.stringify(activityLabels)};
        const activityData = ${JSON.stringify(activityData)};
        new Chart(document.getElementById('activityChart'), {
            type: 'line',
            data: { labels: activityLabels, datasets: [{ label: 'Splits Attended', data: activityData, backgroundColor: brandBg, borderColor: brandColor, borderWidth: 2, fill: true, tension: 0.4, pointBackgroundColor: '#0a0a0a' }] },
            options: chartOptions
        });

        const debtDays = ${JSON.stringify(debtDays)};
        const debtNewData = ${JSON.stringify(debtNewData)};
        const debtTotalData = ${JSON.stringify(debtTotalData)};
        
        new Chart(document.getElementById('totalDebtChart'), {
            type: 'line',
            data: {
                labels: debtDays,
                datasets: [
                    {
                        label: 'Total Owed',
                        data: debtTotalData,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#0a0a0a'
                    }
                ]
            },
            options: chartOptions
        });

        new Chart(document.getElementById('newDebtChart'), {
            type: 'bar',
            data: {
                labels: debtDays,
                datasets: [
                    {
                        label: 'New Debt Created',
                        data: debtNewData,
                        backgroundColor: brandBg,
                        borderColor: brandColor,
                        borderWidth: 1,
                        borderRadius: 4
                    }
                ]
            },
            options: chartOptions
        });
    `;

    return c.html(
        <DashboardLayout title="Admin Dashboard" scripts={raw(clientScripts)}>
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h1 className="text-2xl font-bold tracking-tight text-white m-0 flex items-center flex-wrap gap-2">
                    Albion Online Silver Balances
                    <span className="text-brand font-medium text-xl">(Total Owed: {totalStandingBalance.toLocaleString()})</span>
                </h1>

                <div className="flex flex-wrap items-center gap-3">
                    <Button id="syncBtn" variant="outline">🔄 Sync Usernames</Button>
                    <div className="flex bg-zinc-900 border border-zinc-800 rounded-md p-1">
                        <button className="col-btn px-3 py-1 text-sm rounded-sm font-medium transition-colors text-zinc-400 hover:text-zinc-200" data-col="1">1 Col</button>
                        <button className="col-btn px-3 py-1 text-sm rounded-sm font-medium transition-colors bg-zinc-700 text-white shadow-sm" data-col="2">2 Cols</button>
                        <button className="col-btn px-3 py-1 text-sm rounded-sm font-medium transition-colors text-zinc-400 hover:text-zinc-200" data-col="3">3 Cols</button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="mainGrid">

                {/* 1. Current Owed Balance Chart */}
                <Card title="Current Owed Balance" className="min-h-[400px]">
                    <div className="relative w-full h-full flex-1 min-w-0 min-h-0">
                        <canvas id="currentBalanceChart"></canvas>
                    </div>
                </Card>

                {/* 2. Users Ledger Table */}
                <UsersLedger users={usersWithUsernames} />

                {/* 3. Activity Tracker Chart */}
                <Card
                    title="Activity Tracker (Splits Attended)"
                    className="min-h-[400px]"
                    headerAction={
                        <select
                            className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-md focus:ring-brand focus:border-brand block w-full p-2"
                            onChange={raw("window.location.search = '?days=' + this.value")}
                        >
                            <option value="7" selected={days === '7'}>Last 7 Days</option>
                            <option value="30" selected={days === '30'}>Last 30 Days</option>
                            <option value="60" selected={days === '60'}>Last 60 Days</option>
                            <option value="90" selected={days === '90'}>Last 90 Days</option>
                            <option value="lifetime" selected={days === 'lifetime'}>Lifetime</option>
                        </select>
                    }
                >
                    <div className="relative w-full h-full flex-1 min-w-0 min-h-0">
                        <canvas id="activityChart"></canvas>
                    </div>
                </Card>

                {/* 4. Active Party Tabs */}
                <ActiveSplitsTab sessions={allSessionsWithUsernames} />

                {/* 5. Silver Earned Overview Chart */}
                <Card
                    title="Silver Earned Overview"
                    className="min-h-[400px]"
                    headerAction={
                        <select
                            className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-md focus:ring-brand focus:border-brand block w-full p-2"
                            onChange={raw("window.location.search = '?days=' + this.value")}
                        >
                            <option value="7" selected={days === '7'}>Last 7 Days</option>
                            <option value="30" selected={days === '30'}>Last 30 Days</option>
                            <option value="60" selected={days === '60'}>Last 60 Days</option>
                            <option value="90" selected={days === '90'}>Last 90 Days</option>
                            <option value="lifetime" selected={days === 'lifetime'}>Lifetime</option>
                        </select>
                    }
                >
                    <div className="relative w-full h-full flex-1 min-w-0 min-h-0">
                        <canvas id="balanceChart"></canvas>
                    </div>
                </Card>

                {/* 6. Total Debt Over Time Chart */}
                <Card
                    title="Total Debt Over Time"
                    className="min-h-[400px]"
                    headerAction={
                        <select
                            className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-md focus:ring-brand focus:border-brand block w-full p-2"
                            onChange={raw("window.location.search = '?days=' + this.value")}
                        >
                            <option value="7" selected={days === '7'}>Last 7 Days</option>
                            <option value="30" selected={days === '30'}>Last 30 Days</option>
                            <option value="60" selected={days === '60'}>Last 60 Days</option>
                            <option value="90" selected={days === '90'}>Last 90 Days</option>
                            <option value="lifetime" selected={days === 'lifetime'}>Lifetime</option>
                        </select>
                    }
                >
                    <div className="relative w-full h-full flex-1 min-w-0 min-h-0">
                        <canvas id="totalDebtChart"></canvas>
                    </div>
                </Card>

                {/* 7. New Debt Created Chart */}
                <Card
                    title="New Debt Created"
                    className="min-h-[400px]"
                    headerAction={
                        <select
                            className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-md focus:ring-brand focus:border-brand block w-full p-2"
                            onChange={raw("window.location.search = '?days=' + this.value")}
                        >
                            <option value="7" selected={days === '7'}>Last 7 Days</option>
                            <option value="30" selected={days === '30'}>Last 30 Days</option>
                            <option value="60" selected={days === '60'}>Last 60 Days</option>
                            <option value="90" selected={days === '90'}>Last 90 Days</option>
                            <option value="lifetime" selected={days === 'lifetime'}>Lifetime</option>
                        </select>
                    }
                >
                    <div className="relative w-full h-full flex-1 min-w-0 min-h-0">
                        <canvas id="newDebtChart"></canvas>
                    </div>
                </Card>

                {/* 6. Issuer Statistics Table */}
                <IssuerStatsTab stats={issuerStatsWithUsernames} />

            </div>
        </DashboardLayout>
    );
});

