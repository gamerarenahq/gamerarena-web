'use client'

import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Monitor, Package, BarChart3, Lock, CheckCircle2, Copy, X, Wallet, Building2, Pencil, Check, Calendar, Gamepad2, Users, Clock, IndianRupee, MessageCircle, ArrowDownToLine, ArrowUpFromLine, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';

function formatINR(num: number) { return Math.round(num || 0).toLocaleString('en-IN'); }

// Pure number extractor
function extractNumber(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^0-9.-]+/g, "");
  return cleaned ? parseFloat(cleaned) : 0;
}

// Helper to avoid timezone drift
const toLocalISOString = (date: Date) => {
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

export default function MasterVault() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  
  // Data States
  const [salesData, setSalesData] = useState<any[]>([]);
  const [cafeData, setCafeData] = useState<any[]>([]);
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [rawExpenses, setRawExpenses] = useState<any[]>([]);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  
  // Filter States
  const [timeFilter, setTimeFilter] = useState('Lifetime');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [leaderboardSort, setLeaderboardSort] = useState<'spend' | 'time'>('spend');
  const [dailyReportSortAsc, setDailyReportSortAsc] = useState(false);

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
    const expenses = await fetchAllRows('expenses');
    const inv = await fetchAllRows('inventory');
    
    const { data: ledger } = await supabase.from('daily_ledger').select('*').order('date', { ascending: false });
    
    if (sales) setSalesData(sales);
    if (cafe) setCafeData(cafe);
    if (expenses) setRawExpenses(expenses);
    if (ledger) setLedgerData(ledger);
    if (inv) setInventoryData(inv);
    
    setIsDataLoading(false);
  }

  const saveBankBalance = (newVal: number) => { setBankBalance(newVal); localStorage.setItem('gamerarena_bank', newVal.toString()); };
  const saveCashAtHome = (newVal: number) => { setCashAtHome(newVal); localStorage.setItem('gamerarena_cash', newVal.toString()); };

  // 🟢 STRICT CALENDAR DATE ENGINE (Mon-Sun, 1st-End)
  const now = new Date();
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
  const [year, month, day] = todayStr.split('-').map(Number);
  const localToday = new Date(year, month - 1, day);

  const dayOfWeek = localToday.getDay(); 
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const thisMonday = new Date(localToday);
  thisMonday.setDate(localToday.getDate() - daysSinceMonday);
  const thisMondayStr = toLocalISOString(thisMonday);

  const thisSunday = new Date(thisMonday);
  thisSunday.setDate(thisMonday.getDate() + 6);
  const thisSundayStr = toLocalISOString(thisSunday);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const lastMondayStr = toLocalISOString(lastMonday);

  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  const lastSundayStr = toLocalISOString(lastSunday);

  const thisMonthPrefix = todayStr.substring(0, 7);
  const lastMonthDate = new Date(year, month - 2, 1);
  const lastMonthPrefix = toLocalISOString(lastMonthDate).substring(0, 7);

  const yesterdayDate = new Date(localToday);
  yesterdayDate.setDate(localToday.getDate() - 1);
  const yesterdayStr = toLocalISOString(yesterdayDate);

  const filterByDate = (items: any[]) => {
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
        case 'This Week': return itemDateStr >= thisMondayStr && itemDateStr <= thisSundayStr;
        case 'Last Week': return itemDateStr >= lastMondayStr && itemDateStr <= lastSundayStr;
        case 'This Month': return itemDateStr.startsWith(thisMonthPrefix);
        case 'Last Month': return itemDateStr.startsWith(lastMonthPrefix);
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
       const rawDateStr = s.date ? String(s.date).trim() : (s.created_at ? String(s.created_at).split('T')[0] : '');
       const isLegacyData = rawDateStr < '2026-07-18';
       
       const rawTotal = extractNumber(s.total || s.amount || s.total_amount || 0);
       const fnbCostRaw = extractNumber(s.fnb_total || 0);
       
       let gameCostRaw = 0;
       let grandTotalRaw = 0;
       
       if (isLegacyData) {
           gameCostRaw = Math.max(0, rawTotal - fnbCostRaw);
           grandTotalRaw = rawTotal;
       } else {
           gameCostRaw = rawTotal;
           grandTotalRaw = rawTotal + fnbCostRaw;
       }
       
       const gameCost = Math.round(gameCostRaw / 10) * 10;
       const grandTotal = Math.round(grandTotalRaw / 10) * 10;

       const sysName = String(s.system || s.system_type || '').toUpperCase();
       if (sysName.includes('PC')) pcRev += gameCost;
       else if (sysName.includes('PS')) ps5Rev += gameCost;
       else if (sysName.includes('SIM')) simRev += gameCost;
       else ps5Rev += gameCost;

       let mRaw = String(s.method || '').trim();
       let m = mRaw;
       if (mRaw.startsWith('Member[')) {
           const parts = mRaw.split('|');
           m = parts.length > 1 ? parts[1].trim() : 'Cash';
       }

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

  // -------------------------------------------------------------
  // KPI ENGINE
  // -------------------------------------------------------------
  const filteredSales = filterByDate(salesData);
  const filteredCafe = filterByDate(cafeData);

  let gamingRev = 0, fnbRev = 0, fnbProfit = 0, miscRev = 0;
  let pcRev = 0, ps5Rev = 0, simRev = 0;
  
  let memPS5Rev = 0, memPCRev = 0, memSimRev = 0, totalMemRev = 0;
  
  filteredSales.forEach(s => {
    const rawDateStr = s.date ? String(s.date).trim() : (s.created_at ? String(s.created_at).split('T')[0] : '');
    const isLegacyData = rawDateStr < '2026-07-18';
    
    const rawTotal = extractNumber(s.total || s.amount || s.total_amount || 0);
    const fnbCost = extractNumber(s.fnb_total || 0);
    
    let gameCost = 0;
    if (isLegacyData) {
        gameCost = Math.max(0, rawTotal - fnbCost); 
    } else {
        gameCost = rawTotal; 
    }
    
    gamingRev += gameCost;
    fnbRev += fnbCost; 
    
    const sysName = String(s.system || s.system_type || s.console || s.type || '').toUpperCase();
    if (sysName.includes('PC')) pcRev += gameCost;
    else if (sysName.includes('PS')) ps5Rev += gameCost;
    else if (sysName.includes('SIM')) simRev += gameCost;
    else ps5Rev += gameCost; 
  });

  filteredCafe.forEach(c => {
    const rev = extractNumber(c.total_revenue || c.total || c.amount || 0);
    const cost = extractNumber(c.total_cost || 0);
    const prof = extractNumber(c.profit || 0) || (rev - cost);
    
    const itemsStr = String(c.items || '');
    const isRetail = itemsStr.includes('[Retail]');
    
    if (!isRetail && c.category !== 'Retail' && c.category !== 'Merch') {
       fnbProfit += prof;
    }

    const method = String(c.method || c.payment_method || '').trim().toLowerCase();
    if (method !== 'tab') {
       if (isRetail || c.category === 'Retail' || c.category === 'Merch') {
          miscRev += rev;
          
          if (itemsStr.includes('PS5 Membership')) { memPS5Rev += rev; totalMemRev += rev; }
          else if (itemsStr.includes('PC Membership')) { memPCRev += rev; totalMemRev += rev; }
          else if (itemsStr.includes('Racing Sim Membership')) { memSimRev += rev; totalMemRev += rev; }
       } else {
          fnbRev += rev;
       }
    }
  });

  pcRev += memPCRev;
  ps5Rev += memPS5Rev;
  simRev += memSimRev;

  const totalRev = gamingRev + fnbRev + miscRev;
  const pcPct = totalRev > 0 ? (pcRev / totalRev) * 100 : 0;
  const ps5Pct = totalRev > 0 ? (ps5Rev / totalRev) * 100 : 0;
  const simPct = totalRev > 0 ? (simRev / totalRev) * 100 : 0;

  const customerMap: Record<string, { name: string; spent: number; time: number }> = {};
  
  filteredSales.forEach(s => {
     const name = s.customer_name || s.customer || s.name || 'Guest User';
     if (!customerMap[name]) customerMap[name] = { name, spent: 0, time: 0 };
     
     const rawDateStr = s.date ? String(s.date).trim() : (s.created_at ? String(s.created_at).split('T')[0] : '');
     const isLegacyData = rawDateStr < '2026-07-18';
     
     const rawTotal = extractNumber(s.total || s.amount || s.total_amount || 0);
     const fnbCost = extractNumber(s.fnb_total || 0);
     
     let grandTotal = 0;
     if (isLegacyData) {
         grandTotal = rawTotal; 
     } else {
         grandTotal = rawTotal + fnbCost; 
     }
     
     customerMap[name].spent += grandTotal;
     customerMap[name].time += extractNumber(s.duration || s.hours || 0);
  });
  
  const leaderboard = Object.values(customerMap)
    .sort((a, b) => leaderboardSort === 'spend' ? b.spent - a.spent : b.time - a.time)
    .slice(0, 20);

  // -------------------------------------------------------------
  // MASTER MONTH-OVER-MONTH ENGINE (Strict Calendar Month)
  // -------------------------------------------------------------
  const monthsMap: Record<string, any> = {};

  const getMonthStr = (dbDate: any, createdAt: any) => {
    let d = dbDate ? String(dbDate).trim() : (createdAt ? String(createdAt).split('T')[0] : '');
    if (!d) return 'Unknown';
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.substring(0, 7);
    try { const dateObj = new Date(d); if (!isNaN(dateObj.getTime())) return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`; } catch (e) {}
    return d.substring(0, 7); 
  };

  const initMoMMonth = (m: string) => {
    if (!monthsMap[m]) monthsMap[m] = { month: m, rev: 0, exp: 0, profit: 0 };
  };

  salesData.forEach(s => {
     if (s.status === 'Active' || s.status === 'Reserved' || s.status === 'Hold' || s.status === 'Pending') return;
     const m = getMonthStr(s.date, s.created_at);
     if (m === 'Unknown') return;
     initMoMMonth(m);

     const rawDateStr = s.date ? String(s.date).trim() : (s.created_at ? String(s.created_at).split('T')[0] : '');
     const isLegacyData = rawDateStr < '2026-07-18';
     const rawTotal = extractNumber(s.total || s.amount || s.total_amount || 0);
     const fnbAmt = extractNumber(s.fnb_total || 0);
     const grandTotal = isLegacyData ? rawTotal : rawTotal + fnbAmt;
     
     monthsMap[m].rev += grandTotal;
  });

  cafeData.forEach(c => {
     const method = String(c.method || c.payment_method || '').trim().toLowerCase();
     if (method !== 'tab') {
         const m = getMonthStr(c.date, c.created_at);
         if (m === 'Unknown') return;
         initMoMMonth(m);
         monthsMap[m].rev += extractNumber(c.total_revenue || c.total || c.amount || 0);
     }
  });

  rawExpenses.forEach(e => {
     const m = getMonthStr(e.expense_date, e.created_at);
     if (m === 'Unknown') return;
     initMoMMonth(m);
     
     if (e.status === 'Paid' && !['Bank Deposit', 'Capital / Opening Balance'].includes(e.category)) {
         monthsMap[m].exp += extractNumber(e.amount);
     }
  });

  const momArray = Object.values(monthsMap).sort((a: any, b: any) => a.month.localeCompare(b.month));
  
  for (let i = 0; i < momArray.length; i++) {
     momArray[i].profit = momArray[i].rev - momArray[i].exp;
     if (i === 0) {
         momArray[i].growth = 0;
     } else {
         const prevRev = momArray[i - 1].rev;
         if (prevRev === 0) momArray[i].growth = (momArray[i].rev > 0 ? 100 : 0);
         else momArray[i].growth = ((momArray[i].rev - prevRev) / prevRev) * 100;
     }
  }

  const displayMoM = momArray.reverse(); 

  // -------------------------------------------------------------
  // MASTER DAILY REPORT EXCEL ENGINE 
  // -------------------------------------------------------------
  const masterDailyMap: Record<string, any> = {};

  const initMasterDay = (d: string) => {
     if (!masterDailyMap[d]) masterDailyMap[d] = { date: d, total: 0, cash: 0, upi: 0, fnbRev: 0, fnbProfit: 0, miscRev: 0, expenses: 0 };
  };

  const getStrictDayStr = (primaryDate: any, backupDate: any) => {
     let val = primaryDate ? String(primaryDate).trim() : (backupDate ? String(backupDate).trim() : '');
     if (!val) return 'Unknown';
     return val.split('T')[0].split(' ')[0]; 
  };

  let currentWeekRev = 0;
  let prevWeekRev = 0;

  salesData.forEach(s => {
     if (s.status === 'Active' || s.status === 'Reserved' || s.status === 'Hold' || s.status === 'Pending') return;
     
     const d = getStrictDayStr(s.date, s.created_at);
     if (d === 'Unknown') return;
     initMasterDay(d);

     const isLegacyData = d < '2026-07-18';
     const rawTotal = extractNumber(s.total || s.amount || s.total_amount || 0);
     const fnbAmt = extractNumber(s.fnb_total || 0);
     const grandTotal = isLegacyData ? rawTotal : rawTotal + fnbAmt;
     
     masterDailyMap[d].total += grandTotal;
     masterDailyMap[d].fnbRev += fnbAmt;

     let mRaw = String(s.method || '').trim();
     let m = mRaw;
     if (mRaw.startsWith('Member[')) {
         const parts = mRaw.split('|');
         m = parts.length > 1 ? parts[1].trim() : 'Cash';
     }

     if (m.startsWith('Split|')) {
        const parts = m.split('|');
        masterDailyMap[d].cash += Number(parts[1] || 0);
        masterDailyMap[d].upi += Number(parts[2] || 0);
     } else if (m === 'Cash') {
        masterDailyMap[d].cash += grandTotal;
     } else if (m === 'UPI') {
        masterDailyMap[d].upi += grandTotal;
     }
  });

  cafeData.forEach(c => {
     const d = getStrictDayStr(c.date, c.created_at);
     if (d === 'Unknown') return;
     initMasterDay(d);
     
     const method = String(c.method || c.payment_method || '').trim().toLowerCase();
     const rev = extractNumber(c.total_revenue || c.total || c.amount || 0);
     const cost = extractNumber(c.total_cost || 0);
     const prof = extractNumber(c.profit || 0) || (rev - cost);
     
     const isRetail = String(c.items || '').includes('[Retail]');
     
     if (!isRetail && c.category !== 'Retail' && c.category !== 'Merch') {
        masterDailyMap[d].fnbProfit += prof;
     }

     if (method !== 'tab') {
         if (isRetail || c.category === 'Retail' || c.category === 'Merch') {
             masterDailyMap[d].miscRev += rev;
         } else {
             masterDailyMap[d].fnbRev += rev;
         }
         masterDailyMap[d].total += rev;

         const m = String(c.method || c.payment_method || '').trim();
         if (m.startsWith('Split|')) {
            const parts = m.split('|');
            masterDailyMap[d].cash += Number(parts[1] || 0);
            masterDailyMap[d].upi += Number(parts[2] || 0);
         } else if (m === 'Cash') {
            masterDailyMap[d].cash += rev;
         } else if (m === 'UPI') {
            masterDailyMap[d].upi += rev;
         }
     }
  });

  rawExpenses.forEach(e => {
     const d = getStrictDayStr(e.expense_date, e.created_at);
     if (d === 'Unknown') return;
     initMasterDay(d);
     
     if (e.status === 'Paid' && !['Bank Deposit', 'Capital / Opening Balance'].includes(e.category)) {
         masterDailyMap[d].expenses += extractNumber(e.amount);
     }
  });

  const masterDailyArray = Object.values(masterDailyMap);
  masterDailyArray.sort((a, b) => dailyReportSortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));

  // 🟢 CALCULATE WoW GROWTH (Strict Mon-Sun)
  masterDailyArray.forEach(row => {
     if (row.date >= thisMondayStr && row.date <= thisSundayStr) {
         currentWeekRev += row.total;
     } else if (row.date >= lastMondayStr && row.date <= lastSundayStr) {
         prevWeekRev += row.total;
     }
  });
  const wowGrowth = prevWeekRev === 0 ? (currentWeekRev > 0 ? 100 : 0) : ((currentWeekRev - prevWeekRev) / prevWeekRev) * 100;

  const currMonthData = displayMoM[0] || { rev: 0, profit: 0, exp: 0, month: 'N/A' };
  const prevMonthData = displayMoM[1] || { rev: 0, profit: 0, exp: 0, month: 'N/A' };
  const momRevGrowth = prevMonthData.rev === 0 ? (currMonthData.rev > 0 ? 100 : 0) : ((currMonthData.rev - prevMonthData.rev) / prevMonthData.rev) * 100;
  
  const maxGraphVal = Math.max(...displayMoM.slice(0, 12).map((m: any) => Math.max(m.rev, m.profit))) || 1;

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

  const displayLedger = ledgerData.filter(row => row.date >= todayStr);

  // MEMBERSHIP STATS CALCULATOR
  let totalMemPS5 = 0; let totalMemPC = 0; let totalMemSim = 0;
  inventoryData.forEach(i => {
     if (i.category === 'Membership - PS5') totalMemPS5 += Number(i.stock_level || 0);
     if (i.category === 'Membership - PC') totalMemPC += Number(i.stock_level || 0);
     if (i.category === 'Membership - Racing Sim') totalMemSim += Number(i.stock_level || 0);
  });

  const handleLogin = async (e: any) => {
    e.preventDefault();
    try {
      const msgBuffer = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      if (hashHex === '5649e4c3a5806740cc07eb9b5ef38e547122ef70ad2014b64ddc8ebd2539c4b0') {
        setIsAuthenticated(true);
      } else {
        alert('Incorrect Password');
      }
    } catch (err) {
      console.error("Auth Error");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-screen bg-[#05070A] text-white items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-[#121824] p-6 sm:p-8 rounded-3xl border border-[#1E293B] shadow-2xl w-full max-w-sm text-center">
            <div className="flex justify-center mb-6"><Lock size={40} className="text-orange-500"/></div>
            <h2 className="text-xl sm:text-2xl font-black mb-6">Master Vault Access</h2>
            <input type="password" placeholder="Enter Vault PIN" className="w-full bg-[#0B0E14] p-4 text-center rounded-xl border border-[#2D3748] focus:border-orange-500 outline-none font-bold tracking-widest mb-4" value={password} onChange={e => setPassword(e.target.value)} />
            <button type="submit" className="w-full bg-orange-500 text-black py-4 rounded-xl font-black hover:bg-white transition-all">Unlock Vault</button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-[#05070A] text-white font-sans overflow-hidden">
      
      {/* 🟢 UNIFIED DESKTOP SIDEBAR */}
      <div className="hidden md:flex w-16 bg-[#0B0E14] border-r border-[#1E293B] flex-col items-center py-4 shrink-0 z-10 gap-4">
        <a href="/" className="p-3 bg-[#1A2235] text-gray-400 hover:text-[#00D0FF] hover:border-[#00D0FF] border border-[#2D3748] rounded-xl transition-all shadow-sm" title="Live Floor"><Monitor size={20} /></a>
        <a href="/vault/inventory" className="p-3 bg-[#1A2235] text-gray-400 hover:text-[#00D0FF] hover:border-[#00D0FF] border border-[#2D3748] rounded-xl transition-all shadow-sm" title="Inventory"><Package size={20} /></a>
        <div className="p-3 bg-orange-500/20 text-orange-500 border border-orange-500 rounded-xl transition-all shadow-[0_0_15px_rgba(249,115,22,0.2)]" title="Master Vault"><BarChart3 size={20} /></div>
        <a href="/vault/ledger" className="p-3 bg-[#1A2235] text-gray-400 hover:text-emerald-500 hover:border-emerald-500 border border-[#2D3748] rounded-xl transition-all shadow-sm" title="Finance"><Building2 size={20} /></a>
      </div>

      {/* 🟢 MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0B0E14] border-t border-[#1E293B] flex items-center justify-around z-40 px-2 shadow-2xl">
        <a href="/" className="p-2.5 bg-[#1A2235] text-gray-400 hover:text-[#00D0FF] rounded-xl border border-[#2D3748]" title="Live Floor"><Monitor size={20} /></a>
        <a href="/vault/inventory" className="p-2.5 bg-[#1A2235] text-gray-400 hover:text-[#00D0FF] rounded-xl border border-[#2D3748]" title="Inventory"><Package size={20} /></a>
        <div className="p-2.5 bg-orange-500/20 text-orange-500 border border-orange-500 rounded-xl transition-all" title="Master Vault"><BarChart3 size={20} /></div>
        <a href="/vault/ledger" className="p-2.5 bg-[#1A2235] text-gray-400 hover:text-emerald-500 rounded-xl border border-[#2D3748]" title="Finance"><Building2 size={20} /></a>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 sm:gap-6">
          
          {/* HEADER & CALENDAR FILTER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
              Master <span className="text-orange-500">Analytics</span>
              {isDataLoading && <span className="text-[10px] text-orange-500 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20 ml-2 animate-pulse">Syncing...</span>}
            </h1>
            
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
               {timeFilter === 'Custom Dates' && (
                  <div className="flex items-center gap-2 bg-[#121824] p-1.5 rounded-xl border border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.1)] w-full sm:w-auto">
                     <input type="date" className="bg-[#0B0E14] text-xs font-bold text-gray-300 p-1.5 rounded-lg border border-[#2D3748] outline-none flex-1 [color-scheme:dark]" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} />
                     <span className="text-xs text-gray-500 font-bold uppercase px-1">To</span>
                     <input type="date" className="bg-[#0B0E14] text-xs font-bold text-gray-300 p-1.5 rounded-lg border border-[#2D3748] outline-none flex-1 [color-scheme:dark]" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} />
                  </div>
               )}
               
               <div className="flex items-center gap-3 bg-[#121824] p-1.5 rounded-xl border border-[#1E293B] w-full sm:w-auto">
                  <Calendar size={16} className="text-gray-400 ml-2"/>
                  <select className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer pr-2 w-full" value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
                    {['Lifetime', 'Today', 'Yesterday', 'This Week', 'Last Week', 'This Month', 'Last Month', 'Custom Dates'].map(t => <option key={t} value={t} className="bg-[#121824]">{t}</option>)}
                  </select>
               </div>
            </div>
          </div>

          {/* 🟢 TOP ROW: BALANCES & MEMBERSHIP LIABILITIES */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
             <div className="bg-[#121824] border border-[#1E293B] rounded-3xl p-5 sm:p-6 relative overflow-hidden group hover:border-orange-500/50 transition-all">
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
                     <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">₹{formatINR(bankBalance)}</span>
                     <button onClick={() => { setTempBank(bankBalance.toString()); setIsEditingBank(true); }} className="mb-1.5 sm:mb-2 text-gray-500 hover:text-orange-500 transition-colors"><Pencil size={16}/></button>
                  </div>
                )}
             </div>

             <div className="bg-[#121824] border border-[#1E293B] rounded-3xl p-5 sm:p-6 relative overflow-hidden group hover:border-emerald-500/50 transition-all">
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
                     <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">₹{formatINR(cashAtHome)}</span>
                     <button onClick={() => { setTempCash(cashAtHome.toString()); setIsEditingCash(true); }} className="mb-1.5 sm:mb-2 text-gray-500 hover:text-emerald-500 transition-colors"><Pencil size={16}/></button>
                  </div>
                )}
             </div>

             <div className="bg-purple-900/10 border border-purple-500/30 rounded-3xl p-5 sm:p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 text-purple-400"><Users size={80}/></div>
                <h3 className="text-[10px] sm:text-xs font-black text-purple-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Users size={14}/> Active Memberships</h3>
                <div className="flex items-end gap-3 mt-2 z-10 relative">
                   <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">{totalMemPS5 + totalMemPC + totalMemSim} <span className="text-lg text-purple-400">Hrs</span></span>
                </div>
                <div className="flex gap-4 mt-3 pt-3 border-t border-purple-500/20 text-[10px] font-bold text-gray-300">
                   <p>PS5: <span className="text-purple-400">{totalMemPS5}</span></p>
                   <p>PC: <span className="text-purple-400">{totalMemPC}</span></p>
                   <p>Sim: <span className="text-purple-400">{totalMemSim}</span></p>
                </div>
             </div>

             <div className="bg-purple-900/10 border border-purple-500/30 rounded-3xl p-5 sm:p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 text-purple-400"><IndianRupee size={80}/></div>
                <h3 className="text-[10px] sm:text-xs font-black text-purple-400 uppercase tracking-widest mb-2 flex items-center gap-2"><IndianRupee size={14}/> Membership Income</h3>
                <div className="flex items-end gap-3 mt-2 z-10 relative">
                   <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">₹{formatINR(totalMemRev)}</span>
                </div>
                <div className="flex gap-4 mt-3 pt-3 border-t border-purple-500/20 text-[10px] font-bold text-gray-300">
                   <p>PS5: <span className="text-purple-400">₹{formatINR(memPS5Rev)}</span></p>
                   <p>PC: <span className="text-purple-400">₹{formatINR(memPCRev)}</span></p>
                   <p>Sim: <span className="text-purple-400">₹{formatINR(memSimRev)}</span></p>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
             <div className="bg-[#0B0E14] border border-[#1E293B] p-4 sm:p-5 rounded-2xl">
               <p className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Revenue</p>
               <p className="text-lg sm:text-xl font-black text-white">₹{formatINR(totalRev)}</p>
             </div>
             <div className="bg-[#0B0E14] border border-[#1E293B] p-4 sm:p-5 rounded-2xl">
               <p className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Pure Gaming</p>
               <p className="text-lg sm:text-xl font-black text-[#00D0FF]">₹{formatINR(gamingRev)}</p>
             </div>
             <div className="bg-[#0B0E14] border border-purple-500/30 p-4 sm:p-5 rounded-2xl">
               <p className="text-[9px] sm:text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-1">Memberships/Misc</p>
               <p className="text-lg sm:text-xl font-black text-purple-400">₹{formatINR(miscRev)}</p>
             </div>
             <div className="bg-[#0B0E14] border border-[#1E293B] p-4 sm:p-5 rounded-2xl">
               <p className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">F&B Revenue</p>
               <p className="text-lg sm:text-xl font-black text-emerald-400">₹{formatINR(fnbRev)}</p>
             </div>
             <div className="bg-[#0B0E14] border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.1)] p-4 sm:p-5 rounded-2xl">
               <p className="text-[9px] sm:text-[10px] text-orange-500 font-bold uppercase tracking-widest mb-1">F&B Profit</p>
               <p className="text-lg sm:text-xl font-black text-orange-400">₹{formatINR(fnbProfit)}</p>
             </div>
             <div className="bg-[#0B0E14] border border-[#1E293B] p-4 sm:p-5 rounded-2xl flex flex-col justify-center">
               <p className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Sessions</p>
               <p className="text-lg sm:text-xl font-black text-white">{filteredSales.length}</p>
             </div>
          </div>

          {/* MAIN DASHBOARD GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-[#121824] border border-[#1E293B] rounded-3xl p-5 sm:p-6 flex flex-col">
               <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 sm:mb-6 flex items-center gap-2"><Gamepad2 size={16}/> System Breakup</h3>
               
               <div className="space-y-4 sm:space-y-6 flex-1">
                 <div>
                   <div className="flex justify-between text-xs sm:text-sm font-bold mb-2"><span>PlayStation 5</span><span className="text-[#00D0FF]">₹{formatINR(ps5Rev)}</span></div>
                   <div className="w-full bg-[#0B0E14] rounded-full h-2.5 sm:h-3 overflow-hidden border border-[#1E293B]">
                     <div className="bg-[#00D0FF] h-full rounded-full transition-all duration-1000" style={{ width: `${ps5Pct}%` }}></div>
                   </div>
                   <p className="text-right text-[10px] text-gray-500 mt-1">{ps5Pct.toFixed(1)}% of Revenue</p>
                 </div>

                 <div>
                   <div className="flex justify-between text-xs sm:text-sm font-bold mb-2"><span>PC Rigs</span><span className="text-purple-400">₹{formatINR(pcRev)}</span></div>
                   <div className="w-full bg-[#0B0E14] rounded-full h-2.5 sm:h-3 overflow-hidden border border-[#1E293B]">
                     <div className="bg-purple-400 h-full rounded-full transition-all duration-1000" style={{ width: `${pcPct}%` }}></div>
                   </div>
                   <p className="text-right text-[10px] text-gray-500 mt-1">{pcPct.toFixed(1)}% of Revenue</p>
                 </div>

                 <div>
                   <div className="flex justify-between text-xs sm:text-sm font-bold mb-2"><span>Racing Sim</span><span className="text-orange-400">₹{formatINR(simRev)}</span></div>
                   <div className="w-full bg-[#0B0E14] rounded-full h-2.5 sm:h-3 overflow-hidden border border-[#1E293B]">
                     <div className="bg-orange-400 h-full rounded-full transition-all duration-1000" style={{ width: `${simPct}%` }}></div>
                   </div>
                   <p className="text-right text-[10px] text-gray-500 mt-1">{simPct.toFixed(1)}% of Revenue</p>
                 </div>
               </div>
            </div>

            <div className="lg:col-span-2 bg-[#121824] border border-[#1E293B] rounded-3xl p-5 sm:p-6 flex flex-col h-[350px] sm:h-[400px]">
               <div className="flex justify-between items-center mb-4 sm:mb-6 shrink-0">
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Users size={16}/> Top Customers</h3>
                  <div className="flex bg-[#0B0E14] rounded-lg p-1 border border-[#1E293B]">
                     <button onClick={() => setLeaderboardSort('spend')} className={`px-2.5 py-1.5 text-[9px] sm:text-[10px] font-bold uppercase rounded-md transition-all flex items-center gap-1 ${leaderboardSort === 'spend' ? 'bg-[#00D0FF]/20 text-[#00D0FF]' : 'text-gray-500 hover:text-white'}`}><IndianRupee size={12}/> Spend</button>
                     <button onClick={() => setLeaderboardSort('time')} className={`px-2.5 py-1.5 text-[9px] sm:text-[10px] font-bold uppercase rounded-md transition-all flex items-center gap-1 ${leaderboardSort === 'time' ? 'bg-orange-500/20 text-orange-500' : 'text-gray-500 hover:text-white'}`}><Clock size={12}/> Time</button>
                  </div>
               </div>
               
               <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 sm:pr-2">
                  <div className="space-y-2">
                     {leaderboard.length === 0 ? (
                        <p className="text-center text-gray-600 text-sm italic py-10">No customer data found for this timeframe.</p>
                     ) : (
                        leaderboard.map((cust, idx) => (
                           <div key={cust.name} className="flex justify-between items-center bg-[#0B0E14] p-2.5 sm:p-3 rounded-xl border border-[#1E293B] hover:border-[#2D3748] transition-colors">
                              <div className="flex items-center gap-2 sm:gap-3">
                                 <div className={`w-5 sm:w-6 text-center text-[10px] font-black ${idx < 3 ? 'text-yellow-500' : 'text-gray-600'}`}>#{idx + 1}</div>
                                 <span className="font-bold text-xs sm:text-sm text-gray-200">{cust.name}</span>
                              </div>
                              <div className="flex gap-4 sm:gap-6 text-right">
                                 <div className="flex flex-col">
                                    <span className="text-[8px] sm:text-[9px] text-gray-500 uppercase font-bold">Hours</span>
                                    <span className={`text-xs sm:text-sm font-black ${leaderboardSort === 'time' ? 'text-orange-400' : 'text-gray-400'}`}>{cust.time}h</span>
                                 </div>
                                 <div className="flex flex-col">
                                    <span className="text-[8px] sm:text-[9px] text-gray-500 uppercase font-bold">Spent</span>
                                    <span className={`text-xs sm:text-sm font-black ${leaderboardSort === 'spend' ? 'text-[#00D0FF]' : 'text-gray-400'}`}>₹{formatINR(cust.spent)}</span>
                                 </div>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               </div>
            </div>
          </div>

          <div className="mt-4 sm:mt-8 bg-[#121824] border border-[#1E293B] rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <div>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                   <MessageCircle className="text-emerald-500" size={18}/> Historical Report Generator
                </h2>
                <p className="text-[10px] sm:text-xs text-gray-500 font-bold mt-1">Pull the exact End-of-Day WhatsApp format for any past date.</p>
             </div>
             <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <input type="date" className="w-full sm:w-auto bg-[#0B0E14] text-xs sm:text-sm font-bold text-white p-3 rounded-xl border border-[#2D3748] outline-none focus:border-emerald-500 [color-scheme:dark]" value={reportDate} onChange={e => setReportDate(e.target.value)} />
                <button onClick={handleOpenReport} className="w-full sm:w-auto bg-[#1A2235] hover:bg-emerald-500 hover:text-black text-emerald-500 border border-emerald-500/30 px-6 py-3 rounded-xl font-black text-sm transition-all shadow-sm shrink-0">
                   Generate Report
                </button>
             </div>
          </div>

          <div className="mt-2 sm:mt-4 mb-4">
             <h2 className="text-base sm:text-lg font-black tracking-tight mb-3 sm:mb-4 text-gray-400">Automated Ledger <span className="text-[10px] sm:text-xs font-normal text-gray-600 ml-1 sm:ml-2">(Showing from Today onwards)</span></h2>
             
             <div className="bg-[#0B0E14] rounded-2xl border border-[#1E293B] overflow-hidden shadow-xl max-h-[400px] flex flex-col">
               <div className="overflow-x-auto custom-scrollbar flex-1">
                 <div className="min-w-[800px]">
                   
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
                        <div className="p-6 text-center text-gray-500 text-sm">No ledger data found. Future "Close Day" submissions will appear here.</div>
                     )}
                   </div>
                 </div>
               </div>
             </div>
          </div>

          {/* 🟢 MASTER DAILY REPORT EXCEL TABLE */}
          <div className="mt-8 sm:mt-12 mb-12">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-3 sm:mb-4">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-gray-400">Master Daily Report <span className="text-[10px] sm:text-xs font-normal text-gray-600 ml-1 sm:ml-2">(Since Inception)</span></h2>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] uppercase font-bold text-gray-500">Sort by Date:</span>
                   <button onClick={() => setDailyReportSortAsc(!dailyReportSortAsc)} className="bg-[#1A2235] hover:bg-[#00D0FF] hover:text-black text-[#00D0FF] border border-[#00D0FF]/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1">
                      {dailyReportSortAsc ? <><ArrowUpFromLine size={12}/> Ascending (Oldest First)</> : <><ArrowDownToLine size={12}/> Descending (Newest First)</>}
                   </button>
                </div>
             </div>

             <div className="bg-[#121824] rounded-xl border border-[#2D3748] overflow-hidden shadow-2xl flex flex-col">
               <div className="overflow-x-auto custom-scrollbar flex-1 max-h-[500px]">
                 <div className="min-w-[900px]">
                   <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap border-collapse">
                      <thead className="bg-yellow-400 text-black font-black tracking-wider sticky top-0 z-20">
                         <tr>
                           <th className="p-3 border border-yellow-500">Date</th>
                           <th className="p-3 border border-yellow-500">Total Income</th>
                           <th className="p-3 border border-yellow-500">Cash</th>
                           <th className="p-3 border border-yellow-500">Upi</th>
                           <th className="p-3 border border-yellow-500">F&B Revenue</th>
                           <th className="p-3 border border-yellow-500">Misc / Memberships</th>
                           <th className="p-3 border border-yellow-500">F&B profit</th>
                           <th className="p-3 border border-yellow-500">Expenses</th>
                         </tr>
                      </thead>
                      <tbody className="bg-[#0B0E14] text-gray-200">
                         {masterDailyArray.map(row => (
                            <tr key={row.date} className="hover:bg-[#1A2235]/60 transition-colors">
                              <td className="p-3 border border-[#2D3748] font-bold text-white bg-[#121824]/50">{row.date}</td>
                              <td className="p-3 border border-[#2D3748] font-black text-[#00D0FF]">₹{formatINR(row.total)}</td>
                              <td className="p-3 border border-[#2D3748] font-bold">₹{formatINR(row.cash)}</td>
                              <td className="p-3 border border-[#2D3748] font-bold">₹{formatINR(row.upi)}</td>
                              <td className="p-3 border border-[#2D3748] text-gray-400">₹{formatINR(row.fnbRev)}</td>
                              <td className="p-3 border border-[#2D3748] text-purple-400 font-bold">₹{formatINR(row.miscRev)}</td>
                              <td className="p-3 border border-[#2D3748] font-black text-orange-400">₹{formatINR(row.fnbProfit)}</td>
                              <td className="p-3 border border-[#2D3748] font-bold text-red-400">₹{formatINR(row.expenses)}</td>
                            </tr>
                         ))}
                         {masterDailyArray.length === 0 && (
                            <tr><td colSpan={8} className="p-6 text-center text-gray-500 italic">No historical data available.</td></tr>
                         )}
                      </tbody>
                   </table>
                 </div>
               </div>
             </div>
          </div>

          {/* 🟢 ADVANCED FINANCIAL ANALYTICS (GRAPH + MoM + WoW) */}
          <div className="mt-8 sm:mt-12 mb-12 bg-[#121824] rounded-3xl border border-[#1E293B] overflow-hidden shadow-2xl">
              <div className="p-5 sm:p-6 border-b border-[#1E293B] flex justify-between items-center bg-[#0B0E14]">
                  <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 sm:gap-3"><BarChart2 className="text-[#00D0FF]" size={20}/> Performance & Growth Analytics</h3>
              </div>
              
              <div className="p-5 sm:p-8">
                  {/* Top KPI row for Growth */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                      <div className="bg-[#0B0E14] border border-[#2D3748] rounded-2xl p-5 relative overflow-hidden group hover:border-[#00D0FF]/50 transition-colors">
                          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">This Week's Revenue</p>
                          <div className="flex items-end gap-3">
                              <p className="text-2xl font-black text-white">₹{formatINR(currentWeekRev)}</p>
                              <span className={`text-xs font-black flex items-center mb-1 ${wowGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {wowGrowth >= 0 ? <TrendingUp size={14} className="mr-1"/> : <TrendingDown size={14} className="mr-1"/>}
                                  {wowGrowth > 0 ? '+' : ''}{wowGrowth.toFixed(1)}% WoW
                              </span>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-2">Mon-Sun vs last week (₹{formatINR(prevWeekRev)})</p>
                      </div>

                      <div className="bg-[#0B0E14] border border-[#2D3748] rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
                          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Current Month Revenue</p>
                          <div className="flex items-end gap-3">
                              <p className="text-2xl font-black text-[#00D0FF]">₹{formatINR(currMonthData.rev)}</p>
                              <span className={`text-xs font-black flex items-center mb-1 ${momRevGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {momRevGrowth >= 0 ? <TrendingUp size={14} className="mr-1"/> : <TrendingDown size={14} className="mr-1"/>}
                                  {momRevGrowth > 0 ? '+' : ''}{momRevGrowth.toFixed(1)}% MoM
                              </span>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-2">Vs {prevMonthData.month} (₹{formatINR(prevMonthData.rev)})</p>
                      </div>

                      <div className="bg-[#0B0E14] border border-[#2D3748] rounded-2xl p-5 relative overflow-hidden group hover:border-orange-500/50 transition-colors">
                          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Current Month Profit</p>
                          <div className="flex items-end gap-3">
                              <p className="text-2xl font-black text-orange-400">₹{formatINR(currMonthData.profit)}</p>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-2">After all logged expenses (₹{formatINR(currMonthData.exp)})</p>
                      </div>
                  </div>

                  {/* The Interactive CSS Graph */}
                  <div className="mb-8">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Revenue vs Profit (Last 12 Months)</h4>
                      
                      <div className="h-48 sm:h-64 flex items-end gap-2 sm:gap-4 border-b border-[#2D3748] pb-1 relative">
                         {displayMoM.slice(0, 12).reverse().map((m: any) => {
                            const revPct = maxGraphVal > 0 ? (m.rev / maxGraphVal) * 100 : 0;
                            const profPct = maxGraphVal > 0 ? (Math.max(0, m.profit) / maxGraphVal) * 100 : 0;
                            return (
                              <div key={m.month} className="flex-1 flex flex-col justify-end items-center h-full group relative">
                                 {/* Hover Tooltip */}
                                 <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute bottom-full mb-2 bg-[#1A2235] border border-[#2D3748] p-2 sm:p-3 rounded-lg text-xs whitespace-nowrap z-20 shadow-2xl transition-all">
                                    <p className="font-black text-white mb-1 border-b border-[#2D3748] pb-1">{m.month}</p>
                                    <p className="text-[#00D0FF] font-bold flex justify-between gap-4"><span>Gross Rev:</span> <span>₹{formatINR(m.rev)}</span></p>
                                    <p className="text-orange-400 font-bold flex justify-between gap-4"><span>Net Profit:</span> <span>₹{formatINR(m.profit)}</span></p>
                                 </div>
                                 
                                 {/* The Bars */}
                                 <div className="w-full flex justify-center items-end gap-0.5 sm:gap-1 h-full">
                                     <div className="w-1/2 max-w-[24px] bg-[#00D0FF] rounded-t-sm hover:bg-white transition-colors relative" style={{ height: `${revPct}%`, minHeight: '4px' }}></div>
                                     <div className="w-1/2 max-w-[24px] bg-orange-500 rounded-t-sm hover:bg-white transition-colors relative" style={{ height: `${profPct}%`, minHeight: '4px' }}></div>
                                 </div>
                              </div>
                            )
                         })}
                      </div>
                      
                      {/* X-Axis Labels */}
                      <div className="flex gap-2 sm:gap-4 mt-2">
                         {displayMoM.slice(0, 12).reverse().map((m: any) => (
                            <div key={m.month} className="flex-1 text-center">
                               <span className="text-[8px] sm:text-[10px] font-bold text-gray-500 block truncate">{m.month.split('-')[1]}/{m.month.split('-')[0].slice(2)}</span>
                            </div>
                         ))}
                      </div>
                      
                      {/* Legend */}
                      <div className="flex justify-center gap-6 mt-6">
                         <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#00D0FF] rounded-sm"></div><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gross Revenue</span></div>
                         <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-500 rounded-sm"></div><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Net Profit</span></div>
                      </div>
                  </div>

                  {/* The Detailed Table */}
                  <div className="overflow-x-auto custom-scrollbar bg-[#0B0E14] rounded-2xl border border-[#1E293B]">
                     <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap min-w-[800px]">
                        <thead className="bg-[#1A2235] text-[9px] sm:text-[10px] uppercase text-gray-400 font-black tracking-wider">
                          <tr>
                            <th className="p-3 sm:p-4 border-r border-[#2D3748]">Month / Year</th>
                            <th className="p-3 sm:p-4 text-[#00D0FF]">Total Revenue</th>
                            <th className="p-3 sm:p-4 text-red-400 border-x border-[#2D3748]">Total Expenses</th>
                            <th className="p-3 sm:p-4 text-white">Net Profit</th>
                            <th className="p-3 sm:p-4 text-right">Growth (Rev %)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1E293B]">
                          {displayMoM.length === 0 ? (
                            <tr><td colSpan={5} className="p-6 sm:p-8 text-center text-gray-500">No monthly data found.</td></tr>
                          ) : (
                            displayMoM.map((row: any, i: number) => (
                              <tr key={i} className="hover:bg-[#1A2235]/50 transition-colors">
                                <td className="p-3 sm:p-4 font-bold border-r border-[#2D3748]">{row.month}</td>
                                <td className="p-3 sm:p-4 font-bold text-[#00D0FF]">₹{formatINR(row.rev)}</td>
                                <td className="p-3 sm:p-4 text-red-400 border-x border-[#2D3748]">₹{formatINR(row.exp)}</td>
                                <td className="p-3 sm:p-4 font-black text-orange-400 text-base">₹{formatINR(row.profit)}</td>
                                <td className="p-3 sm:p-4 text-right">
                                  {row.growth === 0 ? (
                                      <span className="text-gray-500 font-bold">-</span>
                                  ) : row.growth > 0 ? (
                                      <span className="text-emerald-400 font-black flex items-center justify-end gap-1"><TrendingUp size={14}/> +{row.growth.toFixed(1)}%</span>
                                  ) : (
                                      <span className="text-red-400 font-black flex items-center justify-end gap-1"><TrendingDown size={14}/> {row.growth.toFixed(1)}%</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                  </div>
              </div>
          </div>

        </div>
      </div>

      {/* TOUCH-FRIENDLY REPORT MODAL OVERLAY */}
      {reportModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#121824] p-6 sm:p-8 rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto custom-scrollbar border border-[#1E293B] shadow-2xl relative">
             <button onClick={() => setReportModal(null)} className="absolute top-4 sm:top-6 right-4 sm:right-6 text-gray-500 hover:text-white p-2"><X size={20}/></button>
             
             <h2 className="text-xl sm:text-2xl font-black text-white mb-2">Historical Report</h2>
             <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 font-bold">Generated from {reportDate} logs.</p>
             
             <div className="bg-[#0B0E14] border border-[#2D3748] p-4 sm:p-5 rounded-2xl font-mono text-[10px] sm:text-sm text-gray-300 whitespace-pre-wrap mb-6">
                {reportModal}
             </div>

             <div className="grid grid-cols-2 gap-3 sm:gap-4">
               <button onClick={() => setReportModal(null)} className="w-full bg-[#1A2235] text-gray-400 border border-[#2D3748] py-3 sm:py-4 rounded-xl font-bold hover:text-white transition-all text-xs sm:text-sm">Close</button>
               <button onClick={() => { navigator.clipboard.writeText(reportModal); alert("Report copied to clipboard!"); }} className="w-full bg-emerald-500 text-black py-3 sm:py-4 rounded-xl font-black hover:bg-white transition-all flex items-center justify-center gap-2 text-xs sm:text-sm">
                 <Copy size={16}/> Copy
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}