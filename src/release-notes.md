### Release 1.1.0
<sup>2026-01-27</sup>

#### Features
- Can now track and prevent combatants from using more actions or reactions than they have available
- Added a setting which determines behavior on a combatant using too many actions, either:
    - Do nothing
    - Display a warning message to the player using the action, but allow the action to occur and add it to the tracker
    - Display a warning message to the player using the action, and prevent the action from being used (in either the tracker or the chat)
- Conditions like Disoriented, Stunned, and Surprised now affect actions on a turn
- Added a setting to enable/disable condition effects on action tracker
- Which combatant's turn it is can now be controlled through the "Mark as Acted" button
- Added a setting to determine whether to use the new "Mark as Acted" setting turn behavior (defaults to true)

#### Fixes
- The previous fix for popout windows introduced a major issue with boss turns failing to render, which is now fixed.