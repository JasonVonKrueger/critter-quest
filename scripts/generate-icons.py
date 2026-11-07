"""Regenerate the vector placeholder bunny icon and PNG sizes (requires Pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1] / 'client/public/icons'
root.mkdir(parents=True, exist_ok=True)
# All character details fit in the central maskable safe zone.
shapes = [
    (315, 311, 386, 382, '#e7dce9'),
    (166, 245, 346, 418, '#fff5ee'),
    (202, 278, 310, 398, '#ffffff'),
    (159, 370, 245, 423, '#fff5ee'),
    (267, 370, 353, 423, '#fff5ee'),
    (178, 392, 225, 412, '#f5b5bf'),
    (287, 392, 334, 412, '#f5b5bf'),
    (182, 87, 237, 250, '#fff5ee'),
    (275, 87, 330, 250, '#fff5ee'),
    (198, 110, 222, 227, '#f3aab8'),
    (290, 110, 314, 227, '#f3aab8'),
    (151, 185, 361, 341, '#fff5ee'),
    (191, 232, 233, 285, '#563835'),
    (279, 232, 321, 285, '#563835'),
    (203, 240, 220, 259, '#ffffff'),
    (291, 240, 308, 259, '#ffffff'),
    (168, 287, 213, 309, '#f8c0c5'),
    (299, 287, 344, 309, '#f8c0c5'),
    (244, 282, 268, 298, '#e98f9e'),
    (177, 315, 225, 376, '#f4e3e1'),
    (287, 315, 335, 376, '#f4e3e1'),
]
scale = 4
image = Image.new('RGB', (512*scale, 512*scale), '#79965f')
draw = ImageDraw.Draw(image)
svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">', '<rect width="512" height="512" fill="#79965f"/>']
for x1,y1,x2,y2,color in shapes:
    draw.ellipse(tuple(v*scale for v in (x1,y1,x2,y2)), fill=color)
    svg.append(f'<ellipse cx="{(x1+x2)/2}" cy="{(y1+y2)/2}" rx="{(x2-x1)/2}" ry="{(y2-y1)/2}" fill="{color}"/>')
points = [(256,296),(256,307),(245,315),(256,307),(267,315)]
draw.line([(x*scale,y*scale) for x,y in points], fill='#986b67', width=4*scale)
svg.append('<path d="M256 296V307L245 315M256 307L267 315" fill="none" stroke="#986b67" stroke-width="4"/>')
svg.append('</svg>')
(root/'bunny.svg').write_text('\n'.join(svg)+'\n')
for size in (180,192,512):
    image.resize((size,size),Image.Resampling.LANCZOS).save(root/f'icon-{size}.png')
# Separate declaration makes the intended Android masking behavior explicit.
image.resize((512,512),Image.Resampling.LANCZOS).save(root/'maskable-512.png')
