import { useEffect } from 'react';
import ScrollReveal from '../../components/site/ScrollReveal';
import HeroSection from '../../components/site/HeroSection';
import SocialProofBar from '../../components/site/SocialProofBar';
import FeatureCards from '../../components/site/FeatureCards';
import HowItWorksMini from '../../components/site/HowItWorksMini';
import PricingSection from '../../components/site/PricingSection';
import TestimonialsSection from '../../components/site/TestimonialsSection';
import CTAFinal from '../../components/site/CTAFinal';

export default function LandingPage() {
  useEffect(() => { document.title = 'Vagato — A IA que encontra a vaga certa pra você'; }, []);
  return (
    <>
      <HeroSection />

      <ScrollReveal>
        <SocialProofBar />
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <FeatureCards />
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <HowItWorksMini />
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <PricingSection />
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <TestimonialsSection />
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <CTAFinal />
      </ScrollReveal>
    </>
  );
}
