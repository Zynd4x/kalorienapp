import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { encodeBarcode } from '../lib/barcode';
import { colors, radius, spacing } from '../theme';
import type { BarcodeType } from '../types';

interface BarcodeProps {
  value: string;
  type?: BarcodeType;
  height?: number;
}

const QUIET_ZONE = 10;

export function Barcode({ value, type = 'auto', height = 64 }: BarcodeProps) {
  const encoded = useMemo(() => encodeBarcode(value, type), [value, type]);

  if (!encoded) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>
          Für diese Nummer lässt sich kein Barcode erzeugen. Nenne sie an der
          Kasse oder nutze die App des Marktes.
        </Text>
      </View>
    );
  }

  const total = encoded.modules.length + QUIET_ZONE * 2;
  const bars: { x: number; width: number }[] = [];

  let index = 0;
  while (index < encoded.modules.length) {
    if (encoded.modules[index] === '1') {
      let width = 1;
      while (
        index + width < encoded.modules.length &&
        encoded.modules[index + width] === '1'
      ) {
        width += 1;
      }
      bars.push({ x: QUIET_ZONE + index, width });
      index += width;
    } else {
      index += 1;
    }
  }

  return (
    <View style={styles.wrap}>
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${total} 1`}
        preserveAspectRatio="none"
      >
        <Rect x={0} y={0} width={total} height={1} fill={colors.white} />
        {bars.map((bar, barIndex) => (
          <Rect
            key={barIndex}
            x={bar.x}
            y={0}
            width={bar.width}
            height={1}
            fill={colors.black}
          />
        ))}
      </Svg>
      <Text style={styles.human}>{encoded.human}</Text>
      <Text style={styles.format}>{encoded.format}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    gap: 2,
  },
  human: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.text,
  },
  format: {
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '600',
    color: colors.muted,
  },
  fallback: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  fallbackText: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
  },
});
