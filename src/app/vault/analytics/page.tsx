'use client'

import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Lock, Monitor, Package, BarChart3, Wallet, Clock, Gamepad2, Coffee, Activity, Crosshair, Trophy, TrendingUp, TrendingDown, Crown, RefreshCw, MessageSquare, Calendar, X, Copy } from 'lucide-react';

function formatINR(num: number) {
  return Math.round(num || 0).toLocaleString('en-IN');
}

function getTodayString() {
  const d = new Date();
  const options = { timeZone: 'Asia/Kolkata', year: 'numeric' as const, month: '2-digit' as const, day: '2-digit' as const };
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  return formatter.format(d);
}

export default function MasterAnalyticsVault() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Time Filter State
  const [timeFilter, setTimeFilter] = useState('MTD');

  // Dynamic Filtered Data Vault
  const [filteredMetrics, setFilteredMetrics] = useState({
    grossRev: 0, gamingRev: 0, fnbRev: 0, fnbProfit: 0, totalExpenses: 0, netProfit: 0,
    sysBreakdown: { PC: 0, PS5: 0, SIM: 0 } as Record<string, number>
  });

  // Top 20 Lifetime Leaderboard
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // Raw Data Storage arrays
  const [rawSales, setRawSales] = useState<any[]>([]);
  const [rawCafe, setRawCafe] = useState<any[]>([]);
  const [rawExp, setRawExp] = useState<any[]>([]);

  // Daily Report Modal State
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportDate, setReportDate] = useState(getTodayString());

  // Background refresh polling loop
  useEffect(() => {
    let interval: any;
    if (isUnlocked) {
      fetchAllRawData();
      interval = setInterval(fetchAllRawData, 30000); 
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isUnlocked]);

  useEffect(() => {
    if (rawSales.length > 0 || rawCafe.length > 0 || rawExp.length > 0) {
      applyFiltersAndCalculate();
    }
  }, [timeFilter, rawSales, rawCafe, rawExp]);

  async function fetchAllRawData() {
    setIsProcessing(true);
    const step = 1000;
    
    // Descending order guarantees the freshest data is pulled instantly
    let allSales: any[] = []; let start = 0; let hasMore = true;
    while (hasMore) { const { data } = await supabase.from('sales').select('*').eq('status', 'Completed').order('id', { ascending: false }).range(start, start + step - 1); if (data && data.length > 0) { allSales.push(...data); start += step; if (data.length < step) hasMore = false; } else hasMore = false; }

    let allCafe: any[] = []; start = 0; hasMore = true;
    while (hasMore) { const { data } = await supabase.from('cafe_orders').select('*').order('id', { ascending: false }).range(start, start + step - 1); if (data && data.length > 0) { allCafe.push(...data); start += step; if (data.length < step) hasMore = false; } else hasMore = false; }

    let allExp: any[] = []; start = 0; hasMore = true;
    while (hasMore) { const { data } = await supabase.from('expenses').select('*').order('id', { ascending: false }).range(start, start + step - 1); if (data && data.length > 0) { allExp.push(...data); start += step; if (data.length < step) hasMore = false; } else hasMore = false; }

    setRawSales(allSales); setRawCafe(allCafe); setRawExp(allExp);

    // Lifetime Leaderboard
    const gamerMap: Record<string, {name: string, spend: number, hours: number, visits: number}> = {};
    allSales.forEach(s => {
       const customer = s.customer?.trim() || 'Guest';
       if (customer.toLowerCase() !== 'guest' && customer !== '') {
          if (!gamerMap[customer]) gamerMap[customer] = { name: customer, spend: 0, hours: 0, visits: 0 };
          gamerMap[customer].spend += Number(s.total || 0);
          gamerMap[customer].hours += Number(s.duration || 0);
          gamerMap[customer].visits += 1;
       }
    });
    const sortedGamers = Object.values(gamerMap).sort((a, b) => b.spend - a.spend).slice(0, 20);
    setLeaderboard(sortedGamers);

    setIsProcessing(false);
  }

  function applyFiltersAndCalculate() {
    const today = new Date(); today.setHours(0,0,0,0);
    let startLimit = new Date(0); let endLimit = new Date(3000, 0, 1);

    if (timeFilter === 'Today') { startLimit = today; endLimit = new Date(today.getTime() + 86400000); }
    if (timeFilter === 'Yesterday') { const y = new Date(today); y.setDate(y.getDate() - 1); startLimit = y; endLimit = today; }
    if (timeFilter === 'WTD') { const day = today.getDay(); const diff = today.getDate() - day + (day === 0 ? -6 : 1); const mon = new Date(today); mon.setDate(diff); startLimit = mon; endLimit = new Date(today.getTime() + 86400000); }
    if (timeFilter === 'Last Week') { const day = today.getDay(); const diff = today.getDate() - day + (day === 0 ? -6 : 1); const monThis = new Date(today); monThis.setDate(diff); const monLast = new Date(monThis); monLast.setDate(monLast.getDate() - 7); startLimit = monLast; endLimit = monThis; }
    if (timeFilter === 'MTD') { startLimit = new Date(today.getFullYear(), today.getMonth(), 1); endLimit = new Date(today.getTime() + 86400000); }
    if (timeFilter === 'Last Month') { startLimit = new Date(today.getFullYear(), today.getMonth() - 1, 1); endLimit = new Date(today.getFullYear(), today.getMonth(), 1); }

    // Bulletproof resilient historical parser
    const isDateInFilter = (dateStr: string) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d >= startLimit && d < endLimit;
    };

    let f_grossRev = 0; let f_gamingRev = 0; let f_fnbRev = 0; let f_fnbCost = 0; let f_expenses = 0;
    let f_pcRev = 0; let f_ps5Rev = 0; let f_simRev = 0;

    rawSales.forEach(s => {
       if (timeFilter === 'Lifetime' || isDateInFilter(s.date)) {
           const gameCost = Math.max(0, Number(s.total || 0) - Number(s.fnb_total || 0));
           f_gamingRev += gameCost;
           f_grossRev += Number(s.total || 0);

           if (String(s.system).includes('PC')) f_pcRev += gameCost;
           else if (String(s.system).includes('PS')) f_ps5Rev += gameCost;
           else if (String(s.system).includes('SIM')) f_simRev += gameCost;
       }
    });

    rawCafe.forEach(c => {
       if (timeFilter === 'Lifetime' || isDateInFilter(c.date)) {
           f_fnbRev += Number(c.total_revenue || c.total || c.amount || 0);
           f_fnbCost += Number(c.total_cost || 0);
           const method = String(c.method || c.payment_method || '').toLowerCase().trim();
           if (method !== 'tab') {
              f_grossRev += Number(c.total_revenue || c.total || c.amount || 0);
           }
       }
    });

    rawExp.forEach(e => {
       if (e.status === 'Paid' && e.category !== 'Capital / Opening Balance' && e.category !== 'Bank Deposit') {
           if (timeFilter === 'Lifetime' || isDateInFilter(e.expense_date)) {
               f_expenses += Number(e.amount || 0);
           }
       }
    });

    setFilteredMetrics({
       grossRev: f_grossRev, gamingRev: f_gamingRev, fnbRev: f_fnbRev, 
       fnbProfit: f_fnbRev - f_fnbCost, totalExpenses: f_expenses, netProfit: f_grossRev - f_expenses,
       sysBreakdown: { PC: f_pcRev, PS5: f_ps5Rev, SIM: f_simRev }
    });
  }

  const handleLogin = (e: any) => {
    e.preventDefault();
    if (password === 'Vault@2026') setIsUnlocked(true); else alert('Unauthorized Access');
  };

  if (!isUnlocked) {
    return (
      <div className="flex h-screen w-screen bg-[#05070A] text-white font-sans overflow-hidden">
        <div className="w-16 bg-[#0B0E14] border-r border-[#1E293B] flex flex-col items-center py-4 shrink-0 z-10 gap-4">
          <a href="/" className="p-3 bg-[#1A2235] text-gray-400 hover:text-[#00D0FF] hover:border-[#00D0FF] border border-[#2D3748] rounded-xl transition-all shadow-sm" title="Live Floor"><Monitor size={20} /></a>
          <a href="/vault/inventory" className="p-3 bg-[#1A2235] text-gray-400 hover:text-[#00D0FF] hover:border-[#00D0FF] border border-[#2D3748] rounded-xl transition-all shadow-sm" title="Inventory"><Package size={20} /></a>
          <div className="p-3 bg-orange-500/20 text-orange-500 border border-orange-500 rounded-xl transition-all shadow-[0_0_15px_rgba(249,115,22,0.2)]" title="Master Analytics"><BarChart3 size={20} /></div>
        </div>
        <div className="flex-1 flex items-center justify-center relative">
          <form onSubmit={handleLogin} className="bg-[#121824] p-8 rounded-3xl border border-orange-500/30 shadow-2xl w-full max-w-sm text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-bl-full -mr-10 -mt-10 blur-2xl"></div>
            <div className="flex justify-center mb-4"><Lock size={40} className="text-orange-400 relative z-10"/></div>
            <h2 className="text-2xl font-black mb-6 tracking-tight relative z-10">Master Data Vault</h2>
            <input type="password" placeholder="Vault PIN" className="w-full bg-[#0B0E14] p-4 text-center rounded-xl border border-[#2D3748] focus:border-orange-400 outline-none font-bold tracking-widest mb-4 relative z-10" value={password} onChange={e => setPassword(e.target.value)} />
            <button type="submit" className="w-full bg-orange-500 text-white py-4 rounded-xl font-black hover:bg-orange-600 transition-all shadow-[0_0_15px_rgba(249,115,22,0.3)] relative z-10">Decrypt Analytics</button>
          </form>
        </div>
      </div>
    );
  }

  const pcPct = filteredMetrics.gamingRev > 0 ? (filteredMetrics.sysBreakdown.PC / filteredMetrics.gamingRev) * 100 : 0;
  const ps5Pct = filteredMetrics.gamingRev > 0 ? (filteredMetrics.sysBreakdown.PS5 / filteredMetrics.gamingRev) * 100 : 0;
  const simPct = filteredMetrics.gamingRev > 0 ? (filteredMetrics.sysBreakdown.SIM / filteredMetrics.gamingRev) * 100 : 0;

  return (
    <div className="flex h-screen w-screen bg-[#05070A] text-white font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <div className="w-16 bg-[#0B0E14] border-r border-[#1E293B] flex flex-col items-center py-4 shrink-0 z-10 gap-4">
        <a href="/" className="p-3 bg-[#1A2235] text-gray-400 hover:text-[#00D0FF] hover:border-[#00D0FF] border border-[#2D3748] rounded-xl transition-all shadow-sm" title="Live Floor"><Monitor size={20} /></a>
        <a href="/vault/inventory" className="p-3 bg-[#1A2235] text-gray-400 hover:text-[#00D0FF] hover:border-[#00D0FF] border border-[#2D3748] rounded-xl transition-all shadow-sm" title="Inventory"><Package size={20} /></a>
        <div className="p-3 bg-orange-500/20 text-orange-500 border border-orange-500 rounded-xl transition-all shadow-[0_0_15px_rgba(249,115,22,0.2)]" title="Master Analytics"><BarChart3 size={20} /></div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <div className="flex justify-between items-center shrink-0 border-b border-[#1E293B] pb-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                Gamerarena <span className="text-orange-500">Vault</span>
              </h1>
              <p className="text-gray-500 text-sm mt-1">Live daily pulse and customizable financial performance metrics.</p>
            </div>
            
            <div className="flex items-center gap-4">
              <button onClick={() => { setReportDate(getTodayString()); setReportModalOpen(true); }} className="flex items-center gap-2 bg-[#00D0FF]/10 text-[#00D0FF] hover:bg-[#00D0FF]/20 border border-[#00D0FF]/30 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm">
                <MessageSquare size={14} /> Export Daily Report
              </button>

              <div className="h-6 w-px bg-[#1E293B] mx-1"></div>

              {isProcessing && <span className="text-orange-500 text-sm font-bold animate-pulse">Syncing...</span>}
              <button onClick={fetchAllRawData} disabled={isProcessing} className="flex items-center gap-2 bg-[#1A2235] border border-[#2D3748] hover:border-orange-500 hover:text-orange-500 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm">
                <RefreshCw size={14} className={isProcessing ? "animate-spin" : ""} /> Refresh Data
              </button>
            </div>
          </div>

          {/* ==============================================
              FINANCIAL ANALYTICS SECTION
              ============================================== */}
          <section className="space-y-6 pt-2">
            <div className="flex justify-between items-end mb-4">
               <h2 className="text-xl font-black text-white flex items-center gap-2"><Trophy className="text-orange-500"/> Financial Analytics</h2>
               <select className="bg-[#1A2235] text-white font-bold p-3 rounded-xl border border-[#2D3748] focus:border-orange-500 outline-none shadow-lg text-sm" value={timeFilter} onChange={e => setTimeFilter(e.target.value)}>
                  <option value="Today">Today</option>
                  <option value="Yesterday">Yesterday</option>
                  <option value="WTD">This Week (Mon-Sun)</option>
                  <option value="Last Week">Last Week</option>
                  <option value="MTD">This Month</option>
                  <option value="Last Month">Last Month</option>
                  <option value="Lifetime">Lifetime (All Time)</option>
               </select>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#121824] p-6 rounded-3xl border border-[#1E293B] shadow-lg">
                <div className="flex items-center gap-2 mb-2"><Activity className="text-white" size={16}/><p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Gross Revenue</p></div>
                <p className="text-3xl font-black text-white">₹{formatINR(filteredMetrics.grossRev)}</p>
              </div>
              <div className="bg-[#121824] p-6 rounded-3xl border border-[#1E293B] shadow-lg">
                <div className="flex items-center gap-2 mb-2"><Gamepad2 className="text-[#00D0FF]" size={16}/><p className="text-[#00D0FF] text-[10px] font-black uppercase tracking-widest">Pure Gaming Sales</p></div>
                <p className="text-3xl font-black text-white">₹{formatINR(filteredMetrics.gamingRev)}</p>
              </div>
              <div className="bg-[#121824] p-6 rounded-3xl border border-[#1E293B] shadow-lg">
                <div className="flex items-center gap-2 mb-2"><Coffee className="text-emerald-400" size={16}/><p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">F&B Sales</p></div>
                <p className="text-3xl font-black text-white">₹{formatINR(filteredMetrics.fnbRev)}</p>
              </div>

              <div className="bg-[#121824] p-6 rounded-3xl border border-[#1E293B] shadow-lg">
                <div className="flex items-center gap-2 mb-2"><TrendingUp className="text-emerald-400" size={16}/><p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">F&B Profits (Yours)</p></div>
                <p className="text-3xl font-black text-white">₹{formatINR(filteredMetrics.fnbProfit)}</p>
              </div>
              <div className="bg-[#121824] p-6 rounded-3xl border border-[#1E293B] shadow-lg">
                <div className="flex items-center gap-2 mb-2"><TrendingDown className="text-red-400" size={16}/><p className="text-red-400 text-[10px] font-black uppercase tracking-widest">Total Expenses</p></div>
                <p className="text-3xl font-black text-white">₹{formatINR(filteredMetrics.totalExpenses)}</p>
              </div>
              <div className="bg-gradient-to-br from-[#1A2235] to-[#0B0E14] p-6 rounded-3xl border border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.1)]">
                <div className="flex items-center gap-2 mb-2"><Wallet className="text-orange-500" size={16}/><p className="text-orange-500 text-[10px] font-black uppercase tracking-widest">Net Profit</p></div>
                <p className="text-3xl font-black text-orange-400">₹{formatINR(filteredMetrics.netProfit)}</p>
              </div>
            </div>

            <div className="bg-[#121824] p-6 rounded-3xl border border-[#1E293B] shadow-xl flex flex-col justify-center">
              <h3 className="text-lg font-black text-white flex items-center gap-2 mb-6"><Crosshair className="text-gray-400" size={18}/> Hardware Revenue Share ({timeFilter})</h3>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-2 text-gray-300"><span>High-End PCs (RTX)</span><span className="text-[#00D0FF]">₹{formatINR(filteredMetrics.sysBreakdown.PC)} ({pcPct.toFixed(1)}%)</span></div>
                  <div className="w-full bg-[#0B0E14] rounded-full h-4 border border-[#2D3748] overflow-hidden">
                    <div className="bg-[#00D0FF] h-full rounded-full transition-all duration-1000" style={{ width: `${pcPct}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-2 text-gray-300"><span>PlayStation 5 Consoles</span><span className="text-purple-400">₹{formatINR(filteredMetrics.sysBreakdown.PS5)} ({ps5Pct.toFixed(1)}%)</span></div>
                  <div className="w-full bg-[#0B0E14] rounded-full h-4 border border-[#2D3748] overflow-hidden">
                    <div className="bg-purple-500 h-full rounded-full transition-all duration-1000" style={{ width: `${ps5Pct}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-2 text-gray-300"><span>Sim Racing (Logitech G29)</span><span className="text-orange-400">₹{formatINR(filteredMetrics.sysBreakdown.SIM)} ({simPct.toFixed(1)}%)</span></div>
                  <div className="w-full bg-[#0B0E14] rounded-full h-4 border border-[#2D3748] overflow-hidden">
                    <div className="bg-orange-500 h-full rounded-full transition-all duration-1000" style={{ width: `${simPct}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#2D3748] to-transparent my-10"></div>

          {/* ==============================================
              LEADERBOARD SECTION
              ============================================== */}
          <section>
            <h2 className="text-xl font-black text-white flex items-center gap-2 mb-4"><Crown className="text-yellow-500"/> Top 20 Royal Gamers (Lifetime)</h2>
            <div className="bg-[#121824] rounded-3xl border border-[#1E293B] overflow-hidden shadow-xl">
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-[#1A2235] text-[10px] uppercase text-gray-400 font-black tracking-wider border-b border-[#1E293B]">
                      <tr>
                        <th className="p-4 w-16 text-center">Rank</th>
                        <th className="p-4">Gamer Name</th>
                        <th className="p-4 text-center">Total Visits</th>
                        <th className="p-4 text-center">Total Hours</th>
                        <th className="p-4 text-right text-yellow-500">Total Spend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E293B]">
                      {leaderboard.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-gray-500">No gamer data found.</td></tr>
                      ) : (
                        leaderboard.map((gamer, i) => (
                          <tr key={i} className="hover:bg-[#1A2235]/30 transition-colors">
                            <td className="p-4 text-center font-black text-gray-500">#{i + 1}</td>
                            <td className="p-4 font-black text-white">{gamer.name}</td>
                            <td className="p-4 text-center text-gray-400">{gamer.visits}</td>
                            <td className="p-4 text-center text-gray-400">{Math.round(gamer.hours)}h</td>
                            <td className="p-4 text-right font-black text-yellow-500 text-base">₹{formatINR(gamer.spend)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
               </div>
            </div>
          </section>

          <div className="pb-10"></div>
        </div>
      </div>

      {/* ==============================================
          DAILY REPORT MODAL (ANY DATE)
          ============================================== */}
      {reportModalOpen && (() => {
          // Parse the selected date resiliently
          const parts = reportDate.split('-');
          let reportTarget = new Date();
          if (parts.length === 3) reportTarget = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          
          const startLimit = reportTarget;
          const endLimit = new Date(reportTarget.getTime() + 86400000);

          const isMatch = (dateStr: string) => {
              if (!dateStr) return false;
              const dt = new Date(dateStr);
              return dt >= startLimit && dt < endLimit;
          };

          let eodCash = 0; let eodUPI = 0;
          let pcRev = 0; let ps5Rev = 0; let simRev = 0;
          let fnbRev = 0; let fnbProfit = 0;

          rawSales.forEach(s => {
             if (isMatch(s.date)) {
               const gameCost = Math.max(0, Number(s.total || 0) - Number(s.fnb_total || 0));

               if (String(s.system).includes('PC')) pcRev += gameCost;
               else if (String(s.system).includes('PS')) ps5Rev += gameCost;
               else if (String(s.system).includes('SIM')) simRev += gameCost;

               const m = String(s.method || '').trim();
               if (m.startsWith('Split|')) { const pts = m.split('|'); eodCash += Number(pts[1] || 0); eodUPI += Number(pts[2] || 0); } 
               else if (m === 'Cash') eodCash += Number(s.total || 0); 
               else if (m === 'UPI') eodUPI += Number(s.total || 0);
             }
          });

          rawCafe.forEach(c => {
             if (isMatch(c.date)) {
               fnbRev += Number(c.total_revenue || 0);
               const cProfit = Number(c.profit);
               fnbProfit += isNaN(cProfit) ? (Number(c.total_revenue || 0) - Number(c.total_cost || 0)) : cProfit;

               const m = String(c.method || c.payment_method || '').trim();
               if (m !== 'Tab' && m !== 'tab') {
                  if (m.startsWith('Split|')) { const pts = m.split('|'); eodCash += Number(pts[1] || 0); eodUPI += Number(pts[2] || 0); } 
                  else if (m === 'Cash') eodCash += Number(c.total_revenue || 0); 
                  else if (m === 'UPI') eodUPI += Number(c.total_revenue || 0);
               }
             }
          });

          const finalTotal = eodCash + eodUPI - fnbRev + fnbProfit;

          // Format Display Date cleanly
          const dayNum = reportTarget.getDate();
          const suffix = (dayNum % 10 === 1 && dayNum !== 11) ? "st" : (dayNum % 10 === 2 && dayNum !== 12) ? "nd" : (dayNum % 10 === 3 && dayNum !== 13) ? "rd" : "th";
          const monthStr = reportTarget.toLocaleString('en-US', { month: 'long' });
          const displayDate = `${dayNum}${suffix} ${monthStr}`;

          const reportText = `Today's income - ${displayDate}\n\na. Cash - ${formatINR(eodCash)}\nb. UPI -  ${formatINR(eodUPI)}\nc. F&B sale - ${formatINR(fnbRev)}\nd. F&B profit- ${formatINR(fnbProfit)}\n\nA+B-C+D= Total  - ${formatINR(finalTotal)}\n\nBreakup:\nPS5- ${formatINR(ps5Rev)}\nPC- ${formatINR(pcRev)}\nSIM- ${formatINR(simRev)}`;

          return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
              <div className="bg-[#121824] p-6 rounded-3xl w-full max-w-sm border border-[#1E293B] shadow-2xl relative transition-all">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-black text-white flex items-center gap-2">Daily Report <Calendar size={18} className="text-[#00D0FF]"/></h2>
                      <button onClick={() => setReportModalOpen(false)} className="p-2 bg-[#0B0E14] rounded-full hover:bg-red-500/20 hover:text-red-500 transition-colors"><X size={16}/></button>
                  </div>

                  <div className="mb-4">
                    <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Select Date</label>
                    <input type="date" className="w-full bg-[#0B0E14] mt-1 p-3 text-sm rounded-xl border border-[#2D3748] focus:border-[#00D0FF] outline-none text-white [color-scheme:dark]" value={reportDate} onChange={e => setReportDate(e.target.value)} />
                  </div>

                  <div className="space-y-4">
                     <div className="bg-[#0B0E14] border border-[#2D3748] p-5 rounded-2xl font-mono text-sm text-gray-300 whitespace-pre-wrap">
                        {reportText}
                     </div>

                     <div className="grid grid-cols-2 gap-4 pt-2">
                       <button onClick={() => setReportModalOpen(false)} className="w-full bg-[#1A2235] text-gray-400 border border-[#2D3748] py-4 rounded-xl font-bold hover:text-white transition-all">Dismiss</button>
                       <button onClick={() => { navigator.clipboard.writeText(reportText); alert("Report copied to clipboard!"); }} className="w-full bg-white text-black py-4 rounded-xl font-black hover:bg-gray-200 transition-all flex items-center justify-center gap-2">
                         <Copy size={16}/> Copy
                       </button>
                     </div>
                  </div>
              </div>
            </div>
          );
      })()}

    </div>
  );
}