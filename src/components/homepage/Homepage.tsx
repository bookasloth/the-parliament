import { HeroSection } from "./HeroSection";

// Pre-login homepage = a single standalone signup split screen.
// No shared nav/footer or marketing sections.
export function Homepage() {
  return (
    <div id="main-content">
      <HeroSection />
    </div>
  );
}
