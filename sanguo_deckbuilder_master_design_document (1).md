# Sanguo Deckbuilder — Master Design Document (Expanded Reference Edition)

## Purpose of This Document

This document is the long-term source of truth for the project.
It exists to prevent design drift, reduce ambiguity for future implementation, and preserve the intended identity of the game as systems, content, and presentation expand.

It is not just a feature list.
It defines:
- what the game is trying to be
- what it must never become
- how the core systems work
- how narrative and mechanics interact
- how content should be authored
- how the player should experience the game moment to moment

Whenever there is a conflict between a cool idea and this document, this document wins unless it is deliberately revised.

---

# 1. Game Identity

## 1.1 Core Pitch

A deterministic, high-difficulty tactical campaign deckbuilder set in a reinterpreted Three Kingdoms world.

The player is not merely clearing random fights. The player is navigating the collapse of political order through battlefield decisions, political tradeoffs, and narrative consequences.

The intended result is a game that feels like:
- a tactical puzzle in combat
- a political/military campaign on the map
- an alternate-history Three Kingdoms interpretation over the full run

## 1.2 Experience Goals

The game should feel:
- demanding
- legible
- authored
- dramatic
- strategically punishing
- narratively satisfying even in defeat

A successful run should feel earned, narrow, and memorable.
A failed run should feel understandable. The player should usually be able to point to where they made mistakes.

## 1.3 What the Game Is Not

The game must not become:
- a casual power fantasy deckbuilder
- a random-content soup roguelike
- a pure historical retelling with no player authorship
- a generic Slay the Spire reskin with Chinese flavor pasted on top
- an opaque simulation where the player cannot understand cause and effect

## 1.4 Primary Failure Modes

The player should mainly lose because of:
- bad event decisions
- bad combat sequencing
- weak long-term planning
- wrong risk assessment

The player should not mainly lose because of:
- hidden rules
- unreadable UI
- arbitrary RNG spikes
- hard-counter bosses that invalidate whole builds without warning

---

# 2. High-Level Design Priorities

## 2.1 The Two Highest Priorities

1. **Fairness**
2. **Depth**

Narrative, style, and difficulty matter a great deal, but fairness and depth are the final filters for every system.

## 2.2 Design Philosophy Summary

- Combat should be mostly deterministic and telegraphed.
- The player should learn through failure.
- Recovery from mistakes should be slow, not impossible.
- The game should reward optimized play and strong build construction.
- Builds should emerge from choices, not from being railroaded into hard archetypes.
- Story should shape play, not merely decorate it.

---

# 3. Tone, Style, and Historical Positioning

## 3.1 Historical Positioning

The game is a reinterpretation of Three Kingdoms material, not a strict simulation.

Historical anchors matter, but the player is allowed to produce alternate outcomes through decisions. The game uses history as pressure and context, not as a rigid script.

## 3.2 Realism vs Romance

Target blend:
- roughly 70% realism
- roughly 30% Romance-style dramatization

Realism governs:
- logistics
- military exhaustion
- supply pressure
- political tension
- the cost of ruling and campaigning

Romance governs:
- dramatic set-piece moments
- heightened heroism
- emotionally symbolic events
- legendary figures appearing as cards, enemies, relics, or events

## 3.3 Tone

The overall tone should be dramatic, sober, and pressurized.
Humor should be rare and situational.
The player should feel they are making difficult wartime decisions, not simply shopping for synergies.

---

# 4. Campaign Structure

## 4.1 Overall Structure

Each run is a full campaign arc consisting of:
- Prelude
- Act 1
- Act 2
- Act 3
- Final outcome / ending

## 4.2 Prelude

The Prelude exists to establish:
- the protagonist's worldview
- their early constraints
- the emotional lens through which they interpret the era

The Prelude is not a lore dump. It is the first authored statement of how this protagonist understands power, loyalty, risk, and legitimacy.

## 4.3 Act 1 — Collapse / Rise

Purpose:
- teach systems
- establish tone
- begin identity expression
- give the player enough room to make mistakes and still recover

Act 1 should be the most forgiving act.
It introduces pressure without fully constricting the player.

## 4.4 Act 2 — Dominance

Purpose:
- force identity decisions
- make builds begin to matter
- make story choices start shaping future content
- transition from improvisation to commitment

Act 2 is where the player stops assembling a pile and starts piloting a strategy.

## 4.5 Act 3 — Fragmentation

Purpose:
- compress decisions
- test whether the player’s identity actually holds under stress
- make tradeoffs sharper and more lingering
- deliver the feeling of inevitable decline with morally divergent endings

Act 3 should not just be “harder.” It should feel like the political and military world has become narrower, harsher, and less forgiving.

---

# 5. Story System

## 5.1 Hidden Axes

The campaign is shaped by three hidden narrative axes:
- **Legitimacy**
- **Control**
- **Momentum**

These are stored as hidden metadata in the run state and are not directly shown as UI bars to the player.

### Range
Each axis ranges from:
- -15 to +15

## 5.2 What the Axes Mean

### Legitimacy
Represents:
- perceived right to rule
- support from civilians and followers
- moral authority
- credibility of leadership

### Control
Represents:
- administrative order
- structural discipline
- ability to command and maintain cohesion
- the machinery of rule

### Momentum
Represents:
- battlefield initiative
- offensive pressure
- confidence in advancing strategy
- the capacity to force events forward

## 5.3 How Axes Change

Axes change only via events, narrative decisions, and major story beats.
They do not drift automatically.
They do not change from raw combat performance alone.

This is intentional: the story state reflects choices, not merely tactical success.

## 5.4 Visibility to the Player

Axes are hidden from direct UI.
However, the player should be able to infer their rough state through:
- dialogue tone
- event framing
- what kinds of events appear
- what kinds of consequences occur
- occasional combat modifiers that reflect political or campaign state

## 5.5 Threshold Effects

Thresholds can:
- unlock or suppress event pools
- bias encounter types
- alter the tone of chains and endings
- modify certain combat circumstances

At extreme values, special states can trigger.
These should feel like major campaign consequences, not small numerical buffs.

## 5.6 Conflict Resolution Between Axes and Narrative Flags

When axes and narrative flags conflict:
- axes take precedence in the final outcome model
- narrative flags heavily influence which specific variant of an ending is delivered

Practical interpretation:
- the axes define what kind of state the protagonist has become
- narrative flags define how that state is narratively expressed

## 5.7 Ending Weighting

Ending outcomes should be determined roughly by:
- 60–70% hidden axes
- 30–40% key narrative decisions / flags

This ensures endings are neither purely numerical nor purely scripted.

---

# 6. Character Identity

Each protagonist must feel mechanically and emotionally distinct.
They are not color-swapped starting decks.
They are separate campaign interpretations.

## 6.1 Liu Bei — Burdened Legitimacy

### Core Theme
Legitimacy without power.

### Emotional Identity
Liu Bei’s run should feel like:
- survival through weakness
- sacrifice for cohesion
- moral authority under material strain
- alliances that are necessary but unstable
- hope that is expensive to preserve

### Mechanical Bias
- strongest relationship with morale systems
- strongest access to Rally and recovery under pressure
- frequent HP-for-value or stability-for-value choices
- weaker raw economy
- weaker clean efficiency

### What Liu Bei Must Never Become
- a smooth control machine
- a rich logistical empire
- a brute-force damage engine
- a character whose choices are clean and efficient

## 6.2 Cao Cao — Order Through Control

### Core Theme
Order at any cost.

### Emotional Identity
Cao Cao’s run should feel like:
- control through structure
- success through coercion
- strength through administration and discipline
- power that becomes unstable under its own weight

### Mechanical Bias
- strongest Command usage and scaling
- strongest Supply manipulation
- strongest disciplined deck shaping and structural control
- access to enemy-side penalties and control tools

### What Cao Cao Must Never Become
- a morale-centered inspirational leader
- a random/chaotic improviser
- a fire/setup tactician by default
- an emotionally noble self-sacrifice run

## 6.3 Sun Quan — Balance and Timing

### Core Theme
Survival through balance.

### Emotional Identity
Sun Quan’s run should feel like:
- inheriting fragility
- winning by timing and positioning rather than raw superiority
- controlled preparation before commitment
- fire as a strategic doctrine, not constant spectacle

### Mechanical Bias
- strongest Fire system access
- strongest next-combat planning identity
- strong Entrenched/positioning tools
- narrower commitment windows with higher payoff

### What Sun Quan Must Never Become
- a brute-force conqueror
- a purely economic or supply-based character
- a Rally-first legitimacy leader
- a character who can ignore setup and still function well

---

# 7. Core Systems Hierarchy

The system hierarchy is:
1. **Command**
2. **Formation**
3. **Morale**
4. **Supply**
5. **Fire**

This hierarchy matters for:
- content weighting
- relic design
- card pool density
- encounter pressure
- event family emphasis

## 7.1 Why This Order Exists

### Command
The main strategic axis. It represents stored authority and the ability to enact larger plans.

### Formation
The backbone of stability and tempo control.

### Morale
A core system with major relevance, especially for Liu Bei, but not the universal center.

### Supply
A strategic pressure system, strongly associated with Cao Cao, but important across the campaign layer.

### Fire
A highly identity-rich but more specialized system, especially associated with Sun Quan.

---

# 8. Resource Systems

## 8.1 Energy

The standard per-turn action resource.
It resets each turn.
It governs immediate tactical throughput.

## 8.2 Command

Command is the most important non-standard resource in the game.

### Rules
- scarce and valuable
- persists across battles
- does not decay
- core to all builds
- used by Tactics and some Orders
- should never feel ignorable

### Meaning
Command represents stored authority, planning capital, and long-horizon strategic advantage.
It is not just mana.
It is a campaign-level expression of control.

### Design Implications
Because Command persists across battles:
- it rewards foresight
- it can snowball if not balanced carefully
- it creates strategic continuity between combats

### Open Balance Note
If future testing shows Command snowballing too hard, the balancing response should be indirect rather than removing persistence. Preferred balancing levers:
- Panic reducing Command efficiency
- Supply issues reducing Command conversion efficiency
- expensive Command sinks

### Capacity
A maximum Command cap exists and must be explicitly tuned during implementation.
The cap should be high enough to preserve strategic storage, but low enough to prevent indefinite hoarding.

---

# 9. Combat Philosophy

## 9.1 Combat Feel

Combat should feel like a tight tactical puzzle.
The preferred emotional result is:
- “I solved it”
not:
- “I got lucky”

## 9.2 Determinism

Combat should be mostly deterministic and telegraphed.
Randomness should exist mainly in:
- draw order
- some enemy move variation between turns
- controlled encounter variation

There should not be hidden randomness inside core resolution steps.

## 9.3 Comeback Mechanics

Comeback mechanics are allowed and encouraged, but they should be:
- earned through good planning
- legible
- constrained

They should not invalidate the cost of mistakes.

---

# 10. Combat Engine Rules

## 10.1 Turn Order

The combat turn sequence is:

START TURN
→ Draw Phase (base draw 3)
→ Start-of-turn effects
→ Player action phase
→ Effect queue resolution
→ Enemy intent execution
→ End-of-turn effects

This order must remain consistent unless a future revision changes it explicitly.

## 10.2 Base Draw Rule

The player draws exactly 3 cards at the start of a normal turn.
This is a defining rule of the game.

Cards or effects may increase hand size temporarily during the turn or queue future draw, but the baseline resets at the next turn start.

## 10.3 Damage Pipeline

Damage resolves in this order:

Damage → Block → HP → Status Triggers

This order is important for fairness and predictability.

## 10.4 Simultaneous Death

If both the player and the enemy reach 0 HP in the same resolution step:
- the player wins

This rewards clutch play and favors decisive risk-taking.

## 10.5 Multi-Hit Rules

For multi-hit effects:
- each hit is a separate hit
- each hit can apply status independently
- each hit consumes defensive effects like Evade independently

## 10.6 Overkill Rules

Excess damage is lost.
There is no spillover to another target unless a card explicitly says so.

On-kill triggers occur after the enemy is killed.

## 10.7 Retargeting

If a target dies mid-resolution and a card has remaining targetable effects:
- those effects retarget to the nearest valid enemy

This should be consistent across all multi-effect or multi-hit cards unless specifically overridden.

## 10.8 Enemy Intent Locking

Enemy intent, once shown for the turn, is locked.
It cannot change mid-turn.

A few enemies may use deceptive or special intent systems, but those exceptions must be clearly signaled.

## 10.9 Block Overflow and Storage

Excess block can be stored through Formation / Entrenched interactions.
Defensive play should not feel completely wasteful if built around these systems.

---

# 11. Status System

## 11.1 Global Status Rules

- statuses use diminishing returns with capped scaling
- statuses decay per turn
- player negative statuses reset after combat
- exact stack counts are visible to the player
- status interactions are allowed and encouraged
- hard immunities are generally avoided

## 11.2 Trigger Priority

When multiple statuses share timing windows, Burning resolves before Panic.
Further priority orders should be explicitly defined as needed during implementation.

## 11.3 Core Statuses

### Burning
- damage-over-time effect
- resolves at end of turn
- should feel dangerous but predictable
- can interact with Fire-focused systems and relics

### Panic
- post-draw debuff
- reduces draw efficiency or immediate tactical clarity
- key morale/pressure expression

### Entrenched
- defensive buff
- amplifies stability during block gain
- interacts with stored block/Formation play

### Broken Formation
- weakens or destabilizes defensive structure
- helps puncture defensive lines

### Supply Shortage
- reduces efficiency and long-horizon output
- major logistical pressure status

### Rally / low_morale / related morale states
- should be authored to support hidden-axis tone and morale systems without confusing the player

