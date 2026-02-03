# gemini.md - Context & Rules for Smart Handleliste

## 1. Project Manifesto & Design Philosophy
**Identity**: "Avant-Garde" & "Intentional Minimalism".
**Core Principles**:
- **Anti-Generic**: If it looks like Bootstrap or Material UI default, it is wrong.
- **Asymmetry & Bespoke**: Prefer custom layouts and unique positioning over standard grids.
- **Whitespace**: Whitespace is an active design element, not just empty space.
- **Micro-Interactions**: The UI should feel alive.

### The "Ultrathink" Protocol
If the user prompts **"ULTRATHINK"**:
1. Suspend brevity.
2. Analyze deep-level architectural implications (Rendering costs, Accessibility WCAG AAA, Long-term modularity).
3. Provide irrefutable logic for every decision.

## 2. Architecture & File Structure
**IMPORTANT QUIRK**: This project uses a root-based source structure (Legacy).
- **Source Files**: Located in `./` (Root), NOT `src/` (except `index.css`).
- **Path Alias**: `@/*` maps to `./*`

### Module Boundaries
- `components/`: **Pure UI**. Minimal logic.
- `hooks/`: **Business Logic**. State management, Firebase calls, Side effects.
- `services/`: **API Wrappers**. Raw calls to Firebase/GenAI.
- `constants/`: **Static Data**. Configuration, default values.

## 3. Tech Stack
- **Framework**: React 19
- **Build Tool**: Vite
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS v4 (Utility-first, no external CSS files unless global).
- **Backend**: Firebase (Auth, Firestore)
- **AI**: Google GenAI SDK

## 4. Coding Standards
- **Zero Fluff**: Code first, explain later (unless Ultrathink is active).
- **Library Discipline**: Use existing libraries (Shadcn/Radix) if installed. Do not reinvent the wheel.
- **Strict Typing**: No `any`. Use interfaces for all props and data models.
- **Naming Conventions**:
  - Components: `PascalCase` (`ShoppingList.tsx`)
  - Functions/Hooks: `camelCase` (`useAuth.ts`)
  - Constants: `UPPER_CASE` (`DEFAULT_ITEMS`)

## 5. Domain Dictionary (Glossary)
To ensure consistent naming across the codebase:
- **Item**: A specific product on the list (e.g., "Milk").
- **Share**: The act of collaborating on a list.
- **Plan**: The future/suggested list vs the active shopping list.
