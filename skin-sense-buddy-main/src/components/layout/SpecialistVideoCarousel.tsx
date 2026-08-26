import { useEffect, useRef, useState } from "react";
import { Pause, Play, VolumeX } from "lucide-react";

type MediaItem =
  | { kind: "video"; src: string; label: string }
  | { kind: "image"; src: string; label: string; alt: string };

const media: MediaItem[] = [
  { kind: "video", src: "/imstev-specialist-01.mp4", label: "A specialist begins with understanding" },
  { kind: "video", src: "/imstev-specialist-02.mp4", label: "Care shaped around natural texture" },
  { kind: "video", src: "/imstev-specialist-03.mp4", label: "The detail behind every ritual" },
  { kind: "image", src: "/imstev-client-texture.jpeg", label: "Natural texture, seen clearly", alt: "Natural hair texture cared for by IMSTEV NATURALS" },
  { kind: "image", src: "/imstev-client-profile.jpeg", label: "A considered client ritual", alt: "IMSTEV NATURALS client care and styling" },
  { kind: "image", src: "/imstev-community-braids.jpeg", label: "Protective styling with intention", alt: "Protective braided hairstyle in the IMSTEV NATURALS community" },
  { kind: "image", src: "/imstev-skin.jpg", label: "Skin care made personal", alt: "Natural skin care at IMSTEV NATURALS" },
];

export function SpecialistVideoCarousel() {
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const activeMedia = media[activeIndex];

  useEffect(() => {
    const current = activeMedia.kind === "video" ? videoRefs.current[activeIndex] : null;
    videoRefs.current.forEach((video, index) => {
      if (video && index !== activeIndex) {
        video.pause();
        video.currentTime = 0;
      }
    });
    if (!current) return;

    current.currentTime = 0;
    if (isPlaying) {
      void current.play().catch(() => setIsPlaying(false));
    } else {
      current.pause();
    }
  }, [activeIndex, activeMedia.kind, isPlaying]);

  useEffect(() => {
    if (activeMedia.kind !== "video") return;
    const current = videoRefs.current[activeIndex];
    if (!current) return;
    const handleEnded = () => setActiveIndex((index) => (index + 1) % media.length);
    current.addEventListener("ended", handleEnded);
    return () => current.removeEventListener("ended", handleEnded);
  }, [activeIndex, activeMedia.kind]);

  const selectMedia = (index: number) => {
    setActiveIndex(index);
    setIsPlaying(true);
  };

  return (
    <div className="specialist-video-carousel" aria-label="IMSTEV specialist care stories">
      {media.map((item, index) => item.kind === "video" ? (
        <video
          key={item.src}
          ref={(element) => { videoRefs.current[index] = element; }}
          className={`specialist-video-carousel__video ${index === activeIndex ? "is-active" : ""}`}
          src={item.src}
          muted
          playsInline
          preload={index === 0 ? "auto" : "metadata"}
          aria-hidden={index !== activeIndex}
          tabIndex={index === activeIndex ? 0 : -1}
          onClick={() => setIsPlaying((playing) => !playing)}
        />
      ) : (
        <img
          key={item.src}
          className={`specialist-video-carousel__image ${index === activeIndex ? "is-active" : ""}`}
          src={item.src}
          alt={item.alt}
          aria-hidden={index !== activeIndex}
          tabIndex={index === activeIndex ? 0 : -1}
        />
      ))}
      <div className="specialist-video-carousel__wash" />
      <div className="specialist-video-carousel__topline"><span><span className="specialist-video-carousel__live-dot" />Studio journal</span><span>0{activeIndex + 1} / {String(media.length).padStart(2, "0")}</span></div>
      <div className="specialist-video-carousel__caption"><VolumeX size={14} /><span>{activeMedia.label}</span></div>
      <div className="specialist-video-carousel__controls">
        <button type="button" onClick={() => setIsPlaying((playing) => !playing)} aria-label={isPlaying ? "Pause specialist video" : "Play specialist video"}>{isPlaying ? <Pause size={14} /> : <Play size={14} />}</button>
        <div className="specialist-video-carousel__dots" role="tablist" aria-label="Choose a specialist story">
          {media.map((item, index) => <button key={item.src} type="button" role="tab" aria-selected={index === activeIndex} aria-label={`Show story ${index + 1}: ${item.label}`} onClick={() => selectMedia(index)} className={index === activeIndex ? "is-active" : ""}><span /></button>)}
        </div>
        <span className="specialist-video-carousel__hint">Tap to pause</span>
      </div>
    </div>
  );
}
