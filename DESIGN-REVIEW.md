# Portfolio usability revision

Reviewed locally on 13 September 2026.

## Follow-up: deeper inner pages and interaction

The requested direction changed from shorter inner pages to richer browsing depth. This follow-up supersedes the earlier page-length reduction objective below. The home page is excluded from this revision: `index.html`, `css/premium.css`, `js/main.js`, `js/render.js` and `js/data.js` retain their exact pre-follow-up SHA-256 hashes.

Thirteen new sections across eight inner-page templates add content with a distinct purpose:

- Services: a three-path business challenge finder and an illustrated delivery journey with a scroll-responsive chapter indicator. Recommendations are conversation starters, not automated audits.
- Work: selectable project reasoning and a bridge to the supporting Gallery evidence. Existing case figures are unchanged; no additional client results were invented.
- About: a working-relationship section with licensed editorial photography and a set of questions that explain the approach to decisions.
- Insights: topic-based reading routes into existing articles and a three-question reflection checklist.
- Contact: an optional preparation checklist and four practical FAQs. These additions do not add required form fields or transmit checklist selections.
- Gallery: a guide to interpreting search, analytics and AI evidence, plus previous/next screenshot controls, a position counter and captions in the existing viewer. All 42 supplied screenshots remain in Gallery.
- Case-study detail: a checklist for comparing the case with the visitor's own business context.
- Article detail: a thinking prompt with an explicit copy action and a manual fallback if clipboard access is denied.

The new stylesheet and script load only on these inner pages. The 404 page remains a concise recovery page. New entrances are finite and scroll-triggered; selection changes use short transitions. No autoplay carousel, continuous decorative motion or scroll hijacking was added. A visible motion control affects inner pages only and respects the device preference, informed by [W3C's guidance on animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html). Content remains readable without JavaScript, and inactive selectors are not displayed in that state.

### Local page-depth measurements

Default states at a 390 px viewport, measured in isolated Chromium after fonts and visible images loaded. Length is a layout measurement, not evidence of improved engagement or conversion.

| Page | Before follow-up | After follow-up |
| --- | ---: | ---: |
| Services | 4,372 px | 7,054 px |
| Work | 3,479 px | 5,541 px |
| About | 4,099 px | 6,654 px |
| Insights | 3,980 px | 5,986 px |
| Contact | 3,115 px | 4,905 px |
| Gallery | 6,145 px | 7,297 px |
| D2C case detail | 7,508 px | 8,572 px |
| Content article detail | 4,480 px | 5,336 px |

### Follow-up verification

- Eight inner route types checked at 320, 390, 540, 768, 1024 and 1440 px, 48 combinations in total. No root horizontal overflow, out-of-bounds visible main content, broken visible images or uncaught page errors were found.
- Seventy-four interaction assertions passed: keyboard selection at 320, 390 and 1440 px; checklist completion and undo; manual, persisted and device motion preferences; copy success and denial with a mocked clipboard; all 42 gallery positions, arrow navigation, focus cycling and Escape; retained Work filters; Contact prefilling and required fields; and readable Services content with JavaScript disabled. No real enquiry or clipboard write was made by these checks.
- Visual inspection covered the new Work and Contact sections on desktop, Work, About and Insights on mobile, the Services delivery journey at both sizes, and the mobile screenshot viewer.
- Source checks now validate inner-page-only asset loading, panel targets and headings, the interaction script's syntax and its defensive Home guard. Existing service and database-fixture checks remain available through `npm test`.
- The home page and four protected shared assets were hash-checked against their pre-follow-up contents, not compared only against the older Git revision.
- This follow-up remains local for review. It does not create a deployment or claim a measured engagement uplift. Physical-device and non-Chromium checks remain outstanding.

## Earlier usability revision

- Services is named explicitly in every public navigation. Home and Services expose all eight capabilities, including paid search and web development.
- Services explains scope through expandable entries. Audit, project and ongoing delivery are secondary engagement models, not substitutes for the actual service list.
- Work is a two-column project index on desktop and a single-column index on phones. Category filters, short summaries and one existing outcome per project lead to the full case study.
- New licensed images have page-specific assignments. Work no longer repeats its first project image in the hero. Analytics evidence remains in Gallery. See `MEDIA-LICENSES.md` for provenance and usage restrictions.
- Inner pages share navigation, footer, spacing tokens and compact closing sections. Home keeps its established visual direction with shorter copy and a smaller service index.
- Contact requires a name, email and brief. Service selection, company, website, target market, currency, budget, start date and time zone are optional. No exchange-rate conversion or invented overseas price tiers are shown.
- Failed enquiries preserve answers and show a direct email alternative. Duplicate sends are blocked. Free-text budgets and personal details are not added to the form's analytics event.
- Gallery expansion survives delayed content updates. Service seeding matches stable service keys to prevent duplicates when display names change.

## Reference decisions

[Instrument's service architecture](https://www.instrument.com/services) separates named offerings from the work that illustrates them. [Work & Co's capabilities](https://www.work.co/company/) makes specific disciplines easy to scan. These informed information hierarchy, not a copied visual design or claims about Fenil's experience.

## Verification

- Isolated Chrome checks across 10 public route types at 320, 390, 540, 768, 1024 and 1440 px: no root horizontal overflow, out-of-bounds visible main elements or broken visible images.
- Visual review of full-page Services, Work and Contact captures on mobile and desktop, plus the expanded mobile questionnaire.
- 24 interaction assertions passed: service scopes and deep links, legacy links, mobile navigation and Escape, project filters, contact prefills and validation, failure recovery, duplicate-send protection, success reset, Insights filtering and Gallery lightbox controls.
- All 42 supplied gallery screenshots decoded after expansion. A separate delayed-response check retained all screenshots, expanded sections and category anchors.
- HTML IDs, inline JavaScript, structured-data JSON, local assets and the eight-service contract checked. A database fixture verified that renamed services do not trigger duplicate inserts. Run `npm test` to repeat these source and contract checks.
- At 390 px, default Services length fell from 5,590 to 4,372 px, and Work from 5,120 to 3,479 px. These are local layout measurements, not performance or conversion metrics. Opening service details naturally adds length. Contact includes more useful qualification fields, so it is not shorter in every state.

## Limits

These are local Chromium checks, not a physical-device Safari or Firefox certification, a full accessibility audit or evidence of conversion uplift. No real lead was submitted and no live database write was used to test enquiries. Existing case-study figures were retained, not independently audited. Their supporting evidence and publication permissions should be confirmed before using them to sell engagements internationally.
