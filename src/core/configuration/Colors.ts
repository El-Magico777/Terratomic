import { colord, Colord, extend } from "colord";
import labPlugin from "colord/plugins/lab";
import lchPlugin from "colord/plugins/lch";

extend([lchPlugin]);
extend([labPlugin]);

export const red = colord({ h: 0, s: 82, l: 56 });
export const blue = colord({ h: 224, s: 100, l: 58 });
export const teal = colord({ h: 172, s: 66, l: 50 });
export const purple = colord({ h: 271, s: 81, l: 56 });
export const yellow = colord({ h: 45, s: 93, l: 47 });
export const orange = colord({ h: 25, s: 95, l: 53 });
export const green = colord({ h: 128, s: 49, l: 50 });
export const botColor = colord({ h: 36, s: 10, l: 80 });

export const redTeamColors: Colord[] = generateTeamColors(red);
export const blueTeamColors: Colord[] = generateTeamColors(blue);
export const tealTeamColors: Colord[] = generateTeamColors(teal);
export const purpleTeamColors: Colord[] = generateTeamColors(purple);
export const yellowTeamColors: Colord[] = generateTeamColors(yellow);
export const orangeTeamColors: Colord[] = generateTeamColors(orange);
export const greenTeamColors: Colord[] = generateTeamColors(green);
export const botTeamColors: Colord[] = [colord(botColor)];

function generateTeamColors(baseColor: Colord): Colord[] {
  const { h: baseHue, s: baseSaturation, l: baseLightness } = baseColor.toHsl();
  const colorCount = 64;

  return Array.from({ length: colorCount }, (_, index) => {
    const progression = index / (colorCount - 1);

    const saturation = baseSaturation * (1.0 - 0.3 * progression);
    const lightness = Math.min(100, baseLightness + progression * 30);

    return colord({
      h: baseHue,
      s: saturation,
      l: lightness,
    });
  });
}

