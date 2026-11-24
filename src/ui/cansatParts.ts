/**
 * What is inside a CanSat, as plain data.
 *
 * Kept apart from the 3D component on purpose: the view needs this list to
 * draw its tabs, and if it imported it from the Three.js module then the
 * bundler would pull Three.js into the main bundle and the lazy load would do
 * nothing at all.
 */

export interface Part {
  id: string;
  label: string;
  /** Colour of the marker dot, matched to the 3D highlight. */
  colour: string;
  what: string;
  why: string;
  /** Typical cost, so a student can price the build. */
  cost: string;
}

export const CANSAT_PARTS: Part[] = [
  {
    id: 'parachute', label: 'Parachute', colour: '#c58b3c',
    what: 'A nylon or ripstop canopy, usually 40 to 60 cm across, packed on top and tied to the can with four or more lines.',
    why: 'Without it the can hits the ground at over 40 m/s and nothing inside survives. Too big and it drifts for kilometres. Sizing it is the first real calculation you will do.',
    cost: 'about 200 rupees of ripstop, or free from an old umbrella',
  },
  {
    id: 'antenna', label: 'Antenna', colour: '#4f9e94',
    what: 'A quarter-wave wire, cut to a length that depends on your frequency. At 868 MHz that is about 8.6 cm.',
    why: 'The single cheapest thing on the whole build and the one that decides your range. A wire cut to the wrong length will roughly halve how far you can hear it.',
    cost: 'a few rupees of wire',
  },
  {
    id: 'radio', label: 'LoRa radio', colour: '#2a4d8f',
    what: 'An SX1278 module, about the size of a postage stamp, that sends small packets a very long way.',
    why: 'This is how the data gets to you while it is still in the air. It is also the hungriest part on the board, drawing around 120 mA while transmitting.',
    cost: '400 to 700 rupees',
  },
  {
    id: 'board', label: 'Microcontroller', colour: '#5a7fb5',
    what: 'An Arduino Nano or an ESP32. It reads the sensors, decides what to do, and hands packets to the radio.',
    why: 'The brain. Everything you write runs here, and everything that goes wrong in your code shows up as strange data or silence.',
    cost: '250 rupees for a Nano, 400 for an ESP32',
  },
  {
    id: 'sensor', label: 'Pressure sensor', colour: '#8a6bab',
    what: 'A BMP280 breakout, roughly a centimetre square, measuring air pressure and temperature.',
    why: 'Pressure is how you work out your height. It does not measure altitude directly, so you convert it yourself, and that conversion is the first real science in a CanSat.',
    cost: 'about 150 rupees',
  },
  {
    id: 'battery', label: 'Battery', colour: '#6b8f5e',
    what: 'A single lithium polymer cell, typically 500 to 2000 mAh, with a protection board.',
    why: 'Everything stops when this runs out. Put it at the bottom: the weight down low makes the can hang straight under the parachute instead of tumbling.',
    cost: '300 to 600 rupees',
  },
  {
    id: 'can', label: 'The can', colour: '#8c8f98',
    what: 'A standard 330 ml drinks can, 66 mm across and 115 mm tall. That envelope is the whole competition rule.',
    why: 'The size limit is the point. It forces every decision you make, in exactly the way a CubeSat is forced by its 10 cm cube.',
    cost: 'the price of a drink',
  },
];
