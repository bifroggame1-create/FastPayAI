'use client'

export default function AnimatedTreeLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="30"
      height="46"
      viewBox="0 0 30 46"
      fill="none"
      style={{ overflow: 'visible' }}
      className="animate-tree-swing"
    >
      <defs>
        {/* Gradient for tree */}
        <linearGradient id="treeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
        {/* Gradient for star */}
        <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        {/* Glow filter for star */}
        <filter id="starGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Animated Star */}
      <g filter="url(#starGlow)">
        <polygon
          points="15,0 17,5 22,5 18,8 20,13 15,10 10,13 12,8 8,5 13,5"
          fill="url(#starGradient)"
        >
          <animateTransform
            attributeName="transform"
            type="scale"
            values="1;1.15;1"
            dur="1.5s"
            repeatCount="indefinite"
            additive="sum"
          />
          <animate
            attributeName="opacity"
            values="1;0.8;1"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </polygon>
      </g>

      {/* Tree tier 1 (top) */}
      <polygon
        points="15,10 22,20 8,20"
        fill="url(#treeGradient)"
      />

      {/* Tree tier 2 (middle) */}
      <polygon
        points="15,16 25,28 5,28"
        fill="url(#treeGradient)"
      />

      {/* Tree tier 3 (bottom) */}
      <polygon
        points="15,24 28,38 2,38"
        fill="url(#treeGradient)"
      />

      {/* Tree trunk */}
      <rect x="12" y="38" width="6" height="8" fill="#92400e" rx="1" />

      {/* Ornaments */}
      <circle cx="12" cy="18" r="1.5" fill="#ef4444">
        <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="18" cy="24" r="1.5" fill="#3b82f6">
        <animate attributeName="opacity" values="1;0.6;1" dur="2.3s" repeatCount="indefinite" />
      </circle>
      <circle cx="10" cy="30" r="1.5" fill="#fde047">
        <animate attributeName="opacity" values="1;0.6;1" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="20" cy="32" r="1.5" fill="#ef4444">
        <animate attributeName="opacity" values="1;0.6;1" dur="2.1s" repeatCount="indefinite" />
      </circle>
      <circle cx="14" cy="35" r="1.5" fill="#3b82f6">
        <animate attributeName="opacity" values="1;0.6;1" dur="1.9s" repeatCount="indefinite" />
      </circle>

      {/* Swing animation for entire tree */}
      <animateTransform
        attributeName="transform"
        type="rotate"
        values="-2 15 46;2 15 46;-2 15 46"
        dur="4s"
        repeatCount="indefinite"
      />
    </svg>
  )
}
