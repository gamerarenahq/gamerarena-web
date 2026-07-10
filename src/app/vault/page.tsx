'use client'

export default function VaultPage() {
  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-bold mb-6">Master Vault</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1A2235] p-6 rounded-xl border border-[#00D0FF]">
          <p className="text-gray-400">Total Revenue (MTD)</p>
          <h2 className="text-3xl font-bold">₹0</h2>
        </div>
        {/* We will map your Supabase sales/expenses data here in the next update */}
      </div>
    </div>
  );
}