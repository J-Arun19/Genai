# Chess Strategist Challenge

Build a polished, fully playable chess-themed mini-game for a student assignment titled "Skill Tree Challenge: Chess Strategist". This is a small interactive web game, not a landing page or static mockup. Must run in browser with real functional state and no backend required.

Core gameplay:
- Start screen explains objective: choose exactly one of three chess skills to train, then attempt the final challenge.
- Three skill choices with distinct mechanics and tradeoffs:
  1) Tactical Vision: solve a simple mate-in-one puzzle; correct answer unlocks a bonus hint / tactical advantage.
  2) Defensive Thinking: choose the safest move in a short scenario; correct answer grants a shield / one mistake forgiveness.
  3) Endgame Mastery: choose the correct king-and-pawn principle; correct answer grants an extra move or strategic advantage.
- Then enter a final challenge: a short branching chess-strategy scenario with a clear win/loss outcome based on the selected skill and the player's choices. Ensure every path is internally consistent, solvable, and ends clearly.
- Make the rules visible. Show immediate feedback after each choice (correct/incorrect, explanation), progress indicator, skill unlocked, final score, and a Play Again button that resets all state.
- Use real playable choice buttons and state transitions. No fake buttons, no dead links, no fabricated external AI/model scores.
- Add a 5-test checklist / test panel accessible from the results screen: (1) game starts, (2) skill choice is required, (3) feedback appears, (4) final challenge ends in win or loss, (5) restart resets progress. Display pass/fail based on actual implemented state or provide a clearly labeled manual test checklist; do not claim tests ran automatically if they did not.
- Visual design: high quality modern chess tactics interface, dark navy/charcoal background, cream chessboard accents, emerald green highlights, elegant typography, subtle animations, responsive desktop/mobile layout, chess-piece motifs and clean cards. Keep the game easy to complete in about 3-5 minutes.
- Add a small assignment info section: J Arun Kumar, USN 3BR24AI402, Section B, Hobby: Playing Chess, Assignment: Skill Tree Challenge.
- Provide an Evaluation screen using Playability Checklist (0-5): clear rules, meaningful choices, feedback, valid endings, consistency. Let the student tick the five criteria and show score out of 5, explicitly identifying it as a checklist-based measure, not a standard benchmark.
- Include an "Assignment Evidence" section with initial prompt and refined prompt text fields / display, and a comparison note template. Initial prompt: "Make a simple chess game where players choose a skill." Refined prompt: "Create a playable chess-themed skill tree game with three meaningful skill paths, immediate feedback, a branching final challenge, clear win/loss endings, restart, and a five-point playability checklist."
- Use React + TypeScript + Tailwind/shadcn as appropriate. Ensure TypeScript/build is clean. Prioritize a genuinely playable, coherent mini-game over excess features.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5f38ab80-216c-451e-a489-27cb9fe70524).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
