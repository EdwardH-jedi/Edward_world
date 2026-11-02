# Edward’s World — Work Sample Readiness Audit

Audit date: 9 September 2026. Scope: the existing local worktree, including staged, unstaged, and untracked implementation. Audit only; this report is the sole intended repository addition. No application fixes, commits, pushes, branch changes, dependency upgrades, or deployment were performed.

Evidence labels: **Observed** means exercised in the local production browser; **Source** means established from current implementation; **COULD NOT VERIFY** identifies an explicit coverage limit. Scores and judgments about recruiter response are reviewer estimates, not user research or hiring predictions. Repeated references to an issue below do not increase its count.

## 1. Executive Verdict

**READY AFTER SMALL FIXES**

The interactive world is coherent and its four project experiences work through meaningful interactions. Production build, lint, type checking, and all 370 tests pass. The principal submission risks are visible: Wardrobe breaks at a common intermediate width, and every “Case study” destination advertises missing content instead of explaining Edward’s engineering contribution. Several smaller first-visit, mobile, copy, and return-navigation problems compound that impression. Keep the world concept and existing strong experiences; perform the bounded submission pass below. No live deployment URL was supplied or verified, so this audit does **not** clear a public URL for recruiter use today.

**Counts: P0 = 0; P1 = 2; P2 = 7.** P3 and BACKLOG items are separately identified and are not submission blockers.

## 2. Recruiter First-Impression Scorecard

| Category | Score /10 | Reason |
| --- | --- | --- |
| First impression | 7 | Intentional skyline, character, and identity; the title does not immediately explain the software portfolio. |
| Visual polish | 7 | Cohesive pixel environments and restrained document styling; Wardrobe’s intermediate layout and mobile header collisions are visible exceptions. |
| Clarity | 5 | Index makes the purpose clear, but the default intro delays that understanding and case-study pages do not deliver the promised explanation. |
| Interaction | 7 | Meaningful playable loops, working exits, persistent Wardrobe output, and useful keyboard paths; responsive defects need repair. |
| Engineering credibility | 6 | The interactions demonstrate implementation skill; individual contribution, decisions, and substantiated outcomes remain poorly exposed. |
| Uniqueness | 9 | A distinctive, navigable personal world with project-specific mechanics. No generic portfolio conversion is warranted. |
| Recruiter usability | 6 | Index, repositories, and contact are directly available; their discoverability and route-return behavior need refinement. |
| Likelihood a recruiter continues exploring | 6 | A curious visitor has reason to stay; a time-constrained reviewer may leave before finding substantive project evidence. |
| Overall | 7 | A credible work sample after a focused presentation and responsive pass. This is a judgment, not an arithmetic average. |

**First 5 seconds:** the rendered desktop opening looks intentional rather than failed. There is a clear wordmark and scene. Local production loading was responsive, but this does not establish remote cold-load performance. The phone composition is much more compressed.

**By 15 seconds:** Enter leads into the shrine/name ritual. The current timed beats total **9.8 seconds**, excluding typing, with 8.2 seconds before the typing stage and 1.6 seconds after it. The source comment still says eight seconds (`lib/game/intro-machine.ts:17`). Typing SOON HYUN HWANG is an additional task before seeing a project. Skip, WORLD, and INDEX prevent a hard gate, but their importance is not explained as clearly as the ritual.

**By 30–60 seconds:** a visitor who uses Index can reach source and project details immediately. A world visitor can enter the nearby house or Wardrobe and experience real interaction. The house is personal context, not the strongest professional evidence. AFL’s pipeline and the sports/game loops communicate capability, but authorship and engineering decisions require more explanation.

**By 2 minutes:** all four projects, GitHub, LinkedIn, and contact are discoverable. The most damaging discovery is that every “Case study” says the actual account is not here yet. Correct that before spending time adding more scenery or games.

## 3. Current Canonical State

| Item | Verified state |
| --- | --- |
| Repository root | `/Users/edwardhwang/Desktop/Edward_world` |
| Branch | `main` |
| HEAD | `1a9685d3326d5e4be8c47bee42c88f666dce4b16` |
| Worktree | Already dirty at audit start: 56 short-status entries, including 12 untracked entries that aggregate directories. 39 unstaged modifications, 2 staged-and-unstaged modifications, 1 staged modification, 2 tracked deletions. |
| Staged paths | `data/world.ts`, `lib/pixel/characters.ts`, `lib/game/sportsgang-machine.ts`; the first two also have unstaged changes. |
| Deleted paths | `lib/game/tomodachi.ts`, `tests/tomodachi.test.ts`; deletions predate the audit. |
| Git remotes / stashes | None configured / none present. |
| Linked worktrees | Current checkout plus `Edward_world-bgm`, `Edward_world-character`, `Edward_world-feel`, `Edward_world-tennis`, and `Edward_world-visitor`; untouched. |
| Runtime | Node `v26.7.0`, npm `11.19.0`. |
| Main packages | Next `16.3.3`; React/React DOM `19.2.8`; anime.js `4.5.0`; TypeScript `6.0.3`; Vitest `4.1.11`; ESLint `9.39.5`. |
| Package manager | npm, with existing `package-lock.json` and installed dependencies; no install was needed. |
| Build | PASS — `npm run build`; 10/10 static-generation entries completed, with the join API dynamic. |
| Lint | PASS — `npm run lint` (`eslint . --max-warnings 0`). |
| Tests | PASS — `npm test`; 370 tests in 27 files. |
| Supplemental type check | PASS — `npx tsc --noEmit --incremental false`. |
| Whitespace checks | PASS — `git diff --check` and `git diff --cached --check`. |
| Browser target | Actual production build served at `http://127.0.0.1:3000`, using `npm start -- --hostname 127.0.0.1 --port 3000`. |

The correct clean-install command is `npm ci`; development is `npm run dev`; production is `npm run build` followed by `npm start`. The package’s normal typecheck script is `npm run typecheck` (`tsc --noEmit`); the supplemental command above avoids an incremental cache write. Existing listeners were inspected before starting this application; the unrelated servers were left alone.

The application uses App Router: `/`, `/resume`, four `/case-studies/[slug]` pages, `/api/joins`, metadata routes, and a not-found page. `components/portfolio-experience.tsx` coordinates intro, world, Index, house, and project interiors. `data/projects.ts` owns the four public projects and their slugs; `data/world.ts` owns world attractions. Each project has its own component and deterministic game/state helpers. Pixel art is largely generated in code. The root reference board is not the Next application.

