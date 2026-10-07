/**
 * Shading Transfer and High-Frequency Microstructure Engine
 * Extracts natural luminance field S_body and cotton micro-wrinkles H_body
 * from the original body/garment and applies image algebra to the warped texture.
 * 100% Deterministic, offline, CPU-capable pixel shader pipeline.
 */

export interface ShadingOptions {
  shadingTransferFactor: number; // 0..1 (default 0.75)
  microstructureAlpha: number;   // 0..0.4 (default 0.18)
  averageLuminanceTarget?: number;
  preserveHighlights?: boolean;
}

/**
 * Extracts normalized Luminance Map S(x,y) = L(x,y) / mean(L) from source image data.
 */
export function extractLuminanceField(
  sourceData: ImageData,
  torsoMask?: ImageData
): { luminanceMap: Float32Array; meanLuminance: number } {
  const w = sourceData.width;
  const h = sourceData.height;
  const totalPixels = w * h;
  const luminanceMap = new Float32Array(totalPixels);

  const data = sourceData.data;
  let sumLuminance = 0;
  let count = 0;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];

    // Standard Photometric Luminance (ITU-R BT.709)
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0;
    luminanceMap[i] = lum;

    // Accumulate only where mask/alpha is valid
    const maskVal = torsoMask ? torsoMask.data[idx + 3] : a;
    if (maskVal > 30) {
      sumLuminance += lum;
      count++;
    }
  }

  const meanLuminance = count > 0 ? sumLuminance / count : 0.45;
  return { luminanceMap, meanLuminance };
}

/**
 * Extracts High-Frequency Texture H = Original - Blurred (Unsharp High-Pass).
 * Captures real fabric micro-creases, knit ridges and seams.
 */
export function extractHighFrequencyTexture(
  sourceData: ImageData,
  blurRadius: number = 4
): Float32Array {
  const w = sourceData.width;
  const h = sourceData.height;
  const totalPixels = w * h;
  const hMap = new Float32Array(totalPixels);

  // Box blur approximation of Gaussian low-pass
  const lowPass = new Float32Array(totalPixels);
  const data = sourceData.data;

  // Horizontal blur pass
  const temp = new Float32Array(totalPixels);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let samples = 0;
      for (let k = -blurRadius; k <= blurRadius; k++) {
        const nx = Math.max(0, Math.min(w - 1, x + k));
        const idx = (y * w + nx) * 4;
        sum += (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255.0;
        samples++;
      }
      temp[y * w + x] = sum / samples;
    }
  }

  // Vertical blur pass
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let sum = 0;
      let samples = 0;
      for (let k = -blurRadius; k <= blurRadius; k++) {
        const ny = Math.max(0, Math.min(h - 1, y + k));
        sum += temp[ny * w + x];
        samples++;
      }
      lowPass[y * w + x] = sum / samples;
    }
  }

  // Compute High-Frequency residue: H = Original - LowPass
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const orig = (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255.0;
    // Normalized to [-0.5, 0.5]
    hMap[i] = orig - lowPass[i];
  }

  return hMap;
}

/**
 * Applies Shading Transfer and Microstructure algebra:
 * C_final = C_garment * (1 - β + β * (S_body / mean_L)) + α * H_body
 */
export function applyShadingAndMicrostructure(
  targetCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  luminanceMap: Float32Array,
  meanLuminance: number,
  highFreqMap: Float32Array,
  options: ShadingOptions = { shadingTransferFactor: 0.75, microstructureAlpha: 0.18 }
) {
  const imgData = targetCtx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const totalPixels = width * height;

  const beta = options.shadingTransferFactor;
  const alpha = options.microstructureAlpha;
  const safeMean = Math.max(0.15, meanLuminance);

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const a = data[idx + 3];
    if (a < 5) continue; // Skip transparent background

    const lum = luminanceMap[i];
    // Calculate shading multiplier
    // Normalized around 1.0; dark areas < 1.0, highlighted areas > 1.0
    const rawRatio = lum / safeMean;
    const clampedRatio = Math.max(0.35, Math.min(1.85, rawRatio));
    const shadingMultiplier = 1.0 - beta + beta * clampedRatio;

    // High frequency crease delta
    const hDelta = highFreqMap[i] * alpha * 255.0;

    // Apply to RGB channels
    data[idx] = Math.max(0, Math.min(255, data[idx] * shadingMultiplier + hDelta));
    data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] * shadingMultiplier + hDelta));
    data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] * shadingMultiplier + hDelta));
  }

  targetCtx.putImageData(imgData, 0, 0);
}

/**
 * Creates a debug visualization of S_body or H_body to inspect the layer in UI.
 */
export function renderShadingDebugMap(
  canvas: HTMLCanvasElement,
  dataMap: Float32Array,
  type: 'shading' | 'highfreq'
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.createImageData(w, h);
  const out = imgData.data;

  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    let val = 0;
    if (type === 'shading') {
      val = Math.max(0, Math.min(255, dataMap[i] * 255));
    } else {
      // Map [-0.5, 0.5] to [0, 255] with mid-grey 128
      val = Math.max(0, Math.min(255, (dataMap[i] + 0.5) * 255));
    }
    out[idx] = val;
    out[idx + 1] = val;
    out[idx + 2] = val;
    out[idx + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
}
