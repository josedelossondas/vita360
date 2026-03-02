import { Search, Bell, User } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="fixed top-0 left-[240px] right-0 h-[72px] bg-white border-b border-[#E6EAF0] flex items-center px-6 gap-8 z-40">
      {/* Search Bar */}
      <div className="flex-1 max-w-[560px]">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA6B2]" />
          <input
            type="text"
            placeholder="Buscar por nombre, dirección, trámite..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-[40px] pl-10 pr-4 bg-[#F7F8FA] border border-[#E6EAF0] rounded-md text-[14px] text-[#2F3A46] placeholder:text-[#9AA6B2] focus:outline-none focus:ring-2 focus:ring-[#306CBB]/20"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4 ml-auto">
        <div className="relative cursor-pointer">
          <Bell size={20} className="text-[#6D7783]" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#E53935] rounded-full flex items-center justify-center">
            <span className="text-[10px] font-semibold text-white">1</span>
          </div>
        </div>
        <User size={20} className="text-[#6D7783] cursor-pointer" />
        <div className="w-9 h-9 bg-[#306CBB]/10 rounded-full flex items-center justify-center border border-[#E6EAF0]">
          <span className="text-[14px] font-semibold text-[#306CBB]">JD</span>
        </div>
      </div>
    </header>
  );
}
