/**
 * Offline High-Fidelity Vector Assets for Virtual Try-On
 * Full-color modern athletes, realistic lighting, and detailed jersey garments.
 * 100% self-contained and network-independent (L0 offline asset layer).
 */

export const SVG_ATHLETE_STRIKER = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
  <defs>
    <!-- Studio Background -->
    <radialGradient id="bgGrad" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="50%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </radialGradient>
    <!-- Studio Spotlight Rim -->
    <linearGradient id="rimLight" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.35"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.25"/>
    </linearGradient>
    <!-- Natural Athlete Skin Tone -->
    <linearGradient id="skinFace" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#f8c291"/>
      <stop offset="60%" stop-color="#e58e26"/>
      <stop offset="100%" stop-color="#b76914"/>
    </linearGradient>
    <linearGradient id="skinNeck" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#d3832b"/>
      <stop offset="100%" stop-color="#b06411"/>
    </linearGradient>
    <!-- Neutral Base Compression Layer -->
    <linearGradient id="baseUndershirt" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#334155"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <!-- Muscle Shadows -->
    <radialGradient id="chestShade" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="600" height="800" fill="url(#bgGrad)"/>
  <rect width="600" height="800" fill="url(#rimLight)"/>

  <!-- Athletic Arms & Biceps Background -->
  <path d="M 120 370 Q 80 470 100 620 L 160 610 Q 150 490 170 380 Z" fill="#d3832b"/>
  <path d="M 480 370 Q 520 470 500 620 L 440 610 Q 450 490 430 380 Z" fill="#b06411"/>

  <!-- Athlete Torso (Muscular, Natural Volume) -->
  <path d="M 235 295 L 365 295 L 470 375 L 435 720 L 165 720 L 130 375 Z" fill="url(#baseUndershirt)" stroke="#475569" stroke-width="2"/>

  <!-- Pectoral & Clavicle Muscle Shading -->
  <path d="M 235 295 Q 300 330 365 295" stroke="#94a3b8" stroke-width="2" fill="none" opacity="0.6"/>
  <path d="M 300 320 L 300 560" stroke="#0f172a" stroke-width="3" opacity="0.5"/>
  <ellipse cx="230" cy="410" rx="45" ry="35" fill="url(#chestShade)"/>
  <ellipse cx="370" cy="410" rx="45" ry="35" fill="url(#chestShade)"/>
  <ellipse cx="300" cy="530" rx="80" ry="25" fill="url(#chestShade)" opacity="0.4"/>

  <!-- Athletic Neck & Clavicle -->
  <path d="M 255 240 L 345 240 L 365 310 Q 300 330 235 310 Z" fill="url(#skinNeck)"/>
  <path d="M 270 270 Q 300 300 330 270" stroke="#78350f" stroke-width="2" fill="none" opacity="0.4"/>

  <!-- Head & Facial Contour -->
  <ellipse cx="300" cy="180" rx="65" ry="85" fill="url(#skinFace)"/>
  <!-- Hair (Modern textured crop) -->
  <path d="M 230 170 Q 235 95 300 95 Q 365 95 370 170 Q 350 120 300 120 Q 250 120 230 170 Z" fill="#18181b"/>
  <!-- Facial Details -->
  <path d="M 265 170 Q 280 165 292 170" stroke="#451a03" stroke-width="2.5" fill="none"/>
  <path d="M 308 170 Q 320 165 335 170" stroke="#451a03" stroke-width="2.5" fill="none"/>
  <ellipse cx="280" cy="180" rx="4" ry="4" fill="#292524"/>
  <ellipse cx="320" cy="180" rx="4" ry="4" fill="#292524"/>
  <path d="M 300 180 L 297 205 L 306 205" stroke="#78350f" stroke-width="2" fill="none"/>
  <path d="M 285 225 Q 300 232 315 225" stroke="#78350f" stroke-width="2.5" fill="none"/>

  <!-- Studio Label Badge -->
  <g transform="translate(180, 750)">
    <rect width="240" height="26" rx="13" fill="#020617" opacity="0.8" stroke="#334155" stroke-width="1"/>
    <text x="120" y="17" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#38bdf8" text-anchor="middle" letter-spacing="2">MARCO · STRIKER (PRO FIT)</text>
  </g>
</svg>`)}`;