Current source takes precedence over README and historical QA claims. The implementation is materially ahead of documentation describing SportsGang as the only full experience and the house as six professional-biography objects. A baseline of 151 existing tracked/untracked file paths was retained for content comparison; pre-existing modifications are not audit edits. Build output is ignored generated content.

## 4. World / Feature Inventory

| Area | Purpose | Status | Quality | Public? | Notes |
| --- | --- | --- | --- | --- | --- |
| Title / skyline | Establish identity and invite entry | MINOR POLISH | Strong desktop art; weak immediate professional context | Yes, after small copy/layout fixes | Enter begins intro; Skip to Index and global navigation work. Phone wordmark/scene is crowded. |
| Shrine / name ritual | Personal introduction | MINOR POLISH | Coherent animation; too prominent for a hurried reviewer | Yes, optional | Full name completed; invalid input and Backspace exercised; Escape skips. Preserve optional ritual, improve fast-path labeling. |
| Main world / terrain / camera | Explore projects spatially | READY | Cohesive buildings, readable prompts, working terrain | Yes | Traversed entire world and reversed at right clamp. A/D/arrows and pointer movement; E enters; repeated exits restore exploration. |
| Directions sign | Teach controls | READY | Clear, useful payoff | Yes | Nearby E opens instructions; Escape closes. |
| Edward’s House | Personal interests and character | MINOR POLISH | Detailed room and compact object reveals | Yes | Enter building; inspect seven objects; Escape dismisses reveals and exits. Mobile top navigation needs shared fix. |
| Collection, clarinet, jersey, sports, PC, closet, window | Seven personal vignettes | READY | Specific rather than generic content | Yes | All seven opened and progress reached 7/7. Closet links to Wardrobe; these are not the longer professional biography promised by Index. |
| Wardrobe rail → capture table → archive → outfit → save | Demonstrate garment and outfit workflow | NEEDS WORK | Meaningful interaction, but intermediate layout breaks | Yes after P1-01 | All eight presets archived on stacked layout; multiple layers composed, removed, saved and recalled. Re-entry and Forget exercised. |
| Wardrobe saved frame / result | Show local persistence | MINOR POLISH | Persistence works; post-forget copy contradicts state | Yes after P2-07 | Nothing Saved correctly appears, while other text still claims the look is saved. |
| SportsGang phone / matching / session ranks | Turn a sports product into a bounded playable sample | READY | Clear phone-to-court structure and understandable result | Yes | All four sports entered, played to results, and returned through ranking/summary. Session-only framing is honest. |
| Golf | Two-stop timing game | READY | Simple, legible cause and effect | Yes | Space/Enter timing, flight, 55 m result, rank and exit exercised. |
| Basketball | Hold/release shooting | READY | Readable court and shot progression | Yes | Pointer hold/release and keyboard; three-shot match and result completed. No claim of scoring-balance validation. |
| Running | Pace versus stamina | READY | Understandable tradeoff | Yes | Pushed pace, exhausted stamina, recovered, completed 200 m in 0:44.1. |
| Tennis | Movement / return / opponent rally | READY | More developed opponent presentation | Yes | A/D/arrows and hit inputs; finished a match and reached ranking. Winning and difficulty balance were not exhaustively tested. |
| AFL Predict laboratory | Explain a staged forecasting pipeline | READY | Strong visual and technical connection | Yes | All six CRT stages; Team A selection; generated round; calibrated output; New Round resets. Explicit demo/research framing. |
| Arcade room | Discover Soonpermario cabinet | READY | Dark room with a clear lit focal point | Yes | Walk, approach E range, enter cabinet, return/exit. Unlit cabinets read as atmosphere rather than promised projects. |
| Soonpermario segment | Demonstrate platforming interaction | READY | Working movement, jumps, hazards, results and replay | Yes | Lost coffee, respawned, ended run, replayed with reset stats; mobile controls exercised. Manual victory not completed; automated finishability test passed. |
| Construction site | Tease future work | HIDE BEFORE APPLICATION | Interactive promise without a finished payoff | No active attraction | E/ENTER opens an under-construction popup with internal engine copy. Keep scaffold only if decorative and clearly noninteractive. |
| Portfolio Index | Fast professional path | MINOR POLISH | Strong editorial layout and link grouping | Yes | Focus trapping, close, return focus, scrolling and inline music toggle work; copy drift and missing AFL framing need correction. |
| Four case-study routes | Explain engineering work | NEEDS WORK | Clean layout; thin substantive content | Yes after P1-02 | All load and link to real repositories; all explicitly disclaim missing written accounts. |
| Resume route | Background and contact | MINOR POLISH | Useful timeline with unfinished-document framing | Yes with honest label/content | Loads, scrolls, links work; relabel as Background & contact unless it becomes an approved resume. |
| Global music | Persistent ambience and mute control | MINOR POLISH | State and navigation controls exercised | Yes | Initial persisted-mute indicator is briefly misleading before gesture. Audible quality and physical mobile behavior unverified. |
| Join counter | Optional anonymous total | MINOR POLISH | Graceful omission when unavailable | Optional | Production API returns 500 without durable-store configuration; the world continues and no invented count is shown. |
| Removed Tomodachi / old preview routes | No longer public features | READY | Correctly absent | No | No reachable Tomodachi attraction/project; old route checks return 404. Historical/reference remnants listed below. |

## 5. P0 Issues

**None confirmed.** The application builds, renders and supports its core journeys. Missing verification of a public deployment is a release gate, not evidence that the application itself is broken.

## 6. P1 Issues

### P1-01 — Wardrobe’s two-row layout overlaps content at intermediate widths

**Observed:** at **1024 × 768**, enter Wardrobe and take a garment to the capture table. The mannequin and adjacent content intrude into the table area, obscuring information and making the capture/studio progression look broken. This was reproduced in a fresh browser tab, not inferred from a single scaled screenshot.

**Evidence:** `app/globals.css:2572` caps `.wd-bays` at 25 rem; `app/globals.css:3035` switches it to two equal rows at widths up to 1100 px. At the tested width, the table was about 194 px tall with 262 px of scroll content, while the 140 px mannequin began around y=199, above the second row’s y=316 start. The fixed-height contents cannot fit the resulting row allocation. The rail itself can scroll; the finding is overlapping bay contents, not a falsely claimed inability to reach every garment.

**Impact:** a central interactive project looks accidentally assembled on a common smaller-laptop/tablet width. This is the clearest visual defect in the current build.

