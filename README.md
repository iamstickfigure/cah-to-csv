# cah-to-csv
Utility for making custom cards against humanity games on playing cards io  

The json files in `cah-decks` are courtesy of JSON Against Humanity (https://www.crhallberg.com/cah/).
Any decks from that site will work with this code.  

Note: playingcards io has a limit of around 1200 widgets (cards + table objects), so choose your cards and expansion packs wisely. It's enough for all the official expansion packs minus the green box.
```javascript
await addJson('cah-decks/cah-base.json');
await addJson('cah-decks/cah-main-exps.json', ['greenbox']);
```  

The resulting csv files can be easily imported in the edit menu.

Unfortunately, playingcards io must've gotten in trouble recently because they've changed their game from "Cards Against Humanity" to "Remote Insensitivity". And the nice black and white rounded cards are now bizzare-looking purple and pink cards with sharp corners. It's possible to edit the card template, but there's no built-in way to save your edits and apply them to new games. So, I inspected their javascript code to see if I could figure out a solution to this problem. My solution is `setup-room.js`. Paste the code into the chrome dev-tools console, and replace `let newWidgets = {};` with the contents of `widgets/widgets-new.json`, then run it. It will remove all existing widgets except for the "hand", and replace them with better versions. This will be nearly equivalent to the original Cards Against Humanity style, with a small improvement where the name of the expansion pack will appear in small text at the bottom of each card.  

This hack uses some debug code the developer left in along with a warning to not over-use it. Adding in a couple widgets shouldn't be an issue, but please don't abuse the debug code for anything crazy.