/* ==========================================================================
   Portfolio Data — Single Source of Truth
   Add new projects, honors, leadership, or news by appending to the arrays.
   ========================================================================== */

/* Gallery photos (optional)
   Add an `images: [...]` array to any news / leadership / honors entry to make
   that line clickable and open a rotating photo gallery in the modal.
   Paths are relative to index.html (e.g. "files/leadership-aghj-founder-1.jpg").
   Missing files automatically fall back to files/PlaceHolder.png, so you can
   drop photos into files/ and name them to match these paths.

   Name photos `<section>-<event>-<n>.jpg`, numbered from 1 in the order they
   should appear. Competition photos use the year plus the level of the round:
   `honors-robothon-<year>-<ph|intl>-<n>.jpg` (ph = Philippine Robothon).

   Source photos are imported and resized by tools/import-photos.mjs, which owns
   the mapping from the owner's staging filenames to these paths.

   Still awaiting photos (rows stay clickable and show the labelled placeholder):
   the four News entries, Personnel's Week, Commencement, Work Immersion, and
   the 20th National Youth Congress. */

const PORTFOLIO = {

  /* ── Personal / Meta ───────────────────────────────────────────── */
  name: "Andrew Alangcao",
  title: "Data Engineer | Computational Cognition Researcher",
  bio: [
    "Hi, I'm Andrew.",
    "I like art, and I have fun building things.",
    "I'm inspired by how technology can improve everyday life.",
    "I want to turn that inspiration into work that makes the world a little better.",
    "This site is a record of my pursuit of that."
  ],
  email: "andrew.alangcao@gmail.com",
  profileImage: "files/profile.jpg",
  favicon: "",
  scrollerIcon: "",
  social: [
    { label: "Resume",    icon: "fas fa-file-alt",   url: "https://drive.google.com/file/d/1lb3D1vB__Xfi5UD1Z22mGeGJtVetw_1M/view?usp=sharing" },
    { label: "GitHub",    icon: "fab fa-github",     url: "https://github.com/andrewhmir" },
    { label: "LinkedIn",  icon: "fab fa-linkedin",   url: "https://www.linkedin.com/in/andrew-alangcao/" }
  ],

  /* ── Navigation ─────────────────────────────────────────────────── */
  nav: [
    { label: "Home",       id: "Home" },
    { label: "News",       id: "News" },
    { label: "Projects",   id: "Projects" },
    { label: "Records",    id: "Records" }
  ],

  /* ── News ──────────────────────────────────────────────────────── */
  news: [
    { date: "May 2026",   text: "Started a Data Engineering Role at Redacted",                                                      images: ["files/news-REDACTED-1.jpg"] },
    { date: "April 2026", text: "Graduated High School with High Honors – San Beda Alabang, Muntinlupa City",                     images: ["files/news-graduation-1.jpg", "files/news-graduation-2.jpg"] },
    { date: "April 2026", text: "Gave a Speech of Inspiration at the Heroes Tribute Celebration – San Beda Alabang, Muntinlupa City", images: ["files/news-heroes-tribute-1.jpg"] },
    { date: "March 2026", text: "Invited as a Guest Speaker at the STEAM Ed Conference of First Eduspec Inc. – San Beda Alabang, Muntinlupa City", images: ["files/news-steam-conference-1.jpg"] }
  ],

  /* ── Projects ──────────────────────────────────────────────────── */
  projects: [
    {
      id: "project1",
        /* DRAFT COPY — review */
        summary: "A contactless palm scanner for retail and transit: RGB and near-infrared imaging, a Raspberry Pi 5 running the model locally, and a decision to keep the biometric data on the device.",
        pieces: [{ title: "The palm scanner" }, { title: "The team" }],
      title: "Project PALAD",
      tagline: "Contactless Palm Biometric Scanner for Retail & Transit",
      category: "Robotics",
      authors: "<strong>Andrew Alangcao*</strong>, Irah Casil*, Dane Marianne Justiano*, Ben Singanon*, Kevin Paez, and Tyrone Sorra",
      venue: "August 2025 - April 2026",
      source: "closed",
      report: { image: "", text: "" },
      video: "files/Palad_Preview.mp4",
      links: [
        { label: "Video", icon: "fas fa-play", url: "https://www.youtube.com/watch?v=vY84w2aF754" }
      ],
      overview: {
        image: "files/Palad_Overview.jpg",
        text: "PALAD was a separate project with a different team, but it grew out of a similar way of thinking.\n\nWe were interested in what could come after fingerprint scanning. Fingerprint scanners work, but they still require you to touch a surface. That isn't ideal in a packed train station during rush hour or a clinic where hundreds of people might be using the same sensor.\n\nSo we started looking at contactless biometrics.\n\nProject PALAD uses palm recognition. You hold your hand above the sensor, and it captures both the surface of your palm and the vein pattern underneath using RGB and near-infrared imaging. A Raspberry Pi 5 runs the deep learning model locally, so the biometric data doesn't have to leave the device.\n\nAuthentication takes around three seconds.\n\nWe designed it around local use cases like retail, public transit, and rural banking — places where internet connectivity isn't always reliable and systems need to be simple enough to actually deploy.\n\nPALAD went on to win national and international awards as well. For me, it was another example of how a relatively simple observation — in this case, that biometric authentication shouldn't require physical contact — can turn into a much bigger engineering problem to solve."
      },
      team: {
        image: "files/Palad_Team.jpg",
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
        pieces: [{ title: "The product" }, { title: "The team — photograph awaited" }],
      title: "Hivemind",
      tagline: "AI-Native Organizational Memory",
      category: "Applications",
      authors: "<strong>Andrew Alangcao*</strong>, Derrick Valdellon*, and Darryl Ty*",
      venue: "June 2026 - Current",
      source: "closed",
      video: "files/HiveMind_Preview.mp4",
      links: [],
      overview: {
        image: "files/HiveMind_Overview.png",
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
        pieces: [{ title: "The reader" }, { title: "The team" }],
      title: "C.E.N.T.H.R.O.",
      tagline: "Fingerprint-Based Biometric System for Transit & Healthcare",
      category: "Robotics",
      authors: "<strong>Andrew Alangcao*</strong>, Audrey Tigson*, Elisha Cacnio*, Romeo Esguerra*, and Bryan Maglaya",
      venue: "October 2024 - May 2025",
      source: "closed",
      video: "files/CENTHRO_Preview.mp4",
      links: [
        { label: "Video", icon: "fas fa-play", url: "https://www.youtube.com/watch?v=jknjW6C9JpY" }
      ],
      overview: {
        image: "files/CENTHRO_Overview.jpg",
        text: "After Focus Buddy, our team started noticing more everyday problems that felt like they didn't need to exist.\n\nOne of them was commuting. In Metro Manila, you either had to carry exact change or hope the beep card terminal was working. We saw something similar in hospitals, where staff would still have to manually retype patient information and dig through physical folders while someone was waiting in the ER.\n\nRFID cards already solved part of the problem, but you still had to carry something around and physically tap it. We started wondering: what if you didn't need to carry anything at all?\n\nThat became CENTHRO, a fingerprint-based system for train fare payments and accessing medical records. We built it using a NodeMCU, fingerprint sensor, cloud database, and web dashboard.\n\nThe idea was simple: your identity should be enough. You shouldn't have to carry another card just to prove who you are.\n\nWe brought CENTHRO to competitions, where it ended up winning both national and international awards. More than the awards themselves, it was exciting to see an idea that started from problems we noticed around us turn into something that could actually work."
      },
      team: {
        image: "files/CENTHRO_Team.jpg",
        text: [
          "The team at the 4th DLSU-D Research Conference.",
          "From left to right: Ms. Joy Guinto (Coach), Audrey Tigson, Elisha Cacnio, Andrew Alangcao, and Romeo Esguerra."
        ]
      },
      awards: [
        { description: "4th DLSU-D Research Conference – Best Paper Presentation", year: "May 2025" },
        { description: "10th Philippine Robothon – Innovative Open Category, Overall Champion", year: "March 2025" },
        { description: "2024 International Robothon – Innovative Open Category, Champion", year: "November 2024" }
      ],
    },
    {
      id: "project4",
        /* DRAFT COPY — review */
        summary: "A desktop robot on a LEGO EV3 frame and an Arduino Uno. It moves around the desk, gives verbal reminders and shows progress on an LCD. Deliberately hard to ignore.",
        pieces: [{ title: "The robot" }, { title: "The team" }],
      title: "Focus Buddy",
      tagline: "Desktop Robot Study Companion for ADHD Focus",
      category: "Robotics",
      authors: "<strong>Andrew Alangcao*</strong>, Audrey Tigson*, Elisha Cacnio*, Miguel Jambalos*, and Pio Almera",
      venue: "December 2023 - February 2024",
      source: "closed",
      video: "files/FocusBuddy_Preview.mp4",
      links: [
        { label: "Video", icon: "fas fa-play", url: "https://www.youtube.com/watch?v=SedhOQ-z65Y&t" },
        { label: "GMA News Feature", icon: "fas fa-play", url: "https://youtu.be/2ulcDQ-Hoko?t=44" }
      ],
      overview: {
        image: "files/FocusBuddy_Overview.jpg",
        text: "A bunch of us on the team had the same problem: we'd sit down to study, but actually staying focused was another story. We tried timers, productivity apps, and the usual things, but none of them really stuck. At some point, someone suggested building a physical study buddy — something that would be harder to ignore than another notification on your phone.\n\nSo we built one for a robotics competition.\n\nFocus Buddy is a small robot built on a LEGO EV3 frame and powered by an Arduino Uno. It moves around your desk, gives verbal reminders, and shows your progress on an LCD. It's definitely not subtle, but that was kind of the point. It's a lot harder to ignore a robot sitting next to you telling you to get back to work.\n\nThe project ended up being one of my first experiences with robotics, and it made me realize how much I enjoyed building things around problems I'd actually experienced myself."
      },
      team: {
        image: "files/FocusBuddy_Team.jpg",
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
        pieces: [{ title: "The platform" }, { title: "The team — photograph awaited" }],
      title: "SATLearn",
      tagline: "AI-Powered SAT Practice with Personalized Analytics",
      category: "Applications",
      authors: "<strong>Andrew Alangcao</strong>",
      venue: "July 2026 - Current",
      source: "open",
      video: "files/SATLearn_Preview.mp4",
      links: [],
      overview: {
        image: "files/SATLearn_Overview.png",
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
        pieces: [{ title: "The map" }, { title: "The team" }],
      title: "BiyaHey!",
      tagline: "Community-Powered Commute Map for Metro Manila",
      category: "Applications",
      authors: "<strong>Andrew Alangcao*</strong>, Alain*, Kisen*, JJ*, Derk*, Matthew*, Hans*, Darryl*",
      venue: "March 2026 - April 2026",
      source: "closed",
      video: "files/BiyaHey.mp4",
      links: [],
      overview: {
        image: "files/BiyaHey_Overview.jpg",
        text: "Living in Metro Manila, getting somewhere isn't always as simple as putting a destination into Google Maps. There are routes that only regular commuters know about — where to catch a particular jeep, which side of the road to wait on, when to take a tricycle instead, or which route is actually faster despite what the map says.\n\nA lot of that knowledge isn't really documented anywhere. You just learn it from someone who already knows how to get there.\n\nWe wanted to see if we could capture that knowledge and make it useful to everyone.\n\nThat became BiyaHey!, a community-driven commute map built around the way people actually navigate Metro Manila. Users enter where they're coming from and where they're going, and BiyaHey! combines routes shared by commuters with existing transportation data to generate step-by-step directions.\n\nThe interesting part isn't just the map. It's the local knowledge behind it. We use a retrieval-augmented generation pipeline to organize and summarize information that would otherwise be scattered across people's experiences, so someone who has never taken a particular route can still benefit from what regular commuters know.\n\nBiyaHey! came from a pretty simple observation: sometimes the best map isn't the one with the most data. It's the one that understands how people actually get around."
      },
      team: {
        image: "files/BiyaHey_Team.jpg",
        text: [
          "The Team at Developer Camp Manila in Astbury, Makati.",
          "From left to right: Andrew, Alain, Kisen, JJ, Derk, Matthew, Hans, Darryl."
        ]
      },
      awards: [
        { description: "Developer Camp Manila – Finalist", year: "March 2026" }
      ]
    }
  ],

  /* ── Leadership ─────────────────────────────────────────────────── */
  leadership: [
    { description: "AGHAM Research Club – Founder", year: "June 2025 - April 2026",      images: ["files/leadership-aghj-founder-1.jpg", "files/leadership-aghj-founder-2.jpg", "files/leadership-aghj-founder-3.jpg", "files/leadership-aghj-founder-4.jpg"], /* DRAFT COPY — review */ summary: "Founded the research club and led it through the 2025–2026 school year.", pieces: [{ title: "First photograph" }, { title: "Second photograph" }, { title: "Third photograph" }, { title: "Fourth photograph" }] },
    { description: "High School Student Council – STEM-Engineering Level Representative", year: "July 2023 - May 2025",        images: ["files/leadership-ssc-stem-rep-1.jpg", "files/leadership-ssc-stem-rep-2.jpg", "files/leadership-ssc-stem-rep-3.jpg", "files/leadership-ssc-stem-rep-4.jpg"], /* DRAFT COPY — review */ summary: "Represented the STEM-Engineering level on the student council across two school years.", pieces: [{ title: "First photograph" }, { title: "Second photograph" }, { title: "Third photograph" }, { title: "Fourth photograph" }] },
    { description: "Personnel's Week 2024 & 2025 – Event Head", year: "August 2023 - October 2025",  images: ["files/leadership-personnels-week-1.jpg", "files/leadership-personnels-week-2.jpg"], /* DRAFT COPY — review */ summary: "Ran Personnel's Week twice, in 2024 and 2025.", pieces: [{ title: "First photograph" }, { title: "Second photograph" }] },
    { description: "Media and Coverages Committee – Head", year: "July 2023 - May 2025",        images: ["files/leadership-media-coverages-1.jpg", "files/leadership-media-coverages-2.jpg", "files/leadership-media-coverages-3.jpg"], /* DRAFT COPY — review */ summary: "Headed the committee that covered school events.", pieces: [{ title: "First photograph" }, { title: "Second photograph" }, { title: "Third photograph" }] },
  ],

  /* ── Honors ─────────────────────────────────────────────────────── */
  honors: [
    { description: "Annual Commencement Exercises – High Honors", year: "April 2026", images: ["files/honors-commencement-1.jpg", "files/honors-commencement-2.jpg"], /* DRAFT COPY — review */ summary: "Graduating with high honours, and the ceremony that closed it.", pieces: [{ title: "Receiving the citation" }, { title: "After the ceremony" }] },
    { description: "Annual Commencement Exercises – Best in Work Immersion", year: "April 2026", images: ["files/honors-work-immersion-1.jpg"], /* DRAFT COPY — review */ summary: "The citation for work immersion, awarded at the same commencement.", pieces: [{ title: "The award" }] },
    { description: "Developer Camp Manila – Finalist", year: "March 2026", /* DRAFT COPY — review */ summary: "BiyaHey! reached the finalist round at Developer Camp Manila.", pieces: [{ title: "Photograph awaited" }] },
    { description: "11th Philippine Robothon – Innovative Open Category, Overall Champion", year: "February 2026", images: ["files/honors-robothon-2026-ph-1.jpg"], /* DRAFT COPY — review */ summary: "The second national title in the innovative open category, a year after the first.", pieces: [{ title: "The award" }] },
    { description: "2025 Muntinlupa Robotics Fair – Champion", year: "December 2025", /* DRAFT COPY — review */ summary: "A home-city title, taken with Project PALAD.", pieces: [{ title: "Photograph awaited" }] },
    { description: "2025 International Robothon – Innovative Open Category, 1st Runner Up", year: "November 2025", /* DRAFT COPY — review */ summary: "The second international placing, taken with Project PALAD.", pieces: [{ title: "Photograph awaited" }] },
    { description: "4th CERN-Solvay Student Camp – Shortlisted (Top 7% of 2500 Applicants)", year: "July 2025", /* DRAFT COPY — review */ summary: "Shortlisted for the 4th CERN-Solvay Student Camp, in the top 7% of 2,500 applicants.", pieces: [{ title: "Photograph awaited" }] },
    { description: "5th DLSU-D Research Conference – Best Paper Presentation", year: "May 2025", /* DRAFT COPY — review */ summary: "Best paper presentation at the 5th DLSU-D Research Conference, with C.E.N.T.H.R.O.", pieces: [{ title: "At the conference" }] },
    { description: "21st National Youth Congress – Delegate", year: "March 2025", images: ["files/honors-nyc-2025-1.jpg", "files/honors-nyc-2025-2.jpg"], /* DRAFT COPY — review */ summary: "Selected as a delegate to the 21st National Youth Congress.", pieces: [{ title: "At the congress" }, { title: "With the delegation" }] },
    { description: "10th Philippine Robothon – Innovative Open Category, Overall Champion", year: "March 2025", images: ["files/honors-robothon-2025-ph-1.jpg", "files/honors-robothon-2025-ph-2.jpg", "files/honors-robothon-2025-ph-3.jpg"], /* DRAFT COPY — review */ summary: "The first national title in the innovative open category, taken with C.E.N.T.H.R.O.", pieces: [{ title: "At the podium" }, { title: "At the table" }, { title: "The run-through" }] },
    { description: "2024 International Robothon – Innovative Open Category, Champion", year: "November 2024", images: ["files/honors-robothon-2024-intl-1.jpg", "files/honors-robothon-2024-intl-2.jpg"], /* DRAFT COPY — review */ summary: "The first international win, taken with C.E.N.T.H.R.O.", pieces: [{ title: "At the podium" }, { title: "With the machine" }] },
    { description: "20th National Youth Congress – Delegate", year: "November 2023", images: ["files/honors-nyc-2023-1.jpg"], /* DRAFT COPY — review */ summary: "Selected as a delegate to the 20th National Youth Congress.", pieces: [{ title: "At the congress" }] },
    { description: "9th Philippine Robothon – Innovative Open Category, 3rd People's Choice Award", year: "February 2023", /* DRAFT COPY — review */ summary: "The team's first competition, and its first award.", pieces: [{ title: "Photograph awaited" }] },
  ]
};

/* ==========================================================================
   Gallery structure — derived from the data above, never hand-authored
   ========================================================================== */
(function () {
  'use strict';
  globalThis.Site = globalThis.Site || {};

  /* A top-level `const` stays in the script's own scope, so a classic script
     imported as a module (tests/) cannot see PORTFOLIO at all. Publishing it
     on globalThis changes nothing in the browser, where the bare identifier
     already resolved — it is what makes the data reachable from Node. */
  if (typeof PORTFOLIO !== 'undefined') globalThis.PORTFOLIO = PORTFOLIO;

  var ROOM_TITLES = { Robotics: 'Works in Robotics', Applications: 'Works in Applications' };
  var ROOM_ORDER  = ['Robotics', 'Applications'];

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
      return { key: key, title: ROOM_TITLES[key] || key, projects: groups[key] };
    });
  }

  globalThis.Site.deriveRooms = deriveRooms;
  globalThis.Site.ROOM_TITLES = ROOM_TITLES;
  globalThis.Site.ROOM_ORDER = ROOM_ORDER;

  /* ── The pieces of a group ──────────────────────────────────────────────
     One record is one group; a group's pieces are its photographs, in the
     order it declares them. A record with no photographs still hangs a full
     composition: on a near-black wall a bare frame is a conspicuous hole, so
     an awaited photograph is hung and labelled instead of nothing.

     A piece carries whether its photograph has arrived. Resolving that here,
     once, is what stops every call site from re-deriving it by matching the
     placeholder path — and it is what lets the renderer draw an awaited frame
     as a reserved place on the wall rather than as a grey picture. */
  var PLACEHOLDER = 'files/PlaceHolder.png';

  /* The budget. Three frames is the floor because a two-frame hang reads as an
     accident on a wall this wide; six is the ceiling because a seventh stack
     is taller than the band a room can give it. */
  var MIN_PIECES = 3;
  var MAX_PIECES = 6;

  function asPiece(src) { return { src: src, awaited: src === PLACEHOLDER }; }

  /* Padding is appended rather than interleaved, so a group's lead frame is a
     real photograph whenever the record has one. */
  function fitPieces(srcs) {
    var out = srcs.slice(0, MAX_PIECES).map(asPiece);
    while (out.length < MIN_PIECES) out.push(asPiece(PLACEHOLDER));
    return out;
  }

  function groupPieces(record, kind) {
    /* A record that does not exist hangs nothing — there is no group. */
    if (!record) return [];
    if (kind === 'project') {
      var out = [];
      if (record.overview && record.overview.image) out.push(record.overview.image);
      if (record.team && record.team.image) out.push(record.team.image);
      if (out.length) return fitPieces(out);
      /* A project with no still falls back to the poster frame
         tools/make-images.mjs generates for its video. */
      if (typeof record.video === 'string' && record.video) {
        return fitPieces([record.video.replace(/^files\//, 'files/posters/').replace(/\.mp4$/i, '.jpg')]);
      }
      return fitPieces([PLACEHOLDER]);
    }
    var imgs = (Array.isArray(record.images) ? record.images : []).filter(Boolean);
    return fitPieces(imgs.length ? imgs : [PLACEHOLDER]);
  }
  globalThis.Site.groupPieces = groupPieces;
  globalThis.Site.PLACEHOLDER = PLACEHOLDER;
  globalThis.Site.MIN_PIECES = MIN_PIECES;
  globalThis.Site.MAX_PIECES = MAX_PIECES;

  /* ── The arrangements ───────────────────────────────────────────────────
     A group is hung as a composition, not as a row: its photographs are
     partitioned into columns, one of them is the lead, and each column is
     dropped a little so a stack never reads as one tall frame.

     Several arrangements per count, so neighbouring groups differ and the wall
     reads as a hang rather than as a repeated cell. The deepest arrangement any
     of these produces is a single column of five, which is the case the frame
     heights in css/styles.css are sized to keep inside a room's band. */
  var HANG_LAYOUTS = {
    3: [
      { name: 'lead-two',     columns: [[0], [1, 2]],         lead: 0, drop: [0, 14] },
      { name: 'two-lead',     columns: [[1, 2], [0]],         lead: 0, drop: [14, 0] },
      { name: 'column-three', columns: [[0, 1, 2]],           lead: 0, drop: [0] },
    ],
    4: [
      { name: 'lead-three',   columns: [[0], [1, 2, 3]],      lead: 0, drop: [0, 14] },
      { name: 'three-lead',   columns: [[1, 2, 3], [0]],      lead: 0, drop: [14, 0] },
      { name: 'two-two',      columns: [[0, 1], [2, 3]],      lead: 0, drop: [0, 14] },
      { name: 'column-four',  columns: [[0, 1, 2, 3]],        lead: 0, drop: [0] },
    ],
    5: [
      { name: 'lead-four',    columns: [[0], [1, 2, 3, 4]],   lead: 0, drop: [0, 14] },
      { name: 'lead-two-two', columns: [[0], [1, 2], [3, 4]], lead: 0, drop: [0, 14, 0] },
      { name: 'two-three',    columns: [[0, 1], [2, 3, 4]],   lead: 0, drop: [0, 14] },
    ],
    6: [
      { name: 'three-three',  columns: [[0, 1, 2], [3, 4, 5]], lead: 0, drop: [0, 14] },
      { name: 'lead-five',    columns: [[0], [1, 2, 3, 4, 5]], lead: 0, drop: [0, 14] },
      { name: 'two-two-two',  columns: [[0, 1], [2, 3], [4, 5]], lead: 0, drop: [0, 14, 0] },
    ]
  };

  /* FNV-1a, 32-bit. A stable string hash, because the same group must be dealt
     the same arrangement on every load: a wall that reshuffles under a visitor
     who reloads is not a hang, it is a slot machine. */
  function layoutHash(str) {
    var h = 2166136261;
    var s = String(str == null ? '' : str);
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /* Total by construction: an unknown count falls back to a single column of
     every piece, so a group can never fail to render for want of a layout. */
  function hangLayout(key, count) {
    var n = Math.max(0, Math.floor(Number(count) || 0));
    var set = HANG_LAYOUTS[n];
    if (set && set.length) return set[layoutHash(key) % set.length];
    var columns = [];
    for (var i = 0; i < n; i++) columns.push([i]);
    return {
      name: 'column-' + n,
      columns: columns,
      lead: 0,
      drop: columns.map(function () { return 0; })
    };
  }
  globalThis.Site.HANG_LAYOUTS = HANG_LAYOUTS;
  globalThis.Site.hangLayout = hangLayout;

  /* ── The honours split ──────────────────────────────────────────────────
     This exists because a room used to be exactly one screen wide, holding a
     grid of 2 columns x 2 rows — four exhibits — so thirteen honours would not
     fit on one wall and were cut into four. A gallery is now as wide as its own
     contents, so the ceiling is gone and there is one wall. Four galleries all
     called Honours was the visible cost of that grid.

     It is kept rather than deleted because the partition is still the right
     shape for a split by MEANING — awards against activities — which is a
     content decision for the owner and not this code's to make. Raising
     HONOURS_ROOMS splits the array again, in order, with no other change: the
     renderer numbers the rooms and the dock names them from the parts.

     The array is authored newest-first, so the split takes it in order rather
     than guessing at a kind from the description text. Empty parts are dropped
     by the renderer rather than hung as an empty wall.

     This is a total partition: every record lands in exactly one part, in
     input order, and an empty list yields empty parts rather than throwing. */
  var HONOURS_ROOMS = 1;

  /* Even chunks that between them hold every record. Boundaries fall at
     `floor(i * n / rooms)`, so any remainder lands in the LAST part: thirteen
     into four is 3, 3, 3, 4. A plain `ceil` slice is the rule this replaces —
     it gives 4, 4, 4, 1 for the same input, three full walls and a fourth
     holding one honour alone, and it is even only when the count divides. The
     floor rule is even for every count, and never loses a record. */
  function evenChunks(list, rooms) {
    var out = [];
    for (var i = 0; i < rooms; i++) {
      out.push(list.slice(Math.floor(i * list.length / rooms),
                          Math.floor((i + 1) * list.length / rooms)));
    }
    return out;
  }

  function honoursSplit(honors) {
    var list = Array.isArray(honors) ? honors : [];
    return { parts: evenChunks(list, HONOURS_ROOMS) };
  }
  globalThis.Site.honoursSplit = honoursSplit;
  globalThis.Site.HONOURS_ROOMS = HONOURS_ROOMS;
  globalThis.Site.evenChunks = evenChunks;

  /* Index of the work whose centre is nearest the viewport centre.
     Pure: takes precomputed centres so it needs no DOM. */
  function visibleWork(scrollLeft, viewportW, workCentres) {
    if (!workCentres || !workCentres.length) return -1;
    var mid = scrollLeft + viewportW / 2;
    var best = 0, bestD = Infinity;
    for (var i = 0; i < workCentres.length; i++) {
      var d = Math.abs(workCentres[i] - mid);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }
  globalThis.Site.visibleWork = visibleWork;

  var GALLERY_LISTS = {
    news: function () { return PORTFOLIO.news; },
    leadership: function () { return PORTFOLIO.leadership; },
    honors: function () { return PORTFOLIO.honors; }
  };

  /* Total lookup: always returns { title, meta, images }. An entry with no
     photos yields an empty images array rather than a neighbour's photos.
     This is the fix for the defect where renderRecordItem passed the *filtered*
     loop index while openGallery indexed the *unfiltered* array, so selecting a
     photo-less honour opened a different honour's photographs. */
  function galleryFor(kind, entryIndex) {
    var empty = { title: '', meta: '', images: [] };
    var get = GALLERY_LISTS[kind];
    if (!get) return empty;
    var list = get();
    var entry = list && list[entryIndex];
    if (!entry) return empty;
    return {
      title: entry.description || entry.text || '',
      meta: entry.year || entry.date || '',
      images: (Array.isArray(entry.images) ? entry.images : []).filter(Boolean)
    };
  }
  globalThis.Site.galleryFor = galleryFor;
})();