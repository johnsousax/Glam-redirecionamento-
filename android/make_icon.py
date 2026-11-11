#!/usr/bin/env python3
"""Desenha o ícone do app em pixel art 16x16 e amplia sem suavizar."""
import sys
from PIL import Image
PAL = {'.': (13, 11, 26), 'b': (139, 74, 43), 'm': (74, 36, 20), 'h': (208, 138, 74), 'o': (255, 140, 46), 'O': (255, 196, 140),
       's': (153, 84, 28), 'w': (244, 241, 222), 'p': (13, 11, 26), 'g': (255, 210, 63), 'G': (168, 107, 0), 'd': (244, 241, 222)}
ART = [
    'hhhhhhhhhhhhhhhh',
    'hbbbmbbbbmbbbbbm',
    'hb............Gm',
    'hb..GGGG......bm',
    'hm.GggggG.....bm',
    'hb.GgggwG..d..bm',
    'hb.GggggG.....mm',
    'hb.GgggwG.....bm',
    'hb.GggggG.....bm',
    'hm............bm',
    'hb...oooooo...bm',
    'hb..oOOoooooo.mm',
    'hb..owpoowpoo.bm',
    'hb..owpoowpoo.bm',
    'hb..soooooos..bm',
    'mmmmmmmmmmmmmmmm',
]
img = Image.new('RGB', (16, 16))
for y, row in enumerate(ART):
    for x, ch in enumerate(row):
        img.putpixel((x, y), PAL[ch])
img.resize((192, 192), Image.NEAREST).save(sys.argv[1])
