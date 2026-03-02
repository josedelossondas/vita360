import { Search, Bell, User } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export function Header() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Iniciales del usuario para el avatar
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <header className="fixed top-0 left-[240px] right-0 h-[72px] bg-card border-b border-border flex items-center px-6 gap-8 z-40 transition-shadow">
      {/* Buscador */}
      <div className="flex-1 max-w-[560px]">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre, dirección, trámite..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-[38px] pl-9 pr-4 bg-secondary border border-border rounded-lg text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Acciones derechas */}
      <div className="flex items-center gap-3 ml-auto">
        <div className="relative cursor-pointer p-2 rounded-lg hover:bg-secondary transition-colors">
          <Bell size={18} className="text-muted-foreground" />
          <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </div>
        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center border border-border cursor-pointer">
          <span className="text-[12px] font-semibold text-primary">{initials}</span>
        </div>
      </div>
    </header>
  );
}
