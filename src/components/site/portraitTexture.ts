/**
 * The picture a card's ripple distorts: its portrait drawn at the slot's own
 * 4:5, so the WebGL plane can be stretched over the slot without squashing
 * anything.
 *
 * A photo is cropped to fill the frame the way the card shows it (centred
 * across, a fifth of the way down). A person with no photo gets their
 * placeholder drawn in their team's accent, the same figure the card shows,
 * so the ripple runs through what is already on screen.
 */

const W = 480;
const H = 600;
const cache = new Map<string, Promise<string>>();

function canvas() {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  return c;
}

function photo(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      const c = canvas();
      const ctx = c.getContext("2d");
      if (!ctx) return reject(new Error("no 2d context"));
      const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.drawImage(img, (W - w) / 2, (H - h) * 0.2, w, h);
      resolve(c.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

function placeholder(accent: string): string {
  const c = canvas();
  const ctx = c.getContext("2d");
  if (!ctx) return "";

  // The slot's ground: dark, lit with the accent from the top left.
  ctx.fillStyle = "oklch(0.14 0.03 265)";
  ctx.fillRect(0, 0, W, H);
  const wash = ctx.createLinearGradient(0, 0, W, H);
  wash.addColorStop(0, accent);
  wash.addColorStop(1, "transparent");
  ctx.globalAlpha = 0.24;
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.22, H * 0.12, 0, W * 0.22, H * 0.12, W * 1.1);
  glow.addColorStop(0, accent);
  glow.addColorStop(0.68, "transparent");
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // The figure from the card's own symbol (viewBox 100 × 125), fading out
  // toward the bottom edge as it does on the card.
  const fig = canvas();
  const f = fig.getContext("2d");
  if (f) {
    const k = W / 100;
    f.fillStyle = accent;
    f.beginPath();
    f.arc(50 * k, 46 * k, 17 * k, 0, Math.PI * 2);
    f.fill();
    f.beginPath();
    f.moveTo(16 * k, 125 * k);
    f.bezierCurveTo(16 * k, 99 * k, 30 * k, 84 * k, 50 * k, 84 * k);
    f.bezierCurveTo(70 * k, 84 * k, 84 * k, 99 * k, 84 * k, 125 * k);
    f.closePath();
    f.fill();
    const fade = f.createLinearGradient(0, 0, 0, H);
    fade.addColorStop(0.3, "#000");
    fade.addColorStop(1, "transparent");
    f.globalCompositeOperation = "destination-in";
    f.fillStyle = fade;
    f.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.46;
    ctx.drawImage(fig, 0, 0);
  }
  ctx.globalAlpha = 1;
  return c.toDataURL("image/png");
}

/** A data URL of the portrait at 4:5, made once per photo or accent. */
export function portraitTexture(photoSrc: string | undefined, accent: string): Promise<string> {
  const key = photoSrc ?? `placeholder:${accent}`;
  let made = cache.get(key);
  if (!made) {
    made = photoSrc ? photo(photoSrc) : Promise.resolve(placeholder(accent));
    made.catch(() => cache.delete(key));
    cache.set(key, made);
  }
  return made;
}
