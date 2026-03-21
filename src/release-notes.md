# Cosmere Advanced Encounters: Release 1.3.0
<sup>2026-03-21</sup>

## Features
### Automatic Movement Tracking
- When a token tries to move (unless **unconstrained movement** is active) we first check if they have "remaining movement" from their last actions on this turn.
    - This is checked according to the current token "movement action" selected from the Token HUD- if you try to walk 5 feet and then fly another 10 feet, even if your fly speed is 20, it will require 2 actions (1 for the walking movement, and 1 for the flying movement). As far as I can tell, this is in line with rules-as-written.
- If a token doesn't have enough "remaining movement", a couple of things can happen (all configurable by settings)
    - The default "Move" action can be taken automatically (depending on client settings) automatically marking off that action usage and recording that information in the combat tracker.
        - If necessary for the movement distance, this action could be taken multiple times.
        - If the token has enough remaining movement after taking the Move action(s), the movement will be completed!
    - If the token still doesn't have enough remaining movement, depending on your settings, the movement will either complete anyways and display a warning, or be completely blocked.
### Major testing improvements
- Almost all issues I've seen reported either in the Metalworks discord or on the GitHub are now covered by tests, and prevented from happening again. MANY other possible issues I've identified are now covered as well. This should hopefully allow much better stability going forwards :)

## Fixes
- Fixed a bug where actions used by bosses outside of their turn still automatically were used from a somewhat-random one of their turns. It now respects the prompt, and is a little more intelligent about when it actually displays the prompt.