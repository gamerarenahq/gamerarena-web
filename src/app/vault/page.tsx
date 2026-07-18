'use client'

import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Monitor, Package, BarChart3, Lock, CheckCircle2, Copy, X } from 'lucide-react';

function formatINR(num: number) { return Math.round(num || 0).toLocaleString('en-IN'); }

export default function MasterVault() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  
  const [ledger, setLedger] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reportModal, setReportModal] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) fetchLedger();
  }, [isAuthenticated]);

  async function fetchLedger() {
    const { data } = await supabase.from('daily_ledger').select('*').order('date', { ascending: false }).limit(30);
    if (data) setLedger(data);
  }

  const markUPISettled = async (id: number) => {
    if (isProcessing) return; setIsProcessing(true);
    await supabase.from('daily_ledger').update({ upi_status: 'Settled' }).eq('id', id);
    await fetchLedger(); setIsProcessing(false);
  };

  const generateDailyReport = async (row: any) => {
    setIsProcessing(true);
    const { data: sales } = await supabase.from('sales').select('*').eq('date', row.date).eq('status', 'Completed');
    const { data: cafe } = await supabase.from('cafe_orders').select('*').eq('date', row.date);

    let ps5 = 0, pc = 0, sim = 0;
    if (sales) {
       sales.forEach(s => {
          const gameCost = Math.max(0, Number(s.total || 0) - Number(s.fnb_total || 0));
          if (String(s.system).includes('PC')) pc += gameCost;
          else if (String(s.system).includes('PS')) ps5 += gameCost;
          else if (String(s.system).includes('SIM')) sim += gameCost;
       });
    }

    let fnbSale = 0, fnbProfit = 0, miscSale = 0;
    if (cafe) {
       cafe.forEach(c => {
           const itemsStr = String(c.items || '');
           if (itemsStr.includes('[Retail]')) {
              miscSale += Number(c.total_revenue || 0);
           } else if (c.category !== 'Retail' && c.category !== 'Merch') {
              fnbSale += Number(c.total_revenue || 0);
              fnbProfit += isNaN(Number(c.profit)) ? (Number(c.total_revenue || 0) - Number(c.total_cost || 0)) : Number(c.profit);
           }
       });
    }

    const dateObj = new Date(row.date);
    const day = dateObj.getDate();
    const suffix = (day % 10 === 1 && day !== 11) ? "st" : (day % 10 === 2 && day !== 12) ? "nd" : (day % 10 === 3 && day !== 13) ? "rd" : "th";
    const formattedDate = `${day}${suffix} ${dateObj.toLocaleString('en-US', { month: 'long' })}`;

    const totalMath = Number(row.cash_collected) + Number(row.upi_collected) - fnbSale + fnbProfit;

    let text = `Today's income - ${formattedDate}\n\n`;
    text += `a. Cash - ${formatINR(row.cash_collected)}\n`;
    text += `b. UPI -  ${formatINR(row.upi_collected)}\n`;
    text += `c. F&B sale - ${formatINR(fnbSale)}\n`;
    text += `d. F&B profit- ${formatINR(fnbProfit)}\n`;
    if (miscSale > 0) text += `e. Retail/Misc - ${formatINR(miscSale)}\n`;
    
    text += `\n${miscSale > 0 ? 'A+B-C+D(Misc)' : 'A+B-C+D'}= Total  - ${formatINR(totalMath)}\n\n`;
    text += `Breakup:\n`;
    text += `PS5- ${formatINR(ps5)}\n`;
    text += `PC- ${formatINR(pc)}\n`;
    text += `SIM- ${formatINR(sim)}`;

    setReportModal(text);
    setIsProcessing(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-screen bg-[#05070A] text-white items-center justify-center p-4">
        <form onSubmit={(e) => { e.preventDefault(); if (password === 'Vault@2026') setIsAuthenticated(true); else alert('Incorrect Password'); }} 
              className="bg-[#121824] p-8 rounded-3xl border border-[#1E293B] shadow-2xl w-full max-w-sm text-center">
            <div className="flex justify-center mb-6"><Lock size={40} className="text-orange-500"/></div>
            <h2 className="text-2xl font-black mb-6">Master Vault Access</h2>
            <input type="password" placeholder="Enter Vault PIN" className="w-full bg-[#0B0E14] p-4 text-center rounded-xl border border-[#2D3748] focus:border-orange-500 outline-none font-bold tracking-widest mb-4" value={password} onChange={e => setPassword(e.target.value)} />
            <button type="submit" className="w-full bg-orange-500 text-black py-4 rounded-xl font-black hover:bg-white transition-all">Unlock Vault</button>
        </form>
      </div>
    );
  }

  const totalPendingUPI = ledger.filter(l => l.upi_status === 'Pending').reduce((sum, l) => sum + Number(l.upi_collected), 0);

  return (
    <div className="flex h-screen w-screen bg-[#05070A] text-white font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <div className="w-16 bg-[#0B0E14] border-r border-[#1E293B] flex flex-col items-center py-4 shrink-0 z-10 gap-4">
        <a href="/" className="p-3 bg-[#1A2235] text-gray-400 hover:text-[#00D0FF] hover:border-[#00D0FF] border border-[#2D3748] rounded-xl transition-all shadow-sm" title="Live Floor"><Monitor size={20} /></a>
        <a href="/vault/inventory" className="p-3 bg-[#1A2235] text-gray-400 hover:text-[#00D0FF] hover:border-[#00D0FF] border border-[#2D3748] rounded-xl transition-all shadow-sm" title="Inventory"><Package size={20} /></a>
        <div className="p-3 bg-orange-500/20 text-orange-500 border border-orange-500 rounded-xl transition-all shadow-[0_0_15px_rgba(249,115,22,0.2)]" title="Master Vault"><BarChart3 size={20} /></div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        <div className="max-w-6xl mx-auto flex flex-col">
          
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
              Master <span className="text-orange-500">Vault</span>
            </h1>
            <div className="text-right bg-orange-500/10 px-4 py-2 rounded-xl border border-orange-500/30">
                <p className="text-orange-500 text-[10px] font-black uppercase tracking-widest mb-0.5">Pending Bank Deposits</p>
                <p className="text-white text-xl font-black tabular-nums tracking-tight leading-none">₹{formatINR(totalPendingUPI)}</p>
            </div>
          </div>

          <div className="bg-[#0B0E14] rounded-2xl border border-[#1E293B] overflow-hidden">
            <div className="grid grid-cols-9 gap-4 p-4 bg-[#121824] border-b border-[#1E293B] text-[10px] font-black text-gray-500 uppercase tracking-widest">
              <div className="col-span-1">Date</div>
              <div className="col-span-1 text-right">Gross Rev</div>
              <div className="col-span-1 text-right text-gray-400">Gaming</div>
              <div className="col-span-1 text-right text-gray-400">F&B + Misc</div>
              <div className="col-span-1 text-right text-green-400">Cash Drop</div>
              <div className="col-span-1 text-right text-[#00D0FF]">UPI Total</div>
              <div className="col-span-3 pl-4">Banking & Reports</div>
            </div>
            
            <div className="divide-y divide-[#1E293B]">
              {ledger.map(row => (
                <div key={row.id} className="grid grid-cols-9 gap-4 p-4 items-center text-sm hover:bg-[#121824]/50 transition-colors">
                  <div className="col-span-1 font-bold text-gray-300">{row.date}</div>
                  <div className="col-span-1 text-right font-black text-white">₹{formatINR(row.gross_total)}</div>
                  <div className="col-span-1 text-right text-gray-400">₹{formatINR(row.gaming_revenue)}</div>
                  <div className="col-span-1 text-right text-gray-400">₹{formatINR(Number(row.fnb_revenue) + Number(row.misc_revenue))}</div>
                  
                  <div className="col-span-1 text-right">
                     <p className="font-bold text-green-400">₹{formatINR(row.cash_withdrawn)}</p>
                     <p className="text-[9px] text-gray-500">Float: ₹{row.float_forward}</p>
                  </div>
                  
                  <div className="col-span-1 text-right font-bold text-[#00D0FF]">₹{formatINR(row.upi_collected)}</div>
                  
                  <div className="col-span-3 pl-4 flex items-center gap-2">
                     <button onClick={() => generateDailyReport(row)} disabled={isProcessing} className="flex items-center gap-1 text-[10px] font-bold text-[#00D0FF] bg-[#00D0FF]/10 hover:bg-[#00D0FF] hover:text-black px-2 py-1.5 rounded-md border border-[#00D0FF]/20 transition-all">
                       <Copy size={12}/> Report
                     </button>
                     
                     {row.upi_status === 'Settled' ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1.5 rounded-md border border-emerald-500/20">
                          <CheckCircle2 size={12}/> Settled
                        </span>
                     ) : (
                        <button onClick={() => markUPISettled(row.id)} disabled={isProcessing} className="text-[10px] font-bold text-white bg-[#1A2235] hover:bg-orange-500 hover:text-black px-2.5 py-1.5 rounded-md border border-[#2D3748] transition-all">
                          Mark Cleared
                        </button>
                     )}
                  </div>
                </div>
              ))}
              {ledger.length === 0 && <div className="p-8 text-center text-gray-500 text-sm col-span-9">No ledger entries found. Run "Close Day" on the floor to generate data.</div>}
            </div>
          </div>

        </div>
      </div>

      {reportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#121824] p-6 rounded-3xl w-full max-w-sm border border-[#1E293B] shadow-2xl relative">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-white">Detailed Format</h2>
                <button onClick={() => setReportModal(null)} className="p-2 bg-[#0B0E14] rounded-full hover:bg-red-500/20 hover:text-red-500 transition-colors"><X size={16}/></button>
             </div>
             <div className="bg-[#0B0E14] border border-[#2D3748] p-5 rounded-2xl font-mono text-sm text-gray-300 whitespace-pre-wrap">
                {reportModal}
             </div>
             <div className="mt-4">
                <button onClick={() => { navigator.clipboard.writeText(reportModal); alert("Report copied to clipboard!"); }} className="w-full bg-white text-black py-4 rounded-xl font-black hover:bg-gray-200 transition-all flex items-center justify-center gap-2">
                   <Copy size={16}/> Copy Report
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}