**Minimum fix:** give intermediate rows enough content height, allow deliberate scrolling, or use the existing stacked layout earlier. Preserve the artwork, steps, and persistence model. Accept only when capture metadata, mannequin, layer controls, and buttons have distinct usable bounds at 900–1100 px as well as desktop and phone widths.

### P1-02 — All “Case study” destinations advertise missing engineering accounts

**Observed:** Index → Case study for each of SportsGang, AFL Predict, Wardrobe, and Soonpermario leads to a repository summary, stack and links, followed by text saying the written account is not here yet. There is no adequate explanation of Edward’s personal role, a consequential implementation decision, or a verified outcome. Soonpermario adds mechanics but does not resolve authorship and decisions.

**Evidence:** `app/case-studies/[slug]/page.tsx:111` renders the shared pending paragraph; `components/index/portfolio-index.tsx:59` promises “Case study.” `data/projects.ts` supplies repository descriptions and stack metadata, not an authored account. The issue was observed on the live routes as well as in source.

**Impact:** the recruiter's principal evidence path explicitly marks the portfolio unfinished. A technology list cannot establish what the candidate personally designed or delivered.

**Minimum fix:** publish concise, factual project briefs: problem, personal contribution, one meaningful decision/tradeoff, and demonstrated result or limitation. Make the strongest two substantive enough for an engineering reader. Call brief pages “Project details” if that better matches their scope. Remove pending copy only when the page actually delivers useful content; do not invent metrics, production adoption, or ownership. Edward’s World itself also needs a small discoverable explanation of its implemented state/input/animation/testing work, using existing evidence rather than a new world or architecture rewrite.

## 7. P2 Issues

### P2-01 — The default opening does not establish the professional purpose quickly

**Observed:** the skyline title says whose world this is, but does not say it is a software/AI portfolio. Enter starts a name ritual before professional work appears. Index solves the access problem once discovered, so this is not a hard blocker.

**Evidence:** `components/title/title-screen.tsx`; `components/intro/intro-sequence.tsx`; timings in `lib/game/intro-machine.ts:17`. The 9.8 seconds of scripted movement plus typing consume a meaningful share of a short visit.

**Fix:** add one short professional-purpose line and label the existing shortcut “View projects” or “Projects & contact.” Preserve Enter/exploration and the optional name sequence. Do not replace the title with a conventional landing page.

### P2-02 — Mobile navigation collides with exits, and the intro has competing overlays

**Observed:** at **390 × 844**, the fixed WORLD/INDEX group overlaps the right end of “ESC · BACK TO WORLD” in house/project interiors. Its horizontal bounds were approximately x=147–322, while the exit occupied x=16–175: about 28 px overlap. The intro’s skip controls also intrude into the name-letter region; its wordmark and scene feel squeezed.

**Evidence:** `app/globals.css:120` fixes global controls at top 1 rem/right 4.25 rem/z-index 20; `app/globals.css:3537` positions the exit at the top left with a lower stacking order. A desktop arrangement is being reused where there is insufficient horizontal space.

**Fix:** reserve a shared mobile header area or stack/shorten the exit and global controls; give intro actions their own clear space. Verify actual hit areas and labels at 390 px and a narrower phone width. Do not disable all mobile gameplay: the tested projects are otherwise usable.

### P2-03 — “Resume” leads to a page declaring the formal resume is missing

**Observed:** the timeline/contact page ends by telling the reader that a formal resume remains Edward’s to supply. The page has useful content, but the label and footer expose an incomplete deliverable.

**Evidence:** `app/resume/page.tsx:98`; entry label in `components/index/portfolio-index.tsx:71` and project-page links.

**Fix:** the smallest path is to label it “Background & contact,” retain verified facts, and remove the internal pending-document explanation. Alternatively use an author-approved resume. Do not fabricate qualifications or make a PDF a prerequisite if the page is honestly labeled.

### P2-04 — “Visit it in the world” returns to the title rather than the project

**Observed:** opening a case-study page and following “Visit it in the world” returns to the initial title/intro experience, not that project. Document return links also lose the prior in-world context.

**Evidence:** `app/case-studies/[slug]/page.tsx:106` links to `/`; `components/portfolio-experience.tsx:32` initializes every new root mount to `intro`; `app/resume/page.tsx:25` uses the same generic return target.

**Fix:** make labels match behavior and provide a direct return to Index/world without replaying the intro. A project-specific target is appropriate only if the label continues to promise that destination. A full routing/state rewrite is unnecessary.

### P2-05 — Construction invites entry but delivers an internal placeholder

**Observed:** the far-right scaffold has an interaction prompt and opens a popup about future experiments and the world engine. It ends exploration with an unfinished promise.

**Evidence:** `data/world.ts:98`; construction interaction rendered through `components/world/interaction-dialog.tsx`.

**Fix:** temporarily remove the active attraction/prompt. The art may remain as scenery if it no longer promises a destination. Do not fill it with another project merely to justify its presence.

### P2-06 — Index copy no longer matches the house and canonical AFL framing

**Observed/source:** Index directs the reader to the house for the longer professional biography, but the seven current reveals concern personal interests. Index also omits AFL’s canonical research limitation while rendering its project descriptor and stack.

**Evidence:** `components/index/portfolio-index.tsx:109` is the false house direction; the project rendering at line 48 omits `framingNote`; `data/projects.ts:45` supplies the AFL limitation. The house’s seven reveals were all inspected. The full research constraint does appear in project details/resume, so this is inconsistent presentation, not evidence of a fabricated model result.

**Fix:** describe the house as personal interests and render the existing framing note alongside AFL’s Index description. Keep personal names consistent with the already stated Edward / Soon Hyun identity. No biography expansion is required.

### P2-07 — Wardrobe continues to claim a look is saved after Forget

**Observed:** save a valid outfit, then select FORGET IT. The saved frame correctly changes to NOTHING SAVED and the announcement confirms removal; the result caption still says LOOK SAVED TO THIS BROWSER and the summary still says the look was kept on this device.

**Evidence:** `components/wardrobe/wardrobe-experience.tsx:199` clears storage and changes the announcement; the result at line 464 depends on the earlier `storageWorked` flag, and line 480 unconditionally claims persistence. The unavailable-storage path also has misleading summary copy by source inspection; that failure mode was not browser-injected.

**Fix:** derive result text from the current saved state and actual save outcome, distinguishing saved, forgotten, and unavailable. Storage deletion worked; do not replace the storage subsystem.

## 8. Awkward / Unfinished Areas

These are the concrete presentation problems, including lower-priority observations. Issue IDs refer to the existing counts.

