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
    title: '1. Does a higher satellite fly faster?',
    misconception: '"Higher up must mean faster."',
    brief:
      'Everything about a satellite starts with the orbit you put it in. How high ' +
      'you fly decides how fast you travel, how long each lap takes, how much time ' +
      'you spend in darkness, and how often you can talk to it.',
    predict:
      'Before you touch anything \u2014 if you move the satellite from 400 km up to ' +
      '1200 km, does it end up travelling faster or slower? Say your answer out loud, ' +
      'then drag the height slider and watch "how fast it travels".',
    goal: 'Drag the height above 1000 km, then look at how fast it travels.',
    setup: base({
      orbit: { altitudeKm: 400, inclinationDeg: 51.6, raanDeg: 0, solarLongitudeDeg: 0 },
      components: { ...DEFAULT_DESIGN.components, payload: 'pl-beacon' },
      payloadDuty: 0.1,
    }),
    isComplete: (d) => d.orbit.altitudeKm >= 1000,
  },
  {
    id: 'keep-lights-on',
    title: '2. Can you keep it alive?',
    misconception: '"Solar panels just work \u2014 the Sun is always there."',
    brief:
      'This satellite carries a good camera and a healthy battery. The catch is that ' +
      'it spends about a third of every lap inside Earth\u2019s shadow, making no ' +
      'electricity at all. Turn the camera up until the battery cannot keep up \u2014 ' +
      'then find a way to fix it.',
    predict:
      'What share of each lap do you think you can run the camera before the battery ' +
      'never fully recharges? Pick a number, then drag the slider past it and see how ' +
      'close you were.',
    goal: 'Run the camera at least 40% of each lap with the Power card still saying WORKS.',
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
    title: '3. Can you actually get the pictures?',
    misconception: '"If it is flying overhead, my data comes down."',
    brief:
      'The camera works and the power is fine. Now the hard part: getting the pictures ' +
      'down to Earth. Being overhead is not the same as being heard, and being heard ' +
      'is not the same as having enough time to send everything.',
    predict:
      'Your camera records about 180 MB a day \u2014 roughly 40 photos. How much of ' +
      'that do you think a small hobby radio antenna actually gets down in a day? ' +
      'Guess a number first. Most people guess far too high.',
    goal: 'Get the Data card to say WORKS, without breaking Weight or Power.',
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
