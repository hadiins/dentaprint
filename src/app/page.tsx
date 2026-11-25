import { getBestSellers } from '@/lib/catalog';
import { Hero, Marquee, Bento, Workflow, Stats, Testimonials } from '@/components/home/Sections';
import BestSellers from '@/components/home/BestSellers';
import PartnerSection from '@/components/home/PartnerSection';
import ResinFinder from '@/components/home/ResinFinder';
import Newsletter from '@/components/home/Newsletter';

export default async function HomePage() {
  const best = await getBestSellers(7);
  return (
    <main>
      <Hero />
      <Marquee />
      <Bento />
      <BestSellers products={best} />
      <Workflow />
      <PartnerSection />
      <ResinFinder />
      <Stats />
      <Testimonials />
      <Newsletter />
    </main>
  );
}
