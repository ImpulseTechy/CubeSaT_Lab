/**
 * "What types of CubeSat are there?"
 *
 * Two ways to answer: by how big it is, and by what job it does. Beginners ask
 * the first and need the second.
 */

export interface SizeType {
  id: string;
  name: string;
  units: number;
  /** Rough outside dimensions, in words. */
  size: string;
  maxMass: string;
  everydayComparison: string;
  typicalUse: string;
  goodFor: string;
  catch: string;
  /** Approximate share of all CubeSats launched. */
  popularity: string;
}

export const SIZE_TYPES: SizeType[] = [
  {
    id: '1u',
    name: '1U',
    units: 1,
    size: '10 × 10 × 11 cm',
    maxMass: 'up to 2 kg',
    everydayComparison: 'a Rubik’s cube',
    typicalUse: 'First satellites, radio beacons, simple experiments.',
    goodFor:
      'Learning. It is the cheapest way to get something real into orbit, and plenty of schools have flown one.',
    catch:
      'There is almost no room inside, and the outside is too small to hold many solar cells — so you get very little electricity, often under 2 watts. That rules out cameras and fast radios.',
    popularity: 'About a fifth of all CubeSats',
  },
  {
    id: '2u',
    name: '2U',
    units: 2,
    size: '10 × 10 × 22 cm',
    maxMass: 'up to 4 kg',
    everydayComparison: 'two Rubik’s cubes stacked',
    typicalUse: 'Slightly bigger experiments that need a little more power.',
    goodFor:
      'When a 1U is just too tight but you do not need a full 3U. Less common, because teams tend to jump straight to 3U.',
    catch: 'An awkward middle size — fewer off-the-shelf parts are built for it.',
    popularity: 'Uncommon',
  },
  {
    id: '3u',
    name: '3U',
    units: 3,
    size: '10 × 10 × 34 cm',
    maxMass: 'up to 6 kg',
    everydayComparison: 'a loaf of bread, or a large shoebox on its end',
    typicalUse: 'Earth photography, science instruments, technology tests.',
    goodFor:
      'By far the most popular size, and the one most students build. Enough surface for useful solar power, enough room for a real instrument, and almost every CubeSat part you can buy is designed to fit one.',
    catch:
      'Still tight on power once you add a camera, and this is the size where the classic trap bites: it can record far more data than a small radio can send home.',
    popularity: 'The most common size by a wide margin',
  },
  {
    id: '6u',
    name: '6U',
    units: 6,
    size: '10 × 23 × 34 cm',
    maxMass: 'up to 12 kg',
    everydayComparison: 'a shoebox',
    typicalUse: 'Serious imaging, radar experiments, commercial fleets.',
    goodFor:
      'Room for fold-out solar wings, which can triple your electricity. This is where properly ambitious missions become possible.',
    catch:
      'Much more expensive to build and launch, and far more to go wrong. The fold-out wings have to deploy correctly first time, with nobody there to help.',
    popularity: 'Growing fast, especially commercially',
  },
  {
    id: '12u',
    name: '12U',
    units: 12,
    size: '23 × 23 × 34 cm',
    maxMass: 'up to 24 kg',
    everydayComparison: 'a microwave oven',
    typicalUse: 'Advanced science, deep-space missions, small telescopes.',
    goodFor:
      'Close to a small conventional satellite, while still using the cheap standard launcher. Some have even gone to the Moon and Mars.',
    catch:
      'Realistically beyond a first student project. At this size you are into professional budgets and timescales.',
    popularity: 'Rare, mostly agencies and companies',
  },
];

export interface MissionType {
  id: string;
  name: string;
  oneLiner: string;
  typicalSize: string;
  what: string;
  hardPart: string;
  realExample: string;
  /** Which of our worked examples this maps to, if any. */
  loads?: string;
}

