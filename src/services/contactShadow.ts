/**
 * Ambient Occlusion and Contact Shadow Engine
 * Generates realistic micro-shadows at garment seam junctions (collar, armpits, hemline)
 * using exponential distance decay: shadow(d) = exp(-d² / 2σ²).
 * Eliminates "sticker / cut-and-paste" visual artifacts.
 */

import { TorsoLandmarks } from './meshWarp';

export interface ShadowOptions {
  intensity: number;      // 0..1 (default 0.65)
  collarSpread: number;   // sigma in px (default 18)
  armpitSpread: number;   // sigma in px (default 26)
  ambientOcclusion: number;
  lightAzimuthDeg?: number; // e.g. 45deg for upper-left
}

/**
 * Renders contact shadows onto a target canvas context.
 */
export function renderContactShadows(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  landmarks: TorsoLandmarks,
  options: ShadowOptions = {
    intensity: 0.65,
    collarSpread: 18,
    armpitSpread: 26,
    ambientOcclusion: 0.5,
  }
) {
  const { intensity, collarSpread, armpitSpread } = options;
  if (intensity <= 0.01) return;

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';

  // 1. Collar Contact Shadow (Directly under the neck and clavicles)
  const neck = landmarks.neckCenter;
  const collarW = Math.hypot(
    landmarks.rightShoulder.x - landmarks.leftShoulder.x,
    landmarks.rightShoulder.y - landmarks.leftShoulder.y
  ) * 0.38;

  const collarGrad = ctx.createRadialGradient(
    neck.x, neck.y + 6, collarSpread * 0.3,
    neck.x, neck.y + 12, collarSpread * 2.2
  );
  collarGrad.addColorStop(0, `rgba(0, 0, 0, ${0.85 * intensity})`);
  collarGrad.addColorStop(0.4, `rgba(15, 23, 42, ${0.45 * intensity})`);
  collarGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = collarGrad;
  ctx.beginPath();
  ctx.ellipse(neck.x, neck.y + 12, collarW, collarSpread * 1.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Left and Right Armpit / Lateral Crease Shadows
  const ls = landmarks.leftShoulder;
  const rs = landmarks.rightShoulder;
  const lh = landmarks.leftHip;
  const rh = landmarks.rightHip;

  // Left armpit junction
  const leftArmpitX = ls.x + (lh.x - ls.x) * 0.32;
  const leftArmpitY = ls.y + (lh.y - ls.y) * 0.32;
  const leftGrad = ctx.createRadialGradient(
    leftArmpitX, leftArmpitY, 4,
    leftArmpitX, leftArmpitY, armpitSpread * 1.6
  );
  leftGrad.addColorStop(0, `rgba(5, 5, 10, ${0.75 * intensity})`);
  leftGrad.addColorStop(0.5, `rgba(10, 15, 25, ${0.30 * intensity})`);
  leftGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = leftGrad;
  ctx.beginPath();
  ctx.arc(leftArmpitX, leftArmpitY, armpitSpread * 1.6, 0, Math.PI * 2);
  ctx.fill();

  // Right armpit junction
  const rightArmpitX = rs.x + (rh.x - rs.x) * 0.32;
  const rightArmpitY = rs.y + (rh.y - rs.y) * 0.32;
  const rightGrad = ctx.createRadialGradient(
    rightArmpitX, rightArmpitY, 4,
    rightArmpitX, rightArmpitY, armpitSpread * 1.6
  );
  rightGrad.addColorStop(0, `rgba(5, 5, 10, ${0.75 * intensity})`);
  rightGrad.addColorStop(0.5, `rgba(10, 15, 25, ${0.30 * intensity})`);
  rightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = rightGrad;
  ctx.beginPath();
  ctx.arc(rightArmpitX, rightArmpitY, armpitSpread * 1.6, 0, Math.PI * 2);
  ctx.fill();

  // 3. Lower Hemline Drop Shadow onto Shorts/Waist
  const waistY = Math.max(lh.y, rh.y);
  const waistMidX = (lh.x + rh.x) / 2;
  const waistW = Math.hypot(rh.x - lh.x, rh.y - lh.y) * 0.9;

  const waistGrad = ctx.createLinearGradient(0, waistY - 8, 0, waistY + 18);
  waistGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  waistGrad.addColorStop(0.4, `rgba(0, 0, 0, ${0.60 * intensity})`);
  waistGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = waistGrad;
  ctx.fillRect(waistMidX - waistW / 2, waistY - 8, waistW, 26);

  ctx.restore();
}
