# Edward's World — Case Study

How a portfolio became a place, and what building it taught me.

---

## 1. The problem

The conventional developer portfolio is a good format. It is scannable, it
loads fast, and a recruiter with four minutes can get what they need from it.
I am not going to pretend otherwise.

But it has a ceiling, and I kept running into it:

- **Every project looks like every other project.** A card with a title, three
  sentences, a stack list and two links. Mine looked exactly like everyone
  else's, because the format makes them look alike.
- **A description of an interactive product is not the product.** I built a
  sports matchmaking app. Writing *"peer sports matchmaking with challenges and
  a ranking system"* is accurate and communicates almost nothing about what it
  is like to open it and get matched with someone.
- **There is no room for a person.** The format has a slot for work and no slot
  for who did it. Everything that isn't a project gets compressed into a
  two-line "About" and disappears.
- **Nothing happens.** A visitor reads and leaves. Nobody has ever finished
  reading a portfolio page and thought about it afterwards.

The gap I wanted to close was between *claiming* I can build interactive things
and *handing someone one*.

---

## 2. The idea

Make the portfolio itself the demonstration.

Instead of navigating a page, you walk a small pixel town. Each project is a
building you can enter, and entering it doesn't open a description — it opens a
scoped, playable representation of what that project actually does. SportsGang
hands you a phone and matches you. The AFL lab runs a model in front of you and
shows the calibration step pulling an overconfident number back. The wardrobe
saves your look to your own browser, which is the point of the real project.

Three ideas hold it together:

**Project worlds are "what I build."** Not cards about the work — a version of
the work you can operate for thirty seconds.

**Edward's House is "who I am."** A deliberately separate place, with no project
in it. The map from Jeju to Sydney, the desk, the clothes rail, the gaming PC.
It exists because the thing conventional portfolios have no room for is the
thing that makes one memorable.

**INDEX is the escape hatch, and it is first-class.** One click from every
screen, at every moment, including during the opening sequence. It is a plain,
accessible page with every project, its real stack, its case study, its GitHub
link, plus resume and contact. A recruiter never has to walk anywhere.

That last one is not a fallback. An interactive portfolio that *requires*
exploration has replaced one bad format with a worse one. Both paths are the
product.

---

## 3. How it got here

About two weeks of concentrated work — 2026-08-26 to 2026-08-31 in the commit
dates, with polish passes after — and the history tells the story honestly:
46 commits, and the interesting ones are not the features.

**It started as infrastructure, not art.** The first commit was a deliberately
unstyled foundation — an intro state machine, a horizontally navigable world,
typed proximity interactions, and the accessible index. Movement, interaction
and navigation all worked before anything looked like anything. That order was
the single best decision in the project: every later visual pass changed how it
looked without touching how it worked.

**Then the places arrived, one per phase.** SportsGang, Wardrobe, AFL Lab, the
Arcade, Edward's House, and the finished INDEX — each as a self-contained
location built on the same shared world infrastructure.

**Then it got played, and things broke.** SportsGang shipped with a phone and a
sport picker and no actual sport. Four playable simulations followed, then a
commit titled *"three defects found by playing SportsGang, not by reading it."*
The arcade's jump had a bug the code read past cleanly: the jump cut was applied
as a per-frame multiplier, so any jump not held for its whole rise collapsed to
nothing. A bot that plays the platformer end to end found it. Landing on a bug
killed the player, when the original game's own README says stomping works.

**Then the opening was rebuilt from scratch.** The first title screen and
six-second intro were finished, marked done — and then replaced. The V4 opening
is a camera pan east to a shrine, the letters of a name pulling free of a carved
face, and an inscription you have to type into thirteen carved sockets. Two
completed phases were superseded by it. Neither was wasted; they were how I
found out that the opening needed to be a small interaction rather than a
cutscene.

**Then feel, atmosphere and content.** A visitor counter that stores one integer
and nothing else. Real resume and case-study routes built strictly from what the
repositories record. Background music with proper ducking between surfaces. A
calibration pass on walking speed — not picked, but set from the measured
crossing time, because at the old speed a visitor looking for a project spent
their first fifteen seconds holding a key.

**And one thing was removed.** A wandering NPC with five conversations had been
built, finished, tested and shipped. It came out. It was charming and it was the
one thing in the world that wasn't about the work — it added a stop between the
visitor and the projects, and Edward's House already carried the personality
better. Deleting a working, tested feature was harder than building it, and it
made the product better.

---

## 4. Key design decisions

**The web, not a game engine.** Unity or Godot would have made the world easier
and the portfolio worse. A portfolio has to open instantly from a link in an
application, work on a phone in a recruiter's hand, be readable by a screen
reader, and be *a web project* — because web is the work I'm applying to do. A
15 MB WebGL bundle behind a loading bar fails all four.

**Exploration plus INDEX, with neither subordinate.** Covered above. The cost is
building every piece of content twice, in two presentations. It is worth it.

**Project worlds instead of cards.** The expensive decision. Each location is a
bespoke experience: a stage machine and four simulations for SportsGang, a pure
reducer and local persistence for Wardrobe, a real seeded model pipeline for the
AFL lab, a platformer for the arcade. Generic cards would have been a weekend.
But the specificity *is* the portfolio — a world where every building opened the
same modal would have proved nothing.

**Every number is computed, never scripted.** The most important rule in the
codebase. Golf's carry distance comes from where you stopped the two bars.
Tennis's verdict comes from how close you were to the ball when you swung. The
AFL lab's calibration genuinely temperature-scales a genuinely overconfident
number. If a portfolio fakes the one thing it is demonstrating, nothing else in
it can be trusted either.