export const MISSION_TYPES: MissionType[] = [
  {
    id: 'beacon',
    name: 'Radio and beacon satellites',
    oneLiner: 'Send a signal that anyone on Earth with a radio can pick up.',
    typicalSize: 'Usually 1U',
    what:
      'The simplest useful mission. The satellite broadcasts its own health — temperature, battery level, a callsign — and sometimes relays messages between amateur radio operators on the ground.',
    hardPart:
      'Honestly, surviving at all. Launch shakes everything violently, space is hot and cold by turns, and you only find out whether it worked when you listen for it.',
    realExample:
      'Dozens of amateur-radio CubeSats are in orbit now, many built by school and university clubs, and you can hear them today with a cheap receiver.',
    loads: 'ex-beacon',
  },
  {
    id: 'eo',
    name: 'Earth-watching satellites',
    oneLiner: 'Take pictures or measurements of the ground below.',
    typicalSize: 'Usually 3U or 6U',
    what:
      'Photographing crops, tracking floods and fires, monitoring ice, watching cities grow. This is what most people picture when they think of a satellite, and it is what most student teams want to build.',
    hardPart:
      'Getting the pictures home. A good camera makes far more data than a small radio can send down in its few minutes of contact a day. The camera also has to be aimed accurately while the satellite races past at 8 km a second.',
    realExample:
      'Commercial fleets of 3U satellites now photograph the entire planet every day — a job that used to need satellites the size of a bus.',
    loads: 'ex-imager',
  },
  {
    id: 'science',
    name: 'Science satellites',
    oneLiner: 'Measure something about space that you cannot measure from the ground.',
    typicalSize: '3U to 12U',
    what:
      'Radiation levels, Earth’s magnetic field, space weather, the upper atmosphere, even biology experiments with living samples. The instrument is usually small but the data is genuinely new.',
    hardPart:
      'Instruments are often fussy — some need to be kept at a precise temperature, or pointed very steadily, or run for long stretches that drain the battery.',
    realExample:
      'Student-built CubeSats have measured radiation belts and tested how materials survive in space, producing results used in real research papers.',
    loads: 'ex-science',
  },
  {
    id: 'tech',
    name: 'Technology-test satellites',
    oneLiner: 'Try out a new piece of hardware in space before trusting it on a big mission.',
    typicalSize: 'Any size',
    what:
      'A new kind of radio, an experimental thruster, a novel solar cell, a fold-out structure. Because CubeSats are cheap, they are the obvious place to find out whether a new idea survives space.',
    hardPart:
      'By definition you are flying something unproven, so the risk of failure is higher than anything else on this list — and that is accepted, because learning that it does not work is also a result.',
    realExample:
      'Solar sails, deployable antennas and tiny thrusters have all been proven on CubeSats before being used on larger spacecraft.',
  },
  {
    id: 'comms',
    name: 'Communications satellites',
    oneLiner: 'Relay messages between places on Earth that cannot reach each other.',
    typicalSize: '3U to 6U, usually many of them',
    what:
      'Collecting short messages from remote sensors — shipping containers, weather buoys, farm equipment — and passing them on. These usually work as a fleet, so that one is always overhead.',
    hardPart:
      'One satellite is not enough. To give constant coverage you need dozens, which turns an engineering project into an operations business.',
    realExample:
      'Several companies run fleets of small satellites tracking ships and collecting readings from sensors in places with no phone signal.',
  },
  {
    id: 'deep',
    name: 'Deep-space CubeSats',
    oneLiner: 'Leave Earth orbit entirely.',
    typicalSize: '6U and up',
    what:
      'A small number of CubeSats have travelled to the Moon and flown past Mars, hitching a ride with a larger mission and then going their own way.',
    hardPart:
      'Everything. Communicating across millions of kilometres instead of hundreds, surviving far longer, and operating with no chance of help. This is the frontier, not a starting point.',
    realExample:
      'Two briefcase-sized CubeSats flew to Mars alongside a NASA lander and relayed its landing signal back to Earth in real time.',
  },
];

export const TYPES_INTRO =
  'There are two sensible ways to sort CubeSats: by how big they are, and by what job they do. Size decides what is possible; the job decides what is hard.';
