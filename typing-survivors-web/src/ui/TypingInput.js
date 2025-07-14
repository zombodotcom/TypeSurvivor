// src/ui/TypingInput.js
// Renders the typing input at the bottom center of the game container

let inputHandler = null;

export function renderTypingInput(value = '', onInput = null) {
  let input = document.getElementById('typed-input');
  if (!input) {
    input = document.createElement('input');
    input.id = 'typed-input';
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.style.position = 'absolute';
    input.style.bottom = '30px';
    input.style.left = '50%';
    input.style.transform = 'translateX(-50%)';
    input.style.fontSize = '24px';
    input.style.color = '#ffff00';
    input.style.background = 'rgba(16,24,40,0.77)';
    input.style.boxShadow = '0 2px 18px #0007';
    input.style.padding = '9px 18px';
    input.style.borderRadius = '10px';
    input.style.userSelect = 'text';
    input.style.width = 'max-content';
    input.style.maxWidth = '92vw';
    input.style.whiteSpace = 'nowrap';
    input.style.overflowX = 'auto';
    input.style.border = '2px solid #ffd70040';
    input.style.zIndex = '100';
    input.style.textAlign = 'center';
    document.getElementById('game-container').appendChild(input);
  }
  input.value = value;
  input.focus();
  if (onInput) {
    if (inputHandler) input.removeEventListener('input', inputHandler);
    inputHandler = (e) => onInput(e.target.value, e);
    input.addEventListener('input', inputHandler);
  }
} 