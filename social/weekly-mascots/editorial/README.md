# Editorial carousel mascots

The live weekly carousel renderer uses one consistent mascot family per week:
the eight `vinyl/pose-*.png` variations for 28 September–4 October and the
eight `guitar/pose-*.png` variations for 5–11 October. Each slide selects a
different pose and placement so the character presents or points towards that
slide's information rather than repeating a static cutout.

The artist-specific files in this directory are retained as source material for
future editorial formats, but are no longer used by `social/weekly/render.mjs`.

These assets are exclusively for Instagram/editorial carousels. The 404 mascots
and their production files are a separate, immutable set and must not be
overwritten by this workflow.

## Generation mode

OpenAI ImageGen, built-in/default generation mode.

## Shared prompt

Create one happy anthropomorphic music mascot as a genuinely transparent PNG,
matching O Desvio's approved hand-inked vintage editorial style. Use only black,
warm cream, coral and restrained muted gold. Keep thick black outlines, subtle
print texture, expressive cartoon gloves and black high-top sneakers. Full body,
isolated cutout, no background, no glow, no scenery, no words, no logos, no
detached decorative marks and no yellow/gold dash or exclamation-like stroke.
The character must actively gesture toward the information area of the card.
Do not modify or imitate any 404 production asset; create a separate social-only
sibling illustration.

## Artist-specific variants

| Asset | Character and cue |
| --- | --- |
| `placebo.png` | Vinyl mascot, slim black tie, eyeliner and coral guitar pick |
| `blood-red-shoes.png` | Vinyl mascot, coral high-tops and energetic dance kick |
| `out-fest.png` | Vinyl mascot, headphones and compact sampler |
| `faro-alternativo.png` | Vinyl mascot, coral wristband and rock-hand gesture |
| `mxgpu.png` | Vinyl mascot performing on a compact DJ controller |
| `evanescence.png` | Vinyl mascot with vintage microphone and coral wrist ribbon |
| `grant-lee-phillips.png` | Guitar mascot with harmonica holder and folk neck scarf |
| `rui-massena.png` | Guitar mascot seated at a small black piano |
| `midori-hirano.png` | Guitar mascot with headphones and compact synthesizer |
| `fatal-move-outta-spite-nopath.png` | Guitar mascot in a joyful hardcore jump with wired mic |
| `dire-straits-legacy.png` | Guitar mascot finger-picking, with a slim headband |
| `luis-lapa.png` | Guitar mascot on a stool with a small songwriter notebook |
| `vinyl-cover.png` | Vinyl host pointing to the headline and holding a coral ticket |
| `vinyl-recap.png` | Vinyl host presenting the recap and holding a six-dot calendar |
| `guitar-cover.png` | Guitar host pointing to the headline and holding a coral ticket |
| `guitar-recap.png` | Guitar host presenting the recap and holding a six-dot calendar |

Each variant was generated with the shared prompt plus its cue. Direction is
resolved in the renderer: right-side mascots point up-left; selected assets are
mirrored and placed left so they point up-right toward a matching right-aligned
text block.
