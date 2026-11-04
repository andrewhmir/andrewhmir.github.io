/* ==========================================================================
   Portfolio Data — Single Source of Truth
   Add new projects, honors, leadership, or news by appending to the arrays.
   ========================================================================== */

/* Photographs (optional)
   Add an `images: [...]` array to a leadership or honours entry to open that
   record's photographs in the shared dialog. Paths are relative to index.html
   (e.g. "files/leadership-aghj-founder-1.webp"). An entry with no images is not
   a control: a leadership card shows "no photo" and an honour row is disabled.

   Name photos `<section>-<event>-<n>.webp`, numbered from 1 in the order they
   should appear. Competition photos use the year plus the level of the round:
   `honors-robothon-<year>-<ph|intl>-<n>.webp` (ph = Philippine Robothon).

   Source photos are imported and resized by tools/import-photos.mjs, which owns
   the mapping from the owner's staging filenames to these paths. */

const PORTFOLIO = {

  /* ── Personal / Meta ───────────────────────────────────────────── */
  name: "Andrew Alangcao",
  title: "Software Engineer",
  /* About paragraphs. The hero's line is `heroLine` below and is deliberately
     kept out of this array: a bio entry would print the same sentence in the
     hero and in About, where both can be on screen at once. */
  bio: [
    "I like art, and I have fun building things.",
    "I'm inspired by how technology can improve everyday life.",
    "I want to turn that inspiration into work that makes the world a little better.",
    "This site is a record of my pursuit of that."
  ],
  /* The hero's one-sentence line. */
  heroLine: "In pursuit of knowledge.",
  email: "andrew.alangcao@gmail.com",
  social: [
    { label: "Resume",   url: "https://drive.google.com/file/d/1lb3D1vB__Xfi5UD1Z22mGeGJtVetw_1M/view?usp=sharing" },
    { label: "GitHub",     url: "https://github.com/andrewhmir" },
    { label: "LinkedIn",   url: "https://www.linkedin.com/in/andrew-alangcao/" }
  ],

  /* ── News ──────────────────────────────────────────────────────── */
  news: [
    { date: "May 2026",   text: "Started a Software Engineering Role at Redacted" },
    { date: "April 2026", text: "Graduated High School with High Honors – San Beda Alabang, Muntinlupa City" },
    { date: "April 2026", text: "Gave a Speech of Inspiration at the Heroes Tribute Celebration – San Beda Alabang, Muntinlupa City" },
    { date: "March 2026", text: "Invited as a Guest Speaker at the STEAM Ed Conference of First Eduspec Inc. – San Beda Alabang, Muntinlupa City" }
  ],

  /* ── Projects ──────────────────────────────────────────────────── */
  projects: [
    {
      id: "project1",
        /* DRAFT COPY — review */
        summary: "A contactless palm scanner for retail and transit: RGB and near-infrared imaging, a Raspberry Pi 5 running the model locally, and a decision to keep the biometric data on the device.",
      title: "Project PALAD",
      tagline: "Contactless Palm Biometric Scanner for Retail & Transit",
      category: "Robotics",
      venue: "August 2025 - April 2026",
      video: "files/Palad_Preview.mp4",
      links: [
        { label: "Video", url: "https://www.youtube.com/watch?v=vY84w2aF754" }
      ],
      overview: {
        image: "files/Palad_Overview.webp",
        text: "PALAD was a separate project with a different team, but it grew out of a similar way of thinking.\n\nWe were interested in what could come after fingerprint scanning. Fingerprint scanners work, but they still require you to touch a surface. That isn't ideal in a packed train station during rush hour or a clinic where hundreds of people might be using the same sensor.\n\nSo we started looking at contactless biometrics.\n\nProject PALAD uses palm recognition. You hold your hand above the sensor, and it captures both the surface of your palm and the vein pattern underneath using RGB and near-infrared imaging. A Raspberry Pi 5 runs the deep learning model locally, so the biometric data doesn't have to leave the device.\n\nAuthentication takes around three seconds.\n\nWe designed it around local use cases like retail, public transit, and rural banking — places where internet connectivity isn't always reliable and systems need to be simple enough to actually deploy.\n\nPALAD went on to win national and international awards as well. For me, it was another example of how a relatively simple observation — in this case, that biometric authentication shouldn't require physical contact — can turn into a much bigger engineering problem to solve."
      },
      team: {
        image: "files/Palad_Team.webp",
        text: [
          "The team at the Muntinlupa Robotics Competition 2025 in Colegio de Muntinlupa.",
          "From left to right: Sir Mike Samar (Coach), Ben Singanon, Irah Casil, Dane Justiniano, and Andrew Alangcao"
        ]
      },
      awards: [
        { description: "11th Philippine Robothon – Innovative Open Category, Overall Champion", year: "February 2026" },
        { description: "Muntinlupa Robotics Fair – Champion", year: "December 2025" },
        { description: "2025 International Robothon – Innovative Open Category, 1st Runner Up", year: "November 2025" }
      ],
    },
    {
      id: "project2",
        /* DRAFT COPY — review */
        summary: "An organization's documents, conversations and code, indexed so the organization can ask what it already knows. Answers carry citations back to the source, and permissions are respected.",
      title: "Hivemind",
      tagline: "Answers from a company’s own documents, with citations",
      category: "Applications",
      venue: "June 2026 - Current",
      video: "files/HiveMind_Preview.mp4",
      links: [],
      overview: {
        image: "files/HiveMind_Overview.webp",
        text: "A lot of the projects I've worked on started with noticing something that felt unnecessarily difficult in everyday life. Hivemind started the same way, but this time the problem was at work.\n\nWe kept running into the same issue: information was everywhere, but finding the right information was surprisingly difficult. Slack had conversations, Notion had documents, meetings had their own notes, and code had its own context. Even when someone on the team had already solved a problem, you often had to know who to ask or dig through old messages to find it.\n\nWe started wondering what would happen if an organization could actually remember what it had learned.\n\nSo we built Hivemind.\n\nHivemind continuously indexes an organization's documents, conversations, and other sources of knowledge, then lets people ask questions in natural language and get answers with citations back to the original information. We designed it to respect existing permissions, so people only see information they're already allowed to access.\n\nWhat started as a simple search tool became a much bigger idea for us: an organization's knowledge shouldn't have to disappear into old conversations or forgotten documents. It should be something the organization can actually build on.\n\nWe're now using Hivemind within our own team and working with other organizations to see how far we can take that idea."
      },
      team: {
        image: "files/PlaceHolder.png",
        text: [
          "Team photo coming soon."
        ]
      }
    },
    {
      id: "project3",
        /* DRAFT COPY — review */
        summary: "A fingerprint system for train fares and hospital records, built on a NodeMCU and a cloud database. Your identity should be enough — you should not need to carry another card.",
      title: "C.E.N.T.H.R.O.",
      tagline: "Fingerprint-Based Biometric System for Transit & Healthcare",
      category: "Robotics",
      venue: "October 2024 - May 2025",
      video: "files/CENTHRO_Preview.mp4",
      links: [
        { label: "Video", url: "https://www.youtube.com/watch?v=jknjW6C9JpY" }
      ],
      overview: {
        image: "files/CENTHRO_Overview.webp",
        text: "After Focus Buddy, our team started noticing more everyday problems that felt like they didn't need to exist.\n\nOne of them was commuting. In Metro Manila, you had to carry a beep card to get through the gate. We saw something similar in hospitals, where staff would still have to manually retype patient information and dig through physical folders while someone was waiting in the ER.\n\nRFID cards already solved part of the problem, but you still had to carry something around and physically tap it. We started wondering: what if you didn't need to carry anything at all?\n\nThat became CENTHRO, a fingerprint-based system for train fare payments and accessing medical records. We built it using a NodeMCU, fingerprint sensor, cloud database, and web dashboard.\n\nThe idea was simple: your identity should be enough. You shouldn't have to carry another card just to prove who you are.\n\nWe brought CENTHRO to competitions, where it ended up winning both national and international awards. More than the awards themselves, it was exciting to see an idea that started from problems we noticed around us turn into something that could actually work."
      },
      team: {
        image: "files/CENTHRO_Team.webp",
        text: [
          "The team at the 4th DLSU-D Research Conference.",
          "From left to right: Ms. Joy Guinto (Coach), Audrey Tigson, Elisha Cacnio, Andrew Alangcao, and Romeo Esguerra."
        ]
      },
      awards: [
        { description: "5th DLSU-D Research Conference – Best Paper Presentation", year: "May 2025" },
        { description: "10th Philippine Robothon – Innovative Open Category, Overall Champion", year: "March 2025" },
        { description: "2024 International Robothon – Innovative Open Category, Champion", year: "November 2024" }
      ],    },
    {
      id: "project4",
        /* DRAFT COPY — review */
        summary: "A desktop robot on a LEGO EV3 frame and an Arduino Uno. It moves around the desk, gives verbal reminders and shows progress on an LCD. Deliberately hard to ignore.",
      title: "Focus Buddy",
      tagline: "Desktop Robot Study Companion for ADHD Focus",
      category: "Robotics",
      venue: "December 2023 - February 2024",
      video: "files/FocusBuddy_Preview.mp4",
      links: [
        { label: "Video", url: "https://www.youtube.com/watch?v=SedhOQ-z65Y&t" },
        { label: "GMA News Feature", url: "https://youtu.be/2ulcDQ-Hoko?t=44" }
      ],
      overview: {
        image: "files/FocusBuddy_Overview.webp",
        text: "A bunch of us on the team had the same problem: we'd sit down to study, but actually staying focused was another story. We tried timers, productivity apps, and the usual things, but none of them really stuck. At some point, someone suggested building a physical study buddy — something that would be harder to ignore than another notification on your phone.\n\nSo we built one for a robotics competition.\n\nFocus Buddy is a small robot built on a LEGO EV3 frame and powered by an Arduino Uno. It moves around your desk, gives verbal reminders, and shows your progress on an LCD. It's definitely not subtle, but that was kind of the point. It's a lot harder to ignore a robot sitting next to you telling you to get back to work.\n\nThe project ended up being one of my first experiences with robotics, and it made me realize how much I enjoyed building things around problems I'd actually experienced myself."
      },
      team: {
        image: "files/FocusBuddy_Team.webp",
        text: [
          "The team at the 9th Philippine Robothon in St. Paul College Pasig.",
          "From left to right: Pio Almera, Andrew Alangcao, Miguel Jambalos, Elisha Cacnio, and Audrey Tigson."
        ]
      },
      awards: [
        { description: "9th Philippine Robothon – Innovative Open Category, 3rd People's Choice Award", year: "February 2023" }
      ],
    },
    {
      id: "project5",
        /* DRAFT COPY — review */
        summary: "Over 3,000 SAT questions turned into a structured bank with OCR, then a practice-test generator with analytics on what keeps going wrong. Built so its author could study for the SAT.",
      title: "SATLearn",
      tagline: "Full-length practice tests from 3,000+ SAT questions",
      category: "Applications",
      venue: "July 2026 - Current",
      video: "files/SATLearn_Preview.mp4",
      links: [],
      overview: {
        image: "files/SATLearn_Overview.webp",
        text: "SATLearn started because I was studying for the SAT and ran into a pretty specific problem. Bluebook had realistic full-length practice tests, but there were only a limited number of them. There was also a much larger question bank, but it didn't really give me the same experience as taking an actual timed test. I wanted more practice tests without having to reuse the same ones over and over.\n\nSo I built one.\n\nI took over 3,000 SAT questions and used OCR to turn them into a structured question bank, then built an open-source platform that could generate full-length practice tests from them. But I didn't just want more questions. I wanted to know how I was actually improving — what concepts I kept getting wrong, what kinds of mistakes I was making, and what I should study next.\n\nSo I added AI to analyze my practice results and give me specific insights into where I was struggling and how I could improve.\n\nI originally built SATLearn just so I could study for my own SAT. But it became another example of something I've found myself doing repeatedly: when the tool I need doesn't quite exist, I usually end up building it myself."
      },
      team: {
        image: "files/PlaceHolder.png",
        text: [
          "A solo project built to make high-quality SAT preparation accessible, offline-capable, and free."
        ]
      }
    },
    {
      id: "project6",
        /* DRAFT COPY — review */
        summary: "A commute map for Metro Manila built from what regular commuters know: where to catch a particular jeep, which side of the road to wait on, which route is actually faster.",
      title: "BiyaHey!",
      tagline: "A commute map built on what regular commuters know",
      category: "Applications",
      venue: "March 2026 - April 2026",
      video: "files/BiyaHey.mp4",
      links: [],
      overview: {
        image: "files/BiyaHey_Overview.webp",
        text: "Living in Metro Manila, getting somewhere isn't always as simple as putting a destination into Google Maps. There are routes that only regular commuters know about — where to catch a particular jeep, which side of the road to wait on, when to take a tricycle instead, or which route is actually faster despite what the map says.\n\nA lot of that knowledge isn't really documented anywhere. You just learn it from someone who already knows how to get there.\n\nWe wanted to see if we could capture that knowledge and make it useful to everyone.\n\nThat became BiyaHey!, a community-driven commute map built around the way people actually navigate Metro Manila. Users enter where they're coming from and where they're going, and BiyaHey! combines routes shared by commuters with existing transportation data to generate step-by-step directions.\n\nThe interesting part isn't just the map. It's the local knowledge behind it. We use a retrieval-augmented generation pipeline to organize and summarize information that would otherwise be scattered across people's experiences, so someone who has never taken a particular route can still benefit from what regular commuters know.\n\nBiyaHey! came from a pretty simple observation: sometimes the best map isn't the one with the most data. It's the one that understands how people actually get around."
      },
      team: {
        image: "files/BiyaHey_Team.webp",
        text: [
          "The Team at Developer Camp Manila in Astbury, Makati.",
          "From left to right: Andrew, Alain, Kisen, JJ, Derk, Matthew, Hans, Darryl."
        ]
      },
      awards: [
        { description: "Developer Camp Manila – Finalist", year: "March 2026" }
      ]
    },
    {
      id: "plugin1",
        /* DRAFT COPY — review */
        summary: "A /btw gesture for the DeepSeek Harness Web GUI: ask a side question mid-turn, get the answer in a floating card, and leave nothing behind in the transcript when you dismiss it.",
        pieces: [{ title: "The card" }, { title: "In the composer" }, { title: "On a phone" }],
      title: "dsh-btw",
      tagline: "Ephemeral /btw side questions for the DSH Web GUI",
      category: "DSH Plugins",
      venue: "October 2026 · open source",
      links: [
        { label: "GitHub", url: "https://github.com/andrewhmir/dsh-btw" }
      ],
      overview: {
        image: "files/plugins/btw-card.webp",
        text: "Working with an agent, the question you want to ask is often not the task you are already on. I wanted a way to ask it without derailing the turn, opening a second session, or leaving a row in the history that the model would read back on the next turn.\n\n/btw is that gesture. Typed into the composer mid-session, it sends the question with the full committed conversation as context and no tool schemas at all — the inverse of a subagent, which gets the whole tool surface and an empty context. The answer streams into a non-modal card floating over the chat: no backdrop, no focus trap, and the composer keeps working while it streams.\n\nDismissing the card leaves no trace. Nothing is appended to the transcript, nothing is rendered as a chat row, and nothing enters what the model sees next. An answer that would be cut short is continued automatically instead of shown half-finished, and the request reuses the parent turn's prompt prefix so the provider's cache still applies.\n\nIt was the first plugin I built against the harness's own client and host halves, and the one that taught me how the bundle, the host route and the streaming protocol fit together. It is open source, with a deterministic bundle pipeline and a CI suite over the trigger, the stream and the ephemerality guarantee."
      },
      shots: [
        "files/plugins/btw-card.webp",
        "files/plugins/btw-composer.webp",
        "files/plugins/btw-narrow.webp"
      ]
    },
    {
      id: "plugin2",
        /* DRAFT COPY — review */
        summary: "A composer takeover that renders a plan-review question as the plan itself: full markdown on screen, Accept or Revise pinned at the top, and highlight-to-comment on any passage.",
        pieces: [{ title: "The plan" }, { title: "A comment" }, { title: "The decision" }],
      title: "dsh-plan-review",
      tagline: "The whole plan on screen before you approve it",
      category: "DSH Plugins",
      venue: "October 2026 · local install",
      links: [],
      overview: {
        image: "files/plugins/plan-review-plan.webp",
        text: "The superpowers workflow asks you to approve a plan through a question card that shows a file path and two buttons. The plan itself lives somewhere else, so approving it honestly means leaving the app, reading a markdown file, and coming back to say yes.\n\nThis plugin removes that step. When a question arrives marked for plan review, it takes over the composer instead: the complete plan rendered on screen, the decision buttons pinned at the top, and a comment rail beside it. You select any passage and attach a comment to that quote; comments stay editable and can be located again, and Accept refuses while feedback is unsent, so nothing is quietly dropped.\n\nDrafts live in the tab's session storage, so closing and reopening the review does not lose the comments, and answering clears them. When the plan cannot be read or the question is not claimed, the shipped card comes back rather than a dead end.\n\nIt was built against the same protocol as /btw, and it is the plugin that made plan review feel like reading rather than rubber-stamping."
      },
      shots: [
        "files/plugins/plan-review-plan.webp",
        "files/plugins/plan-review-comment.webp",
        "files/plugins/plan-review-decision.webp"
      ]
    },
    {
      id: "plugin3",
        /* DRAFT COPY — review */
        summary: "A theme for the DeepSeek Harness Web GUI that turns the shell into warm parchment and enormous display serif — with the rail's artwork solved from its own pixels rather than drawn by hand.",
        pieces: [{ title: "The shell" }, { title: "The rail" }, { title: "On a phone" }],
      title: "dsh-miranda-theme",
      tagline: "A broadsheet restyle for the DSH Web GUI",
      category: "DSH Plugins",
      venue: "October 2026 · local install",
      links: [],
      overview: {
        image: "files/plugins/miranda-shell.webp",
        text: "I spend most of the day inside the harness, and the default shell is a dark instrument panel. Miranda is the opposite: warm parchment stock, near-black ink, one ember accent, and display serifs set tight enough to crowd.\n\nIt is one dual-face plugin. The host half owns the settings namespace and serves the vendored font binaries; the client half re-points the shell's colour tokens by role, restyles the surfaces that are not part of the registerable alias dictionary, and adds a durable toggle in Settings → General so the whole restyle can be turned off again.\n\nTwo details took the longest. The rail's cut-out figure is pinned at the strongest opacity its own brightest pixel allows the rail's text to keep — a veil solved from the image instead of guessed by eye. And the sidebar brand lockup vendors the product's badge outline for outline, because its letters are vector art with no font to set; both halves register into the shell's own brand slots below the official plugin's rank, so switching the restyle off puts the shipped mark back without touching a file under the harness install.\n\nIt is the only plugin here that changes how the app looks rather than what it can do."
      },
      shots: [
        "files/plugins/miranda-shell.webp",
        "files/plugins/miranda-rail.webp",
        "files/plugins/miranda-phone.webp"
      ]
    }
  ],
  /* ── Leadership ─────────────────────────────────────────────────── */
  leadership: [
    { description: "AGHAM Research Club – Founder", year: "June 2025 - April 2026",      images: ["files/leadership-aghj-founder-1.webp", "files/leadership-aghj-founder-2.webp", "files/leadership-aghj-founder-3.webp", "files/leadership-aghj-founder-4.webp"], /* DRAFT COPY — review */ summary: "Founded the research club and led it through the 2025–2026 school year." },
    { description: "High School Student Council – STEM-Engineering Level Representative", year: "July 2023 - May 2025",        images: ["files/leadership-ssc-stem-rep-1.webp", "files/leadership-ssc-stem-rep-2.webp", "files/leadership-ssc-stem-rep-3.webp", "files/leadership-ssc-stem-rep-4.webp"], /* DRAFT COPY — review */ summary: "Represented the STEM-Engineering level on the student council across two school years." },
    { description: "Personnel's Week 2023 & 2024 – Event Head", year: "August 2023 - October 2024", images: ["files/leadership-personnels-week-1.webp", "files/leadership-personnels-week-2.webp"], /* DRAFT COPY — review */ summary: "Ran Personnel's Week twice, in 2023 and 2024." },
    { description: "Media and Coverages Committee – Head", year: "July 2023 - May 2025",        images: ["files/leadership-media-coverages-1.webp", "files/leadership-media-coverages-2.webp", "files/leadership-media-coverages-3.webp"], /* DRAFT COPY — review */ summary: "Headed the committee that covered school events." },
  ],

  /* ── Honors ───────────────────────────────────────────────────────────
     Two kinds of honour live in this one array, and the field that tells them
     apart is `from`.

     An honour that IS a project's award — the competition placings and paper
     citations a project won — carries `from: 'projectN'`, and it hangs on that
     project's card under Awards rather than on the Honours wall. The card's own
     `awards` array is the readable copy; `from` is what keeps the two in step,
     because the Honours room skips every record that carries it. Adding one
     without the other fails the renderer suite rather than quietly duplicating.

     An honour that stands alone — a commencement citation, a shortlisting, a
     congress delegation — carries no `from`, and is drawn in the Honours room
     as one tile in a three-column list. */
  honors: [
    { description: "Annual Commencement Exercises – High Honors", year: "April 2026", /* DRAFT COPY — review */ summary: "Graduating with high honours, and the ceremony that closed it." },
    { description: "Annual Commencement Exercises – Best in Work Immersion", year: "April 2026", /* DRAFT COPY — review */ summary: "The citation for work immersion, awarded at the same commencement." },
    { description: "Developer Camp Manila – Finalist", year: "March 2026", from: "project6", /* DRAFT COPY — review */ summary: "BiyaHey! reached the finalist round at Developer Camp Manila." },
    { description: "11th Philippine Robothon – Overall Champion", year: "February 2026", from: "project1", /* DRAFT COPY — review */ summary: "The second national title in the innovative open category, a year after the first." },
    { description: "Muntinlupa Robotics Fair – Champion", year: "December 2025", from: "project1", /* DRAFT COPY — review */ summary: "A home-city title, taken with Project PALAD." },
    { description: "2025 International Robothon – 1st Runner Up", year: "November 2025", from: "project1", /* DRAFT COPY — review */ summary: "The second international placing, taken with Project PALAD." },
    { description: "4th CERN-Solvay Student Camp – Shortlisted (Top 7% of 2500 Applicants)", year: "July 2025", /* DRAFT COPY — review */ summary: "Shortlisted for the 4th CERN-Solvay Student Camp, in the top 7% of 2,500 applicants." },
    { description: "5th DLSU-D Research Conference – Best Paper Presentation", year: "May 2025", from: "project3", /* DRAFT COPY — review */ summary: "Best paper presentation at the 5th DLSU-D Research Conference, with C.E.N.T.H.R.O." },
    { description: "21st National Youth Congress – Delegate", year: "March 2025", images: ["files/honors-nyc-2025-1.webp", "files/honors-nyc-2025-2.webp"], /* DRAFT COPY — review */ summary: "Selected as a delegate to the 21st National Youth Congress." },
    { description: "10th Philippine Robothon – Overall Champion", year: "March 2025", from: "project3", /* DRAFT COPY — review */ summary: "The first national title in the innovative open category, taken with C.E.N.T.H.R.O." },
    { description: "2024 International Robothon – Champion", year: "November 2024", from: "project3", /* DRAFT COPY — review */ summary: "The first international win, taken with C.E.N.T.H.R.O." },
    { description: "20th National Youth Congress – Delegate", year: "November 2023", /* DRAFT COPY — review */ summary: "Selected as a delegate to the 20th National Youth Congress." },
    { description: "9th Philippine Robothon – 3rd People's Choice Award", year: "February 2023", from: "project4", /* DRAFT COPY — review */ summary: "The team's first competition, and its first award." },
  ]
};

