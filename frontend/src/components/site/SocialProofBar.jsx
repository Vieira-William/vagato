const LOGOS = [
  { name: 'Indeed', svg: (
    <svg viewBox="0 0 200 60" className="h-6 w-auto">
      <text x="0" y="42" className="fill-current" style={{ fontSize: '40px', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>indeed</text>
    </svg>
  )},
  { name: 'LinkedIn', svg: (
    <svg viewBox="0 0 200 60" className="h-6 w-auto">
      <text x="0" y="42" className="fill-current" style={{ fontSize: '36px', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>LinkedIn</text>
    </svg>
  )},
  { name: 'Google Jobs', svg: (
    <svg viewBox="0 0 240 60" className="h-6 w-auto">
      <text x="0" y="42" className="fill-current" style={{ fontSize: '36px', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>Google Jobs</text>
    </svg>
  )},
  { name: 'Gupy', svg: (
    <svg viewBox="0 0 120 60" className="h-6 w-auto">
      <text x="0" y="42" className="fill-current" style={{ fontSize: '40px', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>gupy</text>
    </svg>
  )},
];

export default function SocialProofBar() {
  return (
    <section className="py-12 border-y border-border/10">
      <div className="max-w-5xl mx-auto px-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-center mb-8">
          Integrado com as maiores plataformas
        </p>
        <div className="flex items-center justify-center gap-10 md:gap-16 flex-wrap">
          {LOGOS.map((logo) => (
            <div
              key={logo.name}
              className="opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-300 text-foreground/60"
              title={logo.name}
            >
              {logo.svg}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