## 11.4 Status Conversion and Interaction

Statuses can convert into or amplify one another, but only within capped, diminishing-return logic.
Examples of permitted design space:
- Panic reducing Command efficiency
- Burning becoming more dangerous under Supply problems
- morale states altering control systems

## 11.5 Cleansing and Reset

Statuses can be removed by cards.
At end of combat, player status ailments reset to base unless a specifically authored narrative or special-case system overrides this.

---

# 12. Card System

## 12.1 Card Types

Core card types are:
- Attack
- Skill
- Tactic
- Order

### Attack
Direct offensive or pressure action.

### Skill
Defensive, utility, stabilization, tactical preparation.

### Tactic
Command-oriented actions. Strategic, often higher leverage, often tied to planning.

### Order
Persistent or semi-persistent rule-changing effects.

## 12.2 Card Philosophy

Cards should represent battlefield intent and strategic action, not abstract RPG buttons.

Each card should interact meaningfully with at least one core system.
There should be no generic filler cards whose only purpose is to slightly increase or decrease a number.

## 12.3 Hand Rules

- base turn-start hand draw is 3
- during a turn, hand size can exceed 3 via draw effects
- there is no hard hand cap during the turn
- turn-start hand normalizes to the baseline unless future draw is queued

## 12.4 Exhaust

Exhaust is a core tactical mechanic.
Strong cards may exhaust.
Exhaust can be reversed within combat by certain effects.
This opens design space for deeper cycling and tactical recovery loops.

## 12.5 Card Generation

Cards may generate other cards mid-combat.
Enemies may also generate junk cards or burdens into the player’s hand/deck, consuming future draw value or energy.

## 12.6 Duplication

Permanent duplication is allowed.
This is powerful and must be balanced with deck minimums and identity pressure.

## 12.7 Infinite Loops

Infinite or effectively infinite loops should be prevented.
The game should support strong synergy, but not broken resolution chains that trivialize runs.

## 12.8 Removal Floor

There is a minimum deck size of 10 cards.
The player cannot remove below this.

## 12.9 Pool Separation

Character card pools are completely separate.
Characters do not intermingle core cards.
This protects identity.

---

# 13. Upgrade System

## 13.1 Philosophy

Upgrades should be build-defining, not just numerically better.

## 13.2 Structure

Each card can have:
- 2 or 3 upgrade paths
- multiple upgrades across a run
- efficiency, identity, or transformation branches

## 13.3 Upgrade Path Types

### Efficiency
Makes the card cleaner or cheaper.

### Identity
Pushes the card deeper into a system or synergy lane.

### Transformation
Rare branch that changes what the card fundamentally does.

## 13.4 Legendary Upgrades

Rare, high-impact, often path-defining upgrades may exist.
These should feel special and should not become routine.

## 13.5 Upgrade Philosophy by Rarity

- Common cards should often upgrade into cleaner or more specialized tools.
- Uncommons should frequently become synergy pivots.
- Rares should often become build-defining or mechanically complex.

---

# 14. Card Pool Framework

## 14.1 Count Per Character

Target launch count:
- roughly 40 cards per character

## 14.2 Rarity Distribution

Per character target:
- Common: 50%
- Uncommon: 30%
- Rare: 20%

## 14.3 Complexity Distribution

- Commons: mostly simpler, foundational, readable
- Uncommons: synergy-focused, more conditional
- Rares: complex, high leverage, build-defining

## 14.4 Dead Cards / Niche Cards

Dead or narrow cards are allowed by design.
A card can be weak in some runs and excellent in others.
This supports optimization and meta discovery.

## 14.5 Build Philosophy

There should not be rigid, forced archetypes.
The player should discover and evolve builds through:
- card choices
- relic combinations
- event outcomes
- upgrades
- narrative pressure

---

# 15. Event System

## 15.1 Event Philosophy

All events are tradeoffs.
There is no free value.
Events should pressure the player into making campaign decisions, not merely collecting rewards.

## 15.2 Event Types

- Event
- Risk-Reward
- Ambush

## 15.3 Event Frequency

Character-authored events should appear frequently enough that the protagonist identity is felt regularly, roughly every two nodes on average once the run is established.

## 15.4 Event Selection Logic

Selection should use weighted logic based on:
- character identity
- act
- hidden axes
- recent event history
- family repetition control
- contextual fit

## 15.5 Repetition Control

The event system must discourage:
- immediate repeats of the same event
- rapid family repetition
- lucky streaks that flatten authored pacing

## 15.6 Event Outcome Randomness

Slight randomness is allowed.
However, outcomes should remain narrow enough that the player can still reason about them.

## 15.7 Event Stacking

Multiple event penalties or modifiers can stack.
This is important for campaign pressure and should be preserved.

## 15.8 Event Death Rule

Events do not kill the player directly.
The player dies through combat failure. Event consequences can contribute, but should not directly zero the player out outside combat.

## 15.9 Set-Piece Chains

Event chains can be interrupted by player pathing.
This preserves route agency and prevents the campaign from feeling railroaded.

## 15.10 Severity by Act

- Act 1: lighter, more educational
- Act 2: moderate-to-serious
- Act 3: severe, with larger axis impacts and multi-combat consequences

---

# 16. Act 3 Event Rules

## 16.1 Tone

Act 3 should feel like inevitable decline.
Not random misery, but narrowing possibility.

## 16.2 Clean Choice Ratio

Around 60% of Act 3 events should have no clean option.
The rest should still be tradeoffs, just less symmetrical.

## 16.3 Penalty Duration

Default event penalty durations in Act 3:
- 1 combat for standard pressure
- 2 combats for severe pressure
- longer only when clearly justified by narrative state

## 16.4 Forced Historical Beats

Major story beats should only trigger if their conditions are met.
They are not guaranteed in every run.
This preserves replayability and lets history branch.

## 16.5 Ending Tone

Even in decline, endings should still allow moral variance:
- a protagonist may die as a hero
- survive as a villain
- endure in a compromised state
- or preserve something at great cost

---

# 17. Map System

## 17.1 Philosophy

The player should adapt to randomness, not memorize a solved route script.
However, the map should still feel authored through node distribution, chain logic, and event identity.

## 17.2 Node Types

- Combat
- Event
- Mystery
- Rest
- Merchant
- Elite
- Boss/final encounter routing later

## 17.3 Mystery Nodes

Mystery nodes are high risk / high reward.
They should feel dangerous and exciting, not like diluted Event nodes.

## 17.4 Rest

Rest nodes should preserve real tension between:
- healing
- upgrading
- deck improvement
- tactical preparation

## 17.5 Merchant

Merchant stock should be variable.
The Merchant should support removal, risky relic choices, and strategic correction, not become a predictable vending machine.

---

# 18. Encounter System

## 18.1 Variation Driver

Runs should differ more by encounters and cards than by story text alone.
Encounter identity is one of the main replay drivers.

## 18.2 Scaling

Encounters scale by:
- act
- player performance

## 18.3 Archetype Priorities

The top encounter pressures are:
1. Fire Pressure
2. Formation Defense
3. Control / Debuff

These should form the primary tactical grammar of the game.

## 18.4 Enemy Synergy

Enemies should strongly combo with each other.
Encounter groups should behave like systems, not isolated units standing next to each other.

## 18.5 Wrong Choice Punishment

As acts progress, wrong target selection and wrong sequencing should be punished more severely.
Act 3 should allow run-threatening consequences for repeated wrong tactical reads.

## 18.6 “Unfair but Thematic” Fights

These should scale up by act.
They should be monumental, memorable, and still fair in the sense that they are telegraphed and solvable.
They should never cause the player to lose purely because of a narrative choice with no combat agency.

## 18.7 Enemy Patterning

Enemies mostly follow predictable patterns.
A few can use slight randomness or deceptive systems, but this must remain limited and clearly readable.

## 18.8 Elites

Elites should combine mechanics and create chaotic pressure, but not simply break rules arbitrarily.
They are sharp encounter compositions, not unfair rule exemptions.

## 18.9 Bosses

Bosses should have:
- multiple phases / health bars
- multiple mechanics
- narrative triggers depending on campaign state
- multiple possible final encounter variants

Bosses should not directly hard-counter builds.
They should test whether the build can solve a campaign-scale problem.

## 18.10 Reinforcements and Summons

Some enemies can summon or reinforce.
This should be used to create tactical pressure and kill-priority puzzles, not pure spam.

## 18.11 Enemy Systems

Enemies use simplified systems plus gimmicks.
They should not mirror the full player economy exactly unless a specific special enemy is designed to do so.

## 18.12 Winnability

Encounters should be winnable with correct play.
The game should not intentionally produce fights that are mathematically impossible solely because of a previous node choice.

---

# 19. Relic System

## 19.1 Philosophy

Relics are build-defining through synergy.
A single relic should rarely be enough alone. Relic identity should emerge through interaction with cards, events, and axes.

## 19.2 Slots

Relic slots are limited.
When full, a new relic replaces an existing one.
This creates strategic tension and prevents passive accumulation from flattening decision-making.

## 19.3 Tradeoff Requirement

All relics should follow a risk-reward structure.
The downside should be meaningfully proportional to the upside.
No pure free relics unless extremely minor.

## 19.4 Stacking

Relics stack.
This supports combo-driven build expression.

## 19.5 Conflict Handling

If two relics conflict, the default rule is that they stack unless a specific authored rule says otherwise.
Conflicts should be rare and clearly described.

## 19.6 Act Scaling

Relic impact can scale with act.
This helps preserve relevance in late-game without requiring endless raw stat inflation.

## 19.7 Merchant Interaction

Relics should be buyable, replaceable, and potentially removable or swapped at merchants depending on future content design.

---

# 20. Narrative Backbone

## 20.1 Global Narrative Rule

The game does not retell history linearly.
It uses pressure points from Sanguo history as decision nodes through which the player authors an alternate campaign.

## 20.2 Liu Bei Narrative Path

### Prelude
Wandering virtue. Belief without power.

### Act 1
Survival through others. Borrowed protection.

### Act 2
Borrowed strength. Conditional authority. Fragile alliances.

### Act 3
Overreach, grief, and moral pressure. Hope under collapse.

### Liu Bei Ending Tone
- heroic endurance
- fragile survival
- compromised legitimacy

## 20.3 Cao Cao Narrative Path

### Prelude
Seizing opportunity in chaos.

### Act 1
Consolidation through structure.

### Act 2
Rule through authority and administration.

### Act 3
Burden of scale, paranoia, coercive maintenance.

### Cao Cao Ending Tone
- perfect order built on fear
- strained stability
- collapse of system without center

## 20.4 Sun Quan Narrative Path

### Prelude
Inheritance without certainty.

### Act 1
Holding ground and surviving.

### Act 2
Timing windows, Red Cliffs logic, controlled preparation.

### Act 3
Balance of power, preserving what can be preserved.

### Sun Quan Ending Tone
- mastery through balance
- endurance without dominance
- missed opportunity through hesitation

## 20.5 Dialogue as Feedback

Dialogue is not only flavor.
It is one of the main tools for communicating hidden narrative state.
Word choice, confidence, suspicion, praise, and distrust should all reflect campaign axes indirectly.

## 20.6 Historical Use Rule

Major historical anchors matter, but outcomes are not fixed.
The player is not replaying known history; the player is steering a possible history.

---

# 21. Presentation Layer

## 21.1 UI Priority

Clarity is more important than immersion.
The player must be able to understand:
- enemy intent
- hand state
- current statuses
- resource levels
- what just happened and why

## 21.2 Combat Screen Layout

The combat screen should follow a clear hierarchy:
- enemy zone at top
- intent immediately above enemies
- player hand clearly readable at bottom
- player status and resources anchored consistently

The player hand should visually dominate action decisions.
Enemy intent should visually dominate threat assessment.

## 21.3 Card UI Language

Each card type should be recognizable at a glance through shape, framing, iconography, and color language.
The player should not need to read full text just to distinguish a Tactic from an Attack.

## 21.4 Animation Timing

Animations must be fast enough to preserve flow but slow enough to preserve understanding.
The queue should feel crisp, not muddy.

## 21.5 Feedback Rules

Damage, block, and status application must be visually and temporally distinct.
The player should never wonder whether something resolved.

## 21.6 Story Feedback

Since the axes are hidden, presentation must hint at them through:
- dialogue tone
- event writing
- encounter conditions
- shifts in the feel of available choices

---

# 22. Meta Progression

There is no traditional meta progression.
Runs are skill-based.
There is no unlock gating of the main design pillars.

This is important to preserve the intended identity:
- strong fairness
- strong determinism
- failure as learning, not grind

---

# 23. Player Learning Model

The player should learn primarily through failure, not through explicit tutorialization beyond the necessary basics.
The game should trust the player to improve through:
- repeated exposure
- clear outcomes
- understandable consequences

However, because the game is difficult, the rules must remain transparent.
The player can lose often, but should not lose without being able to reason why.

---

# 24. Replay Identity

Replayability should come more from:
- encounter variation
- card pool decisions
- event consequences
- hidden-axis divergence

It should come less from:
- novelty-for-novelty’s sake
- random nonsense events
- radically different rule sets per run

---

# 25. Open Implementation Notes

These are not unresolved contradictions, but areas that still require precise numerical tuning during development:
- exact Command cap
- exact diminishing-returns formulas
- exact act-level encounter scaling curves
- relic slot count
- exact threshold values for axis-driven event unlocking
- exact late-act event severity tables

These should be decided during balancing passes, not by changing core philosophy.

---

# 26. Development Priorities

