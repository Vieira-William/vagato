import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function CTAFinal() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto relative overflow-hidden rounded-[2rem] bg-[#1b1b20] p-12 md:p-16 text-center">
        {/* Mascote decorativo */}
        <img
          src="/logos/logo_mascote.png"
          alt=""
          className="absolute bottom-4 right-6 w-[50px] opacity-[0.12] pointer-events-none select-none"
        />

        {/* Glow decorativo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-[#375DFB]/10 rounded-full blur-[100px] pointer-events-none" />

        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 relative">
          Pronto para encontrar sua próxima oportunidade?
        </h2>
        <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto relative">
          Comece grátis e deixe a IA trabalhar por você. Sem cartão de crédito.
        </p>

        <Link
          to="/registro"
          className="inline-flex items-center gap-2 h-12 px-8 rounded-full bg-white text-[#1b1b20] font-bold text-[14px] hover:bg-white/90 transition-all shadow-lg relative"
        >
          Começar Grátis
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
