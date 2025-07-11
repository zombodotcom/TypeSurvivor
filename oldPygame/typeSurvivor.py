import pygame
import random
import sys

# Settings
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
PLAYER_POS = (SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2)
ENEMY_SPEED = 1.0
SPAWN_INTERVAL = 2000  # milliseconds
WORDS = ["blood", "fang", "night", "crypt", "stake", "bat", "shadow", "eternal", "curse", "hunter"]

pygame.init()
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Typing Survivors")
clock = pygame.time.Clock()
font = pygame.font.SysFont(None, 36)

# Player (just center point)
player_radius = 20

# Enemies
class Enemy:
    def __init__(self, x, y, word):
        self.x = x
        self.y = y
        self.word = word

    def move_toward_player(self):
        dx = PLAYER_POS[0] - self.x
        dy = PLAYER_POS[1] - self.y
        dist = (dx**2 + dy**2) ** 0.5
        if dist != 0:
            self.x += ENEMY_SPEED * dx / dist
            self.y += ENEMY_SPEED * dy / dist

    def draw(self, surface):
        pygame.draw.circle(surface, (255, 0, 0), (int(self.x), int(self.y)), 20)
        text_surface = font.render(self.word, True, (255, 255, 255))
        surface.blit(text_surface, (self.x - text_surface.get_width() // 2, self.y - 40))


enemies = []
input_text = ""
last_spawn_time = pygame.time.get_ticks()
game_over = False

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
        if not game_over and event.type == pygame.KEYDOWN:
            if event.key == pygame.K_BACKSPACE:
                input_text = input_text[:-1]
            elif event.key == pygame.K_RETURN:
                input_text = ""
            elif event.unicode.isalpha():
                input_text += event.unicode.lower()

    if not game_over:
        # Spawn enemies over time
        current_time = pygame.time.get_ticks()
        if current_time - last_spawn_time > SPAWN_INTERVAL:
            spawn_enemy()
            last_spawn_time = current_time

        # Move enemies
        for enemy in enemies:
            enemy.move_toward_player()
            # Check collision with player
            if ((enemy.x - PLAYER_POS[0])**2 + (enemy.y - PLAYER_POS[1])**2) < (player_radius + 20)**2:
                game_over = True

        # Check typing
        killed_any = False
        remaining_enemies = []
        for e in enemies:
            if e.word == input_text:
                killed_any = True
            else:
                remaining_enemies.append(e)
        enemies = remaining_enemies
        if killed_any:
            input_text = ""


    # Draw player
    if not game_over:
        pygame.draw.circle(screen, (0, 255, 0), PLAYER_POS, player_radius)
    else:
        over_text = font.render("GAME OVER", True, (255, 0, 0))
        screen.blit(over_text, (SCREEN_WIDTH // 2 - over_text.get_width() // 2, SCREEN_HEIGHT // 2 - 20))

    # Draw enemies
    for enemy in enemies:
        enemy.draw(screen)

    # Draw input
    input_surface = font.render(input_text, True, (255, 255, 255))
    screen.blit(input_surface, (10, SCREEN_HEIGHT - 40))

    pygame.display.flip()
