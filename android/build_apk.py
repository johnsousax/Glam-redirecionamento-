#!/usr/bin/env python3
"""Monta o APK do Fuga Neon sem o Android SDK.

Escreve o AndroidManifest.xml binário (AXML), um resources.arsc com o ícone e
um zip alinhado. A compilação Java (javac + dx) e a assinatura (apksig) ficam
no build.sh.

Uso: build_apk.py <classes.dex> <icone.png> <pasta_assets> <saida.apk> <versionCode> <versionName>
"""
import struct
import sys
import zlib
from pathlib import Path

PACKAGE = 'com.fuganeon.app'
LABEL = 'Fuga Neon'
MIN_SDK, TARGET_SDK = 24, 34
ANDROID_NS = 'http://schemas.android.com/apk/res/android'
ICON_ID = 0x7F010000  # pacote 7f, tipo 1 (drawable), entrada 0

# ids dos atributos android:* (conferidos em android.R$attr)
ATTR = {
    'theme': 0x01010000, 'label': 0x01010001, 'icon': 0x01010002, 'name': 0x01010003,
    'exported': 0x01010010, 'launchMode': 0x0101001D, 'screenOrientation': 0x0101001E,
    'configChanges': 0x0101001F, 'minSdkVersion': 0x0101020C, 'versionCode': 0x0101021B,
    'versionName': 0x0101021C, 'targetSdkVersion': 0x01010270, 'hardwareAccelerated': 0x010102D3,
}
THEME_FULLSCREEN = 0x0103000A  # android:style/Theme.Black.NoTitleBar.Fullscreen

# tipos de Res_value
T_REF, T_STRING, T_INT_DEC, T_INT_HEX, T_BOOL = 0x01, 0x03, 0x10, 0x11, 0x12


def chunk(ctype, header_rest, body):
    """Chunk com cabeçalho (tipo, tamanho do cabeçalho, tamanho total)."""
    hsize = 8 + len(header_rest)
    return struct.pack('<HHI', ctype, hsize, hsize + len(body)) + header_rest + body


def string_pool(strings):
    offs, data = [], b''
    for s in strings:
        offs.append(len(data))
        enc = s.encode('utf-16-le')
        data += struct.pack('<H', len(s)) + enc + b'\x00\x00'
    while len(data) % 4:
        data += b'\x00'
    n = len(strings)
    strings_start = 28 + 4 * n
    header_rest = struct.pack('<IIIII', n, 0, 0, strings_start, 0)
    return chunk(0x0001, header_rest, b''.join(struct.pack('<I', o) for o in offs) + data)


def res_value(dtype, data):
    return struct.pack('<HBBI', 8, 0, dtype, data & 0xFFFFFFFF)


class Axml:
    """Codificador mínimo de XML binário do Android."""

    def __init__(self):
        # atributos com id primeiro (o mapa de recursos aponta para eles)
        self.attr_names = sorted(ATTR, key=lambda k: ATTR[k])
        self.strings = list(self.attr_names)
        self.nodes = []

    def s(self, text):
        if text not in self.strings:
            self.strings.append(text)
        return self.strings.index(text)

    def start(self, name, attrs):
        # attrs: lista de (nome, tipo, valor); nome sem ':' = sem namespace
        enc = []
        for an, typ, val in attrs:
            if an.startswith('android:'):
                short = an[8:]
                ns, nidx, rid = self.s(ANDROID_NS), self.s(short), ATTR[short]
            else:
                ns, nidx, rid = 0xFFFFFFFF, self.s(an), 0
            if typ == T_STRING:
                raw = self.s(val)
                rv = res_value(T_STRING, raw)
            else:
                raw = 0xFFFFFFFF
                rv = res_value(typ, val)
            enc.append((rid, struct.pack('<III', ns, nidx, raw) + rv))
        enc.sort(key=lambda e: e[0])  # o Android espera os atributos ordenados por id
        self.nodes.append(('start', self.s(name), [e[1] for e in enc]))
        return self

    def end(self, name):
        self.nodes.append(('end', self.s(name), None))
        return self

    def build(self):
        prefix, uri = self.s('android'), self.s(ANDROID_NS)
        body = b''
        line = 1
        body += chunk(0x0100, struct.pack('<II', line, 0xFFFFFFFF), struct.pack('<II', prefix, uri))
        for kind, name, attrs in self.nodes:
            line += 1
            if kind == 'start':
                ext = struct.pack('<IIHHHHHH', 0xFFFFFFFF, name, 20, 20, len(attrs), 0, 0, 0)
                body += chunk(0x0102, struct.pack('<II', line, 0xFFFFFFFF), ext + b''.join(attrs))
            else:
                body += chunk(0x0103, struct.pack('<II', line, 0xFFFFFFFF), struct.pack('<II', 0xFFFFFFFF, name))
        body += chunk(0x0101, struct.pack('<II', line + 1, 0xFFFFFFFF), struct.pack('<II', prefix, uri))
        resmap = chunk(0x0180, b'', b''.join(struct.pack('<I', ATTR[a]) for a in self.attr_names))
        return chunk(0x0003, b'', string_pool(self.strings) + resmap + body)


