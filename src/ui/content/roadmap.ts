/**
 * "How do I actually build one?"
 *
 * The honest path from knowing nothing to a satellite in orbit. Timescales are
 * real, not encouraging: university CubeSats typically take two to four years,
 * and pretending otherwise sets people up to quit.
 */

export interface Stage {
  id: string;
  n: number;
  title: string;
  /** Short label for the roadmap spine. */
  short: string;
  time: string;
  cost: string;
  /** Can a single student do this alone? */
  alone: boolean;
  what: string;
  doNow: string[];
  goesWrong: string;
  milestone: string;
}

export const STAGES: Stage[] = [
  {
    id: 'learn',
    n: 1,
    short: 'Learn the basics',
    title: 'Understand what a satellite has to do',
    time: 'A few weekends',
    cost: 'Free',
    alone: true,
    what:
      'Before anything else, understand the job: stay powered, point the right way, and get data home. You do not need maths yet. You need to know why those three things fight each other — because almost every real failure comes from that fight, not from a broken part.',
    doNow: [
      'Read the earlier chapters on this site — that is what they are for',
      'Read NASA’s CubeSat 101, which is free and the best starting guide there is',
      'Watch the KiboCUBE Academy lectures from the UN and JAXA',
    ],
    goesWrong:
      'People skip straight to buying parts. You end up with a box of components that do not work together, which is exactly how most first missions fail.',
    milestone: 'You can explain to a friend why a satellite might work perfectly and still be useless.',
  },
  {
    id: 'design',
    n: 2,
    short: 'Design it on screen',
    title: 'Make the mistakes where they are free',
    time: 'Days to weeks',
    cost: 'Free',
    alone: true,
    what:
      'Design a satellite and find out whether it would survive — before anyone spends money. Try a camera and watch the data pile up faster than you can send it. Run the instrument too often and watch the battery die. Fix it. Break it again a different way.',
    doNow: [
      'Open the Design section here and build something',
      'Deliberately break it: push the instrument slider until something fails',
      'Load the three worked examples and work out why each was built that way',
    ],
    goesWrong:
      'Teams fall in love with an instrument before checking whether their satellite can power it or send its data home. By the time they find out, the design is hard to change.',
    milestone: 'You have a design where weight, power and data all work at once — and you can say why.',
  },
  {
    id: 'cansat',
    n: 3,
    short: 'Build a CanSat',
    title: 'Build something real that you get back',
    time: '2–3 months',
    cost: 'Roughly £100–£500 / ₹10,000–₹50,000',
    alone: false,
    what:
      'A CanSat is a satellite the size of a drinks can, carried up by a small rocket or a balloon and parachuted back down. It has sensors, a radio, a battery and a computer — all the same problems as a real satellite, except you get it back afterwards and can see what went wrong.',
    doNow: [
      'Form a small team, even just three or four people',
      'Enter a CanSat competition if your country runs one',
      'Make it transmit live to a laptop on the ground — that is the hard part and the valuable part',
    ],
    goesWrong:
      'The radio. It almost always works on the bench and fails in the field. Finding that out at 300 metres is far better than finding out at 500 kilometres.',
    milestone: 'You have launched something, recovered it, and read its data.',
  },
  {
    id: 'team',
    n: 4,
    short: 'Build a team',
    title: 'Find the people, because nobody does this alone',
    time: 'Ongoing',
    cost: 'Free, but needs a home',
    alone: false,
    what:
      'A real CubeSat needs people on structure, power, software, radio, the ground station, and someone keeping the whole thing moving. You also need a university department or lab willing to back you, because launch programmes almost always require an institution behind the application.',
    doNow: [
      'Find or start a satellite club at your institution',
      'Find a staff member who will sponsor the project formally',
      'Write down who owns what, and how work gets handed over when people graduate',
    ],
    goesWrong:
      'Students graduate in three years and the satellite takes four. Teams lose everything the previous year learned. Projects die of handover, not of engineering.',
    milestone: 'There is a team with named roles, a backer, and a written handover plan.',
  },
  {
    id: 'practise',
    n: 5,
    short: 'Practise on real satellites',
    title: 'Talk to satellites that are already up there',
    time: 'Any weekend',
    cost: 'Roughly £30–£200 / ₹3,000–₹20,000',
    alone: true,
    what:
      'There are CubeSats overhead right now, transmitting. With a cheap radio receiver and some wire you can hear them. This teaches you the ground-station half of the job — which university post-mortems repeatedly name as one of the two most underestimated parts of a mission.',
    doNow: [
      'Buy a low-cost software radio receiver and build a simple aerial',
      'Use SatNOGS, a worldwide network of open ground stations with millions of public recordings',
      'Build an AMSAT CubeSatSim — a working satellite simulator from open-source plans',
    ],
    goesWrong:
      'Teams leave the ground station until last, then discover on launch day that they cannot hear their own satellite. It is in orbit, it is working, and they will never know.',
    milestone: 'You have decoded a signal from a real satellite yourself.',
  },
  {
    id: 'build',
    n: 6,
    short: 'Build and test it',
    title: 'Build the real thing, then try to break it',
    time: '1–2 years',
    cost: 'Roughly £15,000–£150,000 / ₹15 lakh–₹1.5 crore',
    alone: false,
    what:
      'Build the flight hardware, then put it through the tests that prove it will survive: shaking it as hard as the rocket will, and running it in a vacuum chamber through the hot and cold cycles of orbit. Testing is not a formality — it is where you find the problems while you can still fix them.',
    doNow: [
      'Build a "FlatSat" first — all the parts wired together on a bench, working as one system',
      'Follow the CubeSat Design Specification exactly; breaking it means you do not fly',
      'Book vibration and thermal-vacuum testing early, because facilities get booked up',
    ],
    goesWrong:
      'Parts that each worked alone fail when connected. About half of all documented CubeSat failures come from exactly this, and a FlatSat is how you catch it.',
    milestone: 'Your satellite has survived shaking and vacuum testing, and still works.',
  },
  {
    id: 'launch',
    n: 7,
    short: 'Get a launch',
    title: 'Apply to a programme that will fly it',
    time: '1–3 years, overlapping the build',
    cost: 'Often free for students, via a programme',
    alone: false,
    what:
      'You do not buy a rocket. Programmes exist specifically to fly student satellites, providing mentoring, testing support and a launch slot. They will hold your design to professional standards — which is the point, not an obstacle.',
    doNow: [
      'Europe: ESA’s Fly Your Satellite!',
      'United States: NASA’s CubeSat Launch Initiative',
      'India: IN-SPACe student programmes, which have already flown student satellites',
      'Worldwide: the UN and JAXA KiboCUBE programme, which deploys from the Space Station',
    ],
    goesWrong:
      'Teams apply too late, or apply with a design that has not been checked against the rules. Read the requirements before you finish designing, not after.',
    milestone: 'You have a launch slot and a date.',
  },
  {
    id: 'operate',
    n: 8,
    short: 'Fly it',
    title: 'Launch, and then the real work starts',
    time: 'Months to years',
    cost: 'Mostly people’s time',
    alone: false,
    what:
      'It is released, it tumbles, and you wait. The first signal is the moment everything is decided. Then you operate it: scheduling what it does, catching every pass, working out what is wrong from nothing but the numbers it sends back, and keeping the team going long after the excitement fades.',
    doNow: [
      'Rehearse the first 48 hours before launch, including what to do if you hear nothing',
      'Have a written plan for the satellite tumbling, the battery being flat, and the radio being silent',
      'Publish what happens, including the failures — it is how everyone else learns',
    ],
    goesWrong:
      'About a third of student CubeSats are never heard from at all. Of those that are, many are lost later to a flat battery or a problem nobody planned a response for.',
    milestone: 'You have heard your own satellite from space.',
  },
];

export const ROADMAP_INTRO = {
  lead: 'There is a path, and it is well worn.',
  body:
    'Almost nobody goes from curiosity to orbit in one jump. Teams that succeed tend to follow roughly this order, and the ones that struggle usually skipped a step — most often the cheap early ones. The whole journey typically takes a university team two to four years.',
  honest:
    'Steps 1, 2 and 5 you can start this week, alone, for almost nothing. Everything after that needs a team and real money. That is not meant to discourage you — it is meant to show you how much you can genuinely do before you need either.',
};