export const SVG_ATHLETE_FASHION = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
  <defs>
    <radialGradient id="bgFashionGrad" cx="50%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#2a1b3d"/>
      <stop offset="60%" stop-color="#140f22"/>
      <stop offset="100%" stop-color="#090511"/>
    </radialGradient>
    <linearGradient id="skinWoman" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fcd5ce"/>
      <stop offset="60%" stop-color="#e8a598"/>
      <stop offset="100%" stop-color="#c57b6f"/>
    </linearGradient>
    <linearGradient id="topUndershirt" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2d3748"/>
      <stop offset="100%" stop-color="#1a202c"/>
    </linearGradient>
  </defs>

  <rect width="600" height="800" fill="url(#bgFashionGrad)"/>

  <!-- Arms -->
  <path d="M 140 370 Q 110 470 125 610 L 175 605 Q 165 480 185 380 Z" fill="#e8a598"/>
  <path d="M 460 370 Q 490 470 475 610 L 425 605 Q 435 480 415 380 Z" fill="#c57b6f"/>

  <!-- Athletic Silhouette -->
  <path d="M 250 300 L 350 300 L 450 370 L 415 710 L 185 710 L 150 370 Z" fill="url(#topUndershirt)" stroke="#4a5568" stroke-width="2"/>

  <!-- Neck -->
  <path d="M 265 240 L 335 240 L 350 310 Q 300 325 250 310 Z" fill="url(#skinWoman)"/>

  <!-- Hair Flow -->
  <path d="M 210 160 Q 300 80 390 160 Q 410 330 375 420 Q 340 430 320 370 Q 280 370 260 420 Q 225 430 190 330 Z" fill="#1a1110"/>

  <!-- Face -->
  <ellipse cx="300" cy="190" rx="58" ry="75" fill="url(#skinWoman)"/>
  <ellipse cx="282" cy="188" rx="3.5" ry="3.5" fill="#2d3748"/>
  <ellipse cx="318" cy="188" rx="3.5" ry="3.5" fill="#2d3748"/>
  <path d="M 288 225 Q 300 233 312 225" stroke="#9b2c2c" stroke-width="3" fill="none" stroke-linecap="round"/>

  <g transform="translate(180, 750)">
    <rect width="240" height="26" rx="13" fill="#090511" opacity="0.8" stroke="#4a5568" stroke-width="1"/>
    <text x="120" y="17" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#e879f9" text-anchor="middle" letter-spacing="2">ELENA · EDITORIAL FITNESS</text>
  </g>
</svg>`)}`;

export const SVG_ATHLETE_URBAN = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
  <defs>
    <radialGradient id="bgUrbanGrad" cx="50%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#1f2937"/>
      <stop offset="60%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#030712"/>
    </radialGradient>
    <linearGradient id="skinUrbanMan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e0a96d"/>
      <stop offset="60%" stop-color="#c18341"/>
      <stop offset="100%" stop-color="#8c531b"/>
    </linearGradient>
  </defs>

  <rect width="600" height="800" fill="url(#bgUrbanGrad)"/>
  <!-- Torso & Streetwear Pose -->
  <path d="M 240 300 L 360 300 L 475 380 L 430 720 L 170 720 L 125 380 Z" fill="#18181b" stroke="#27272a" stroke-width="2"/>
  <!-- Neck -->
  <path d="M 255 240 L 345 240 L 360 310 Q 300 325 240 310 Z" fill="url(#skinUrbanMan)"/>
  <!-- Face -->
  <ellipse cx="300" cy="180" rx="64" ry="80" fill="url(#skinUrbanMan)"/>
  <!-- Hair (Fade Cut) -->
  <path d="M 235 160 Q 240 100 300 100 Q 360 100 365 160 Z" fill="#09090b"/>
  <ellipse cx="282" cy="178" rx="4" ry="4" fill="#18181b"/>
  <ellipse cx="318" cy="178" rx="4" ry="4" fill="#18181b"/>
  <path d="M 285 220 Q 300 228 315 220" stroke="#713f12" stroke-width="2.5" fill="none"/>

  <g transform="translate(180, 750)">
    <rect width="240" height="26" rx="13" fill="#030712" opacity="0.8" stroke="#374151" stroke-width="1"/>
    <text x="120" y="17" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#f59e0b" text-anchor="middle" letter-spacing="2">ALEX · RUNNER STREETWEAR</text>
  </g>
</svg>`)}`;

/* Detailed Matchday Kit Garments with Dynamic Shading & UV Layout */

