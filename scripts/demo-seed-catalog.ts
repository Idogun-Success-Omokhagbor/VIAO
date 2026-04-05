export type DemoRole = "USER" | "ORGANIZER" | "ADMIN"

export type DemoUser = {
  name: string
  email: string
  role: DemoRole
  password: string
  location: string
  interests: string[]
  bio: string
  phone?: string
  avatarUrl?: string | null
}

export type DemoEvent = {
  title: string
  description: string
  category: string
  city: string
  venue: string
  address: string
  location: string
  price: number
  startsAt: string
  endsAt: string
  imageUrl: string
  imageUrls: string[]
  organizerEmail: string
  maxAttendees: number
  boostLevel: number
  isBoosted: boolean
}

export type DemoComment = {
  authorEmail: string
  content: string
}

export type DemoCommunityPost = {
  title: string
  content: string
  category: string
  type: "GENERAL" | "EVENT" | "ALERT"
  location?: string
  imageUrl?: string | null
  mediaType?: string | null
  tags: string[]
  authorEmail: string
  comments: DemoComment[]
}

export type DemoMessage = {
  senderEmail: string
  content: string
  createdAt: string
}

export type DemoConversation = {
  requesterEmail: string
  participantEmail: string
  status: "PENDING" | "ACCEPTED" | "DECLINED"
  messages: DemoMessage[]
}

const _localEventImages = [
  "/tech-startup-meetup-networking.png",
  "/art-gallery-opening.png",
  "/forest-trail-hike-group.png",
  "/indie-concert-colorful-lights.png",
  "/rooftop-sunset-party.png",
  "/placeholder-6s27p.png",
] as const

const organizerPool = [
  {
    name: "Lina Sutter",
    email: "lina.sutter@viao.ch",
    city: "Zurich",
  },
  {
    name: "Noah Keller",
    email: "noah.keller@viao.ch",
    city: "Basel",
  },
  {
    name: "Mila Fontana",
    email: "mila.fontana@viao.ch",
    city: "Geneva",
  },
  {
    name: "Jonas Meier",
    email: "jonas.meier@viao.ch",
    city: "Bern",
  },
  {
    name: "Sara Schmid",
    email: "sara.schmid@viao.ch",
    city: "Lausanne",
  },
  {
    name: "Lea Huber",
    email: "lea.huber@viao.ch",
    city: "Lucerne",
  },
  {
    name: "Elias Baumann",
    email: "elias.baumann@viao.ch",
    city: "St. Gallen",
  },
  {
    name: "Amira Benali",
    email: "amira.benali@viao.ch",
    city: "Winterthur",
  },
] as const

const attendeePool = [
  { name: "Ariana Lopez", city: "Zurich" },
  { name: "Julian Rossi", city: "Geneva" },
  { name: "Nina Vogel", city: "Bern" },
  { name: "Tobias Frei", city: "Basel" },
  { name: "Camille Dubois", city: "Lausanne" },
  { name: "Eren Demir", city: "Zurich" },
  { name: "Mara Graf", city: "Lucerne" },
  { name: "Felix Baum", city: "Winterthur" },
  { name: "Sofia Moretti", city: "St. Gallen" },
  { name: "Theo Schuster", city: "Biel" },
  { name: "Isla Meier", city: "Zurich" },
  { name: "Omar Haddad", city: "Geneva" },
  { name: "Elena Fischer", city: "Bern" },
  { name: "Mick Aebi", city: "Basel" },
  { name: "Livia Nussbaumer", city: "Lausanne" },
  { name: "Dario Conti", city: "Lugano" },
  { name: "Paula Herzog", city: "Zurich" },
  { name: "Gian Rossi", city: "Fribourg" },
  { name: "Mina Keller", city: "Thun" },
  { name: "Sami Rahman", city: "Zurich" },
  { name: "Alina Scherrer", city: "Chur" },
  { name: "Leo Widmer", city: "Zug" },
  { name: "Farah Ali", city: "Geneva" },
  { name: "Noemi Tanner", city: "Basel" },
  { name: "Benja Frei", city: "Neuchatel" },
  { name: "Clara Odermatt", city: "Zurich" },
  { name: "Yannick Stettler", city: "Winterthur" },
  { name: "Naima Haddad", city: "Lausanne" },
  { name: "Mika Schuler", city: "Bern" },
  { name: "Talia Meyer", city: "Lucerne" },
  { name: "Dimitri Petrov", city: "Zurich" },
  { name: "Anais Blanc", city: "Geneva" },
  { name: "Janis Frei", city: "Baar" },
  { name: "Soraya Keller", city: "St. Gallen" },
  { name: "Ronin Mehta", city: "Winterthur" },
  { name: "Pia Marty", city: "Aarau" },
  { name: "Ena Bianchi", city: "Lugano" },
  { name: "Lucas Huber", city: "Fribourg" },
  { name: "Mina Egli", city: "Zurich" },
  { name: "Tanja Imhof", city: "Basel" },
  { name: "Rami Haddad", city: "Bern" },
  { name: "Jana Frei", city: "Lucerne" },
] as const

