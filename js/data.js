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
      category: "Software",
      authors: "<strong>Andrew Alangcao*</strong>, Derrick Valdellon*, and Darryl Ty*",
      venue: "June 2026 - Current",
      source: "closed",
      video: "files/PlaceHolder.png",
      links: [],
      overview: {
        image: "files/PlaceHolder.png",
        text: "Description coming soon."
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
      category: "Software",
      authors: "<strong>Andrew Alangcao</strong>",
      venue: "July 2026 - Current",
      source: "open",
      video: "files/PlaceHolder.png",
      links: [],
      overview: {
        image: "files/PlaceHolder.png",
        text: "SATLearn is a full-stack digital SAT practice test simulator that replicates the official College Board Bluebook testing experience entirely in the browser. It features a complete 4-module adaptive exam flow with wall-clock timers, split-pane Reading & Writing interface, grid-in math answers, and accurate scoring via official conversion tables. Built with React 18, TypeScript, and Vite, it runs fully client-side with localStorage persistence — no backend required. An integrated AI mistake diagnosis system powered by DeepSeek provides personalized explanations for every wrong answer, while an analytics dashboard tracks score trends and identifies weak areas for focused study."
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
      category: "Software",
      authors: "<strong>Andrew Alangcao*</strong>, Alain*, Kisen*, JJ*, Derk*, Matthew*, Hans*, Darryl*",
      venue: "March 2026 - April 2026",
      source: "closed",
      video: "files/BiyaHey!.mp4",
      links: [],
      overview: {
        image: "files/BiyaHey_Overview.jpg",
        text: "BiyaHey! is a grassroots community-driven commute map designed to help people navigate the unpublicized knowledge of Metro Manila's complex public transportation networks. Users enter a starting point and destination, allowing the platform to combine real routes shared by commuters with existing datasets and summarize them through an AI engine into clear, step-by-step instructions. By combining human validated local expertise with a RAG pipeline, BiyaHey! reveals practical routes that conventional navigation applications often miss."
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