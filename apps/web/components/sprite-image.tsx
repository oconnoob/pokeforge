"use client";

import { useEffect, useMemo, useState } from "react";

interface SpriteImageProps {
  src?: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}

export function SpriteImage({ src, alt, width, height, className }: SpriteImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const placeholderSize = useMemo(() => Math.max(24, Math.round(Math.min(width, height) * 0.6)), [height, width]);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={`${alt} unavailable`}
        className={`sprite-fallback${className ? ` ${className}` : ""}`}
        style={{ width, height, fontSize: `${placeholderSize}px` }}
      >
        ?
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}