| Location | Problem | Why it feels unfinished | Recommended action |
| --- | --- | --- | --- |
| Wardrobe, 1024 px viewport | Mannequin/table content overlaps across short rows | Spatial hierarchy and step order visibly collapse | **FIX NOW — P1-01:** correct row sizing or breakpoint. |
| All four case-study footers | Explicitly say the account is not written | The visitor reaches a promised deliverable and finds an admission of absence | **FIX NOW — P1-02:** concise evidenced briefs, with honest labels. |
| Opening title | No immediate software/AI-work explanation | A reviewer must infer whether this is a game, art experiment, or application sample | **SMALL POLISH — P2-01:** one purpose line and clearer existing shortcut. |
| Shrine/name intro | Full-name transcription plus timed sequence before exploration | Ritual asks for attention before establishing professional payoff | **SMALL POLISH — P2-01:** make bypass obvious; keep the optional creative sequence. |
| Mobile top-left exits | Right end covered by WORLD/INDEX | Controls appear accidentally layered | **FIX NOW — P2-02:** shared mobile control layout. |
| Mobile title/name gate | Compact landscape scene, wrapped wordmark, skip actions near letters | Scene and controls compete instead of having clear regions | **SMALL POLISH — P2-02:** improve spacing and overlay bounds; do not rescale every world. |
| Resume footer | Says formal document is still to be supplied | A professional navigation label leads to temporary production commentary | **SMALL POLISH — P2-03:** accurate label or approved resume. |
| Project detail return | “Visit it” opens title | The destination does not match the action and reintroduces friction | **FIX NOW — P2-04:** explicit skip-intro return or true target. |
| Far-right construction | ENTER → future-work popup | Appears to be an attraction but has no current content payoff | **HIDE TEMPORARILY — P2-05:** remove active prompt/popup. |
| Index About | Promises professional biography in a room of hobbies | Text describes a previous iteration | **SMALL POLISH — P2-06:** describe current room accurately. |
| Index AFL entry | Omits research constraint available on other surfaces | Same project is framed differently depending on route | **SMALL POLISH — P2-06:** display existing note. |
| Wardrobe forgotten result | “Nothing saved” alongside “look saved” | UI disagrees with its own successful action | **FIX NOW — P2-07:** reflect current persistence state. |
| SportsGang descriptor | “Spanning mobile and web” is less precise than the linked repository’s mobile matchmaking description | Breadth is asserted without a clear visitor-visible explanation | **P3 COPY:** prefer the narrower verified mobile-product description unless web scope is explicitly evidenced. |
| SportsGang opponents | Tennis has ALEX / INTERMEDIATE; other sports use PLAYER 02 | Uneven characterization, but no functional confusion | **SAFE TO LEAVE — P3:** optional naming consistency later. |
| First music indicator after reload | Default locked/enabled state appears before persisted mute is hydrated by a gesture | Initial icon may not match remembered preference | **SAFE TO LEAVE — P3:** hydrate display state independently if it can be done without disturbing autoplay controls. |
| Desktop Wardrobe rail | More garments are inside a scrollable rail | Small scroll affordance can make eight presets look like fewer | **SAFE TO LEAVE — P3:** optional scroll hint, after layout correction. |
| House’s small phone scene | Detailed artwork is miniaturized, though reveals remain readable | The visual reward is weaker on a narrow device | **SAFE TO LEAVE:** tested object interaction works; do not hide the house. |
| Unlit arcade cabinets | Only one cabinet is playable | Could invite curiosity, but lighting clearly identifies the active one | **SAFE TO LEAVE:** no need to invent more games. |

## 9. Hide Before Application

- **Temporarily hide the construction interaction**, its ENTER prompt, and future-engine popup. Decorative scaffold can stay if unambiguously inert.
- **Remove unfinished-deliverable wording from recruiter paths only as those destinations are corrected.** Case-study links should lead to useful factual briefs; relabel as Project details if necessary. Do not simply conceal the missing-account disclaimer while leaving an empty claim of a case study.
- **Use an honest Background & contact label** if a formal resume is unavailable. Preserve working contact access.
- **Keep the unavailable join total omitted.** No need to provision a database solely for a decorative count. Never display a fabricated fallback count.

Do not hide AFL Predict, Soonpermario, SportsGang, the personal house, or the whole Wardrobe experience. Wardrobe needs a bounded layout repair, not removal. Do not bring Tomodachi back.

## 10. Already Strong — Do Not Overwork

- **AFL Predict laboratory:** the six-stage progression and visible generated-data/calibration framing connect interaction with the real research theme. Keep CRT art, pipeline choreography, and bounded demo scope.
- **Soonpermario and its arcade:** movement, jumps, hazards, coffee/respawn, result and replay form a complete sample. Keep the lit-cabinet discovery and existing segment. No new levels, boss expansion, or cabinet roster for this submission.
- **Main world identity:** scenery, distinct project buildings, terrain, character and camera support the intended concept. A generic portfolio redesign would discard its strongest differentiator.
- **SportsGang’s four sports:** each reaches a result/rank/summary. Keep their different mechanics and honest session-only framing; no matchmaking backend is needed inside this portfolio.
- **House object reveals:** seven specific personal details give the room a purpose. Fix the inaccurate Index pointer instead of reverting the room to old biography furniture.
- **Index’s editorial styling:** a useful deliberate contrast to the pixel world. Keep its fast path, project list, direct source/contact access, and focus lifecycle.
- **Wardrobe’s workflow and local persistence:** preset capture, archive, layering, saved frame and forgetting are meaningful. Repair geometry and result copy without expanding into the full original application.
- **Existing deterministic tests and global audio ownership:** useful implementation foundations. No broad refactoring is justified by this audit.

## 11. Project Presentation Review

Canonical public inventory is exactly four entries in `data/projects.ts`; SportsGang / Protin is one entry, not two products to list separately. Edward’s World is the containing work sample. No additional public project was discovered in active data/routes.

