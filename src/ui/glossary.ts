/**
 * Plain-language glossary.
 *
 * Rule for this file: if a 15-year-old could not read the `plain` field and
 * understand it, it is not finished. The real engineering term always appears
 * too — we are not hiding the vocabulary, we are making it learnable. A student
 * should leave able to use the real words.
 *
 * Every piece of jargon that appears anywhere in the interface must have an
 * entry here.
 */

export interface Term {
  /** The everyday phrase we lead with. */
  plain: string;
  /** What engineers actually call it. */
  technical: string;
  /** One sentence, no jargon, that a beginner can follow. */
  definition: string;
  /** Why a satellite designer cares. Optional but usually worth it. */
  matters?: string;
  /** A concrete comparison, where one genuinely helps. */
  analogy?: string;
}

export const GLOSSARY: Record<string, Term> = {
  dutyCycle: {
    plain: 'how often it runs',
    technical: 'duty cycle',
    definition:
      'The share of each lap around Earth that an instrument spends switched on.',
    matters:
      'Running the camera more means more pictures, but also more electricity used and more data to send home.',
    analogy: '30% means it is on for about a third of every lap, then rests.',
  },

  eclipse: {
    plain: 'time in Earth’s shadow',
    technical: 'eclipse',
    definition:
      'The part of each lap where Earth blocks the Sun, so the solar panels make nothing.',
    matters:
      'This is the only time the battery has to carry the whole satellite alone.',
    analogy:
      'In a typical low orbit this is about 35 minutes of every 95-minute lap.',
  },

  betaAngle: {
    plain: 'how side-on your orbit is to the Sun',
    technical: 'beta angle',
    definition:
      'The angle between your orbital path and the direction of the Sun.',
    matters:
      'Near 0 degrees you pass through the longest possible shadow. Past about 67 degrees you never enter shadow at all, and your power problem disappears.',
    analogy:
      'Think of your orbit as a hoop and the Sun as a torch. Shine it edge-on and the hoop passes behind Earth. Shine it face-on and it never does.',
  },

  orbitAverage: {
    plain: 'averaged over a whole lap',
    technical: 'orbit-average',
    definition:
      'A value smoothed across one complete trip around Earth, sunlight and shadow together.',
    matters:
      'Power is only meaningful as a lap average, because generation stops dead in shadow but the load keeps drawing.',
  },

  stateOfCharge: {
    plain: 'how full the battery is',
    technical: 'state of charge',
    definition: 'How much energy is left in the battery, as a percentage.',
    analogy: 'Exactly like the battery percentage on a phone.',
  },

  depthOfDischarge: {
    plain: 'how far the battery drains each lap',
    technical: 'depth of discharge',
    definition:
      'How much of the battery gets used up on each lap before it recharges.',
    matters:
      'Shallow sips make a battery last for years. Deep drains wear it out. In low orbit you go round roughly 5,500 times a year, so small differences add up fast.',
    analogy:
      'Draining to 20% every single day wears a phone battery out far quicker than topping it up from 80%.',
  },

  brownout: {
    plain: 'the battery runs flat',
    technical: 'brownout',
    definition:
      'The battery drops so low the satellite cannot keep its systems running and shuts down.',
    matters:
      'Many student satellites are never heard from again after this happens. It is one of the most common ways a first mission dies.',
  },

  massMargin: {
    plain: 'weight you have left',
    technical: 'mass margin',
    definition:
      'The difference between what your satellite weighs and the heaviest it is allowed to be.',
    matters:
      'Launch providers enforce a hard weight limit. Real builds always get heavier during assembly, so finishing your design with zero spare weight means trouble later.',
    analogy: 'An airline baggage allowance you cannot talk your way past.',
  },

  contingency: {
    plain: 'spare weight set aside',
    technical: 'contingency margin',
    definition:
      'Extra weight you add to your estimate on purpose, to cover the things you have not thought of yet.',
    matters:
      'Wiring, screws, glue and brackets are almost never in a first estimate, and they are never weightless.',
  },

  linkBudget: {
    plain: 'whether the radio signal is strong enough',
    technical: 'link budget',
    definition:
      'A tally of everything that strengthens or weakens your radio signal between the satellite and the ground.',
    matters:
      'If the sum comes out negative, your radio is transmitting into the void and nothing reaches the ground.',
  },

  linkMargin: {
    plain: 'signal strength to spare',
    technical: 'link margin',
    definition:
      'How much stronger your signal is than the bare minimum needed to be understood.',
    matters:
      'Zero means it only just works in perfect conditions. Rain, a wonky antenna or a bit of interference will break it. Engineers aim for 6 dB — about four times stronger than strictly needed.',
  },

  pathLoss: {
    plain: 'signal weakening with distance',
    technical: 'free-space path loss',
    definition:
      'Radio signals spread out as they travel, so the further away you are, the weaker they arrive.',
    matters:
      'Doubling the distance weakens the signal fourfold. A satellite near the horizon is three times further away than one overhead, which is why passes are weakest at the start and end.',
  },

  ebN0: {
    plain: 'signal quality per bit of data',
    technical: 'Eb/N0',
    definition:
      'How much signal strength arrives for each individual bit of data, compared with the background noise.',
    matters:
      'Sending data faster splits the same signal across more bits, so each one gets weaker. Going ten times faster costs you ten times the signal strength.',
    analogy:
      'Like talking faster across a noisy room — say more words per second and each one is harder to catch.',
  },

  gOverT: {
    plain: 'how good the ground antenna is',
    technical: 'G/T, gain-to-noise-temperature',
    definition:
      'A single score for a ground station: how well it collects faint signals versus how much noise it adds itself.',
    matters:
      'A big quiet dish can hear a satellite that a hobby antenna cannot. Upgrading the ground station is often cheaper than upgrading the satellite.',
  },

  eirp: {
    plain: 'how loudly the satellite shouts',
    technical: 'EIRP',
    definition:
      'The combined strength of your transmitter and your antenna pointed in the useful direction.',
  },

  slantRange: {
    plain: 'distance to the ground station',
    technical: 'slant range',
    definition:
      'The straight-line distance from the satellite to the ground station right now.',
    matters:
      'Shortest when directly overhead, and much longer near the horizon — which is why the signal is weakest at the edges of a pass.',
  },

  elevationMask: {
    plain: 'how high above the horizon it must be',
    technical: 'elevation mask',
    definition:
      'How far above the horizon the satellite has to climb before the ground station can usefully hear it.',
    matters:
      'Buildings, hills and trees block the view near the horizon, and the signal has to cut through more atmosphere there.',
  },

  pass: {
    plain: 'a chance to talk to it',
    technical: 'pass',
    definition:
      'A window when the satellite is above the horizon from your ground station and you can exchange data.',
    matters:
      'Most low-orbit satellites get only a handful of passes a day, each lasting a few minutes. That is your entire opportunity to collect data.',
  },

  groundTrack: {
    plain: 'the path it draws over Earth',
    technical: 'ground track',
    definition:
      'The line traced across the map by the point directly beneath the satellite.',
    matters:
      'It drifts west each lap because Earth keeps turning underneath, which is why you do not pass over the same place every time.',
  },

  inclination: {
    plain: 'how tilted the orbit is',
    technical: 'inclination',
    definition:
      'The tilt of the orbit relative to the equator, which sets how far north and south the satellite travels.',
    matters:
      'A satellite can never fly over a place further from the equator than its tilt allows. A 50 degree orbit will never pass over northern Norway.',
  },

  sso: {
    plain: 'an orbit that keeps the same local time',
    technical: 'sun-synchronous orbit',
    definition:
      'A slightly tilted-backwards orbit that drifts just enough each day to cross the equator at the same local time all year.',
    matters:
      'Photographs always have the same lighting. A dawn-dusk version rides the day-night line and can sit in permanent sunlight.',
  },

  attitude: {
    plain: 'which way it is pointing',
    technical: 'attitude',
    definition:
      'The orientation of the satellite in space — where its faces are aimed.',
    matters:
      'It decides how much sunlight hits the panels, where the antenna points and what the camera sees. Point badly and a perfectly good design starves.',
  },

  detumble: {
    plain: 'stopping the spin',
    technical: 'detumbling',
    definition:
      'Getting the tumbling under control after the launcher throws the satellite out spinning.',
  },

  formFactor: {
    plain: 'the size of the satellite',
    technical: 'form factor',
    definition:
      'CubeSats are built from 10 cm cubes called units. A 3U is three of them stacked into a loaf shape.',
    matters:
      'The size fixes your weight limit, how much surface you have for solar cells and how much room there is inside.',
  },

  cds: {
    plain: 'the CubeSat rulebook',
    technical: 'CubeSat Design Specification (CDS) Rev. 14.1',
    definition:
      'The shared standard every CubeSat follows so it fits the launcher that deploys it.',
    matters:
      'Breaking the rules means you do not fly. The current version allows 2 kg per unit; older guides still say 1.33 kg.',
  },

  dataClosure: {
    plain: 'whether the data gets home',
    technical: 'data closure',
    definition:
      'Whether you can send down everything your instruments record, or whether it piles up faster than you can clear it.',
    matters:
      'A camera that fills its storage in a day is a camera that stops working on day two. This catches out more student missions than almost anything else.',
  },

  watt: {
    plain: 'watts',
    technical: 'W',
    definition: 'A measure of how fast energy is being used right now.',
    analogy: 'A phone charger is about 5 watts. A laptop is around 45.',
  },

  wattHour: {
    plain: 'watt-hours',
    technical: 'Wh',
    definition: 'A measure of a quantity of stored energy.',
    analogy:
      'One watt-hour runs a one-watt device for an hour. A phone battery holds roughly 15.',
  },

  decibel: {
    plain: 'decibels',
    technical: 'dB',
    definition:
      'A way of writing very large and very small ratios compactly. Every 3 dB is a doubling, and every 10 dB is ten times.',
    analogy: '6 dB of spare signal means about four times stronger than the minimum.',
  },
};

export function term(key: keyof typeof GLOSSARY): Term {
  return GLOSSARY[key];
}