**Progressive disclosure.** The title screen shows a town at dusk. The intro
introduces one name. The world reveals six buildings. A building reveals a
product. Nothing is explained up front; walking is the tutorial. The only
instruction is a sign at the start of the path, and a status bar that names what
you're standing next to.

**Soonpermario stays one segment.** The original is a whole platformer. Twenty
seconds of it — three bugs, three pits, the offer — is a representation. All of
it would have been a second product hosted inside the first, and the visitor
would never reach the AFL lab.

**Edward's House is separate from the project buildings.** Deliberately not a
project card labelled "About Me". It is a place, entered through the same typed
`OPEN_LOCATION` action, with the same verbs — walk up, press `E`, look. Personal
content earning the same interaction budget as professional content is the whole
argument for the format.

**Not everything becomes a mini-game.** Wardrobe is an archive with no timer, no
score, no fail state. AFL Lab is one question and a pipeline you watch run.
Adding a mini-game to each would have made the world uniform and dishonest — the
real wardrobe project is not a game, and a prediction lab that you *win* would
misrepresent what it does.

**Honest absence over invented content.** The League of Legends rank in the house
is a typed `null` and the room says the shelf is empty. The resume and case-study
pages say plainly which parts are Edward's to write and are not written yet. It
is a portfolio: the moment it invents one fact, none of it counts.

---

## 5. The AI-assisted workflow

This project was built with AI assistance across planning, implementation,
review and QA. I think that is worth describing precisely rather than either
hiding or advertising.

**How the work was divided.** I used more than one model, for different jobs:
implementation assistance for writing code against a spec I'd set; separate
review and QA passes, run as their own step rather than as part of writing the
code, because a review folded into implementation tends to agree with it; and
planning and research discussion for working out what to build before anything
was built.

I kept the parts that are actually the job: what gets built and what doesn't,
how the system is layered, what "done" means, what the acceptance criteria are,
whether the result is any good, and what gets deleted. Every scope decision in
section 4 is mine, including the expensive ones and the one where I removed a
finished feature.

**AI accelerated execution. It did not decide anything.**

**What made it work was the verification loop**, and I'd call this the actual
finding of the project:

- **Independent review.** A review pass run as its own task, against the code
  rather than alongside writing it. The post-implementation QA pass caught five
  real defects — animations outliving their
  owning state, a shared input listener swallowing `Enter` and `Space` from
  unrelated focused buttons, disabled world controls still keyboard-focusable
  behind overlays — none of which a self-review had raised.
- **Automated tests as the contract.** 368 of them, weighted toward the pure
  simulations and state machines, where being wrong is invisible. The
  platformer's finishability is proved by a bot that plays it, not by an
  assertion someone wrote to pass.
- **A passing production build, always.** A gate, not a milestone.
- **Playing it in a browser, every time.** This is the one that cannot be
  skipped, and it is where the interesting bugs came from. The tennis timing was
  calibrated by playing it over and over until a first-time player could
  actually win a point. The golf ball
  started outside its frame. Edward's head in the venue didn't match his head in
  the world. Not one of those is visible in a diff, and no test would have
  caught them.

The pattern that held across all of it: **AI output is a proposal, not a
result.** Confident, plausible code that doesn't do what it says is the failure
mode, and the only defence is a verification step that doesn't care how
convincing the explanation was.

---

## 6. What I learned

**Polish beats another feature.** The single highest-impact change in the whole
project was raising the walking speed, from a crossing time I measured rather
than a number I picked. It made everything feel better and added no
functionality. The second was deleting a finished feature. Neither is the kind
of work that shows up on a commit graph.

**Interactive portfolios need an escape hatch, and it has to be real.** If
INDEX had been a lesser sibling of the world, the format would have failed for
exactly the audience it most needs to serve.

**Game feel matters in things that are not games.** Input latency, how long a
character keeps their walking stance before settling, whether the camera is
locked or smoothed, how long a panel takes to fade. None of it is functionality
and all of it is the difference between "a website with a character on it" and
somewhere you want to keep walking.

**Documentation drifts, quietly and fast.** This pass found a status doc citing
a test count 71 short, an architecture doc naming two modules that had been
renamed, and a phase table listing a feature that had been deleted — all in a
repository where the docs were being updated conscientiously. Docs are not
compiled, nothing fails when they go stale, and so they go stale. Treating a
doc pass as a real task with real verification is the only thing that works.

**Verify everything, especially when it's convincing.** See section 5.

**Scope has to be actively defended.** The world could have had a sixth
building, a fuller platformer, a mini-game in the wardrobe, the NPC. Every one
of those was a real option and each would have made it worse. Deciding what not
to build turned out to be most of the product work.

---

## 7. Current scope

Five experiences, all complete and playable:

| | |
| --- | --- |
| **Edward's House** | The personal room. Six objects, verified biography. |
| **AFL Predict** | A research lab; a seeded round travelling a bench of six instruments. |
| **SportsGang / Protin** | A pixel phone, matchmaking, and four playable sports. |
| **Wardrobe** | A local-first garment archive that remembers your look. |
| **Soonpermario** | One playable segment of a platformer, inside an arcade cabinet. |

Wrapped in a title screen, a typing-gate opening ritual, a side-scrolling town,
and an accessible `INDEX` reachable at any moment.

The project is in polish rather than expansion. There is no roadmap of features
here on purpose — the scope above is the scope.
