'use client'

import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Monitor, Package, BarChart3, Lock, CheckCircle2, Copy, X, Wallet, Building2, Pencil, Check, Calendar, Gamepad2, Users, Clock, IndianRupee, MessageCircle } from 'lucide-react';

function formatINR(num: number) { return Math.round(num || 0).toLocaleString('en-IN'); }

// Pure number extractor
function extractNumber(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^0-9.-]+/g, "");
  return cleaned ? parseFloat(cleaned) : 0;
}

export default function MasterVault() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  
  // Data States
  const [salesData, setSalesData] = useState<any[]>([]);
  const [cafeData, setCafeData] = useState<any[]>([]);
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  
  // Filter States
  const [timeFilter, setTimeFilter] = useState('Lifetime');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [leaderboardSort, setLeaderboardSort] = useState<'spend' | 'time'>('spend');

  // Balances
  const [bankBalance, setBankBalance] = useState<number>(0);
  const [cashAtHome, setCashAtHome] = useState<number>(0);
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [tempBank, setTempBank] = useState<string>('');
  const [tempCash, setTempCash] = useState<string>('');

  const [isDataLoading, setIsDataLoading] = useState(false);

  // Report Generator States
  const [reportDate, setReportDate] = useState(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()));
  const [reportModal, setReportModal] = useState<string | null>(null);

  useEffect(() => {
    const savedBank = localStorage.getItem('gamerarena_bank');
    const savedCash = localStorage.getItem('gamerarena_cash');
    if (savedBank) setBankBalance(Number(savedBank));
    if (savedCash) setCashAtHome(Number(savedCash));

    if (isAuthenticated) fetchAllData();
  }, [isAuthenticated]);

  async function fetchAllRows(tableName: string) {
    let allData: any[] = [];
    let start = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .range(start, start + step - 1);
        
      if (error || !data) break;
      
      allData = [...allData, ...data];
      
      if (data.length < step) {
        hasMore = false; 
      } else {
        start += step; 
      }
    }
    return allData;
  }

  async function fetchAllData() {
    setIsDataLoading(true);
    
    const sales = await fetchAllRows('sales');
    const cafe = await fetchAllRows('cafe_orders');
    
    const { data: ledger } = await supabase.from('daily_ledger').select('*').order('date', { ascending: false });
    
    if (sales) setSalesData(sales);
    if (cafe) setCafeData(cafe);
    if (ledger) setLedgerData(ledger);
    
    setIsDataLoading(false);
  }

  const saveBankBalance = (newVal: number) => { setBankBalance(newVal); localStorage.setItem('gamerarena_bank', newVal.toString()); };
  const saveCashAtHome = (newVal: number) => { setCashAtHome(newVal); localStorage.setItem('gamerarena_cash', newVal.toString()); };

  // --- CALENDAR & DATE FILTERING ENGINE (STRICT MON-SUN) ---
  const filterByDate = (items: any[]) => {
    const now = new Date();
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
    
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(now.getDate() - 1);
    const yesterdayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(yesterdayDate);

    return items.filter(item => {
      const rawDate = item.created_at || item.date;
      if (!rawDate) return false;
      
      const itemDate = new Date(rawDate);
      if (isNaN(itemDate.getTime())) return false; 
      
      const itemDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(itemDate);

      if (item.status && ['Active', 'Reserved', 'Hold', 'Pending'].includes(item.status)) return false;

      if (timeFilter === 'Custom Dates' && customStartDate && customEndDate) {
         return itemDateStr >= customStartDate && itemDateStr <= customEndDate;
      }

      switch (timeFilter) {
        case 'Today': return itemDateStr === todayStr;
        case 'Yesterday': return itemDateStr === yesterdayStr;
        case 'This Week': {
          const d = new Date(now);
          const day = d.getDay();
          const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
          const monday = new Date(d.setDate(diff));
          const mondayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(monday);
          return itemDateStr >= mondayStr && itemDateStr <= todayStr;
        }
        case 'Last Week': {
          const d = new Date(now);
          const day = d.getDay();
          const diff = d.getDate() - day + (day === 0 ? -6 : 1);
          const thisMonday = new Date(d.setDate(diff));
          
          const lastMonday = new Date(thisMonday);
          lastMonday.setDate(lastMonday.getDate() - 7);
          const lastSunday = new Date(thisMonday);
          lastSunday.setDate(lastSunday.getDate() - 1);
          
          const lastMonStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(lastMonday);
          const lastSunStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(lastSunday);
          
          return itemDateStr >= lastMonStr && itemDateStr <= lastSunStr;
        }
        case 'This Month': return itemDateStr.startsWith(todayStr.substring(0, 7));
        case 'Last Month': 
          const lastMonth = new Date(now); lastMonth.setMonth(now.getMonth() - 1);
          const lastMonthStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(lastMonth);
          return itemDateStr.startsWith(lastMonthStr.substring(0, 7));
        case 'Lifetime': return true;
        case 'Custom Dates': return true;
        default: return true;
      }
    });
  };

  const generateHistoricalReport = (targetDateStr: string) => {
    let eodCash = 0; let eodUPI = 0; let pcRev = 0; let ps5Rev = 0; let simRev = 0; let fnbRev = 0; let fnbProfit = 0; let miscRev = 0;

    const daySales = salesData.filter(s => {
       const rawDate = s.created_at || s.date;
       if (!rawDate) return false;
       const d = new Date(rawDate);
       if (isNaN(d.getTime())) return false;
       const itemDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
       
       const isFinished = !['Active', 'Reserved', 'Hold', 'Pending'].includes(s.status);
       return itemDateStr === targetDateStr && isFinished;
    });

    daySales.forEach(s => {
       const rawGameCost = extractNumber(s.total || s.amount || s.total_amount || 0);
       const fnbCostRaw = extractNumber(s.fnb_total || 0);
       const gameCost = Math.round(rawGameCost / 10) * 10;
       const grandTotal = rawGameCost + fnbCostRaw; 

       const sysName = String(s.system || s.system_type || '').toUpperCase();
       if (sysName.includes('PC')) pcRev += gameCost;
       else if (sysName.includes('PS')) ps5Rev += gameCost;
       else if (sysName.includes('SIM')) simRev += gameCost;
       else ps5Rev += gameCost;

       const m = String(s.method || '').trim();
       if (m.startsWith('Split|')) { 
           const parts = m.split('|'); 
           eodCash += Number(parts[1] || 0); 
           eodUPI += Number(parts[2] || 0); 
       } 
       else if (m === 'Cash') eodCash += grandTotal; 
       else if (m === 'UPI') eodUPI += grandTotal;
    });

    const dayCafe = cafeData.filter(c => {
       const rawDate = c.created_at || c.date;
       if (!rawDate) return false;
       const d = new Date(rawDate);
       if (isNaN(d.getTime())) return false;
       const itemDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
       return itemDateStr === targetDateStr;
    });

    dayCafe.forEach(c => {
       const itemsStr = String(c.items || '');
       const isRetail = itemsStr.includes('[Retail]');
       const rev = extractNumber(c.total_revenue || c.total || c.amount || 0);
       const cost = extractNumber(c.total_cost || 0);
       const prof = extractNumber(c.profit || 0);

       if (isRetail) {
           miscRev += rev;
       } else if (c.category !== 'Retail' && c.category !== 'Merch') {
           fnbRev += rev;
           fnbProfit += prof || (rev - cost);
       }

       const m = String(c.method || c.payment_method || '').trim();
       if (m !== 'Tab' && m !== 'tab') {
          if (m.startsWith('Split|')) { 
              const parts = m.split('|'); 
              eodCash += Number(parts[1] || 0); 
              eodUPI += Number(parts[2] || 0); 
          } 
          else if (m === 'Cash') eodCash += rev; 
          else if (m === 'UPI') eodUPI += rev;
       }
    });

    const cleanFnbProfit = Math.round(fnbProfit / 10) * 10;
    const finalTotal = Math.round((eodCash + eodUPI - fnbRev + cleanFnbProfit) / 10) * 10;

    const d = new Date(targetDateStr);
    const day = d.getDate();
    const suffix = (day % 10 === 1 && day !== 11) ? "st" : (day % 10 === 2 && day !== 12) ? "nd" : (day % 10 === 3 && day !== 13) ? "rd" : "th";
    const formattedDate = `${day}${suffix} ${d.toLocaleString('en-US', { month: 'long' })}`;

    let reportText = `Today's income - ${formattedDate}\n\n`;
    reportText += `a. Cash - ${formatINR(eodCash)}\n`;
    reportText += `b. UPI -  ${formatINR(eodUPI)}\n`;
    reportText += `c. F&B sale - ${formatINR(fnbRev)}\n`;
    reportText += `d. F&B profit- ${formatINR(cleanFnbProfit)}\n`;
    if (miscRev > 0) reportText += `e. Retail/Misc - ${formatINR(miscRev)}\n`;
    
    reportText += `\n${miscRev > 0 ? 'A+B-C+D(Misc)' : 'A+B-C+D'} = Total Net - ${formatINR(finalTotal)}\n\n`;
    reportText += `Breakup:\n`;
    reportText += `PS5- ${formatINR(ps5Rev)}\n`;
    reportText += `PC- ${formatINR(pcRev)}\n`;
    reportText += `SIM- ${formatINR(simRev)}`;

    return reportText;
  };

  const handleOpenReport = () => {
    if (!reportDate) return alert("Please select a date first.");
    const text = generateHistoricalReport(reportDate);
    setReportModal(text);
  };

  const filteredSales = filterByDate(salesData);
  const filteredCafe = filterByDate(cafeData);

  let gamingRev = 0, fnbRev = 0, pcRev = 0, ps5Rev = 0, simRev = 0;
  
  filteredSales.forEach(s => {
    const gameCost = extractNumber(s.total || s.amount || s.total_amount || 0);
    gamingRev += gameCost;
    
    const sysName = String(s.system || s.system_type || s.console || s.type || '').toUpperCase();
    if (sysName.includes('PC')) pcRev += gameCost;
    else if (sysName.includes('PS')) ps5Rev += gameCost;
    else if (sysName.includes('SIM')) simRev += gameCost;
    else ps5Rev += gameCost; 
  });

  filteredCafe.forEach(c => {
    fnbRev += extractNumber(c.total_revenue || c.total || c.amount || 0);
  });

  const totalRev = gamingRev + fnbRev;
  const pcPct = totalRev > 0 ? (pcRev / totalRev) * 100 : 0;
  const ps5Pct = totalRev > 0 ? (ps5Rev / totalRev) * 100 : 0;
  const simPct = totalRev > 0 ? (simRev / totalRev) * 100 : 0;

  const customerMap: Record<string, { name: string; spent: number; time: number }> = {};
  filteredSales.forEach(s => {
     const name = s.customer_name || s.customer || s.name || 'Guest User';
     if (!customerMap[name]) customerMap[name] = { name, spent: 0, time: 0 };
     
     const gameCost = extractNumber(s.total || s.amount || s.total_amount || 0);
     const fnbCost = extractNumber(s.fnb_total || 0);
     
     customerMap[name].spent += (gameCost + fnbCost);
     customerMap[name].time += extractNumber(s.duration || s.hours || 0);
  });
  
  const leaderboard = Object.values(customerMap)
    .sort((a, b) => leaderboardSort === 'spend' ? b.spent - a.spent : b.time - a.time)
    .slice(0, 20);

  const markUPISettled = async (row: any) => {
    if (isDataLoading) return; setIsDataLoading(true);
    await supabase.from('daily_ledger').update({ upi_status: 'Settled' }).eq('id', row.id);
    saveBankBalance(bankBalance + extractNumber(row.upi_collected));
    await fetchAllData(); setIsDataLoading(false);
  };

  const vaultDailyCash = async (row: any) => {
    if (isDataLoading) return; setIsDataLoading(true);
    saveCashAtHome(cashAtHome + extractNumber(row.cash_withdrawn));
    alert(`₹${extractNumber(row.cash_withdrawn)} added to Cash at Home!`);
    setIsDataLoading(false);
  };

  const todayDateString = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const displayLedger = ledgerData.filter(row => row.date >= todayDateString);

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-screen bg-[#05070A] text-white items-center justify-center p-4">
        <form onSubmit={(e) => { e.preventDefault(); if (password === 'Vault@2026' || password === 'Vault@0511') setIsAuthenticated(true); else alert('Incorrect Password'); }} className="bg-[#121824] p-8 rounded-3xl border border-[#1E293B] shadow-2xl w-full max-w-sm text-center">
            <div className="flex justify-center mb-6"><Lock size={40} className="text-orange-500"/></div>
            <h2 className="text-2xl font-black mb-6">Master Vault Access</h2>
            <input type="password" placeholder="Enter Vault PIN" className="w-full bg-[#0B0E14] p-4 text-center rounded-xl border border-[#2D3748] focus:border-orange-500 outline-none font-bold tracking-widest mb-4" value={password} onChange={e => setPassword(e.target.value)} />
            <button type="submit" className="w-full bg-orange-500 text-black py-4 rounded-xl font-black hover:bg-white transition-all">Unlock Vault</button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-[#05070A] text-white font-sans overflow-hidden">
      
      <div className="w-16 bg-[#0B0E14] border-r border-[#1E293B] flex flex-col items-center py-4 shrink-0 z-10 gap-4">
        <a href="/" className="p-3 bg-[#1A2235] text-gray-400 hover:text-[#00D0FF] hover:border-[#00D0FF] border border-[#2D3748] rounded-xl transition-all shadow-sm" title="Live Floor"><Monitor size={20} /></a>
        <a href="/vault/inventory" className="p-3 bg-[#1A2235] text-gray-400 hover:text-[#00D0FF] hover:border-[#00D0FF] border border-[#2D3748] rounded-xl transition-all shadow-sm" title="Inventory"><Package size={20} /></a>
        <div className="p-3 bg-orange-500/20 text-orange-500 border border-orange-500 rounded-xl transition-all shadow-[0_0_15px_rgba(249,115,22,0.2)]" title="Master Vault"><BarChart3 size={20} /></div>
        <a href="/vault/ledger" className="p-3 bg-[#1A2235] text-gray-400 hover:text-emerald-500 hover:border-emerald-500 border border-[#2D3748] rounded-xl transition-all shadow-sm" title="Finance"><Building2 size={20} /></a>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
              Master <span className="text-orange-500">Analytics</span>
              {isDataLoading && <span className="text-[10px] text-orange-500 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20 ml-2 animate-pulse">Syncing Database...</span>}
            </h1>
            
            <div className="flex flex-wrap items-center gap-3">
               {timeFilter === 'Custom Dates' && (
                  <div className="flex items-center gap-2 bg-[#121824] p-1.5 rounded-xl border border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.1)]">
                     <input type="date" className="bg-[#0B0E14] text-xs font-bold text-gray-300 p-1.5 rounded-lg border border-[#2D3748] outline-none [color-scheme:dark]" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} />
                     <span className="text-xs text-gray-500 font-bold uppercase">To</span>
                     <input type="date" className="bg-[#0B0E14] text-xs font-bold text-gray-300 p-1.5 rounded-lg border border-[#2D3748] outline-none [color-scheme:dark]" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} />
                  </div>
               )}
               
               <div className="flex items-center gap-3 bg-[#121824] p-1.5 rounded-xl border border-[#1E293B]">
                  <Calendar size={16} className="text-gray-400 ml-2"/>
                  <select className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer pr-2" value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
                    {['Lifetime', 'Today', 'Yesterday', 'This Week', 'Last Week', 'This Month', 'Last Month', 'Custom Dates'].map(t => <option key={t} value={t} className="bg-[#121824]">{t}</option>)}
                  </select>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-[#121824] border border-[#1E293B] rounded-3xl p-6 relative overflow-hidden group hover:border-orange-500/50 transition-all">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity"><Building2 size={80}/></div>
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Building2 size={14}/> Bank Balance</h3>
                {isEditingBank ? (
                  <div className="flex items-center gap-2 mt-2 z-10 relative">
                     <input type="number" className="bg-[#0B0E14] border border-[#2D3748] rounded-lg px-3 py-1 outline-none text-xl font-black w-full" value={tempBank} onChange={e => setTempBank(e.target.value)} autoFocus />
                     <button onClick={() => { saveBankBalance(Number(tempBank)); setIsEditingBank(false); }} className="p-2 bg-emerald-500 text-black rounded-lg hover:bg-white"><Check size={16}/></button>
                     <button onClick={() => setIsEditingBank(false)} className="p-2 bg-red-500 text-white rounded-lg hover:bg-white hover:text-red-500"><X size={16}/></button>
                  </div>
                ) : (
                  <div className="flex items-end gap-3 mt-2 z-10 relative">
                     <span className="text-4xl font-black text-white tracking-tight">₹{formatINR(bankBalance)}</span>
                     <button onClick={() => { setTempBank(bankBalance.toString()); setIsEditingBank(true); }} className="mb-2 text-gray-500 hover:text-orange-500 transition-colors"><Pencil size={16}/></button>
                  </div>
                )}
             </div>

             <div className="bg-[#121824] border border-[#1E293B] rounded-3xl p-6 relative overflow-hidden group hover:border-emerald-500/50 transition-all">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity"><Wallet size={80}/></div>
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Wallet size={14}/> Cash at Home</h3>
                {isEditingCash ? (
                  <div className="flex items-center gap-2 mt-2 z-10 relative">
                     <input type="number" className="bg-[#0B0E14] border border-[#2D3748] rounded-lg px-3 py-1 outline-none text-xl font-black w-full" value={tempCash} onChange={e => setTempCash(e.target.value)} autoFocus />
                     <button onClick={() => { saveCashAtHome(Number(tempCash)); setIsEditingCash(false); }} className="p-2 bg-emerald-500 text-black rounded-lg hover:bg-white"><Check size={16}/></button>
                     <button onClick={() => setIsEditingCash(false)} className="p-2 bg-red-500 text-white rounded-lg hover:bg-white hover:text-red-500"><X size={16}/></button>
                  </div>
                ) : (
                  <div className="flex items-end gap-3 mt-2 z-10 relative">
                     <span className="text-4xl font-black text-white tracking-tight">₹{formatINR(cashAtHome)}</span>
                     <button onClick={() => { setTempCash(cashAtHome.toString()); setIsEditingCash(true); }} className="mb-2 text-gray-500 hover:text-emerald-500 transition-colors"><Pencil size={16}/></button>
                  </div>
                )}
             </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="bg-[#0B0E14] border border-[#1E293B] p-5 rounded-2xl">
               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Revenue</p>
               <p className="text-2xl font-black text-white">₹{formatINR(totalRev)}</p>
             </div>
             <div className="bg-[#0B0E14] border border-[#1E293B] p-5 rounded-2xl">
               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Gaming Revenue</p>
               <p className="text-2xl font-black text-[#00D0FF]">₹{formatINR(gamingRev)}</p>
             </div>
             <div className="bg-[#0B0E14] border border-[#1E293B] p-5 rounded-2xl">
               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">F&B Revenue</p>
               <p className="text-2xl font-black text-emerald-400">₹{formatINR(fnbRev)}</p>
             </div>
             <div className="bg-[#0B0E14] border border-[#1E293B] p-5 rounded-2xl">
               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Sessions</p>
               <p className="text-2xl font-black text-purple-400">{filteredSales.length}</p>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-[#121824] border border-[#1E293B] rounded-3xl p-6 flex flex-col">
               <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Gamepad2 size={16}/> System Breakup</h3>
               
               <div className="space-y-6 flex-1">
                 <div>
                   <div className="flex justify-between text-sm font-bold mb-2"><span>PlayStation 5</span><span className="text-[#00D0FF]">₹{formatINR(ps5Rev)}</span></div>
                   <div className="w-full bg-[#0B0E14] rounded-full h-3 overflow-hidden border border-[#1E293B]">
                     <div className="bg-[#00D0FF] h-full rounded-full transition-all duration-1000" style={{ width: `${ps5Pct}%` }}></div>
                   </div>
                   <p className="text-right text-[10px] text-gray-500 mt-1">{ps5Pct.toFixed(1)}% of Revenue</p>
                 </div>

                 <div>
                   <div className="flex justify-between text-sm font-bold mb-2"><span>PC Rigs</span><span className="text-purple-400">₹{formatINR(pcRev)}</span></div>
                   <div className="w-full bg-[#0B0E14] rounded-full h-3 overflow-hidden border border-[#1E293B]">
                     <div className="bg-purple-400 h-full rounded-full transition-all duration-1000" style={{ width: `${pcPct}%` }}></div>
                   </div>
                   <p className="text-right text-[10px] text-gray-500 mt-1">{pcPct.toFixed(1)}% of Revenue</p>
                 </div>

                 <div>
                   <div className="flex justify-between text-sm font-bold mb-2"><span>Racing Sim</span><span className="text-orange-400">₹{formatINR(simRev)}</span></div>
                   <div className="w-full bg-[#0B0E14] rounded-full h-3 overflow-hidden border border-[#1E293B]">
                     <div className="bg-orange-400 h-full rounded-full transition-all duration-1000" style={{ width: `${simPct}%` }}></div>
                   </div>
                   <p className="text-right text-[10px] text-gray-500 mt-1">{simPct.toFixed(1)}% of Revenue</p>
                 </div>
               </div>
            </div>

            <div className="lg:col-span-2 bg-[#121824] border border-[#1E293B] rounded-3xl p-6 flex flex-col h-[400px]">
               <div className="flex justify-between items-center mb-6 shrink-0">
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Users size={16}/> Top Customers</h3>
                  <div className="flex bg-[#0B0E14] rounded-lg p-1 border border-[#1E293B]">
                     <button onClick={() => setLeaderboardSort('spend')} className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all flex items-center gap-1 ${leaderboardSort === 'spend' ? 'bg-[#00D0FF]/20 text-[#00D0FF]' : 'text-gray-500 hover:text-white'}`}><IndianRupee size={12}/> By Spend</button>
                     <button onClick={() => setLeaderboardSort('time')} className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all flex items-center gap-1 ${leaderboardSort === 'time' ? 'bg-orange-500/20 text-orange-500' : 'text-gray-500 hover:text-white'}`}><Clock size={12}/> By Time</button>
                  </div>
               </div>
               
               <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                  <div className="space-y-2">
                     {leaderboard.length === 0 ? (
                        <p className="text-center text-gray-600 text-sm italic py-10">No customer data found for this timeframe.</p>
                     ) : (
                        leaderboard.map((cust, idx) => (
                           <div key={cust.name} className="flex justify-between items-center bg-[#0B0E14] p-3 rounded-xl border border-[#1E293B] hover:border-[#2D3748] transition-colors">
                              <div className="flex items-center gap-3">
                                 <div className={`w-6 text-center text-[10px] font-black ${idx < 3 ? 'text-yellow-500' : 'text-gray-600'}`}>#{idx + 1}</div>
                                 <span className="font-bold text-sm text-gray-200">{cust.name}</span>
                              </div>
                              <div className="flex gap-6 text-right">
                                 <div className="flex flex-col">
                                    <span className="text-[9px] text-gray-500 uppercase font-bold">Hours</span>
                                    <span className={`text-sm font-black ${leaderboardSort === 'time' ? 'text-orange-400' : 'text-gray-400'}`}>{cust.time}h</span>
                                 </div>
                                 <div className="flex flex-col">
                                    <span className="text-[9px] text-gray-500 uppercase font-bold">Spent</span>
                                    <span className={`text-sm font-black ${leaderboardSort === 'spend' ? 'text-[#00D0FF]' : 'text-gray-400'}`}>₹{formatINR(cust.spent)}</span>
                                 </div>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               </div>
            </div>
          </div>

          <div className="mt-8 bg-[#121824] border border-[#1E293B] rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <div>
                <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                   <MessageCircle className="text-emerald-500" size={20}/> Historical Report Generator
                </h2>
                <p className="text-xs text-gray-500 font-bold mt-1">Pull the exact End-of-Day WhatsApp format for any past date.</p>
             </div>
             <div className="flex items-center gap-3 w-full md:w-auto">
                <input type="date" className="w-full md:w-auto bg-[#0B0E14] text-sm font-bold text-white p-3 rounded-xl border border-[#2D3748] outline-none focus:border-emerald-500 [color-scheme:dark]" value={reportDate} onChange={e => setReportDate(e.target.value)} />
                <button onClick={handleOpenReport} className="bg-[#1A2235] hover:bg-emerald-500 hover:text-black text-emerald-500 border border-emerald-500/30 px-6 py-3 rounded-xl font-black transition-all shadow-sm shrink-0">
                   Generate Report
                </button>
             </div>
          </div>

          <div className="mt-4 mb-12">
             <h2 className="text-lg font-black tracking-tight mb-4 text-gray-400">Automated Ledger <span className="text-xs font-normal text-gray-600 ml-2">(Showing from Today onwards)</span></h2>
             <div className="bg-[#0B0E14] rounded-2xl border border-[#1E293B] overflow-hidden shadow-xl max-h-[400px] overflow-y-auto custom-scrollbar">
               <div className="grid grid-cols-12 gap-4 p-4 bg-[#121824] border-b border-[#1E293B] text-[10px] font-black text-gray-500 uppercase tracking-widest sticky top-0 z-10">
                 <div className="col-span-2">Date</div>
                 <div className="col-span-2 text-right">Gross Rev</div>
                 <div className="col-span-2 pl-4 border-l border-[#1E293B]">Breakup</div>
                 <div className="col-span-3 pl-4 border-l border-[#1E293B]">Cash Handling</div>
                 <div className="col-span-3 pl-4 border-l border-[#1E293B]">UPI & Banking</div>
               </div>
               
               <div className="divide-y divide-[#1E293B]">
                 {displayLedger.map(row => (
                   <div key={row.id} className="grid grid-cols-12 gap-4 p-4 items-center text-sm hover:bg-[#121824]/50 transition-colors">
                     <div className="col-span-2 font-bold text-gray-300">{row.date}</div>
                     
                     <div className="col-span-2 text-right font-black text-white text-lg">₹{formatINR(extractNumber(row.gross_total))}</div>
                     
                     <div className="col-span-2 pl-4 border-l border-[#1E293B]/50 flex flex-col gap-1">
                        <div className="flex justify-between text-[10px]"><span className="text-gray-500">Game:</span> <span className="text-[#00D0FF] font-bold">₹{formatINR(extractNumber(row.gaming_revenue))}</span></div>
                        <div className="flex justify-between text-[10px]"><span className="text-gray-500">F&B+:</span> <span className="text-orange-400 font-bold">₹{formatINR(extractNumber(row.fnb_revenue) + extractNumber(row.misc_revenue))}</span></div>
                     </div>
                     
                     <div className="col-span-3 pl-4 border-l border-[#1E293B]/50 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                           <span className="text-[10px] text-gray-500 font-bold uppercase">Earned Cash</span>
                           <span className="font-bold text-white text-xs">₹{formatINR(extractNumber(row.cash_collected))}</span>
                        </div>
                        <div className="flex justify-between items-center bg-[#1A2235] p-1.5 rounded-lg border border-[#2D3748]">
                           <div className="flex flex-col">
                              <span className="text-[9px] text-gray-400">Vaulted</span>
                              <span className="font-black text-emerald-400 text-xs">₹{formatINR(extractNumber(row.cash_withdrawn))}</span>
                           </div>
                           <div className="h-6 w-px bg-[#2D3748]"></div>
                           <div className="flex flex-col text-right">
                              <span className="text-[9px] text-gray-400">Float Left</span>
                              <span className="font-black text-yellow-500 text-xs">₹{formatINR(extractNumber(row.float_forward))}</span>
                           </div>
                        </div>
                        <button onClick={() => vaultDailyCash(row)} className="w-full text-[9px] font-bold text-white bg-[#1A2235] hover:bg-emerald-500 hover:text-black py-1 rounded border border-[#2D3748] transition-all flex justify-center items-center gap-1">
                           <Wallet size={10}/> Add to Home Cash
                        </button>
                     </div>
                     
                     <div className="col-span-3 pl-4 border-l border-[#1E293B]/50 flex flex-col gap-2 justify-center">
                        <div className="flex justify-between items-center">
                           <span className="text-[10px] text-gray-500 font-bold uppercase">Earned UPI</span>
                           <span className="font-black text-[#00D0FF] text-sm">₹{formatINR(extractNumber(row.upi_collected))}</span>
                        </div>
                        {row.upi_status === 'Settled' ? (
                           <span className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1.5 rounded-md border border-emerald-500/20 w-full mt-1">
                             <CheckCircle2 size={12}/> Settled to Bank
                           </span>
                        ) : (
                           <button onClick={() => markUPISettled(row)} disabled={isDataLoading} className="w-full mt-1 text-[10px] font-bold text-white bg-[#1A2235] hover:bg-orange-500 hover:text-black px-2 py-1.5 rounded-md border border-[#2D3748] transition-all text-center">
                             Mark as Cleared
                           </button>
                        )}
                     </div>
                   </div>
                 ))}
                 {displayLedger.length === 0 && (
                    <div className="col-span-12 p-6 text-center text-gray-500 text-sm">No ledger data found. Future "Close Day" submissions will appear here.</div>
                 )}
               </div>
             </div>
          </div>
        </div>
      </div>

      {reportModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#121824] p-8 rounded-3xl w-full max-w-sm border border-[#1E293B] shadow-2xl relative">
             <button onClick={() => setReportModal(null)} className="absolute top-6 right-6 text-gray-500 hover:text-white"><X size={20}/></button>
             
             <h2 className="text-2xl font-black text-white mb-2">Historical Report</h2>
             <p className="text-sm text-gray-500 mb-6 font-bold">Generated from {reportDate} database logs.</p>
             
             <div className="bg-[#0B0E14] border border-[#2D3748] p-5 rounded-2xl font-mono text-sm text-gray-300 whitespace-pre-wrap mb-6">
                {reportModal}
             </div>

             <div className="grid grid-cols-2 gap-4">
               <button onClick={() => setReportModal(null)} className="w-full bg-[#1A2235] text-gray-400 border border-[#2D3748] py-4 rounded-xl font-bold hover:text-white transition-all">Close</button>
               <button onClick={() => { navigator.clipboard.writeText(reportModal); alert("Report copied to clipboard!"); }} className="w-full bg-emerald-500 text-black py-4 rounded-xl font-black hover:bg-white transition-all flex items-center justify-center gap-2">
                 <Copy size={16}/> Copy
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}