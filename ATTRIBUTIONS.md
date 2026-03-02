Este archivo de Figma Make incluye componentes de [shadcn/ui](https://ui.shadcn.com/) que se utilizan con [licencia de MIT](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md).

Este archivo de Figma Make incluye fotos de [Unsplash](https://unsplash.com) utilizadas con licencia de [licencia](https://unsplash.com/license).

## Imágenes institucionales (Municipalidad de Vitacura)

Las siguientes imágenes provienen del sitio oficial de la Municipalidad de Vitacura y son utilizadas con fines de integración institucional en la plataforma Vita360:

| Uso | URL | Descripción |
|-----|-----|-------------|
| Logo (header, login) | `https://vitacura.cl/app/themes/vitacura-sage/public/images/logos-vitacura_sineslogan_hor.36ae38.png` | Logotipo horizontal Municipalidad de Vitacura (sin eslogan) |
| Hero ciudadano | `https://vitacura.cl/app/themes/vitacura-sage/public/images/parque-bicentenario/header/header_parque-bicentenario.e6912a.jpg` | Parque Bicentenario — header de sección ciudadana |
| Hero login | `https://vitanew.tchile.com/app/uploads/2023/10/bosque-urbano.jpg` | Bosque urbano — panel derecho del login |
| Sección Aseo | `https://vitanew.tchile.com/app/uploads/2024/07/RETIRO-DE-RESIDUOS-3.jpg` | Retiro de residuos (referencia visual, uso futuro) |
| Sección Reporte/UNE | `https://vitacura.cl/app/uploads/2023/11/FOTO-1.jpg` | Foto referencial de atención vecinal (uso futuro) |
| Sección Seguridad | `https://vitacura.cl/app/uploads/2026/02/sosafe-app.png` | Aplicación SoSafe — sección seguridad (uso futuro) |

> Para usar imágenes locales en lugar de URLs remotas, descárgalas en `/public/brand/` (logotipos) y `/public/hero/` (imágenes de fondo) y actualiza las constantes `VITACURA_LOGO`, `HERO_IMG` en cada componente.

## Cómo cambiar imágenes

- **Logo global**: Modificar la constante `VITACURA_LOGO` en `src/app/components/Layout.tsx`, `src/app/components/Sidebar.tsx` y `src/app/pages/LoginPage.tsx`.
- **Hero login**: Modificar `HERO_IMG` en `src/app/pages/LoginPage.tsx`.
- **Hero ciudadano**: Modificar `HERO_IMG` en `src/app/pages/CiudadanoPage.tsx`.