| Project | What a visitor can understand | What the environment demonstrates | Missing professional evidence | Submission direction |
| --- | --- | --- | --- | --- |
| SportsGang / Protin | A sports community/matchmaking product; React Native/Expo, FastAPI, PostgreSQL, Redis and Docker | Select a sport, meet a simulated opponent, play, see a session rank | Edward’s precise ownership; one real product/backend decision; verified scope/outcome; distinction between original mobile product and portfolio minigames | Keep games. Explain the original product and individual contribution in a brief. Narrow the broad mobile/web wording if unsupported. |
| AFL Predict | Forecasting research with Python, FastAPI and TypeScript | Pipeline stages, generated round, agreement and calibration outputs | One meaningful evaluation/temporal-data decision, actual evidence and limitations, Edward’s contribution | Keep lab. Add an evidence-led explanation; do not turn generated demo probabilities into accuracy or financial-performance claims. |
| Wardrobe | Local-first garment archive and outfit composition; React, TypeScript, Vite, Three.js and FastAPI | Eight presets, capture metadata, archive, layering and local save | Original project’s actual architecture/tradeoff and individual role; boundary between preset portfolio demo and broader archive/proxy-3D application | Fix overlap and save copy; explain bounded demo scope and one substantive implementation decision. |
| Soonpermario | A browser platformer, original stack JavaScript/Canvas with no build step | A playable segment with collisions, variable interaction, failure and replay | How Edward built or tuned a meaningful mechanic; verified result; clear separation between original game and embedded recreation | Keep gameplay/art. Write a short honest implementation account without adding levels. |

