"""Generate local QR assets with qrcode==8.2; no third-party QR service."""
import json
from pathlib import Path
import qrcode
from qrcode.image.svg import SvgPathFillImage

root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'docs/app-downloads.json').read_text())
for key, name in [('android', 'android'), ('iphone', 'iphone')]:
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=4)
    qr.add_data(data[key]['url'])
    qr.make(fit=True)
    image = qr.make_image(image_factory=SvgPathFillImage)
    image.save(root / 'dist' / f'download-{name}-qr.svg')
    print(f'{name}: version {qr.version}, {qr.modules_count} modules, four-module quiet zone')
