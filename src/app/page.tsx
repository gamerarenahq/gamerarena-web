'use client'

import { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import { X, User, Clock, ArrowRightLeft, Coffee, Plus, Minus, Gamepad2, Monitor, Car, IndianRupee, Pencil, Package, BarChart3, ShoppingCart, MoonStar, Copy } from 'lucide-react';

function formatINR(num: number) {
  return Math.round(num || 0).toLocaleString('en-IN');
}

function getTodayString() {
  const d = new Date();
  const options = { timeZone: 'Asia/Kolkata', year: 'numeric' as const, month: '2-digit' as const, day: '2-digit' as const };
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  return formatter.format(d);
}

function getFormattedDateForReport() {
  const d = new Date();
  const day = d.getDate();
  const suffix = (day % 10 === 1 && day !== 11) ? "st" : (day % 10 === 2 && day !== 12) ? "nd" : (day % 10 === 3 && day !== 13) ? "rd" : "th";
  const month = d.toLocaleString('en-US', { month: 'long' });
  return `${day}${suffix} ${month}`;
}

const SYSTEMS = [
  { id: 'PC1', type: 'PC', icon: Monitor }, { id: 'PC2', type: 'PC', icon: Monitor }, { id: 'SIM1', type: 'Racing Sim', icon: Car },
  { id: 'PS1', type: 'PS5', icon: Gamepad2 }, { id: 'PS2', type: 'PS5', icon: Gamepad2 }, { id: 'PS3', type: 'PS5', icon: Gamepad2 }
];

function getPrice(cat: string, dur: number, extra: number = 0) {
  const full = Math.floor(dur); 
  const half = (dur % 1 !== 0) ? 1 : 0;
  if (cat === "PC") return (full * 100) + (half * 70);
  if (cat === "Racing Sim") return (full * 250) + (half * 150);
  if (cat === "PS5") return (full * (150 + (extra * 100))) + (half * (100 + (extra * 100)));
  return 0;
}

function getExtraFromTotal(cat: string, dur: number, total: number) {
  if (cat !== 'PS5') return 0;
  const full = Math.floor(dur);
  const half = (dur % 1 !== 0) ? 1 : 0;
  const baseCost = (full * 150) + (half * 100);
  const extraCostMultiplier = (full * 100) + (half * 100);
  if (extraCostMultiplier > 0) return Math.max(0, Math.round((total - baseCost) / extraCostMultiplier));
  return 0;
}

function format12Hour(time24: string) {
  if (!time24) return '';
  const [hour, minute] = time24.split(':');
  let h = parseInt(hour, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12; 
  return `${h.toString().padStart(2, '0')}:${minute} ${ampm}`;
}

function parse12HourToDate(time12: string) {
  if (!time12) return new Date();
  const [timeStr, ampm] = time12.split(' ');
  let [hrs, mins] = timeStr.split(':');
  let h = parseInt(hrs);
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  const d = new Date(); d.setHours(h, parseInt(mins), 0, 0);
  return d;
}

const playAlertSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc1 = audioCtx.createOscillator(); const gain1 = audioCtx.createGain();
    osc1.connect(gain1); gain1.connect(audioCtx.destination);
    osc1.type = 'triangle'; osc1.frequency.setValueAtTime(600, audioCtx.currentTime); 
    gain1.gain.setValueAtTime(0.1, audioCtx.currentTime); 
    osc1.start(); osc1.stop(audioCtx.currentTime + 0.2); 
    setTimeout(() => {
      const osc2 = audioCtx.createOscillator(); const gain2 = audioCtx.createGain();
      osc2.connect(gain2); gain2.connect(audioCtx.destination);
      osc2.type = 'triangle'; osc2.frequency.setValueAtTime(800, audioCtx.currentTime);
      gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc2.start(); osc2.stop(audioCtx.currentTime + 0.3);
    }, 300);
  } catch (error) { console.warn("Audio alert blocked.", error); }
};

