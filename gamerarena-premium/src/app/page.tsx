'use client'

import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { Gamepad2, Monitor, Car, Play, StopCircle, Coffee, X, Edit2 } from 'lucide-react';

const SYSTEMS = [
  { id: 'PC1', type: 'PC', icon: Monitor }, { id: 'PC2', type: 'PC', icon: Monitor },
  { id: 'PS1', type: 'PS5', icon: Gamepad2 }, { id: 'PS2', type: 'PS5', icon: Gamepad2 },
  { id: 'PS3', type: 'PS5', icon: Gamepad2 },
  { id: 'SIM1', type: 'Racing Sim', icon: Car },
];

function getPrice(cat: string, dur: number) {
  const fullHours = Math.floor(dur);
  const halfHours = (dur % 1 !== 0) ? 1 : 0;
  if (cat === "PC") return (fullHours * 100) + (halfHours * 70);
  if (cat === "Racing Sim") return (fullHours * 250) + (halfHours * 150);
  if (cat === "PS5") return (fullHours * 150) + (halfHours * 100);
  return 0;
}

export default function VisualLiveFloor() {
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [pendingFloor, setPendingFloor] = useState(0);

  // Modals
  const [checkInModal, setCheckInModal] = useState<{ open: boolean; sysId: string; type: string } | null>(null);
  const [checkoutModal, setCheckoutModal] = useState<{ open: boolean; session: any } | null>(null);
  const [fnbModal, setFnbModal] = useState<{ open: boolean; session: any } | null>(null);

  // Form States
  const [gamerName, setGamerName] = useState('');
  const [duration, setDuration] = useState(1.0);
  
  // Checkout Edit States
  const [editCheckoutTotal, setEditCheckoutTotal] = useState<number>(0);
  const [payMethod, setPayMethod] = useState('Cash');
  const [splitCash, setSplitCash] = useState<number>(0);

  useEffect(() => {
    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchActiveSessions() {
    const { data, error } = await supabase.from('sales').select('*').eq('status', 'Active');
    if (!error && data) {
      setActiveSessions(data);
      setPendingFloor(data.reduce((sum, s) => sum + (Number(s.total) || 0) + (Number(s.fnb_total) || 0), 0));
    }
  }

  // --- ACTIONS ---
  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInModal) return;
    const price = getPrice(checkInModal.type, duration);
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    await supabase.from('sales').insert({
      customer: gamerName || 'Guest',
      system: checkInModal.sysId,
      duration: duration,
      total: price,
      status: 'Active',
      entry_time: now,
      date: new Date().toLocaleDateString('en-CA'),
      fnb_total: 0
    });
    setCheckInModal(null); setGamerName(''); setDuration(1.0);
    fetchActiveSessions();
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutModal) return;

    let finalMethod = payMethod;
    if (payMethod === 'Split Payment') {
        finalMethod = `Split|${splitCash}|${editCheckoutTotal - splitCash}`;
    }

    // Notice we save the EDITED total back to the database
    await supabase.from('sales').update({ 
      status: 'Completed', 
      method: finalMethod,
      total: editCheckoutTotal - Number(checkoutModal.session.fnb_total) // Separate game from F&B if total was overridden
    }).eq('id', checkoutModal.session.id);
    
    setCheckoutModal(null); setPayMethod('Cash');
    fetchActiveSessions();
  };

  const openCheckout = (session: any) => {
      const calcTotal = Number(session.total) + Number(session.fnb_total || 0);
      setEditCheckoutTotal(calcTotal);
      setSplitCash(calcTotal / 2);
      setCheckoutModal({ open: true, session });
  };

  return (
    <div className="space-y-8 relative p-4">
      {/* HEADER */}
      <div className="flex justify-between items-center bg-[#0B0E14] p-6 rounded-2xl border border-[#1E293B]">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Live Floor</h1>
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-sm font-semibold uppercase">Pending on Floor</p>
          <p className="text-[#FF754C] text-4xl font-black">₹{pendingFloor.toLocaleString()}</p>
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {SYSTEMS.map((sys) => {
          const session = activeSessions.find((s: any) => s.system === sys.id);
          const Icon = sys.icon;
          const isOccupied = !!session;

          return (
            <div key={sys.id} className={`p-6 rounded-2xl border transition-all ${isOccupied ? 'bg-[#121824] border-[#00D0FF]' : 'bg-[#0B0E14] border-[#1E293B]'}`}>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-lg bg-[#1A2235] ${isOccupied ? 'text-[#00D0FF]' : 'text-gray-500'}`}><Icon size={24} /></div>
                  <div>
                    <h3 className="text-xl font-black text-white">{sys.id}</h3>
                    <span className={`text-xs font-bold uppercase ${isOccupied ? 'text-[#00D0FF]' : 'text-gray-500'}`}>{isOccupied ? 'Active' : 'Available'}</span>
                  </div>
                </div>
              </div>

              {isOccupied ? (
                <div className="space-y-4">
                  <div className="bg-[#0B0E14] p-4 rounded-xl border border-[#1E293B]">
                    <p className="text-gray-400 text-sm">{session.customer} • In: {session.entry_time}</p>
                    <p className="text-3xl font-black text-white mt-1">₹{(Number(session.total) + Number(session.fnb_total || 0)).toFixed(0)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openCheckout(session)} className="flex-1 bg-[#00D0FF] hover:bg-[#00BFFF] text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                      <StopCircle size={18} /> Checkout
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center items-center h-[120px]">
                  <button onClick={() => setCheckInModal({ open: true, sysId: sys.id, type: sys.type })} className="bg-[#1A2235] text-white px-6 py-3 rounded-xl font-bold border border-[#2D3748] hover:border-[#00D0FF] flex items-center gap-2">
                    <Play size={18} /> Check In
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* --- MODALS --- */}
      
      {/* CHECK IN MODAL */}
      {checkInModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#121824] border border-[#1E293B] p-6 rounded-2xl w-[400px]">
            <div className="flex justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Check In: {checkInModal.sysId}</h2>
              <button onClick={() => setCheckInModal(null)}><X className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleCheckIn} className="space-y-4">
              <input autoFocus required placeholder="Gamer Name" type="text" value={gamerName} onChange={e => setGamerName(e.target.value)} className="w-full bg-[#1A2235] border border-[#2D3748] rounded-lg p-3 text-white" />
              <input required type="number" step="0.5" min="0.5" value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full bg-[#1A2235] border border-[#2D3748] rounded-lg p-3 text-white" />
              <button type="submit" className="w-full bg-[#00D0FF] text-black font-bold py-3 rounded-lg">Start Session</button>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN CHECKOUT MODAL (Allows Overrides) */}
      {checkoutModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#121824] border border-[#1E293B] p-6 rounded-2xl w-[450px]">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Settle & Close: {checkoutModal.session.system}</h2>
              <button onClick={() => setCheckoutModal(null)}><X className="text-gray-400" /></button>
            </div>
            
            <form onSubmit={handleCheckout} className="space-y-4">
              {/* Manual Override Input */}
              <div className="bg-[#0B0E14] p-4 rounded-xl border border-[#2D3748]">
                <label className="text-gray-400 text-sm flex items-center gap-2 mb-2"><Edit2 size={14}/> Final Amount (Override allowed)</label>
                <div className="flex items-center text-3xl font-black text-white">
                  ₹<input type="number" value={editCheckoutTotal} onChange={e => setEditCheckoutTotal(Number(e.target.value))} className="bg-transparent border-none focus:ring-0 text-3xl font-black w-full ml-1" />
                </div>
                <p className="text-xs text-gray-500 mt-2">Game: ₹{checkoutModal.session.total} | F&B: ₹{checkoutModal.session.fnb_total}</p>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Payment Method</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="w-full bg-[#1A2235] border border-[#2D3748] rounded-lg p-3 text-white">
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Split Payment">Split Payment</option>
                  <option value="Master Tab">Hold on Tab</option>
                </select>
              </div>

              {payMethod === 'Split Payment' && (
                  <div className="bg-[#1A2235] p-3 rounded-lg border border-[#2D3748]">
                      <label className="text-sm text-gray-400">Cash Portion (₹)</label>
                      <input type="number" value={splitCash} onChange={e => setSplitCash(Number(e.target.value))} className="w-full bg-[#0B0E14] text-white p-2 rounded mt-1" />
                      <p className="text-xs text-[#00D0FF] mt-2">UPI Portion: ₹{editCheckoutTotal - splitCash}</p>
                  </div>
              )}

              <button type="submit" className="w-full bg-[#00D0FF] text-black font-bold py-3 rounded-lg mt-4">Confirm & Checkout</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}