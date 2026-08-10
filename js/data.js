/* ==========================================================================
   Portfolio Data — Single Source of Truth
   Add new projects, honors, leadership, or news by appending to the arrays.
   ========================================================================== */

const PORTFOLIO = {

  /* ── Personal / Meta ───────────────────────────────────────────── */
  name: "Andrew Alangcao",
  title: "Data Engineer | Computational Cognition Researcher",
  bio: [
    "I like art. I build things.",
    "I live in the Philippines, where everyday life constantly gives me problems worth solving. I work on software and data infrastructure, study computational cognition, and explore how machines can better understand the world around us.",
    "This site is where I keep track of what I've been up to — things I've built, things I've learned, and the questions I'm exploring next.",
    "I want to build things that make everyday life a little better, in the Philippines and beyond."
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
    { label: "Projects",   id: "Projects" },
    { label: "News",       id: "News" },
    { label: "Records",    id: "Records" }
  ],

  /* ── News ──────────────────────────────────────────────────────── */
  news: [
    { date: "May 2026",   text: "Started a Data Engineering Role at Airalabs – Quezon City" },
    { date: "April 2026", text: "Graduated High School with High Honors – San Beda Alabang, Muntinlupa City" },
    { date: "April 2026", text: "Gave a Speech of Inspiration at the Heroes Tribute Celebration – San Beda Alabang, Muntinlupa City" },
    { date: "March 2026", text: "Invited as a Guest Speaker at the STEAM Ed Conference of First Eduspec Inc. – San Beda Alabang, Muntinlupa City" }
  ],

  /* ── Projects ──────────────────────────────────────────────────── */
  projects: [
    {
      id: "project1",
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
      }
    },
    {
      id: "project2",
      title: "Hivemind",
      tagline: "AI-Native Organizational Memory",
      category: "Software",
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
      }
    },
    {
      id: "project4",
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
      }
    },
    {
      id: "project5",
      title: "SATLearn",
      tagline: "AI-Powered SAT Practice with Personalized Analytics",
      category: "Software",
      authors: "<strong>Andrew Alangcao</strong>",
      venue: "July 2026 - Current",
      source: "open",
      video: "files/SATLearn_Preview.mp4",
      links: [],
      overview: {
        image: "files/SATLearn_Overview.png",
        text: "SATLearn started because I was studying for the SAT and ran into a pretty specific problem. Bluebook had realistic full-length practice tests, but there were only a limited number of them. There was also a much larger question bank, but it didn't really give me the same experience as taking an actual timed test. I wanted more practice tests without having to reuse the same ones over and over.\n\nSo I built one.\n\nI took over 3,000 SAT questions and used OCR to turn them into a structured question bank, then built an open-source platform that could generate full-length practice tests from them. But I didn't just want more questions. I wanted to know *how I was actually improving* — what concepts I kept getting wrong, what kinds of mistakes I was making, and what I should study next.\n\nSo I added AI to analyze my practice results and give me specific insights into where I was struggling and how I could improve.\n\nI originally built SATLearn just so I could study for my own SAT. But it became another example of something I've found myself doing repeatedly: when the tool I need doesn't quite exist, I usually end up building it myself."
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
      title: "BiyaHey!",
      tagline: "Community-Powered Commute Map for Metro Manila",
      category: "Software",
      authors: "<strong>Andrew Alangcao*</strong>, Alain*, Kisen*, JJ*, Derk*, Matthew*, Hans*, Darryl*",
      venue: "March 2026 - April 2026",
      source: "closed",
      video: "files/BiyaHey!.mp4",
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
      }
    }
  ],

  /* ── Leadership ─────────────────────────────────────────────────── */
  leadership: [
    { description: "AGHAM Research Club – Founder",                           year: "June 2025 - April 2026" },
    { description: "High School Student Council – STEM-Engineering Level Representative",  year: "July 2023 - May 2025" },
    { description: "Personnel's Week 2024 & 2025 – Event Head ", year: "August 2023 - October 2025" },
    { description: "Media and Coverages Committee – Head",                   year: "July 2023 - May 2025" }
  ],

  /* ── Honors ─────────────────────────────────────────────────────── */
  honors: [
    { description: "Annual Commencement Exercises – High Honors",                                         year: "April 2026" },
    { description: "Annual Commencement Exercises – Best in Work Immersion",                              year: "April 2026" },
    { description: "Developer Camp Manila – Finalist",                                                    year: "March 2026" },
    { description: "11th Philippine Robothon – Innovative Open Category, Overall Champion",               year: "February 2026" },
    { description: "2025 Muntinlupa Robotics Fair – Champion",                                            year: "December 2025" },
    { description: "2025 International Robothon – Innovative Open Category, 1st Runner Up",               year: "November 2025" },
    { description: "4th CERN-Solvay Student Camp – Shortlisted (Top 7% of 2500 Applicants)",              year: "July 2025" },
    { description: "5th DLSU-D Research Conference – Best Paper Presentation",                            year: "May 2025" },
    { description: "21st National Youth Congress – Delegate",                                             year: "March 2025" },
    { description: "10th Philippine Robothon – Innovative Open Category, Overall Champion",               year: "March 2025" },
    { description: "2024 International Robothon – Innovative Open Category, Champion",                    year: "November 2024" },
    { description: "20th National Youth Congress – Delegate",                                             year: "November 2023" },
    { description: "9th Philippine Robothon – Innovative Open Category, 3rd People's Choice Award",       year: "February 2023" }
  ]
};