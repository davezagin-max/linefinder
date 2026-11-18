/** Hero illustration: a mountain range at sunrise with a winding run and trail signs. */
export function SunriseMountains({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1440 620" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="sr-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9CC3EC" />
          <stop offset="0.48" stopColor="#F8D3C4" />
          <stop offset="0.8" stopColor="#FFE6CF" />
        </linearGradient>
        <radialGradient id="sr-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFB073" />
          <stop offset="0.55" stopColor="#FF9F5A" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FF9F5A" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sr-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B9CDE6" />
          <stop offset="1" stopColor="#D9E6F3" />
        </linearGradient>
        <linearGradient id="sr-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7FA3CF" />
          <stop offset="1" stopColor="#A9C3E2" />
        </linearGradient>
      </defs>

      <rect width="1440" height="620" fill="url(#sr-sky)" />
      <circle cx="1060" cy="300" r="190" fill="url(#sr-sun)" />
      <circle cx="1060" cy="300" r="62" fill="#FF9F5A" opacity="0.9" />

      {/* Far range */}
      <path d="M0 360 L120 250 L210 310 L330 190 L450 300 L560 230 L700 320 L820 210 L960 330 L1080 240 L1200 320 L1320 220 L1440 300 V620 H0Z" fill="url(#sr-far)" />

      {/* Mid range with snow caps */}
      <path d="M0 430 L160 300 L260 380 L420 230 L560 370 L690 290 L860 420 L1010 260 L1170 400 L1300 320 L1440 390 V620 H0Z" fill="url(#sr-mid)" />
      <g fill="#FAFCFF">
        <path d="M420 230 L462 270 L446 266 L430 280 L414 266 L396 272Z" />
        <path d="M1010 260 L1052 300 L1035 296 L1018 310 L1002 297 L984 303Z" />
        <path d="M160 300 L190 324 L178 322 L166 332 L154 323 L140 327Z" />
        <path d="M690 290 L716 312 L704 310 L694 318 L683 310 L670 313Z" />
      </g>

      {/* Front slope with the run */}
      <path d="M0 520 Q240 430 520 470 T1060 440 T1440 470 V620 H0Z" fill="#EAF3FB" />
      <path
        d="M1320 452 C 1180 470, 1150 500, 1010 500 S 820 470, 720 510 S 520 560, 380 540 S 160 560, 60 600"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="34"
        strokeLinecap="round"
      />
      <path
        d="M1320 452 C 1180 470, 1150 500, 1010 500 S 820 470, 720 510 S 520 560, 380 540 S 160 560, 60 600"
        fill="none"
        stroke="#C4DAEF"
        strokeWidth="2"
        strokeDasharray="6 10"
      />

      {/* Pines */}
      <g fill="#1F5F3F">
        {[
          [90, 520, 1], [130, 528, 0.8], [600, 470, 0.9], [640, 478, 1.1], [1190, 438, 0.9], [1230, 446, 1.2], [1380, 470, 0.8],
        ].map(([x = 0, y = 0, s = 1], i) => (
          <path key={i} d={`M${x} ${y - 46 * s} L${x + 16 * s} ${y} L${x - 16 * s} ${y}Z`} />
        ))}
      </g>

      {/* Trail signs along the run */}
      <g>
        <line x1="1180" y1="448" x2="1180" y2="482" stroke="#3D4B5C" strokeWidth="3" />
        <circle cx="1180" cy="440" r="13" fill="#2E9E4F" stroke="#fff" strokeWidth="3" />
        <line x1="860" y1="466" x2="860" y2="500" stroke="#3D4B5C" strokeWidth="3" />
        <rect x="847" y="445" width="26" height="26" rx="3" fill="#1F6FD1" stroke="#fff" strokeWidth="3" />
        <line x1="520" y1="512" x2="520" y2="546" stroke="#3D4B5C" strokeWidth="3" />
        <rect x="508" y="492" width="22" height="22" rx="2" transform="rotate(45 519 503)" fill="#111" stroke="#fff" strokeWidth="3" />
      </g>

      {/* Little skier carving the run */}
      <g transform="translate(940 478) rotate(-8)">
        <path d="M-26 22 L26 14" stroke="#1E3A5F" strokeWidth="4" strokeLinecap="round" />
        <circle cx="4" cy="-22" r="7" fill="#FF6B2C" />
        <path d="M2 -14 L-4 4 L8 16 M-4 4 L-12 16 M0 -8 L14 -2 M0 -8 L-12 -4" stroke="#1E3A5F" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M-60 26 Q-40 18 -24 20" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
      </g>
    </svg>
  );
}
