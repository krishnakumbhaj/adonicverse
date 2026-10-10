'use client';

import { useEffect, useState } from 'react';

// Spotify tints page headers with the main color of the cover art. These helpers do the same
// for story posters, and give stories without a poster a stable color of their own.

const FALLBACK_HUES = [282, 330, 262, 200, 160, 24, 350, 220, 300, 12];

function hash(text: string) {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(value);
}

/** A stable color for something without artwork, picked from its id or title. */
export function seedColor(seed: string, lightness = 38) {
  return `hsl(${FALLBACK_HUES[hash(seed) % FALLBACK_HUES.length]} 55% ${lightness}%)`;
}

/** Two stable colors for a gradient placeholder poster. */
export function seedGradient(seed: string) {
  const hue = FALLBACK_HUES[hash(seed) % FALLBACK_HUES.length];
  return `linear-gradient(145deg, hsl(${hue} 65% 32%), hsl(${(hue + 40) % 360} 70% 55%))`;
}

function toHsl(r: number, g: number, b: number) {
  const [red, green, blue] = [r / 255, g / 255, b / 255];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: lightness };
  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  const hue =
    max === red ? (green - blue) / delta + (green < blue ? 6 : 0) : max === green ? (blue - red) / delta + 2 : (red - green) / delta + 4;
  return { h: hue * 60, s: saturation, l: lightness };
}

/** Main color of an image, adjusted so white text stays readable on it. Null if it can't be read. */
async function readDominantColor(url: string): Promise<string | null> {
  const image = new window.Image();
  image.crossOrigin = 'anonymous';
  image.src = url;
  try {
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 16;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0, 16, 16);
    const pixels = context.getImageData(0, 0, 16, 16).data;

    // Weight saturated pixels more, so a colorful poster isn't averaged into gray.
    let [r, g, b, total] = [0, 0, 0, 0];
    for (let i = 0; i < pixels.length; i += 4) {
      const { s } = toHsl(pixels[i], pixels[i + 1], pixels[i + 2]);
      const weight = 0.2 + s;
      r += pixels[i] * weight;
      g += pixels[i + 1] * weight;
      b += pixels[i + 2] * weight;
      total += weight;
    }
    const { h, s } = toHsl(r / total, g / total, b / total);
    return `hsl(${Math.round(h)} ${Math.round(Math.max(s, 0.35) * 70)}% 36%)`;
  } catch {
    return null; // not loaded, or the server doesn't allow reading its pixels
  }
}

/** Header color for a story or channel: from its image when there is one, else from `seed`. */
export function useDominantColor(imageUrl: string | null | undefined, seed: string) {
  const [color, setColor] = useState(() => seedColor(seed));

  useEffect(() => {
    let cancelled = false;
    setColor(seedColor(seed));
    if (imageUrl) {
      readDominantColor(imageUrl).then((found) => {
        if (!cancelled && found) setColor(found);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [imageUrl, seed]);

  return color;
}
