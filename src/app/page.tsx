"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Connection details
const supabaseUrl = 'https://vvctggnzrypeexyqnzsl.supabase.co';
const supabaseAnonKey = 'sb_publishable_oIdGyJpLhiXWt-PGEmUrPw_4PoGqiEv';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home() {
  const [todayData, setTodayData] = useState({ cash: 0, upi: 0 });
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTodaysSales() {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      try {
        const { data, error } = await supabase
          .from('sales')
          .select('total, method, fnb_total')
          .gte('date', `${today} 00:00:00`)
          .lte('date', `${today} 23:59:59`);

        if (error) {
          setErrorStatus("Database Error: " + error.message);
          console.error("Error:", error);
        } else if (data) {
          let cash = 0;
          let upi = 0;
          data.forEach((row: any) => {
            const amount = (row.total || 0) + (row.fnb_total || 0);
            if (row.method === 'Cash') cash += amount;
            if (row.method === 'UPI') upi += amount;
          });
          setTodayData({ cash, upi });
          setErrorStatus(null);
        }
      } catch (err) {
        setErrorStatus("Connection failed");
      }
    }
    fetchTodaysSales();
  }, []);

  return (
    <div className="flex h-screen bg-[#0A0A0C] text-white font-sans overflow-hidden">
      <nav className="w-24 border-r border-white/5 bg-white/[0.02] flex flex-col items-center py-8">
        <div className="text-cyan-400 font-black text-2xl mb-12">GA</div>
      </nav>

      <main className="flex-1 p-8">
        <header className="flex justify-between items-center mb-10 bg-white/5 border border-white/10 p-5 rounded-2xl">
          <div className="flex gap-12">
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-1 font-bold">Today's Cash</p>
              <p className="text-2xl text-emerald-400 font-black">₹{todayData.cash}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-1 font-bold">Today's UPI</p>
              <p className="text-2xl text-blue-400 font-black">₹{todayData.upi}</p>
            </div>
          </div>
        </header>

        {errorStatus && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 text-sm">
            {errorStatus} - Please check your Supabase Policy settings.
          </div>
        )}
      </main>
    </div>
  );
}