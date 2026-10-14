#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成 PWA 图标（public/icon-192.png / icon-512.png）。

图案：洛书九宫（3×3，数字 4 9 2 / 3 5 7 / 8 1 6），每宫以圆点数出该宫之数，
中五（5）反白突出。不依赖 Pillow / 字体 —— 纯 zlib + struct 手写 PNG 编码，
保证任何机器上 `python tools/make_icons.py` 都能复现出一致结果。

用法：python tools/make_icons.py
"""
import os
import struct
import zlib

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public')

BG = (0x0F, 0x6E, 0x56)      # --accent 深青绿
BG_DEEP = (0x0B, 0x53, 0x43)  # 外圈压深，形成层次
INK = (0xF7, 0xF6, 0xF2)      # --bg 米白
MID = (0xF7, 0xF6, 0xF2)      # 中五反白

LUOSHU = [[4, 9, 2], [3, 5, 7], [8, 1, 6]]


def _crc(data):
    return struct.pack('>I', zlib.crc32(data) & 0xFFFFFFFF)


def _chunk(tag, data):
    return struct.pack('>I', len(data)) + tag + data + _crc(tag + data)


def write_png(path, px, w, h):
    """px: bytearray RGB，长度 w*h*3"""
    raw = bytearray()
    stride = w * 3
    for y in range(h):
        raw.append(0)                      # filter type 0 (None)
        raw.extend(px[y * stride:(y + 1) * stride])
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)   # 8bit, truecolor
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(_chunk(b'IHDR', ihdr))
        f.write(_chunk(b'IDAT', zlib.compress(bytes(raw), 9)))
        f.write(_chunk(b'IEND', b''))


def render(size):
    px = bytearray([0]) * (size * size * 3)
    for i in range(0, len(px), 3):
        px[i], px[i + 1], px[i + 2] = BG
    S = size

    def fill_rect(x0, y0, x1, y1, color):
        for y in range(max(0, y0), min(S, y1)):
            base = y * S * 3
            for x in range(max(0, x0), min(S, x1)):
                o = base + x * 3
                px[o], px[o + 1], px[o + 2] = color

    def disc(cx, cy, r, color):
        for y in range(int(cy - r), int(cy + r) + 1):
            for x in range(int(cx - r), int(cx + r) + 1):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                    if 0 <= x < S and 0 <= y < S:
                        o = (y * S + x) * 3
                        px[o], px[o + 1], px[o + 2] = color

    # 外圈压深（圆角方框），内圈留出主色
    pad = int(S * 0.055)
    fill_rect(pad, pad, S - pad, S - pad, BG_DEEP)
    inner = int(S * 0.105)
    fill_rect(inner, inner, S - inner, S - inner, BG)

    # 3×3 九宫：宫间距即白缝
    g0, g1 = int(S * 0.135), int(S * 0.865)
    gap = max(2, int(S * 0.016))
    cw = (g1 - g0 - 2 * gap) // 3
    for r in range(3):
        for c in range(3):
            x0 = g0 + c * (cw + gap)
            y0 = g0 + r * (cw + gap)
            n = LUOSHU[r][c]
            if n == 5:
                # 中五整宫反白
                fill_rect(x0, y0, x0 + cw, y0 + cw, MID)
                disc(x0 + cw / 2, y0 + cw / 2, cw * 0.20, BG)
            else:
                # 以圆点数出该宫之数（最多 3 列）
                cols = 3 if n > 3 else 2
                rows = (n + cols - 1) // cols
                dr = max(2.0, cw * 0.085)
                stepx = cw * 0.24
                stepy = cw * 0.26
                ox = x0 + cw / 2 - (cols - 1) * stepx / 2
                oy = y0 + cw / 2 - (rows - 1) * stepy / 2
                k = 0
                for rr in range(rows):
                    for cc in range(cols):
                        if k >= n:
                            break
                        disc(ox + cc * stepx, oy + rr * stepy, dr, INK)
                        k += 1
    return px


def main():
    if not os.path.isdir(OUT_DIR):
        raise SystemExit('找不到 public 目录：' + OUT_DIR)
    for size in (192, 512):
        path = os.path.join(OUT_DIR, 'icon-%d.png' % size)
        write_png(path, render(size), size, size)
        print('written', path, os.path.getsize(path), 'bytes')


if __name__ == '__main__':
    main()
