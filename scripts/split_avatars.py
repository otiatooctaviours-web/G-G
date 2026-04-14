from PIL import Image

src = 'assets/avatars.jpg'
names = ['assets/testimonial-angela.jpg', 'assets/testimonial-daniel.jpg', 'assets/testimonial-sarah.jpg']

im = Image.open(src)
w, h = im.size
w3 = w // 3

for i, name in enumerate(names):
    left = i * w3
    right = (i + 1) * w3 if i < 2 else w
    box = (left, 0, right, h)
    part = im.crop(box)
    part.save(name, quality=95)

print('Saved:', ', '.join(names))
