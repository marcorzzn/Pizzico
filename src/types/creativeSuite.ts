export type WorkspaceMode = 'vector' | 'raster' | 'vto' | 'generative' | 'blueprint';

export type ColorSpace = 'sRGB' | 'Display-P3' | 'CMYK-FOGRA39' | 'Pantone-PMS';

export interface CMYKColor {
  c: number;
  m: number;
  y: number;
  k: number;
}

export interface PantoneColor {
  code: string;
  name: string;
  hex: string;
  cmyk: string;
}

export interface GradientStop {
  id: string;
  x: number; // 0 to 100%
  y: number; // 0 to 100%
  color: string;
  opacity: number;
}

export interface VariableFontSettings {
  weight: number;      // 100 - 900
  slant: number;       // -10 to 10 deg
  width: number;       // 75% to 125%
  opticalSize: number; // 8 to 72 pt
}

export interface VectorShape {
  id: string;
  type: 'path' | 'rect' | 'circle' | 'polygon' | 'star' | 'shield' | 'text';
  name: string;
  pathData?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  rotation: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  letterSpacing?: number;
  variableFont?: VariableFontSettings;
  gradientType?: 'solid' | 'linear' | 'radial' | 'freeform';
  freeformStops?: GradientStop[];
  livePathEffect?: 'none' | 'roughen' | 'powerstroke' | 'knot' | 'hatches' | 'wave' | 'patternAlongPath' | 'perspective';
  lpeIntensity?: number;
  perspectiveAngle?: number;
}

export interface RasterLayer {
  id: string;
  name: string;
  type: 'image' | 'adjustment' | 'sticker' | 'text';
  imageUrl?: string;
  opacity: number;
  visible: boolean;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'difference';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface PhotoAdjustments {
  exposure: number;      // -100 to 100
  contrast: number;      // -100 to 100
  saturation: number;    // -100 to 100
  warmth: number;        // -100 to 100 (Kelvin shift)
  highlights: number;    // -100 to 100
  shadows: number;       // -100 to 100
  vignette: number;      // 0 to 100
  blur: number;          // 0 to 20 px
  tint: number;          // -100 to 100
  curveHighlights: number;
  curveMidtones: number;
  curveShadows: number;
}

export interface BeautifySettings {
  skinSmooth: number;
  teethWhiten: number;
  eyeBrightness: number;
  faceContour: number;
  redEyeFix: boolean;
}

export interface VTOTarget {
  id: string;
  name: string;
  role: string;
  gender: 'male' | 'female' | 'unisex';
  previewUrl: string;
  poseDescription: string;
  lightingAngle: string;
}

export interface VTOGarment {
  id: string;
  name: string;
  category: 'football-jersey' | 'streetwear-hoodie' | 'track-jacket' | 'classic-tee';
  teamOrBrand: string;
  previewUrl: string;
  texturePattern: string;
  sponsorLogos: string[];
  primaryHex: string;
  secondaryHex: string;
}

export interface VTOParameters {
  category: 'upper-body' | 'football-kit' | 'full-outfit';
  fitTightness: 'slim-athletic' | 'regular' | 'oversized';
  creaseDepth: number;          // 0 to 100
  lightingMatching: number;     // 0 to 100
  logoPreservation: boolean;    // true preserves sponsor & badge geometry
  fabricType: 'jacquard-mesh' | 'heavy-cotton' | 'dry-fit' | 'windstopper';
  warpStrength: number;
  cloudModel: 'IDM-VTON' | 'OOTDiffusion' | 'ControlNet-DensePose';
}

// -------------------------------------------------------------
// NEW: Configurable Photographic Mockup Blueprint Types (Section 5)
// -------------------------------------------------------------

export type ReferenceRole = 
  | 'identity' 
  | 'hair' 
  | 'body' 
  | 'wardrobe_front' 
  | 'wardrobe_back' 
  | 'pose' 
  | 'environment' 
  | 'lighting' 
  | 'tattoos' 
  | 'style';

export interface ReferenceAsset {
  id: string;
  name: string;
  previewUrl: string;
  role: ReferenceRole;
  instruction: string; // e.g. "copia solo il volto", "mantieni l'intera divisa", "usa solo la luce"
  enabled: boolean;
  priority: number;
}

export interface MockupQualityAuditItem {
  criterion: string;
  status: 'pass' | 'review' | 'fail';
  comment: string;
}

export interface MockupConfig {
  project: {
    name: string;
    mode: 'single' | 'series' | 'variants' | 'multi_ref';
    continuity: {
      environment_asset: string;
      wardrobe_asset: string;
      lighting_preset: string;
      style_preset: string;
    };
  };
  subject: {
    type: 'persona' | 'atleta' | 'modello' | 'prodotto' | 'personaggio';
    name: string;
    identity_source: 'photo' | 'text' | 'combination';
    preserve: string[]; // ['face_shape', 'skin_tone', 'haircut']
    tattoos: {
      mode: 'from_references_only' | 'none' | 'custom';
      description: string;
    };
    custom_description: string;
  };
  wardrobe: {
    category: string; // 'maglia gara', 'hoodie', 'tuta'
    layers: string[];
    colors: string;
    material: string;
    preserve_design: boolean;
    modifications: Array<{ target: string; value: string }>; // e.g. shirt_number -> "18"
  };
  shot: {
    framing: 'close_up' | 'head_shoulders' | 'mid_bust' | 'three_quarter' | 'full_body' | 'detail';
    aspect_ratio: '4:5' | '1:1' | '9:16' | '16:9' | '3:2';
    crop_anchor: 'waist' | 'hips' | 'knees' | 'feet' | 'chest';
    camera_angle: 'eye_level' | 'three_quarter' | 'profile' | 'low_angle' | 'high_angle';
    pose: string;
    expression: string;
    subject_position: 'center' | 'rule_of_thirds' | 'left' | 'right';
    safe_margin: boolean;
  };
  scene: {
    background_mode: 'use_reference' | 'remove_objects' | 'extend_ratio' | 'new_prompt';
    background_desc: string;
    lighting: {
      direction: 'camera_left' | 'camera_right' | 'overhead' | 'backlight';
      quality: 'hard_side_light' | 'soft_studio_box' | 'floodlight_arena' | 'golden_hour';
      rim_light: boolean;
    };
  };
  render: {
    style: 'photoreal_editorial' | 'sports_documentary' | 'studio_analog' | 'cinematic' | 'hyper_commercial';
    variants: number;
    format: 'png' | 'jpg' | 'webp';
    quality: 'standard' | 'high_res_4k';
  };
  references: ReferenceAsset[];
}

export interface UnifiedDocument {
  id: string;
  name: string;
  version: '2.4.0';
  format: 'Unified Creative Schema (.ucs / SQLite)';
  canvasWidth: number;
  canvasHeight: number;
  dpi: number;
  colorSpace: ColorSpace;
  vectorLayers: VectorShape[];
  rasterLayers: RasterLayer[];
  adjustments: PhotoAdjustments;
  vtoMeta?: {
    modelId: string;
    garmentId: string;
    warpMeshNodes: number;
  };
  historyLength: number;
}