/* ==========================================================================
   Derived helpers — the three functions the page calls, and nothing else
   ========================================================================== */
(function () {
  'use strict';
  globalThis.Site = globalThis.Site || {};

  /* A top-level `const` stays in the script's own scope, so a classic script
     imported as a module (tests/) cannot see PORTFOLIO at all. Publishing it
     on globalThis changes nothing in the browser, where the bare identifier
     already resolved — it is what makes the data reachable from Node. */
  if (typeof PORTFOLIO !== 'undefined') globalThis.PORTFOLIO = PORTFOLIO;

  var ROOM_TITLES = {
    Robotics: 'Works in Robotics',
    Applications: 'Works in Applications',
    'DSH Plugins': 'Works in DSH Plugins'
  };
  var ROOM_ORDER = ['Applications', 'DSH Plugins', 'Robotics'];

  /* One sentence per category, shown on that category's Work panel. The key is
     the project's own `category` value, so grouping never needs a second list. */
  var ROOM_LEDES = {
    Robotics: 'All three started with daily friction: pressing a fingerprint sensor a hundred people have already touched, carrying a card for the train and a folder of records for the hospital, sitting down to study and losing the thread ten minutes later. We built a fix for each, then took them to competitions.',
    Applications: 'Hivemind, SATLearn and BiyaHey! all started the same way: I went looking for a tool and it wasn’t there. Nothing that could answer a question from a company’s own documents. Not enough full-length SAT practice tests. No map that knows which jeep to take. So I built each one.',
    'DSH Plugins': 'I spend most of my day developing inside the DeepSeek Harness, and I kept wanting three small things from it: a way to ask a side question without derailing the turn, a plan review I could read before approving it, and a shell that wasn’t a dark instrument panel. So I wrote them as plugins.'
  };

  /* Group projects into rooms. Known categories come first in ROOM_ORDER;
     anything else follows in first-seen order so no project is ever dropped. */
  function deriveRooms(projects) {
    var groups = {};
    var seen = [];
    (projects || []).forEach(function (p) {
      var key = p && p.category ? p.category : 'Other';
      if (!groups[key]) { groups[key] = []; seen.push(key); }
      groups[key].push(p);
    });
    var ordered = ROOM_ORDER.filter(function (k) { return groups[k]; })
      .concat(seen.filter(function (k) { return ROOM_ORDER.indexOf(k) === -1; }));
    return ordered.map(function (key) {
      return { key: key, title: ROOM_TITLES[key] || key, lede: ROOM_LEDES[key] || '', projects: groups[key] };
    });
  }

  globalThis.Site.deriveRooms = deriveRooms;
  globalThis.Site.ROOM_TITLES = ROOM_TITLES;
  globalThis.Site.ROOM_ORDER = ROOM_ORDER;

  /* ── The poster frame, derived from the video ────────────────────────────
     tools/make-images.mjs generates one still per video, and this is that
     tool's rule restated once so the data cannot disagree with it: it scans
     `.mp4` files directly in `files/` and writes `files/posters/<stem>.jpg` —
     FLAT, on the basename.

     Anything the tool does not describe yields '' rather than a guess. A poster
     path nothing generates is a request that 404s on every load, and an empty
     `poster` is honest: the frame then shows the film's own first frame. */
  function posterFor(video) {
    var src = String(video == null ? '' : video);
    var file = src.replace(/^.*\//, '');
    if (!/^files\//.test(src) || !/\.mp4$/i.test(file)) return '';
    return 'files/posters/' + file.replace(/\.mp4$/i, '.jpg');
  }

  globalThis.Site.posterFor = posterFor;

  /* ── The honours room, and the awards it gave up ────────────────────────
     An honour that IS a project's award carries `from: 'projectN'` and hangs on
     that project's card, not here. This splits the array on that one field.

     It reads the field rather than matching the description against the
     project's own award text: the wall and the card name one win in two
     wordings, and no predicate over those strings can be trusted. `from` is
     the fact; the wording is not.

     It is a total partition, in input order: every honour lands in exactly one
     side, and an empty list yields two empty arrays rather than throwing.
     `index` is the record's own position in the UNFILTERED array, because that
     is what the dialog's data-index resolves against. */
  function honoursTiles(honors) {
    var list = Array.isArray(honors) ? honors : [];
    var tiles = [];
    var projectAwards = [];
    list.forEach(function (record, i) {
      if (!record) return;
      var entry = { record: record, index: i };
      (record.from ? projectAwards : tiles).push(entry);
    });
    return { tiles: tiles, projectAwards: projectAwards };
  }

  globalThis.Site.honoursTiles = honoursTiles;
})();
