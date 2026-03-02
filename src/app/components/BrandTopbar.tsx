/**
 * BrandTopbar — franja institucional superior estilo vitacura.cl
 * Alto 30px · links de atención y contacto · glass-soft como fondo
 */
export function BrandTopbar() {
  return (
    <div className="w-full h-[30px] bg-primary text-primary-foreground flex items-center px-4 sm:px-6 z-50 shrink-0">
      <div className="flex items-center gap-1 text-[11px] opacity-90">
        <span className="font-medium">Municipalidad de Vitacura</span>
        <span className="mx-2 opacity-50">·</span>
        <a
          href="tel:+5622585700"
          className="hover:opacity-100 opacity-80 transition-opacity"
        >
          (02) 2585 7000
        </a>
        <span className="mx-2 opacity-50">·</span>
        <a
          href="https://vitacura.cl/atencion-vecinos"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-100 opacity-80 transition-opacity hidden sm:inline"
        >
          Atención al Vecino
        </a>
        <span className="mx-2 opacity-50 hidden sm:inline">·</span>
        <a
          href="https://vitacura.cl/contacto"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-100 opacity-80 transition-opacity hidden sm:inline"
        >
          Contacto
        </a>
      </div>
    </div>
  );
}