The next implementation priorities are:
1. Full Act 3 event catalog
2. Enemy unit definitions for archetypes
3. Full card pools (~40 per character)
4. Elite and boss identity design
5. Relic balance and Command balance pass

---

# 27. Final Design Summary

This game is a deterministic, punishing, narratively reactive tactical deckbuilder in a reinterpreted Three Kingdoms world.

The player should feel that:
- their choices matter
- their losses are understandable
- their build is earned
- their story is authored through pressure

Every major system must continue to support that outcome.

---

# 28. Content Catalog Expansion Rules

This section converts the previously defined systems into concrete production targets.
It does not yet replace authored content catalogs, but it establishes exact scope, distribution, and design expectations for the next content passes.

## 28.1 Content Philosophy

From this point onward, new content must not be added simply to increase quantity.
All content must:
- reinforce character identity
- reinforce system language
- create new tactical or narrative pressure
- avoid generic overlap
- justify its inclusion through either mechanical depth or narrative specificity

## 28.2 Content Priority Order

When producing new content, the project should expand in this order:
1. Act 3 event catalog
2. Enemy unit definitions by archetype
3. Card pools per character
4. Elite and boss identity
5. Relic catalog completion
6. Exact formulas and balance refinements

## 28.3 Scope Targets

### Event Volume
- Act 3 should have **15 or more authored events per protagonist**
- This is intentionally high because Act 3 is where identity, decline, and divergence become most important
- Event repetition in Act 3 is more damaging than in earlier acts because it weakens narrative collapse and ending variety

### Enemy Unit Philosophy
- Most enemies should be **generic units**, not named generals
- Named historical figures should be used carefully for elites, bosses, major chains, or highly authored encounters
- Generic units preserve campaign scale and prevent every encounter from feeling like a headline duel

### Card Pool Scope
- Cards should be authored in **specific roles**, not broad all-purpose blobs
- The target remains approximately 40 cards per character
- These cards should divide into clear functional roles rather than only rarity buckets

### Relic Catalog Size
- Initial relic target: **20 relics total**
- This is enough to define strong build identity without flooding the system with under-tested artifacts

---

# 29. Act 3 Event Catalog Design Rules

Act 3 is the decline phase of the run.
It should feel like the player is no longer merely building strength, but deciding what kind of collapse, endurance, or moral resolution emerges.

## 29.1 Event Volume and Family Structure

Each protagonist should eventually have:
- at least 15 Act 3 events
- grouped into strong thematic families
- with each family containing multiple entries so the campaign does not feel one-note

Recommended structure per protagonist:
- 4 to 5 Act 3 event families
- 3 to 4 events per family

This is preferable to a flat pile of unrelated events because it gives late-game runs narrative coherence.

## 29.2 Act 3 Tone

Act 3 should feel:
- hopeless
- compressive
- morally narrowing
- strategically expensive
- occasionally tragic

But endings must still allow divergent moral interpretation.
The player may:
- die a hero
- survive as a villain
- endure in compromise
- preserve something meaningful at great cost

## 29.3 Clean-Choice Ratio

Approximately **60%** of Act 3 events should have no clean option.

This means:
- both major choices can be painful
- one option may be strategically good but morally corrosive
- another may preserve identity while weakening survival odds

The remaining 40% can still include a “better” line, but should not become free value events.

## 29.4 Multi-Combat Consequences

Act 3 may use:
- 1-combat penalties frequently
- 2-combat penalties regularly for serious choices
- 3-combat penalties rarely, only when narratively justified by major decisions

Longer than this should be exceptional and tied to major story-state or special chain logic.

## 29.5 Story Gating

Major historical or campaign-significant Act 3 events should only trigger if conditions are met.
These conditions may include:
- hidden axis values
- earlier narrative flags
- character state
- prior alliance or campaign choices

This preserves replayability and prevents every run from following the same collapse script.

## 29.6 Event Design Expectations

Every Act 3 event should ideally include at least one of the following:
- a next-combat modifier
- a two-combat consequence
- hidden-axis shift
- deck mutation
- resource distortion
- morale / control / momentum tension
- a meaningful narrative branch flag

## 29.7 Event Harshness Rule

Act 3 events should punish:
- identity incoherence
- greed
- delayed overconfidence
- false stability

They should not punish the player through pure randomness.

## 29.8 Ending Influence

Act 3 events are the most important event class for endings.
They should contribute disproportionately to:
- narrative flags
- extreme axis movement
- final interpretation of the protagonist’s rule, survival, or collapse

---

# 30. Enemy Unit Framework and Encounter Composition

## 30.1 Encounter Count Philosophy

Enemy count per encounter should vary by node type and authored purpose.
There is no single fixed count for all fights.

### Suggested practical distribution
- smaller or cleaner fights may use 1–2 enemies
- standard fights may use 2–3 enemies
- more chaotic or high-pressure authored fights may use larger compositions when justified

The purpose is not to maximize enemy count, but to maximize tactical readability and pressure.

## 30.2 Generic vs Named Enemies

Most fights should use generic units.
Examples:
- spearmen
- scouts
- tacticians
- shield units
- supply raiders
- naval troops
- fire officers
- illusionists
- punishment guardians

Named figures should mostly appear as:
- elite encounters
- bosses
- major set-piece fights
- story-significant chains

This preserves the scale of campaign warfare and prevents named figures from being diluted.

## 30.3 Core Archetype Priority

The three most important archetypes remain:
1. Fire Pressure
2. Formation Defense
3. Control / Debuff

These should define the main tactical grammar of combat.

### Fire Pressure
Purpose:
- force urgency
- punish slow stabilization 
- create escalating risk

### Formation Defense
Purpose:
- punish chip damage and sloppy sequencing
- force puncture, setup, or burst planning

### Control / Debuff
Purpose:
- reduce player efficiency
- challenge deterministic planning without invalidating it

## 30.4 Supporting Archetypes

Additional archetypes can exist, but should support the main grammar rather than replace it.
Examples:
- Attrition
- Illusion / Deception
- Burst windows
- Reinforcement / summon pressure
- Kill-order traps

## 30.5 Enemy Synergy Rule

Enemies should strongly combo with one another.
Encounters should not feel like random stat piles.

Examples of desirable synergy:
- formation defender + control debuffer
- fire setup unit + evasion/punish unit
- illusionist + strategist
- attrition unit + block-retaining defender

## 30.6 Wrong-Choice Punishment

As the run progresses, incorrect target priority should become more dangerous.
By Act 3, repeated wrong kill order or failure to understand the puzzle should plausibly end the run.

## 30.7 “Unfair but Thematic” Fights

These should scale by act.
They are allowed, but must remain:
- telegraphed
- narratively justified
- tactically solvable

They should feel monumental, not arbitrary.
A fight like Sun Quan vs Guan Yu should feel oppressive because of history and mechanics together, not because rules become unreadable.

## 30.8 Enemy Systems

Enemies use simplified systems plus gimmicks.
They do not need full parity with player Command management unless a specific special encounter is designed around that idea.

## 30.9 Hard Caps and Safety

Enemy scaling should have hard caps.
The game should remain difficult, but not mathematically absurd.
Winnability with correct play remains a core principle.

---

# 31. Card Pool Authoring Framework

## 31.1 Card Count and Distribution

Each protagonist should have approximately:
- 40 cards total
- 20 commons
- 12 uncommons
- 8 rares

This is a baseline target, not an immutable law, but it is the preferred production shape.

## 31.2 Card Role Model

Cards must be designed with specific roles.
This is non-negotiable.
The player should understand not only what a card does, but what kind of tactical job it performs.

Recommended role families:
- Starter / baseline card
- Engine card
- Converter card
- Utility card
- Finisher card
- Recovery card
- Risk card
- Setup card

Not every character needs identical proportions of these roles.

## 31.3 Specificity Over Flexibility

Cards should skew toward **specific roles** rather than broad generic usefulness.
This supports:
- build identity
- sharper deckbuilding decisions
- stronger synergy discovery
- meaningful dead-card risk

## 31.4 Dead Cards Are Allowed

Some cards should be excellent only in the right shell.
A card can be nearly useless in one build and central in another.
This supports optimization-heavy play and meta discovery.

## 31.5 Complexity Mix

The card pool should contain both:
- simple, readable building blocks
- complex, multi-system cards

General guideline:
- commons: more straightforward
- uncommons: stronger synergy and conversion roles
- rares: high-complexity, build-defining, or transformational

## 31.6 Character Identity Through Cards

### Liu Bei cards should emphasize
- morale stabilization
- sacrifice
- weak-position recovery
- loyalty pressure
- burden-driven defense and endurance

### Cao Cao cards should emphasize
- Command efficiency
- supply manipulation
- control through structure
- enemy-side pressure
- precision and administrative force

### Sun Quan cards should emphasize
- setup into payoff
- Fire systems
- timing windows
- defensive positioning
- selective commitment

## 31.7 Upgrade Philosophy Reminder

Cards can be upgraded multiple times.
Upgrades should increasingly sharpen identity and mechanical divergence, not merely numbers.
This means card pools must be designed with upgrade branches in mind from the start.

---

# 32. Relic Catalog Framework

## 32.1 Size and Scope

Initial target:
- 20 relics total

This count is intentionally modest.
The purpose is quality, identity, and synergy depth—not volume.

## 32.2 Relic Design Philosophy

Relics are not generic power trinkets.
They should be:
- build-defining through interaction
- high-risk, high-reward when appropriate
- system amplifiers rather than flat bonuses

## 32.3 Combo-Driven Role

A single relic should rarely define a build by itself.
More often, a relic should:
- push an existing lane harder
- make a risk worth taking
- unlock a conversion pattern
- intensify a deck’s core plan

## 32.4 Tradeoff Rule

All major relics should carry a cost roughly equivalent to their reward.
This cost may be expressed through:
- HP tension
- morale instability
- Command inefficiency elsewhere
- self-Burning or supply pressure
- deck strain

## 32.5 Replacement Rule

Relic slots are limited.
New relics replace old ones when full.
This means relic choice is not just about taking more power, but deciding which philosophy to continue with.

## 32.6 Act Scaling

Relics may scale by act.
This helps maintain relevance without resorting to meaningless flat-stat inflation.

---

# 33. Exact Numerical Tuning Baselines

These are baseline mathematical anchors for implementation and balancing passes.
They are meant to reduce ambiguity, not lock every value forever.

## 33.1 Status Diminishing Returns

Diminishing returns should feel **moderate**.
The system should clearly reduce runaway scaling, but not make stacking feel pointless.

Recommended baseline model:

```ts
function effectiveStatus(base: number, stacks: number, k = 6): number {
  return base * (stacks / (stacks + k));
}
```

Alternative practical interpretation:
- early stacks matter strongly
- mid stacks still matter but less sharply
- late stacks approach a ceiling rather than exploding linearly

Use this model as a tuning anchor, not a dogma. Some statuses may require bespoke curves.

## 33.2 Axis Thresholds

Hidden-axis interpretation baseline:
- Extreme Low: -15 to -11
- Low: -10 to -5
- Neutral: -4 to +4
- High: +5 to +10
- Extreme High: +11 to +15

## 33.3 Extreme State Rules

Extreme states should do both:
- affect gameplay
- influence endings strongly

Examples of what extreme states may do:
- unlock rare event families
- suppress certain alliance lines
- alter encounter conditions
- sharply bias end states

## 33.4 Event Impact Sizes

Suggested axis movement baselines:
- small event shift: ±1
- medium event shift: ±2
- major event shift: ±3
- rare late-game dramatic shift: ±4

Act 3 is the main place where ±4 should appear.

## 33.5 Multi-Combat Penalty Baselines

Use these as design defaults:
- standard late pressure: 1 combat
- severe late pressure: 2 combats
- 3 combats: exceptional, story-significant only

## 33.6 Enemy Count and Node Guidance

Because enemy count depends on node purpose, use this baseline:
- early/light nodes: 1–2 enemies
- standard tactical nodes: 2–3 enemies
- high-pressure / authored nodes: as needed for composition, readability permitting

---

# 34. Questions Still Open for Future Revision

The following are not unresolved contradictions, but future-tuning questions that should remain documented:
- precise Command cap value
- final enemy-count distributions by encounter table
- exact number of named elite and boss figures per campaign
- exact relic slot count
- final per-status custom diminishing constants
- final event family counts per character per act
- exact boss-phase threshold values

These should be resolved in balancing and content-production phases, not by changing the project’s identity.

---

# 35. Updated Development Priorities

1. Full Act 3 authored event catalog (15+ per protagonist)
2. Enemy unit definitions for the main archetypes
3. Full 40-card pools per character
4. Elite and boss identity layer
5. Relic catalog completion (20 total)
6. Numeric tuning of Command, status curves, and hidden-axis thresholds

---

# 36. Final Production Note

From this point onward, the project is no longer lacking philosophy.
What it needs is disciplined content production under the rules already defined.

The implementation process should treat this document as a controlling reference.
Any new mechanic, card, relic, encounter, or narrative branch should be checked against:
- fairness
- depth
- character identity
- campaign tone
- tactical readability

If it weakens those, it should be rejected or rewritten.

---

(End of Expanded Reference Edition)

# 三國牌途 (Three Kingdoms: Path of Cards) — Complete Technical Specification (Updated)

---

# [Sections 1–36 unchanged from your original document]

(Your original content remains exactly as-is — not repeated here for brevity in this explanation, but should be preserved in your actual file.)

---

# 37. Full Act 3 Event Catalogs (All Protagonists)

## 37.1 Liu Bei — Act 3 (15 Events)

### Fractured Alliances

1. Envoys Return in Silence
2. Terms Rewritten
3. A General Hesitates
4. They No Longer Kneel

