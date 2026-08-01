import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';

export function CherryBackground() {
  const { width } = useWindowDimensions();
  // ~9% of screen width (~72px grid squares to add more grids across the screen)
  const gridSize = Math.max(64, Math.round((width || 390) * 0.09));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          {/* Large Grid Square (15% of viewport width) */}
          <Pattern id="notebookGrid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <Path
              d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
              fill="none"
              stroke="#FFE4EB"
              strokeWidth="1.8"
              strokeOpacity="0.45"
            />
          </Pattern>
        </Defs>

        {/* Solid #F63E5F Base Background throughout entire page */}
        <Rect width="100%" height="100%" fill="#F63E5F" />

        {/* Infinite Flowing Pale Pink Grid */}
        <Rect width="100%" height="100%" fill="url(#notebookGrid)" />
      </Svg>
    </View>
  );
}

