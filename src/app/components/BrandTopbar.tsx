/**
 * BrandTopbar — franja institucional superior estilo vitacura.cl
 * Alto 30px · fondo card · borde inferior sutil · links de atención al vecino
 * A la derecha: chip con color institucional inst-blue
 */
import { Phone, Globe } from 'lucide-react';

export function BrandTopbar() {
  return (
    <div className="w-full h-[30px] bg-card border-b border-border flex items-center px-4 sm:px-6 z-50 shrink-0">
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground w-full">
        {/* Identidad institucional — chip de color institucional */}
        <span
          className="inline-flex items-center gap-1.5 font-semibold hidden sm:inline-flex"
          style={{ color: 'var(--inst-blue)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--inst-blue)' }} />
          Municipalidad de Vitacura
        </span>
        <span className="hidden sm:inline text-muted-foreground/30">|</span>

        {/* Teléfono */}
        <a
          href="tel:+5622585700"
          className="flex items-center gap-1 hover:text-primary transition-colors"
          aria-label="Teléfono de contacto"
        >
          <Phone size={10} />
          <span>(02) 2585 7000</span>
        </a>

        <span className="text-muted-foreground/30">·</span>

        <a
          href="https://vitacura.cl/atencion-vecinos"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors hidden sm:inline"
        >
          Atención al Vecino
        </a>

        <span className="hidden sm:inline text-muted-foreground/30">·</span>

        <a
          href="https://vitacura.cl/contacto"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors hidden sm:inline"
        >
          Contacto
        </a>

        {/* Portal — derecha */}
        <a
          href="https://vitacura.cl"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-primary transition-colors ml-auto"
          aria-label="Portal Vitacura"
        >
          <Globe size={10} />
          <span className="hidden sm:inline">vitacura.cl</span>
        </a>
      </div>
    </div>
  );
}
