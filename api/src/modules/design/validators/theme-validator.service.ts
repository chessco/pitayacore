import { Injectable } from '@nestjs/common';

@Injectable()
export class ThemeValidatorService {
  private getLuminance(hex: string): number {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

    const a = [r, g, b].map((v) => {
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });

    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  getContrastRatio(hex1: string, hex2: string): number {
    const l1 = this.getLuminance(hex1);
    const l2 = this.getLuminance(hex2);

    const brightest = Math.max(l1, l2);
    const darkest = Math.min(l1, l2);

    return (brightest + 0.05) / (darkest + 0.05);
  }

  validateThemeAccessibility(tokens: any[]): any {
    const primary =
      tokens.find((t) => t.name === 'primary')?.value || '#000000';
    const background =
      tokens.find((t) => t.name === 'background')?.value || '#ffffff';
    const textPrimary =
      tokens.find((t) => t.name === 'text-primary')?.value || '#000000';

    // Contrast between text-primary and background
    const textBgRatio = this.getContrastRatio(textPrimary, background);

    // Contrast between primary color and background
    const primaryBgRatio = this.getContrastRatio(primary, background);

    return {
      textToBackground: {
        ratio: parseFloat(textBgRatio.toFixed(2)),
        wcagAA: textBgRatio >= 4.5,
        wcagAAA: textBgRatio >= 7.0,
      },
      primaryToBackground: {
        ratio: parseFloat(primaryBgRatio.toFixed(2)),
        wcagAA: primaryBgRatio >= 3.0, // Large text or UI component requirements
        wcagAAA: primaryBgRatio >= 4.5,
      },
      isValid: textBgRatio >= 4.5,
    };
  }
}
