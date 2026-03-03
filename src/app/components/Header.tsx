import { Search, Bell } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Avatar, AvatarFallback } from './ui/avatar';

export function Header() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Iniciales del usuario para el avatar
  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <header className="fixed top-0 left-[240px] right-0 h-[72px] bg-card/80 backdrop-blur-md border-b border-border flex items-center px-6 gap-6 z-40 shadow-sm">
      {/* Buscador */}
      <div className="flex-1 max-w-[520px]">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre, dirección, trámite..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-[36px] pl-8 pr-4 bg-secondary border border-border rounded-lg text-[12.5px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Acciones derechas */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Notificaciones */}
        <button
          type="button"
          className="relative p-2 rounded-lg hover:bg-secondary transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Notificaciones"
        >
          <Bell size={17} className="text-muted-foreground" />
          <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-destructive rounded-full" />
        </button>

        {/* Avatar usuario */}
        <div className="flex items-center gap-2">
          {user && (
            <span className="text-[12px] text-muted-foreground hidden lg:block">
              {user.name}
            </span>
          )}
          <Avatar className="w-8 h-8 cursor-pointer">
            <AvatarFallback className="text-[11px] font-semibold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