export const demoUsers: DemoUser[] = [
  ...organizerPool.map((person, index) => ({
    name: person.name,
    email: person.email,
    role: (index === 0 ? "ADMIN" : "ORGANIZER") as DemoRole,
    password: "DemoUser123!",
    location: `${person.city}, Switzerland`,
    interests: index % 2 === 0 ? ["Technology", "Business", "Education"] : ["Arts & Culture", "Music", "Food & Drink"],
    bio:
      index % 2 === 0
        ? "Local organizer focused on practical meetups, useful talks, and easy-to-join community events."
        : "Curates welcoming city events with a strong local feel and a polished guest experience.",
    phone: "+41 44 123 45 67",
    avatarUrl: "/placeholder-user.jpg",
  })),
  ...attendeePool.map((person, index) => {
    const interestsByTier = [
      ["Technology", "Business", "Education"],
      ["Arts & Culture", "Music", "Food & Drink"],
      ["Sports & Outdoors", "Health & Wellness", "Travel"],
      ["Community", "Networking", "Startups"],
    ]

    const interests = interestsByTier[index % interestsByTier.length]

    return {
      name: person.name,
      email: `${person.name.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@example.com`,
      role: "USER",
      password: "DemoUser123!",
      location: `${person.city}, Switzerland`,
      interests,
      bio:
        index % 3 === 0
          ? "Likes clean event details, small groups, and good coffee before networking."
          : index % 3 === 1
            ? "Usually looking for arts, music, and a good reason to go out after work."
            : "Wants quick answers: what it is, where it is, and whether it is worth the trip.",
      phone: index % 4 === 0 ? "+41 79 555 01 23" : undefined,
      avatarUrl: "/placeholder-user.jpg",
    } satisfies DemoUser
  }),
]

