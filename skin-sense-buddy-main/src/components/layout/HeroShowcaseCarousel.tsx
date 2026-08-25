import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Droplets, Leaf, MoveUpRight, ScanLine, Scissors, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface StorySlide {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
  action: string;
  href: string;
  icon: typeof Leaf;
}

const STORY_SLIDES: StorySlide[] = [
  {
    id: "scan",
    eyebrow: "01 · Understand your texture",
    title: "Your care story starts with seeing yourself clearly.",
    description: "A guided hair and skin scan designed for deeper tones, textured hair, and real routines—not generic beauty advice.",
    accent: "#d99745",
    action: "Begin your scan",
    href: "/scan",
    icon: ScanLine,
  },
  {
    id: "salon",
    eyebrow: "02 · Be held by expertise",
    title: "A salon ritual rooted in African beauty knowledge.",
    description: "From wash day to protective styling, meet specialists who understand the patience, pride, and precision your hair deserves.",
    accent: "#b9784a",
    action: "Book the studio",
    href: "/salon-booking",
    icon: Scissors,
  },
  {
    id: "skin",
    eyebrow: "03 · Nurture your glow",
    title: "Thoughtful skin care, made personal.",
    description: "Turn observations into a gentle routine, then choose products and guidance that make sense for your skin and your climate.",
    accent: "#c28b63",
    action: "Explore skin care",
    href: "/shop",
    icon: Droplets,
  },
  {
    id: "community",
    eyebrow: "04 · Grow together",
    title: "A softer kind of beauty community.",
    description: "Ask better questions, learn from lived experience, and find specialists who celebrate the full range of African beauty.",
    accent: "#879b78",
    action: "Enter the community",
    href: "/community",
    icon: Leaf,
  },
];

export function HeroShowcaseCarousel() {
  return <HeroCarouselStage compact={false} />;
}

export function CompactHeroShowcaseCarousel() {
  return <HeroCarouselStage compact />;
}

function HeroCarouselStage({ compact }: { compact: boolean }) {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const activeSlide = STORY_SLIDES[activeIndex];
  const ActiveIcon = activeSlide.icon;
  const activeKey = useMemo(() => activeSlide.id, [activeSlide.id]);

  useEffect(() => {
    if (isPaused) return;
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % STORY_SLIDES.length);
    }, 6200);
    return () => window.clearInterval(interval);
  }, [isPaused]);

  const move = (direction: number) => {
    setActiveIndex((current) => (current + direction + STORY_SLIDES.length) % STORY_SLIDES.length);
  };

  return (
    <section
      className={`signature-carousel ${compact ? "signature-carousel--compact" : ""}`}
      aria-roledescription="carousel"
      aria-label="The IMSTEV NATURALS care journey"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <div className="signature-carousel__grain" />
      <div className="signature-carousel__halo signature-carousel__halo--one" />
      <div className="signature-carousel__halo signature-carousel__halo--two" />
      <div className="signature-carousel__orbit signature-carousel__orbit--outer" />
      <div className="signature-carousel__orbit signature-carousel__orbit--inner" />

      <div className="signature-carousel__content">
        <div className="signature-carousel__copy" key={activeKey}>
          <div className="signature-carousel__eyebrow">
            <span className="signature-carousel__eyebrow-dot" style={{ backgroundColor: activeSlide.accent }} />
            {activeSlide.eyebrow}
          </div>
          <h2>{activeSlide.title}</h2>
          {!compact && <p>{activeSlide.description}</p>}
          <div className="signature-carousel__actions">
            <button type="button" className="signature-carousel__primary" onClick={() => navigate(activeSlide.href)}>
              <ActiveIcon size={17} strokeWidth={1.8} />
              {activeSlide.action}
              <ArrowRight size={16} />
            </button>
            {!compact && (
              <button type="button" className="signature-carousel__secondary" onClick={() => navigate("/dashboard")}>
                View my care <MoveUpRight size={15} />
              </button>
            )}
          </div>
        </div>

        <div className="signature-carousel__stage" aria-live="polite">
          <ScanHeroPanel compact={compact} onNavigate={navigate} />
          {!compact && (
            <div className="signature-carousel__stage-footer">
              <div className="signature-carousel__stage-note"><ShieldCheck size={14} /> Private care, clearly guided.</div>
              <div className="signature-carousel__controls">
                <button type="button" onClick={() => move(-1)} aria-label="Previous story">←</button>
                <div className="signature-carousel__progress" aria-hidden="true">
                  {STORY_SLIDES.map((slide, index) => <span key={slide.id} className={index === activeIndex ? "is-current" : ""} />)}
                </div>
                <button type="button" onClick={() => move(1)} aria-label="Next story">→</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ScanHeroPanel({ compact, onNavigate }: { compact: boolean; onNavigate: (path: string) => void }) {
  return (
    <div className={`scan-hero-panel ${compact ? "scan-hero-panel--compact" : ""}`}>
      <div className="scan-hero-panel__topline"><span>IMSTEV / personal scan</span><span>Hair + skin</span></div>
      <div className="scan-hero-panel__orbital-mark"><span /><span /><ScanLine size={20} /></div>
      <div className="scan-hero-panel__heading">
        <p>See yourself clearly</p>
        <h3>Start with <em>understanding.</em></h3>
        {!compact && <span>Choose what you want to understand first. Your care path begins with a closer look.</span>}
      </div>
      <div className="scan-hero-panel__paths">
        <button type="button" className="scan-hero-panel__path scan-hero-panel__path--hair" onClick={() => onNavigate("/scan?type=hair")}>
          <span className="scan-hero-panel__path-icon"><Scissors size={18} /></span>
          <span><small>Hair + scalp</small><strong>Find my starting point</strong><em>Texture, porosity, and scalp care</em></span>
          <ArrowRight size={16} />
        </button>
        <button type="button" className="scan-hero-panel__path scan-hero-panel__path--skin" onClick={() => onNavigate("/scan?type=skin")}>
          <span className="scan-hero-panel__path-icon"><Droplets size={18} /></span>
          <span><small>Skin</small><strong>Understand my skin</strong><em>Texture, sensitivity, and routine</em></span>
          <ArrowRight size={16} />
        </button>
      </div>
      {!compact && <div className="scan-hero-panel__foot"><span><ShieldCheck size={13} /> Private care record</span><span><Leaf size={13} /> Made for African textures</span></div>}
    </div>
  );
}
