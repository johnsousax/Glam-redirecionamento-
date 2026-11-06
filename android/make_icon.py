#!/usr/bin/env python3
"""Desenha o ícone do app (o bonequinho do jogo num fundo índigo)."""
import sys
from PIL import Image, ImageDraw, ImageFilter
S = 512
img = Image.new('RGBA', (S, S), (11, 8, 32, 255))
glow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
g = ImageDraw.Draw(glow)
# moldura de labirinto neon
for r in [(40, 40, 472, 472)]:
    g.rounded_rectangle(r, 70, outline=(86, 240, 255, 255), width=22)
g.rectangle((40, 300, 190, 322), fill=(86, 240, 255, 255))
g.rectangle((322, 160, 472, 182), fill=(86, 240, 255, 255))
blur = glow.filter(ImageFilter.GaussianBlur(14))
img.alpha_composite(blur); img.alpha_composite(glow)
d = ImageDraw.Draw(img)
# portal dourado
d.ellipse((330, 70, 420, 160), outline=(255, 209, 102, 255), width=12)
# bonequinho
blob = Image.new('RGBA', (S, S), (0, 0, 0, 0)); b = ImageDraw.Draw(blob)
b.rounded_rectangle((150, 190, 350, 390), 64, fill=(255, 122, 89, 255))
bg = blob.filter(ImageFilter.GaussianBlur(18)); img.alpha_composite(bg); img.alpha_composite(blob)
d = ImageDraw.Draw(img)
d.rounded_rectangle((180, 212, 290, 236), 12, fill=(255, 255, 255, 70))
for cx in (205, 295):
    d.ellipse((cx - 30, 255, cx + 30, 315), fill=(255, 255, 255, 255))
    d.ellipse((cx - 14, 262, cx + 18, 294), fill=(18, 10, 42, 255))
img.convert('RGB').resize((192, 192), Image.LANCZOS).save(sys.argv[1], optimize=True)
