import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowRight, Droplets, Leaf, MoveUpRight, ScanLine, Scissors, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface StorySlide {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  video?: string;
  objectPosition?: string;
  accent: string;
  metric: string;
  metricLabel: string;
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
    image: "/imstev-client-texture.jpeg",
    objectPosition: "center 40%",
    accent: "#d99745",
    metric: "4A–4C",
    metricLabel: "texture-aware",
    action: "Begin your scan",
    href: "/scan",
    icon: ScanLine,
  },
  {
    id: "hair-scan-video",
    eyebrow: "02 · See your hair clearly",
    title: "A clearer beginning for your hair.",
    description: "Start with a guided scan that notices texture, scalp context, and the details your routine is asking for.",
    image: "/imstev-client-texture.jpeg",
    video: "/imstev-hair-scan.mp4",
    objectPosition: "center 40%",
    accent: "#c7894b",
    metric: "01",
    metricLabel: "guided scan",
    action: "Begin your hair scan",
    href: "/scan",
    icon: ScanLine,
  },
  {
    id: "scan-journey-video",
    eyebrow: "03 · Understand hair + skin",
    title: "Your next ritual begins with understanding.",
    description: "A calm first look at hair, scalp, and skin—so your next step feels more considered and less generic.",
    image: "/imstev-client-profile.jpeg",
    video: "/imstev-scan-journey.mp4",
    objectPosition: "center 34%",
    accent: "#9d7657",
    metric: "1:1",
    metricLabel: "care perspective",
    action: "Explore your scan",
    href: "/scan",
    icon: Droplets,
  },
  {
    id: "salon",
    eyebrow: "04 · Be held by expertise",
    title: "A salon ritual rooted in African beauty knowledge.",
    description: "From wash day to protective styling, meet specialists who understand the patience, pride, and precision your hair deserves.",
    image: "/imstev-client-profile.jpeg",
    objectPosition: "center 34%",
    accent: "#b9784a",
    metric: "1:1",
    metricLabel: "specialist care",
    action: "Book the studio",
    href: "/salon-booking",
    icon: Scissors,
  },
  {
    id: "skin",
    eyebrow: "05 · Nurture your glow",
    title: "Thoughtful skin care, made personal.",
    description: "Turn observations into a gentle routine, then choose products and guidance that make sense for your skin and your climate.",
    image: "/imstev-skin.jpg",
    accent: "#c28b63",
    metric: "360°",
    metricLabel: "care perspective",
    action: "Explore skin care",
    href: "/shop",
    icon: Droplets,
  },
  {
    id: "community",
    eyebrow: "06 · Grow together",
    title: "A softer kind of beauty community.",
    description: "Ask better questions, learn from lived experience, and find specialists who celebrate the full range of African beauty.",
    image: "/imstev-community-braids.jpeg",
    objectPosition: "center 46%",
    accent: "#879b78",
    metric: "24/7",
    metricLabel: "shared wisdom",
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
          <div className="signature-carousel__stage-label">
            <span>IMSTEV / care index</span>
            <span>{String(activeIndex + 1).padStart(2, "0")} / {String(STORY_SLIDES.length).padStart(2, "0")}</span>
          </div>
          <div className="signature-carousel__cards">
            {STORY_SLIDES.map((slide, index) => {
              const offset = (index - activeIndex + STORY_SLIDES.length) % STORY_SLIDES.length;
              const isActive = offset === 0;
              const isNext = offset === 1;
              const isPrevious = offset === STORY_SLIDES.length - 1;
              const positionClass = isActive ? "is-active" : isNext ? "is-next" : isPrevious ? "is-previous" : "is-hidden";
              return (
                <button
                  key={slide.id}
                  type="button"
                  className={`signature-carousel__card ${positionClass}`}
                  style={{ "--slide-accent": slide.accent } as CSSProperties}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Show ${slide.eyebrow}`}
                  aria-current={isActive ? "true" : undefined}
                >
                  {slide.video && isActive ? (
                    <video
                      key={slide.video}
                      src={slide.video}
                      poster={slide.image}
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="metadata"
                      aria-hidden="true"
                      className="h-full w-full object-cover"
                      style={{ objectPosition: slide.objectPosition ?? "center" }}
                    />
                  ) : (
                    <img src={slide.image} alt="" aria-hidden="true" style={{ objectPosition: slide.objectPosition ?? "center" }} />
                  )}
                  <span className="signature-carousel__card-wash" />
                  <span className="signature-carousel__scanline" />
                  <span className="signature-carousel__card-meta">
                    <span className="signature-carousel__metric">{slide.metric}</span>
                    <span>{slide.metricLabel}</span>
                  </span>
                  {isActive && <span className="signature-carousel__card-mark"><ActiveIcon size={15} /></span>}
                </button>
              );
            })}
          </div>
          {!compact && (
            <div className="signature-carousel__stage-footer">
              <div className="signature-carousel__stage-note"><ShoppingBag size={14} /> Care, not clutter.</div>
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
