import { StickyNav } from "./StickyNav";
import { HeroSection } from "./HeroSection";
import { LiveActivityFeed } from "./LiveActivityFeed";
import { WhyJoin } from "./WhyJoin";
import { FeaturedAlumni } from "./FeaturedAlumni";
import { BusinessShowcase } from "./BusinessShowcase";
import { UpcomingEvents } from "./UpcomingEvents";
import { ImpactDashboard } from "./ImpactDashboard";
import { Testimonials } from "./Testimonials";
import { HousePride } from "./HousePride";
import { FinalCTA } from "./FinalCTA";
import { Footer } from "./Footer";
import { defaultHomepageContent, type HomepageContent } from "@/lib/homepage-data";

interface HomepageProps {
  content?: HomepageContent;
  sections?: {
    nav: boolean;
    hero: boolean;
    activity: boolean;
    whyJoin: boolean;
    alumni: boolean;
    businesses: boolean;
    events: boolean;
    impact: boolean;
    testimonials: boolean;
    houses: boolean;
    finalCta: boolean;
    footer: boolean;
  };
}

export function Homepage({
  content = defaultHomepageContent,
  sections = {
    nav: true,
    hero: true,
    activity: true,
    whyJoin: true,
    alumni: true,
    businesses: true,
    events: true,
    impact: true,
    testimonials: true,
    houses: true,
    finalCta: true,
    footer: true,
  },
}: HomepageProps) {
  return (
    <div className="flex min-h-screen flex-col">
      {sections.nav && <StickyNav {...content.nav} />}
      {sections.hero && <HeroSection content={content.hero} />}
      {sections.activity && <LiveActivityFeed activities={content.activities} />}
      {sections.whyJoin && <WhyJoin cards={content.whyJoinCards} />}
      {sections.alumni && <FeaturedAlumni alumni={content.featuredAlumni} />}
      {sections.businesses && <BusinessShowcase businesses={content.businessShowcase} />}
      {sections.events && <UpcomingEvents events={content.upcomingEvents} />}
      {sections.impact && <ImpactDashboard metrics={content.impactMetrics} />}
      {sections.testimonials && <Testimonials testimonials={content.testimonials} />}
      {sections.houses && <HousePride houses={content.houses} />}
      {sections.finalCta && <FinalCTA {...content.finalCta} />}
      {sections.footer && <Footer {...content.footer} />}
    </div>
  );
}