const eventTemplates: Array<Omit<DemoEvent, "organizerEmail" | "imageUrl" | "imageUrls" | "boostLevel" | "isBoosted"> & {
  organizerEmail: string
  image: (typeof _localEventImages)[number]
  boostLevel: number
  isBoosted: boolean
}> = [
  {
    title: "Zurich Founders Breakfast",
    description: "An early networking breakfast for startup founders, product leads, and operators sharing what is working now.",
    category: "Business",
    city: "Zurich",
    venue: "Impact Hub Zurich",
    address: "Sihlquai 131, 8005 Zurich",
    location: "Sihlquai 131, 8005 Zurich, Zurich",
    price: 18,
    startsAt: "2026-05-14T07:30:00+02:00",
    endsAt: "2026-05-14T09:00:00+02:00",
    image: "/tech-startup-meetup-networking.png",
    organizerEmail: "lina.sutter@viao.ch",
    maxAttendees: 80,
    boostLevel: 2,
    isBoosted: true,
  },
  {
    title: "Basel Design Night at the Riverside",
    description: "A relaxed evening for designers, illustrators, and creative teams to meet, share work, and discuss city culture.",
    category: "Arts & Culture",
    city: "Basel",
    venue: "Kulturraum Basel",
    address: "Rheingasse 12, 4058 Basel",
    location: "Rheingasse 12, 4058 Basel, Basel",
    price: 12,
    startsAt: "2026-05-16T18:30:00+02:00",
    endsAt: "2026-05-16T21:00:00+02:00",
    image: "/art-gallery-opening.png",
    organizerEmail: "noah.keller@viao.ch",
    maxAttendees: 120,
    boostLevel: 1,
    isBoosted: true,
  },
  {
    title: "Lake Zurich Sunrise Hike",
    description: "A small-group morning hike with lake views, coffee at the finish, and a friendly pace for mixed experience levels.",
    category: "Sports & Outdoors",
    city: "Zurich",
    venue: "Uetliberg Trail Start",
    address: "Uetliberg, 8143 Zurich",
    location: "Uetliberg, 8143 Zurich, Zurich",
    price: 0,
    startsAt: "2026-05-17T06:45:00+02:00",
    endsAt: "2026-05-17T10:00:00+02:00",
    image: "/forest-trail-hike-group.png",
    organizerEmail: "lea.huber@viao.ch",
    maxAttendees: 25,
    boostLevel: 0,
    isBoosted: false,
  },
  {
    title: "Geneva Indie Sound Session",
    description: "An intimate live set featuring three indie acts, with a strong sound system and a crowd that actually listens.",
    category: "Music",
    city: "Geneva",
    venue: "Le Rez",
    address: "Rue de la Coulouvreniere 8, 1204 Geneva",
    location: "Rue de la Coulouvreniere 8, 1204 Geneva, Geneva",
    price: 24,
    startsAt: "2026-05-18T20:00:00+02:00",
    endsAt: "2026-05-18T23:15:00+02:00",
    image: "/indie-concert-colorful-lights.png",
    organizerEmail: "mila.fontana@viao.ch",
    maxAttendees: 140,
    boostLevel: 2,
    isBoosted: true,
  },
  {
    title: "Zurich Rooftop Sundown Mixer",
    description: "A sunset mixer for people who want a lighter social event, good drinks, and a view over the city.",
    category: "Food & Drink",
    city: "Zurich",
    venue: "The Studio Rooftop",
    address: "Hardstrasse 301, 8005 Zurich",
    location: "Hardstrasse 301, 8005 Zurich, Zurich",
    price: 32,
    startsAt: "2026-05-20T18:00:00+02:00",
    endsAt: "2026-05-20T21:30:00+02:00",
    image: "/rooftop-sunset-party.png",
    organizerEmail: "sara.schmid@viao.ch",
    maxAttendees: 100,
    boostLevel: 1,
    isBoosted: true,
  },
  {
    title: "Lausanne Clean Energy Meetup",
    description: "A clear, practical meetup for people working on sustainability, energy efficiency, and civic innovation.",
    category: "Technology",
    city: "Lausanne",
    venue: "EPFL Innovation Park",
    address: "Route Cantonale, 1015 Lausanne",
    location: "Route Cantonale, 1015 Lausanne, Lausanne",
    price: 10,
    startsAt: "2026-05-21T17:45:00+02:00",
    endsAt: "2026-05-21T20:00:00+02:00",
    image: "/tech-startup-meetup-networking.png",
    organizerEmail: "elias.baumann@viao.ch",
    maxAttendees: 90,
    boostLevel: 0,
    isBoosted: false,
  },
  {
    title: "Bern Gallery Walk",
    description: "A guided gallery walk through a few central spaces, with time to discuss the artists and the curation.",
    category: "Arts & Culture",
    city: "Bern",
    venue: "Kunsthalle Bern",
    address: "Helvetiaplatz 1, 3005 Bern",
    location: "Helvetiaplatz 1, 3005 Bern, Bern",
    price: 15,
    startsAt: "2026-05-22T18:15:00+02:00",
    endsAt: "2026-05-22T20:45:00+02:00",
    image: "/art-gallery-opening.png",
    organizerEmail: "jonas.meier@viao.ch",
    maxAttendees: 60,
    boostLevel: 1,
    isBoosted: false,
  },
  {
    title: "Winterthur City Ride Club",
    description: "A friendly cycling meetup for commuters and hobby riders who want a social end to the workday.",
    category: "Sports & Outdoors",
    city: "Winterthur",
    venue: "Lagerplatz Treffpunkt",
    address: "Lagerplatz 12, 8400 Winterthur",
    location: "Lagerplatz 12, 8400 Winterthur, Winterthur",
    price: 0,
    startsAt: "2026-05-23T18:00:00+02:00",
    endsAt: "2026-05-23T20:15:00+02:00",
    image: "/forest-trail-hike-group.png",
    organizerEmail: "amira.benali@viao.ch",
    maxAttendees: 35,
    boostLevel: 0,
    isBoosted: false,
  },
  {
    title: "St. Gallen Product Roundtable",
    description: "A concise discussion on product strategy, user needs, and how local teams ship better experiences.",
    category: "Business",
    city: "St. Gallen",
    venue: "SQUARE at HSG",
    address: "Guisanstrasse 20, 9010 St. Gallen",
    location: "Guisanstrasse 20, 9010 St. Gallen, St. Gallen",
    price: 20,
    startsAt: "2026-05-24T08:00:00+02:00",
    endsAt: "2026-05-24T10:00:00+02:00",
    image: "/tech-startup-meetup-networking.png",
    organizerEmail: "lina.sutter@viao.ch",
    maxAttendees: 50,
    boostLevel: 1,
    isBoosted: false,
  },
  {
    title: "Lucerne Morning Yoga by the Lake",
    description: "A calm start to the day with an instructor-led session outdoors and a short breakfast social after class.",
    category: "Health & Wellness",
    city: "Lucerne",
    venue: "Seebad Lucerne",
    address: "An der Reuss 2, 6003 Lucerne",
    location: "An der Reuss 2, 6003 Lucerne, Lucerne",
    price: 14,
    startsAt: "2026-05-25T07:00:00+02:00",
    endsAt: "2026-05-25T08:30:00+02:00",
    image: "/forest-trail-hike-group.png",
    organizerEmail: "sara.schmid@viao.ch",
    maxAttendees: 30,
    boostLevel: 0,
    isBoosted: false,
  },
  {
    title: "Zurich Open Mic and Coffee Night",
    description: "A low-pressure open mic with poetry, acoustic sets, and a coffee bar for people who prefer an earlier night.",
    category: "Music",
    city: "Zurich",
    venue: "Bogen F",
    address: "Viaduktstrasse 97, 8005 Zurich",
    location: "Viaduktstrasse 97, 8005 Zurich, Zurich",
    price: 8,
    startsAt: "2026-05-26T19:00:00+02:00",
    endsAt: "2026-05-26T22:00:00+02:00",
    image: "/indie-concert-colorful-lights.png",
    organizerEmail: "noah.keller@viao.ch",
    maxAttendees: 110,
    boostLevel: 1,
    isBoosted: true,
  },
  {
    title: "Geneva Startup Lunch Forum",
    description: "Short talks over lunch for founders, developers, and operations teams solving real product problems.",
    category: "Technology",
    city: "Geneva",
    venue: "The Ark Geneva",
    address: "Route de Malagnou 21, 1208 Geneva",
    location: "Route de Malagnou 21, 1208 Geneva, Geneva",
    price: 25,
    startsAt: "2026-05-27T12:00:00+02:00",
    endsAt: "2026-05-27T13:30:00+02:00",
    image: "/tech-startup-meetup-networking.png",
    organizerEmail: "mila.fontana@viao.ch",
    maxAttendees: 65,
    boostLevel: 2,
    isBoosted: true,
  },
  {
    title: "Basel Street Food Social",
    description: "A curated social evening with local bites, casual networking, and a relaxed pace for small groups.",
    category: "Food & Drink",
    city: "Basel",
    venue: "Klybeckquai Pop-Up Yard",
    address: "Klybeckquai 15, 4057 Basel",
    location: "Klybeckquai 15, 4057 Basel, Basel",
    price: 22,
    startsAt: "2026-05-28T18:30:00+02:00",
    endsAt: "2026-05-28T21:00:00+02:00",
    image: "/rooftop-sunset-party.png",
    organizerEmail: "lea.huber@viao.ch",
    maxAttendees: 95,
    boostLevel: 0,
    isBoosted: false,
  },
  {
    title: "Lugano Summer Film Preview",
    description: "An outdoor preview screening with local food stalls and a short introduction from the event curators.",
    category: "Arts & Culture",
    city: "Lugano",
    venue: "LAC Lugano",
    address: "Piazza Bernardino Luini 6, 6900 Lugano",
    location: "Piazza Bernardino Luini 6, 6900 Lugano, Lugano",
    price: 16,
    startsAt: "2026-05-29T20:15:00+02:00",
    endsAt: "2026-05-29T22:45:00+02:00",
    image: "/art-gallery-opening.png",
    organizerEmail: "amira.benali@viao.ch",
    maxAttendees: 70,
    boostLevel: 1,
    isBoosted: false,
  },
  {
    title: "Fribourg Community Builders Meetup",
    description: "A welcoming gathering for organizers, community leads, and anyone trying to build something people return to.",
    category: "Business",
    city: "Fribourg",
    venue: "Blue Factory",
    address: "Passage du Cardinal 13B, 1700 Fribourg",
    location: "Passage du Cardinal 13B, 1700 Fribourg, Fribourg",
    price: 0,
    startsAt: "2026-05-30T18:00:00+02:00",
    endsAt: "2026-05-30T20:00:00+02:00",
    image: "/tech-startup-meetup-networking.png",
    organizerEmail: "jonas.meier@viao.ch",
    maxAttendees: 75,
    boostLevel: 0,
    isBoosted: false,
  },
  {
    title: "Chur Mountain Run Club",
    description: "A social run with a scenic loop, approachable pacing, and a shared post-run coffee stop.",
    category: "Sports & Outdoors",
    city: "Chur",
    venue: "Obere Au",
    address: "Emserstrasse 10, 7000 Chur",
    location: "Emserstrasse 10, 7000 Chur, Chur",
    price: 0,
    startsAt: "2026-05-31T08:30:00+02:00",
    endsAt: "2026-05-31T10:00:00+02:00",
    image: "/forest-trail-hike-group.png",
    organizerEmail: "elias.baumann@viao.ch",
    maxAttendees: 40,
    boostLevel: 0,
    isBoosted: false,
  },
  {
    title: "Bern Digital Learning Evening",
    description: "A session on practical AI workflows, product thinking, and how teams can learn fast without overcomplication.",
    category: "Education",
    city: "Bern",
    venue: "Bern University of Applied Sciences",
    address: "Falkenplatz 24, 3012 Bern",
    location: "Falkenplatz 24, 3012 Bern, Bern",
    price: 10,
    startsAt: "2026-06-01T18:00:00+02:00",
    endsAt: "2026-06-01T20:00:00+02:00",
    image: "/tech-startup-meetup-networking.png",
    organizerEmail: "lina.sutter@viao.ch",
    maxAttendees: 60,
    boostLevel: 1,
    isBoosted: false,
  },
  {
    title: "Lausanne Jazz and Wine Evening",
    description: "A relaxed evening pairing live jazz with a short tasting menu, built for a social after-work crowd.",
    category: "Music",
    city: "Lausanne",
    venue: "D! Club Terrace",
    address: "Place de l'Europe 1a, 1003 Lausanne",
    location: "Place de l'Europe 1a, 1003 Lausanne, Lausanne",
    price: 28,
    startsAt: "2026-06-02T19:30:00+02:00",
    endsAt: "2026-06-02T22:30:00+02:00",
    image: "/indie-concert-colorful-lights.png",
    organizerEmail: "sara.schmid@viao.ch",
    maxAttendees: 90,
    boostLevel: 2,
    isBoosted: true,
  },
  {
    title: "Zurich Brunch and Founder Stories",
    description: "A morning event with breakfast, short founder stories, and room for introductions that do not feel forced.",
    category: "Business",
    city: "Zurich",
    venue: "Babu's Bakery & Coffeehouse",
    address: "Lowenstrasse 1, 8001 Zurich",
    location: "Lowenstrasse 1, 8001 Zurich, Zurich",
    price: 22,
    startsAt: "2026-06-03T09:00:00+02:00",
    endsAt: "2026-06-03T11:15:00+02:00",
    image: "/rooftop-sunset-party.png",
    organizerEmail: "noah.keller@viao.ch",
    maxAttendees: 55,
    boostLevel: 0,
    isBoosted: false,
  },
  {
    title: "Winterthur Museum Late Opening",
    description: "An after-hours museum visit with quieter rooms, guided highlights, and a compact social program.",
    category: "Arts & Culture",
    city: "Winterthur",
    venue: "Kunst Museum Winterthur",
    address: "Museumstrasse 52, 8400 Winterthur",
    location: "Museumstrasse 52, 8400 Winterthur, Winterthur",
    price: 14,
    startsAt: "2026-06-04T18:45:00+02:00",
    endsAt: "2026-06-04T21:00:00+02:00",
    image: "/art-gallery-opening.png",
    organizerEmail: "mila.fontana@viao.ch",
    maxAttendees: 45,
    boostLevel: 0,
    isBoosted: false,
  },
  {
    title: "Zug Wellness and Recovery Workshop",
    description: "A practical workshop about sleep, recovery, and stress management for people with demanding schedules.",
    category: "Health & Wellness",
    city: "Zug",
    venue: "V-Zug Campus Studio",
    address: "Industriestrasse 66, 6300 Zug",
    location: "Industriestrasse 66, 6300 Zug, Zug",
    price: 20,
    startsAt: "2026-06-05T17:30:00+02:00",
    endsAt: "2026-06-05T19:30:00+02:00",
    image: "/forest-trail-hike-group.png",
    organizerEmail: "lea.huber@viao.ch",
    maxAttendees: 35,
    boostLevel: 1,
    isBoosted: false,
  },
  {
    title: "Aarau Tech and Coffee Session",
    description: "A light meetup for developers, founders, and makers who want one useful conversation and a good coffee.",
    category: "Technology",
    city: "Aarau",
    venue: "AHA! Aarau",
    address: "Laurenzentorgasse 11, 5000 Aarau",
    location: "Laurenzentorgasse 11, 5000 Aarau, Aarau",
    price: 6,
    startsAt: "2026-06-06T08:30:00+02:00",
    endsAt: "2026-06-06T10:00:00+02:00",
    image: "/tech-startup-meetup-networking.png",
    organizerEmail: "elias.baumann@viao.ch",
    maxAttendees: 30,
    boostLevel: 0,
    isBoosted: false,
  },
  {
    title: "Biel Creative Portfolio Night",
    description: "A meetup for creators, photographers, and freelancers to show work, meet peers, and exchange contacts.",
    category: "Arts & Culture",
    city: "Biel",
    venue: "CIP Biel",
    address: "Rue de la Gare 46, 2502 Biel",
    location: "Rue de la Gare 46, 2502 Biel, Biel",
    price: 0,
    startsAt: "2026-06-07T18:00:00+02:00",
    endsAt: "2026-06-07T20:30:00+02:00",
    image: "/art-gallery-opening.png",
    organizerEmail: "amira.benali@viao.ch",
    maxAttendees: 50,
    boostLevel: 0,
    isBoosted: false,
  },
  {
    title: "Thun Outdoor Film Picnic",
    description: "A simple summer picnic with a curated film screening, blankets, and a strong local community feel.",
    category: "Food & Drink",
    city: "Thun",
    venue: "Thun Castle Gardens",
    address: "Schlossberg 1, 3600 Thun",
    location: "Schlossberg 1, 3600 Thun, Thun",
    price: 16,
    startsAt: "2026-06-08T20:00:00+02:00",
    endsAt: "2026-06-08T22:30:00+02:00",
    image: "/rooftop-sunset-party.png",
    organizerEmail: "jonas.meier@viao.ch",
    maxAttendees: 85,
    boostLevel: 1,
    isBoosted: true,
  },
  {
    title: "Neuchatel Lakeside Run and Brunch",
    description: "A run club morning ending with brunch, aimed at people who like a healthy social routine.",
    category: "Sports & Outdoors",
    city: "Neuchatel",
    venue: "Quai Ostervald",
    address: "Quai Ostervald, 2000 Neuchatel",
    location: "Quai Ostervald, 2000 Neuchatel, Neuchatel",
    price: 12,
    startsAt: "2026-06-09T08:00:00+02:00",
    endsAt: "2026-06-09T10:30:00+02:00",
    image: "/forest-trail-hike-group.png",
    organizerEmail: "sara.schmid@viao.ch",
    maxAttendees: 28,
    boostLevel: 0,
    isBoosted: false,
  },
  {
    title: "Lugano Cross-Industry Networking Night",
    description: "A polished evening for entrepreneurs, creatives, and operators to meet in a low-pressure setting.",
    category: "Business",
    city: "Lugano",
    venue: "The View Lugano",
    address: "Via Guidino 29, 6900 Lugano",
    location: "Via Guidino 29, 6900 Lugano, Lugano",
    price: 34,
    startsAt: "2026-06-10T18:30:00+02:00",
    endsAt: "2026-06-10T21:30:00+02:00",
    image: "/rooftop-sunset-party.png",
    organizerEmail: "noah.keller@viao.ch",
    maxAttendees: 70,
    boostLevel: 2,
    isBoosted: true,
  },
]

