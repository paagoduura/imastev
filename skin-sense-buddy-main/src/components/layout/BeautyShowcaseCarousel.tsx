import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BRAND_IMAGES } from "@/lib/brandImages";
import { cn } from "@/lib/utils";

type ShowcaseSlide = {
  image: string;
  title: string;
  description: string;
  badge: string;
  imagePosition?: string;
  imageClassName?: string;
};

const SHOWCASE_SLIDES: ShowcaseSlide[] = [
  {
    image: BRAND_IMAGES.skinPortrait,
    title: "Radiant skin imagery that brings a more refined beauty direction to the brand",
    description:
      "A clean beauty portrait that introduces the skin-analysis side of the brand with softer texture, better light, and a premium editorial feel.",
    badge: "Skin focus",
    imagePosition: "center 28%",
  },
  {
    image: "/gallery-4.jpg",
    title: "Defined twist styling with crisp parts, healthy scalp detail, and a more professional finish",
    description:
      "A polished protective style that shows texture, scalp health, and neat finishing in a cleaner salon-focused frame.",
    badge: "Twist styling",
    imagePosition: "center 34%",
  },
  {
    image: "/gallery-3.jpg",
    title: "Protective styling that shows the hair clearly and presents the overall look more elegantly",
    description:
      "A stronger angle for showcasing healthy texture, visible rows, and a more premium salon result on smaller screens.",
    badge: "Protective style",
    imagePosition: "center 26%",
  },
  {
    image: "/kids_beaded_twist_hairstyle.png",
    title: "Natural beaded twists with a soft premium finish",
    description:
      "A clean natural hairstyle frame that keeps the carousel polished while staying closer to the salon and hair story.",
    badge: "Natural styling",
    imagePosition: "center 28%",
  },
  {
    image: "/carousel-1.jpg",
    title: "Defined mini twists with a clean, geometric parting pattern",
    description: "A polished protective style that highlights neat sectioning, healthy scalp visibility, and a salon-finished twist set.",
    badge: "Mini twists",
    imagePosition: "center 68%",
  },
  {
    image: "/carousel-2.jpg",
    title: "Kids beaded twists with soft volume and playful movement",
    description: "A child-friendly protective style with tidy parts, moisturized twists, and clear beads that give the finish a bright, joyful character.",
    badge: "Beaded twists",
    imagePosition: "center 42%",
  },
  {
    image: "/rope-twists-replacement.jpg",
    title: "Side-swept rope twists styled with texture and scalp definition",
    description: "A versatile look that brings together crisp side parting, healthy shine, and softly gathered twists for everyday elegance.",
    badge: "Rope twists",
    imagePosition: "center 30%",
    imageClassName: "scale-[0.84]",
  },
  {
    image: "/carousel-4.jpg",
    title: "Twist updo with sculpted rows and a smooth protective finish",
    description: "A refined updo that showcases precise braiding lines, nourished roots, and a secure style built for lasting wear.",
    badge: "Twist updo",
    imagePosition: "center 36%",
  },
  {
    image: "/professional_loc_maintenance.png",
    title: "Professional loc maintenance with clean parts, healthy scalp visibility, and a polished salon finish",
    description: "A premium loc-focused image that shows the hair clearly and brings stronger salon credibility to the carousel.",
    badge: "Loc maintenance",
    imagePosition: "center 42%",
  },
  {
    image: "/natural-twist-style-replacement.jpg",
    title: "Natural twist styling presented in a cleaner, more professional frame",
    description: "This slide highlights healthier texture, neater finishing, and a stronger overall salon look.",
    badge: "Natural twist style",
    imagePosition: "center 34%",
    imageClassName: "scale-[0.82]",
  },
  {
    image: "/4c_twist_updo_hairstyle.png",
    title: "A refined 4C twist updo that gives the carousel a more premium salon signature",
    description: "A cleaner hero-style hair image that brings structure, healthy texture, and stronger visual quality to the brand story.",
    badge: "4C twist updo",
    imagePosition: "center 32%",
  },
];

const COMPACT_SHOWCASE_SLIDES: ShowcaseSlide[] = [
  {
    image: BRAND_IMAGES.skinPortrait,
    title: "Clear, radiant skin shown in a cleaner premium frame",
    description: "",
    badge: "Skin focus",
    imagePosition: "center 28%",
  },
  {
    image: "/gallery-4.jpg",
    title: "Refined twist styling with better scalp and texture visibility",
    description: "",
    badge: "Twist styling",
    imagePosition: "center 34%",
  },
  {
    image: "/rope-twists-replacement.jpg",
    title: "Side-swept rope twists shown in a cleaner mobile frame",
    description: "",
    badge: "Rope twists",
    imagePosition: "center 30%",
    imageClassName: "scale-[0.84]",
  },
  {
    image: "/gallery-2.jpg",
    title: "Kids twists captured more clearly with a cleaner salon look",
    description: "",
    badge: "Kids styling",
    imagePosition: "center 28%",
  },
  {
    image: "/professional_loc_maintenance.png",
    title: "Professional loc maintenance shown more clearly on mobile",
    description: "",
    badge: "Loc maintenance",
    imagePosition: "center 42%",
  },
  {
    image: "/natural-twist-style-replacement.jpg",
    title: "Natural twist styling with a cleaner premium presentation",
    description: "",
    badge: "Natural twist style",
    imagePosition: "center 34%",
    imageClassName: "scale-[0.82]",
  },
  {
    image: "/4c_twist_updo_hairstyle.png",
    title: "A 4C twist updo that feels cleaner and more premium on phones",
    description: "",
    badge: "4C twist updo",
    imagePosition: "center 32%",
  },
];