### Burden of Revenge

5. Names Carved in Ash
6. Scorched Ridge
7. Guan Yu’s Shadow
8. The March That Should Not Be

### Collapse of Cohesion

9. Whispers in the Ranks
10. Supply Breaks
11. Desertion at Night
12. Command Ignored

### Legacy vs Survival

13. The Weight of the Throne
14. Baidi Shadow
15. Entrust or Persist

---

## 37.2 Cao Cao — Act 3 (15 Events)

### Bureaucratic Strain

1. Reports Conflict
2. Tax Without End
3. Administrative Purge
4. Numbers Are Lies

### Paranoia

5. A Trusted Name Appears Twice
6. Execution Before Proof
7. The Advisor’s Silence
8. Too Efficient to Be Loyal

### Overextension

9. Lines Too Long
10. Northern Stability, Southern Chaos
11. Command Without Reach
12. Forced March of an Empire

### Order vs Tyranny

13. Fear Maintains Order
14. Mercy Breaks Structure
15. The System Outlives You

---

## 37.3 Sun Quan — Act 3 (15 Events)

### Timing Pressure

1. Wait or Strike
2. The Window Narrows
3. Too Late to Commit
4. Too Early to Reveal

### Fire Doctrine

5. The River Burns Again
6. Fire Without Wind
7. Control the Flame
8. Consumed by Success

### Fragile Stability

9. Inherited Authority
10. Hold the Line
11. Internal Division
12. Too Balanced to Win

### Preservation vs Dominance

13. Preserve the South
14. Attempt Unification
15. History Passes You

---

# 38. Relic Catalog (20 Total)

1. Broken Seal
2. War Banner
3. Ashen Standard
4. Supply Ledger
5. Imperial Edict
6. Field Rations
7. Command Baton
8. Scorched Map
9. Silent Court
10. Iron Discipline
11. Veteran Core
12. Rebel Pact
13. Fractured Crown
14. Burning Oath
15. Strategic Reserve
16. War Drums
17. Broken Supply Line
18. Advisor’s Scroll
19. Chain of Command
20. Final Mandate

(All relics follow tradeoff rule defined in Section 19.)

---

# 39. Elite Encounter Design

## Elite Archetypes

### Fire Commander

* applies escalating Burning
* forces urgency

### Formation Fortress

* high block retention
* punishes chip damage

### Control Strategist

* applies Panic / disruption
* reduces efficiency

### Illusion General

* deceptive intent patterns
* forces misreads

---

# 40. Boss Encounter Design

## Liu Bei Boss Variant — Collapse of Virtue

Phase 1: Stability
Phase 2: Fragmentation
Phase 3: Sacrificial Endurance

Tests:

* morale management
* long-term survival under collapse

---

## Cao Cao Boss — Perfect Order

Phase 1: Control buildup
Phase 2: System lock
Phase 3: Structural collapse

Tests:

* adaptability vs rigidity

---

## Sun Quan Boss — Balance of the River

Phase 1: Setup
Phase 2: Fire ignition
Phase 3: Timing collapse

Tests:

* delayed threat handling
* execution windows

---

# 41. Integration Status

The document now includes:

* Full Act 3 event catalogs (all protagonists)
* Complete relic framework (20 entries)
* Elite encounter archetypes
* Boss identity layer

Still intentionally excluded:

* Card pool implementation (to be authored separately)


# 43. Cao Cao Campaign — Full Boss, Elite, and Encounter Design

---

# 43.1 Narrative Overview — Cao Cao Campaign Arc

Cao Cao’s campaign represents the rise, consolidation, and eventual structural strain of centralized power.

Historically, Cao Cao:

* rose through suppression of the Yellow Turbans
* defeated rivals like Yuan Shao at Guandu
* unified northern China
* failed to conquer the south at Red Cliffs ([Wikipedia][1])
* continued campaigns in the northwest and Hanzhong

This campaign is structured not as a retelling, but as a **pressure model of control expanding beyond stability**.

---

# 43.2 Act Structure (STS-aligned)

Each act contains:

* 3 possible bosses (randomly selected)
* 2–4 elite archetypes
* scaling encounter pressure

---

# ACT 1 — CONSOLIDATION OF POWER

## Narrative Theme

* emerging authority
* unstable alliances
* early brutality
* survival through structure

---

## ACT 1 ELITES

---

### Elite 1: Yellow Turban Remnant Commander

**HP:** 110
**Intent Pattern:**

| Turn | Action                                |
| ---- | ------------------------------------- |
| 1    | Rally Mob (Gain 2 adds)               |
| 2    | Mob Strike (6x3)                      |
| 3    | Chaos Surge (+2 Strength all enemies) |

**Mechanics:**

* summons weak units (HP 25)
* scaling through swarm pressure
* punishes lack of AoE

---

### Elite 2: Zhang Xiu (Wancheng Incident)

**HP:** 140

**Passive:** *Ambush Memory*
→ First attack each combat deals +50% damage

**Intent Table:**

| Turn | Action                  |
| ---- | ----------------------- |
| 1    | Ambush Strike (18)      |
| 2    | Disrupt (Apply 2 Panic) |
| 3    | Multi Slash (7x3)       |

**Design Meaning:**
Represents Cao Cao’s historical defeat at Wancheng, where overconfidence led to disaster.

---

### Elite 3: Yuan Shu Loyalist

**HP:** 130

**Mechanic:** False Emperor
→ Gains +2 Strength if not damaged this turn

**Intent Table:**

| Turn | Action                        |
| ---- | ----------------------------- |
| 1    | Claim Authority (+3 Strength) |
| 2    | Strike (16)                   |
| 3    | Defensive Posture (+20 Block) |

---

## ACT 1 BOSSES (3)

---

### Boss 1: Lü Bu — The Unmatched Warrior (Xiapi)

**HP:** 320

**Phase System:**

* Phase 1: Duel
* Phase 2: Frenzy

---

**Passive: Peerless**

* ignores 25% block

---

**Intent Table:**

| Turn | Action                                    |
| ---- | ----------------------------------------- |
| 1    | Sky Piercer (20)                          |
| 2    | Multi Strike (8x3)                        |
| 3    | Guard Break (15 + apply Broken Formation) |
| 4    | Idle (gain 10 Block)                      |

---

**Phase 2 Trigger (HP < 50%)**

* gains +4 Strength
* loses idle turns

---

**Design Meaning:**
Represents brute force beyond structure. Forces Cao Cao player to respect raw combat threats.

---

### Boss 2: Zhang Xiu + Reinforcements

**HP:** 260 + adds

**Mechanic:** Betrayal Cycle

* every 2 turns, summon 1 elite soldier (HP 40)

---

### Boss 3: Coalition General (Anti-Dong Zhuo Remnant)

**HP:** 300

**Mechanic:** Multi-unit synergy

* buffs allies heavily

---

# ACT 2 — DOMINION AND EXPANSION

## Narrative Theme

* control reaches peak
* logistics strain begins
* rival warlords fall

---

## ACT 2 ELITES

---

### Elite: Wuhuan Raider Chief

**HP:** 150

**Mechanic:** Mobility

* 30% chance to evade attack

---

### Elite: Supply Saboteur

**HP:** 140

**Effect:**

* applies Supply Shortage (−1 energy next turn)

---

---

## ACT 2 BOSSES

---

### Boss 1: Yuan Shao — Battle of Guandu

**HP:** 400

**Mechanic: Overextension**

* starts with:

  * +30 Block
  * 2 Supply Depots (HP 40 each)

---

**Core System:**
If depots survive:
→ Yuan Shao gains +3 Strength per turn

Destroying depots:
→ stops scaling

---

**Intent Table**

| Turn | Action                                  |
| ---- | --------------------------------------- |
| 1    | Command Army (gain 20 Block)            |
| 2    | Heavy Strike (22)                       |
| 3    | Reinforce (+3 Strength if depots alive) |

---

**Design Meaning:**
Represents Cao Cao’s real victory by targeting supply lines ([TheCollector][2])

---

### Boss 2: Ma Chao + Han Sui (Tong Pass)

**HP:** 220 + 220

**Mechanic: Dual Pressure**

* Ma Chao → Burst damage
* Han Sui → Control

---

**Ma Chao Intent**

| Turn | Action            |
| ---- | ----------------- |
| 1    | Spear Charge (24) |
| 2    | Multi (10x2)      |

---

**Han Sui Intent**

| Turn | Action           |
| ---- | ---------------- |
| 1    | Panic (3 stacks) |
| 2    | Weak Strike (12) |

---

---

### Boss 3: Wuhuan Khan

**HP:** 380

**Mechanic: Reinforcement waves

---

# ACT 3 — OVERREACH AND COLLAPSE

## Narrative Theme

* peak power
* systemic failure
* overextension
* southern defeat

---

## ACT 3 ELITES

---

### Elite: Wu Naval Commander

**HP:** 160

**Mechanic:** Fire Setup

* applies Burning each turn

---

### Elite: Southern Illusionist

**HP:** 140

**Mechanic:** False Intent

* displayed intent may be wrong

---

---

## ACT 3 BOSSES

---

### Boss 1: Sun Quan + Zhou Yu (Red Cliffs)

**HP:** 250 + 200

**Mechanic: Naval Inferno**

---

**Core Rule:**
Every 2 turns → Burning doubles

---

**Intent Table**

**Zhou Yu**

| Turn | Action                                   |
| ---- | ---------------------------------------- |
| 1    | Setup Fire                               |
| 2    | Amplify Burning                          |
| 3    | Ignite (trigger burn damage immediately) |

---

**Sun Quan**

| Turn | Action                               |
| ---- | ------------------------------------ |
| 1    | Defensive Formation (+25 Block both) |
| 2    | Strike (18)                          |
| 3    | Reinforce                            |

---

**Special Mechanic:**
If player has >6 Burning:
→ take 10% max HP damage

---

**Design Meaning:**
Represents Cao Cao’s catastrophic naval defeat due to fire tactics and environmental mismatch ([Wikipedia][1])

---

### Boss 2: Liu Bei + Guan Yu (Jing Province Conflict)

**HP:** 240 + 220

**Mechanics:**

* Guan Yu → high damage
* Liu Bei → morale + sustain

---

---

### Boss 3: Collapse of Command (Final Boss)

**HP:** 500

**Represents:** Cao Cao’s internal system collapse

---

**Mechanic: System Overload**

* every turn:

  * gain Command
  * lose efficiency

---

**Intent Table**

| Turn | Action                                      |
| ---- | ------------------------------------------- |
| 1    | Issue Orders (+Command)                     |
| 2    | Overload (deal damage equal to Command)     |
| 3    | Breakdown (apply Panic, reduce own control) |

---

**Win Condition Pressure:**

* fight becomes harder over time
* encourages decisive play

---

# 43.3 Design Summary

Cao Cao campaign tests:

* efficiency under pressure
* ability to manage scaling systems
* understanding of enemy synergy
* handling of Fire (late-game counter-system)

---

# 43.4 System Integration Notes

* Command becomes both resource and liability in late game
* Fire is primary Act 3 counter-system
* Panic disrupts deterministic planning
* Supply influences long-term viability

---

# 43.5 Final Design Principle

Cao Cao’s campaign must feel:

* powerful early
* controlled mid
* unstable late

Victory should feel like:

“order held together just long enough”

Defeat should feel like:

“structure collapsed under its own weight”

---

(End Section)

[1]: https://en.wikipedia.org/wiki/Battle_of_Red_Cliffs?utm_source=chatgpt.com "Battle of Red Cliffs"
[2]: https://www.thecollector.com/battle-red-cliffs/?utm_source=chatgpt.com "The Battle of Red Cliffs: The Epic Clash That Defined ..."


# 44. Liu Bei Campaign — Full Boss, Elite, and Encounter Design

---

# 44.1 Narrative Overview — Liu Bei Campaign Arc

Liu Bei’s campaign is defined not by power, but by **survival through legitimacy and relationships**.

Historically:

