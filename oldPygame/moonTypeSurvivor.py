import pygame
import random
import sys
import os
from PIL import Image

# Settings
SCREEN_WIDTH = 1000
SCREEN_HEIGHT = 1000
PLAYER_POS = (SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2)
PLAYER_RADIUS = 20
ENEMY_SPEED = 1.0
SPAWN_INTERVAL = 2000  # ms

# Emote scaling (None = original size, or (width, height))
EMOTE_TARGET_SIZE = (96, 96)  # change for higher/lower resolution

# High score file
HIGHSCORE_FILE = "highscore.txt"

# Folders
EMOTES_FOLDER = "emotes"

# Init
pygame.init()
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Typing Survivors - Lazy Loading Emotes")
clock = pygame.time.Clock()
font = pygame.font.SysFont(None, 36)

# Show a loading screen while scanning
def show_loading_message(message):
    screen.fill((30, 30, 30))
    text_surface = font.render(message, True, (255, 255, 255))
    screen.blit(text_surface, (SCREEN_WIDTH // 2 - text_surface.get_width() // 2,
                               SCREEN_HEIGHT // 2 - text_surface.get_height() // 2))
    pygame.display.flip()

show_loading_message("Loading emote filenames...")

# Build WORDS list (just filenames for now)
WORDS = []
for filename in os.listdir(EMOTES_FOLDER):
    if filename.lower().endswith(".png"):
        word = filename[:-4]
        WORDS.append(word)

if not WORDS:
    show_loading_message("❌ No emote images found in 'emotes/' folder!")
    pygame.time.wait(3000)
    pygame.quit()
    sys.exit(1)

print(f"Loaded emote words: {WORDS}")

# Emote cache (for lazy loading)
emote_cache = {}

def load_apng_frames_and_delays(path):
    frames = []
    delays = []
    with Image.open(path) as img:
        try:
            while True:
                frame = img.convert("RGBA")
                if EMOTE_TARGET_SIZE:
                    frame = frame.resize(EMOTE_TARGET_SIZE, Image.LANCZOS)
                mode = frame.mode
                size = frame.size
                data = frame.tobytes()
                surface = pygame.image.fromstring(data, size, mode)
                frames.append(surface)
                delay = img.info.get('duration', 100)
                delays.append(delay)
                img.seek(img.tell() + 1)
        except EOFError:
            pass
    return frames, delays

def get_emote_data(word):
    if word in emote_cache:
        return emote_cache[word]
    path = os.path.join(EMOTES_FOLDER, f"{word}.png")
    frames, delays = load_apng_frames_and_delays(path)
    if frames:
        emote_cache[word] = (frames, delays)
        return frames, delays
    else:
        # Placeholder if load fails
        dummy = pygame.Surface((48, 48))
        dummy.fill((200, 50, 50))
        emote_cache[word] = ([dummy], [100])
        return [dummy], [100]

# High score utilities
def load_high_score():
    if os.path.exists(HIGHSCORE_FILE):
        try:
            with open(HIGHSCORE_FILE, "r") as f:
                return int(f.read())
        except:
            return 0
    return 0

def save_high_score(score):
    with open(HIGHSCORE_FILE, "w") as f:
        f.write(str(score))

high_score = load_high_score()

# Enemy class
class Enemy:
    def __init__(self, x, y, word):
        self.x = x
        self.y = y
        self.word = word
        self.frames, self.delays = get_emote_data(word)
        self.current_frame = 0
        self.frame_timer = 0

    def move_toward_player(self):
        dx = PLAYER_POS[0] - self.x
        dy = PLAYER_POS[1] - self.y
        dist = (dx**2 + dy**2) ** 0.5
        if dist != 0:
            self.x += ENEMY_SPEED * dx / dist
            self.y += ENEMY_SPEED * dy / dist

    def update_animation(self, dt):
        self.frame_timer += dt
        while self.frame_timer >= self.delays[self.current_frame]:
            self.frame_timer -= self.delays[self.current_frame]
            self.current_frame = (self.current_frame + 1) % len(self.frames)

    def draw(self, surface):
        image = self.frames[self.current_frame]
        surface.blit(image, (self.x - image.get_width() // 2, self.y - image.get_height() // 2))
        text_surface = font.render(self.word, True, (255, 255, 255))
        surface.blit(
            text_surface,
            (self.x - text_surface.get_width() // 2, self.y + image.get_height() // 2 + 5)
        )

# Game state
def reset_game():
    global enemies, input_text, last_spawn_time, game_over, score
    enemies = []
    input_text = ""
    last_spawn_time = pygame.time.get_ticks()
    game_over = False
    score = 0

reset_game()

def spawn_enemy():
    side = random.choice(["top", "bottom", "left", "right"])
    if side == "top":
        x, y = random.randint(0, SCREEN_WIDTH), 0
    elif side == "bottom":
        x, y = random.randint(0, SCREEN_WIDTH), SCREEN_HEIGHT
    elif side == "left":
        x, y = 0, random.randint(0, SCREEN_HEIGHT)
    else:
        x, y = SCREEN_WIDTH, random.randint(0, SCREEN_HEIGHT)

    word = random.choice(WORDS)
    enemies.append(Enemy(x, y, word))

# Main loop
while True:
    dt = clock.tick(60)
    screen.fill((30, 30, 30))

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            pygame.quit()
            sys.exit()
        if event.type == pygame.KEYDOWN:
            if not game_over:
                if event.key == pygame.K_BACKSPACE:
                    input_text = input_text[:-1]
                elif event.key == pygame.K_RETURN:
                    input_text = ""
                elif event.unicode.isprintable():
                    input_text += event.unicode
            else:
                if event.key == pygame.K_r:
                    if score > high_score:
                        high_score = score
                        save_high_score(high_score)
                    reset_game()
                elif event.key == pygame.K_ESCAPE:
                    pygame.quit()
                    sys.exit()

    if not game_over:
        # Spawn enemies
        current_time = pygame.time.get_ticks()
        if current_time - last_spawn_time > SPAWN_INTERVAL:
            spawn_enemy()
            last_spawn_time = current_time

        # Move & animate enemies
        for enemy in enemies:
            enemy.move_toward_player()
            enemy.update_animation(dt)
            if ((enemy.x - PLAYER_POS[0])**2 + (enemy.y - PLAYER_POS[1])**2) < (PLAYER_RADIUS + 24)**2:
                game_over = True
                if score > high_score:
                    high_score = score
                    save_high_score(high_score)

        # Check typing
        killed_any = False
        remaining_enemies = []
        for e in enemies:
            if e.word.lower() == input_text.lower():
                killed_any = True
                score += 1
            else:
                remaining_enemies.append(e)
        enemies = remaining_enemies
        if killed_any:
            input_text = ""

    # Draw player
    if not game_over:
        pygame.draw.circle(screen, (0, 255, 0), PLAYER_POS, PLAYER_RADIUS)

        # Draw enemies
        for enemy in enemies:
            enemy.draw(screen)

    else:
        # Game over screen
        over_text = font.render("GAME OVER", True, (255, 0, 0))
        screen.blit(over_text, (SCREEN_WIDTH // 2 - over_text.get_width() // 2, SCREEN_HEIGHT // 2 - 50))

        score_text = font.render(f"Score: {score}", True, (255, 255, 0))
        screen.blit(score_text, (SCREEN_WIDTH // 2 - score_text.get_width() // 2, SCREEN_HEIGHT // 2 - 10))

        high_text = font.render(f"High Score: {high_score}", True, (255, 200, 0))
        screen.blit(high_text, (SCREEN_WIDTH // 2 - high_text.get_width() // 2, SCREEN_HEIGHT // 2 + 30))

        restart_text = font.render("Press R to restart or ESC to quit", True, (200, 200, 200))
        screen.blit(restart_text, (SCREEN_WIDTH // 2 - restart_text.get_width() // 2, SCREEN_HEIGHT // 2 + 70))

    # Input box
    pygame.draw.rect(screen, (50, 50, 50), (10, SCREEN_HEIGHT - 50, SCREEN_WIDTH - 20, 40))
    input_surface = font.render(input_text, True, (255, 255, 255))
    screen.blit(input_surface, (15, SCREEN_HEIGHT - 45))

    # Always show Score and High Score at top
    score_surface = font.render(f"Score: {score}", True, (255, 255, 0))
    screen.blit(score_surface, (10, 10))
    high_surface = font.render(f"High Score: {high_score}", True, (255, 200, 0))
    screen.blit(high_surface, (SCREEN_WIDTH - high_surface.get_width() - 10, 10))

    pygame.display.flip()
