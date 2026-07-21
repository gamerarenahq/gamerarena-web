'use client'

import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Monitor, Package, BarChart3, Wallet, TrendingUp, PiggyBank, CreditCard, AlertCircle, Plus, ArrowDownToLine, ArrowUpFromLine, List, Trash2, Landmark, Banknote, Edit3, X, Building2 } from 'lucide-react';

function formatINR(num: number) {
  return Math.round(num || 0).toLocaleString('en-IN');
}

export default function MasterFinancialLedger() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Data States
  const [monthlyLedger, setMonthlyLedger] = useState<any[]>([]);
  const [rawExpenses, setRawExpenses] = useState<any[]>([]); 
  const [lifetimeMetrics, setLifetimeMetrics] = useState({ totalIncome: 0, opProfit: 0, retained: 0, investment: 1000000, liveBank: 0, liveCash: 0 });
  const [pendingBills, setPendingBills] = useState<any[]>([]);

  // Form States
  const [entryType, setEntryType] = useState('Expense'); 
  const [expDate, setExpDate] = useState('');
  const [expCategory, setExpCategory] = useState('Fixed Cost');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expMethod, setExpMethod] = useState('UPI');
  const [expStatus, setExpStatus] = useState('Paid');

  // 🟢 HARD-SYNC STATES
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncBank, setSyncBank] = useState<number | string>(0);
  const [syncCash, setSyncCash] = useState<number | string>(0);

  useEffect(() => {
    const today = new Date();
    setExpDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
    if (isUnlocked) fetchLedgerData();
  }, [isUnlocked]);

  async function fetchLedgerData() {
    setIsProcessing(true);
    const step = 1000;
    
    let allSales: any[] = []; let start = 0; let hasMore = true;
    while (hasMore) { const { data } = await supabase.from('sales').select('*').eq('status', 'Completed').range(start, start + step - 1); if (data && data.length > 0) { allSales.push(...data); start += step; if (data.length < step) hasMore = false; } else hasMore = false; }

    let allCafe: any[] = []; start = 0; hasMore = true;
    while (hasMore) { const { data } = await supabase.from('cafe_orders').select('*').range(start, start + step - 1); if (data && data.length > 0) { allCafe.push(...data); start += step; if (data.length < step) hasMore = false; } else hasMore = false; }

    let allExpenses: any[] = []; start = 0; hasMore = true;
    while (hasMore) { const { data } = await supabase.from('expenses').select('*').range(start, start + step - 1); if (data && data.length > 0) { allExpenses.push(...data); start += step; if (data.length < step) hasMore = false; } else hasMore = false; }

    setRawExpenses(allExpenses.sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()));

    const monthsMap: Record<string, any> = {};

    const getMonthStr = (dbDate: any, createdAt: any) => {
      let d = dbDate ? String(dbDate).trim() : (createdAt ? String(createdAt).split('T')[0] : '');
      if (!d) return 'Unknown';
      if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.substring(0, 7);
      try { const dateObj = new Date(d); if (!isNaN(dateObj.getTime())) return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`; } catch (e) {}
      return d.substring(0, 7); 
    };

    const initMonth = (m: string) => {
      if (!monthsMap[m]) monthsMap[m] = { month: m, income: 0, fixed: 0, variable: 0, adhoc: 0, loan: 0, self: 0 };
    };

    let calcCash = 0; let calcBank = 0;

    const processIncomeLiquidity = (methodStr: string, amt: number) => {
       const m = String(methodStr || '').trim();
       if (m.startsWith('Split|')) { const parts = m.split('|'); calcCash += Number(parts[1] || 0); calcBank += Number(parts[2] || 0); }
       else if (m === 'Cash') calcCash += amt;
       else if (m === 'UPI') calcBank += amt;
    };

    allSales.forEach(s => {
      const m = getMonthStr(s.date, s.created_at); initMonth(m);
      const amt = Number(s.total || s.total_cost || s.amount || 0);
      monthsMap[m].income += amt; 
      processIncomeLiquidity(s.method, amt); 
    });

    allCafe.forEach(c => {
      const method = String(c.method || c.payment_method || '').trim();
      if (method.toLowerCase() !== 'tab') {
        const m = getMonthStr(c.date, c.created_at); initMonth(m);
        const amt = Number(c.total_revenue || c.total || c.amount || 0);
        monthsMap[m].income += amt;
        processIncomeLiquidity(method, amt); 
      }
    });

    const pending: any[] = [];
    allExpenses.forEach(e => {
      const m = getMonthStr(e.expense_date, e.created_at); initMonth(m);
      const amt = Number(e.amount || 0);
      
      if (e.category === 'Bank Deposit' && e.status === 'Paid') {
          calcCash -= amt; 
          calcBank += amt; 
      } else if (e.category === 'Capital / Opening Balance' && e.status === 'Paid') {
          if (e.payment_method === 'Cash') calcCash += amt;
          else calcBank += amt;
      } else {
          if (e.category === 'Fixed Cost') monthsMap[m].fixed += amt;
          else if (e.category === 'Variable F&B') monthsMap[m].variable += amt;
          else if (e.category === 'Adhoc') monthsMap[m].adhoc += amt;
          else if (e.category === 'Loan Repayment') monthsMap[m].loan += amt;
          else if (e.category === 'Self Drawn') monthsMap[m].self += amt;

          if (e.status === 'Paid') {
              if (e.payment_method === 'Cash') calcCash -= amt;
              else calcBank -= amt; 
          }
      }

      if (e.status === 'Pending') pending.push(e);
    });

    let totalOpProfit = 0; let totalRetained = 0; let totalLifetimeIncome = 0;

    const sortedMonths = Object.values(monthsMap).sort((a: any, b: any) => a.month.localeCompare(b.month));
    sortedMonths.forEach((m: any) => {
      m.totalOpEx = m.fixed + m.variable + m.adhoc;
      m.netProfit = m.income - m.totalOpEx;
      m.totalDrawings = m.loan + m.self;
      m.retainedEarnings = m.netProfit - m.totalDrawings;
      totalLifetimeIncome += m.income; totalOpProfit += m.netProfit; totalRetained += m.retainedEarnings;
    });

    setMonthlyLedger(sortedMonths.reverse()); 
    setPendingBills(pending);
    setLifetimeMetrics({ totalIncome: totalLifetimeIncome, opProfit: totalOpProfit, retained: totalRetained, investment: 1000000, liveBank: calcBank, liveCash: calcCash });
    setIsProcessing(false);
  }

  const handleLogin = (e: any) => {
    e.preventDefault();
    if (password === 'Finance@2026') setIsUnlocked(true); else alert('Unauthorized Access');
  };

  const handleAddTransaction = async (e: any) => {
    e.preventDefault();
    if (isProcessing) return; setIsProcessing(true);

    if (entryType === 'Expense') {
      await supabase.from('expenses').insert([{ expense_date: expDate, category: expCategory, description: expDesc, amount: Number(expAmount), payment_method: expMethod, status: expStatus }]);
    } else {
      await supabase.from('sales').insert([{ date: expDate, customer: expDesc || 'Manual Income Entry', system: 'Manual', duration: 0, total: Number(expAmount), status: 'Completed', method: expMethod, fnb_total: 0 }]);
    }

    setExpDesc(''); setExpAmount(''); setExpStatus('Paid');
    await fetchLedgerData();
  };

  const markAsPaid = async (id: number) => {
    if (isProcessing) return; setIsProcessing(true);
    await supabase.from('expenses').update({ status: 'Paid' }).eq('id', id);
    await fetchLedgerData();
  };

  const handleDeleteExpense = async (id: number) => {
    if (!window.confirm("Delete this expense? PnL will automatically recalculate.")) return;
    if (isProcessing) return; setIsProcessing(true);
    await supabase.from('expenses').delete().eq('id', id);
    await fetchLedgerData();
  };

  // 🟢 HARD-SYNC FUNCTION
  const handleSyncBalances = async (e: any) => {
    e.preventDefault();
    if (isProcessing) return; setIsProcessing(true);

    const bankDiff = Number(syncBank) - lifetimeMetrics.liveBank;
    const cashDiff = Number(syncCash) - lifetimeMetrics.liveCash;
    const dateStr = new Date().toLocaleDateString('en-CA');

    // Silent adjustments to fix math perfectly without hitting PnL
    if (bankDiff !== 0) {
       await supabase.from('expenses').insert([{ expense_date: dateStr, category: 'Capital / Opening Balance', description: 'System Auto-Sync (Bank)', amount: bankDiff, payment_method: 'UPI', status: 'Paid' }]);
    }
    if (cashDiff !== 0) {
       await supabase.from('expenses').insert([{ expense_date: dateStr, category: 'Capital / Opening Balance', description: 'System Auto-Sync (Cash)', amount: cashDiff, payment_method: 'Cash', status: 'Paid' }]);
    }

    setShowSyncModal(false);
    await fetchLedgerData();
  };

  const roiPercentage = Math.min(100, (Math.max(0, lifetimeMetrics.opProfit) / lifetimeMetrics.investment) * 100);

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-[#05070A] text-white font-sans overflow-hidden">
      
      {/* 🟢 UNIFIED DESKTOP SIDEBAR */}
      <div className="hidden md:flex w-16 bg-[#0B0E14] border-r border-[#1E293B] flex-col items-center py-4 shrink-0 z-10 gap-4">
        <a href="/" className="p-3 bg-[#1A2235] text-gray-400 hover:text-[#00D0FF] hover:border-[#00D0FF] border border-[#2D3748] rounded-xl transition-all shadow-sm" title="Live Floor"><Monitor size={20} /></a>
        <a href="/vault/inventory" className="p-3 bg-[#1A2235] text-gray-400 hover:text-[#00D0FF] hover:border-[#00D0FF] border border-[#2D3748] rounded-xl transition-all shadow-sm" title="Inventory"><Package size={20} /></a>
        <a href="/vault/analytics" className="p-3 bg-[#1A2235] text-gray-400 hover:text-orange-500 hover:border-orange-500 border border-[#2D3748] rounded-xl transition-all shadow-sm" title="Master Analytics"><BarChart3 size={20} /></a>
        <div className="p-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]" title="Financial Ledger"><Wallet size={20} /></div>
      </div>

      {/* 🟢 MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0B0E14] border-t border-[#1E293B] flex items-center justify-around z-40 px-2 shadow-2xl">
        <a href="/" className="p-2.5 bg-[#1A2235] text-gray-400 hover:text-[#00D0FF] rounded-xl border border-[#2D3748]" title="Live Floor"><Monitor size={20} /></a>
        <a href="/vault/inventory" className="p-2.5 bg-[#1A2235] text-gray-400 hover:text-[#00D0FF] rounded-xl border border-[#2D3748]" title="Inventory"><Package size={20} /></a>
        <a href="/vault/analytics" className="p-2.5 bg-[#1A2235] text-gray-400 hover:text-orange-500 rounded-xl border border-[#2D3748]" title="Master Analytics"><BarChart3 size={20} /></a>
        <div className="p-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500 rounded-xl transition-all" title="Financial Ledger"><Wallet size={20} /></div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6 custom-scrollbar relative">
        
        {!isUnlocked ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#05070A] p-4">
            <form onSubmit={handleLogin} className="bg-[#121824] p-6 sm:p-8 rounded-3xl border border-emerald-500/30 shadow-2xl w-full max-w-sm text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full -mr-10 -mt-10 blur-2xl"></div>
              <div className="flex justify-center mb-4"><Wallet size={40} className="text-emerald-400 relative z-10"/></div>
              <h2 className="text-xl sm:text-2xl font-black mb-6 tracking-tight relative z-10">Corporate Ledger</h2>
              <input type="password" placeholder="Financial PIN" className="w-full bg-[#0B0E14] p-4 text-center rounded-xl border border-[#2D3748] focus:border-emerald-400 outline-none font-bold tracking-widest mb-4 relative z-10" value={password} onChange={e => setPassword(e.target.value)} />
              <button type="submit" className="w-full bg-emerald-500 text-black py-4 rounded-xl font-black hover:bg-emerald-400 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] relative z-10">Access Books</button>
            </form>
          </div>
        ) : (
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          
          {/* 🟢 LIVE LIQUIDITY TRACKERS WITH SYNC BUTTON */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative mt-2 sm:mt-0">
             
             {/* 🟢 EDIT SYNC BUTTON */}
             <div className="absolute -top-3 -right-2 sm:-right-2 z-20">
                <button onClick={() => { setSyncBank(lifetimeMetrics.liveBank); setSyncCash(lifetimeMetrics.liveCash); setShowSyncModal(true); }} className="bg-[#1A2235] text-gray-400 p-2 sm:p-2.5 rounded-full border border-[#2D3748] hover:text-emerald-400 hover:border-emerald-400 transition-all shadow-xl" title="Sync Balances">
                   <Edit3 size={16}/>
                </button>
             </div>

             <div className="bg-[#121824] p-5 sm:p-6 rounded-3xl border border-[#1E293B] shadow-lg flex justify-between items-center">
                <div>
                   <p className="text-emerald-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><Landmark size={14}/> Live Bank Balance</p>
                   <p className="text-2xl sm:text-3xl font-black text-white mt-1">₹{formatINR(lifetimeMetrics.liveBank)}</p>
                </div>
             </div>
             <div className="bg-[#121824] p-5 sm:p-6 rounded-3xl border border-[#1E293B] shadow-lg flex justify-between items-center">
                <div>
                   <p className="text-[#00D0FF] text-[9px] sm:text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><Banknote size={14}/> Cash at Home</p>
                   <p className="text-2xl sm:text-3xl font-black text-white mt-1">₹{formatINR(lifetimeMetrics.liveCash)}</p>
                </div>
             </div>
          </div>

          {/* 10 LAKH ROI TRACKER */}
          <div className="bg-[#121824] p-5 sm:p-8 rounded-3xl border border-[#1E293B] shadow-xl relative overflow-hidden">
             <div className="absolute right-0 top-0 w-48 h-48 sm:w-64 sm:h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 sm:-mr-20 sm:-mt-20"></div>
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 sm:mb-6 relative z-10 gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2"><TrendingUp className="text-emerald-400" size={20}/> ROI & Breakeven Tracker</h2>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">Total Net Profit generated vs ₹10 Lakh Initial Investment.</p>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto bg-[#0B0E14] sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none border border-[#2D3748] sm:border-none">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase text-emerald-400 tracking-widest mb-1">Total Profit Generated</p>
                  <p className="text-2xl sm:text-4xl font-black tabular-nums">₹{formatINR(lifetimeMetrics.opProfit)}</p>
                </div>
             </div>
             
             <div className="w-full bg-[#0B0E14] rounded-full h-5 sm:h-6 border border-[#2D3748] relative z-10 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full transition-all duration-1000 flex items-center justify-end px-2" style={{ width: `${roiPercentage}%` }}>
                   {roiPercentage > 5 && <span className="text-[9px] sm:text-[10px] font-black text-black">{roiPercentage.toFixed(1)}%</span>}
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            
            {/* RECORD TRANSACTION FORM */}
            <form onSubmit={handleAddTransaction} className="lg:col-span-2 bg-[#121824] p-5 sm:p-6 rounded-3xl border border-[#1E293B] shadow-lg">
               
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 border-b border-[#1E293B] pb-4 gap-4">
                 <h3 className="text-lg sm:text-xl font-black flex items-center gap-2"><CreditCard className="text-[#00D0FF]"/> Record Transaction</h3>
                 
                 <div className="flex w-full sm:w-auto bg-[#0B0E14] rounded-lg p-1 border border-[#2D3748]">
                   <button type="button" onClick={() => setEntryType('Expense')} className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-1 text-[10px] sm:text-xs font-bold rounded-md transition-all ${entryType === 'Expense' ? 'bg-red-500/20 text-red-400' : 'text-gray-500 hover:text-white'}`}>Expense / Transfer</button>
                   <button type="button" onClick={() => setEntryType('Income')} className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-1 text-[10px] sm:text-xs font-bold rounded-md transition-all ${entryType === 'Income' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-white'}`}>Manual Income</button>
                 </div>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                 <div>
                   <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Date</label>
                   <input required type="date" className="w-full bg-[#0B0E14] mt-1 p-3 text-sm rounded-xl border border-[#2D3748] focus:border-[#00D0FF] outline-none [color-scheme:dark]" value={expDate} onChange={e => setExpDate(e.target.value)} />
                 </div>
                 
                 {entryType === 'Expense' ? (
                   <div>
                     <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Category</label>
                     <select className="w-full bg-[#0B0E14] mt-1 p-3 text-sm rounded-xl border border-[#2D3748] focus:border-[#00D0FF] outline-none" value={expCategory} onChange={e => setExpCategory(e.target.value)}>
                       <option>Fixed Cost</option><option>Variable F&B</option><option>Adhoc</option><option>Loan Repayment</option><option>Self Drawn</option>
                       <option className="font-bold text-[#00D0FF]">Bank Deposit</option>
                       <option className="font-bold text-emerald-400">Capital / Opening Balance</option>
                     </select>
                   </div>
                 ) : (
                   <div>
                     <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Category</label>
                     <div className="w-full bg-[#0B0E14] mt-1 p-3 text-sm rounded-xl border border-[#2D3748] text-emerald-400 font-bold">Historical Income</div>
                   </div>
                 )}

                 <div className="sm:col-span-2 md:col-span-1">
                   <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Total Amount (₹)</label>
                   <input required type="number" placeholder="0" className={`w-full bg-[#0B0E14] mt-1 p-3 text-sm rounded-xl border border-[#2D3748] outline-none font-bold ${entryType === 'Expense' ? 'focus:border-red-400 text-red-400' : 'focus:border-emerald-400 text-emerald-400'}`} value={expAmount} onChange={e => setExpAmount(e.target.value)} />
                 </div>
               </div>

               <div className="mb-4 sm:mb-6">
                 <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Description</label>
                 <input required placeholder={entryType === 'Expense' ? (expCategory === 'Bank Deposit' ? "e.g., Weekly Cash Drop" : "e.g., Internet Bill, Bulk Redbull") : "e.g., April Historical Revenue"} className="w-full bg-[#0B0E14] mt-1 p-3 text-sm rounded-xl border border-[#2D3748] outline-none focus:border-[#00D0FF]" value={expDesc} onChange={e => setExpDesc(e.target.value)} />
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#1E293B]">
                 <div>
                   <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Payment Method</label>
                   <select className="w-full bg-[#0B0E14] mt-1 p-3 text-sm rounded-xl border border-[#2D3748] outline-none" value={expMethod} onChange={e => setExpMethod(e.target.value)}>
                     <option>UPI</option><option>Cash</option><option>Credit Card</option><option>Bank Transfer</option>
                   </select>
                 </div>
                 
                 {entryType === 'Expense' && (
                   <div>
                     <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Settlement Status</label>
                     <select className={`w-full mt-1 p-3 text-sm rounded-xl border border-[#2D3748] outline-none font-bold ${expStatus === 'Pending' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' : 'bg-[#0B0E14] text-white'}`} value={expStatus} onChange={e => setExpStatus(e.target.value)}>
                       <option value="Paid">✅ Paid Now</option><option value="Pending">⏳ Pending (Pay Later)</option>
                     </select>
                   </div>
                 )}
               </div>

               <button type="submit" disabled={isProcessing} className={`w-full text-black mt-6 py-3.5 sm:py-4 rounded-xl font-black hover:bg-white transition-all disabled:opacity-50 flex justify-center items-center gap-2 text-sm sm:text-base ${entryType === 'Expense' ? 'bg-[#00D0FF] shadow-[0_0_15px_rgba(0,208,255,0.2)]' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]'}`}>
                 {isProcessing ? 'Recording...' : <><Plus size={18}/> Record to Ledger</>}
               </button>
            </form>

            {/* PENDING PAYABLES WIDGET */}
            <div className="bg-[#121824] rounded-3xl border border-orange-500/30 shadow-lg flex flex-col h-[300px] lg:h-auto">
              <div className="p-5 sm:p-6 border-b border-[#1E293B] bg-orange-500/5 rounded-t-3xl shrink-0">
                <h3 className="text-base sm:text-lg font-black flex items-center gap-2 text-orange-400"><AlertCircle size={16}/> Pending Payables</h3>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-1">Credit Cards & Unpaid Bills.</p>
              </div>
              <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                {pendingBills.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500 text-xs sm:text-sm italic">No pending bills.</div>
                ) : (
                  <div className="space-y-3">
                    {pendingBills.map(b => (
                      <div key={b.id} className="bg-[#0B0E14] p-3 rounded-xl border border-[#2D3748] flex justify-between items-center group">
                        <div className="pr-2">
                          <p className="text-xs sm:text-sm font-bold text-white leading-tight">{b.description}</p>
                          <p className="text-[9px] sm:text-[10px] text-gray-500 mt-1">{b.expense_date} • {b.payment_method}</p>
                        </div>
                        <div className="text-right flex flex-col items-end shrink-0">
                          <p className="font-black text-orange-400 text-sm">₹{formatINR(b.amount)}</p>
                          <button onClick={() => markAsPaid(b.id)} disabled={isProcessing} className="mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] bg-[#1A2235] px-2 py-1 rounded border border-[#2D3748] hover:border-emerald-500 hover:text-emerald-400 transition-all font-bold disabled:opacity-50">Mark Paid</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* MASTER MONTH-OVER-MONTH PNL TABLE */}
          <div className="bg-[#121824] rounded-3xl border border-[#1E293B] overflow-hidden shadow-xl">
             <div className="p-4 sm:p-6 border-b border-[#1E293B] flex justify-between items-center bg-[#0B0E14]">
                <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 sm:gap-3"><PiggyBank className="text-emerald-400" size={20}/> Month-over-Month PnL</h3>
             </div>
             <div className="overflow-x-auto custom-scrollbar">
               <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap min-w-[900px]">
                  <thead className="bg-[#1A2235] text-[9px] sm:text-[10px] uppercase text-gray-400 font-black tracking-wider">
                    <tr>
                      <th className="p-3 sm:p-4 border-r border-[#2D3748]">Month</th>
                      <th className="p-3 sm:p-4 text-[#00D0FF]"><div className="flex items-center gap-1"><ArrowDownToLine size={12}/> Total Income</div></th>
                      <th className="p-3 sm:p-4 border-l border-[#2D3748]"><div className="flex items-center gap-1"><ArrowUpFromLine size={12}/> Fixed Cost</div></th>
                      <th className="p-3 sm:p-4">F&B Restock</th>
                      <th className="p-3 sm:p-4 border-r border-[#2D3748]">Adhoc Exp</th>
                      <th className="p-3 sm:p-4 text-emerald-400 border-r border-[#2D3748] bg-emerald-500/5">Net Profit (Before Draws)</th>
                      <th className="p-3 sm:p-4 text-orange-400">Loan Repay</th>
                      <th className="p-3 sm:p-4 text-orange-400 border-r border-[#2D3748]">Self Drawn</th>
                      <th className="p-3 sm:p-4 text-white bg-white/5 font-black">Retained (Bank Bal)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]">
                    {monthlyLedger.length === 0 ? (
                      <tr><td colSpan={9} className="p-6 sm:p-8 text-center text-gray-500">No financial data found.</td></tr>
                    ) : (
                      monthlyLedger.map((row, i) => (
                        <tr key={i} className="hover:bg-[#1A2235]/30 transition-colors">
                          <td className="p-3 sm:p-4 font-bold border-r border-[#2D3748]">{row.month}</td>
                          <td className="p-3 sm:p-4 text-[#00D0FF] font-bold text-sm sm:text-base">₹{formatINR(row.income)}</td>
                          <td className="p-3 sm:p-4 text-red-400 border-l border-[#2D3748]">₹{formatINR(row.fixed)}</td>
                          <td className="p-3 sm:p-4 text-red-400">₹{formatINR(row.variable)}</td>
                          <td className="p-3 sm:p-4 text-red-400 border-r border-[#2D3748]">₹{formatINR(row.adhoc)}</td>
                          
                          <td className="p-3 sm:p-4 font-black text-emerald-400 border-r border-[#2D3748] bg-emerald-500/5 text-base sm:text-lg shadow-inner">
                            ₹{formatINR(row.netProfit)}
                          </td>
                          
                          <td className="p-3 sm:p-4 text-orange-400">₹{formatINR(row.loan)}</td>
                          <td className="p-3 sm:p-4 text-orange-400 border-r border-[#2D3748]">₹{formatINR(row.self)}</td>
                          <td className="p-3 sm:p-4 font-black text-white bg-white/5 text-lg sm:text-xl shadow-inner">
                            ₹{formatINR(row.retainedEarnings)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
             </div>
          </div>

          {/* COMPLETE EXPENSE LOG */}
          <div className="bg-[#121824] rounded-3xl border border-[#1E293B] overflow-hidden shadow-xl mt-6 sm:mt-8">
             <div className="p-4 sm:p-6 border-b border-[#1E293B] flex justify-between items-center bg-[#0B0E14]">
                <div>
                   <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 sm:gap-3"><List className="text-[#00D0FF]" size={20}/> Complete Expense Log</h3>
                   <p className="text-[10px] sm:text-xs text-gray-400 mt-1">Review your past entries.</p>
                </div>
             </div>
             <div className="overflow-x-auto max-h-[350px] sm:max-h-[400px] custom-scrollbar">
               <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap min-w-[800px]">
                  <thead className="bg-[#1A2235] text-[9px] sm:text-[10px] uppercase text-gray-400 font-black tracking-wider sticky top-0 z-10 shadow-sm">
                    <tr><th className="p-3 sm:p-4">Date</th><th className="p-3 sm:p-4">Category</th><th className="p-3 sm:p-4">Description</th><th className="p-3 sm:p-4">Amount</th><th className="p-3 sm:p-4">Method</th><th className="p-3 sm:p-4">Status</th><th className="p-3 sm:p-4 text-right">Action</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]">
                    {rawExpenses.length === 0 ? (
                      <tr><td colSpan={7} className="p-6 sm:p-8 text-center text-gray-500">No expenses recorded.</td></tr>
                    ) : (
                      rawExpenses.map((exp, i) => (
                        <tr key={i} className="hover:bg-[#1A2235]/30 transition-colors">
                          <td className="p-3 sm:p-4 text-gray-400">{exp.expense_date}</td><td className="p-3 sm:p-4 font-bold">{exp.category}</td><td className="p-3 sm:p-4 text-white font-bold">{exp.description}</td>
                          <td className="p-3 sm:p-4 font-bold text-red-400">₹{formatINR(exp.amount)}</td><td className="p-3 sm:p-4 text-gray-400">{exp.payment_method}</td>
                          <td className="p-3 sm:p-4"><span className={`px-2 py-1 rounded-md text-[9px] sm:text-[10px] font-bold ${exp.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>{exp.status}</span></td>
                          <td className="p-3 sm:p-4 text-right"><button onClick={() => handleDeleteExpense(exp.id)} disabled={isProcessing} className="p-1.5 sm:p-2 bg-[#1A2235] text-gray-400 hover:text-red-500 border border-[#2D3748] rounded-lg transition-all"><Trash2 size={14}/></button></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
             </div>
          </div>
          <div className="pb-10"></div>
        </div>
        )}
      </div>

      {/* 🟢 HARD-SYNC MODAL */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSyncBalances} className="bg-[#121824] p-6 rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto custom-scrollbar border border-[#1E293B] shadow-2xl relative transition-all">
            <div className="flex justify-between items-center mb-5 sm:mb-6 border-b border-[#1E293B] pb-4">
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2"><Edit3 className="text-emerald-400" size={18}/> Hard-Sync Balances</h2>
              <button type="button" onClick={() => setShowSyncModal(false)} className="p-2 bg-[#0B0E14] rounded-full hover:bg-red-500/20 hover:text-red-500 transition-colors"><X size={16}/></button>
            </div>
            
            <p className="text-[10px] sm:text-xs text-gray-400 mb-5 sm:mb-6">Enter the EXACT amount of money you have in reality right now. The system will auto-correct to match this without hitting the PnL.</p>

            <div className="space-y-4 mb-6">
               <div>
                 <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Actual Bank Balance (₹)</label>
                 <input type="number" required className="w-full bg-[#0B0E14] mt-1 p-3 text-sm rounded-xl border border-[#2D3748] focus:border-emerald-400 outline-none font-bold text-emerald-400" value={syncBank} onChange={e => setSyncBank(e.target.value)} />
               </div>
               <div>
                 <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Actual Cash at Home (₹)</label>
                 <input type="number" required className="w-full bg-[#0B0E14] mt-1 p-3 text-sm rounded-xl border border-[#2D3748] focus:border-[#00D0FF] outline-none font-bold text-[#00D0FF]" value={syncCash} onChange={e => setSyncCash(e.target.value)} />
               </div>
            </div>

            <button type="submit" disabled={isProcessing} className="w-full bg-emerald-500 text-black py-3.5 sm:py-4 rounded-xl font-black transition-all hover:bg-white disabled:opacity-50 shadow-[0_0_15px_rgba(16,185,129,0.3)] text-sm sm:text-base">
               {isProcessing ? 'Syncing...' : 'Sync Balances Now'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}