/**
 * The on-ramp: everything a complete beginner needs before the simulator makes
 * any sense at all.
 *
 * Writing rule for this file, same as the glossary: if someone who has never
 * heard of a CubeSat cannot follow it, it is not finished. Numbers here come
 * from the research in /docs and are cited where it matters.
 */

export interface Subsystem {
  id: string;
  name: string;
  /** What it is, in one line a beginner gets immediately. */
  oneLiner: string;
  /** The everyday comparison. */
  likeA: string;
  what: string;
  /** What actually happens when it fails. */
  ifItFails: string;
  /** Real-world share of documented CubeSat failures, where known. */
  failureShare?: string;
}

export const SUBSYSTEMS: Subsystem[] = [
  {
    id: 'structure',
    name: 'The frame',
    oneLiner: 'The aluminium skeleton everything else bolts onto.',
    likeA: 'the chassis of a car',
    what:
      'A CubeSat is built from 10 cm aluminium cubes. The frame holds every other part in place and takes the violent shaking of the rocket launch. It also has rails along its edges that slide inside the launcher, which is the whole reason CubeSats are cheap: the launcher does not need to be redesigned for each one.',
    ifItFails:
      'Almost never does. Of 112 tracked CubeSat missions, only 2 failed because of the launch forces. The frame is the part students worry about most and the part that goes wrong least.',
  },
  {
    id: 'eps',
    name: 'Power system',
    oneLiner: 'Solar panels, a battery, and the board that shares electricity out.',
    likeA: 'the electrical system of a house, with its own solar roof',
    what:
      'Solar panels make electricity, but only in sunlight. A satellite in low orbit passes into Earth’s shadow for about 35 minutes of every 95-minute lap, and during that time the battery runs everything alone. The power board decides who gets electricity and protects the battery from being drained flat or charged while frozen.',
    ifItFails:
      'The satellite goes quiet and usually stays quiet. If the battery is ever fully drained, many CubeSats cannot restart even once sunlight returns.',
    failureShare: '14% of documented failures',
  },
  {
    id: 'obc',
    name: 'Onboard computer',
    oneLiner: 'The small computer that runs everything.',
    likeA: 'the brain, or a phone with no screen',
    what:
      'It decides what happens and when: take a picture now, switch the radio on for the next four minutes, go into safe mode because the battery is low. It is usually far less powerful than a phone, because it has to survive radiation and use almost no electricity.',
    ifItFails:
      'The satellite stops responding. Radiation can flip a bit in memory and crash it, so good designs make it reboot itself automatically.',
    failureShare: '6% of documented failures',
  },
  {
    id: 'adcs',
    name: 'Pointing system',
    oneLiner: 'Controls which way the satellite faces.',
    likeA: 'the steering, except there is nothing to push against',
    what:
      'When a launcher releases a CubeSat it tumbles end over end. Something has to stop that spin, then hold the satellite steady so the camera faces Earth and the solar panels face the Sun. In space there is nothing to push against, so satellites use magnets that push against Earth’s own magnetic field, or spinning wheels inside that let the satellite turn by turning them the other way.',
    ifItFails:
      'The satellite keeps tumbling. The panels catch far less sunlight, the antenna sweeps past the ground station instead of pointing at it, and the camera takes pictures of nothing in particular.',
  },
  {
    id: 'comms',
    name: 'Radio',
    oneLiner: 'Sends your data down and receives your commands up.',
    likeA: 'a walkie-talkie with a very long range and a very short window',
    what:
      'This is the only connection you have. The satellite is only in range of your antenna for a few minutes at a time, a handful of times a day. Everything you want to know has to fit through that window. Faster radios send more per minute, but need more power and a bigger antenna on the ground.',
    ifItFails:
      'You have a working satellite in orbit that you cannot talk to. It is the single most common way a mission dies, and you usually never find out why.',
    failureShare: '27% of documented failures — the biggest single cause',
  },
  {
    id: 'payload',
    name: 'The instrument',
    oneLiner: 'The thing your mission is actually for.',
    likeA: 'the reason you built the whole thing',
    what:
      'A camera, a radiation sensor, a radio experiment, a biology sample. Everything else on this list exists to keep the instrument alive, pointed the right way, and able to send its results home. The instrument is usually the first thing a team chooses and the thing that makes every other decision harder.',
    ifItFails:
      'The satellite still works perfectly — it just has nothing to say. Teams often still count this as a success, because a satellite that survives has already proved most of the engineering.',
  },
  {
    id: 'thermal',
    name: 'Keeping it at the right temperature',
    oneLiner: 'Stopping it from cooking in sunlight or freezing in shadow.',
    likeA: 'choosing between a black T-shirt and a white one, but it decides whether your battery survives',
    what:
      'There is no air in space, so heat cannot blow away — it can only radiate out as infrared. A satellite in sunlight can climb past +100 °C, and the same satellite in shadow can drop below −30 °C, every 95 minutes. The main tools are paint and tape: what colour and finish you put on the outside changes how much heat you absorb and release.',
    ifItFails:
      'Lithium batteries are the weak point. Charge one below 0 °C and it is permanently damaged, which is why many CubeSats carry a small battery heater.',
  },
  {
    id: 'ground',
    name: 'The ground station',
    oneLiner: 'The antenna on Earth that talks to your satellite.',
    likeA: 'air traffic control, if the plane only flew past four times a day',
    what:
      'Easy to forget, because it is not part of the satellite — and that is exactly why teams leave it too late. You need an antenna, a radio licence, software to predict when the satellite will appear, and someone awake when it does. Many first missions discover their ground station does not work on the day it matters.',
    ifItFails:
      'Same outcome as a broken radio: a healthy satellite you cannot hear. University post-mortems name this as one of the two most underestimated jobs on the whole project.',
  },
];

