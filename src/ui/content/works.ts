/**
 * "How does a CubeSat actually work?"
 *
 * The operating loop, told as a day in the life. Writing rule, as everywhere
 * else: a 15-year-old with no background must follow every sentence. Analogies
 * are load-bearing here, not decoration.
 */

export interface Phase {
  id: string;
  /** Where in the lap this happens, 0..1, used to drive the animation. */
  at: number;
  title: string;
  /** One line, the thing to remember. */
  short: string;
  body: string;
  analogy?: string;
}

export const DAY_IN_THE_LIFE: Phase[] = [
  {
    id: 'sunlight',
    at: 0.1,
    title: 'In sunlight: charging up',
    short: 'Solar panels make electricity. Everything runs, and the spare charges the battery.',
    body:
      'For about an hour of every lap the satellite is in full sunlight. Its solar panels turn that light into electricity. Some runs the computer and the radio right away; whatever is left over goes into the battery, ready for the dark part.',
    analogy:
      'Like charging your phone while you are still using it — as long as the charger gives more than the phone draws, the battery creeps up.',
  },
  {
    id: 'working',
    at: 0.25,
    title: 'Doing its job',
    short: 'The instrument switches on and collects data. This is the expensive bit.',
    body:
      'Taking a photograph, measuring radiation, recording a signal. The instrument is usually the hungriest thing on board, so you cannot leave it on all the time. Every second it runs costs electricity you have to earn back, and fills up storage you have to empty later.',
    analogy:
      'Like filming video on your phone. You can do it, but you can feel the battery going and the storage filling.',
  },
  {
    id: 'shadow',
    at: 0.5,
    title: 'Into Earth’s shadow: running on battery',
    short: 'For about 35 minutes the panels make nothing at all.',
    body:
      'The satellite swings behind Earth and the Sun disappears. The panels stop producing instantly — there is no dusk in space, it is just off. Now the battery alone runs everything. This happens roughly sixteen times a day, every day, for years.',
    analogy:
      'Like driving into a long tunnel with no petrol stations. You had better have filled up, because there is nothing to do but spend.',
  },
  {
    id: 'waiting',
    at: 0.65,
    title: 'Waiting to be in range',
    short: 'It cannot phone home whenever it likes. It has to be overhead.',
    body:
      'Your antenna is a fixed spot on a spinning planet, and the satellite is racing round at nearly 8 kilometres a second. They are only in range of each other for a few minutes at a time, a handful of times a day. The rest of the time the satellite just carries on alone, storing up what it has collected.',
    analogy:
      'Like a friend on a fast train who only has signal when they pass through your town. You get a few minutes, then they are gone again.',
  },
  {
    id: 'pass',
    at: 0.82,
    title: 'The pass: sending data home',
    short: 'A few minutes to send down everything it has collected.',
    body:
      'The satellite climbs above your horizon and the radio link opens. It starts emptying its storage down to your antenna. The signal is weakest at the start and end, when the satellite is furthest away near the horizon, and strongest when it is overhead. Then it drops below the horizon and the connection is gone until next time.',
    analogy:
      'Like having four minutes of patchy signal to upload a day of photos. Whatever does not go, waits — or gets lost.',
  },
  {
    id: 'repeat',
    at: 0.95,
    title: 'And again. About sixteen times a day.',
    short: 'Every lap takes roughly 95 minutes, for years on end.',
    body:
      'That is the whole job. Charge, work, survive the dark, wait, send, repeat. Nothing exotic — but every part of it has to balance, every single lap, with nobody able to go up and fix anything.',
  },
];

export const WORKS_INTRO = {
  lead:
    'A satellite is not really "flying". It is falling — and missing.',
  body:
    'Throw a ball and it curves down to the ground. Throw it harder and it lands further away. Throw it hard enough, at about 8 kilometres every second, and the ground curves away beneath it just as fast as it falls. It keeps falling forever and never lands. That is an orbit, and it is why satellites do not need engines to stay up there.',
  weightless:
    'This is also why astronauts float. It is not that there is no gravity up there — at the height a CubeSat orbits, gravity is still about 90% as strong as it is on the ground. They float because they are falling, continuously, along with everything around them.',
};

export const THREE_JOBS = [
  {
    title: 'Stay alive',
    body:
      'Make more electricity than you use, and keep everything from cooking in the sun or freezing in the dark. Get this wrong and nothing else matters.',
  },
  {
    title: 'Do the job',
    body:
      'Point at the right thing, switch on at the right moment, and record something worth having. Every second of this costs power.',
  },
  {
    title: 'Get the data home',
    body:
      'Store it up, then empty it down to Earth in the few minutes a day you are in range. Data you cannot send is data you never had.',
  },
];
