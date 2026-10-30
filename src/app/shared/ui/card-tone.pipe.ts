import { Pipe, PipeTransform } from '@angular/core';

export type CardTone = 'blue' | 'green' | 'teal' | 'orange' | 'pink' | 'purple';

@Pipe({ name: 'cardTone' })
export class CardTonePipe implements PipeTransform {
  transform(color: string | undefined | null): CardTone {
    const hex = (color ?? '').replace('#', '').trim();
    if (!/^[\da-f]{6}$/i.test(hex)) return 'blue';
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b);
    const delta = max - Math.min(r, g, b);
    if (!delta) return 'blue';
    const hue =
      (60 * (max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) +
        360) %
      360;
    return hue < 20 || hue >= 315
      ? 'pink'
      : hue < 65
        ? 'orange'
        : hue < 170
          ? 'green'
          : hue < 200
            ? 'teal'
            : hue < 265
              ? 'blue'
              : 'purple';
  }
}