export const SVG_GARMENT_MILANO = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 620" width="500" height="620">
  <defs>
    <linearGradient id="nerazzurroBase" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="50%" stop-color="#0369a1"/>
      <stop offset="100%" stop-color="#075985"/>
    </linearGradient>
    <linearGradient id="goldCrest" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
    <!-- Fabric Crease Specular Map -->
    <linearGradient id="creaseHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.15"/>
      <stop offset="40%" stop-color="#000000" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.4"/>
    </linearGradient>
  </defs>

  <!-- Jersey Torso + Curved Raglan Sleeves -->
  <path d="M 165 70 Q 250 110 335 70 L 465 160 L 415 285 L 360 240 L 375 580 Q 250 600 125 580 L 140 240 L 85 285 L 35 160 Z" fill="url(#nerazzurroBase)" stroke="#38bdf8" stroke-width="2"/>

  <!-- Vertical Iconic Stripes (Nerazzurro Snake Texture) -->
  <path d="M 215 105 L 215 585 L 245 585 L 245 108 Z" fill="#090d16"/>
  <path d="M 285 105 L 285 585 L 255 585 L 255 108 Z" fill="#090d16"/>
  <path d="M 175 140 L 175 580 L 195 580 L 195 125 Z" fill="#090d16"/>
  <path d="M 325 140 L 325 580 L 305 580 L 305 125 Z" fill="#090d16"/>

  <!-- Raglan Shoulder Seams & Gold Collar -->
  <path d="M 185 85 Q 250 145 315 85" stroke="url(#goldCrest)" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M 165 70 L 220 180" stroke="#38bdf8" stroke-width="2" opacity="0.6"/>
  <path d="M 335 70 L 280 180" stroke="#38bdf8" stroke-width="2" opacity="0.6"/>

  <!-- Team Crest Shield (Left Chest) -->
  <g transform="translate(185, 200)">
    <circle cx="20" cy="20" r="24" fill="#090d16" stroke="url(#goldCrest)" stroke-width="3"/>
    <polygon points="20,5 24,16 35,16 26,23 30,34 20,27 10,34 14,23 5,16 16,16" fill="url(#goldCrest)"/>
    <text x="20" y="38" font-family="system-ui, sans-serif" font-size="7" font-weight="900" fill="#fbbf24" text-anchor="middle">MILANO</text>
  </g>

  <!-- Technical Sponsor Badge (Right Chest) -->
  <path d="M 310 215 Q 325 200 340 215 Q 325 210 310 215 Z" fill="#ffffff"/>

  <!-- Center Sponsor Logo -->
  <rect x="160" y="315" width="180" height="42" rx="8" fill="#090d16" opacity="0.65"/>
  <text x="250" y="343" font-family="system-ui, sans-serif" font-size="20" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="4">PARAMOUNT</text>

  <!-- Number on Lower Torso -->
  <text x="250" y="495" font-family="system-ui, sans-serif" font-size="72" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">10</text>

  <!-- 3D Fabric Creases Overlay -->
  <path d="M 165 70 Q 250 110 335 70 L 465 160 L 415 285 L 360 240 L 375 580 Q 250 600 125 580 L 140 240 L 85 285 L 35 160 Z" fill="url(#creaseHighlight)"/>
</svg>`)}`;

export const SVG_GARMENT_AZZURRA = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 620" width="500" height="620">
  <defs>
    <linearGradient id="azzurraBase" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0055b3"/>
      <stop offset="50%" stop-color="#003d82"/>
      <stop offset="100%" stop-color="#002957"/>
    </linearGradient>
    <linearGradient id="goldStars" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="100%" stop-color="#ca8a04"/>
    </linearGradient>
  </defs>

  <path d="M 165 70 Q 250 110 335 70 L 465 160 L 415 285 L 360 240 L 375 580 Q 250 600 125 580 L 140 240 L 85 285 L 35 160 Z" fill="url(#azzurraBase)" stroke="#60a5fa" stroke-width="2"/>
  <!-- Gold Tricolore Collar -->
  <path d="M 195 85 Q 250 135 305 85" stroke="url(#goldStars)" stroke-width="7" fill="none" stroke-linecap="round"/>

  <!-- Gold 4 Stars Shield -->
  <g transform="translate(185, 200)">
    <path d="M 10 5 L 35 5 L 35 25 Q 22.5 40 22.5 40 Q 10 25 10 5 Z" fill="#003d82" stroke="url(#goldStars)" stroke-width="2.5"/>
    <text x="22.5" y="16" font-family="system-ui, sans-serif" font-size="8" font-weight="900" fill="#fde047" text-anchor="middle">★★★★</text>
    <text x="22.5" y="28" font-family="system-ui, sans-serif" font-size="7" font-weight="900" fill="#ffffff" text-anchor="middle">ITALIA</text>
  </g>

  <!-- Center Typography -->
  <text x="250" y="340" font-family="system-ui, sans-serif" font-size="18" font-weight="800" fill="#f8fafc" text-anchor="middle" letter-spacing="5">RINASCIMENTO</text>
  <text x="250" y="485" font-family="system-ui, sans-serif" font-size="72" font-weight="900" fill="#fde047" text-anchor="middle">7</text>
</svg>`)}`;

export const SVG_GARMENT_CYBER_HOODIE = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 620" width="500" height="620">
  <defs>
    <linearGradient id="hoodieDark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#27272a"/>
      <stop offset="50%" stop-color="#18181b"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>
  </defs>

  <path d="M 155 60 Q 250 35 345 60 L 485 170 L 425 320 L 370 265 L 385 590 L 115 590 L 130 265 L 75 320 L 15 170 Z" fill="url(#hoodieDark)" stroke="#22c55e" stroke-width="2"/>
  <!-- Neon Technical Seams -->
  <path d="M 250 110 L 250 320" stroke="#22c55e" stroke-width="3" stroke-dasharray="6,4"/>
  <circle cx="250" cy="105" r="7" fill="#22c55e"/>

  <g transform="translate(180, 310)">
    <rect width="140" height="38" rx="6" fill="#09090b" stroke="#22c55e" stroke-width="1.5"/>
    <text x="70" y="24" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="#22c55e" text-anchor="middle" letter-spacing="4">AURA // 2026</text>
  </g>
  <text x="250" y="480" font-family="system-ui, sans-serif" font-size="64" font-weight="900" fill="#ffffff" text-anchor="middle">01</text>
</svg>`)}`;
