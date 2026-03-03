import { Search, Bell } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Avatar, AvatarFallback } from './ui/avatar';

export function Header() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <header className="fixed top-0 left-[240px] right-0 z-40 flex flex-col bg-card/80 backdrop-blur-md shadow-sm">
      {/* Hairline GRC signature — gradiente institucional */}
      <div className="h-[3px] w-full shrink-0" style={{ background: 'var(--hairline-accent)' }} />

      {/* Row principal */}
      <div className="flex items-center px-6 gap-6 h-[68px]" style={{ borderBottom: '1px solid var(--border)' }}>
        {/* Buscador */}
        <div className="flex-1 max-w-[520px]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre, dirección, trámite..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-[36px] pl-8 pr-4 bg-secondary border border-border rounded-lg text-[12.5px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Acciones derechas */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            className="relative p-2 rounded-lg hover:bg-secondary transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Notificaciones"
          >
            <Bell size={17} className="text-muted-foreground" />
            <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-destructive rounded-full" />
          </button>

          <div className="flex items-center gap-2">
            {user && (
              <span className="text-[12px] text-muted-foreground hidden lg:block">{user.name}</span>
            )}
            <Avatar className="w-8 h-8 cursor-pointer">
              <AvatarFallback className="text-[11px] font-semibold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
