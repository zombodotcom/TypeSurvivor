from PIL import Image
import pygame

pygame.init()
screen = pygame.display.set_mode((300, 300))
clock = pygame.time.Clock()

def load_apng_frames_and_delays(path):
    frames = []
    delays = []
    with Image.open(path) as img:
        try:
            while True:
                frame = img.convert("RGBA")
                mode = frame.mode
                size = frame.size
                data = frame.tobytes()
                surface = pygame.image.fromstring(data, size, mode)
                surface = pygame.transform.scale(surface, (150, 150))
                frames.append(surface)
                delays.append(img.info.get('duration', 100))
                img.seek(img.tell() + 1)
        except EOFError:
            pass
    return frames, delays

frames, delays = load_apng_frames_and_delays("emotes/monkaCough.png")
print(f"Loaded {len(frames)} frames with delays: {delays}")

current_frame = 0
timer = 0

running = True
while running:
    dt = clock.tick(60)
    timer += dt

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    while timer >= delays[current_frame]:
        timer -= delays[current_frame]
        current_frame = (current_frame + 1) % len(frames)

    screen.fill((30, 30, 30))
    screen.blit(frames[current_frame], (75, 75))
    pygame.display.flip()

pygame.quit()