All four GitHub destinations were reachable publicly during checking: [SportsGang](https://github.com/EdwardH-jedi/SportsGang), [AFL Predict](https://github.com/EdwardH-jedi/AFL_predict), [Wardrobe](https://github.com/EdwardH-jedi/wadrobe), and [Soonpermario](https://github.com/EdwardH-jedi/soonpermario). Their descriptions support the broad project identities above. This was not a fresh technical audit of each external repository, and it does not verify every biography or outcome claim.

**Edward’s World as the work sample:** frontend rendering, interactive programming, animation sequencing, game state, local storage, reusable modal behavior, and testable simulation code are present. Current tests substantiate automated checking, not production adoption. The optional professional Index and project-specific actions demonstrate product intent, while intermediate responsiveness and misleading links weaken the claim of finished delivery. Much of the website’s own engineering account exists only in repository documentation such as `docs/CASE_STUDY.md`; a recruiter is unlikely to find it from the world. Include a concise discoverable explanation within the existing professional surface. There is no configured repository remote to use as a verified Edward’s World source URL, so do not invent one.

**AI-assisted development capability:** cannot be inferred as a hiring claim from framework choice, generated-looking copy, or agent-related files. If Edward wants to describe that process, use his confirmed account of what assistance was used, what he owned, and how changes were validated. It is not necessary to add an AI feature or an AI claim to make the current sample credible.

## 12. Visual Consistency Review

The main world, house, lab, wardrobe and courts share restrained palettes, pixel edges, labeled controls and recognizable visual hierarchy. Their different interiors mostly feel intentional: a CRT bench for forecasting, a fashion workshop for outfits, a phone and courts for sports, and a dark arcade for a platformer. Uniform layouts would reduce that meaning.

The Index and document pages use warm editorial typography instead of pixel-game styling. That is a useful reading mode and should stay. Borders, panel treatment and text hierarchy are generally consistent within each mode. No missing scene texture or broken sprite asset was observed; much of the artwork is procedural. The character’s travel, terrain and building scale remain coherent across the world.

The accidental-looking differences are the Wardrobe row collapse, mobile top-control overlap, cramped phone intro, and temporary prose on otherwise finished document layouts. Treat those as the visual pass. House details and compact AFL metadata naturally become smaller on phones; readable text/reveal panels matter more than making every art pixel equally prominent.

No calibrated contrast audit, physical display assessment, or frame-time trace was performed. Readable screenshots and focus inspection support practical observations, not accessibility certification or a universal motion-quality claim.

## 13. Interaction / Controls Review

| Control / behavior | Evidence and result |
| --- | --- |
| Enter | Starts title sequence; completes applicable sports stage/accept actions. Focused UI activation was inspected and exercised. |
| Intro typing | Full SOON HYUN HWANG completed the gate. On phone, an invalid letter was rejected; partial valid input and Backspace updated progress; Escape skipped. |
| A/D and arrows | Bound in world/game source and exercised with repeated key events. Pointer-held movement was used for reliable sustained travel in automation. |
| E and interaction distance | Directions, buildings and arcade cabinet entered after approach; proximity prompts appeared/disappeared during traversal. |
| Movement / camera / boundaries | Traversed the 3840 px world; rightmost player x clamped at 3792 for a 48 px hitbox. Reverse movement worked; no stuck position reproduced. |
| Rapid input / direction changes | Repeated presses and alternating movement worked; no accidental repeated entry reproduced. These checks are not a physical-key latency benchmark. |
| Holding movement | Sustained pointer-control drags exercised held movement. The browser tool’s key presses can be shorter than a render frame, so a true long-held hardware-key test remains unverified. |
| Interacting while moving | Source guards and repeated approach/entry examined; no lockup found. Exhaustive simultaneous-key permutations were not tested. |
| Escape | Dismissed object/instruction reveals, exited projects, ended arcade run to result, and returned to world. Nested actions behaved as separate steps. |
| WORLD / INDEX | In-place navigation worked across interiors; Index gives a non-game route to all professional links. Separate document routes reset root context: P2-04. |
| Repeated entry / replay | Wardrobe saved look returned on re-entry; sports reached repeated sessions/ranks; arcade Play Again reset coffee/time. |
| Keyboard focus | Index acquired focus, Tab reached controls, Shift+Tab wrapped to last contact link, and closing returned focus to INDEX. Shared dialog source handles Escape and focus restoration. |
| Background world | Main world has `inert` while disabled (`components/world/main-world.tsx:235`), preventing competing focus/interaction under overlays. |
| Scroll | Stacked Wardrobe, Index and document pages scroll. No browser-shortcut hijack was reproduced during tested controls. Mobile header obstruction is P2-02. |
| Browser focus changes | **COULD NOT VERIFY** physical blur/refocus and OS-level interruption behavior comprehensively. Input cleanup and audio recovery code were inspected. |

**Source-only P3 risk:** `lib/motion/use-game-loop.ts` says the loop stops when the window loses focus, but its effect schedules frames continuously while active and only resets the timestamp on `focus`; it has no blur handler. Browser throttling is not equivalent to an explicit pause for a visible unfocused window. Verify the intended background-game behavior later; this audit did not reproduce a recruiter-visible failure and does not elevate it to P1/P2.

Accessibility is practical rather than certified: native links/buttons, labeled dialogs, focus return, Escape, `inert`, and reduced-motion hooks are present. The intro reduces timed animation when reduced motion is requested. A screen-reader walkthrough, exhaustive focus checks of every result state, OS reduced-motion visual comparison, and touch assistive technology were **COULD NOT VERIFY**. Keep these limits distinct from the confirmed control collisions.

## 14. Mobile / Responsive Review

| Representative viewport | Observations |
| --- | --- |
| 1440 px desktop width | World and AFL bench have comfortable space; Wardrobe’s four-bay arrangement is coherent. |
| 1280 × 800 normal laptop; 1280 × 720 browser default | Main routes, arcade and project interactions usable; large-screen layout generally polished. |
| 1024 × 768 narrow laptop/tablet | Confirmed Wardrobe two-row overlap, reproduced in a fresh tab with DOM bounds. This is the primary responsive failure. |
| 768 px tablet width | Wardrobe switches to a usable stacked scroll; all eight garments could be archived. Sports flow and controls remained accessible. |
| 390 × 844 phone | All four project interiors, house reveals, Index and intro inspected. Wardrobe multi-layer save/remove worked; AFL changed rounds; arcade had usable dedicated controls. Exit/global navigation collision and intro crowding remain. |

The browser viewport was programmatically resized; this is not a physical iPhone, Android or Safari test. Some captured images were rescaled by the tool, so critical layout conclusions were checked against actual `innerWidth`/element rectangles rather than screenshot appearance alone.

**No full mobile fallback is currently justified.** The tested narrow layout supports meaningful interaction. Fix shared control placement and the intermediate Wardrobe breakpoint. Do not replace mobile with a blank “desktop only” message. Phone gameplay will remain smaller and less precise than desktop; that is acceptable when the Index remains an obvious alternative. Follow-up acceptance should include an additional narrow phone width and a short landscape screen, neither of which is certified by this pass.

## 15. Performance / Console / Production Review

| Check | Result / interpretation |
| --- | --- |
| Production build | PASS; compilation about 877 ms, TypeScript stage about 993 ms, static generation about 356 ms in this local run. These are build timings, not end-user load metrics. |
| Lint / tests / typecheck | PASS; 370 tests / 27 files in about 2.33 seconds. Unit tests do not catch the reproduced CSS overlap. |
| Production browser warnings/errors | No warning/error entries captured by the browser log tool during sampled sessions; no observed hydration/React exception. This is not a complete network trace. |
| Local route responses | Root, resume, four project pages and metadata routes returned 200. Removed/unknown routes returned expected 404. |
| Join API | Production `/api/joins` returned 500 without configured durable storage. Client omits the count; core browsing continues. Known optional service unavailability, not a clean-network claim. |
| JavaScript footprint | 11 emitted JS chunks total about 786,697 bytes raw / 249,054 bytes gzip estimate. The nine scripts referenced by the home document totaled about 763,292 raw / 241,728 gzip estimate. Offline compression estimate, not measured transfer over a deployed CDN. |
| Document / fonts / CSS | Home HTML about 10,626 bytes; served CSS and five local font files returned 200. No observed broken scene-image request. |
| Music asset | `public/audio/moss-gate-town.mp3`: 2,320,716 bytes, returned 200. Meaningful media payload, but not evidence of a blocking visual load. |
| Local response times | Warm local document checks were generally a few milliseconds. Loopback measurements cannot establish recruiter network performance. |
| Rendering / cleanup | Source shows rAF cancellation, effect/listener cleanup, animation reversion and observer cleanup in relevant systems. No retained-object/heap measurement was available. |

**Optimization opportunities, P3:** root experience imports all project experiences eagerly; a future measured need could justify loading a project on entry. The disabled world still has frame scheduling even when player updates are suppressed. Audit these only if a profile shows meaningful cost. Do not start a renderer rewrite or bundle campaign for submission based solely on raw size.

**Audio/BGM:** the implementation uses one engine under `Symbol.for("edwards-world.bgm-engine")` (`lib/audio/bgm-engine.ts:62`), with a start latch, shared decoded audio and navigation-driven surfaces. The persistent gesture listeners in `components/audio/music-control.tsx:31` are deliberately retained for interruption recovery; visibility handling is also present. Root and inline Index toggles worked, the exposed state changed to ducked inside a project, mute/unmute responded, and remembered mute was applied after the next gesture following reload. Repeated world/document navigation did not produce an observed state failure.

A small **P3** inconsistency remains: before the first gesture on a fresh load, the indicator can present its default locked/enabled state although a persisted mute preference exists. Hydration is deferred through engine operations; the first gesture corrects it. Do not describe this as confirmed unwanted audible autoplay.

**COULD NOT VERIFY:** actual speaker output, loop seam, loudness consistency, audible duplicate playback, physical-device autoplay restrictions, Safari interruption recovery, and OS audio focus. Unit tests and singleton source are supportive evidence, not substitutes for listening. Also unmeasured: deployed cold load, LCP/INP/CLS, mobile CPU throttling, long-session memory growth, comprehensive asset request repetition, and high-refresh physical-key latency. No unsupported “60 fps everywhere” or leak-free claim is made.

## 16. Dead / Legacy Content

| Location | Classification | Action |
| --- | --- | --- |
| Active `data/projects.ts`, `data/world.ts`, portfolio coordinator | No reachable Tomodachi entry found | Keep the four-project inventory; do not reintroduce it. |
| `lib/game/tomodachi.ts`, `tests/tomodachi.test.ts` | Already deleted in the audited worktree | Preserve existing deletion; do not stage or restore during this audit. |
| `index.html` old Tomodachi references | Historical visual reference board, not a served Next route | Retain the reference; label/archive clearly if needed. Do not mistake it for current UI or delete approved reference material. |
| `docs/VISUAL_POLISH_PASS_2026-09-03.md`, `docs/visual-polish/cmp-A1-tomodachi.png` | Historical audit and screenshot | Keep as dated history or move through a later intentional archive pass. Not a current application feature. |
| `docs/IMPLEMENTATION_ROADMAP.md` old phase instructions | Historical Tomodachi planning alongside removal notes | Make archival status clear later; do not treat old imperatives as instructions to rebuild it. |
| `tests/world-data.test.ts:13` and project-removal assertions | Intentional regression guards | Keep. Searching for a removed name should not cause deletion of tests that forbid it. |
| README house description; `docs/PROJECT_STATUS.md:54`, `:88`; older architecture/QA prose | Documentation drift: six old house objects, SportsGang-only full experience, older intro descriptions | P3 documentation reconciliation after source readiness. Keep historical QA results dated rather than rewriting them as current evidence. |
| `components/world/interaction-dialog.tsx:23` | “Case study placeholder” fallback for a generic project action | No current project reaches it: all canonical projects are intercepted by their full experiences. Cleanup backlog, not a reproduced public defect. |
| `.placeholder-note`, `.sg-phone__soon` in `app/globals.css` | Legacy-style candidates | Confirm reachability before later removal; name alone is not proof of dead code. |
| `components/sportsgang/pixel-phone.tsx` placeholder comment | Internal description of a court slot | Not user-facing unfinished copy. No submission action. |
| `public/assets/edward/README.md` | Future bitmap asset specification | Procedural character currently renders; no missing-image failure. Leave for future art work. |
| `public/.DS_Store` | Ignored packaging debris | Optional hygiene; not a source change or a demonstrated public-security issue in this audit. |
| Raster data containing XXX-like runs; mock/demo terminology | Art data or explicitly bounded simulation | Do not classify string matches as TODOs without context. |

The active construction popup is the actual public future-work remnant and is already counted as P2-05. Other historical matches do not justify expanding the submission pass into repository archaeology.

## 17. Broken / Misleading Links

| Destination | Check | Assessment |
| --- | --- | --- |
| `/` | Local 200; title/world render | Healthy root; document returns unnecessarily restart intro. |
| `/case-studies/sportsgang`, `/afl-predict`, `/wardrobe`, `/soonpermario` under `/case-studies` | All four actual full routes returned 200 and were read | Content promise is P1-02; not broken URLs. |
| `/resume` | Local 200; timeline, selected work and contacts render | Label/pending-copy mismatch, P2-03. |
| “Visit it in the world” | Followed from SportsGang page | Generic root/title destination, P2-04. |
| Four project GitHub URLs | Unauthenticated HTTP 200 and public repository pages inspected | No private/404 destination found. `wadrobe` is the actual repository spelling; do not “correct” the URL. |
| [GitHub profile](https://github.com/EdwardH-jedi/) | HTTP 200 | Reachable. |
| [LinkedIn profile](https://www.linkedin.com/in/soon-hyun-hwang-7212a42b7) | HTTP 200; full content inspection limited | Do not label broken, but recruiter-visible profile identity/content is **COULD NOT VERIFY**. |
| Contact mailto | Link matches canonical contact data | Valid link structure; no message sent and delivery not verified. |
| `/case-studies/tomodachi`, `/house-preview` | 404 | Expected removed/absent routes; no active navigation points to them. |
| Production public URL | None supplied or discovered from repository configuration | **COULD NOT VERIFY** public route behavior, access protection, domain or deployment freshness. |

External source links use new-tab anchors with `rel="noreferrer"`; internal documents use Next links. No confirmed visible button with an entirely missing destination was found. The construction interaction is a content dead end rather than a dead anchor. Browser Back was exercised across a document journey, but exact in-world state restoration is not provided by the generic root link.

## 18. Copy Issues

Make only the following material corrections; do not rewrite every object reveal or project description.

| Current location / wording | Problem | Narrow replacement direction |
| --- | --- | --- |
| Title lacks a professional-purpose sentence | Purpose must be inferred | “A software and AI portfolio you can explore.” Use wording Edward considers accurate. |
| “Skip to Index” | “Index” does not explain the recruiter benefit | “View projects” or “Projects & contact”; retain the existing fast path. |
| Shared case-study pending paragraph | Explicit unfinished account | Replace with factual authored brief content, not a more polished disclaimer. Use “Project details” if it is a brief. |
| Resume pending paragraph and entry label | Mismatched document promise | “Background & contact” unless publishing an approved resume. |
| “Visit it in the world” | Does not visit that project | “Back to portfolio” with a direct professional/world return, or implement the specifically promised target. |
| House described as “the longer version” of biography | Incorrect destination description | “Explore Edward’s House for personal interests and things I keep.” |
| AFL Index lacks framing | Canonical constraint missing | Render the existing “Paper-trading research. Not a live betting or tipping service.” note. |
| Construction future-engine sentence | Internal development language at an empty destination | Hide the interaction; no substitute promise needed. |
| Wardrobe saved/kept text after Forget | Contradicts current state | Distinct “Look saved,” “Saved look forgotten,” and “Storage unavailable” outcomes. |
| SportsGang “spanning mobile and web” | Broader than the immediately evidenced mobile scope | “A peer sports matchmaking product for mobile,” unless confirmed web scope is documented. P3. |

Edward and Soon Hyun Hwang are already connected by the professional Index; using both is not intrinsically inconsistent. Preserve personal voice in the house. Do not strengthen the Sensorway scale, research internship, project outcomes or ownership assertions without Edward’s confirmation or direct evidence. The audit checked how those statements are presented, not independent employment records.

## 19. Vercel Readiness

**Technically suitable for a Vercel preview; not yet verified as a recruiter-ready live deployment.** The production build/start succeeded locally, App Router pages and static parameters resolve, assets load, and no local-only application path or runtime filesystem dependency was found in the inspected serving code. The dynamic join route means this should use the normal Next deployment, not an assumed static-only export. Official [Vercel Next.js documentation](https://vercel.com/docs/frameworks/full-stack/nextjs) supports the framework deployment path.

There is a concrete environment mismatch to close: this audit ran Node **26.7.0**, while Vercel’s documentation checked for this audit lists **24.x (default), 22.x and 20.x**. The package does not pin an `engines` runtime. A successful Node 26 local build is therefore not the same as a successful Vercel build. Verify the chosen supported runtime and actual preview logs; this is a validation step, not a demonstrated compatibility failure. Source: [Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

The optional counter reads either `KV_REST_API_URL` / `KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (`lib/joins/store.ts:58`). Without durable configuration it intentionally refuses an in-memory production total and returns an unavailable response. Keep server credentials server-side. For submission, omit the counter if unavailable; neither provisioning Redis nor weakening this behavior is required. If a total is shown, verify durable behavior separately.

No remote, Vercel project configuration, or authoritative public URL was available for verification. This audit did not change hosting settings or deploy. Before sharing: deploy the reviewed revision through the existing authorized workflow, use a supported Node runtime, confirm unauthenticated access, and smoke-test `/`, Index, all four details, background/contact, project entry/exit, static assets and music control on the **actual public URL**. Check generated metadata against that real URL rather than inventing a domain. No extra feature work is needed to perform this check.

## 20. Minimum Submission Pass

Nine bounded tasks; task 9 is validation rather than another product feature. These cover the two P1 and seven P2 findings without rebuilding successful areas.

1. **Repair Wardrobe’s intermediate-width geometry and saved/forgotten result text.** Keep the current workflow and art.
2. **Make all four project-detail destinations useful and honest.** Briefly explain personal contribution, decisions, and verified result/limitations; make the strongest two substantive. Include a short explanation of Edward’s World’s own implemented engineering in the existing professional surface.
3. **Clarify the opening’s purpose and existing projects shortcut.** Keep the optional world and intro.
4. **Separate mobile global navigation, exits and intro controls.** Preserve usable phone interaction.
5. **Relabel the current resume page as Background & contact or publish an approved resume.** Remove pending-document framing.
6. **Provide honest, direct document return navigation without replaying the intro.** Match labels to destinations.
7. **Hide the construction interaction.** Keep scenery only if clearly noninteractive.
8. **Synchronize Index with current house content and AFL’s existing research framing.** No biography expansion.
9. **Run the scoped regression checks and verify a supported-runtime public preview.** Confirm anonymous recruiter access and the actual routes before submitting its URL.

Do not add new worlds, minigames, a new design system, a formal PDF generator, a social backend, analytics, more sprites, or speculative performance architecture. None is necessary to resolve the observed readiness problems.

## 21. Recommended Next Implementation Pass

This is a proposed next pass, **not implementation authorization** within the current audit. Content must stay within verified facts; ask Edward for missing ownership/outcome information while independently completing authorized technical fixes in a future implementation task.

| Order / priority | Exact target and problem | Required change | Likely files/components | Acceptance criteria | Complexity |
| --- | --- | --- | --- | --- | --- |
| 1 — P1-01 + P2-07 | Wardrobe row overlap and contradictory persistence result | Correct intermediate row/content sizing; make result copy depend on actual saved state and write outcome | `app/globals.css` `.wd-bays` / `.wd-studio`; `components/wardrobe/wardrobe-experience.tsx` | At 900, 1024, 1100, 1280 and 390 px: no bay overlap; all eight presets reachable; capture/archive/layer/save works; reload recalls; Forget removes frame and every saved claim; unavailable storage makes no kept claim. Use a targeted state test only where it adds real regression value; verify CSS visually. | M |
| 2 — P1-02 | Four thin case-study pages and hidden website-engineering explanation | Add concise verified briefs, ownership, decision and outcome/limitation; use accurate labels; expose a small site-engineering explanation | `data/projects.ts`, `types/portfolio.ts` if data shape needs it, `app/case-studies/[slug]/page.tsx`, `components/index/portfolio-index.tsx`; existing `docs/CASE_STUDY.md` as evidence | Each project can be understood in under a minute without playing; no pending-account paragraph; strongest two have substantive technical evidence; no invented metrics/ownership/URL; embedded demo scope distinguished from original product. | M; depends on confirmed content |
| 3 — P2-01 | Title clarity and fast-path discoverability | Add one purpose line; improve shortcut wording without discarding intro | `components/title/title-screen.tsx`, relevant `app/globals.css` | First screen identifies software portfolio; direct project/contact route is obvious and works without name entry; Enter and optional full intro still work. | S |
| 4 — P2-02 | Narrow-screen controls and intro collisions | Reserve nonoverlapping regions, shorten or stack controls as needed | `app/globals.css`, `components/world/world-index-control.tsx`, intro/exit markup only if required | At 360 and 390 px plus short landscape: all exit, WORLD, INDEX and music controls have distinct usable bounds; name letters and skip actions do not overlap; no new obstruction in any interior. | M |
| 5 — P2-03 | Resume label/pending footer | Relabel consistently as Background & contact, or use confirmed resume content | `app/resume/page.tsx`, Index and project-page labels | Navigation/title match actual content; contact remains reachable; no missing-document notice or invented identity claims. | S |
| 6 — P2-04 | Generic root return resets to title | Implement a small explicit return target/state and align labels; preserve fresh-visit intro | `components/portfolio-experience.tsx`, `app/case-studies/[slug]/page.tsx`, `app/resume/page.tsx`, root entry only if needed | From each document, return reaches the promised professional/world surface without forced intro; browser Back works; a fresh root visit still gets the intended opening. | M |
| 7 — P2-05 | Active construction placeholder | Remove its interaction/prompt or attraction while preserving intended decorative art | `data/world.ts`, interaction/world types only if necessary | No ENTER prompt or future-engine popup at scaffold; all four projects and house still reachable; removal guard still excludes Tomodachi. | S |
| 8 — P2-06 | Index content drift | Correct house pointer and render canonical AFL framing | `components/index/portfolio-index.tsx` | About describes personal house content accurately; AFL research constraint visible in Index, details and background page; layout remains readable. | S |
| 9 — Release verification | Revised code has not yet been tested or publicly verified | Build/lint/test/typecheck; targeted browser retest; supported Node preview and unauthenticated public smoke check | Existing scripts, changed UI, authorized hosting configuration if needed | Gates pass; both P1 repros resolved; all seven P2 behaviors corrected; desktop/tablet/phone routes and audio toggle work; unavailable optional counter is omitted; actual public URL verified without login. | S–M |

Keep changes reviewable and preserve unrelated local edits. There is no audit recommendation to stage the entire current dirty worktree, rewrite working state machines, or merge the linked worktrees.

## 22. Deferred Backlog

**P3 — useful later, not part of the minimum submission pass:**

- Reconcile README/status/architecture descriptions with the seven-object house, four complete experiences and current intro timing. Keep previous QA reports clearly dated.
- Correct the initial persisted-mute indicator if it can be isolated from playback policy; perform real-speaker and physical Safari/iOS/Android interruption checks.
- Verify and document background-game pause semantics; align `useGameLoop` behavior and its blur-related comment once intended behavior is established.
- Add a subtle rail-scroll affordance if visitors miss Wardrobe garments after the layout repair.
- Narrow SportsGang’s broad descriptor unless web scope is evidenced; optionally standardize opponent naming. Neither requires remaking courts.
- Profile actual deployed load and low-powered-device frame time before considering deferred project imports or background-loop optimization.
- Perform a longer session, heap/CPU profiling, screen-reader review, physical keyboard hold/refocus tests, and broader device coverage. Current automated passing results do not substitute for these measurements.
- Review legacy CSS/fallback reachability and packaging debris before removing anything. Preserve approved reference art and removal regression tests.

**BACKLOG — future enhancements with no submission requirement:** additional worlds/cabinets/levels, fuller original-product integrations, new character assets, expanded biography collection, durable visitor-count infrastructure, comprehensive case-study media production, and a broader visual redesign. These should not delay an application once the bounded findings and public deployment checks are resolved.

Audit boundary: only this report was authored. No application source was modified, no commit/push/deploy was performed, and pre-existing staged/unstaged/untracked implementation was preserved.
