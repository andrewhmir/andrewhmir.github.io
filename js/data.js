/* ==========================================================================
   Portfolio Data — Single Source of Truth
   Add new projects, honors, leadership, or news by appending to the arrays.
   ========================================================================== */

const PORTFOLIO = {

  /* ── Personal / Meta ───────────────────────────────────────────── */
  name: "Andrew Alangcao",
  title: "Data Engineer | Computational Cognition Researcher",
  bio: [
    "I garden. I build things that try to understand the world a little better. I live in the Philippines, where I work on data infrastructure, study computational cognition, and compete in robot competitions when I get the chance.",
    "This site is where I keep track of what I've been up to — projects I've built, things I've learned, and what I'm working on next.",
    "I'm always happy to hear from people who care about building things that matter. Say hello."
  ],
  email: "andrew.alangcao@gmail.com",
  profileImage: "files/profile.jpg",
  favicon: "",
  scrollerIcon: "",
  social: [
    { label: "Resume",    icon: "fas fa-file-alt",   url: "https://drive.google.com/file/d/1lb3D1vB__Xfi5UD1Z22mGeGJtVetw_1M/view?usp=sharing" },
    { label: "GitHub",    icon: "fab fa-github",     url: "https://github.com/andrewhmir" },
    { label: "LinkedIn",  icon: "fab fa-linkedin",   url: "https://www.linkedin.com/in/andrew-alangcao/" },
    { label: "Email",     icon: "fas fa-envelope",   copy: "andrew.alangcao@gmail.com" }
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
      authors: "<strong>Andrew Alangcao*</strong>, Irah Casil*, Dane Marianne Justiano*, Ben Singanon*, Kevin Paez, and Tyrone Sorra",
      venue: "August 2025 - April 2026",
      report: { image: "", text: "" },
      video: "files/Palad_Preview.mp4",
      links: [
        { label: "Video", icon: "fas fa-play", url: "https://www.youtube.com/watch?v=vY84w2aF754" }
      ],
      overview: {
        image: "files/Palad_Overview.jpg",
        text: "Project PALAD is a contactless biometric point-of-sale terminal that enables cardless digital payments using a user's palm. It combines palm-print and palm-vein recognition through RGB and near-infrared imaging with an on-device deep learning model running on a Raspberry Pi 5 for fast, privacy-preserving authentication. Designed for retail, transit, and rural banking in the Philippines, the system processes transactions in about 3 seconds while supporting high-throughput, secure payment verification."
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
      title: "BiyaHey!",
      authors: "<strong>Andrew Alangcao*</strong>, Alain*, Kisen*, JJ*, Derk*, Matthew*, Hans*, Darryl*",
      venue: "March 2026 - April 2026",
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
    },
    {
      id: "project3",
      title: "Inventi RAG Chatbot",
      authors: "<strong>Andrew Alangcao*</strong>, James Balolong*, and Romeo Esguerra",
      venue: "August 2025 - September 2025",
      video: "files/PlaceHolder.png",
      links: [
        { label: "Repository", icon: "fas fa-external-link-alt", url: "https://github.com/Jamsekun/Inventi_Asia_Hackathon/tree/develop" }
      ],
      overview: {
        image: "files/PlaceHolder.png",
        text: "Inventi RAG Chatbot is an AI-powered assistant designed for residents of the Inventi condominium, providing fast and accurate answers to tenant inquiries. Using a Retrieval-Augmented Generation (RAG) system, the chatbot retrieves relevant information from condominium documents — such as building policies, amenities guidelines, maintenance procedures, and announcements — to deliver reliable, context-based responses. This enables tenants to quickly access important information without needing to contact administration directly, improving communication and overall resident experience."
      },
      team: {
        image: "files/InventiRAG_Team.jpg",
        text: [
          "The team in a Google Meeting brainstorming for the Inventi Hackathon.",
          "From left to right: Sir James Balolong, Romeo Esguerra, and Andrew Alangcao."
        ]
      }
    },
    {
      id: "project4",
      title: "C.E.N.T.H.R.O.",
      authors: "<strong>Andrew Alangcao*</strong>, Audrey Tigson*, Elisha Cacnio*, Romeo Esguerra*, and Bryan Maglaya",
      venue: "October 2024 - May 2025",
      video: "files/CENTHRO_Preview.mp4",
      links: [
        { label: "Video", icon: "fas fa-play", url: "https://www.youtube.com/watch?v=jknjW6C9JpY" }
      ],
      overview: {
        image: "files/CENTHRO_Overview.jpg",
        text: "CENTHRO is a biometric-based centralized information system designed to improve data accessibility and operational efficiency in Metro Manila's public transportation and healthcare sectors. Using a NodeMCU, fingerprint authentication, and a cloud-based database, the system enables cashless train fare transactions while allowing hospitals to instantly retrieve patient medical records during emergencies. By integrating transit and medical data into a single platform with a user-friendly web interface, CENTHRO reduces processing time, minimizes human error, and improves service delivery for commuters, healthcare providers, and institutions."
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
      id: "project5",
      title: "Focus Buddy",
      authors: "<strong>Andrew Alangcao*</strong>, Audrey Tigson*, Elisha Cacnio*, Miguel Jambalos*, and Pio Almera",
      venue: "December 2023 - February 2024",
      video: "files/FocusBuddy_Preview.mp4",
      links: [
        { label: "Video", icon: "fas fa-play", url: "https://www.youtube.com/watch?v=SedhOQ-z65Y&t" },
        { label: "GMA News Feature", icon: "fas fa-play", url: "https://youtu.be/2ulcDQ-Hoko?t=44" }
      ],
      overview: {
        image: "files/FocusBuddy_Overview.jpg",
        text: "Focus Buddy is an assistive robotic system built using LEGO EV3, an Arduino Uno, and an LCD display to support students with ADHD in maintaining focus and completing tasks through structured routines and interactive feedback. The robot moves around the workspace, provides verbal reminders to stay on task, and displays visual progress indicators and motivational messages on the LCD, combining movement, audio prompts, and positive reinforcement to encourage sustained attention, organization, and productive study habits in educational settings."
      },
      team: {
        image: "files/FocusBuddy_Team.jpg",
        text: [
          "The team at the 9th Philippine Robothon in St. Paul College Pasig.",
          "From left to right: Pio Almera, Andrew Alangcao, Miguel Jambalos, Elisha Cacnio, and Audrey Tigson."
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