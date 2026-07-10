'use client'

import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function CafePage() {
  const [fnbAmount, setFnbAmount] = useState('');

  // This matches your Streamlit "Walk-in" logic
  const handleWalkInOrder = async () => {
    if (!fnbAmount) return;
    await supabase.from('cafe_orders').insert({
        date: new Date().toISOString().split('T')[0],
        total_revenue: Number(fnbAmount),
        total_cost: 0,
        profit: Number(fnbAmount),
        method: 'Cash'
    });
    setFnbAmount('');
    alert("Walk-in Order Recorded!");
  };

  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-bold mb-6">Cafe Point of Sale</h1>
      
      <div className="bg-[#121824] p-6 rounded-xl border border-[#2D3748] max-w-sm">
        <label className="text-xs text-gray-400 uppercase font-bold">Manual Amount Entry</label>
        <input 
          type="number" 
          className="w-full bg-[#0B0E14] mt-2 p-3 rounded-lg border border-[#2D3748] outline-none text-white" 
          placeholder="Enter Amount" 
          value={fnbAmount} 
          onChange={(e) => setFnbAmount(e.target.value)} 
        />
        <button 
          onClick={handleWalkInOrder} 
          className="w-full mt-4 bg-[#00D0FF] text-black font-black py-3 rounded-lg hover:bg-white transition-all"
        >
          Record Order
        </button>
      </div>
    </div>
  );
}