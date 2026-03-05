# V1 Product Spec

## Approved Scope
- Single-player 1v1 battles only.
- Battle mechanics are FireRed-inspired, not full Gen 3 parity.
- Auth is email/password only.
- Pokemon library is dynamic from database (built-in + generated).
- Generated Pokemon include AI-produced stats/behavior and 64x64 front/back sprites.
- Sprite representation in v1 is static images (not animated).

## Built-In Pokemon Seed List (24)
1. Pikachu
2. Charizard
3. Blastoise
4. Venusaur
5. Gengar
6. Alakazam
7. Dragonite
8. Snorlax
9. Lapras
10. Arcanine
11. Gyarados
12. Machamp
13. Jolteon
14. Vaporeon
15. Flareon
16. Lucario
17. Gardevoir
18. Scizor
19. Tyranitar
20. Salamence
21. Metagross
22. Mewtwo
23. Eevee
24. Deoxys

## Sprite Naming Convention
Expected user-provided files for built-ins:
- `{pokemon}_front.png`
- `{pokemon}_back.png`

Example:
- `deoxys_front.png`
- `deoxys_back.png`

## Runtime Safety Requirement
Generated behavior must be persisted as constrained JSON DSL and interpreted by engine hooks. Raw runtime `eval` is prohibited.

## Environment Setup Approach
Initial scaffold will use placeholder environment variables for:
- Supabase URL / anon key / service role key
- OpenAI API key
- Codex SDK credentials
