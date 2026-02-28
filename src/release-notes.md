### Release 1.2.0
<sup>2026-02-28</sup>

#### Features
- The Combat Tracker has been completely overhauled and replaced. Details:
    - Combat next turn/previous turn behavior has been overhauled to be more friendly to the Cosmere RPG, with next turn/end turn buttons now setting it to be nobody's turn
    - The "Mark as Acted" button now reads as "Activate Combatant", and sets it to be that combatant's turn
    - The combat tracker styling has been updated to more easily display whose turn it is
- When an action is used by a boss outside of their turn, a new prompt displays to allow the user to select whether it's used on the fast turn, the slow turn, or off turn.

#### Fixes
- When a combat isn't active, there will no longer be warnings/blocks for an actor "not having enough actions" to use an action.
- Action expenditure is now tracked when an action is actually fully used, not just whenever the button is clicked. This means that canceling an action before it fully renders to the chat no longer causes you to spend those actions.
- Items being used now use the actor passed in through the preUseItem/onUseItem options call, meaning better compatibility for e.g. using an action from a compendium through the Argon combat hud, when the action isn't on the character's sheet.