export const demoEvents: DemoEvent[] = eventTemplates.map((event) => ({
  title: event.title,
  description: event.description,
  category: event.category,
  city: event.city,
  venue: event.venue,
  address: event.address,
  location: event.location,
  price: event.price,
  startsAt: event.startsAt,
  endsAt: event.endsAt,
  imageUrl: event.image,
  imageUrls: [event.image],
  organizerEmail: event.organizerEmail,
  maxAttendees: event.maxAttendees,
  boostLevel: event.boostLevel,
  isBoosted: event.isBoosted,
}))

export const demoCommunityPosts: DemoCommunityPost[] = [
  {
    title: "Best late-summer events in Zurich this week",
    content:
      "A short roundup of the strongest local events in the city. The rooftop mixer, founder breakfast, and indie session all look worth opening.",
    category: "Zurich",
    type: "GENERAL",
    location: "Zurich, Switzerland",
    imageUrl: "/rooftop-sunset-party.png",
    mediaType: "image",
    tags: ["Zurich", "events", "this-week"],
    authorEmail: "paula.herzog@example.com",
    comments: [
      { authorEmail: "leo.widmer@example.com", content: "The founder breakfast looks especially strong." },
      { authorEmail: "soraya.keller@example.com", content: "I like how clean the event details are on Viao." },
    ],
  },
  {
    title: "Basel art scene suggestions",
    content:
      "If you are into galleries and smaller openings, the Basel design night and museum late opening are a good pair.",
    category: "Basel",
    type: "GENERAL",
    location: "Basel, Switzerland",
    imageUrl: "/art-gallery-opening.png",
    mediaType: "image",
    tags: ["Basel", "art", "culture"],
    authorEmail: "camille.dubois@example.com",
    comments: [
      { authorEmail: "mika.schuler@example.com", content: "This is exactly the kind of summary I need." },
    ],
  },
  {
    title: "Lake hikes and run clubs",
    content:
      "The outdoor events are easy to scan and feel genuinely local. The hike and run club events are the ones I would save first.",
    category: "Sports & Outdoors",
    type: "GENERAL",
    location: "Zurich, Switzerland",
    imageUrl: "/forest-trail-hike-group.png",
    mediaType: "image",
    tags: ["outdoors", "fitness", "community"],
    authorEmail: "tobias.frei@example.com",
    comments: [
      { authorEmail: "mara.graf@example.com", content: "A good mix of active and social." },
      { authorEmail: "jana.frei@example.com", content: "Love that it shows the basics first." },
    ],
  },
]