export function BeautyShowcaseCarousel() {
  return <BeautyShowcaseCarouselFrame compact={false} />;
}

export function CompactBeautyShowcaseCarousel() {
  return <BeautyShowcaseCarouselFrame compact={true} />;
}

function BeautyShowcaseCarouselFrame({ compact }: { compact: boolean }) {
  const slides = compact ? COMPACT_SHOWCASE_SLIDES : SHOWCASE_SLIDES;
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on("select", onSelect);

    const intervalId = window.setInterval(() => {
      if (document.hidden) return;
      emblaApi.scrollNext();
    }, 5200);

    return () => {
      window.clearInterval(intervalId);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  return (
    <section
      className={cn(
        "border-b border-primary/10 bg-background/80 px-3 backdrop-blur sm:px-6 lg:px-8",
        compact ? "pb-2 pt-1.5 sm:pb-3 sm:pt-2" : "pb-3 pt-2 sm:pb-4 sm:pt-3",
      )}
    >
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[24px] border border-primary/10 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.08)] premium-sheen">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {slides.map((slide) => (
                <div key={slide.image} className="min-w-0 flex-[0_0_100%]">
                  <div
                    className={cn(
                      "relative",
                      compact ? "min-h-[168px] sm:min-h-[190px] lg:min-h-[210px]" : "min-h-[180px] sm:min-h-[220px] lg:min-h-[250px]",
                    )}
                  >
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className={cn("absolute inset-0 h-full w-full object-cover", slide.imageClassName)}
                      style={{ objectPosition: slide.imagePosition ?? "center" }}
                    />
                    <div
                      className={cn(
                        "absolute inset-0",
                        compact
                          ? "bg-[linear-gradient(90deg,rgba(15,23,42,0.88)_0%,rgba(15,23,42,0.56)_52%,rgba(15,23,42,0.16)_100%)]"
                          : "bg-[linear-gradient(90deg,rgba(15,23,42,0.78)_0%,rgba(15,23,42,0.34)_48%,rgba(15,23,42,0.12)_100%)]",
                      )}
                    />
                    <div
                      className={cn(
                        "relative flex flex-col justify-start",
                        compact
                          ? "min-h-[168px] px-4 pb-5 pt-6 sm:min-h-[190px] sm:px-5 sm:pb-5 sm:pt-7 lg:min-h-[210px] lg:px-6 lg:pb-6 lg:pt-8"
                          : "min-h-[180px] px-5 pb-8 pt-6 sm:min-h-[220px] sm:px-7 sm:pb-10 sm:pt-8 lg:min-h-[250px] lg:px-8 lg:pb-12 lg:pt-10",
                      )}
                    >
                      <div className={cn(compact ? "max-w-[16rem] sm:max-w-[22rem]" : "max-w-[18rem] sm:max-w-[24rem] lg:max-w-[28rem]")}>
                        <div
                          className={cn(
                            "mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/90 backdrop-blur",
                            compact && "hidden sm:inline-flex",
                          )}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          {slide.badge}
                        </div>
                        <h2
                          className={cn(
                            "font-display font-semibold leading-tight text-white",
                            compact
                              ? "max-w-[13rem] text-[0.95rem] sm:max-w-[16rem] sm:text-base lg:text-lg"
                              : "text-base sm:text-xl lg:text-[1.7rem]",
                          )}
                        >
                          {slide.title}
                        </h2>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className={cn(
              "absolute left-4 right-4 flex items-end justify-between gap-3 sm:left-5 sm:right-5",
              compact ? "bottom-3 sm:bottom-4" : "bottom-4 sm:bottom-5",
            )}
          >
            <div className="flex items-center gap-2 rounded-full bg-slate-950/35 px-3 py-2 backdrop-blur">
              {slides.map((slide, index) => (
                <button
                  key={slide.image}
                  type="button"
                  aria-label={`Go to slide ${index + 1}`}
                  className={cn(
                    "h-2.5 rounded-full transition-all duration-300",
                    selectedIndex === index ? "w-7 bg-white" : "w-2.5 bg-white/45 hover:bg-white/70",
                  )}
                  onClick={() => emblaApi?.scrollTo(index)}
                />
              ))}
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-10 w-10 rounded-full border border-white/15 bg-slate-950/35 text-white backdrop-blur hover:bg-slate-950/55 hover:text-white"
                onClick={() => emblaApi?.scrollPrev()}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-10 w-10 rounded-full border border-white/15 bg-slate-950/35 text-white backdrop-blur hover:bg-slate-950/55 hover:text-white"
                onClick={() => emblaApi?.scrollNext()}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