export default function GamerarenaMasterERP() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [modal, setModal] = useState<any>(null); 
  const [tick, setTick] = useState(0);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [cafeMenu, setCafeMenu] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  const [name, setName] = useState('');
  const [dur, setDur] = useState(1);
  const [extra, setExtra] = useState(0);
  const [time, setTime] = useState('');
  const [isBookingMode, setIsBookingMode] = useState(false);
  const [payMethod, setPayMethod] = useState('Cash');
  const [splitCash, setSplitCash] = useState(0);
  const [manualTotal, setManualTotal] = useState<number | string>(0);
  const [extendDur, setExtendDur] = useState(0.5);
  const [editTime24, setEditTime24] = useState('');
  
  const [cart, setCart] = useState<any[]>([]);
  const [fnbCategory, setFnbCategory] = useState('');
  const [fnbPayMethod, setFnbPayMethod] = useState('Cash');
  const [fnbSplitCash, setFnbSplitCash] = useState(0);

  const [transferTargetSysId, setTransferTargetSysId] = useState('');
  const [migrateDur, setMigrateDur] = useState(1);
  const [migrateExtra, setMigrateExtra] = useState(0);

  const notifiedRef = useRef(new Set<number>());

  useEffect(() => {
    setCurrentTime(new Date());
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchSessions(); fetchInventory();
    const refreshInterval = setInterval(() => { setTick(t => t + 1); fetchSessions(); }, 30000);
    return () => { clearInterval(clockInterval); clearInterval(refreshInterval); };
  }, []);

  useEffect(() => {
    if (!currentTime || sessions.length === 0) return;
    sessions.filter(s => s.status === 'Active').forEach(s => {
       if (!s.entry_time) return;
       const entryDate = parse12HourToDate(s.entry_time);
       const endTime = entryDate.getTime() + (s.duration * 3600000);
       const timeLeftMins = (endTime - currentTime.getTime()) / 60000;
       
       if (timeLeftMins <= 5.05 && timeLeftMins > 0 && !notifiedRef.current.has(s.id)) {
         notifiedRef.current.add(s.id); playAlertSound();
       }
    });
  }, [currentTime, sessions]);

  async function fetchSessions() {
    const { data: activeData, error: activeError } = await supabase.from('sales').select('*').in('status', ['Active', 'Hold', 'Reserved']);
    if (!activeError && activeData) setSessions(activeData); 
  }

  async function fetchInventory() {
    const { data } = await supabase.from('inventory').select('*');
    if (data) {
      const mappedMenu = data.map(item => ({ id: item.id, name: item.item_name, category: item.category, price: item.selling_price, cost: item.cost_price, stock: item.stock_level }));
      setCafeMenu(mappedMenu);
      const uniqueCats = Array.from(new Set(mappedMenu.map(item => item.category))) as string[];
      setCategories(uniqueCats);
      if (uniqueCats.length > 0) setFnbCategory(uniqueCats[0]);
    }
  }

  const getHoldSessions = (sessionId: number) => sessions.filter(s => s.status === 'Hold' && s.method === `LinkedTo:${sessionId}`);
  const isSessionValid = (sessionId: number) => sessions.some(s => s.id === sessionId && (s.status === 'Active' || s.status === 'Hold' || s.status === 'Reserved'));

  const handleCheckIn = async () => {
    if (isProcessing) return; setIsProcessing(true);
    const finalPrice = getPrice(modal.sys.type, dur, extra);
    const payload = {
      customer: name || 'Guest', system: modal.sys.id, duration: dur, total: finalPrice, 
      status: (isBookingMode || modal.hasActive) ? 'Reserved' : 'Active',
      entry_time: format12Hour(time), date: getTodayString(), fnb_total: 0, method: 'Pending', fnb_items: ""
    };
    const { error } = await supabase.from('sales').insert([payload]);
    if (error) alert(`Check-in Failed!\nError: ${error.message}`); 
    else { setModal(null); setName(''); setDur(1); setExtra(0); await fetchSessions(); }
    setIsProcessing(false);
  };

  const handleStartReservation = async (id: number) => {
    if (isProcessing) return; setIsProcessing(true);
    const now = new Date();
    const newEntryTime = format12Hour(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`);
    await supabase.from('sales').update({ status: 'Active', entry_time: newEntryTime }).eq('id', id);
    await fetchSessions();
    setIsProcessing(false);
  };

  const handleCancelReservation = async (id: number) => {
    if (!window.confirm("Cancel this booking?")) return;
    if (isProcessing) return; setIsProcessing(true);
    await supabase.from('sales').delete().eq('id', id);
    await fetchSessions();
    setIsProcessing(false);
  };

  const handleExtend = async () => {
    if (isProcessing) return; setIsProcessing(true);
    if (!isSessionValid(modal.session.id)) { alert("Session closed!"); setModal(null); await fetchSessions(); setIsProcessing(false); return; }
    const s = modal.session;
    const currentExtra = getExtraFromTotal(modal.sys.type, s.duration, Number(s.total));
    const newDur = s.duration + extendDur;
    const newTotal = getPrice(modal.sys.type, newDur, currentExtra);
    notifiedRef.current.delete(s.id);
    await supabase.from('sales').update({ duration: newDur, total: newTotal }).eq('id', s.id);
    setModal(null); await fetchSessions();
    setIsProcessing(false);
  };

  const handleEditTime = async () => {
    if (isProcessing) return; setIsProcessing(true);
    notifiedRef.current.delete(modal.session.id);
    await supabase.from('sales').update({ entry_time: format12Hour(editTime24) }).eq('id', modal.session.id);
    setModal(null); await fetchSessions(); setIsProcessing(false);
  };

  const handleCheckout = async () => {
    if (isProcessing) return; setIsProcessing(true);
    const finalTotal = Number(manualTotal);
    let remCash = payMethod === 'Split Payment' ? splitCash : (payMethod === 'Cash' ? finalTotal : 0);
    let remUPI = payMethod === 'Split Payment' ? (finalTotal - splitCash) : (payMethod === 'UPI' ? finalTotal : 0);
    let remTotalToDistribute = finalTotal;
    const sessionsToClose = [...getHoldSessions(modal.session.id), modal.session];

    for (const s of sessionsToClose) {
      const sExpectedTotal = Number(s.total) + Number(s.fnb_total || 0);
      const thisRowPaid = Math.min(sExpectedTotal, remTotalToDistribute);
      remTotalToDistribute -= thisRowPaid;

      let thisCash = Math.min(thisRowPaid, remCash); remCash -= thisCash;
      let thisUPI = Math.min(thisRowPaid - thisCash, remUPI); remUPI -= thisUPI;

      let sMethodStr = 'Cash';
      if (thisCash > 0 && thisUPI > 0) sMethodStr = `Split|${thisCash}|${thisUPI}`;
      else if (thisUPI > 0) sMethodStr = 'UPI';

      await supabase.from('sales').update({ status: 'Completed', method: sMethodStr, total: thisRowPaid }).eq('id', s.id);
      notifiedRef.current.delete(s.id);
    }
    setModal(null); await fetchSessions(); setIsProcessing(false);
  };

  const handleTransferConfirm = async () => {
    if (isProcessing) return; setIsProcessing(true);
    const targetSys = SYSTEMS.find(x => x.id === transferTargetSysId);
    if (!targetSys) { setIsProcessing(false); return; }

    const activeTargetSession = sessions.find(s => s.status === 'Active' && s.system === transferTargetSysId);
    const existingHolds = getHoldSessions(modal.session.id);
    const idsToLink = [modal.session.id, ...existingHolds.map(h => h.id)];

    if (activeTargetSession) {
      for (const id of idsToLink) await supabase.from('sales').update({ status: 'Hold', method: `LinkedTo:${activeTargetSession.id}` }).eq('id', id);
    } else {
      const newSystemPrice = getPrice(targetSys.type, migrateDur, migrateExtra);
      const now = new Date();
      const newEntryTime = format12Hour(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`);
      const { data: newSession, error: insertError } = await supabase.from('sales').insert({ 
         customer: modal.session.customer, system: targetSys.id, duration: migrateDur, total: newSystemPrice, 
         status: 'Active', entry_time: newEntryTime, date: getTodayString(), fnb_total: 0, method: 'Pending', fnb_items: "" 
      }).select().single();
      
      if (!insertError && newSession) {
        for (const id of idsToLink) await supabase.from('sales').update({ status: 'Hold', method: `LinkedTo:${newSession.id}` }).eq('id', id);
      }
    }
    setModal(null); await fetchSessions(); setIsProcessing(false);
  };

  const handleAddFNB = async () => {
    if (isProcessing) return; setIsProcessing(true);
    const newFnbTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const newFnbCost = cart.reduce((sum, item) => sum + ((item.cost || 0) * item.qty), 0);
    
    for (const cartItem of cart) {
      if (cartItem.stock !== undefined && cartItem.stock !== null) {
        const newStock = cartItem.stock - cartItem.qty;
        await supabase.from('inventory').update({ stock_level: newStock }).eq('id', cartItem.id);
      }
    }
    
    const newNames: string[] = []; cart.forEach(c => { for(let i=0; i<c.qty; i++) newNames.push(c.name); });
    const newItemsStr = newNames.join(" | ");

    if (modal.isWalkin) {
      let walkinMethod = fnbPayMethod;
      if (fnbPayMethod === 'Split Payment') walkinMethod = `Split|${fnbSplitCash}|${newFnbTotal - fnbSplitCash}`;
      await supabase.from('cafe_orders').insert({ date: getTodayString(), items: newItemsStr, total_revenue: newFnbTotal, total_cost: newFnbCost, profit: newFnbTotal - newFnbCost, method: walkinMethod });
    } else {
      const { data: freshSession } = await supabase.from('sales').select('fnb_total, fnb_items').eq('id', modal.session.id).single();
      const currentFnbTotal = Number(freshSession?.fnb_total || 0);
      await supabase.from('cafe_orders').insert({ date: getTodayString(), items: newItemsStr, total_revenue: newFnbTotal, total_cost: newFnbCost, profit: newFnbTotal - newFnbCost, method: 'Tab' });
      let existingString = freshSession?.fnb_items || "";
      if (Array.isArray(existingString)) existingString = existingString.map((i:any) => i.name ? Array(i.qty || 1).fill(i.name).join(" | ") : "").filter(Boolean).join(" | ");
      else if (typeof existingString === 'string' && existingString.startsWith('[] |')) existingString = existingString.replace('[] |', '').trim();
      const finalString = existingString ? `${existingString} | ${newItemsStr}` : newItemsStr;
      await supabase.from('sales').update({ fnb_total: currentFnbTotal + newFnbTotal, fnb_items: finalString }).eq('id', modal.session.id);
    }
    setModal(null); setCart([]); await fetchSessions(); await fetchInventory(); setIsProcessing(false);
  };

  function getTimeRemaining(entryTimeStr: string, durationHrs: number) {
    if (!entryTimeStr) return { text: '', color: 'text-white', isOverdue: false };
    const entryDate = parse12HourToDate(entryTimeStr);
    const endTime = entryDate.getTime() + (durationHrs * 3600000);
    const timeLeftMins = (endTime - new Date().getTime()) / 60000;

    if (timeLeftMins < 0) return { text: `🚨 ${Math.abs(Math.round(timeLeftMins))}m OVER`, color: 'text-red-400 animate-pulse', isOverdue: true };
    if (timeLeftMins <= 5.05) return { text: `⚠️ ${Math.round(timeLeftMins)}m LEFT`, color: 'text-red-400', isOverdue: false };
    if (timeLeftMins <= 10) return { text: `⚠️ ${Math.round(timeLeftMins)}m LEFT`, color: 'text-orange-400', isOverdue: false };
    return { text: `⏳ ${Math.round(timeLeftMins)}m LEFT`, color: 'text-[#00D0FF]', isOverdue: false };
  }

  const getEndOfDaySummary = async () => {
    setIsProcessing(true);
    const todayStr = getTodayString();
    
    let eodCash = 0; let eodUPI = 0;
    let pcRev = 0; let ps5Rev = 0; let simRev = 0;
    let fnbRev = 0; let fnbProfit = 0;

    const { data: todaySales } = await supabase.from('sales').select('*').eq('date', todayStr).eq('status', 'Completed');
    if (todaySales) {
      todaySales.forEach(s => {
         const gameCost = Math.max(0, Number(s.total || 0) - Number(s.fnb_total || 0));

         if (String(s.system).includes('PC')) pcRev += gameCost;
         else if (String(s.system).includes('PS')) ps5Rev += gameCost;
         else if (String(s.system).includes('SIM')) simRev += gameCost;

         const m = String(s.method || '').trim();
         if (m.startsWith('Split|')) { const parts = m.split('|'); eodCash += Number(parts[1] || 0); eodUPI += Number(parts[2] || 0); } 
         else if (m === 'Cash') eodCash += Number(s.total || 0); 
         else if (m === 'UPI') eodUPI += Number(s.total || 0);
      });
    }

    const { data: todayCafe } = await supabase.from('cafe_orders').select('*').eq('date', todayStr);
    if (todayCafe) {
      todayCafe.forEach(c => {
         fnbRev += Number(c.total_revenue || 0);
         const cProfit = Number(c.profit);
         fnbProfit += isNaN(cProfit) ? (Number(c.total_revenue || 0) - Number(c.total_cost || 0)) : cProfit;

         const m = String(c.method || c.payment_method || '').trim();
         if (m !== 'Tab' && m !== 'tab') {
            if (m.startsWith('Split|')) { const parts = m.split('|'); eodCash += Number(parts[1] || 0); eodUPI += Number(parts[2] || 0); } 
            else if (m === 'Cash') eodCash += Number(c.total_revenue || 0); 
            else if (m === 'UPI') eodUPI += Number(c.total_revenue || 0);
         }
      });
    }
    
    setModal({ type: 'close_day', eodCash, eodUPI, pcRev, ps5Rev, simRev, fnbRev, fnbProfit });
    setIsProcessing(false);
  };

  const activeOrReserved = sessions.filter(s => ['Active', 'Reserved'].includes(s.status));
  const totalFloorPending = activeOrReserved.filter(s=>s.status==='Active').reduce((sum, s) => sum + Number(s.total) + Number(s.fnb_total || 0), 0);

  let currentFnbHistory: string[] = []; let combinedGamingTotal = 0; let combinedFnbTotal = 0;
  if (modal?.session) {
    const sessionsToConsider = ['checkout', 'fnb', 'transfer'].includes(modal.type) ? [...getHoldSessions(modal.session.id), modal.session] : [modal.session];
    sessionsToConsider.forEach(s => {
      combinedGamingTotal += Number(s.total || 0); combinedFnbTotal += Number(s.fnb_total || 0);
      if (s.fnb_items) {
        let raw = s.fnb_items;
        if (Array.isArray(raw)) { raw.forEach((i: any) => { for (let k = 0; k < (i.qty || 1); k++) currentFnbHistory.push(i.name); }); } 
        else if (typeof raw === 'string') { currentFnbHistory.push(...raw.replace('[] |', '').split('|').map(st => st.trim()).filter(Boolean)); }
      }
    });
  }

  let aggregatedFnb: string[] = [];
  if (['checkout', 'fnb', 'transfer'].includes(modal?.type) && currentFnbHistory.length > 0) {
     const counts: Record<string, number> = {};
     currentFnbHistory.forEach(item => counts[item] = (counts[item] || 0) + 1);
     aggregatedFnb = Object.entries(counts).map(([name, qty]) => `${qty}x ${name}`);
  }

  return (
    <div className="flex h-screen w-screen bg-[#05070A] text-white font-sans overflow-hidden">
      
      {/* SIDEBAR - LEDGER REMOVED */}
      <div className="w-16 bg-[#0B0E14] border-r border-[#1E293B] flex flex-col items-center py-4 shrink-0 z-10 gap-4">
        <div className="p-3 bg-[#00D0FF]/20 text-[#00D0FF] border border-[#00D0FF] rounded-xl transition-all shadow-[0_0_15px_rgba(0,208,255,0.2)]" title="Live Floor"><Monitor size={20} /></div>
        <a href="/vault/inventory" className="p-3 bg-[#1A2235] text-gray-400 hover:text-[#00D0FF] hover:border-[#00D0FF] border border-[#2D3748] rounded-xl transition-all shadow-sm" title="Inventory"><Package size={20} /></a>
        <a href="/vault/analytics" className="p-3 bg-[#1A2235] text-gray-400 hover:text-orange-500 hover:border-orange-500 border border-[#2D3748] rounded-xl transition-all shadow-sm" title="Master Analytics"><BarChart3 size={20} /></a>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        <div className="max-w-[1600px] mx-auto flex flex-col">
          
          <div className="flex justify-between items-center mb-4 shrink-0">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Gamerarena <span className="text-[#00D0FF]">POS</span>
              </h1>
            </div>
            <div className="flex gap-3 items-center">
              <button onClick={getEndOfDaySummary} disabled={isProcessing} className="flex items-center gap-2 bg-[#121824] border border-[#1E293B] hover:border-emerald-400 hover:text-emerald-400 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shadow-sm">
                <MoonStar size={14} /> Close Day
              </button>
              <button onClick={() => { setCart([]); setFnbPayMethod('Cash'); setModal({ type: 'fnb', isWalkin: true }); }} className="flex items-center gap-2 bg-[#121824] border border-[#1E293B] hover:border-[#00D0FF] hover:text-[#00D0FF] px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shadow-sm">
                <ShoppingCart size={14} /> Direct F&B
              </button>

              <div className="h-6 w-px bg-[#1E293B] mx-1"></div>

              {currentTime && (
                <div className="text-right bg-gradient-to-br from-[#121824] to-[#0B0E14] px-4 py-1.5 rounded-xl border border-[#1E293B] shadow-sm">
                  <p className="text-gray-500 text-[8px] font-black uppercase tracking-widest mb-0.5">Local Time</p>
                  <p className="text-white text-sm font-black tabular-nums tracking-tight leading-none">{currentTime.toLocaleTimeString('en-US', { hour12: true })}</p>
                </div>
              )}
              <div className="text-right bg-gradient-to-br from-[#121824] to-[#0B0E14] px-4 py-1.5 rounded-xl border border-[#1E293B] shadow-sm">
                <p className="text-gray-500 text-[8px] font-black uppercase tracking-widest mb-0.5">Pending</p>
                <p className="text-[#FF754C] text-sm font-black tabular-nums tracking-tight leading-none">₹{totalFloorPending}</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {SYSTEMS.map(sys => {
              const activeSession = activeOrReserved.find(a => a.system === sys.id && a.status === 'Active');
              const upcomingBookings = activeOrReserved.filter(a => a.system === sys.id && a.status === 'Reserved').sort((a,b) => parse12HourToDate(a.entry_time).getTime() - parse12HourToDate(b.entry_time).getTime());

              const holdSessions = activeSession ? getHoldSessions(activeSession.id) : [];
              const holdNames = holdSessions.map(h => h.system).join(', ');
              const gamingTotal = Number(activeSession?.total || 0);
              const fnbTotal = Number(activeSession?.fnb_total || 0);
              const holdTotal = holdSessions.reduce((sum, h) => sum + Number(h.total) + Number(h.fnb_total || 0), 0);
              const grandTotal = gamingTotal + fnbTotal + holdTotal;
              const timerInfo = activeSession ? getTimeRemaining(activeSession.entry_time, activeSession.duration) : null;
              const isOverdue = timerInfo?.isOverdue;

              return (
                <div key={sys.id} className={`flex flex-col p-4 rounded-2xl border transition-all duration-300 ${activeSession ? (isOverdue ? 'border-red-500/50 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-[#00D0FF]/40 bg-[#00D0FF]/5') : 'border-[#1E293B] bg-[#0B0E14] hover:border-[#2D3748]'}`}>
                  <div className="flex justify-between items-center mb-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${activeSession ? (isOverdue ? 'bg-red-500/20 text-red-400' : 'bg-[#00D0FF]/20 text-[#00D0FF]') : 'bg-[#1A2235] text-gray-500'}`}>
                        <sys.icon size={16}/>
                      </div>
                      <h3 className={`text-lg font-black tracking-wide ${activeSession ? 'text-white' : 'text-gray-400'}`}>{sys.id}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${activeSession ? (isOverdue ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-[#00D0FF]/20 text-[#00D0FF] border border-[#00D0FF]/30") : "bg-[#1A2235] text-gray-500 border border-[#2D3748]"}`}>
                      {activeSession ? "ACTIVE" : "FREE"}
                    </span>
                  </div>

                  {activeSession ? (
                    <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                           <div>
                              <p className="font-black text-white text-sm truncate flex items-center gap-1.5">
                                 <User size={12} className={isOverdue ? 'text-red-400' : 'text-[#00D0FF]'}/> 
                                 {activeSession.customer}
                              </p>
                              <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-bold mt-1 group">
                                  <Clock size={10}/> {activeSession.entry_time} <span className="text-[#1E293B]">|</span> {activeSession.duration}h
                                  <button onClick={() => { setEditTime24(`${String(parse12HourToDate(activeSession.entry_time).getHours()).padStart(2,'0')}:${String(parse12HourToDate(activeSession.entry_time).getMinutes()).padStart(2,'0')}`); setModal({ type: 'edit_time', session: activeSession }); }} className={`ml-1 opacity-0 group-hover:opacity-100 transition-opacity ${isOverdue ? 'hover:text-red-400' : 'hover:text-[#00D0FF]'}`}><Pencil size={10}/></button>
                              </div>
                           </div>
                           <div className={`text-[11px] font-black bg-black/40 px-2 py-1 rounded-md border border-[#1E293B] ${timerInfo?.color}`}>
                              {timerInfo?.text}
                           </div>
                        </div>
                        
                        <div className={`rounded-xl p-2.5 border ${isOverdue ? 'bg-red-950/30 border-red-900/50' : 'bg-[#05070A]/50 border-[#1E293B]'} space-y-1`}>
                          {holdTotal > 0 && <div className="flex justify-between text-[10px] font-bold text-orange-400"><span>Hold ({holdNames})</span><span>₹{holdTotal}</span></div>}
                          <div className="flex justify-between text-[10px] font-bold text-gray-400"><span>Gaming Cost</span><span>₹{gamingTotal}</span></div>
                          <div className="flex justify-between text-[10px] font-bold text-gray-400"><span>F&B Accrued</span><span>₹{fnbTotal}</span></div>
                          <div className={`flex justify-between text-xs font-black pt-1.5 border-t mt-1 ${isOverdue ? 'border-red-900/50 text-red-400' : 'border-[#1E293B] text-white'}`}>
                            <span>Total Due</span><span className={isOverdue ? 'text-red-400' : 'text-[#00D0FF]'}>₹{grandTotal}</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <button onClick={() => { setManualTotal(grandTotal); setModal({ type: 'checkout', session: activeSession, grandTotal, holdTotal, holdNames }); }} className={`w-full text-black py-2 rounded-lg font-black text-xs transition-all ${isOverdue ? 'bg-red-500 hover:bg-white' : 'bg-[#00D0FF] hover:bg-white'}`}>
                             Checkout & Pay
                          </button>
                          <div className="grid grid-cols-3 gap-1.5">
                             <button onClick={() => { setTransferTargetSysId(''); setMigrateDur(1); setMigrateExtra(0); setModal({ type: 'transfer', session: activeSession }); }} className="bg-[#1A2235] hover:bg-white hover:text-black text-gray-400 text-[10px] font-bold py-1.5 rounded-lg border border-[#2D3748] transition-all flex justify-center items-center" title="Transfer"><ArrowRightLeft size={12}/></button>
                             <button onClick={() => { setExtendDur(0.5); setModal({ type: 'extend', session: activeSession, sys }); }} className="bg-[#1A2235] hover:text-[#00D0FF] hover:border-[#00D0FF] text-gray-400 text-[10px] font-bold py-1.5 rounded-lg border border-[#2D3748] transition-all flex justify-center items-center" title="Modify Time"><Clock size={12}/></button>
                             <button onClick={() => { setCart([]); setModal({ type: 'fnb', session: activeSession }); }} className="bg-[#1A2235] hover:text-[#00D0FF] hover:border-[#00D0FF] text-gray-400 text-[10px] font-bold py-1.5 rounded-lg border border-[#2D3748] transition-all flex justify-center items-center" title="Add F&B"><Coffee size={12}/></button>
                          </div>
                          <button onClick={() => { setIsBookingMode(true); setModal({ type: 'checkin', sys, hasActive: true }); }} className="w-full py-1 rounded-md text-[8px] font-bold uppercase tracking-widest text-yellow-500 bg-yellow-500/5 hover:bg-yellow-500/10 border border-yellow-500/10 transition-all flex items-center justify-center gap-1">
                             <Plus size={8}/> Future Booking
                          </button>
                        </div>
                    </div>
                  ) : (
                    <button onClick={() => { const n = new Date(); setTime(`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`); setIsBookingMode(false); setModal({ type: 'checkin', sys, hasActive: false }); }} className="group w-full py-6 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#2D3748] hover:border-[#00D0FF]/50 hover:bg-[#00D0FF]/5 transition-all min-h-[140px]">
                      <div className="bg-[#1A2235] group-hover:bg-[#00D0FF] text-gray-500 group-hover:text-black p-2 rounded-full transition-all"><Plus size={16} /></div>
                      <span className="text-gray-500 group-hover:text-[#00D0FF] font-bold text-xs tracking-wide">Check In / Reserve</span>
                    </button>
                  )}

                  {upcomingBookings.length > 0 && (
                    <div className={`mt-3 pt-3 border-t border-[#1E293B] space-y-2`}>
                      {!activeSession && <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest text-center">Upcoming</p>}
                      <div className="space-y-1.5">
                        {upcomingBookings.map(booking => (
                          <div key={booking.id} className="relative bg-[#1A2235] border border-[#2D3748] rounded-lg p-2 flex flex-col gap-1.5">
                             <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500 rounded-l-lg"></div>
                             <div className="flex justify-between items-center pl-1.5">
                                <span className="text-white text-[10px] font-bold truncate pr-1"><User size={8} className="inline text-yellow-500 mb-0.5 mr-0.5"/>{booking.customer}</span>
                                <div className="flex items-center gap-1 text-yellow-500 text-[9px] font-black shrink-0">{booking.entry_time} <span className="text-gray-500 font-normal">|</span> {booking.duration}h</div>
                             </div>
                             <div className="flex gap-1.5 pl-1.5">
                                <button onClick={() => handleStartReservation(booking.id)} disabled={!!activeSession || isProcessing} className="flex-1 bg-yellow-500 text-black text-[9px] uppercase font-black py-1 rounded hover:bg-yellow-400 disabled:opacity-20 disabled:cursor-not-allowed transition-all">Start</button>
                                <button onClick={() => handleCancelReservation(booking.id)} disabled={isProcessing} className="px-2.5 bg-[#0B0E14] text-gray-400 border border-[#2D3748] hover:text-red-500 hover:border-red-500 rounded transition-all" title="Cancel Booking"><X size={10}/></button>
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="pb-10"></div>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className={`bg-[#121824] p-6 rounded-3xl w-full ${modal.type === 'fnb' ? 'max-w-4xl' : 'max-w-sm'} border border-[#1E293B] shadow-2xl relative transition-all`}>
            
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black">
                  {modal.type === 'checkin' && `Setup ${modal.sys.id}`}
                  {modal.type === 'checkout' && `Checkout ${modal.session.system}`}
                  {modal.type === 'transfer' && `Transfer / Merge`}
                  {modal.type === 'extend' && `Modify Time`}
                  {modal.type === 'edit_time' && `Edit Start Time`}
                  {modal.type === 'close_day' && `End of Day Report`}
                  {modal.type === 'fnb' && (modal.isWalkin ? `Direct F&B Sale` : `Add F&B Order`)}
                </h2>
                <button onClick={() => setModal(null)} className="p-2 bg-[#0B0E14] rounded-full hover:bg-red-500/20 hover:text-red-500 transition-colors"><X size={16}/></button>
            </div>
            
            {/* CHECK-IN & RESERVATION */}
            {modal.type === 'checkin' && (
              <div className="space-y-4">
                {modal.hasActive ? (
                  <div className="bg-yellow-500/10 text-yellow-500 p-3 rounded-xl text-xs font-bold mb-4 text-center border border-yellow-500/20">System is currently Active. Creating a future reservation.</div>
                ) : (
                  <div className="flex bg-[#0B0E14] rounded-xl p-1 border border-[#2D3748] mb-4">
                     <button type="button" onClick={() => setIsBookingMode(false)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!isBookingMode ? 'bg-[#00D0FF]/20 text-[#00D0FF]' : 'text-gray-500 hover:text-white'}`}>Walk-In Now</button>
                     <button type="button" onClick={() => setIsBookingMode(true)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${isBookingMode ? 'bg-yellow-500/20 text-yellow-500' : 'text-gray-500 hover:text-white'}`}>Reserve for Later</button>
                  </div>
                )}
                
                <input className="w-full bg-[#0B0E14] p-3 text-sm rounded-xl border border-[#2D3748] focus:border-[#00D0FF] outline-none" placeholder={(isBookingMode || modal.hasActive) ? "Gamer Name (Required)" : "Gamer Name"} onChange={e => setName(e.target.value)} autoFocus/>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">{(isBookingMode || modal.hasActive) ? 'Expected Arrival' : 'Start Time'}</label>
                    <input className="w-full bg-[#0B0E14] mt-1 p-3 text-sm rounded-xl border border-[#2D3748] focus:border-[#00D0FF] outline-none [color-scheme:dark]" type="time" value={time} onChange={e => setTime(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Duration</label>
                    <div className="flex justify-between items-center bg-[#0B0E14] mt-1 p-2 rounded-xl border border-[#2D3748]">
                      <button onClick={() => setDur(Math.max(0.5, dur - 0.5))} className="p-1 hover:text-[#00D0FF]"><Minus size={16}/></button>
                      <span className="font-bold text-sm">{dur} Hrs</span>
                      <button onClick={() => setDur(dur + 0.5)} className="p-1 hover:text-[#00D0FF]"><Plus size={16}/></button>
                    </div>
                  </div>
                </div>
                
                {modal.sys.type === 'PS5' && (
                  <div>
                    <label className="text-[10px] text-[#00D0FF] font-bold uppercase ml-1">Extra Controllers</label>
                    <div className="flex justify-between items-center bg-[#0B0E14] mt-1 p-2 rounded-xl border border-[#2D3748]">
                      <button onClick={() => setExtra(Math.max(0, extra - 1))} className="p-1"><Minus size={16}/></button>
                      <span className="font-bold text-sm">{extra} Extra</span>
                      <button onClick={() => setExtra(Math.min(3, extra + 1))} className="p-1"><Plus size={16}/></button>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-[#1E293B]">
                  <div className="flex justify-between text-gray-400 mb-3 text-sm"><span>Est Cost:</span><span className="font-black text-white text-lg">₹{getPrice(modal.sys.type, dur, extra)}</span></div>
                  <button onClick={handleCheckIn} disabled={isProcessing || ((isBookingMode || modal.hasActive) && !name)} className={`w-full text-black py-3.5 rounded-xl font-black text-sm disabled:opacity-50 transition-all ${(isBookingMode || modal.hasActive) ? 'bg-yellow-500 hover:bg-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-[#00D0FF] hover:bg-white shadow-[0_0_15px_rgba(0,208,255,0.2)]'}`}>
                    {isProcessing ? 'Processing...' : ((isBookingMode || modal.hasActive) ? 'Lock Reservation' : 'Start Session')}
                  </button>
                </div>
              </div>
            )}

            {/* 🟢 EXACT TEXT-BASED CLOSE DAY REPORT */}
            {modal.type === 'close_day' && (() => {
                const finalTotal = modal.eodCash + modal.eodUPI - modal.fnbRev + modal.fnbProfit;
                const reportText = `Today's income - ${getFormattedDateForReport()}\n\na. Cash - ${formatINR(modal.eodCash)}\nb. UPI -  ${formatINR(modal.eodUPI)}\nc. F&B sale - ${formatINR(modal.fnbRev)}\nd. F&B profit- ${formatINR(modal.fnbProfit)}\n\nA+B-C+D= Total  - ${formatINR(finalTotal)}\n\nBreakup:\nPS5- ${formatINR(modal.ps5Rev)}\nPC- ${formatINR(modal.pcRev)}\nSIM- ${formatINR(modal.simRev)}`;
                
                return (
                  <div className="space-y-4">
                     <div className="bg-[#0B0E14] border border-[#2D3748] p-5 rounded-2xl font-mono text-sm text-gray-300 whitespace-pre-wrap">
                        {reportText}
                     </div>

                     <div className="grid grid-cols-2 gap-4 pt-2">
                       <button onClick={() => setModal(null)} className="w-full bg-[#1A2235] text-gray-400 border border-[#2D3748] py-4 rounded-xl font-bold hover:text-white transition-all">Dismiss</button>
                       <button onClick={() => { navigator.clipboard.writeText(reportText); alert("Report copied to clipboard!"); }} className="w-full bg-white text-black py-4 rounded-xl font-black hover:bg-gray-200 transition-all flex items-center justify-center gap-2">
                         <Copy size={16}/> Copy Report
                       </button>
                     </div>
                  </div>
                );
            })()}

            {/* CHECKOUT WITH SMART AGGREGATED F&B RECEIPT */}
            {modal.type === 'checkout' && (
              <div className="space-y-4">
                <div className="bg-[#0B0E14] p-4 rounded-2xl border border-[#2D3748] space-y-2 text-sm">
                  <div className="flex justify-between font-bold border-b border-[#1E293B] pb-2 text-[#00D0FF]">
                    <span>{modal.session.customer}</span><span>{modal.session.duration} Hrs Active</span>
                  </div>
                  {modal.holdTotal > 0 && <div className="flex justify-between text-orange-400 text-xs font-bold mt-2"><span>Includes transfers: {modal.holdNames}</span></div>}
                  <div className="flex justify-between text-gray-400 mt-2"><span>Combined Gaming:</span><span>₹{combinedGamingTotal}</span></div>
                  
                  <div className="pt-2 border-t border-[#1E293B]">
                    <div className="flex justify-between text-gray-400 mb-1">
                      <span>Combined F&B:</span>
                      <span className="font-bold text-white">₹{combinedFnbTotal}</span>
                    </div>
                    {aggregatedFnb.length > 0 && (
                      <div className="bg-[#1A2235] p-2 rounded-xl mt-2 text-[10px] text-[#00D0FF] font-bold space-y-1">
                        {aggregatedFnb.map((itemName: string, i: number) => (
                           <div key={i} className="flex justify-between"><span>{itemName}</span></div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                   <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Final Combined Amount</label>
                   <div className="flex items-center bg-[#0B0E14] mt-1 p-2 rounded-xl border border-[#2D3748] focus-within:border-[#00D0FF]">
                       <div className="px-3 text-[#00D0FF]"><IndianRupee size={18}/></div>
                       <input type="number" className="bg-transparent w-full font-black text-2xl outline-none text-white py-1" value={manualTotal} onChange={e => setManualTotal(e.target.value)} />
                   </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Payment Method</label>
                  <select className="w-full mt-1 p-3 text-sm bg-[#0B0E14] rounded-xl border border-[#2D3748] outline-none" onChange={e => setPayMethod(e.target.value)}>
                      <option>Cash</option><option>UPI</option><option>Split Payment</option>
                  </select>
                </div>
                {payMethod === 'Split Payment' && (
                  <div className="p-3 bg-[#1A2235] rounded-xl border border-[#00D0FF]/50 text-sm">
                    <input type="number" className="w-full p-2 bg-[#0B0E14] rounded-lg outline-none font-bold" placeholder="Cash Amount" onChange={e => setSplitCash(Number(e.target.value))} />
                    <p className="text-[10px] text-gray-400 mt-2">Remaining ₹{(Number(manualTotal) - splitCash)} will be marked UPI.</p>
                  </div>
                )}
                <button onClick={handleCheckout} disabled={isProcessing} className="w-full bg-[#EF4444] text-white py-3.5 rounded-xl font-black text-sm disabled:opacity-50 hover:bg-red-600 transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                  {isProcessing ? 'Processing...' : 'Confirm & Close'}
                </button>
              </div>
            )}

            {/* EDIT TIME */}
            {modal.type === 'edit_time' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Corrected Start Time</label>
                  <input className="w-full bg-[#0B0E14] mt-1 p-3 text-sm rounded-xl border border-[#2D3748] focus:border-[#00D0FF] outline-none [color-scheme:dark]" type="time" value={editTime24} onChange={e => setEditTime24(e.target.value)} />
                </div>
                <div className="pt-4 border-t border-[#1E293B]">
                  <button onClick={handleEditTime} disabled={isProcessing} className="w-full bg-[#00D0FF] text-black py-3.5 rounded-xl font-black text-sm disabled:opacity-50 hover:bg-white transition-all shadow-[0_0_15px_rgba(0,208,255,0.2)]">Save Time</button>
                </div>
              </div>
            )}

            {/* MODIFY TIME */}
            {modal.type === 'extend' && (
              <div className="space-y-4">
                <div className="bg-[#0B0E14] p-4 rounded-xl border border-[#2D3748] space-y-2 text-sm text-center">
                  <p className="text-gray-400">Current Duration: <span className="text-white font-bold">{modal.session.duration} Hrs</span></p>
                  <p className="text-gray-400">Current Game Cost: <span className="text-white font-bold">₹{modal.session.total}</span></p>
                </div>
                <div>
                  <label className="text-[10px] text-[#00D0FF] font-bold uppercase ml-1">Modify Time (Add / Reduce)</label>
                  <div className="flex justify-between items-center bg-[#0B0E14] mt-1 p-2 rounded-xl border border-[#2D3748]">
                    <button onClick={() => setExtendDur(Math.max(0.5 - modal.session.duration, extendDur - 0.5))} className="p-1 hover:text-[#00D0FF]"><Minus size={16}/></button>
                    <span className="font-bold text-sm">{extendDur > 0 ? '+' : ''}{extendDur} Hrs</span>
                    <button onClick={() => setExtendDur(extendDur + 0.5)} className="p-1 hover:text-[#00D0FF]"><Plus size={16}/></button>
                  </div>
                </div>
                <div className="pt-4 border-t border-[#1E293B]">
                  <div className="flex justify-between text-gray-400 mb-3 text-sm"><span>New Game Cost:</span><span className="font-black text-[#00D0FF] text-lg">₹{getPrice(modal.sys.type, modal.session.duration + extendDur, getExtraFromTotal(modal.sys.type, modal.session.duration, Number(modal.session.total)))}</span></div>
                  <button onClick={handleExtend} disabled={isProcessing} className="w-full bg-[#00D0FF] text-black py-3.5 rounded-xl font-black text-sm disabled:opacity-50 hover:bg-white transition-all shadow-[0_0_15px_rgba(0,208,255,0.2)]">Confirm Change</button>
                </div>
              </div>
            )}

            {/* TRANSFER / MERGE */}
            {modal.type === 'transfer' && (
              <div className="space-y-4">
                <div className="bg-[#0B0E14] p-4 rounded-xl border border-[#2D3748] text-xs text-gray-400">
                  Shift <span className="text-white font-bold">{modal.session.customer}</span>'s bill to a new screen, or merge it.
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Target Screen</label>
                  <select className="w-full bg-[#0B0E14] mt-1 p-3 text-sm rounded-xl border border-[#2D3748] focus:border-[#00D0FF] outline-none" value={transferTargetSysId} onChange={e => setTransferTargetSysId(e.target.value)}>
                     <option value="" disabled>Select Target System</option>
                     {SYSTEMS.filter(s => s.id !== modal.session.system).map(sys => {
                        const isActive = activeOrReserved.find(a => a.system === sys.id && a.status === 'Active');
                        return <option key={sys.id} value={sys.id}>{sys.id} - {isActive ? `MERGE with ${isActive.customer}` : 'AVAILABLE'}</option>
                     })}
                  </select>
                </div>
                {transferTargetSysId && !activeOrReserved.find(a => a.system === transferTargetSysId && a.status === 'Active') && SYSTEMS.find(x => x.id === transferTargetSysId) && (
                  <div className="pt-4 border-t border-[#1E293B]">
                    <p className="text-[10px] text-[#00D0FF] font-bold uppercase mb-2">Setting Up New Screen</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">New Duration</label>
                        <div className="flex justify-between items-center bg-[#0B0E14] mt-1 p-2 rounded-xl border border-[#2D3748]">
                          <button onClick={() => setMigrateDur(Math.max(0.5, migrateDur - 0.5))} className="p-1 hover:text-[#00D0FF]"><Minus size={16}/></button>
                          <span className="font-bold text-sm">{migrateDur} Hrs</span>
                          <button onClick={() => setMigrateDur(migrateDur + 0.5)} className="p-1 hover:text-[#00D0FF]"><Plus size={16}/></button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <button onClick={handleTransferConfirm} disabled={!transferTargetSysId || isProcessing} className="w-full bg-[#00D0FF] text-black py-3.5 rounded-xl font-black text-sm hover:bg-white transition-all shadow-[0_0_15px_rgba(0,208,255,0.2)]">Confirm Transfer</button>
              </div>
            )}

            {/* F&B ORDER MODAL */}
            {modal.type === 'fnb' && (
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {categories.map(cat => (
                      <button key={cat} onClick={() => setFnbCategory(cat)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${fnbCategory === cat ? 'bg-[#00D0FF] text-black' : 'bg-[#1A2235] text-gray-400 hover:text-white border border-[#2D3748]'}`}>{cat}</button>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                     {cafeMenu.filter(item => item.category === fnbCategory).map(item => {
                         const inCart = cart.find(c => c.id === item.id);
                         const qty = inCart ? inCart.qty : 0;
                         const hasStockLimit = item.stock !== undefined && item.stock !== null;
                         const isOutOfStock = hasStockLimit && item.stock === 0;
                         const isAtMaxCapacity = hasStockLimit && qty >= (item.stock as number);

                         return (
                           <div key={item.id} className={`flex justify-between items-center p-3 rounded-xl border ${isOutOfStock ? 'bg-[#0B0E14]/50 border-red-900/30' : 'bg-[#0B0E14] border-[#2D3748]'}`}>
                              <div className="pr-2">
                                <p className={`font-bold text-sm leading-tight mb-1 ${isOutOfStock ? 'text-gray-600' : 'text-white'}`}>{item.name}</p>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs text-[#00D0FF] font-bold">₹{item.price}</p>
                                  {hasStockLimit && <span className={`text-[10px] px-2 py-0.5 rounded-md ${isOutOfStock ? 'bg-red-500/10 text-red-500' : 'bg-gray-800 text-gray-400'}`}>{isOutOfStock ? 'Out of Stock' : `${item.stock} left`}</span>}
                                </div>
                              </div>
                              {isOutOfStock ? ( <div className="px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-xs font-bold">Empty</div> ) : qty > 0 ? (
                                <div className="flex items-center gap-2 bg-[#1A2235] px-2 py-1 rounded-lg shrink-0">
                                   <button onClick={() => setCart(cart.map(c => c.id === item.id ? {...c, qty: c.qty - 1} : c).filter(c => c.qty > 0))}><Minus size={14}/></button>
                                   <span className="font-bold text-sm w-4 text-center">{qty}</span>
                                   <button disabled={isAtMaxCapacity} onClick={() => setCart(cart.map(c => c.id === item.id ? {...c, qty: c.qty + 1} : c))}><Plus size={14}/></button>
                                </div>
                              ) : ( <button onClick={() => setCart([...cart, { ...item, qty: 1 }])} className="px-4 py-2 bg-[#1A2235] rounded-lg text-xs font-bold hover:bg-[#00D0FF] hover:text-black shrink-0 transition-all">Add</button> )}
                           </div>
                         )
                     })}
                  </div>
                </div>

                <div className="w-full md:w-[250px] bg-[#0B0E14] p-4 rounded-2xl border border-[#2D3748] flex flex-col shrink-0">
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-black text-gray-400 text-[10px] uppercase mb-3">New Cart</h3>
                      {cart.length === 0 ? <p className="text-xs text-gray-600 italic text-center py-4">No items added yet.</p> : (
                        <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                          {cart.map(c => <div key={c.id} className="flex justify-between text-xs text-gray-300"><span>{c.qty}x {c.name}</span><span className="font-bold">₹{c.price * c.qty}</span></div>)}
                        </div>
                      )}
                      {modal.isWalkin && cart.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[#1E293B]">
                           <label className="text-[10px] text-[#00D0FF] font-bold uppercase ml-1">Payment Method</label>
                           <select className="w-full mt-1 p-2 text-xs bg-[#0B0E14] rounded-lg border border-[#2D3748] focus:border-[#00D0FF] outline-none" value={fnbPayMethod} onChange={e => setFnbPayMethod(e.target.value)}>
                               <option>Cash</option><option>UPI</option><option>Split Payment</option>
                           </select>
                           {fnbPayMethod === 'Split Payment' && <input type="number" className="w-full mt-2 p-2 bg-[#0B0E14] rounded-lg outline-none font-bold text-xs" placeholder="Cash Amount" onChange={e => setFnbSplitCash(Number(e.target.value))} />}
                        </div>
                      )}
                    </div>
                    <div className="pt-4 mt-4 border-t border-[#1E293B]">
                      <div className="flex justify-between text-gray-400 mb-3 text-sm"><span>Total:</span><span className="font-black text-white text-xl">₹{cart.reduce((sum, item) => sum + (item.price * item.qty), 0)}</span></div>
                      <button onClick={handleAddFNB} disabled={cart.length === 0 || isProcessing} className="w-full bg-[#00D0FF] text-black py-3 rounded-xl font-black text-sm disabled:opacity-50 hover:bg-white transition-all shadow-[0_0_15px_rgba(0,208,255,0.3)]">
                        {isProcessing ? 'Processing...' : (modal.isWalkin ? 'Complete Sale' : 'Add to Gamer Tab')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}