export const demoConversations: DemoConversation[] = [
  {
    requesterEmail: "lina.sutter@viao.ch",
    participantEmail: "paula.herzog@example.com",
    status: "ACCEPTED",
    messages: [
      {
        senderEmail: "lina.sutter@viao.ch",
        content: "Hi Paula, thanks for joining the founders breakfast. Happy to answer any questions before the event.",
        createdAt: "2026-05-10T09:00:00+02:00",
      },
      {
        senderEmail: "paula.herzog@example.com",
        content: "Thanks Lina, the details look great. I will be there.",
        createdAt: "2026-05-10T09:08:00+02:00",
      },
    ],
  },
  {
    requesterEmail: "mila.fontana@viao.ch",
    participantEmail: "leo.widmer@example.com",
    status: "PENDING",
    messages: [
      {
        senderEmail: "leo.widmer@example.com",
        content: "Would love to learn more about the Geneva indie session. Is there a guest list limit?",
        createdAt: "2026-05-11T17:30:00+02:00",
      },
    ],
  },
]

export function buildDemoUsers() {
  return demoUsers.map((user, index) => ({
    ...user,
    slug: user.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `user-${index + 1}`,
  }))
}

export function buildDemoEvents() {
  return demoEvents.map((event, index) => ({
    ...event,
    slug: event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `event-${index + 1}`,
  }))
}
