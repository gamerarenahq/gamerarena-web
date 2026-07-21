'use client'

import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Plus, Minus, Package, X, Trash2, Monitor, Edit3, AlertCircle, BarChart3, Building2 } from 'lucide-react';

export default function InventoryManager() {
  // Inventory State
  const [inventory, setInventory] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCostPrice, setNewCostPrice] = useState('');
  const [newSellingPrice, setNewSellingPrice] = useState('');
  const [newStockLevel, setNewStockLevel] = useState<number | string>('');

  // Daily Ledger State
  const [todaySessions, setTodaySessions] = useState<any[]>([]);
  const [editingSession, setEditingSession] = useState<any>(null);

  useEffect(() => {
    fetchInventoryAndStats();
  }, []);

  async function fetchInventoryAndStats() {
    // 1. Fetch Inventory
    const { data: invData } = await supabase.from('inventory').select('*');
    if (invData) {
      setInventory(invData);
      const uniqueCats = Array.from(new Set(invData.map(item => item.category))) as string[];
      setCategories(uniqueCats);
      if (uniqueCats.length > 0) {
        if (!activeCategory) setActiveCategory(uniqueCats[0]);
        if (!newCategory) setNewCategory(uniqueCats[0]);
      }
    }

    // 2. Fetch Today's Sessions for the Master Override
    const today = new Date().toLocaleDateString('en-CA');
    const { data: salesData } = await supabase.from('sales').select('*').eq('date', today).order('id', { ascending: false });
    if (salesData) setTodaySessions(salesData);
  }

  const handleUpdateItem = async (id: number, field: string, value: any) => {
    const val = field === 'item_name' || field === 'category' ? value : Number(value);
    setInventory(inventory.map(item => item.id === id ? { ...item, [field]: val } : item));
    await supabase.from('inventory').update({ [field]: val }).eq('id', id);
  };

  const handleStockAdjust = async (id: number, increment: number, currentStock: number) => {
    const newStock = Math.max(0, (currentStock || 0) + increment);
    setInventory(inventory.map(item => item.id === id ? { ...item, stock_level: newStock } : item));
    await supabase.from('inventory').update({ stock_level: newStock }).eq('id', id);
  };

  const handleDeleteItem = async (id: number) => {
    if (window.confirm("Are you sure you want to permanently delete this item?")) {
      setInventory(inventory.filter(item => item.id !== id));
      await supabase.from('inventory').delete().eq('id', id);
    }
  };

  const handleAddItem = async (e: any) => {
    e.preventDefault();
    const { data, error } = await supabase.from('inventory').insert([{
      item_name: newName, category: newCategory, cost_price: Number(newCostPrice),
      selling_price: Number(newSellingPrice), stock_level: newStockLevel !== '' ? Number(newStockLevel) : null,
      min_stock_alert: 5
    }]).select();

    if (!error && data) {
      setInventory([...inventory, data[0]]);
      setNewName(''); setNewCostPrice(''); setNewSellingPrice(''); setNewStockLevel('');
      let updatedCategories = categories;
      if (!categories.includes(newCategory)) {
        updatedCategories = [...categories, newCategory];
        setCategories(updatedCategories);
      }
      setIsAddingNewCategory(false); setNewCategory(updatedCategories[0]);
    }
  };

  const handleSaveSessionEdit = async (e: any) => {
    e.preventDefault();
    const { error } = await supabase.from('sales').update({
      customer: editingSession.customer, system: editingSession.system, status: editingSession.status,
      method: editingSession.method, duration: Number(editingSession.duration), total: Number(editingSession.total), fnb_total: Number(editingSession.fnb_total)
    }).eq('id', editingSession.id);
    if (!error) { setEditingSession(null); fetchInventoryAndStats(); }
  };

  const handleDeleteSession = async (id: number) => {
    if (window.confirm("WARNING: This permanently deletes this session. Continue?")) {
      await supabase.from('sales').delete().eq('id', id); fetchInventoryAndStats();
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#05070A] text-white font-sans overflow-hidden">
      
      {/* 🟢 UNIFIED SIDEBAR */}
      <div className="w-16 bg-[#0B0E14] border-r border-[#1E293B] flex flex-col items-center py-4 shrink-0 z-10 gap-4">
        <a href="/" className="p-3 bg-[#1A2235] text-gray-400 hover:text-[#00D0FF] hover:border-[#00D0FF] border border-[#2D3748] rounded-xl transition-all shadow-sm" title="Live Floor"><Monitor size={20} /></a>
        <div className="p-3 bg-[#00D0FF]/20 text-[#00D0FF] border border-[#00D0FF] rounded-xl transition-all shadow-[0_0_15px_rgba(0,208,255,0.2)]" title="Inventory"><Package size={20} /></div>
        <a href="/vault" className="p-3 bg-[#1A2235] text-gray-400 hover:text-orange-500 hover:border-orange-500 border border-[#2D3748] rounded-xl transition-all shadow-sm" title="Master Vault"><BarChart3 size={20} /></a>
        <a href="/vault/ledger" className="p-3 bg-[#1A2235] text-gray-400 hover:text-emerald-500 hover:border-emerald-500 border border-[#2D3748] rounded-xl transition-all shadow-sm" title="Finance"><Building2 size={20} /></a>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-10"> 
          
          <section className="space-y-6">
            <div className="flex justify-between items-center bg-[#121824] p-6 rounded-2xl border border-[#1E293B]">
              <div>
                <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3"><Package className="text-[#00D0FF]" /> Inventory Manager</h1>
                <p className="text-gray-400 text-sm mt-1">Manage cafe stock and pricing freely.</p>
              </div>
            </div>

            <form onSubmit={handleAddItem} className="bg-[#121824] p-6 rounded-2xl border border-[#1E293B] grid grid-cols-7 gap-4 items-end">
              <div className="col-span-2">
                <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Item Name</label>
                <input required placeholder="e.g., Red Bull" className="w-full bg-[#0B0E14] mt-1 p-3 text-sm rounded-xl border border-[#2D3748] focus:border-[#00D0FF] outline-none" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Category</label>
                {!isAddingNewCategory ? (
                  <select required className="w-full bg-[#0B0E14] mt-1 p-3 text-sm rounded-xl border border-[#2D3748] focus:border-[#00D0FF] outline-none appearance-none" value={newCategory} onChange={e => { if(e.target.value === '__NEW__') setIsAddingNewCategory(true); else setNewCategory(e.target.value); }}>
                    <option value="" disabled>Select Category</option>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    <option value="__NEW__" className="text-[#00D0FF] font-bold">+ Create New</option>
                  </select>
                ) : (
                  <div className="flex items-center mt-1 bg-[#0B0E14] rounded-xl border border-[#2D3748] focus-within:border-[#00D0FF]">
                    <input required autoFocus placeholder="New Category" className="w-full bg-transparent p-3 text-sm outline-none" value={newCategory} onChange={e => setNewCategory(e.target.value)} />
                    <button type="button" onClick={() => setIsAddingNewCategory(false)} className="pr-3 text-gray-500 hover:text-red-500"><X size={16} /></button>
                  </div>
                )}
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Cost (₹)</label>
                <input required type="number" placeholder="0" className="w-full bg-[#0B0E14] mt-1 p-3 text-sm rounded-xl border border-[#2D3748] focus:border-[#00D0FF] outline-none" value={newCostPrice} onChange={e => setNewCostPrice(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Selling (₹)</label>
                <input required type="number" placeholder="0" className="w-full bg-[#0B0E14] mt-1 p-3 text-sm rounded-xl border border-[#2D3748] focus:border-[#00D0FF] outline-none" value={newSellingPrice} onChange={e => setNewSellingPrice(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Stock Qty</label>
                <input type="number" placeholder="Optional" className="w-full bg-[#0B0E14] mt-1 p-3 text-sm rounded-xl border border-[#2D3748] focus:border-[#00D0FF] outline-none" value={newStockLevel} onChange={e => setNewStockLevel(e.target.value)} />
              </div>
              <button type="submit" className="w-full bg-[#00D0FF] text-black p-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-white transition-all"><Plus size={16} /> Add Item</button>
            </form>

            <div className="bg-[#121824] rounded-2xl border border-[#1E293B] overflow-hidden flex flex-col h-[400px]">
              <div className="flex gap-2 p-4 border-b border-[#1E293B] overflow-x-auto bg-[#0B0E14] custom-scrollbar shrink-0">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-[#00D0FF] text-black' : 'bg-[#1A2235] text-gray-400 hover:text-white border border-[#2D3748]'}`}>{cat}</button>
                ))}
              </div>
              <div className="overflow-y-auto flex-1 p-4 custom-scrollbar">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="text-[10px] uppercase text-gray-500 font-bold sticky top-0 bg-[#121824] z-10 shadow-sm">
                    <tr>
                      <th className="pb-3 pl-2">Item Name</th>
                      <th className="pb-3">Purchase (Cost)</th>
                      <th className="pb-3">Selling (Menu)</th>
                      <th className="pb-3 text-right pr-2">Live Stock</th>
                      <th className="pb-3 text-right pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]">
                    {inventory.filter(item => item.category === activeCategory).map(item => (
                      <tr key={item.id} className="hover:bg-[#1A2235]/50 transition-colors group">
                        <td className="py-3 pl-2 font-bold text-white">{item.item_name}</td>
                        <td className="py-3"><input type="number" value={item.cost_price} onChange={(e) => handleUpdateItem(item.id, 'cost_price', e.target.value)} className="bg-transparent w-16 outline-none font-bold text-gray-400" /></td>
                        <td className="py-3"><input type="number" value={item.selling_price} onChange={(e) => handleUpdateItem(item.id, 'selling_price', e.target.value)} className="bg-transparent w-16 outline-none font-bold text-[#00D0FF]" /></td>
                        <td className="py-3 text-right pr-2">
                          {item.stock_level !== null ? (
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleStockAdjust(item.id, -1, item.stock_level)} className="p-1.5 bg-[#1A2235] rounded-lg border border-[#2D3748]"><Minus size={12}/></button>
                              <span className="font-bold w-6">{item.stock_level}</span>
                              <button onClick={() => handleStockAdjust(item.id, 1, item.stock_level)} className="p-1.5 bg-[#1A2235] rounded-lg border border-[#2D3748]"><Plus size={12}/></button>
                            </div>
                          ) : <span className="text-gray-600 text-xs italic">N/A</span>}
                        </td>
                        <td className="py-3 pr-4 text-right"><button onClick={() => handleDeleteItem(item.id)} className="text-gray-600 hover:text-red-500"><Trash2 size={16}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="space-y-6 pt-6 border-t border-[#1E293B]">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black flex items-center gap-3"><Edit3 className="text-orange-500" /> Today's Session Ledger (Master Override)</h2>
                <p className="text-gray-400 text-sm mt-1">Directly edit or delete any session from today.</p>
              </div>
            </div>

            <div className="bg-[#121824] rounded-2xl border border-[#1E293B] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="text-[10px] uppercase text-gray-500 font-bold bg-[#0B0E14] border-b border-[#1E293B]">
                    <tr>
                      <th className="p-4">Customer</th><th className="p-4">System</th><th className="p-4">Status</th>
                      <th className="p-4">Time & Dur</th><th className="p-4">Gaming (₹)</th><th className="p-4">F&B (₹)</th>
                      <th className="p-4">Method</th><th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]">
                    {todaySessions.length === 0 ? (
                      <tr><td colSpan={8} className="p-8 text-center text-gray-500 italic">No sessions recorded today.</td></tr>
                    ) : (
                      todaySessions.map(session => (
                        <tr key={session.id} className="hover:bg-[#1A2235]/30 transition-colors">
                          <td className="p-4 font-bold">{session.customer}</td>
                          <td className="p-4 text-[#00D0FF] font-bold">{session.system}</td>
                          <td className="p-4"><span className="px-2 py-1 rounded-md text-[10px] font-bold bg-gray-800 text-white">{session.status}</span></td>
                          <td className="p-4 text-gray-400">{session.entry_time} ({session.duration}h)</td>
                          <td className="p-4 font-bold">₹{session.total}</td>
                          <td className="p-4 text-gray-400">₹{session.fnb_total || 0}</td>
                          <td className="p-4 text-gray-400">{session.method}</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => setEditingSession({...session})} className="p-2 bg-[#1A2235] text-gray-400 hover:text-[#00D0FF] border border-[#2D3748] rounded-lg transition-all"><Edit3 size={14}/></button>
                              <button onClick={() => handleDeleteSession(session.id)} className="p-2 bg-[#1A2235] text-gray-400 hover:text-red-500 border border-[#2D3748] rounded-lg transition-all"><Trash2 size={14}/></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

        </div>
      </div>

      {editingSession && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveSessionEdit} className="bg-[#121824] p-6 rounded-3xl w-full max-w-lg border border-orange-500/50 shadow-2xl relative">
            <div className="flex justify-between items-center mb-6 border-b border-[#1E293B] pb-4">
              <div><h2 className="text-xl font-black text-white flex items-center gap-2">Master Override <AlertCircle className="text-orange-500" size={18}/></h2></div>
              <button type="button" onClick={() => setEditingSession(null)} className="p-2 bg-[#0B0E14] rounded-full hover:bg-red-500/20 hover:text-red-500 transition-colors"><X size={16}/></button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Customer</label><input required className="w-full bg-[#0B0E14] mt-1 p-3 text-sm rounded-xl border border-[#2D3748] focus:border-orange-500 outline-none" value={editingSession.customer} onChange={e => setEditingSession({...editingSession, customer: e.target.value})} /></div>
              <div><label className="text-[10px] text-gray-500 font-bold uppercase ml-1">System</label><input required className="w-full bg-[#0B0E14] mt-1 p-3 text-sm rounded-xl border border-[#2D3748] focus:border-orange-500 outline-none" value={editingSession.system} onChange={e => setEditingSession({...editingSession, system: e.target.value})} /></div>
              <div><label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Status</label><select required className="w-full bg-[#0B0E14] mt-1 p-3 text-sm rounded-xl border border-[#2D3748] focus:border-orange-500 outline-none" value={editingSession.status} onChange={e => setEditingSession({...editingSession, status: e.target.value})}><option>Active</option><option>Hold</option><option>Reserved</option><option>Completed</option></select></div>
              <div><label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Method</label><input required className="w-full bg-[#0B0E14] mt-1 p-3 text-sm rounded-xl border border-[#2D3748] focus:border-orange-500 outline-none" value={editingSession.method} onChange={e => setEditingSession({...editingSession, method: e.target.value})} /></div>
              <div><label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Duration (Hrs)</label><input required type="number" step="0.5" className="w-full bg-[#0B0E14] mt-1 p-3 text-sm rounded-xl border border-[#2D3748] focus:border-orange-500 outline-none" value={editingSession.duration} onChange={e => setEditingSession({...editingSession, duration: e.target.value})} /></div>
              <div><label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Game Total (₹)</label><input required type="number" className="w-full bg-[#0B0E14] mt-1 p-3 text-sm rounded-xl border border-[#2D3748] focus:border-orange-500 outline-none font-bold" value={editingSession.total} onChange={e => setEditingSession({...editingSession, total: e.target.value})} /></div>
            </div>

            <button type="submit" className="w-full bg-orange-500 text-white mt-6 p-4 rounded-xl font-black text-sm hover:bg-orange-600 transition-all shadow-[0_0_15px_rgba(249,115,22,0.3)]">Force Save Changes</button>
          </form>
        </div>
      )}

    </div>
  );
}