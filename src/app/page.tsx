'use client'

import { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import { X, User, Clock, ArrowRightLeft, Coffee, Plus, Minus, Gamepad2, Monitor, Car, IndianRupee, Pencil, Package, BarChart3, ShoppingCart, MoonStar, Copy, Lock, Tag, Building2, Edit2, Trash2, Users } from 'lucide-react';

function formatINR(num: number) { return Math.round(num || 0).toLocaleString('en-IN'); }

function getTodayString() {
  const d = new Date();
  const options = { timeZone: 'Asia/Kolkata', year: 'numeric' as const, month: '2-digit' as const, day: '2-digit' as const };
  return new Intl.DateTimeFormat('en-CA', options).format(d);
}

function getFormattedDateForReport() {
  const d = new Date();
  const day = d.getDate();
  const suffix = (day % 10 === 1 && day !== 11) ? "st" : (day % 10 === 2 && day !== 12) ? "nd" : (day % 10 === 3 && day !== 13) ? "rd" : "th";
  return `${day}${suffix} ${d.toLocaleString('en-US', { month: 'long' })}`;
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
  return `${(h % 12 || 12).toString().padStart(2, '0')}:${minute} ${ampm}`;
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
  } catch (error) { console.warn("Audio alert blocked."); }
};

export default function GamerarenaMasterERP() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  
  const [sessions, setSessions] = useState<any[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [modal, setModal] = useState<any>(null); 
  const [tick, setTick] = useState(0);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [cafeMenu, setCafeMenu] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  const [name, setName] = useState('');
  const [editName, setEditName] = useState('');
  const [dur, setDur] = useState(1);
  const [extra, setExtra] = useState(0);
  const [time, setTime] = useState('');
  const [isBookingMode, setIsBookingMode] = useState(false);
  
  const [payMethod, setPayMethod] = useState('Cash');
  const [splitCash, setSplitCash] = useState(0);
  
  const [useKhata, setUseKhata] = useState(false);
  const [checkoutCash, setCheckoutCash] = useState<number | string>('');
  const [checkoutUPI, setCheckoutUPI] = useState<number | string>('');
  
  const [manualTotal, setManualTotal] = useState<number | string>(0);
  const [extendDur, setExtendDur] = useState(0.5);
  const [editExtra, setEditExtra] = useState(0);
  const [editTime24, setEditTime24] = useState('');
  
  const [cart, setCart] = useState<any[]>([]);
  const [fnbCategory, setFnbCategory] = useState('');
  const [fnbPayMethod, setFnbPayMethod] = useState('Cash');
  const [fnbSplitCash, setFnbSplitCash] = useState(0);
  
  const [transferTargetSysId, setTransferTargetSysId] = useState('');
  const [migrateDur, setMigrateDur] = useState(1);
  const [migrateExtra, setMigrateExtra] = useState(0);

  const [miscDesc, setMiscDesc] = useState('');
  const [miscAmount, setMiscAmount] = useState<number | string>('');
  const [miscPayMethod, setMiscPayMethod] = useState('Cash');
  const [miscSplitCash, setMiscSplitCash] = useState(0);

  const [useMembership, setUseMembership] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [memberReport, setMemberReport] = useState('');

  const notifiedRef = useRef(new Set<number>());

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => { 
        document.body.style.overflow = 'auto'; 
        document.documentElement.style.overflow = 'auto'; 
    };
  }, []);

  useEffect(() => {
    setCurrentTime(new Date());
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchSessions(); fetchInventory(); fetchBalances();
    const refreshInterval = setInterval(() => { setTick(t => t + 1); fetchSessions(); fetchBalances(); }, 30000);
    return () => { clearInterval(clockInterval); clearInterval(refreshInterval); };
  }, []);

  useEffect(() => {
    if (!currentTime || sessions.length === 0) return;
    sessions.filter(s => s.status === 'Active').forEach(s => {
       if (!s.entry_time) return;
       const endTime = parse12HourToDate(s.entry_time).getTime() + (s.duration * 3600000);
       const timeLeftMins = (endTime - currentTime.getTime()) / 60000;
       if (timeLeftMins <= 5.05 && timeLeftMins > 0 && !notifiedRef.current.has(s.id)) {
         notifiedRef.current.add(s.id); playAlertSound();
       }
    });
  }, [currentTime, sessions]);

  async function fetchSessions() {
    const { data: activeData } = await supabase.from('sales').select('*').in('status', ['Active', 'Hold', 'Reserved']);
    if (activeData) setSessions(activeData); 
  }

  async function fetchBalances() {
    const { data } = await supabase.from('customer_balances').select('*');
    if (data) {
      const balMap: Record<string, number> = {};
      data.forEach(d => { balMap[d.customer_name] = Number(d.due_amount); });
      setBalances(balMap);
    }
  }

  async function fetchInventory() {
    const { data } = await supabase.from('inventory').select('*');
    if (data) {
      const mappedMenu = data.map(item => ({ id: item.id, name: item.item_name, category: item.category, price: item.selling_price, cost: item.cost_price, stock: item.stock_level }));
      mappedMenu.sort((a, b) => a.name.localeCompare(b.name));
      setCafeMenu(mappedMenu);
      
      const uniqueCats = Array.from(new Set(mappedMenu.map(item => item.category))) as string[];
      uniqueCats.sort((a, b) => a.localeCompare(b));
      setCategories(uniqueCats);
      
      if (uniqueCats.length > 0) setFnbCategory(uniqueCats[0]);
    }
  }

  const getHoldSessions = (sessionId: number) => sessions.filter(s => s.status === 'Hold' && s.method === `LinkedTo:${sessionId}`);
  const isSessionValid = (sessionId: number) => sessions.some(s => s.id === sessionId && (s.status === 'Active' || s.status === 'Hold' || s.status === 'Reserved'));

  const handleLogin = async (e: any) => {
    e.preventDefault();
    try {
      const msgBuffer = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      if (hashHex === 'a36aef5a11c4073fbe60314fc9df530a9d5f986533594d1f5190742ff9e0e408') {
        setIsAuthenticated(true);
      } else { alert('Incorrect Password'); }
    } catch (err) { console.error("Auth Error"); }
  };

  const handleCheckIn = async () => {
    if (isProcessing) return; setIsProcessing(true);
    const finalPrice = getPrice(modal.sys.type, dur, extra);
    const payload = { customer: name || 'Guest', system: modal.sys.id, duration: dur, total: finalPrice, status: (isBookingMode || modal.hasActive) ? 'Reserved' : 'Active', entry_time: format12Hour(time), date: getTodayString(), fnb_total: 0, method: 'Pending', fnb_items: "" };
    await supabase.from('sales').insert([payload]);
    setModal(null); setName(''); setDur(1); setExtra(0); await fetchSessions(); setIsProcessing(false);
  };

  const handleStartReservation = async (id: number) => {
    if (isProcessing) return; setIsProcessing(true);
    const now = new Date();
    await supabase.from('sales').update({ status: 'Active', entry_time: format12Hour(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`) }).eq('id', id);
    await fetchSessions(); setIsProcessing(false);
  };

  const handleCancelReservation = async (id: number) => {
    if (!window.confirm("Cancel this booking?")) return;
    if (isProcessing) return; setIsProcessing(true);
    await supabase.from('sales').delete().eq('id', id);
    await fetchSessions(); setIsProcessing(false);
  };

  const handleEditSetup = async () => {
    if (isProcessing) return; setIsProcessing(true);
    const newTotal = getPrice(modal.sys.type, dur, extra);
    await supabase.from('sales').update({ customer: editName, duration: dur, total: newTotal }).eq('id', modal.session.id);
    setModal(null); await fetchSessions(); setIsProcessing(false);
  };

  const handleExtend = async () => {
    if (isProcessing) return; setIsProcessing(true);
    if (!isSessionValid(modal.session.id)) { setModal(null); await fetchSessions(); setIsProcessing(false); return; }
    const newDur = modal.session.duration + extendDur;
    const currentExtra = getExtraFromTotal(modal.sys.type, modal.session.duration, Number(modal.session.total));
    const isHybrid = Number(modal.session.total) !== getPrice(modal.sys.type, modal.session.duration, currentExtra);
    
    let newTotal = 0;
    if (extendDur < 0) {
        const normalOld = getPrice(modal.sys.type, modal.session.duration, editExtra);
        const normalNew = getPrice(modal.sys.type, newDur, editExtra);
        newTotal = Number(modal.session.total) + (normalNew - normalOld);
    } else if (isHybrid || (modal.sys.type === 'PS5' && editExtra !== currentExtra)) {
        const addedCost = getPrice(modal.sys.type, extendDur, editExtra);
        newTotal = Number(modal.session.total) + addedCost;
    } else {
        newTotal = getPrice(modal.sys.type, newDur, editExtra);
    }
    
    notifiedRef.current.delete(modal.session.id);
    await supabase.from('sales').update({ duration: newDur, total: newTotal }).eq('id', modal.session.id);
    setModal(null); await fetchSessions(); setIsProcessing(false);
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
    
    let remCash = 0;
    let remUPI = 0;
    let newDueAmount = 0;

    if (useKhata) {
        const cashReceived = Number(checkoutCash);
        const upiReceived = Number(checkoutUPI);
        const totalPaid = cashReceived + upiReceived;
        newDueAmount = finalTotal - totalPaid;
        remCash = cashReceived;
        remUPI = upiReceived;
    } else {
        remCash = payMethod === 'Split Payment' ? splitCash : (payMethod === 'Cash' ? finalTotal : 0);
        remUPI = payMethod === 'Split Payment' ? (finalTotal - splitCash) : (payMethod === 'UPI' ? finalTotal : 0);
        newDueAmount = 0; 
    }
    
    const sessionsToClose = [...getHoldSessions(modal.session.id), modal.session];
    const totalHoursPlayed = sessionsToClose.reduce((sum, s) => sum + Number(s.duration), 0);
    
    let selectedMemberName = '';
    if (useMembership && selectedMemberId) {
        const memberItem = cafeMenu.find(m => String(m.id) === selectedMemberId);
        if (memberItem) {
            selectedMemberName = memberItem.name.split('|')[0].trim();
            
            let currentStock = Number(memberItem.stock || 0);
            const { data: freshItem } = await supabase.from('inventory').select('stock_level').eq('id', memberItem.id).single();
            if (freshItem && freshItem.stock_level !== undefined && freshItem.stock_level !== null) {
                currentStock = Number(freshItem.stock_level);
            }
            
            const newStock = Math.max(0, Math.round((currentStock - totalHoursPlayed) * 100) / 100);
            await supabase.from('inventory').update({ stock_level: newStock }).eq('id', memberItem.id);
        }
    }

    const expectedTotal = sessionsToClose.reduce((sum, s) => {
        const gameCost = useMembership ? 0 : Number(s.total); 
        return sum + gameCost + Number(s.fnb_total || 0);
    }, 0);
    
    let remainingDifference = (expectedTotal + modal.prevDue) - finalTotal;

    for (const s of sessionsToClose) {
      let sGameTotal = useMembership ? 0 : Number(s.total);
      
      if (remainingDifference > 0 && !useMembership) {
          const applicableDiscount = Math.min(sGameTotal, remainingDifference);
          sGameTotal -= applicableDiscount;
          remainingDifference -= applicableDiscount;
      } else if (remainingDifference < 0 && !useMembership) {
          sGameTotal += Math.abs(remainingDifference);
          remainingDifference = 0;
      }

      const sExpectedTotal = sGameTotal + Number(s.fnb_total || 0);
      
      let thisCash = Math.min(sExpectedTotal, remCash);
      remCash -= thisCash;
      let thisUPI = Math.min(sExpectedTotal - thisCash, remUPI);
      remUPI -= thisUPI;
      
      let sMethodStr = '';
      if (useKhata && newDueAmount > 0) {
         sMethodStr = `Split|${thisCash}|${thisUPI}`;
      } else {
         if (thisCash > 0 && thisUPI > 0) sMethodStr = `Split|${thisCash}|${thisUPI}`;
         else if (thisUPI > 0 && thisCash === 0) sMethodStr = 'UPI';
         else sMethodStr = 'Cash';
      }

      if (useMembership && selectedMemberName) {
         sMethodStr = `Member[${selectedMemberName}] | ${sMethodStr}`;
      }

      await supabase.from('sales').update({ status: 'Completed', method: sMethodStr, total: sGameTotal }).eq('id', s.id);
      notifiedRef.current.delete(s.id);
    }
    
    await supabase.from('customer_balances').upsert({ 
       customer_name: modal.session.customer, 
       due_amount: newDueAmount 
    }, { onConflict: 'customer_name' });
    
    setModal(null); setPayMethod('Cash'); setSplitCash(0); setUseKhata(false); setCheckoutCash(''); setCheckoutUPI(''); setUseMembership(false); setSelectedMemberId('');
    await fetchSessions(); await fetchBalances(); await fetchInventory(); setIsProcessing(false);
  };

  const handleTransferConfirm = async () => {
    if (isProcessing) return; setIsProcessing(true);
    const targetSys = SYSTEMS.find(x => x.id === transferTargetSysId);
    if (!targetSys) { setIsProcessing(false); return; }

    const activeTargetSession = sessions.find(s => s.status === 'Active' && s.system === transferTargetSysId);
    const idsToLink = [modal.session.id, ...getHoldSessions(modal.session.id).map(h => h.id)];

    if (activeTargetSession) {
      for (const id of idsToLink) await supabase.from('sales').update({ status: 'Hold', method: `LinkedTo:${activeTargetSession.id}` }).eq('id', id);
    } else {
      const newEntryTime = format12Hour(`${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`);
      const { data: newSession } = await supabase.from('sales').insert({ customer: modal.session.customer, system: targetSys.id, duration: migrateDur, total: getPrice(targetSys.type, migrateDur, migrateExtra), status: 'Active', entry_time: newEntryTime, date: getTodayString(), fnb_total: 0, method: 'Pending', fnb_items: "" }).select().single();
      if (newSession) for (const id of idsToLink) await supabase.from('sales').update({ status: 'Hold', method: `LinkedTo:${newSession.id}` }).eq('id', id);
    }
    setModal(null); await fetchSessions(); setIsProcessing(false);
  };

  const handleAddFNB = async () => {
    if (isProcessing) return; setIsProcessing(true);
    const cleanCart = cart.filter(item => item.price > 0);
    
    const newFnbTotal = cleanCart.reduce((sum, item) => sum + ((item.price || 0) * item.qty), 0);
    const newFnbCost = cleanCart.reduce((sum, item) => sum + ((item.cost || 0) * item.qty), 0);
    
    if (modal.isWalkin) {
      for (const cartItem of cleanCart) {
        if (cartItem.stock !== undefined && cartItem.stock !== null) {
          await supabase.from('inventory').update({ stock_level: cartItem.stock - cartItem.qty }).eq('id', cartItem.id);
        }
      }
      const newNames: string[] = []; cleanCart.forEach(c => { newNames.push(`${c.qty}x ${c.name.replace(/\|/g, '').trim()}`); });
      const newItemsStr = newNames.join(" | ");
      let walkinMethod = fnbPayMethod === 'Split Payment' ? `Split|${fnbSplitCash}|${newFnbTotal - fnbSplitCash}` : fnbPayMethod;
      await supabase.from('cafe_orders').insert({ date: getTodayString(), items: newItemsStr, total_revenue: newFnbTotal, total_cost: newFnbCost, profit: newFnbTotal - newFnbCost, method: walkinMethod });
    } else {
      const origCart = (modal.originalCart || []).filter((item: any) => item.price > 0);
      const oldTotal = origCart.reduce((sum: number, item: any) => sum + ((item.price || 0) * item.qty), 0);
      const oldCost = origCart.reduce((sum: number, item: any) => sum + ((item.cost || 0) * item.qty), 0);
      
      const deltaTotal = newFnbTotal - oldTotal;
      const deltaCost = newFnbCost - oldCost;

      const deltaItems: Record<string, number> = {};
      origCart.forEach((c: any) => { deltaItems[c.id] = -(c.qty); });
      cleanCart.forEach((c: any) => { deltaItems[c.id] = (deltaItems[c.id] || 0) + c.qty; });

      for (const [id, diff] of Object.entries(deltaItems)) {
        if (diff !== 0) {
           const item = cafeMenu.find(m => String(m.id) === id || m.name === id);
           if (item && item.stock !== undefined && item.stock !== null) {
               await supabase.from('inventory').update({ stock_level: item.stock - diff }).eq('id', item.id);
           }
        }
      }

      const newNames: string[] = []; cleanCart.forEach(c => { newNames.push(`${c.qty}x ${c.name.replace(/\|/g, '').trim()}`); });
      const newItemsStr = newNames.join(" | ");

      if (deltaTotal !== 0) {
          const deltaLogNames: string[] = [];
          for (const [id, diff] of Object.entries(deltaItems)) {
              if (diff !== 0) {
                  const itemName = cafeMenu.find(m => String(m.id) === id || m.name === id)?.name || id;
                  deltaLogNames.push(`${diff > 0 ? '+' : ''}${diff}x ${itemName.replace(/\|/g, '').trim()}`);
              }
          }
          await supabase.from('cafe_orders').insert({ date: getTodayString(), items: `[Tab Update] ${deltaLogNames.join(" | ")}`, total_revenue: deltaTotal, total_cost: deltaCost, profit: deltaTotal - deltaCost, method: 'Tab' });
      }

      await supabase.from('sales').update({ fnb_total: newFnbTotal, fnb_items: newItemsStr }).eq('id', modal.session.id);
    }
    setModal(null); setCart([]); setFnbPayMethod('Cash'); setFnbSplitCash(0); await fetchSessions(); await fetchInventory(); setIsProcessing(false);
  };

  const handleAddMiscIncome = async () => {
    if (isProcessing || !miscDesc || !miscAmount) return; 
    setIsProcessing(true);
    const amount = Number(miscAmount);
    let methodStr = miscPayMethod === 'Split Payment' ? `Split|${miscSplitCash}|${amount - miscSplitCash}` : miscPayMethod;
    await supabase.from('cafe_orders').insert({ date: getTodayString(), items: `[Retail] ${miscDesc}`, total_revenue: amount, total_cost: 0, profit: amount, method: methodStr });
    setModal(null); setMiscDesc(''); setMiscAmount(''); setMiscPayMethod('Cash'); setMiscSplitCash(0); setIsProcessing(false);
  };

  // 🟢 CLEAN WHATSAPP REPORT GENERATOR (FLAWLESS DATES & FLOAT MATH)
  const generateMemberReport = async (memberNameFull: string, hoursLeft: number, sysType: string) => {
    setIsProcessing(true);
    const cleanName = memberNameFull.split('|')[0].trim();
    
    // Fresh fetch of remaining hours from inventory
    const memberItem = cafeMenu.find(m => m.name.split('|')[0].trim() === cleanName);
    let currentHoursLeft = Number(hoursLeft || 0);
    if (memberItem) {
       const { data: freshMember } = await supabase.from('inventory').select('stock_level').eq('id', memberItem.id).single();
       if (freshMember && freshMember.stock_level !== null) {
          currentHoursLeft = Number(freshMember.stock_level);
       }
    }

    const { data } = await supabase.from('sales').select('*').ilike('method', `%Member[${cleanName}]%`).order('date', { ascending: true });
    
    let totalUsed = 0;
    let text = `*🎮 Gamerarena Membership*\n`;
    text += `*Gamer:* ${cleanName}\n`;
    text += `*System:* ${sysType}\n\n`;
    
    if (data && data.length > 0) {
       data.forEach(s => {
          let displayDate = String(s.date || '').replace(/[\u200E\u200F]/g, '');
          const parts = displayDate.split(/[-/]/);
          
          if (parts.length === 3) {
              const y = parseInt(parts[0]);
              const m = parseInt(parts[1]) - 1;
              const d = parseInt(parts[2]);
              const dObj = new Date(y, m, d);
              if (!isNaN(dObj.getTime())) {
                  displayDate = `${dObj.getDate()} ${dObj.toLocaleString('en-US', { month: 'long' })}`;
              }
          }
          
          const sessionDur = Number(s.duration || 0);
          text += `${displayDate} | ${s.system} | ${sessionDur} Hrs\n`;
          totalUsed += sessionDur;
       });
    } else {
       text += `No sessions logged yet.\n`;
    }
    
    totalUsed = Math.round(totalUsed * 100) / 100;
    currentHoursLeft = Math.round(currentHoursLeft * 100) / 100;
    const totalPackage = Math.round((totalUsed + currentHoursLeft) * 100) / 100;
    
    text += `\n*Total Package:* ${totalPackage} Hrs\n`;
    text += `*Total Used:* ${totalUsed} Hrs\n`;
    text += `*Hours Remaining: ${currentHoursLeft} Hrs*\n`;
    
    setMemberReport(text);
    setIsProcessing(false);
  };

  const getEndOfDaySummary = async () => {
    setIsProcessing(true);
    const todayStr = getTodayString();
    let eodCash = 0; let eodUPI = 0; let pcRev = 0; let ps5Rev = 0; let simRev = 0; let fnbRev = 0; let fnbProfit = 0; let miscRev = 0;

    const { data: todaySales } = await supabase.from('sales').select('*').eq('date', todayStr).eq('status', 'Completed');
    if (todaySales) {
      todaySales.forEach(s => {
         const gameCost = Number(s.total || 0); 
         const grandTotal = gameCost + Number(s.fnb_total || 0);
         
         if (String(s.system).includes('PC')) pcRev += gameCost;
         else if (String(s.system).includes('PS')) ps5Rev += gameCost;
         else if (String(s.system).includes('SIM')) simRev += gameCost;

         let mRaw = String(s.method || '').trim();
         let m = mRaw;
         
         if (mRaw.startsWith('Member[')) {
             const splitIndex = mRaw.indexOf('] | ');
             if (splitIndex !== -1) m = mRaw.substring(splitIndex + 4).trim();
             else m = 'Cash'; 
         }

         if (m.startsWith('Split|')) { 
             const parts = m.split('|'); 
             eodCash += Number(parts[1] || 0); 
             eodUPI += Number(parts[2] || 0); 
         } 
         else if (m === 'Cash') eodCash += grandTotal; 
         else if (m === 'UPI') eodUPI += grandTotal;
      });
    }

    const { data: todayCafe } = await supabase.from('cafe_orders').select('*').eq('date', todayStr);
    if (todayCafe) {
      todayCafe.forEach(c => {
         const itemsStr = String(c.items || '');
         const isRetail = itemsStr.includes('[Retail]');

         if (isRetail) {
             miscRev += Number(c.total_revenue || 0);
         } else if (c.category !== 'Retail' && c.category !== 'Merch') {
             fnbRev += Number(c.total_revenue || 0);
             fnbProfit += isNaN(Number(c.profit)) ? (Number(c.total_revenue || 0) - Number(c.total_cost || 0)) : Number(c.profit);
         }

         const m = String(c.method || c.payment_method || '').trim();
         if (m !== 'Tab' && m !== 'tab') {
            if (m.startsWith('Split|')) { 
                const parts = m.split('|'); 
                eodCash += Number(parts[1] || 0); 
                eodUPI += Number(parts[2] || 0); 
            } 
            else if (m === 'Cash') eodCash += Number(c.total_revenue || 0); 
            else if (m === 'UPI') eodUPI += Number(c.total_revenue || 0);
         }
      });
    }

    const cashWithdrawn = Math.floor(eodCash / 100) * 100;
    const floatForward = eodCash - cashWithdrawn;

    await supabase.from('daily_ledger').upsert({
      date: todayStr,
      gaming_revenue: pcRev + ps5Rev + simRev,
      fnb_revenue: fnbRev,
      misc_revenue: miscRev,
      gross_total: pcRev + ps5Rev + simRev + fnbRev + miscRev,
      cash_collected: eodCash,
      cash_withdrawn: cashWithdrawn,
      float_forward: floatForward,
      upi_collected: eodUPI,
      upi_status: 'Pending'
    }, { onConflict: 'date' });

    setModal({ type: 'close_day', eodCash, eodUPI, pcRev, ps5Rev, simRev, fnbRev, fnbProfit, miscRev });
    setIsProcessing(false);
  };

  const totalFloorPending = sessions.filter(s => ['Active', 'Hold'].includes(s.status)).reduce((sum, s) => sum + Number(s.total) + Number(s.fnb_total || 0), 0);
  const activeOrReserved = sessions.filter(s => ['Active', 'Reserved'].includes(s.status));

  let combinedGamingTotal = 0; let combinedFnbTotal = 0;
  let aggregatedFnb: string[] = [];

  if (['checkout', 'fnb', 'transfer'].includes(modal?.type) && modal?.session) {
     const sessionsToConsider = ['checkout', 'fnb', 'transfer'].includes(modal.type) ? [...getHoldSessions(modal.session.id), modal.session] : [modal.session];
     const finalFnbCounts: Record<string, number> = {};
     
     sessionsToConsider.forEach(s => {
       combinedGamingTotal += Number(s.total || 0); 
       combinedFnbTotal += Number(s.fnb_total || 0);
       
       if (s.fnb_items && typeof s.fnb_items === 'string') {
          const cleanedItems = s.fnb_items.replace(/\[\]\s*\|?/g, '').trim();
          if (cleanedItems) {
            const items = cleanedItems.split('|').map((st: string) => st.trim()).filter(Boolean);
            items.forEach((itemStr: string) => {
               let pureName = itemStr.replace(/^(\d+x\s*)+/, '').trim();
               const match = itemStr.match(/^(\d+)x/);
               let qty = match ? parseInt(match[1]) : 1;

               finalFnbCounts[pureName] = (finalFnbCounts[pureName] || 0) + qty;
            });
          }
       }
     });
     aggregatedFnb = Object.entries(finalFnbCounts).map(([name, qty]) => `${qty}x ${name}`);
  }

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 flex bg-[#05070A] text-white items-center justify-center p-4">
        <form onSubmit={handleLogin} 
              className="bg-[#121824] p-6 sm:p-8 rounded-3xl border border-[#1E293B] shadow-2xl w-full max-w-sm text-center">
            <div className="flex justify-center mb-6"><Lock size={40} className="text-[#00D0FF]"/></div>
            <h2 className="text-xl sm:text-2xl font-black mb-6">Live Floor Access</h2>
            <input type="password" placeholder="Enter PIN" className="w-full bg-[#0B0E14] p-4 text-center rounded-xl border border-[#2D3748] focus:border-[#00D0FF] outline-none font-bold tracking-widest mb-4" value={password} onChange={e => setPassword(e.target.value)} />
            <button type="submit" className="w-full bg-[#00D0FF] text-black py-4 rounded-xl font-black hover:bg-white transition-all">Unlock POS</button>
        </form>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1E293B; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #00D0FF; }
      `}} />

      <div className="fixed inset-0 flex flex-col md:flex-row bg-[#05070A] text-white font-sans">
        
        {/* DESKTOP SIDEBAR */}
        <div className="hidden md:flex w-16 bg-[#0B0E14] border-r border-[#1E293B] flex-col items-center py-4 shrink-0 z-10 gap-4">
          <div className="p-3 bg-[#00D0FF]/20 text-[#00D0FF] border border-[#00D0FF] rounded-xl transition-all shadow-[0_0_15px_rgba(0,208,255,0.2)]" title="Live Floor"><Monitor size={20} /></div>
          <a href="/vault/inventory" className="p-3 bg-[#1A2235] text-gray-400 hover:text-[#00D0FF] hover:border-[#00D0FF] border border-[#2D3748] rounded-xl transition-all shadow-sm" title="Inventory"><Package size={20} /></a>
          <a href="/vault" className="p-3 bg-[#1A2235] text-gray-400 hover:text-orange-500 hover:border-orange-500 border border-[#2D3748] rounded-xl transition-all shadow-sm" title="Master Vault"><BarChart3 size={20} /></a>
          <a href="/vault/ledger" className="p-3 bg-[#1A2235] text-gray-400 hover:text-emerald-500 hover:border-emerald-500 border border-[#2D3748] rounded-xl transition-all shadow-sm" title="Finance"><Building2 size={20} /></a>
        </div>

        {/* MOBILE BOTTOM NAVIGATION BAR */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0B0E14] border-t border-[#1E293B] flex items-center justify-around z-40 px-2 shadow-2xl">
          <div className="p-2.5 bg-[#00D0FF]/20 text-[#00D0FF] border border-[#00D0FF] rounded-xl transition-all" title="Live Floor"><Monitor size={20} /></div>
          <a href="/vault/inventory" className="p-2.5 bg-[#1A2235] text-gray-400 hover:text-[#00D0FF] rounded-xl border border-[#2D3748]" title="Inventory"><Package size={20} /></a>
          <a href="/vault" className="p-2.5 bg-[#1A2235] text-gray-400 hover:text-orange-500 rounded-xl border border-[#2D3748]" title="Master Vault"><BarChart3 size={20} /></a>
          <a href="/vault/ledger" className="p-2.5 bg-[#1A2235] text-gray-400 hover:text-emerald-500 rounded-xl border border-[#2D3748]" title="Finance"><Building2 size={20} /></a>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 pb-20 md:pb-4 custom-scrollbar">
          <div className="max-w-[1600px] w-full mx-auto flex flex-col">
            
            {/* HEADER */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4">
              <div className="flex justify-between items-center w-full xl:w-auto">
                 <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">Gamerarena <span className="text-[#00D0FF]">POS</span></h1>
                 <div className="xl:hidden text-right bg-[#121824] px-3 py-1 rounded-lg border border-[#1E293B]">
                    <p className="text-gray-500 text-[8px] font-black uppercase">Pending</p>
                    <p className="text-[#FF754C] text-xs font-black">₹{totalFloorPending}</p>
                 </div>
              </div>

              <div className="flex flex-wrap gap-2 sm:gap-3 items-center w-full xl:w-auto">
                <button onClick={() => { setMemberReport(''); setModal({ type: 'members_hub' }); }} className="flex items-center justify-center gap-1.5 bg-[#121824] border border-[#1E293B] hover:border-purple-400 hover:text-purple-400 px-3 py-2 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all shadow-sm"><Users size={14} /> Members</button>

                <button onClick={getEndOfDaySummary} disabled={isProcessing} className="flex items-center justify-center gap-1.5 bg-[#121824] border border-[#1E293B] hover:border-emerald-400 hover:text-emerald-400 px-3 py-2 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all shadow-sm"><MoonStar size={14} /> Close Day</button>
                
                <button onClick={() => { setCart([]); setFnbPayMethod('Cash'); setFnbSplitCash(0); setModal({ type: 'fnb', isWalkin: true }); }} className="flex items-center justify-center gap-1.5 bg-[#121824] border border-[#1E293B] hover:border-[#00D0FF] hover:text-[#00D0FF] px-3 py-2 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all shadow-sm"><ShoppingCart size={14} /> Direct F&B</button>
                
                <button onClick={() => { setMiscDesc(''); setMiscAmount(''); setMiscPayMethod('Cash'); setMiscSplitCash(0); setModal({ type: 'misc_income' }); }} className="flex items-center justify-center gap-1.5 bg-[#121824] border border-[#1E293B] hover:border-purple-400 hover:text-purple-400 px-3 py-2 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all shadow-sm"><Tag size={14} /> Misc</button>

                <div className="hidden sm:block h-6 w-px bg-[#1E293B] mx-1"></div>
                {currentTime && <div className="hidden sm:block text-right bg-gradient-to-br from-[#121824] to-[#0B0E14] px-4 py-1.5 rounded-xl border border-[#1E293B] shadow-sm"><p className="text-gray-500 text-[8px] font-black uppercase tracking-widest mb-0.5">Local Time</p><p className="text-white text-sm font-black tabular-nums tracking-tight leading-none">{currentTime.toLocaleTimeString('en-US', { hour12: true })}</p></div>}
                <div className="hidden sm:block text-right bg-gradient-to-br from-[#121824] to-[#0B0E14] px-4 py-1.5 rounded-xl border border-[#1E293B] shadow-sm"><p className="text-gray-500 text-[8px] font-black uppercase tracking-widest mb-0.5">Pending</p><p className="text-[#FF754C] text-sm font-black tabular-nums tracking-tight leading-none">₹{totalFloorPending}</p></div>
              </div>
            </div>
            
            {/* SYSTEM CARDS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 w-full">
              {SYSTEMS.map(sys => {
                const activeSession = activeOrReserved.find(a => a.system === sys.id && a.status === 'Active');
                const upcomingBookings = activeOrReserved.filter(a => a.system === sys.id && a.status === 'Reserved').sort((a,b) => parse12HourToDate(a.entry_time).getTime() - parse12HourToDate(b.entry_time).getTime());

                const holdSessions = activeSession ? getHoldSessions(activeSession.id) : [];
                const holdNames = holdSessions.map(h => h.system).join(', ');
                
                const gamingTotal = Number(activeSession?.total || 0); 
                const fnbTotal = Number(activeSession?.fnb_total || 0);
                const holdTotal = holdSessions.reduce((sum, h) => sum + Number(h.total) + Number(h.fnb_total || 0), 0);
                const grandTotal = gamingTotal + fnbTotal + holdTotal;
                
                const timerInfo = activeSession ? (() => {
                   const entryTimeStr = activeSession.entry_time;
                   const durationHrs = activeSession.duration;
                   if (!entryTimeStr) return { text: '', color: 'text-white', isOverdue: false };
                   const endTime = parse12HourToDate(entryTimeStr).getTime() + (durationHrs * 3600000);
                   const timeLeftMins = (endTime - new Date().getTime()) / 60000;
                   if (timeLeftMins < 0) return { text: `🚨 ${Math.abs(Math.round(timeLeftMins))}m OVER`, color: 'text-red-400 animate-pulse', isOverdue: true };
                   if (timeLeftMins <= 5.05) return { text: `⚠️ ${Math.round(timeLeftMins)}m LEFT`, color: 'text-red-400', isOverdue: false };
                   if (timeLeftMins <= 10) return { text: `⚠️ ${Math.round(timeLeftMins)}m LEFT`, color: 'text-orange-400', isOverdue: false };
                   return { text: `⏳ ${Math.round(timeLeftMins)}m LEFT`, color: 'text-[#00D0FF]', isOverdue: false };
                })() : null;
                
                const isOverdue = timerInfo?.isOverdue;
                const userDue = activeSession ? (balances[activeSession.customer] || 0) : 0;

                return (
                  <div key={sys.id} className={`flex flex-col p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 min-w-0 ${activeSession ? (isOverdue ? 'border-red-500/50 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-[#00D0FF]/40 bg-[#00D0FF]/5') : 'border-[#1E293B] bg-[#0B0E14] hover:border-[#2D3748]'}`}>
                    <div className="flex justify-between items-center mb-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${activeSession ? (isOverdue ? 'bg-red-500/20 text-red-400' : 'bg-[#00D0FF]/20 text-[#00D0FF]') : 'bg-[#1A2235] text-gray-500'}`}><sys.icon size={16}/></div>
                        <h3 className={`text-base sm:text-lg font-black tracking-wide ${activeSession ? 'text-white' : 'text-gray-400'}`}>{sys.id}</h3>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest shrink-0 ${activeSession ? (isOverdue ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-[#00D0FF]/20 text-[#00D0FF] border border-[#00D0FF]/30") : "bg-[#1A2235] text-gray-500 border border-[#2D3748]"}`}>
                        {activeSession ? "ACTIVE" : "FREE"}
                      </span>
                    </div>

                    {activeSession ? (
                      <div className="flex flex-col gap-3 min-w-0">
                          <div className="flex justify-between items-start gap-2 min-w-0">
                             <div className="min-w-0 flex-1">
                                <p className="font-black text-white text-sm flex items-center gap-1.5">
                                  <User size={12} className={`shrink-0 ${isOverdue ? 'text-red-400' : 'text-[#00D0FF]'}`}/> 
                                  <span className="truncate pr-1">{activeSession.customer}</span>
                                  {userDue > 0 && <span className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-widest font-black shrink-0 border border-orange-500/30">Due: ₹{userDue}</span>}
                                </p>
                                <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-bold mt-1 group shrink-0">
                                    <Clock size={10}/> {activeSession.entry_time} <span className="text-[#1E293B]">|</span> {activeSession.duration}h
                                    <button onClick={() => { setEditTime24(`${String(parse12HourToDate(activeSession.entry_time).getHours()).padStart(2,'0')}:${String(parse12HourToDate(activeSession.entry_time).getMinutes()).padStart(2,'0')}`); setModal({ type: 'edit_time', session: activeSession }); }} className={`ml-1 opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity ${isOverdue ? 'hover:text-red-400' : 'hover:text-[#00D0FF]'}`}><Pencil size={10}/></button>
                                </div>
                             </div>
                             <div className={`text-[10px] sm:text-[11px] font-black bg-black/40 px-2 py-1 rounded-md border border-[#1E293B] shrink-0 ${timerInfo?.color}`}>{timerInfo?.text}</div>
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
                            <button onClick={() => { 
                               const prevDue = balances[activeSession.customer] || 0;
                               const totalWithKhata = grandTotal + prevDue;
                               setManualTotal(totalWithKhata); 
                               setPayMethod('Cash');
                               setSplitCash(0);
                               setUseKhata(false);
                               setCheckoutCash('');
                               setCheckoutUPI(''); 
                               setUseMembership(false); 
                               setSelectedMemberId(''); 
                               setModal({ type: 'checkout', session: activeSession, grandTotal, holdTotal, holdNames, combinedFnbTotal, combinedGamingTotal, prevDue }); 
                            }} className={`w-full text-black py-2.5 sm:py-2 rounded-lg font-black text-xs transition-all ${isOverdue ? 'bg-red-500 hover:bg-white' : 'bg-[#00D0FF] hover:bg-white'}`}>Checkout & Pay</button>
                            
                            <div className="grid grid-cols-4 gap-1.5">
                               <button onClick={() => { setTransferTargetSysId(''); setMigrateDur(1); setMigrateExtra(0); setModal({ type: 'transfer', session: activeSession }); }} className="bg-[#1A2235] hover:bg-white hover:text-black text-gray-400 text-[10px] font-bold py-2 sm:py-1.5 rounded-lg border border-[#2D3748] transition-all flex justify-center items-center" title="Transfer"><ArrowRightLeft size={14}/></button>
                               
                               <button onClick={() => { setEditName(activeSession.customer); setDur(activeSession.duration); setExtra(getExtraFromTotal(sys.type, activeSession.duration, Number(activeSession.total))); setModal({ type: 'edit_setup', session: activeSession, sys }); }} className="bg-[#1A2235] hover:text-[#00D0FF] hover:border-[#00D0FF] text-gray-400 text-[10px] font-bold py-2 sm:py-1.5 rounded-lg border border-[#2D3748] transition-all flex justify-center items-center" title="Edit Details"><Edit2 size={14}/></button>

                               <button onClick={() => { setExtendDur(0.5); setEditExtra(getExtraFromTotal(sys.type, activeSession.duration, Number(activeSession.total))); setModal({ type: 'extend', session: activeSession, sys }); }} className="bg-[#1A2235] hover:text-[#00D0FF] hover:border-[#00D0FF] text-gray-400 text-[10px] font-bold py-2 sm:py-1.5 rounded-lg border border-[#2D3748] transition-all flex justify-center items-center" title="Adjust Time"><Clock size={14}/></button>
                               
                               <button onClick={() => {
                                  const parsedCart: any[] = [];
                                  if (activeSession.fnb_items && typeof activeSession.fnb_items === 'string') {
                                      const cleanedStr = activeSession.fnb_items.replace(/\[\]\s*\|?/g, '').trim();
                                      if (cleanedStr) {
                                        const items = cleanedStr.split('|').map((s: string) => s.trim()).filter(Boolean);
                                        items.forEach((itemStr: string) => {
                                            let pureName = itemStr.replace(/^(\d+x\s*)+/, '').trim();
                                            const multipliers = [...itemStr.matchAll(/(\d+)x/g)].map(m => parseInt(m[1]));
                                            let qty = multipliers.length > 0 ? multipliers[multipliers.length - 1] : 1;
                                            
                                            const existing = parsedCart.find(p => p.name === pureName || p.id === pureName);
                                            if (existing) {
                                                existing.qty += qty;
                                            } else {
                                                let menuItem = cafeMenu.find(m => m.name.toLowerCase() === pureName.toLowerCase());
                                                if(!menuItem) menuItem = cafeMenu.find(m => m.name.toLowerCase().replace(/[^a-z0-9]/g,'') === pureName.toLowerCase().replace(/[^a-z0-9]/g,''));
                                                if(!menuItem) menuItem = cafeMenu.find(m => pureName.toLowerCase().includes(m.name.toLowerCase().split('/')[0]) || m.name.toLowerCase().includes(pureName.toLowerCase().split('/')[0]));
                                                
                                                if (menuItem) {
                                                    parsedCart.push({ ...menuItem, qty, name: menuItem.name }); 
                                                } else {
                                                    parsedCart.push({ id: pureName, name: `⚠️ ${pureName} (Menu Error)`, price: 0, cost: 0, qty });
                                                }
                                            }
                                        });
                                      }
                                  }
                                  setCart(parsedCart);
                                  setModal({ type: 'fnb', session: activeSession, originalCart: JSON.parse(JSON.stringify(parsedCart)) });
                               }} className="bg-[#1A2235] hover:text-[#00D0FF] hover:border-[#00D0FF] text-gray-400 text-[10px] font-bold py-2 sm:py-1.5 rounded-lg border border-[#2D3748] transition-all flex justify-center items-center" title="Edit F&B"><Coffee size={14}/></button>
                            </div>

                            <button onClick={() => { setIsBookingMode(true); setName(''); setDur(1); setExtra(0); setModal({ type: 'checkin', sys, hasActive: true }); }} className="w-full py-1.5 rounded-md text-[8px] font-bold uppercase tracking-widest text-yellow-500 bg-yellow-500/5 hover:bg-yellow-500/10 border border-yellow-500/10 transition-all flex items-center justify-center gap-1"><Plus size={8}/> Future Booking</button>
                          </div>
                      </div>
                    ) : (
                      <button onClick={() => { const n = new Date(); setTime(`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`); setIsBookingMode(false); setName(''); setDur(1); setExtra(0); setModal({ type: 'checkin', sys, hasActive: false }); }} className="group w-full py-6 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#2D3748] hover:border-[#00D0FF]/50 hover:bg-[#00D0FF]/5 transition-all min-h-[130px]">
                        <div className="bg-[#1A2235] group-hover:bg-[#00D0FF] text-gray-500 group-hover:text-black p-2 rounded-full transition-all"><Plus size={16} /></div>
                        <span className="text-gray-500 group-hover:text-[#00D0FF] font-bold text-xs tracking-wide">Check In / Reserve</span>
                      </button>
                    )}

                    {upcomingBookings.length > 0 && (
                      <div className={`mt-3 pt-3 border-t border-[#1E293B] space-y-2`}>
                        {!activeSession && <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest text-center">Upcoming</p>}
                        <div className="space-y-1.5">
                          {upcomingBookings.map(booking => (
                            <div key={booking.id} className="relative bg-[#1A2235] border border-[#2D3748] rounded-lg p-2 flex flex-col gap-1.5 min-w-0">
                               <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500 rounded-l-lg"></div>
                               <div className="flex justify-between items-center pl-1.5 min-w-0">
                                  <span className="text-white text-[10px] font-bold truncate pr-1 flex-1 min-w-0"><User size={8} className="inline text-yellow-500 mb-0.5 mr-0.5"/>{booking.customer}</span>
                                  <div className="flex items-center gap-1 text-yellow-500 text-[9px] font-black shrink-0">{booking.entry_time} <span className="text-gray-500 font-normal">|</span> {booking.duration}h</div>
                               </div>
                               <div className="flex gap-1.5 pl-1.5 shrink-0">
                                  <button onClick={() => handleStartReservation(booking.id)} disabled={!!activeSession || isProcessing} className="flex-1 bg-yellow-500 text-black text-[9px] uppercase font-black py-1 rounded hover:bg-yellow-400 disabled:opacity-20 disabled:cursor-not-allowed transition-all">Start</button>
                                  <button onClick={() => handleCancelReservation(booking.id)} disabled={isProcessing} className="px-2.5 bg-[#0B0E14] text-gray-400 border border-[#2D3748] hover:text-red-500 hover:border-red-500 rounded transition-all shrink-0" title="Cancel Booking"><X size={10}/></button>
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
          </div>
        </div>

        {/* 🟢 MODAL OVERLAY */}
        {modal && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-3 sm:p-5 overflow-hidden">
            <div className="bg-[#121824] border border-[#1E293B] rounded-2xl flex flex-col shadow-2xl relative overflow-hidden transition-all duration-200 w-full"
                 style={{ maxWidth: modal.type === 'fnb' ? '1100px' : '480px', maxHeight: '90vh' }}>

              {/* MODAL HEADER */}
              <div className="flex justify-between items-center p-4 sm:p-5 border-b border-[#1E293B] shrink-0 bg-[#0B0E14] w-full min-w-0">
                  <h2 className="text-lg sm:text-xl font-black text-white truncate pr-2 flex-1">
                    {modal.type === 'checkin' && `Setup ${modal.sys.id}`}
                    {modal.type === 'checkout' && `Checkout ${modal.session.system}`}
                    {modal.type === 'transfer' && `Transfer / Merge`}
                    {modal.type === 'extend' && `Adjust Session Time`}
                    {modal.type === 'edit_setup' && `Edit Session Details`}
                    {modal.type === 'edit_time' && `Edit Start Time`}
                    {modal.type === 'close_day' && `End of Day Report`}
                    {modal.type === 'fnb' && (modal.isWalkin ? `Direct F&B Sale` : `Edit F&B Tab`)}
                    {modal.type === 'misc_income' && `Misc / Retail Income`}
                    {modal.type === 'members_hub' && `Memberships Hub`}
                  </h2>
                  <button onClick={() => setModal(null)} className="p-2 bg-[#1A2235] rounded-full hover:bg-red-500/20 hover:text-red-500 transition-colors shrink-0"><X size={16}/></button>
              </div>

              {/* CONTENT AREA */}
              <div className="flex-1 overflow-hidden flex flex-col min-h-0 min-w-0 w-full">
                
                {modal.type === 'fnb' ? (
                   <div className="flex flex-col md:flex-row flex-1 min-h-0 bg-[#05070A] w-full min-w-0">
                      
                      {/* LEFT PANEL: Categories & Grid */}
                      <div className="flex-1 flex flex-col min-w-0 min-h-0 border-b md:border-b-0 md:border-r border-[#1E293B]">
                         
                         <div className="p-4 border-b border-[#1E293B] bg-[#121824] shrink-0 min-w-0 w-full overflow-hidden">
                            {!modal.isWalkin && (
                              <div className="flex justify-between items-center mb-4 min-w-0">
                                 <span className="text-xs text-gray-400 truncate pr-2">Editing Tab for: <span className="text-white font-bold">{modal.session?.customer}</span></span>
                                 <button onClick={() => setCart(cart.filter(c => c.price > 0))} className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/20 flex items-center gap-1 shrink-0"><Trash2 size={12}/> Clear Ghosts</button>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2 w-full">
                               {categories.map(cat => (
                                  <button key={cat} onClick={() => setFnbCategory(cat)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${fnbCategory === cat ? 'bg-[#00D0FF] text-black' : 'bg-[#1A2235] text-gray-400 hover:text-white border border-[#2D3748]'}`}>{cat}</button>
                               ))}
                            </div>
                         </div>
                         
                         <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full p-4 custom-scrollbar bg-[#0B0E14]">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 w-full min-w-0 pr-1">
                               {cafeMenu
                                  .filter(item => item.category === fnbCategory)
                                  .sort((a, b) => {
                                     const aOrig = (modal?.originalCart || []).find((c: any) => c.id === a.id)?.qty || 0;
                                     const bOrig = (modal?.originalCart || []).find((c: any) => c.id === b.id)?.qty || 0;
                                     const aMax = (a.stock !== undefined && a.stock !== null) ? aOrig + (a.stock as number) : Infinity;
                                     const bMax = (b.stock !== undefined && b.stock !== null) ? bOrig + (b.stock as number) : Infinity;
                                     const aOut = aMax === 0 ? 1 : 0;
                                     const bOut = bMax === 0 ? 1 : 0;
                                     if (aOut !== bOut) return aOut - bOut;
                                     return a.name.localeCompare(b.name);
                                  })
                                  .map(item => {
                                   const inCart = cart.find(c => c.id === item.id);
                                   const qty = inCart ? inCart.qty : 0;
                                   const originalItem = (modal?.originalCart || []).find((c: any) => c.id === item.id);
                                   const originalQty = originalItem ? originalItem.qty : 0;
                                   const hasStockLimit = item.stock !== undefined && item.stock !== null;
                                   const maxAllowedQty = hasStockLimit ? originalQty + (item.stock as number) : Infinity;
                                   const isOutOfStock = hasStockLimit && maxAllowedQty === 0;
                                   const isAtMaxCapacity = hasStockLimit && qty >= maxAllowedQty;

                                   return (
                                     <div key={item.id} className={`flex justify-between items-center p-3 rounded-xl border min-w-0 w-full ${isOutOfStock ? 'bg-[#0B0E14]/50 border-red-900/30 opacity-60' : 'bg-[#121824] border-[#2D3748]'}`}>
                                        <div className="pr-2 flex-1 min-w-0">
                                          <p className={`font-bold text-sm leading-tight mb-1 truncate ${isOutOfStock ? 'text-gray-600' : 'text-white'}`}>{item.name}</p>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <p className="text-xs text-[#00D0FF] font-bold">₹{item.price}</p>
                                            {hasStockLimit && <span className={`text-[8px] px-1.5 py-0.5 rounded ${isOutOfStock ? 'bg-red-500/10 text-red-500' : 'bg-gray-800 text-gray-400'}`}>{isOutOfStock ? 'Out' : `${item.stock} left`}</span>}
                                          </div>
                                        </div>
                                        {isOutOfStock ? ( <div className="px-2 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-[9px] font-bold shrink-0">Empty</div> ) : qty > 0 ? (
                                          <div className="flex items-center gap-1 bg-[#1A2235] px-1.5 py-1 rounded-lg shrink-0">
                                             <button onClick={() => setCart(cart.map(c => c.id === item.id ? {...c, qty: c.qty - 1} : c).filter(c => c.qty > 0))} className="p-1 hover:text-white"><Minus size={14}/></button>
                                             <span className="font-bold text-xs w-5 text-center">{qty}</span>
                                             <button disabled={isAtMaxCapacity} onClick={() => setCart(cart.map(c => c.id === item.id ? {...c, qty: c.qty + 1} : c))} className="p-1 disabled:opacity-30 hover:text-white"><Plus size={14}/></button>
                                          </div>
                                        ) : ( <button onClick={() => setCart([...cart, { ...item, qty: 1 }])} className="px-3 py-1.5 bg-[#1A2235] rounded-lg text-xs font-bold hover:bg-[#00D0FF] hover:text-black shrink-0 transition-all">Add</button> )}
                                     </div>
                                   )
                               })}
                            </div>
                         </div>
                      </div>

                      {/* RIGHT PANEL: Cart */}
                      <div className="w-full md:w-80 lg:w-96 flex flex-col shrink-0 bg-[#0B0E14]">
                         <div className="flex-1 flex flex-col min-h-0 p-4">
                            <h3 className="font-black text-gray-500 text-[10px] uppercase mb-4 shrink-0">{modal.isWalkin ? "New Cart" : "Current Tab"}</h3>
                            {cart.length === 0 ? <p className="text-xs text-gray-600 italic text-center py-4">No items added yet.</p> : (
                              <div className="space-y-2.5 overflow-y-auto overflow-x-hidden custom-scrollbar flex-1 min-h-0 pr-3">
                                {cart.map(c => (
                                  <div key={c.id} className="flex justify-between items-center text-sm text-gray-300 min-w-0 w-full shrink-0">
                                     <span className={`truncate pr-2 flex-1 min-w-0 ${c.price === 0 ? 'text-red-400 line-through' : ''}`}>{c.qty}x {c.name}</span>
                                     <div className="flex items-center gap-3 shrink-0">
                                        <span className={`font-bold ${c.price === 0 ? 'text-red-400' : 'text-white'}`}>₹{(c.price || 0) * c.qty}</span>
                                        <button onClick={() => setCart(cart.filter(item => item.id !== c.id))} className="text-red-500 hover:text-white transition-colors p-1" title="Remove from tab"><X size={14}/></button>
                                     </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {modal.isWalkin && cart.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-[#1E293B] shrink-0">
                                 <label className="text-[10px] text-[#00D0FF] font-bold uppercase ml-1">Payment Method</label>
                                 <select className="w-full mt-1.5 p-3 text-sm bg-[#1A2235] rounded-xl border border-[#2D3748] focus:border-[#00D0FF] outline-none" value={fnbPayMethod} onChange={e => setFnbPayMethod(e.target.value)}>
                                     <option>Cash</option><option>UPI</option><option>Split Payment</option>
                                 </select>
                                 {fnbPayMethod === 'Split Payment' && <input type="number" className="w-full mt-3 p-3 bg-[#1A2235] rounded-xl outline-none font-bold text-sm border border-[#2D3748] focus:border-[#00D0FF]" placeholder="Cash Amount" value={fnbSplitCash || ''} onChange={e => setFnbSplitCash(Number(e.target.value))} />}
                              </div>
                            )}
                         </div>
                         
                         <div className="p-4 border-t border-[#1E293B] shrink-0 bg-[#121824]">
                            <div className="flex justify-between text-gray-400 mb-4 text-base"><span>Total:</span><span className="font-black text-white text-xl">₹{cart.reduce((sum, item) => sum + ((item.price || 0) * item.qty), 0)}</span></div>
                            <button onClick={handleAddFNB} disabled={isProcessing || (modal.isWalkin && cart.length === 0)} className="w-full bg-[#00D0FF] text-black py-3.5 rounded-xl font-black text-sm disabled:opacity-50 hover:bg-white transition-all shadow-[0_0_15px_rgba(0,208,255,0.3)]">
                              {isProcessing ? 'Processing...' : (modal.isWalkin ? 'Complete Sale' : 'Save Tab')}
                            </button>
                         </div>
                      </div>
                   </div>
                ) : (
                   // 🟢 ALL OTHER STANDARD MODALS
                   <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0 space-y-4">
                      
                      {modal.type === 'members_hub' && (() => {
                         const allMembers = cafeMenu.filter(i => String(i.category).startsWith('Membership - '));
                         return (
                           <div className="space-y-4">
                              {!memberReport ? (
                                 <>
                                    <p className="text-sm text-gray-400 mb-2">Select a member to view their usage history and generate a WhatsApp summary.</p>
                                    <div className="space-y-2">
                                       {allMembers.length === 0 ? (
                                           <p className="text-gray-500 italic text-center text-sm py-4">No active memberships found in Inventory.</p>
                                       ) : (
                                           allMembers.map(m => {
                                             const sysType = m.category.replace('Membership - ', '');
                                             const cleanName = m.name.split('|')[0].trim();
                                             const expMatch = m.name.match(/Exp:\s*(\d{4}-\d{2}-\d{2})/i);
                                             let isExpired = false;
                                             if (expMatch) {
                                                const expDate = new Date(expMatch[1]);
                                                const today = new Date(getTodayString());
                                                if (expDate < today) isExpired = true;
                                             }
                                             return (
                                               <button key={m.id} onClick={() => generateMemberReport(m.name, Number(m.stock || 0), sysType)} className={`w-full bg-[#0B0E14] border transition-all p-4 rounded-xl flex justify-between items-center text-left ${isExpired ? 'border-red-500/30 opacity-60' : 'hover:bg-[#1A2235] border-[#2D3748] hover:border-purple-500'}`}>
                                                   <div className="flex flex-col min-w-0 pr-2">
                                                      <span className="font-bold text-white text-base truncate">{cleanName}</span>
                                                      <span className="text-[10px] text-gray-500 font-bold uppercase truncate">{sysType} {isExpired ? '- EXPIRED' : ''}</span>
                                                   </div>
                                                   <span className={`${isExpired ? 'text-red-400' : 'text-purple-400'} font-black text-sm shrink-0`}>{m.stock} Hrs Left</span>
                                               </button>
                                             );
                                           })
                                       )}
                                    </div>
                                 </>
                              ) : (
                                 <>
                                    <div className="bg-[#0B0E14] border border-[#2D3748] p-4 sm:p-5 rounded-2xl font-mono text-xs sm:text-sm text-gray-300 whitespace-pre-wrap break-words">
                                       {memberReport}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                       <button onClick={() => setMemberReport('')} className="w-full bg-[#1A2235] text-gray-400 border border-[#2D3748] py-3.5 rounded-xl font-bold hover:text-white transition-all text-sm">Back to List</button>
                                       <button onClick={() => { navigator.clipboard.writeText(memberReport); alert("Summary copied to clipboard!"); }} className="w-full bg-purple-500 text-white py-3.5 rounded-xl font-black hover:bg-purple-400 transition-all flex items-center justify-center gap-2 text-sm shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                                         <Copy size={16}/> Copy & WhatsApp
                                       </button>
                                    </div>
                                 </>
                              )}
                           </div>
                         );
                      })()}
                      
                      {/* 🟢 CHECKOUT MODAL */}
                      {modal.type === 'checkout' && (() => {
                         const sysType = SYSTEMS.find(x => x.id === modal.session.system)?.type;
                         const targetCategory = `Membership - ${sysType}`;
                         const validMembers = cafeMenu.filter(i => i.category === targetCategory);

                         return (
                           <div className="space-y-4">
                             <div className="bg-[#0B0E14] p-4 rounded-2xl border border-[#2D3748] space-y-2 text-sm">
                               <div className="flex justify-between font-bold border-b border-[#1E293B] pb-2 text-[#00D0FF]">
                                 <span className="truncate pr-2">{modal.session.customer}</span><span className="shrink-0">{modal.session.duration} Hrs Active</span>
                               </div>
                               {modal.holdTotal > 0 && <div className="flex justify-between text-orange-400 text-xs font-bold mt-2"><span>Includes transfers: {modal.holdNames}</span></div>}
                               
                               <div className="flex justify-between text-gray-400 mt-2">
                                  <span>Combined Gaming:</span>
                                  <span className={useMembership ? 'text-gray-500 line-through' : 'text-white'}>₹{modal.combinedGamingTotal}</span>
                               </div>
                               
                               <div className="pt-2 border-t border-[#1E293B]">
                                 <div className="flex justify-between text-gray-400 mb-1">
                                   <span>Combined F&B:</span>
                                   <span className="font-bold text-white">₹{modal.combinedFnbTotal}</span>
                                 </div>
                                 {aggregatedFnb.length > 0 && (
                                   <div className="bg-[#1A2235] p-2 rounded-xl mt-2 text-[10px] text-[#00D0FF] font-bold space-y-1">
                                     {aggregatedFnb.map((itemName: string, i: number) => (
                                        <div key={i} className="flex justify-between"><span className="truncate">{itemName}</span></div>
                                     ))}
                                   </div>
                                 )}
                               </div>
                             </div>

                             <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl transition-all">
                                <label className="flex items-center gap-2 text-purple-400 font-bold text-sm cursor-pointer">
                                   <input type="checkbox" className="accent-purple-500 w-4 h-4 shrink-0" checked={useMembership} onChange={e => {
                                       setUseMembership(e.target.checked);
                                       const prevDue = modal.prevDue;
                                       if (e.target.checked) {
                                          const newTot = modal.combinedFnbTotal + prevDue;
                                          setManualTotal(newTot);
                                       } else {
                                          const newTot = modal.combinedGamingTotal + modal.combinedFnbTotal + prevDue;
                                          setManualTotal(newTot);
                                       }
                                   }} />
                                   <span className="truncate">Deduct from <span className="text-white bg-purple-500/20 px-1 rounded">{sysType}</span> Memb.</span>
                                </label>
                                
                                {useMembership && (
                                   <div className="mt-3 pt-3 border-t border-purple-500/20">
                                      <select className="w-full bg-[#0B0E14] p-3 text-sm rounded-xl border border-purple-500/50 outline-none text-white focus:border-purple-400"
                                              value={selectedMemberId} onChange={e => setSelectedMemberId(e.target.value)}>
                                         <option value="" disabled>Select Valid Member...</option>
                                         {validMembers.length === 0 && <option disabled>No valid {sysType} memberships found.</option>}
                                         {validMembers.map(m => {
                                            const expMatch = m.name.match(/Exp:\s*(\d{4}-\d{2}-\d{2})/i);
                                            let isExpired = false;
                                            if (expMatch) {
                                               const expDate = new Date(expMatch[1]);
                                               const today = new Date(getTodayString());
                                               if (expDate < today) isExpired = true;
                                            }
                                            
                                            return (
                                               <option key={m.id} value={m.id} disabled={isExpired || Number(m.stock) <= 0}>
                                                  {m.name.split('|')[0].trim()} ({m.stock} Hrs Left) {isExpired ? ' ❌ EXPIRED' : ''}
                                               </option>
                                            )
                                         })}
                                      </select>
                                   </div>
                                )}
                             </div>

                             <div className="pt-3 mt-3 border-t border-[#1E293B]">
                                 {modal.prevDue > 0 && (
                                   <div className="flex justify-between items-center mb-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                                       <span className="text-xs text-orange-400 font-bold uppercase tracking-widest">Previous Due / Khata</span>
                                       <span className="text-orange-400 font-black text-lg">₹{modal.prevDue}</span>
                                   </div>
                                 )}
                                 <div>
                                    <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Final Grand Total (Includes Due)</label>
                                    <div className="flex items-center bg-[#0B0E14] mt-1 p-2 rounded-xl border border-[#2D3748] focus-within:border-[#00D0FF]">
                                        <div className="px-3 text-[#00D0FF] shrink-0"><IndianRupee size={18}/></div>
                                        <input type="number" className="bg-transparent w-full font-black text-2xl outline-none text-white py-1" value={manualTotal} onChange={e => setManualTotal(e.target.value)} />
                                    </div>
                                 </div>

                                 <label className="flex items-center gap-2 text-orange-400 font-bold text-sm cursor-pointer mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl transition-all">
                                    <input type="checkbox" className="accent-orange-500 w-4 h-4 shrink-0" checked={useKhata} onChange={e => {
                                        setUseKhata(e.target.checked);
                                        if (e.target.checked) {
                                            setCheckoutCash('');
                                            setCheckoutUPI('');
                                        }
                                    }} />
                                    <span className="truncate">Partial Payment / Pay Later (Khata)</span>
                                 </label>

                                 {useKhata ? (
                                    <div className="grid grid-cols-2 gap-3 mt-4">
                                       <div>
                                         <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Cash Received</label>
                                         <input type="number" className="w-full mt-1 p-3 text-sm bg-[#0B0E14] rounded-xl border border-[#2D3748] focus:border-emerald-500 outline-none font-bold" value={checkoutCash} onChange={e => setCheckoutCash(e.target.value)} placeholder="0" />
                                       </div>
                                       <div>
                                         <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">UPI Received</label>
                                         <input type="number" className="w-full mt-1 p-3 text-sm bg-[#0B0E14] rounded-xl border border-[#2D3748] focus:border-[#00D0FF] outline-none font-bold" value={checkoutUPI} onChange={e => setCheckoutUPI(e.target.value)} placeholder="0" />
                                       </div>
                                       <div className="col-span-2">
                                          {(() => {
                                              const totalGiven = Number(checkoutCash) + Number(checkoutUPI);
                                              const newDue = Number(manualTotal) - totalGiven;
                                              if (newDue > 0) return <div className="mt-1 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl text-center"><p className="text-xs text-orange-400 font-bold">₹{newDue} will be added to Khata (Due)</p></div>;
                                              if (newDue < 0) return <div className="mt-1 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center"><p className="text-xs text-emerald-400 font-bold">₹{Math.abs(newDue)} Advance / Change to return</p></div>;
                                              return <div className="mt-1 p-3 bg-gray-800/30 border border-gray-700 rounded-xl text-center"><p className="text-xs text-gray-500 font-bold">Bill Settled Fully</p></div>;
                                          })()}
                                       </div>
                                    </div>
                                 ) : (
                                    <div className="mt-4">
                                      <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Payment Method</label>
                                      <select className="w-full mt-1 p-3 text-sm bg-[#0B0E14] rounded-xl border border-[#2D3748] outline-none" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                                          <option>Cash</option><option>UPI</option><option>Split Payment</option>
                                      </select>
                                      {payMethod === 'Split Payment' && (
                                        <div className="p-3 mt-2 bg-[#1A2235] rounded-xl border border-[#00D0FF]/50 text-sm">
                                          <input type="number" className="w-full p-2 bg-[#0B0E14] rounded-lg outline-none font-bold" placeholder="Cash Amount" value={splitCash || ''} onChange={e => setSplitCash(Number(e.target.value))} />
                                          <p className="text-[10px] text-gray-400 mt-2">Remaining ₹{(Number(manualTotal) - splitCash)} will be marked UPI.</p>
                                        </div>
                                      )}
                                    </div>
                                 )}
                             </div>
                             
                             <button onClick={handleCheckout} disabled={isProcessing || (useMembership && !selectedMemberId)} className="w-full bg-[#EF4444] text-white py-3.5 rounded-xl font-black text-sm disabled:opacity-50 hover:bg-red-600 transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                               {isProcessing ? 'Processing...' : 'Confirm & Close'}
                             </button>
                           </div>
                         );
                      })()}
                      
                      {/* OTHER MODALS */}
                      {modal.type === 'checkin' && (
                        <div className="space-y-4">
                          {modal.hasActive ? (
                            <div className="bg-yellow-500/10 text-yellow-500 p-3 rounded-xl text-sm font-bold mb-4 text-center border border-yellow-500/20">System is currently Active. Creating a future reservation.</div>
                          ) : (
                            <div className="flex bg-[#0B0E14] rounded-xl p-1 border border-[#2D3748] mb-4">
                               <button type="button" onClick={() => setIsBookingMode(false)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!isBookingMode ? 'bg-[#00D0FF]/20 text-[#00D0FF]' : 'text-gray-500 hover:text-white'}`}>Walk-In Now</button>
                               <button type="button" onClick={() => setIsBookingMode(true)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${isBookingMode ? 'bg-yellow-500/20 text-yellow-500' : 'text-gray-500 hover:text-white'}`}>Reserve for Later</button>
                            </div>
                          )}
                          
                          <input className="w-full bg-[#0B0E14] p-3 text-sm rounded-xl border border-[#2D3748] focus:border-[#00D0FF] outline-none" placeholder={(isBookingMode || modal.hasActive) ? "Gamer Name (Required)" : "Gamer Name"} value={name} onChange={e => setName(e.target.value)} autoFocus/>
                          
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

                      {modal.type === 'misc_income' && (
                         <div className="space-y-4">
                            <div className="bg-purple-900/20 text-purple-400 p-3 rounded-xl text-xs font-bold mb-2 border border-purple-500/20">
                               Items logged here are excluded from F&B Profit margins.
                            </div>
                            <div>
                               <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Item Description</label>
                               <input type="text" className="w-full bg-[#0B0E14] mt-1 p-3 text-sm rounded-xl border border-[#2D3748] focus:border-[#00D0FF] outline-none" placeholder="e.g., Game CD" value={miscDesc} onChange={e => setMiscDesc(e.target.value)} />
                            </div>
                            <div>
                               <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Sale Amount</label>
                               <div className="flex items-center bg-[#0B0E14] mt-1 p-2 rounded-xl border border-[#2D3748] focus-within:border-[#00D0FF]">
                                   <div className="px-3 text-[#00D0FF]"><IndianRupee size={18}/></div>
                                   <input type="number" className="bg-transparent w-full font-black text-2xl outline-none text-white py-1" value={miscAmount} onChange={e => setMiscAmount(e.target.value)} />
                               </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Payment Method</label>
                              <select className="w-full mt-1 p-3 text-sm bg-[#0B0E14] rounded-xl border border-[#2D3748] outline-none" value={miscPayMethod} onChange={e => setMiscPayMethod(e.target.value)}>
                                  <option>Cash</option><option>UPI</option><option>Split Payment</option>
                              </select>
                            </div>
                            {miscPayMethod === 'Split Payment' && (
                              <div className="p-3 bg-[#1A2235] rounded-xl border border-[#00D0FF]/50 text-sm">
                                <input type="number" className="w-full p-2 bg-[#0B0E14] rounded-lg outline-none font-bold" placeholder="Cash Amount" onChange={e => setMiscSplitCash(Number(e.target.value))} />
                                <p className="text-[10px] text-gray-400 mt-2">Remaining ₹{(Number(miscAmount) - miscSplitCash)} will be marked UPI.</p>
                              </div>
                            )}
                            <div className="pt-4 border-t border-[#1E293B]">
                               <button onClick={handleAddMiscIncome} disabled={isProcessing || !miscAmount || !miscDesc} className="w-full bg-purple-500 text-white py-3.5 rounded-xl font-black text-sm hover:bg-purple-400 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                                 Log Income
                               </button>
                            </div>
                         </div>
                      )}

                      {modal.type === 'close_day' && (() => {
                          const cleanFnbProfit = Math.round(modal.fnbProfit);
                          const finalTotal = modal.eodCash + modal.eodUPI - modal.fnbRev + cleanFnbProfit;
                          
                          let reportText = `Today's income - ${getFormattedDateForReport()}\n\n`;
                          reportText += `a. Cash - ${formatINR(modal.eodCash)}\n`;
                          reportText += `b. UPI -  ${formatINR(modal.eodUPI)}\n`;
                          reportText += `c. F&B sale - ${formatINR(modal.fnbRev)}\n`;
                          reportText += `d. F&B profit- ${formatINR(cleanFnbProfit)}\n`;
                          if (modal.miscRev > 0) reportText += `e. Retail/Misc - ${formatINR(modal.miscRev)}\n`;
                          
                          reportText += `\n${modal.miscRev > 0 ? 'A+B-C+D(Misc)' : 'A+B-C+D'} = Total Net - ${formatINR(finalTotal)}\n\n`;
                          reportText += `Breakup:\n`;
                          reportText += `PS5- ${formatINR(modal.ps5Rev)}\n`;
                          reportText += `PC- ${formatINR(modal.pcRev)}\n`;
                          reportText += `SIM- ${formatINR(modal.simRev)}`;

                          return (
                            <div className="space-y-4">
                               <div className="bg-[#0B0E14] border border-[#2D3748] p-4 sm:p-5 rounded-2xl font-mono text-xs sm:text-sm text-gray-300 whitespace-pre-wrap break-words">
                                  {reportText}
                               </div>

                               <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-2">
                                 <button onClick={() => setModal(null)} className="w-full bg-[#1A2235] text-gray-400 border border-[#2D3748] py-3.5 sm:py-4 rounded-xl font-bold hover:text-white transition-all text-xs sm:text-sm">Dismiss</button>
                                 <button onClick={() => { navigator.clipboard.writeText(reportText); alert("Report copied to clipboard!"); }} className="w-full bg-white text-black py-3.5 sm:py-4 rounded-xl font-black hover:bg-gray-200 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm">
                                   <Copy size={16}/> Copy Report
                                 </button>
                               </div>
                            </div>
                          );
                      })()}

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

                      {modal.type === 'edit_setup' && (
                        <div className="space-y-4">
                          <div className="bg-red-900/20 text-red-400 p-3 rounded-xl text-xs font-bold mb-2 border border-red-500/20">
                             Use this only to correct setup mistakes. This will recalculate the entire bill based on these new values.
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Player Name</label>
                            <input className="w-full bg-[#0B0E14] mt-1 p-3 text-sm rounded-xl border border-[#2D3748] focus:border-[#00D0FF] outline-none" value={editName} onChange={e => setEditName(e.target.value)} />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Total Duration</label>
                              <div className="flex justify-between items-center bg-[#0B0E14] mt-1 p-2 rounded-xl border border-[#2D3748]">
                                <button onClick={() => setDur(Math.max(0.5, dur - 0.5))} className="p-1 hover:text-[#00D0FF]"><Minus size={16}/></button>
                                <span className="font-bold text-sm">{dur} Hrs</span>
                                <button onClick={() => setDur(dur + 0.5)} className="p-1 hover:text-[#00D0FF]"><Plus size={16}/></button>
                              </div>
                            </div>
                            
                            {modal.sys.type === 'PS5' && (
                              <div>
                                <label className="text-[10px] text-[#00D0FF] font-bold uppercase ml-1">Extra Controllers</label>
                                <div className="flex justify-between items-center bg-[#0B0E14] mt-1 p-2 rounded-xl border border-[#2D3748]">
                                  <button onClick={() => setExtra(Math.max(0, extra - 1))} className="p-1 hover:text-[#00D0FF]"><Minus size={16}/></button>
                                  <span className="font-bold text-sm">{extra} Extra</span>
                                  <button onClick={() => setExtra(Math.min(3, extra + 1))} className="p-1 hover:text-[#00D0FF]"><Plus size={16}/></button>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="pt-4 border-t border-[#1E293B]">
                            <div className="flex justify-between text-gray-400 mb-3 text-sm">
                              <span>Recalculated Cost:</span>
                              <span className="font-black text-[#00D0FF] text-lg">₹{getPrice(modal.sys.type, dur, extra)}</span>
                            </div>
                            <button onClick={handleEditSetup} disabled={isProcessing || !editName} className="w-full bg-[#00D0FF] text-black py-3.5 rounded-xl font-black text-sm disabled:opacity-50 hover:bg-white transition-all shadow-[0_0_15px_rgba(0,208,255,0.2)]">Save Corrections</button>
                          </div>
                        </div>
                      )}

                      {modal.type === 'extend' && (() => {
                         const currentExtra = getExtraFromTotal(modal.sys.type, modal.session.duration, Number(modal.session.total));
                         const isHybrid = Number(modal.session.total) !== getPrice(modal.sys.type, modal.session.duration, currentExtra);
                         
                         let addedCostPreview = 0;
                         if (extendDur < 0) {
                             const normalOld = getPrice(modal.sys.type, modal.session.duration, editExtra);
                             const normalNew = getPrice(modal.sys.type, modal.session.duration + extendDur, editExtra);
                             addedCostPreview = normalNew - normalOld;
                         } else if (isHybrid || (modal.sys.type === 'PS5' && editExtra !== currentExtra)) {
                             addedCostPreview = getPrice(modal.sys.type, extendDur, editExtra);
                         } else {
                             addedCostPreview = getPrice(modal.sys.type, modal.session.duration + extendDur, editExtra) - Number(modal.session.total);
                         }
                             
                         const projectedTotal = Number(modal.session.total) + addedCostPreview;
                         const minAllowedExtend = -(modal.session.duration - 0.5);

                         return (
                            <div className="space-y-4">
                              <div className="bg-[#0B0E14] p-4 rounded-xl border border-[#2D3748] space-y-2 text-sm text-center">
                                <p className="text-gray-400">Current Duration: <span className="text-white font-bold">{modal.session.duration} Hrs</span></p>
                                <p className="text-gray-400">Current Game Cost: <span className="text-white font-bold">₹{Number(modal.session.total)}</span></p>
                              </div>
                              <div>
                                <label className="text-[10px] text-[#00D0FF] font-bold uppercase ml-1">Add / Reduce Time</label>
                                <div className="flex justify-between items-center bg-[#0B0E14] mt-1 p-2 rounded-xl border border-[#2D3748]">
                                  <button onClick={() => setExtendDur(Math.max(minAllowedExtend, extendDur - 0.5))} className="p-1.5 hover:text-[#00D0FF]"><Minus size={18}/></button>
                                  <span className="font-bold text-sm">{extendDur > 0 ? '+' : ''}{extendDur} Hrs</span>
                                  <button onClick={() => setExtendDur(extendDur + 0.5)} className="p-1.5 hover:text-[#00D0FF]"><Plus size={18}/></button>
                                </div>
                              </div>
                              
                              {modal.sys.type === 'PS5' && (
                                <div>
                                  <label className="text-[10px] text-[#00D0FF] font-bold uppercase ml-1">Controllers During This Time</label>
                                  <div className="flex justify-between items-center bg-[#0B0E14] mt-1 p-2 rounded-xl border border-[#2D3748]">
                                    <button onClick={() => setEditExtra(Math.max(0, editExtra - 1))} className="p-1.5 hover:text-[#00D0FF]"><Minus size={18}/></button>
                                    <span className="font-bold text-sm">{editExtra} Extra</span>
                                    <button onClick={() => setEditExtra(Math.min(3, editExtra + 1))} className="p-1.5 hover:text-[#00D0FF]"><Plus size={18}/></button>
                                  </div>
                                </div>
                              )}

                              <div className="pt-4 border-t border-[#1E293B]">
                                <div className="flex justify-between text-gray-400 mb-1 text-sm">
                                  <span>{addedCostPreview >= 0 ? 'Cost for Extension:' : 'Deduction / Refund:'}</span>
                                  <span className={`font-bold text-md ${addedCostPreview >= 0 ? 'text-white' : 'text-orange-400'}`}>
                                    {addedCostPreview >= 0 ? '+' : '-'} ₹{Math.abs(addedCostPreview)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-gray-400 mb-3 text-sm">
                                  <span>New Total Cost:</span>
                                  <span className="font-black text-[#00D0FF] text-lg">
                                    ₹{projectedTotal}
                                  </span>
                                </div>
                                <button onClick={handleExtend} disabled={isProcessing || extendDur === 0} className="w-full bg-[#00D0FF] text-black py-3.5 rounded-xl font-black text-sm disabled:opacity-50 hover:bg-white transition-all shadow-[0_0_15px_rgba(0,208,255,0.2)]">
                                  {extendDur >= 0 ? 'Confirm Extension' : 'Confirm Reduction'}
                                </button>
                              </div>
                            </div>
                         );
                      })()}

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
                                
                                {SYSTEMS.find(x => x.id === transferTargetSysId)?.type === 'PS5' && (
                                  <div>
                                    <label className="text-[10px] text-[#00D0FF] font-bold uppercase ml-1">Extra Controllers</label>
                                    <div className="flex justify-between items-center bg-[#0B0E14] mt-1 p-2 rounded-xl border border-[#2D3748]">
                                      <button onClick={() => setMigrateExtra(Math.max(0, migrateExtra - 1))} className="p-1"><Minus size={16}/></button>
                                      <span className="font-bold text-sm">{migrateExtra} Extra</span>
                                      <button onClick={() => setMigrateExtra(Math.min(3, migrateExtra + 1))} className="p-1"><Plus size={16}/></button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          <button onClick={handleTransferConfirm} disabled={!transferTargetSysId || isProcessing} className="w-full bg-[#00D0FF] text-black py-3.5 rounded-xl font-black text-sm hover:bg-white transition-all shadow-[0_0_15px_rgba(0,208,255,0.2)]">Confirm Transfer</button>
                        </div>
                      )}
                   </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}