def manifest(version_code, version_name):
    x = Axml()
    x.start('manifest', [
        ('package', T_STRING, PACKAGE),
        ('android:versionCode', T_INT_DEC, version_code),
        ('android:versionName', T_STRING, version_name),
    ])
    x.start('uses-sdk', [('android:minSdkVersion', T_INT_DEC, MIN_SDK), ('android:targetSdkVersion', T_INT_DEC, TARGET_SDK)]).end('uses-sdk')
    for perm in ('android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE', 'android.permission.VIBRATE'):
        x.start('uses-permission', [('android:name', T_STRING, perm)]).end('uses-permission')
    x.start('application', [
        ('android:label', T_STRING, LABEL),
        ('android:icon', T_REF, ICON_ID),
        ('android:theme', T_REF, THEME_FULLSCREEN),
        ('android:hardwareAccelerated', T_BOOL, 0xFFFFFFFF),
    ])
    x.start('activity', [
        ('android:name', T_STRING, PACKAGE + '.MainActivity'),
        ('android:label', T_STRING, LABEL),
        ('android:exported', T_BOOL, 0xFFFFFFFF),
        ('android:launchMode', T_INT_DEC, 2),            # singleTask
        ('android:screenOrientation', T_INT_DEC, 1),     # retrato
        ('android:configChanges', T_INT_HEX, 0x04F0 | 0x0100 | 0x0800 | 0x0200),  # orientação, teclado, tamanho de tela...
    ])
    x.start('intent-filter', [])
    x.start('action', [('android:name', T_STRING, 'android.intent.action.MAIN')]).end('action')
    x.start('category', [('android:name', T_STRING, 'android.intent.category.LAUNCHER')]).end('category')
    x.end('intent-filter')
    x.end('activity')
    x.end('application')
    x.end('manifest')
    return x.build()


def resources_arsc(icon_path):
    """Tabela de recursos com um único drawable: o ícone."""
    values = string_pool([icon_path])
    type_strings = string_pool(['drawable'])
    key_strings = string_pool(['icon'])
    spec = chunk(0x0202, struct.pack('<BBHI', 1, 0, 0, 1), struct.pack('<I', 0))
    config = struct.pack('<I', 64) + b'\x00' * 60
    entries_start = 8 + 12 + 64 + 4  # cabeçalho do tipo + offsets
    type_header = struct.pack('<BBHII', 1, 0, 0, 1, entries_start) + config
    entry = struct.pack('<HHI', 8, 0, 0) + res_value(T_STRING, 0)
    typ = chunk(0x0201, type_header, struct.pack('<I', 0) + entry)
    name = PACKAGE.encode('utf-16-le').ljust(256, b'\x00')
    pkg_header_size = 288
    type_strings_off = pkg_header_size
    key_strings_off = type_strings_off + len(type_strings)
    pkg_rest = struct.pack('<I', 0x7F) + name + struct.pack('<IIIII', type_strings_off, 0, key_strings_off, 0, 0)
    pkg = chunk(0x0200, pkg_rest, type_strings + key_strings + spec + typ)
    return chunk(0x0002, struct.pack('<I', 1), values + pkg)


def write_zip(out, entries):
    """Zip simples: arquivos 'stored' alinhados em 4 bytes (exigência do Android para o resources.arsc)."""
    data = b''
    central = b''
    for name, content, store in entries:
        fname = name.encode()
        crc = zlib.crc32(content) & 0xFFFFFFFF
        if store:
            comp, method = content, 0
        else:
            c = zlib.compressobj(9, zlib.DEFLATED, -15)
            comp, method = c.compress(content) + c.flush(), 8
        offset = len(data)
        extra = b''
        if store:
            pad = (-(offset + 30 + len(fname))) % 4
            extra = b'\x00' * pad
        dos_time, dos_date = 0, (2026 - 1980) << 9 | 1 << 5 | 1
        local = struct.pack('<IHHHHHIIIHH', 0x04034B50, 20, 0, method, dos_time, dos_date, crc, len(comp), len(content), len(fname), len(extra))
        data += local + fname + extra + comp
        central += struct.pack('<IHHHHHHIIIHHHHHII', 0x02014B50, 20, 20, 0, method, dos_time, dos_date, crc, len(comp), len(content),
                               len(fname), 0, 0, 0, 0, 0, offset) + fname
    end = struct.pack('<IHHHHIIH', 0x06054B50, 0, 0, len(entries), len(entries), len(central), len(data), 0)
    Path(out).write_bytes(data + central + end)


def main():
    dex, icon, assets, out, vcode, vname = sys.argv[1:7]
    entries = [
        ('AndroidManifest.xml', manifest(int(vcode), vname), False),
        ('classes.dex', Path(dex).read_bytes(), False),
        ('resources.arsc', resources_arsc('res/drawable/icon.png'), True),
        ('res/drawable/icon.png', Path(icon).read_bytes(), True),
    ]
    for f in sorted(Path(assets).rglob('*')):
        if f.is_file():
            entries.append(('assets/' + f.relative_to(assets).as_posix(), f.read_bytes(), False))
    write_zip(out, entries)
    print('apk sem assinatura:', out)


if __name__ == '__main__':
    main()