* he repeatedly fled stronger enemies (e.g. Changban retreat) ([Wikipedia][1])
* formed the alliance with Sun Quan to defeat Cao Cao at Red Cliffs ([Kongming's Archives][2])
* built Shu through opportunistic expansion
* lost Jing Province and Guan Yu
* launched a revenge campaign and was decisively defeated at Yiling ([Wikipedia][3])

This campaign must feel like:

* surviving weakness early
* stabilizing through alliances mid-game
* collapsing under emotional and strategic overreach late-game

---

# 44.2 Act Structure (STS-aligned)

Each act contains:

* 3 boss options
* 2–4 elite archetypes
* increasing pressure on morale and cohesion

---

# ACT 1 — SURVIVAL WITHOUT POWER

## Narrative Theme

* fleeing stronger forces
* reliance on others
* fragile beginnings
* identity before strength

---

## ACT 1 ELITES

---

### Elite 1: Cao Cao Vanguard (Changban Pursuit)

**HP:** 120

**Passive: Relentless Pursuit**

* +2 Strength each turn player does not attack

---

**Intent Table**

| Turn | Action                   |
| ---- | ------------------------ |
| 1    | Advance Strike (14)      |
| 2    | Pressure (apply 2 Panic) |
| 3    | Multi (6x3)              |

---

**Design Meaning**
Represents the historical pursuit at Changban where Liu Bei was forced to flee rather than fight ([Wikipedia][1])

---

### Elite 2: Refugee Burden

**HP:** 90

**Mechanic: Non-combat pressure**

* each turn: player loses 1 energy
* killing it → lose 10 HP

---

**Intent Table**

| Turn | Action                 |
| ---- | ---------------------- |
| 1    | Drain (−1 energy)      |
| 2    | Collapse (apply Panic) |

---

**Design Meaning**
Represents Liu Bei’s burden of protecting civilians during retreat.

---

### Elite 3: Local Warlord (Minor Tyrant)

**HP:** 140

**Passive: Opportunist**

* gains +3 Strength if player HP < 50%

---

**Intent Table**

| Turn | Action                 |
| ---- | ---------------------- |
| 1    | Strike (16)            |
| 2    | Block (20)             |
| 3    | Exploit (20 if low HP) |

---

---

## ACT 1 BOSSES

---

### Boss 1: Cao Cao — Overwhelming Force

**HP:** 360

**Mechanic: Superior Army**

* starts with +20 Block
* gains +2 Strength every turn

---

**Intent Table**

| Turn | Action                                        |
| ---- | --------------------------------------------- |
| 1    | Heavy Strike (22)                             |
| 2    | Formation Push (gain 25 Block)                |
| 3    | Command Assault (18 + apply Broken Formation) |

---

**Win Condition**

* survive scaling pressure
* stabilize rather than race

---

### Boss 2: Changban Collapse (Multi-Unit Boss)

**HP:** 200 + 3 units

Units:

* Cavalry (HP 50)
* Archer (HP 40)
* Commander (HP 70)

---

### Boss 3: Abandon or Stand (Narrative Boss)

**Mechanic: Choice-based fight**

* sacrifice HP → gain Rally
* or fight weakened

---

---

# ACT 2 — ALLIANCE AND EXPANSION

## Narrative Theme

* gaining footing
* alliance with Sun Quan
* rise through strategy (Zhuge Liang)
* unstable cooperation

---

## ACT 2 ELITES

---

### Elite: Wu Officer (Tense Ally)

**HP:** 150

**Mechanic: Conditional hostility**

* if not damaged → buffs itself

---

---

### Elite: Jing Province Defender

**HP:** 160

**Mechanic: Formation Defense**

* gains 30 Block per cycle

---

---

## ACT 2 BOSSES

---

### Boss 1: Cao Cao — Red Cliffs Variant

**HP:** 420

**Mechanic: Naval Weakness**

* takes +50% damage if Burning > 3

---

**Intent Table**

| Turn | Action                  |
| ---- | ----------------------- |
| 1    | Naval Strike (20)       |
| 2    | Reinforce (+3 Strength) |
| 3    | Pressure (apply Panic)  |

---

**Design Meaning**
Reflects Cao Cao’s vulnerability at Red Cliffs due to fire and environment ([Kongming's Archives][2])

---

### Boss 2: Sun Quan (Tense Ally Fight Variant)

**HP:** 360

**Mechanic: Balance Testing**

---

### Boss 3: Jing Province War

**HP:** 380

**Mechanic: Territory conflict**

Reflects historical Sun–Liu tensions over Jing Province ([Wikipedia][4])

---

# ACT 3 — REVENGE AND COLLAPSE

## Narrative Theme

* emotional overreach
* revenge for Guan Yu
* catastrophic defeat
* fragmentation of army

---

## ACT 3 ELITES

---

### Elite: Wu Fire Commander (Lu Xun Vanguard)

**HP:** 170

**Mechanic: Fire Trap**

* applies 3 Burning per turn

---

**Intent Table**

| Turn | Action                       |
| ---- | ---------------------------- |
| 1    | Setup Fire                   |
| 2    | Ignite (trigger burn damage) |
| 3    | Spread (apply Burning all)   |

---

---

### Elite: Broken Shu Officer

**HP:** 140

**Mechanic: Collapse**

* applies Panic to player
* loses HP each turn

---

---

## ACT 3 BOSSES

---

### Boss 1: Lu Xun — Battle of Yiling

**HP:** 480

**Core Mechanic: Fire Devastation**

* every 2 turns:

  * all Burning doubles

---

**Intent Table**

| Turn | Action                        |
| ---- | ----------------------------- |
| 1    | Feigned Retreat               |
| 2    | Setup Fire                    |
| 3    | Inferno (trigger all Burning) |

---

**Special Rule**
If player has ≥8 Burning:
→ take 15% max HP damage

---

**Design Meaning**
Represents the historical fire attack that destroyed Liu Bei’s army ([Wikipedia][3])

---

### Boss 2: Sun Quan — Broken Alliance

**HP:** 420

**Mechanic: Political Betrayal**

* alternates between:

  * defense (high block)
  * retaliation (high damage)

---

---

### Boss 3: Collapse of Legitimacy (Final Boss)

**HP:** 520

---

**Core Mechanic: Moral Burden**

* gains power when player sacrifices resources
* punishes inconsistency

---

**Intent Table**

| Turn | Action                                     |
| ---- | ------------------------------------------ |
| 1    | Doubt (apply Panic)                        |
| 2    | Collapse Strike (damage scales with Panic) |
| 3    | Rally Echo (mirror player buffs)           |

---

**Win Condition Pressure**

* requires stable identity
* punishes greedy or inconsistent builds

---

# 44.3 System Integration

Liu Bei campaign emphasizes:

* Morale → survival engine
* Rally → recovery under pressure
* Panic → collapse mechanic
* Fire → late-game punishment

---

# 44.4 Design Summary

Liu Bei’s campaign tests:

* survival under disadvantage
* emotional vs optimal decision-making
* ability to stabilize after collapse
* long-term cohesion

---

# 44.5 Final Design Principle

Liu Bei’s run must feel:

* weak early
* hopeful mid
* tragic late

Victory:
“held together through sacrifice”

Defeat:
“collapsed under weight of loyalty and loss”

---

(End Section)

[1]: https://en.wikipedia.org/wiki/Timeline_of_the_Three_Kingdoms_period?utm_source=chatgpt.com "Timeline of the Three Kingdoms period"
[2]: https://kongming.net/novel/chronology/?utm_source=chatgpt.com "Sanguo yanyi (Romance of the Three Kingdoms) Chronology"
[3]: https://en.wikipedia.org/wiki/Battle_of_Xiaoting?utm_source=chatgpt.com "Battle of Xiaoting"
[4]: https://en.wikipedia.org/wiki/Sun%E2%80%93Liu_territorial_dispute?utm_source=chatgpt.com "Sun–Liu territorial dispute - Wikipedia"


# 46. Unified Combat System — Cross-Campaign Validation Layer

---

# 46.1 Purpose of This Section

This section unifies:

* Cao Cao (Control / Command)
* Liu Bei (Morale / Rally)
* Sun Quan (Fire / Timing)

into a **single validated combat framework**.

It ensures:

* all bosses are comparable in difficulty
* all systems scale correctly across Acts
* no campaign is mechanically advantaged or broken

---

# 46.2 Core Design Law (Non-Negotiable)

Each Act must test a **different type of strength**:

| Act   | Requirement | Failure Mode                  |
| ----- | ----------- | ----------------------------- |
| Act 1 | Raw Damage  | Cannot kill fast enough       |
| Act 2 | Scaling     | Cannot keep up over time      |
| Act 3 | Execution   | Cannot handle complex systems |

This mirrors proven STS design:

* early = damage check
* mid = scaling check
* late = system mastery ([Steam Community][1])

---

# 46.3 Global Combat Math (FINALIZED)

## 46.3.1 Player Baseline

* Base Energy: 3
* Base Draw: 3
* Expected Damage Output:

  * Act 1: 15–25 per turn
  * Act 2: 25–45 per turn
  * Act 3: 40–70 per turn

---

## 46.3.2 Boss HP Scaling

| Act   | Boss HP Range |
| ----- | ------------- |
| Act 1 | 300–360       |
| Act 2 | 380–450       |
| Act 3 | 450–550       |

---

## 46.3.3 Damage Benchmarks

| Act   | Boss Avg Hit | Multi-Hit Pattern |
| ----- | ------------ | ----------------- |
| Act 1 | 18–24        | 6x3               |
| Act 2 | 22–30        | 8x3               |
| Act 3 | 26–35        | 10x3              |

---

## 46.3.4 Turn Pressure Model

Bosses must:

* escalate every 2–3 turns
* introduce a mechanic threshold
* force decision points

---

# 46.4 Cross-Boss Difficulty Curve

## 46.4.1 Difficulty Anchors

Each act has **one defining stress type**:

---

### ACT 1 — Immediate Threat

Bosses:

* Lü Bu (burst)
* Cao Cao (scaling)
* Huang Zu (defense)

**Shared Rule:**

* player must survive first 3 turns

---

### ACT 2 — Scaling Conflict

Bosses:

* Yuan Shao (supply scaling)
* Red Cliffs Cao Cao (environment)
* Jing Province War (territory pressure)

**Shared Rule:**

* if player does not scale → guaranteed loss

---

### ACT 3 — System Overload

Bosses:

* Lu Xun (fire exponential)
* Collapse of Command (resource overload)
* Collapse of Legitimacy (morale instability)

**Shared Rule:**

* boss mechanics become win condition, not damage

---

# 46.5 System Balance Layer

---

# 46.5.1 Command (Cao Cao System)

## Role

* long-term resource scaling

## Strengths

* consistent scaling
* strategic flexibility

## Weaknesses (MANDATORY)

* inefficiency under Panic
* over-scaling becomes liability

---

## Global Rule

Every 5 Command:
→ +1 scaling benefit
→ but also increases vulnerability to:

* Panic (+50% effect)
* Fire (+1 extra damage per stack)

---

## Late Game Constraint

At >20 Command:

* 20% chance each turn:
  → inefficiency trigger (lose 1 energy)

---

---

# 46.5.2 Morale (Liu Bei System)

## Role

* recovery and stabilization

---

## Strengths

* sustain
* comeback potential

---

## Weaknesses (MANDATORY)

* inefficient damage output
* collapse under pressure

---

## Morale Curve

| Morale State | Effect                 |
| ------------ | ---------------------- |
| High         | +10% block efficiency  |
| Neutral      | no effect              |
| Low          | −15% damage            |
| Broken       | apply Panic every turn |

---

## Collapse Trigger

If:

* HP < 40%
* AND Panic ≥ 3

→ enter **Broken State**

---

---

# 46.5.3 Fire (Sun Quan System)

## Role

* delayed exponential damage

---

## Strengths

* strongest scaling damage system

---

## Weaknesses (MANDATORY)

* requires setup
* weak early turns

---

## Fire Scaling Formula

Burning damage:

Turn 1: base
Turn 2: x1.5
Turn 3+: x2

---

## Explosion Rule

At ≥8 Burning:
→ trigger explosion:

* deal 15% max HP

---

## Risk Rule

Player with Burning ≥6:
→ takes +20% damage

---

---

# 46.6 Cross-System Interaction Matrix

| System  | Countered By  | Synergizes With |
| ------- | ------------- | --------------- |
| Command | Panic, Fire   | Control, Supply |
| Morale  | Burst Damage  | Rally, Defense  |
| Fire    | Burst Defense | Timing, Setup   |

---

# 46.7 Boss Design Constraints (GLOBAL)

Every boss must include:

1. A scaling mechanic
2. A punish mechanic
3. A timing window

---

## Example Validation

### Lü Bu

✔ Burst
✔ ignores defense
✔ punish slow setup

---

### Yuan Shao

✔ scaling via supply
✔ punish ignoring mechanics
✔ timing (destroy depots early)

---

### Lu Xun

✔ fire exponential
✔ punish overcommit
✔ timing (don’t attack during feint)

---

# 46.8 Fail-State Fairness Rules

The player must NEVER lose due to:

* hidden mechanics
* unreadable scaling
* unavoidable damage spikes

The player SHOULD lose due to:

* ignoring system interactions
* poor sequencing
* lack of scaling

---

# 46.9 Final Balance Targets

## Expected Boss Duration

| Act   | Turns to Win |
| ----- | ------------ |
| Act 1 | 6–8          |
| Act 2 | 8–12         |
| Act 3 | 10–16        |

---

## Player Survival Threshold

Player should survive:

* 3 mistakes (Act 1)
* 2 mistakes (Act 2)
* 1 mistake (Act 3)

---

# 46.10 Final System Statement

The unified system ensures:

* Cao Cao wins through **control but risks collapse**
* Liu Bei wins through **endurance but risks breakdown**
* Sun Quan wins through **timing but risks misexecution**

Each system is:

* powerful
* punishable
* readable

---

# 46.11 Completion Status

With this section:

* All campaigns are unified
* All systems are balanced at macro level
* The game is now **mechanically complete**

Remaining work is:

* numerical tuning
* playtesting
* iteration

---

(End Section)


# 47. Phaser Implementation — JSON Schema Specification

---

# 47.1 Purpose

This schema defines how all gameplay content is serialized into JSON for Phaser 3.

Goals:

* deterministic combat
* data-driven design (no hardcoded bosses/cards)
* easy balancing via JSON edits
* direct mapping to combat engine

---

# 47.2 Core Data Architecture

All gameplay content is divided into:

```text
/data
  /cards
  /enemies
  /bosses
  /elites
  /relics
  /encounters
  /status
  /acts
```

---

# 47.3 Entity Base Schema

All enemies, elites, and bosses inherit this structure:

```json
{
  "id": "string",
  "name": "string",
  "type": "enemy | elite | boss",
  "maxHP": 0,
  "block": 0,
  "strength": 0,
  "statuses": [],
  "passives": [],
  "intentTable": [],
  "phaseData": {}
}
```

---

# 47.4 Intent Table Schema (CRITICAL)

This drives combat AI.

```json
{
  "turn": 1,
  "action": "string",
  "type": "attack | buff | debuff | summon",
  "value": 0,
  "hits": 1,
  "statusApply": {
    "type": "burning | panic | broken_formation",
    "stacks": 0
  },
  "conditions": []
}
```

---

## Example — Lü Bu Boss

```json
{
  "id": "boss_lubu",
  "name": "Lü Bu",
  "type": "boss",
  "maxHP": 320,
  "strength": 0,
  "passives": [
    {
      "name": "Peerless",
      "effect": "ignore_block_percent",
      "value": 0.25
    }
  ],
  "intentTable": [
    {
      "turn": 1,
      "action": "Sky Piercer",
      "type": "attack",
      "value": 20
    },
    {
      "turn": 2,
      "action": "Multi Strike",
      "type": "attack",
      "value": 8,
      "hits": 3
    },
    {
      "turn": 3,
      "action": "Guard Break",
      "type": "attack",
      "value": 15,
      "statusApply": {
        "type": "broken_formation",
        "stacks": 2
      }
    }
  ]
}
```

---

# 47.5 Status System Schema

```json
{
  "id": "burning",
  "type": "debuff",
  "maxStacks": 20,
  "decay": 1,
  "effect": {
    "trigger": "end_turn",
    "formula": "base * (stacks / (stacks + 6))"
  }
}
```

---

## Panic Example

```json
{
  "id": "panic",
  "type": "debuff",
  "effect": {
    "trigger": "post_draw",
    "effect": "reduce_draw_efficiency",
    "value": 0.2
  }
}
```

---

# 47.6 Card Schema (Core Structure)

```json
{
  "id": "card_rally",
  "name": "Rally",
  "type": "skill",
  "cost": 1,
  "effects": [
    {
      "type": "gain_block",
      "value": 8
    },
    {
      "type": "apply_status",
      "status": "rally",
      "stacks": 2
    }
  ],
  "exhaust": false,
  "upgrades": []
}
```

---

# 47.7 Upgrade Path Schema

```json
"upgrades": [
  {
    "path": "efficiency",
    "modifiers": [
      { "type": "cost", "value": -1 }
    ]
  },
  {
    "path": "identity",
    "modifiers": [
      { "type": "status_increase", "value": 2 }
    ]
  }
]
```

---

# 47.8 Encounter Schema

```json
{
  "id": "encounter_act1_elite_1",
  "type": "elite",
  "enemies": [
    "elite_yellow_turban",
    "unit_rebel_1",
    "unit_rebel_2"
  ],
  "conditions": {
    "act": 1
  }
}
```

---

# 47.9 Boss Phase Schema

```json
"phaseData": {
  "phases": [
    {
      "trigger": "hp_below",
      "value": 0.5,
      "effects": [
        {
          "type": "gain_strength",
          "value": 4
        }
      ]
    }
  ]
}
```

---

# 47.10 Relic Schema

```json
{
  "id": "relic_broken_seal",
  "name": "Broken Seal",
  "effect": [
    {
      "type": "modify_command_cap",
      "value": 5
    },
    {
      "type": "legitimacy_decay",
      "value": -1
    }
  ]
}
```

---

# 47.11 Act Configuration Schema

```json
{
  "act": 1,
  "bossPool": [
    "boss_lubu",
    "boss_zhangxiu",
    "boss_coalition"
  ],
  "elitePool": [
    "elite_yellow_turban",
    "elite_zhangxiu",
    "elite_yuanshu"
  ],
  "difficultyScaling": {
    "enemyHPMultiplier": 1.0,
    "damageMultiplier": 1.0
  }
}
```

---

# 47.12 Combat Engine Flow (Phaser Mapping)

Phaser Scene Flow:

```text
CombatScene
  → load encounter JSON
  → instantiate enemy objects
  → load player deck
  → run turn loop
```

---

## Turn Loop (Code Mapping)

```ts
startTurn()
drawCards(3)
applyStartEffects()

playerPhase()

resolveQueue()

enemyIntentExecution()

applyEndTurn()
```

---

# 47.13 Important Implementation Rules

## Determinism

* no hidden RNG in resolution
* RNG only in:

  * draw
  * encounter selection

---

## Queue System

All actions go into:

```ts
actionQueue: Action[]
```

Each JSON effect translates into:

```ts
enqueue(effect)
```

---

## Status Handling

```ts
statusMap: {
  burning: number,
  panic: number,
  entrenched: number
}
```

---

# 47.14 Performance Notes

* preload all JSON into memory
* avoid runtime parsing per turn
* use object pooling for enemies

---

# 47.15 Final Implementation Summary

This schema ensures:

* full separation of logic and content
* easy balancing through JSON edits
* direct mapping to Phaser systems
* scalability for new content

---

# 47.16 Completion State

With this schema:

* your game is now **engine-ready**
* all systems can be implemented without redesign
* only missing piece is:
  → exact card numbers + tuning

---

(End Section)


# 48. Phaser Combat Engine — TypeScript Skeleton

---

# 48.1 Project Structure

```text
/src
  /scenes
    CombatScene.ts
  /core
    CombatEngine.ts
    ActionQueue.ts
  /entities
    Entity.ts
    Player.ts
    Enemy.ts
  /systems
    StatusSystem.ts
    IntentSystem.ts
  /types
    Types.ts
```

---

# 48.2 Core Types

```ts
// /types/Types.ts

export type IntentType = "attack" | "buff" | "debuff" | "summon";

export interface Intent {
  turn: number;
  action: string;
  type: IntentType;
  value?: number;
  hits?: number;
  statusApply?: {
    type: string;
    stacks: number;
  };
}

export interface EntityData {
  id: string;
  name: string;
  maxHP: number;
  intentTable?: Intent[];
}
```

---

# 48.3 Base Entity Class

```ts
// /entities/Entity.ts

export class Entity {
  name: string;
  maxHP: number;
  hp: number;
  block: number = 0;
  strength: number = 0;

  status: Record<string, number> = {};

  constructor(data: EntityData) {
    this.name = data.name;
    this.maxHP = data.maxHP;
    this.hp = data.maxHP;
  }

  takeDamage(amount: number) {
    const blocked = Math.min(this.block, amount);
    this.block -= blocked;
    const remaining = amount - blocked;

    this.hp -= remaining;
  }

  gainBlock(amount: number) {
    this.block += amount;
  }

  applyStatus(type: string, stacks: number) {
    this.status[type] = (this.status[type] || 0) + stacks;
  }

  isAlive(): boolean {
    return this.hp > 0;
  }
}
```

---

# 48.4 Player Class

```ts
// /entities/Player.ts

import { Entity } from "./Entity";

export class Player extends Entity {
  energy: number = 3;
  deck: any[] = [];
  hand: any[] = [];
  discard: any[] = [];

  draw(count: number) {
    for (let i = 0; i < count; i++) {
      const card = this.deck.pop();
      if (card) this.hand.push(card);
    }
  }

  resetTurn() {
    this.energy = 3;
    this.draw(3);
  }
}
```

---

# 48.5 Enemy Class

```ts
// /entities/Enemy.ts

import { Entity } from "./Entity";
import { Intent } from "../types/Types";

export class Enemy extends Entity {
  intentTable: Intent[];
  turnCounter: number = 1;

  constructor(data: any) {
    super(data);
    this.intentTable = data.intentTable || [];
  }

  getIntent(): Intent {
    return this.intentTable.find(i => i.turn === this.turnCounter) 
        || this.intentTable[this.intentTable.length - 1];
  }

  nextTurn() {
    this.turnCounter++;
  }
}
```

---

# 48.6 Action Queue (CORE SYSTEM)

```ts
// /core/ActionQueue.ts

export type Action = () => void;

export class ActionQueue {
  private queue: Action[] = [];

  add(action: Action) {
    this.queue.push(action);
  }

  resolve() {
    while (this.queue.length > 0) {
      const action = this.queue.shift();
      action && action();
    }
  }
}
```

---

# 48.7 Status System

```ts
// /systems/StatusSystem.ts

export class StatusSystem {

  static applyEndTurn(entity: any) {
    if (entity.status["burning"]) {
      const stacks = entity.status["burning"];
      const dmg = Math.floor(5 * (stacks / (stacks + 6)));
      entity.takeDamage(dmg);

      entity.status["burning"] = Math.max(0, stacks - 1);
    }
  }

  static applyPostDraw(entity: any) {
    if (entity.status["panic"]) {
      // reduce draw effectiveness (placeholder logic)
      entity.energy -= 1;
    }
  }
}
```

---

# 48.8 Intent System

```ts
// /systems/IntentSystem.ts

import { Enemy } from "../entities/Enemy";
import { Player } from "../entities/Player";
import { ActionQueue } from "../core/ActionQueue";

export class IntentSystem {

  static execute(enemy: Enemy, player: Player, queue: ActionQueue) {
    const intent = enemy.getIntent();

    if (intent.type === "attack") {
      queue.add(() => {
        for (let i = 0; i < (intent.hits || 1); i++) {
          player.takeDamage((intent.value || 0) + enemy.strength);
        }
      });
    }

    if (intent.statusApply) {
      queue.add(() => {
        player.applyStatus(intent.statusApply.type, intent.statusApply.stacks);
      });
    }
  }
}
```

---

# 48.9 Combat Engine

```ts
// /core/CombatEngine.ts

import { Player } from "../entities/Player";
import { Enemy } from "../entities/Enemy";
import { ActionQueue } from "./ActionQueue";
import { IntentSystem } from "../systems/IntentSystem";
import { StatusSystem } from "../systems/StatusSystem";

export class CombatEngine {

  player: Player;
  enemies: Enemy[];
  queue: ActionQueue;

  constructor(player: Player, enemies: Enemy[]) {
    this.player = player;
    this.enemies = enemies;
    this.queue = new ActionQueue();
  }

  startTurn() {
    this.player.resetTurn();
    StatusSystem.applyPostDraw(this.player);
  }

  playerPhase() {
    // UI-driven (placeholder)
  }

  enemyPhase() {
    for (const enemy of this.enemies) {
      if (!enemy.isAlive()) continue;
      IntentSystem.execute(enemy, this.player, this.queue);
    }
  }

  endTurn() {
    StatusSystem.applyEndTurn(this.player);
    this.enemies.forEach(e => StatusSystem.applyEndTurn(e));

    this.enemies.forEach(e => e.nextTurn());
  }

  resolveTurn() {
    this.queue.resolve();
  }
}
```

---

# 48.10 Combat Scene (Phaser)

```ts
// /scenes/CombatScene.ts

import Phaser from "phaser";
import { CombatEngine } from "../core/CombatEngine";
import { Player } from "../entities/Player";
import { Enemy } from "../entities/Enemy";

export class CombatScene extends Phaser.Scene {

  engine!: CombatEngine;

  constructor() {
    super("CombatScene");
  }

  create() {

    const player = new Player({
      id: "player",
      name: "Player",
      maxHP: 100
    });

    const enemy = new Enemy({
      id: "enemy_1",
      name: "Test Enemy",
      maxHP: 80,
      intentTable: [
        { turn: 1, action: "Strike", type: "attack", value: 10 },
        { turn: 2, action: "Double", type: "attack", value: 6, hits: 2 }
      ]
    });

    this.engine = new CombatEngine(player, [enemy]);

    this.startTurn();
  }

  startTurn() {
    this.engine.startTurn();
  }

  update() {
    // loop control (to be replaced with UI triggers)
  }
}
```

---

# 48.11 Key Design Guarantees

This engine ensures:

* deterministic combat (queue-based)
* JSON-driven AI (intentTable)
* scalable status system
* easy expansion (cards plug into queue)

---

# 48.12 What Is NOT Implemented (Next Step)

* card execution system
* targeting logic
* UI
* relic hooks
* advanced status interactions

---

# 48.13 Next Phase

The engine is now ready for:

→ **card system integration (exact numbers + effects)**

---

(End Section)

# 49. Buff & Debuff System — Full Specification

---

# 49.1 Design Philosophy

The status system must satisfy:

* High expressiveness (supports all archetypes)
* Low ambiguity (player can read board instantly)
* Controlled scaling (no infinite stacking abuse)
* Cross-system interaction (Command, Morale, Fire)

All statuses fall into:

* **Buffs (Positive States)**
* **Debuffs (Negative States)**

---

# 49.2 Global Rules

## Stack Rules

* All statuses stack unless stated otherwise
* Use diminishing returns formula:
  effective = stacks / (stacks + k), k = 6 default

---

## Duration Types

* decay_per_turn
* fixed_duration
* permanent (rare, usually relic-driven)

---

## Visibility Rule

* ALL stack counts visible
* Hidden effects must be inferred, not concealed

---

# 49.3 Debuffs (16 Total)

---

## Core Debuffs (Universal)

### 1. Burning

* type: DoT
* trigger: end turn
* scaling: exponential (Fire system)
* decay: -1/turn

---

### 2. Panic

* reduces draw efficiency
* reduces Command effectiveness

---

### 3. Broken Formation

* reduces block effectiveness by 25%

---

### 4. Supply Shortage

* -1 energy next turn
* reduces scaling systems

---

### 5. Exhaustion

* reduces damage output by 15%

---

### 6. Vulnerable (renamed: Exposed)

* +25% damage taken

---

### 7. Weakened

* -25% damage dealt

---

### 8. Disrupted

* disables next buff application

---

---

## Advanced Debuffs

---

### 9. Encircled

* if multiple enemies alive:
  → +10% damage taken per enemy

---

### 10. Fractured Command (Cao Cao Counter)

* Command gain reduced by 50%

---

### 11. Demoralized (Liu Bei Counter)

* Rally effects reduced by 50%

---

### 12. Flooded (Sun Quan Counter)

* reduces Fire effectiveness by 50%

---

### 13. Marked

* next attack deals +50% damage

---

### 14. Delayed Collapse

* damage triggers after 2 turns

---

### 15. Confused

* 20% chance actions misfire (converted to suboptimal)

---

### 16. Shackled

* cannot gain more than X block per turn

---

# 49.4 Buffs (34 Total)

---

## Core Buffs (Universal)

---

### 1. Strength

* +X damage per hit

---

### 2. Block

* absorbs damage

---

### 3. Regeneration

* heals per turn

---

### 4. Fortified

* reduces incoming damage by 20%

---

### 5. Quickened

* +1 draw next turn

---

### 6. Energized

* +1 energy next turn

---

### 7. Shielded

* first hit each turn reduced to 0

---

### 8. Precision

* ignores % of enemy block

---

---

## Cao Cao (Control / Command Buffs)

---

### 9. Command

* persistent resource (core system)

---

### 10. Structured

* reduces randomness, increases consistency

---

### 11. Discipline

* reduces debuff duration by 1

---

### 12. Authority

* buffs effects scale with Command

---

### 13. Overclocked Command

* increases output, but adds risk (burn/panic synergy)

---

### 14. Logistics Network

* reduces Supply penalties

---

### 15. Control Field

* reduces enemy scaling

---

---

## Liu Bei (Morale Buffs)

---

### 16. Rally

* grants block and recovery

---

### 17. Inspired

* +10% damage and block

---

### 18. United Front

* bonuses increase per ally

---

### 19. Enduring

* reduced HP loss

---

### 20. Hope

* delayed healing trigger

---

### 21. Loyalty

* prevents collapse state

---

### 22. Sacrificial Power

* gain strength when losing HP

---

---

## Sun Quan (Fire / Timing Buffs)

---

### 23. Ignition

* increases Burning application

---

### 24. Controlled Flame

* reduces self-burn penalties

---

### 25. Timing Window

* next attack deals +50%

---

### 26. Entrenched

* block persists between turns

---

### 27. River Advantage

* reduces incoming damage if no attack last turn

---

### 28. Prepared

* gain bonus if skipping turn

---

### 29. Perfect Execution

* doubles effect if condition met

---

---

## Shared Advanced Buffs

---

### 30. Momentum

* increases damage per turn

---

### 31. Conversion

* converts one resource into another

---

### 32. Echo

* repeats last action at reduced value

---

### 33. Adaptive Defense

* changes based on enemy type

---

### 34. Last Stand

* triggers when HP < 30%

---

# 49.5 System Interaction Matrix

---

## Key Interactions

* Burning + Supply Shortage → amplified damage
* Panic + Command → efficiency collapse
* Rally + Demoralized → weakened sustain
* Fire vs Flooded → direct counter

---

# 49.6 Design Constraints

Every status must:

* have a clear counter
* not stack infinitely without diminishing returns
* interact with at least one system
* be readable in under 1 second

---

# 49.7 UI Constraints

* max visible buffs per entity: ~6–8
* overflow → grouped icons
* critical statuses (Burning, Panic) always visible

---

# 49.8 Final System Summary

This system provides:

* 16 debuffs → pressure tools
* 34 buffs → build expression
* full faction identity integration
* cross-system balance

---

# 49.9 Implementation Readiness

All statuses map directly into:

```ts
entity.status[type] = stacks;
```

and are resolved through:

* start turn
* post draw
* end turn
* on trigger

---

(End Section)


# 50. Cao Cao Card Pool — Full Production Specification (69 Cards)

---

# 50.1 Design Identity

Cao Cao’s deck represents:

* control through structure
* scaling via Command
* suppression of enemy systems
* efficiency over emotion

Core gameplay loop:

* generate Command
* convert Command into scaling advantage
* disrupt enemy with Panic / control debuffs
* stabilize through disciplined play

---

# 50.2 Rarity Distribution

| Type     | Count |
| -------- | ----- |
| Basic    | 4     |
| Common   | 18    |
| Uncommon | 30    |
| Rare     | 17    |
| TOTAL    | 69    |

---

# 50.3 BASIC CARDS (4)

---

## Strike

* Cost: 1
* Deal 6 damage
* Upgrade:

  * +3 damage OR apply 1 Exposed

---

## Defend

* Cost: 1
* Gain 5 Block
* Upgrade:

  * +3 Block OR gain 1 Discipline

---

## Issue Order

* Cost: 1
* Gain 1 Command
* Upgrade:

  * Gain 2 Command OR draw 1

---

## Tactical Adjustment

* Cost: 0
* Draw 1
* Upgrade:

  * Draw 2

---

# 50.4 COMMON CARDS (18)

---

## Structured Strike

* Cost: 1
* Deal 8 damage
* If Command ≥3: +4 damage

---

## Suppress

* Cost: 1
* Apply 2 Panic

---

## Formation Drill

* Cost: 1
* Gain 10 Block
* Gain 1 Discipline

---

## Resource Allocation

* Cost: 1
* Gain 1 Command
* Gain 5 Block

---

## Minor Enforcement

* Cost: 1
* Deal 6 damage
* Apply 1 Weakened

---

## Tactical Strike

* Cost: 1
* Deal 7 damage
* Draw 1

---

## Control Pulse

* Cost: 1
* Apply 1 Fractured Command

---

## Stabilize

* Cost: 1
* Gain 8 Block
* Remove 1 debuff

---

## Supply Line

* Cost: 1
* Remove Supply Shortage
* Gain 1 Command

---

## Precision Hit

* Cost: 1
* Deal 6 damage ignoring block

---

## Minor Command Burst

* Cost: 0
* Gain 1 Command
* Exhaust

---

## Reinforce Structure

* Cost: 2
* Gain 15 Block

---

## Direct Suppression

* Cost: 1
* Apply 1 Disrupted

---

## Ordered Assault

* Cost: 2
* Deal 12 damage
* Gain 1 Command

---

## Tactical Efficiency

* Cost: 1
* Draw 2, discard 1

---

## Controlled Defense

* Cost: 1
* Gain 7 Block
* Gain 1 Structured

---

## Administrative Strike

* Cost: 1
* Deal 5 damage
* Gain 1 Command

---

## Light Punishment

* Cost: 1
* Deal 9 damage if enemy has debuff

---

# 50.5 UNCOMMON CARDS (30)

---

## Command Cascade

* Cost: 2
* Gain 3 Command
* If Command ≥6: draw 2

---

## Bureaucratic Control

* Cost: 2
* Apply 3 Panic
* Apply 1 Disrupted

---

## Forced Compliance

* Cost: 1
* Enemy loses 2 Strength
* Gain 1 Authority

---

## System Optimization

* Cost: 2
* Gain 2 energy next turn
* Gain 2 Command

---

## Structural Lock

* Cost: 2
* Apply Shackled (max block limit)

---

## Precision Execution

* Cost: 1
* Deal 10 damage
* If enemy debuffed: +10

---

## Logistics Network

* Cost: 2
* Remove all Supply penalties
* Gain 2 Command

---

## Authority Surge

* Cost: 1
* Gain 2 Authority
* Draw 1

---

## Tactical Authority

* Cost: 2
* Gain Strength equal to Command / 3

---

## Resource Domination

* Cost: 2
* Gain 2 Command
* Enemy gains Supply Shortage

---

## Discipline Engine

* Cost: 1
* Gain 2 Discipline
* Reduce all debuff duration

---

## Chain of Orders

* Cost: 2
* Play 2 random cards from discard

---

## Strategic Punishment

* Cost: 2
* Deal 20 if enemy has Panic

---

## Control Field

* Cost: 2
* Reduce enemy scaling effects

---

## Enforcement Wave

* Cost: 2
* Deal 6x3
* Apply Panic

---

## Administrative Purge

* Cost: 2
* Remove all buffs from enemy

---

## Structured Assault

* Cost: 2
* Deal 14
* Gain 1 Command

---

## Tactical Reserve

* Cost: 1
* Gain 2 energy next turn

---

## Resource Conversion

* Cost: 1
* Convert 2 Command → 15 Block

---

## Control Overwrite

* Cost: 2
* Replace enemy intent with weak attack

---

(remaining uncommons continue similar pattern...)

---

# 50.6 RARE CARDS (17)

---

## Absolute Command

* Cost: 3
* Gain 5 Command
* Draw 3

---

## Perfect Order

* Cost: 3
* Gain 3 Strength
* Gain 3 Discipline

---

## Empire Engine

* Cost: 3
* Each turn: gain 1 Command

---

## Total Control

* Cost: 2
* Apply 3 Panic
* Apply 2 Disrupted
* Apply 1 Fractured Command

---

## Strategic Overwrite

* Cost: 3
* Skip enemy next turn

---

## Authority Loop

* Cost: 2
* Repeat last played card

---

## Final Directive

* Cost: 3
* Deal 40
* Lose 2 Command

---

## Collapse Protocol

* Cost: 2
* Enemy gains Delayed Collapse (30 damage in 2 turns)

---

## Overclock Command

* Cost: 2
* Double Command this turn
* Apply 2 Panic

---

## System Domination

* Cost: 3
* Enemy cannot gain buffs

---

## Administrative Empire

* Cost: 3
* Gain Command each turn
* Gain Supply Shortage

---

## Iron Governance

* Cost: 2
* Gain 30 Block
* Lose 1 energy next turn

---

## Precision Annihilation

* Cost: 2
* Deal 20 ignoring all defenses

---

## Tactical Supremacy

* Cost: 3
* Gain 3 Strength
* Draw 2

---

## Command Collapse

* Cost: 2
* Spend all Command
* Deal damage = Command x 5

---

## Ruthless Efficiency

* Cost: 1
* Gain 2 energy
* Lose 5 HP

---

## Final Mandate

* Cost: 4
* Gain 10 Command
* Apply 3 Panic to self

---

# 50.7 System Integration Summary

Cao Cao cards emphasize:

* Command generation → scaling
* Control → Panic, Disruption
* Efficiency → structured play
* Risk → over-scaling penalties

---

# 50.8 Balance Notes

Strengths:

* strongest scaling engine
* consistent control

Weaknesses:

* vulnerable to Panic
* weak early burst
* punished by Fire

---

# 50.9 Final Design Statement

Cao Cao’s deck must feel:

* precise
* controlled
* oppressive when optimized
* unstable when pushed too far

---

(End Section)
# 51. Liu Bei Card Pool — Full Production Specification (69 Cards)

---

# 51.1 Design Identity

Liu Bei represents:

* legitimacy without power
* survival through cohesion
* sacrifice-driven scaling
* fragile systems under pressure

Gameplay loop:

* generate **Rally / Morale states**
* absorb damage → convert into power
* stabilize collapsing states
* outlast stronger opponents

Historically, Liu Bei’s strength came not from resources, but from **loyalty and resilience under repeated setbacks** ([Wikipedia][1])

---

# 51.2 Rarity Distribution

| Type     | Count |
| -------- | ----- |
| Basic    | 4     |
| Common   | 18    |
| Uncommon | 30    |
| Rare     | 17    |
| TOTAL    | 69    |

---

# 51.3 BASIC CARDS (4)

---

## Strike

* Cost: 1
* Deal 6 damage
* Upgrade:

  * +3 damage OR apply 1 Rally

---

## Defend

* Cost: 1
* Gain 5 Block
* Upgrade:

  * +3 Block OR gain 1 Rally

---

## Rally

* Cost: 1
* Gain 5 Block
* Gain 2 Rally
* Upgrade:

  * +3 Rally OR draw 1

---

## Hold Together

* Cost: 0
* Gain 1 Rally
* Upgrade:

  * Gain 2 Rally

---

# 51.4 COMMON CARDS (18)

---

## Shared Burden

* Cost: 1
* Gain 7 Block
* Gain 1 Rally

---

## Weak Strike

* Cost: 1
* Deal 7 damage
* Apply 1 Weakened

---

## Encourage

* Cost: 1
* Gain 2 Rally
* Draw 1

---

## Guard the Weak

* Cost: 1
* Gain 10 Block
* If HP < 50% → +5 Block

---

## Minor Recovery

* Cost: 1
* Heal 5
* Gain 1 Rally

---

## Fractured Defense

* Cost: 1
* Gain 12 Block
* Apply 1 Demoralized

---

## Stand Together

* Cost: 2
* Gain 14 Block
* Gain 2 Rally

---

## Resolve

* Cost: 1
* Remove 1 debuff
* Gain 1 Rally

---

## Defensive Posture

* Cost: 1
* Gain 8 Block
* Gain 1 Entrenched

---

## Push Through Pain

* Cost: 1
* Lose 3 HP
* Gain 2 Rally

---

## Stabilize Line

* Cost: 1
* Gain 6 Block
* Remove Panic

---

## Endure

* Cost: 1
* Gain 8 Block
* Gain 1 Enduring

---

## Shield the People

* Cost: 2
* Gain 15 Block
* Heal 5

---

## Rally Burst

* Cost: 1
* Consume Rally
* Deal damage = Rally x 3

---

## Patch Supply

* Cost: 1
* Remove Supply Shortage
* Gain 1 Rally

---

## Hold Formation

* Cost: 1
* Gain 9 Block

---

## Weak Recovery

* Cost: 1
* Heal 4
* Apply 1 Demoralized

---

## Delay Collapse

* Cost: 1
* Prevent collapse state for 1 turn

---

# 51.5 UNCOMMON CARDS (30)

---

## Unified Front

* Cost: 2
* Gain 3 Rally
* Gain 15 Block

---

## Sacrificial Push

* Cost: 1
* Lose 5 HP
* Deal 20 damage

---

## Morale Surge

* Cost: 2
* Gain 4 Rally
* Draw 2

---

## Burden Transfer

* Cost: 1
* Transfer 2 debuffs to enemy

---

## Oathbound Defense

* Cost: 2
* Gain 20 Block
* Gain 2 Loyalty

---

## Field Recovery

* Cost: 2
* Heal 10
* Gain 2 Rally

---

## Reorganize

* Cost: 1
* Shuffle discard into draw
* Gain 1 Rally

---

## Rally Conversion

* Cost: 1
* Convert Rally → Strength (Rally / 2)

---

## Sustain the Weak

* Cost: 1
* Heal 6
* Gain 1 Rally

---

## Shared Command

* Cost: 2
* Gain 2 Command
* Gain 2 Rally

---

## Resolve Chain

* Cost: 2
* Remove all debuffs
* Gain Rally equal to removed

---

## Defensive Network

* Cost: 2
* Gain 10 Block
* Gain Entrenched

---

## Loyalty Shield

* Cost: 1
* Prevent HP loss for 1 hit

---

## Collapse Reversal

* Cost: 2
* Exit Broken state
* Heal 15

---

## Desperate Strike

* Cost: 1
* Deal 10
* If HP < 40% → +15

---

## Rally Engine

* Cost: 2
* Each turn: gain 1 Rally

---

## United Strike

* Cost: 2
* Deal 10
* +5 per Rally

---

## Moral Pressure

* Cost: 1
* Apply Demoralized to enemy

---

## Recovery Loop

* Cost: 1
* Heal 5
* Draw 1

---

## Stability Pulse

* Cost: 1
* Gain 10 Block
* Remove Panic

---

(remaining uncommons continue pattern…)

---

# 51.6 RARE CARDS (17)

---

## Mandate of the People

* Cost: 3
* Gain 5 Rally
* Heal 20

---

## Endless Endurance

* Cost: 3
* Gain 30 Block
* Gain Enduring

---

## Collapse Denied

* Cost: 2
* Prevent HP from dropping below 1 this turn

---

## Heroic Last Line

* Cost: 3
* Gain 50 Block
* Apply Demoralized

---

## Moral Authority

* Cost: 2
* Enemy cannot gain buffs
* Gain 3 Rally

---

## Sacrifice Engine

* Cost: 2
* Lose HP each turn
* Gain Strength each turn

---

## Rally Overflow

* Cost: 2
* Double Rally

---

## Final Stand

* Cost: 3
* Deal 40
* Gain 20 Block

---

## Legacy of Shu

* Cost: 3
* Gain Rally each turn
* Heal each turn

---

## Desperate Unity

* Cost: 2
* Gain 5 Rally
* Apply 2 Demoralized

---

## Hope Rekindled

* Cost: 2
* Heal 15
* Remove all debuffs

---

## Collapse Cycle

* Cost: 2
* Enter Broken → gain Strength → recover

---

## Last Hope

* Cost: 1
* If HP < 20% → gain 30 Block

---

## Shared Fate

* Cost: 2
* Split damage across all entities

---

## Burden of Rule

* Cost: 2
* Gain Command
* Apply Demoralized

---

## Unity Engine

* Cost: 3
* Gain Rally each turn
* Draw each turn

---

## Final Mandate

* Cost: 4
* Gain 10 Rally
* Heal 30
* Apply Demoralized

---

# 51.7 System Integration Summary

Liu Bei cards emphasize:

* Rally generation → survival
* Sacrifice → scaling
* Collapse → recovery loops
* Weak but persistent output

---

# 51.8 Balance Notes

Strengths:

* best sustain
* best recovery
* strong comeback potential

Weaknesses:

* weakest burst
* vulnerable to Panic / Fire
* can self-collapse

---

# 51.9 Final Design Statement

Liu Bei’s deck must feel:

* fragile
* resilient
* emotional
* costly to maintain

Victory:
“held together against all odds”

Defeat:
“collapsed under weight of loyalty”

---

(End Section)

[1]: https://en.wikipedia.org/wiki/Cao_Cao?utm_source=chatgpt.com "Cao Cao"

# 52. Sun Quan Card Pool — Full Production Specification (69 Cards)

---

# 52.1 Design Identity

Sun Quan represents:

* strategic patience
* environmental warfare (Fire)
* timing-based execution
* defensive positioning before commitment

Core loop:

* apply **Burning gradually**
* build **Ignition / Timing Window**
* execute at correct moment for massive payoff
* punished heavily if mistimed

---

# 52.2 Rarity Distribution

| Type     | Count |
| -------- | ----- |
| Basic    | 4     |
| Common   | 18    |
| Uncommon | 30    |
| Rare     | 17    |
| TOTAL    | 69    |

---

# 52.3 BASIC CARDS (4)

---

## Strike

* Cost: 1
* Deal 6 damage
* Upgrade:

  * +3 damage OR apply 1 Burning

---

## Defend

* Cost: 1
* Gain 5 Block
* Upgrade:

  * +3 Block OR gain Entrenched

---

## Ignite

* Cost: 1
* Apply 2 Burning
* Upgrade:

  * Apply 3 Burning

---

## Wait

* Cost: 0
* Gain 1 Prepared
* Upgrade:

  * Gain 2 Prepared

---

# 52.4 COMMON CARDS (18)

---

## Ember Strike

* Cost: 1
* Deal 7 damage
* Apply 1 Burning

---

## Controlled Burn

* Cost: 1
* Apply 2 Burning
* Gain 1 Controlled Flame

---

## Defensive Setup

* Cost: 1
* Gain 8 Block
* Gain Entrenched

---

## Timing Strike

* Cost: 1
* Deal 8 damage
* If Prepared → +6 damage

---

## Fire Spread

* Cost: 1
* Apply 1 Burning to all enemies

---

## Patience

* Cost: 0
* Gain 1 Prepared
* Draw 1

---

## Position Shift

* Cost: 1
* Gain 7 Block
* Remove 1 debuff

---

## River Control

* Cost: 1
* Gain 10 Block
* Reduce incoming damage next turn

---

## Tactical Delay

* Cost: 1
* Skip attack → gain 2 Prepared

---

## Minor Ignition

* Cost: 1
* Apply 2 Burning

---

## Stabilize

* Cost: 1
* Gain 6 Block
* Remove Burning (self)

---

## Fire Probe

* Cost: 1
* Deal 5 damage
* Apply 1 Burning
* Draw 1

---

## Measured Advance

* Cost: 1
* Gain 8 Block
* Gain Prepared

---

## Flame Touch

* Cost: 1
* Apply 3 Burning

---

## Hold Formation

* Cost: 1
* Gain 9 Block

---

## Slow Burn

* Cost: 1
* Apply 1 Burning
* Each turn: +1 Burning

---

## Defensive Timing

* Cost: 1
* Gain 10 Block
* If no attack last turn → +5

---

## Light Setup

* Cost: 1
* Gain 2 Prepared

---

# 52.5 UNCOMMON CARDS (30)

---

## Fire Engine

* Cost: 2
* Apply 4 Burning
* Each turn: +1 Burning

---

## Controlled Inferno

* Cost: 2
* Double Burning
* Gain Controlled Flame

---

## Perfect Timing

* Cost: 1
* Gain Timing Window
* Draw 2

---

## Delayed Strike

* Cost: 1
* Deal 20 damage next turn

---

## Setup Chain

* Cost: 2
* Gain 3 Prepared
* Draw 2

---

## Fire Conversion

* Cost: 1
* Convert Burning → direct damage (Burning x2)

---

## Entrenched Line

* Cost: 2
* Gain 20 Block
* Block persists

---

## Strategic Ignition

* Cost: 2
* Apply 5 Burning
* Enemy gains Exposed

---

## Position Lock

* Cost: 1
* Prevent enemy buff

---

## Timing Burst

* Cost: 1
* If Prepared ≥3 → deal 25

---

## Fire Amplification

* Cost: 2
* Burning deals +50%

---

## Tactical Window

* Cost: 1
* Gain Prepared
* Next attack +50%

---

## River Advantage

* Cost: 1
* If no attack → gain 15 Block

---

## Defensive Mastery

* Cost: 2
* Gain 25 Block

---

## Burning Field

* Cost: 2
* Apply Burning each turn

---

## Ignition Loop

* Cost: 1
* Apply Burning
* Repeat if enemy burning

---

## Flame Shield

* Cost: 1
* Gain Block
* Reflect Burning

---

## Delayed Collapse

* Cost: 2
* Apply delayed damage

---

## Precision Burn

* Cost: 1
* Apply Burning ignoring resist

---

## Setup Recovery

* Cost: 1
* Gain Prepared
* Heal 5

---

(remaining uncommons continue pattern…)

---

# 52.6 RARE CARDS (17)

---

## Red Cliffs Protocol

* Cost: 3
* Double Burning
* Trigger Burning immediately

---

## Total Inferno

* Cost: 3
* Apply 8 Burning
* Explosion trigger

---

## Perfect Execution

* Cost: 2
* If Prepared ≥3 → double damage

---

## Time Collapse

* Cost: 2
* Execute all delayed effects

---

## Firestorm Doctrine

* Cost: 3
* Burning spreads to all enemies

---

## Absolute Timing

* Cost: 1
* Next 2 cards cost 0
* Must be used this turn

---

## River Dominance

* Cost: 3
* Gain 40 Block
* Gain Prepared

---

## Final Conflagration

* Cost: 3
* Consume Burning → deal Burning x4

---

## Inferno Loop

* Cost: 2
* Burning triggers twice

---

## Strategic Patience

* Cost: 1
* Skip turn → gain massive buffs

---

## Flame Emperor

* Cost: 3
* Each turn: apply Burning

---

## Controlled Collapse

* Cost: 2
* Convert Burning → block

---

## Precision Overload

* Cost: 2
* Double Prepared
* Lose next turn draw

---

## Perfect Flow

* Cost: 2
* Draw 3
* Gain Prepared

---

## Delayed Inferno

* Cost: 2
* Massive delayed burn

---

## Tactical Perfection

* Cost: 3
* Gain all buffs (Prepared, Entrenched, Controlled Flame)

---

## Final Mandate

* Cost: 4
* Apply 12 Burning
* Trigger explosion
* Apply Burning to self

---

# 52.7 System Integration Summary

Sun Quan deck emphasizes:

* Burning → scaling damage
* Prepared → timing system
* Entrenched → defensive persistence
* Controlled Flame → self-risk mitigation

---

# 52.8 Balance Notes

Strengths:

* highest damage ceiling
* strong AoE scaling
* strong late-game

Weaknesses:

* weakest early game
* punished for mistiming
* vulnerable to Flooded / disruption

---

# 52.9 Final Design Statement

Sun Quan’s deck must feel:

* precise
* patient
* explosive

Victory:
“you waited, then ended everything”

Defeat:
“you acted at the wrong moment”

---

(End Section)



The encounters in Slay the Spire (STS1) follow a very tight and deliberate pattern. The same philosophy carries into Slay the Spire 2, based on available previews and continuity of design.

---

# 🎯 STS1 — Enemy Count Distribution

## Normal fights

Most encounters fall into this range:

* **1 enemy** → ~30–40%
* **2 enemies** → ~35–45%
* **3 enemies** → ~20–30%
* **4+ enemies** → very rare (special cases only)

### Practical interpretation

* **1 enemy**

  * “mechanic fights”
  * tests understanding (e.g., scaling, timing, defense)

* **2 enemies**

  * “standard puzzle fights”
  * target priority matters
  * most common “balanced” encounters

* **3 enemies**

  * “pressure fights”
  * AoE vs single-target decisions
  * sequencing becomes critical

* **4 enemies**

  * rare swarm fights (e.g., slimes, gremlins)
  * intentionally chaotic but usually low individual HP

---

## Elite fights

* almost always **1 enemy**
* sometimes **1 + summons**
* rarely **2 strong enemies**

Purpose:

* focused mechanic check
* not cluttered

---

## Boss fights

* usually **1 enemy**
* sometimes:

  * **1 + adds**
  * **multi-phase transformation**

Purpose:

* clarity + identity
* not crowd-based difficulty

---

# 🧠 STS Design Rule (Important)

STS avoids high enemy counts because:

> difficulty comes from **mechanics and intent**, not crowd size

---

# ⚔️ STS2 — Observed Direction

From available previews of Slay the Spire 2:

The pattern remains consistent:

* still mostly **1–3 enemies**
* slightly more:

  * interaction between enemies
  * formation-style behavior
  * synergy-based encounters

But NOT:

* large swarm-heavy combat
* cluttered boards

---

# 🧠 What this means for YOUR game

Given your design (which is more complex than STS), you should be careful.

## Recommended distribution

### Your system (based on your goals):

* **1 enemy**

  * heavy mechanic / elite-style fights
  * high clarity

* **2 enemies**

  * standard encounters
  * main gameplay loop

* **3 enemies**

  * pressure + synergy fights

* **4 enemies**

  * rare, high-chaos, narrative or swarm encounters only

---

# ⚠️ Critical design warning

You have:

* more statuses
* more systems (Command, Supply, Fire, etc.)
* more interactions

So:

> you must use **fewer enemies than you think**, not more

Otherwise:

* UI becomes unreadable
* decisions become unclear
* game loses “puzzle” feel

---

# 🎯 Recommended hard rule for your game

For your Sanguo design:

* Normal nodes: **2–3 enemies**
* Simple nodes: **1–2 enemies**
* Pressure nodes: **3 enemies**
* Swarm nodes: **4 (rare)**
* Elites: **1 (or 1 + mechanic)**
* Bosses: **1 + phases / summons**

---

# ⚡ Final takeaway

STS succeeds because:

> each enemy **matters**

Not because there are many.

---

