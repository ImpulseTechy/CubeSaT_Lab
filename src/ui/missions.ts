/**
 * Guided missions.
 *
 * Each follows predict-before-run: the learner is asked a question, sets up a
 * design, and the simulator either confirms or breaks their intuition. Each
 * targets a documented misconception from the research.
 */

import { DEFAULT_DESIGN, type Design } from '../physics/design';
import { evaluate } from '../physics/verdict';

export interface Mission {
  id: string;
  title: string;
  /** The misconception this is designed to break. */
  misconception: string;
  brief: string;
  /** Asked before the learner runs anything. */
  predict: string;
  goal: string;
  /** Starting design for the mission. */
  setup: Design;
  /** Returns true once the learner has met the goal. */
  isComplete: (d: Design) => boolean;
}

const base = (patch: Partial<Design>): Design => ({ ...DEFAULT_DESIGN, ...patch });

export const MISSIONS: Mission[] = [
  {
    id: 'first-orbit',
    title: '1. First Orbit',
    misconception: '"A higher orbit means flying faster."',
    brief:
      'Pick an orbit and watch what changes. Altitude sets your period, your ' +
      'speed, how long you spend in eclipse, and how often you see a ground station.',
    predict:
      'Before you touch anything: if you raise the altitude from 400 km to 1200 km, ' +
      'does the satellite travel faster or slower? Write your answer down, then change it.',
    goal: 'Set an orbit above 1000 km and compare the velocity with 400 km.',
    setup: base({
      orbit: { altitudeKm: 400, inclinationDeg: 51.6, raanDeg: 0, solarLongitudeDeg: 0 },
      components: { ...DEFAULT_DESIGN.components, payload: 'pl-beacon' },
      payloadDuty: 0.1,
    }),
    isComplete: (d) => d.orbit.altitudeKm >= 1000,
  },
  {
    id: 'keep-lights-on',
    title: '2. Keep the Lights On',
    misconception: '"Solar panels just work — the Sun is always there."',
    brief:
      'This 3U carries a camera and a healthy battery. Push the payload duty ' +
      'cycle up and find where the power budget breaks, then fix it without ' +
      'breaking the mass budget.',
    predict:
      'What fraction of each orbit can you run the camera before the battery ' +
      'cannot recover? Guess a percentage, then drag the slider past it.',
    goal: 'Run the payload at 40% duty or more with the Power card reading GO.',
    setup: base({
      components: { ...DEFAULT_DESIGN.components, payload: 'pl-cam-hi', solar: 'solar-body-3u' },
      payloadDuty: 0.2,
    }),
    isComplete: (d) => {
      if (d.payloadDuty < 0.4) return false;
      const v = evaluate(d);
      return v.cards.find((c) => c.id === 'power')!.status === 'go';
    },
  },
  {
    id: 'phone-home',
    title: '3. Phone Home',
    misconception: '"If the satellite is overhead, my data downloads."',
    brief:
      'Your camera works and your power closes. Now get the pictures home. ' +
      'Visibility is not the same as link closure, and link closure is not the ' +
      'same as enough bandwidth.',
    predict:
      'Your camera makes about 180 MB a day. How much do you think an amateur ' +
      'UHF station at 9.6 kbps brings down in a day? Guess, then look.',
    goal: 'Get the Data card to GO without the Power or Mass cards failing.',
    setup: base({
      components: { ...DEFAULT_DESIGN.components, payload: 'pl-cam-lo' },
      dataRateBps: 9600,
      payloadDuty: 0.15,
      stationId: 'amateur-eu',
    }),
    isComplete: (d) => {
      const v = evaluate(d);
      return (
        v.cards.find((c) => c.id === 'data')!.status === 'go' &&
        v.cards.find((c) => c.id === 'power')!.status !== 'nogo' &&
        v.cards.find((c) => c.id === 'mass')!.status !== 'nogo'
      );
    },
  },
];
