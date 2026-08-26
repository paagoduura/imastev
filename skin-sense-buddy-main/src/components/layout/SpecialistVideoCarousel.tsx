import { useEffect, useRef, useState } from "react";
import { Pause, Play, VolumeX } from "lucide-react";

const videos = [
  { src: "/imstev-specialist-01.mp4", label: "A specialist begins with understanding" },
  { src: "/imstev-specialist-02.mp4", label: "Care shaped around natural texture" },
  { src: "/imstev-specialist-03.mp4", label: "The detail behind every care experience" },
];

export function SpecialistVideoCarousel() {
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    const current = videoRefs.current[activeIndex];
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
  }, [activeIndex, isPlaying]);

  useEffect(() => {
    const current = videoRefs.current[activeIndex];
    if (!current) return;
    const handleEnded = () => setActiveIndex((index) => (index + 1) % videos.length);
    current.addEventListener("ended", handleEnded);
    return () => current.removeEventListener("ended", handleEnded);
  }, [activeIndex]);

  const selectVideo = (index: number) => {
    setActiveIndex(index);
    setIsPlaying(true);
  };

  return (
    <div className="specialist-video-carousel" aria-label="IMSTEV specialist care stories">
      {videos.map((video, index) => (
        <video
          key={video.src}
          ref={(element) => { videoRefs.current[index] = element; }}
          className={`specialist-video-carousel__video ${index === activeIndex ? "is-active" : ""}`}
          src={video.src}
          muted
          playsInline
          preload={index === 0 ? "auto" : "metadata"}
          aria-hidden={index !== activeIndex}
          tabIndex={index === activeIndex ? 0 : -1}
          onClick={() => setIsPlaying((playing) => !playing)}
        />
      ))}
      <div className="specialist-video-carousel__wash" />
      <div className="specialist-video-carousel__topline"><span><span className="specialist-video-carousel__live-dot" />Studio journal</span><span>0{activeIndex + 1} / 03</span></div>
      <div className="specialist-video-carousel__caption"><VolumeX size={14} /><span>{videos[activeIndex].label}</span></div>
      <div className="specialist-video-carousel__controls">
        <button type="button" onClick={() => setIsPlaying((playing) => !playing)} aria-label={isPlaying ? "Pause specialist video" : "Play specialist video"}>{isPlaying ? <Pause size={14} /> : <Play size={14} />}</button>
        <div className="specialist-video-carousel__dots" role="tablist" aria-label="Choose a specialist video">
          {videos.map((video, index) => <button key={video.src} type="button" role="tab" aria-selected={index === activeIndex} aria-label={`Play video ${index + 1}: ${video.label}`} onClick={() => selectVideo(index)} className={index === activeIndex ? "is-active" : ""}><span /></button>)}
        </div>
        <span className="specialist-video-carousel__hint">Tap to pause</span>
      </div>
    </div>
  );
}
