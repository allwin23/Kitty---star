import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Pattern, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

export function CherryBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          {/* Layer 1 — Vertical Cherry Gradient */}
          <LinearGradient id="cherryGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#C73A57" stopOpacity="0.95" />
            <Stop offset="28%" stopColor="#D95A79" stopOpacity="0.75" />
            <Stop offset="65%" stopColor="#F8D6DE" stopOpacity="0.85" />
            <Stop offset="100%" stopColor="#FFF7F8" stopOpacity="1.0" />
          </LinearGradient>

          {/* Layer 2 — Notebook Grid (24px x 24px) */}
          <Pattern id="notebookGrid" width="24" height="24" patternUnits="userSpaceOnUse">
            <Path
              d="M 24 0 L 0 0 0 24"
              fill="none"
              stroke="#FAD7E0"
              strokeWidth="1"
              strokeOpacity="0.5"
            />
          </Pattern>

          {/* Grid Fade Overlay (fades grid toward bottom) */}
          <LinearGradient id="gridFadeMask" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.08" />
            <Stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.02" />
          </LinearGradient>

          {/* Layer 3 — Ambient Light (Top Left Glow) */}
          <RadialGradient id="ambientTopLeft" cx="10%" cy="10%" r="55%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
          </RadialGradient>

          {/* Layer 3 — Ambient Light (Bottom Right Glow) */}
          <RadialGradient id="ambientBottomRight" cx="90%" cy="90%" r="60%">
            <Stop offset="0%" stopColor="#FFE4EB" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#FFE4EB" stopOpacity="0.0" />
          </RadialGradient>
        </Defs>

        {/* Base Layer 1: Vertical Cherry Gradient */}
        <Rect width="100%" height="100%" fill="url(#cherryGradient)" />

        {/* Layer 2: Notebook Grid */}
        <Rect width="100%" height="100%" fill="url(#notebookGrid)" opacity={0.6} />
        {/* Soft Grid overlay for paper feel */}
        <Rect width="100%" height="100%" fill="url(#gridFadeMask)" />

        {/* Layer 3: Ambient Radial Glows */}
        <Rect width="100%" height="100%" fill="url(#ambientTopLeft)" />
        <Rect width="100%" height="100%" fill="url(#ambientBottomRight)" />
      </Svg>
    </View>
  );
}
