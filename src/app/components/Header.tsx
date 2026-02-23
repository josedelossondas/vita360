import { Search, Bell, User } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="fixed top-0 left-[220px] right-0 h-[60px] bg-white border-b border-border flex items-center px-6 gap-4 z-40">
      {/* Search */}
      <div className="flex-1 max-w-lg relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nombre, dirección, trámite..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-secondary border border-border rounded-lg text-[13.5px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <button className="relative w-9 h-9 rounded-lg border border-border bg-secondary flex items-center justify-center hover:bg-muted transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive border-[1.5px] border-white" />
        </button>

        {/* Profile */}
        <button className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-muted transition-colors">
          <div className="text-right">
            <div className="text-[13px] font-medium text-foreground leading-tight">Juan Pérez</div>
            <div className="text-[11px] text-muted-foreground">Supervisor</div>
          </div>
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0">
            JP
          </div>
        </button>
      </div>
    </header>
  );
}
