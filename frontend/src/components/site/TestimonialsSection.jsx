import { Star } from 'lucide-react';
import { Card } from '@/components/ui/card';

const TESTIMONIALS = [
  {
    quote: 'O Vagato mudou minha forma de procurar emprego. Em 2 semanas recebi 3 convites para entrevista.',
    author: 'Marina Costa',
    role: 'UX Designer',
    stars: 5,
  },
  {
    quote: 'A classificação de e-mails é absurda. Não perco mais tempo lendo rejeições — foco no que importa.',
    author: 'Rafael Oliveira',
    role: 'Desenvolvedor Full Stack',
    stars: 5,
  },
  {
    quote: 'O score de match me ajudou a entender quais vagas realmente combinam com meu perfil. Muito preciso.',
    author: 'Camila Santos',
    role: 'Product Manager',
    stars: 5,
  },
];

function Stars({ count }) {
  return (
    <div className="flex gap-0.5 mb-3">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-4">O que dizem nossos usuários</h2>
        <p className="text-muted-foreground text-center mb-12">
          Feedback real de quem já usa o Vagato na busca por emprego.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t) => (
            <Card key={t.author} className="p-8 hover:-translate-y-1 transition-all duration-300">
              <Stars count={t.stars} />
              <blockquote className="text-sm text-foreground/80 leading-relaxed mb-6 italic">
                "{t.quote}"
              </blockquote>
              <div>
                <p className="text-[13px] font-semibold">{t.author}</p>
                <p className="text-[12px] text-muted-foreground">{t.role}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