export const nationColors: Colord[] = [
  colord({ r: 142, g: 87, b: 83 }),
  colord({ r: 85, g: 123, b: 147 }),
  colord({ r: 137, g: 119, b: 77 }),
  colord({ r: 120, g: 87, b: 140 }),
  colord({ r: 82, g: 119, b: 92 }),
  colord({ r: 146, g: 100, b: 120 }),
  colord({ r: 83, g: 99, b: 77 }),
  colord({ r: 142, g: 109, b: 83 }),
  colord({ r: 81, g: 98, b: 118 }),
  colord({ r: 130, g: 132, b: 84 }),
  colord({ r: 118, g: 89, b: 96 }),
  colord({ r: 85, g: 133, b: 135 }),
  colord({ r: 125, g: 103, b: 79 }),
  colord({ r: 106, g: 92, b: 118 }),
  colord({ r: 120, g: 134, b: 92 }),
  colord({ r: 130, g: 88, b: 109 }),
  colord({ r: 83, g: 95, b: 83 }),
  colord({ r: 150, g: 124, b: 120 }),
  colord({ r: 93, g: 97, b: 128 }),
  colord({ r: 118, g: 112, b: 86 }),
  colord({ r: 85, g: 125, b: 120 }),
  colord({ r: 132, g: 112, b: 134 }),
  colord({ r: 111, g: 121, b: 83 }),
  colord({ r: 88, g: 104, b: 119 }),
  colord({ r: 142, g: 104, b: 104 }),
  colord({ r: 98, g: 124, b: 147 }),
  colord({ r: 126, g: 109, b: 85 }),
  colord({ r: 118, g: 101, b: 120 }),
  colord({ r: 91, g: 130, b: 96 }),
  colord({ r: 137, g: 97, b: 97 }),
  colord({ r: 100, g: 116, b: 144 }),
  colord({ r: 122, g: 122, b: 94 }),
  colord({ r: 105, g: 95, b: 111 }),
  colord({ r: 99, g: 125, b: 99 }),
  colord({ r: 126, g: 108, b: 97 }),
  colord({ r: 100, g: 113, b: 129 }),
  colord({ r: 126, g: 121, b: 108 }),
  colord({ r: 113, g: 105, b: 127 }),
  colord({ r: 112, g: 129, b: 112 }),
  colord({ r: 128, g: 112, b: 103 }),
  colord({ r: 103, g: 109, b: 129 }),
  colord({ r: 121, g: 118, b: 99 }),
  colord({ r: 101, g: 95, b: 107 }),
  colord({ r: 115, g: 127, b: 120 }),
  colord({ r: 126, g: 109, b: 116 }),
  colord({ r: 103, g: 122, b: 117 }),
  colord({ r: 121, g: 111, b: 121 }),
  colord({ r: 111, g: 121, b: 97 }),
  colord({ r: 115, g: 110, b: 118 }),
  colord({ r: 85, g: 123, b: 147 }),
  colord({ r: 137, g: 119, b: 77 }),
  colord({ r: 120, g: 87, b: 140 }),
  colord({ r: 82, g: 119, b: 92 }),
  colord({ r: 146, g: 100, b: 120 }),
  colord({ r: 83, g: 99, b: 77 }),
  colord({ r: 142, g: 109, b: 83 }),
  colord({ r: 81, g: 98, b: 118 }),
  colord({ r: 130, g: 132, b: 84 }),
  colord({ r: 118, g: 89, b: 96 }),
  colord({ r: 85, g: 133, b: 135 }),
  colord({ r: 125, g: 103, b: 79 }),
  colord({ r: 106, g: 92, b: 118 }),
  colord({ r: 120, g: 134, b: 92 }),
  colord({ r: 130, g: 88, b: 109 }),
  colord({ r: 83, g: 95, b: 83 }),
  colord({ r: 150, g: 124, b: 120 }),
  colord({ r: 93, g: 97, b: 128 }),
  colord({ r: 118, g: 112, b: 86 }),
  colord({ r: 85, g: 125, b: 120 }),
  colord({ r: 132, g: 112, b: 134 }),
  colord({ r: 111, g: 121, b: 83 }),
  colord({ r: 88, g: 104, b: 119 }),
  colord({ r: 142, g: 104, b: 104 }),
  colord({ r: 98, g: 124, b: 147 }),
  colord({ r: 126, g: 109, b: 85 }),
  colord({ r: 118, g: 101, b: 120 }),
  colord({ r: 91, g: 130, b: 96 }),
  colord({ r: 137, g: 97, b: 97 }),
  colord({ r: 100, g: 116, b: 144 }),
  colord({ r: 122, g: 122, b: 94 }),
  colord({ r: 105, g: 95, b: 111 }),
  colord({ r: 99, g: 125, b: 99 }),
  colord({ r: 126, g: 108, b: 97 }),
  colord({ r: 100, g: 113, b: 129 }),
  colord({ r: 126, g: 121, b: 108 }),
  colord({ r: 113, g: 105, b: 127 }),
  colord({ r: 112, g: 129, b: 112 }),
  colord({ r: 128, g: 112, b: 103 }),
  colord({ r: 103, g: 109, b: 129 }),
  colord({ r: 121, g: 118, b: 99 }),
  colord({ r: 101, g: 95, b: 107 }),
  colord({ r: 115, g: 127, b: 120 }),
  colord({ r: 126, g: 109, b: 116 }),
  colord({ r: 103, g: 122, b: 117 }),
  colord({ r: 121, g: 111, b: 121 }),
  colord({ r: 111, g: 121, b: 97 }),
  colord({ r: 115, g: 110, b: 118 }),
];

