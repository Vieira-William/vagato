import { Target, Sparkles, MailCheck } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const features = [
  {
    icon: Target,
    title: 'Score de Match Inteligente',
    description:
      'Cada vaga recebe uma nota de compatibilidade com seu perfil. Você foca nas que realmente importam.',
  },
  {
    icon: Sparkles,
    title: 'IA que Analisa por Você',
    description:
      'Nosso motor de IA lê descrições, requisitos e cultura — e traduz tudo em insights acionáveis.',
  },
  {
    icon: MailCheck,
    title: 'E-mails Inteligentes',
    description:
      'Classificação automática de e-mails de recrutadores. Saiba o que é urgente sem abrir a caixa.',
  },
]

export default function FeatureCards() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <h2 className="text-3xl font-bold text-center mb-12">
        Tudo que você precisa, em um só lugar
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {features.map(({ icon: Icon, title, description }) => (
          <Card
            key={title}
            className={cn(
              'p-8 hover:-translate-y-1.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300'
            )}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#375DFB]/10 mb-5">
              <Icon className="w-6 h-6 text-[#375DFB]" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          </Card>
        ))}
      </div>
    </section>
  )
}