// ---------------------------------------------------------------------------
// What is a CubeSat
// ---------------------------------------------------------------------------

export const FACTS = [
  { k: '10 cm', v: 'along each side of one unit — about the size of a Rubik’s cube' },
  { k: '2 kg', v: 'the most one unit is allowed to weigh' },
  { k: '1999', v: 'the year the standard was created, at Stanford and Cal Poly' },
  { k: '~7.6 km/s', v: 'how fast it travels — London to Paris in 45 seconds' },
  { k: '~95 min', v: 'time for one lap around Earth' },
  { k: '2,000+', v: 'CubeSats launched so far, many of them by students' },
];

export interface Step {
  n: number;
  title: string;
  body: string;
  time?: string;
}

export const GETTING_STARTED: Step[] = [
  {
    n: 1,
    title: 'Build something that flies before you build something that orbits',
    time: 'a few weeks',
    body:
      'Almost every successful team started with a CanSat — a soda-can-sized satellite carried up by a small rocket or balloon and parachuted back down. It teaches you sensors, radio, power and teamwork, and because you get the hardware back you can find out what went wrong and try again. An orbiting CubeSat gives you exactly one attempt and no way to repair it.',
  },
  {
    n: 2,
    title: 'Read NASA’s CubeSat 101',
    time: 'a weekend',
    body:
      'NASA publishes a free guide for first-time CubeSat builders, and it is genuinely the single best starting point. It walks through the whole process from idea to launch. Alongside it, the UNOOSA and JAXA KiboCUBE Academy lecture series is the closest thing to a full free course.',
  },
  {
    n: 3,
    title: 'Find or start a team',
    time: 'ongoing',
    body:
      'Nobody builds a CubeSat alone. You need people for structure, power, software, radio and the ground station, plus someone keeping the whole thing on track. Most university CubeSats take two to four years, which is longer than many students are around — so handing work over properly matters as much as the engineering.',
  },
  {
    n: 4,
    title: 'Practise with real satellites that are already up there',
    time: 'any weekend',
    body:
      'You can receive live signals from real CubeSats today with a cheap radio receiver and some wire. SatNOGS is a worldwide network of open-source ground stations with millions of public recordings — you can listen in, or build a station and join it. AMSAT’s CubeSatSim is a working satellite simulator you can build from open-source plans for a few hundred dollars.',
  },
  {
    n: 5,
    title: 'Design on paper, and check the three budgets',
    time: 'months',
    body:
      'Before anyone buys anything, work out whether it can survive: is it light enough, does it make more electricity than it uses, and can it get its data home. This is what the Design section of this site is for. Getting this wrong is the single biggest cause of failure — nearly half of all documented CubeSat failures come from parts that each worked fine but did not work together.',
  },
  {
    n: 6,
    title: 'Apply to a programme that will fly it',
    time: '1–3 years',
    body:
      'You do not buy a rocket. Programmes exist to fly student satellites: ESA’s Fly Your Satellite! for European universities, NASA’s CubeSat Launch Initiative in the US, and national programmes such as IN-SPACe in India. They provide mentoring, testing and a launch slot — and they will hold your design to professional standards, which is the point.',
  },
];

export interface ExampleMission {
  id: string;
  name: string;
  size: string;
  story: string;
  lesson: string;
  /** Design id to load in the Design section. */
  loads: string;
}

export const EXAMPLES: ExampleMission[] = [
  {
    id: 'beacon',
    name: 'A first satellite',
    size: '1U',
    story:
      'The simplest thing worth flying: a single cube that reports its own temperature, battery level and status on a hobby radio band. No camera, no pointing system, nothing to break. Hundreds of student teams have flown something close to this.',
    lesson:
      'It sounds unambitious until you realise that just surviving launch, switching on, and being heard from orbit already defeats a large share of first missions.',
    loads: 'ex-beacon',
  },
  {
    id: 'imager',
    name: 'An Earth-imaging satellite',
    size: '3U',
    story:
      'Three cubes stacked, carrying a camera that photographs Earth. This is the mission most teams want to fly, and it is where the interesting problems start: the camera needs power, needs pointing accurately, and produces far more data than a small radio can send home.',
    lesson:
      'Load this one and look at the Getting data home card. A camera that fills its storage in a day is a camera that stops working on day two.',
    loads: 'ex-imager',
  },
  {
    id: 'science',
    name: 'A science satellite',
    size: '6U',
    story:
      'Six cubes, roughly a shoebox, with fold-out solar wings and a power-hungry experiment. The wings triple the electricity available, which is the only reason the instrument can run at all — but they add weight and a deployment that has to work first time.',
    lesson:
      'Every solution costs something somewhere else. The wings solve power and spend weight; this is what engineers mean by a trade-off.',
    loads: 'ex-science',
  },
];

/** Real failure statistics, from Swartwout's and Langer's mission censuses. */
export const FAILURE_FACTS = {
  firstTimeFailureRate: 'More than 40% of first-time university CubeSats fail early.',
  neverHeard: 'About a third are never heard from at all after release.',
  integration:
    'Nearly half of documented failures come from parts that each worked on their own but did not work together — wiring, interfaces and configuration.',
  secondMission:
    'Success rates climb sharply on a team’s second and third missions. The missing ingredient is practice, not better hardware.',
  source: 'Mission censuses by Michael Swartwout (Saint Louis University) and Martin Langer (TU Munich)',
};