// Bright pastel theme with 64 colors
export const humanColors: Colord[] = [
  colord({ r: 68, g: 122, b: 98 }),
  colord({ r: 79, g: 131, b: 90 }),
  colord({ r: 87, g: 141, b: 127 }),
  colord({ r: 69, g: 115, b: 117 }),
  colord({ r: 89, g: 143, b: 116 }),
  colord({ r: 70, g: 137, b: 167 }),
  colord({ r: 71, g: 108, b: 166 }),
  colord({ r: 94, g: 134, b: 91 }),
  colord({ r: 93, g: 160, b: 110 }),
  colord({ r: 81, g: 79, b: 157 }),
  colord({ r: 99, g: 134, b: 110 }),
  colord({ r: 90, g: 129, b: 174 }),
  colord({ r: 91, g: 148, b: 177 }),
  colord({ r: 113, g: 172, b: 141 }),
  colord({ r: 118, g: 86, b: 160 }),
  colord({ r: 128, g: 171, b: 190 }),
  colord({ r: 121, g: 148, b: 68 }),
  colord({ r: 112, g: 97, b: 68 }),
  colord({ r: 134, g: 188, b: 148 }),
  colord({ r: 126, g: 83, b: 162 }),
  colord({ r: 132, g: 161, b: 186 }),
  colord({ r: 152, g: 204, b: 157 }),
  colord({ r: 142, g: 168, b: 76 }),
  colord({ r: 142, g: 118, b: 175 }),
  colord({ r: 143, g: 100, b: 178 }),
  colord({ r: 147, g: 126, b: 190 }),
  colord({ r: 169, g: 212, b: 173 }),
  colord({ r: 151, g: 97, b: 187 }),
  colord({ r: 156, g: 124, b: 189 }),
  colord({ r: 144, g: 112, b: 65 }),
  colord({ r: 168, g: 187, b: 195 }),
  colord({ r: 171, g: 171, b: 196 }),
  colord({ r: 148, g: 92, b: 170 }),
  colord({ r: 126, g: 69, b: 69 }),
  colord({ r: 179, g: 180, b: 201 }),
  colord({ r: 183, g: 197, b: 198 }),
  colord({ r: 189, g: 204, b: 167 }),
  colord({ r: 191, g: 209, b: 199 }),
  colord({ r: 190, g: 180, b: 197 }),
  colord({ r: 139, g: 93, b: 67 }),
  colord({ r: 162, g: 132, b: 69 }),
  colord({ r: 146, g: 96, b: 96 }),
  colord({ r: 154, g: 98, b: 135 }),
  colord({ r: 148, g: 94, b: 89 }),
  colord({ r: 188, g: 167, b: 201 }),
  colord({ r: 197, g: 196, b: 158 }),
  colord({ r: 170, g: 119, b: 147 }),
  colord({ r: 158, g: 104, b: 101 }),
  colord({ r: 164, g: 129, b: 72 }),
  colord({ r: 164, g: 109, b: 107 }),
  colord({ r: 162, g: 109, b: 67 }),
  colord({ r: 202, g: 165, b: 168 }),
  colord({ r: 201, g: 199, b: 156 }),
  colord({ r: 187, g: 111, b: 115 }),
  colord({ r: 179, g: 126, b: 78 }),
  colord({ r: 171, g: 143, b: 70 }),
  colord({ r: 204, g: 177, b: 186 }),
  colord({ r: 196, g: 138, b: 131 }),
  colord({ r: 182, g: 160, b: 87 }),
  colord({ r: 196, g: 137, b: 137 }),
  colord({ r: 205, g: 156, b: 172 }),
  colord({ r: 202, g: 177, b: 141 }),
  colord({ r: 205, g: 189, b: 148 }),
  colord({ r: 206, g: 160, b: 172 }),
];

export const botColors: Colord[] = [
  colord({ r: 101, g: 91, b: 94 }),
  colord({ r: 88, g: 100, b: 109 }),
  colord({ r: 100, g: 98, b: 89 }),
  colord({ r: 96, g: 91, b: 107 }),
  colord({ r: 81, g: 97, b: 92 }),
  colord({ r: 102, g: 94, b: 102 }),
  colord({ r: 80, g: 89, b: 83 }),
  colord({ r: 101, g: 96, b: 94 }),
  colord({ r: 79, g: 86, b: 96 }),
  colord({ r: 93, g: 97, b: 92 }),
  colord({ r: 98, g: 92, b: 96 }),
  colord({ r: 85, g: 95, b: 98 }),
  colord({ r: 98, g: 94, b: 86 }),
  colord({ r: 86, g: 87, b: 100 }),
  colord({ r: 92, g: 96, b: 88 }),
  colord({ r: 99, g: 93, b: 97 }),
  colord({ r: 86, g: 92, b: 88 }),
  colord({ r: 107, g: 103, b: 106 }),
  colord({ r: 83, g: 86, b: 103 }),
  colord({ r: 101, g: 100, b: 90 }),
  colord({ r: 86, g: 101, b: 99 }),
  colord({ r: 101, g: 98, b: 105 }),
  colord({ r: 94, g: 99, b: 87 }),
  colord({ r: 86, g: 90, b: 95 }),
  colord({ r: 107, g: 98, b: 100 }),
  colord({ r: 85, g: 95, b: 103 }),
  colord({ r: 102, g: 97, b: 90 }),
  colord({ r: 91, g: 87, b: 103 }),
  colord({ r: 87, g: 101, b: 88 }),
  colord({ r: 103, g: 95, b: 96 }),
  colord({ r: 85, g: 94, b: 104 }),
  colord({ r: 103, g: 101, b: 94 }),
  colord({ r: 88, g: 89, b: 95 }),
  colord({ r: 90, g: 101, b: 92 }),
  colord({ r: 103, g: 95, b: 90 }),
  colord({ r: 84, g: 93, b: 104 }),
  colord({ r: 97, g: 100, b: 97 }),
  colord({ r: 90, g: 90, b: 101 }),
  colord({ r: 92, g: 101, b: 93 }),
  colord({ r: 98, g: 95, b: 92 }),
  colord({ r: 90, g: 93, b: 100 }),
  colord({ r: 100, g: 99, b: 93 }),
  colord({ r: 89, g: 89, b: 92 }),
  colord({ r: 94, g: 101, b: 100 }),
  colord({ r: 99, g: 95, b: 99 }),
  colord({ r: 90, g: 102, b: 97 }),
  colord({ r: 100, g: 100, b: 101 }),
  colord({ r: 95, g: 101, b: 93 }),
  colord({ r: 94, g: 94, b: 99 }),
];

