'use client'

import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { MENU_ITEMS } from '../../data/menu'; // We created this in our last step

export default function CafePage() {
  const [fnbAmount, setFnbAmount] = useState('');

  // This matches your Streamlit "Walk-in" logic
  const handleWalkInOrder = async () => {
    await supabase.from('cafe_orders').insert({
        date: new Date().toISOString().split('T')[0],
        total_revenue: Number(fnbAmount),
        method: 'Cash'
    });
    alert("Walk-in Order Recorded!");
  };

  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-bold mb-6">Cafe Point of Sale</h1>
      {/* You can now map your MENU_ITEMS here just like your Streamlit grid */}
      <div className="grid grid-cols-4 gap-4">
        {MENU_ITEMS.map(item => (
            <button key={item.id} className="bg-[#1A2235] p-4 rounded-xl border border-[#2D3748]">
                {item.name} <br/> ₹{item.price}
            </button>
        ))}
      </div>
    </div>
  );
}