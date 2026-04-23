# 三國牌途 (Three Kingdoms: Path of Cards)

okay so basically this is a roguelike deckbuilder but make it *Three Kingdoms* 

u know Slay the Spire? yeah like that but instead of some random ironclad dude ur playing as legendary warlords like Cao Cao and fighting ur way through ancient China with cards!

## what's this game about

- build ur deck, fight enemies, collect relics, get op combos
- travel across a map choosing ur path (risk it for the biscuit or play it safe)
- combat is turn-based card slinging with intents, block, statuses, the whole thing
- there's events, merchants, rest sites, and big rewards after bosses
- story prelude for Cao Cao is in the works (vertical slice)

## tech stack (the nerdy stuff)

- **Phaser 3.90** - the game engine doing all the heavy lifting
- **TypeScript** - because javascript without types is chaos and we don't do chaos here
- **Spine** - for those smooth character animations (made by my cousin!)
- **Vite** - dev server go brrr


## cool features we actually implemented

- fully working reward screen with card picks 
- enemy intent system (yes they telegraph their moves, use ur brain)

## current status

Cao Cao prelude is the main focus rn. we're locking down the exact route:
intro -> map -> combat -> reward -> next node -> final outcome

## notes

- game resolution is 1600x900 (16:9) and we scale with FIT mode
- if stuff looks blurry on ur monitor... yeah we're working on it 
- dev build has debug tools, prod build won't

## credits

*"I would rather betray the world than let the world betray me"* - probably u after taking a risky path and dying to a random elite
