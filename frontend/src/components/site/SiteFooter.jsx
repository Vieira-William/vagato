import { Link } from 'react-router-dom';

const FOOTER_LINKS = {
  Produto: [
    { label: 'Como Funciona', to: '/como-funciona' },
    { label: 'Preços', to: '/pricing' },
  ],
  Empresa: [
    { label: 'Sobre', to: '#' },
    { label: 'Contato', to: '#' },
  ],
  Legal: [
    { label: 'Privacidade', to: '#' },
    { label: 'Termos', to: '#' },
  ],
};

export default function SiteFooter() {
  return (
    <footer className="bg-[#1b1b20] text-white/60">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Logo + tagline */}
          <div className="col-span-2 md:col-span-1">
            <img src="/logos/logo_horizontal.png" alt="Vagato" className="h-7 brightness-0 invert opacity-80 mb-4" />
            <p className="text-sm leading-relaxed">
              A IA que encontra a vaga certa pra você.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-white/90 text-[11px] font-bold uppercase tracking-widest mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-sm hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 text-center text-xs text-white/30">
          &copy; {new Date().getFullYear()} Vagato. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
