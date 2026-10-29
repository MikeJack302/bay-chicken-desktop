"""Read selected GLBs from the published source ZIP via verified ZIP ranges.

Source page: https://wenmingzs.zsnews.cn/Article/view/cateid/526/id/63556.html
No executable content from the archive is loaded.
"""
import hashlib
import json
from pathlib import Path
import struct
import subprocess
import zipfile
import zlib

URL = 'https://wenmingzs.zsnews.cn/Attachment/Files/2025/10/14/01.zip'
LENGTH = 475686227
index = Path('research/source-index.zip')
archive = zipfile.ZipFile(index)
base = LENGTH - index.stat().st_size
target = Path('assets/models')
target.mkdir(parents=True, exist_ok=True)
sources = []
for number, filename in [(13, 'white-wave.glb'), (20, 'white.glb'), (31, 'pink.glb')]:
    info = archive.infolist()[number]
    start = info.header_offset + base
    part = Path(f'research/model-range-{number}.bin')
    subprocess.run(['curl.exe', '--fail', '-sS', '-L', '--max-time', '40', '--range',
                    f'{start}-{start + info.compress_size + 4095}', '-o', str(part), URL], check=True)
    raw = part.read_bytes()
    assert raw[:4] == b'PK\x03\x04', 'Unexpected archive data'
    header = struct.unpack('<4s5H3I2H', raw[:30])
    offset = 30 + header[-2] + header[-1]
    content = raw[offset:offset + info.compress_size]
    if info.compress_type == zipfile.ZIP_DEFLATED:
        content = zlib.decompress(content, -15)
    else:
        assert info.compress_type == zipfile.ZIP_STORED
    assert len(content) == info.file_size
    assert zlib.crc32(content) == info.CRC, 'ZIP CRC mismatch'
    assert content[:4] == b'glTF', 'Not a GLB model'
    (target / filename).write_bytes(content)
    name = info.filename
    if not info.flag_bits & 0x800:
        name = name.encode('cp437').decode('gbk')
    sources.append({'file': filename, 'archiveEntry': name, 'bytes': len(content),
                    'sha256': hashlib.sha256(content).hexdigest(), 'crc32': f'{info.CRC:08x}'})
    gltf_len = struct.unpack('<I', content[12:16])[0]
    gltf = json.loads(content[20:20 + gltf_len])
    print(filename, 'meshes:', len(gltf.get('meshes', [])), 'animations:', len(gltf.get('animations', [])),
          'skins:', len(gltf.get('skins', [])), 'nodes:', [n.get('name') for n in gltf.get('nodes', [])])
    Path(f'research/{filename}.json').write_text(json.dumps(gltf, ensure_ascii=False, indent=2), encoding='utf8')
Path('research/model-provenance.json').write_text(json.dumps({'sourcePage':
    'https://wenmingzs.zsnews.cn/Article/view/cateid/526/id/63556.html', 'archive': URL,
    'models': sources}, ensure_ascii=False, indent=2), encoding='utf8')