// Fallback colors for when the color palette is exhausted. Currently 100 colors.
export const fallbackColors: Colord[] = [
  colord({ r: 0, g: 5, b: 0 }), // Black Mint
  colord({ r: 0, g: 15, b: 0 }), // Deep Forest
  colord({ r: 0, g: 25, b: 0 }), // Jungle
  colord({ r: 0, g: 35, b: 0 }), // Dark Emerald
  colord({ r: 0, g: 45, b: 0 }), // Green Moss
  colord({ r: 0, g: 55, b: 0 }), // Moss Shadow
  colord({ r: 0, g: 65, b: 0 }), // Dark Meadow
  colord({ r: 0, g: 75, b: 0 }), // Forest Fern
  colord({ r: 0, g: 85, b: 0 }), // Pine Leaf
  colord({ r: 0, g: 95, b: 0 }), // Shadow Grass
  colord({ r: 0, g: 105, b: 0 }), // Classic Green
  colord({ r: 0, g: 115, b: 0 }), // Deep Lime
  colord({ r: 0, g: 125, b: 0 }), // Dense Leaf
  colord({ r: 0, g: 135, b: 0 }), // Basil Green
  colord({ r: 0, g: 145, b: 0 }), // Organic Green
  colord({ r: 0, g: 155, b: 0 }), // Bitter Herb
  colord({ r: 0, g: 165, b: 0 }), // Raw Spinach
  colord({ r: 0, g: 175, b: 0 }), // Woodland
  colord({ r: 0, g: 185, b: 0 }), // Spring Weed
  colord({ r: 0, g: 195, b: 5 }), // Apple Stem
  colord({ r: 0, g: 205, b: 10 }), // Crisp Lettuce
  colord({ r: 0, g: 215, b: 15 }), // Vibrant Green
  colord({ r: 0, g: 225, b: 20 }), // Bright Herb
  colord({ r: 0, g: 235, b: 25 }), // Green Splash
  colord({ r: 0, g: 245, b: 30 }), // Mint Leaf
  colord({ r: 0, g: 255, b: 35 }), // Fresh Mint
  colord({ r: 10, g: 255, b: 45 }), // Neon Grass
  colord({ r: 20, g: 255, b: 55 }), // Lemon Balm
  colord({ r: 30, g: 255, b: 65 }), // Juicy Green
  colord({ r: 40, g: 255, b: 75 }), // Pear Tint
  colord({ r: 50, g: 255, b: 85 }), // Avocado Pastel
  colord({ r: 60, g: 255, b: 95 }), // Lime Glow
  colord({ r: 70, g: 255, b: 105 }), // Light Leaf
  colord({ r: 80, g: 255, b: 115 }), // Soft Fern
  colord({ r: 90, g: 255, b: 125 }), // Pastel Green
  colord({ r: 100, g: 255, b: 135 }), // Green Melon
  colord({ r: 110, g: 255, b: 145 }), // Herbal Mist
  colord({ r: 120, g: 255, b: 155 }), // Kiwi Foam
  colord({ r: 130, g: 255, b: 165 }), // Aloe Fresh
  colord({ r: 140, g: 255, b: 175 }), // Light Mint
  colord({ r: 150, g: 200, b: 255 }), // Cornflower Mist
  colord({ r: 150, g: 255, b: 185 }), // Green Sorbet
  colord({ r: 160, g: 215, b: 255 }), // Powder Blue
  colord({ r: 160, g: 255, b: 195 }), // Pastel Apple
  colord({ r: 170, g: 190, b: 255 }), // Periwinkle Ice
  colord({ r: 170, g: 225, b: 255 }), // Baby Sky
  colord({ r: 170, g: 255, b: 205 }), // Aloe Breeze
  colord({ r: 180, g: 180, b: 255 }), // Pale Indigo
  colord({ r: 180, g: 235, b: 250 }), // Aqua Pastel
  colord({ r: 180, g: 255, b: 215 }), // Pale Mint
  colord({ r: 190, g: 140, b: 195 }), // Fuchsia Tint
  colord({ r: 190, g: 245, b: 240 }), // Ice Mint
  colord({ r: 190, g: 255, b: 225 }), // Mint Water
  colord({ r: 195, g: 145, b: 200 }), // Dusky Rose
  colord({ r: 200, g: 150, b: 205 }), // Plum Frost
  colord({ r: 200, g: 170, b: 255 }), // Lilac Bloom
  colord({ r: 200, g: 255, b: 215 }), // Cool Aloe
  colord({ r: 200, g: 255, b: 235 }), // Cool Mist
  colord({ r: 205, g: 155, b: 210 }), // Berry Foam
  colord({ r: 210, g: 160, b: 215 }), // Grape Cloud
  colord({ r: 210, g: 255, b: 245 }), // Sea Mist
  colord({ r: 215, g: 165, b: 220 }), // Light Bloom
  colord({ r: 215, g: 255, b: 200 }), // Fresh Mint
  colord({ r: 220, g: 160, b: 255 }), // Violet Mist
  colord({ r: 220, g: 170, b: 225 }), // Cherry Blossom
  colord({ r: 220, g: 255, b: 255 }), // Pale Aqua
  colord({ r: 225, g: 175, b: 230 }), // Faded Rose
  colord({ r: 225, g: 255, b: 175 }), // Soft Lime
  colord({ r: 230, g: 180, b: 235 }), // Dreamy Mauve
  colord({ r: 230, g: 250, b: 255 }), // Sky Haze
  colord({ r: 235, g: 150, b: 255 }), // Orchid Glow
  colord({ r: 235, g: 185, b: 240 }), // Powder Violet
  colord({ r: 240, g: 190, b: 245 }), // Pastel Violet
  colord({ r: 240, g: 240, b: 255 }), // Frosted Lilac
  colord({ r: 240, g: 250, b: 160 }), // Citrus Wash
  colord({ r: 245, g: 160, b: 240 }), // Rose Lilac
  colord({ r: 245, g: 195, b: 250 }), // Soft Magenta
  colord({ r: 245, g: 245, b: 175 }), // Lemon Mist
  colord({ r: 250, g: 200, b: 255 }), // Lilac Cream
  colord({ r: 250, g: 230, b: 255 }), // Misty Mauve
  colord({ r: 255, g: 170, b: 225 }), // Bubblegum Pink
  colord({ r: 255, g: 185, b: 215 }), // Blush Mist
  colord({ r: 255, g: 195, b: 235 }), // Faded Fuchsia
  colord({ r: 255, g: 200, b: 220 }), // Cotton Rose
  colord({ r: 255, g: 205, b: 245 }), // Pastel Orchid
  colord({ r: 255, g: 205, b: 255 }), // Violet Bloom
  colord({ r: 255, g: 210, b: 230 }), // Pastel Blush
  colord({ r: 255, g: 210, b: 250 }), // Lavender Mist
  colord({ r: 255, g: 210, b: 255 }), // Orchid Mist
  colord({ r: 255, g: 215, b: 195 }), // Apricot Glow
  colord({ r: 255, g: 215, b: 245 }), // Rose Whisper
  colord({ r: 255, g: 220, b: 235 }), // Pink Mist
  colord({ r: 255, g: 220, b: 250 }), // Powder Petal
  colord({ r: 255, g: 225, b: 180 }), // Butter Peach
  colord({ r: 255, g: 225, b: 255 }), // Petal Mist
  colord({ r: 255, g: 230, b: 245 }), // Light Rose
  colord({ r: 255, g: 235, b: 200 }), // Cream Peach
  colord({ r: 255, g: 235, b: 235 }), // Blushed Petal
  colord({ r: 255, g: 240, b: 220 }), // Pastel Sand
  colord({ r: 255, g: 245, b: 210 }), // Soft Banana
];
