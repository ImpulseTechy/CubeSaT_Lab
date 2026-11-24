/**
 * The battery, and whether it lasts the flight.
 *
 * The same lesson as the orbital simulator, at a scale a student can hold:
 * everything draws current, the battery has a finite amount, and the flight
 * takes as long as it takes. The difference is that here they can check it
 * against a multimeter afterwards.
 *
 * Current figures are typical for the modules students actually buy. They are
 * deliberately on the honest side rather than the datasheet-best side, because
 * a budget built from best-case numbers is the one that fails in the field.
 */

export interface Component {
  id: string;
  name: string;
  /** Current drawn while doing its job, in milliamps. */
  activeMA: number;
  /** Current while asleep or idle, in milliamps. */
  idleMA: number;
  massG: number;
}

/** Typical draws for a standard student CanSat stack. */
export const COMPONENTS: Record<string, Component> = {
  nano: {
    id: 'nano', name: 'Arduino Nano', activeMA: 19, idleMA: 19, massG: 7,
  },
  esp32: {
    id: 'esp32', name: 'ESP32', activeMA: 80, idleMA: 20, massG: 10,
  },
  bmp280: {
    id: 'bmp280', name: 'BMP280 pressure sensor', activeMA: 0.6, idleMA: 0.003, massG: 1,
  },
  mpu6050: {
    id: 'mpu6050', name: 'MPU6050 motion sensor', activeMA: 3.9, idleMA: 0.005, massG: 2,
  },
  sdcard: {
    id: 'sdcard', name: 'microSD card module', activeMA: 25, idleMA: 0.2, massG: 4,
  },
  lora: {
    // The big one. Transmitting at 14 dBm costs far more than people expect,
    // and it is why sending every 200 ms flattens a battery mid-flight.
    id: 'lora', name: 'LoRa module (SX1278)', activeMA: 120, idleMA: 1.5, massG: 5,
  },
  gps: {
    id: 'gps', name: 'NEO-6M GPS', activeMA: 45, idleMA: 11, massG: 12,
  },
  buzzer: {
    // Worth every milliamp: it is how you find the thing in long grass.
    id: 'buzzer', name: 'Recovery buzzer', activeMA: 30, idleMA: 0, massG: 3,
  },
};

export interface Battery {
  name: string;
  capacityMAh: number;
  /** Nominal voltage. */
  voltageV: number;
  massG: number;
}

export const BATTERIES: Record<string, Battery> = {
  lipo500: { name: '500 mAh LiPo', capacityMAh: 500, voltageV: 3.7, massG: 11 },
  lipo1000: { name: '1000 mAh LiPo', capacityMAh: 1000, voltageV: 3.7, massG: 20 },
  lipo2000: { name: '2000 mAh LiPo', capacityMAh: 2000, voltageV: 3.7, massG: 38 },
  aaa9v: { name: '9V alkaline', capacityMAh: 550, voltageV: 9, massG: 45 },
};

/**
 * Usable capacity is less than the label.
 *
 * A LiPo should not be run flat, and the regulator stops working before the
 * cell is truly empty. Assuming the full printed capacity is a reliable way to
 * lose the last part of a flight — which is the part with the landing in it.
 */
export const USABLE_FRACTION = 0.8;

export interface PowerBudget {
  /** Average current across the whole flight, in milliamps. */
  averageMA: number;
  /** How long the battery lasts at that draw, in minutes. */
  enduranceMin: number;
  /** Flight duration it needs to cover, in minutes. */
  flightMin: number;
  lastsTheFlight: boolean;
  /** Spare capacity as a fraction of what the flight needs. */
  marginFraction: number;
  /** Per-component contribution, heaviest draw first. */
  breakdown: { name: string; averageMA: number; share: number }[];
}

export interface Usage {
  componentId: string;
  /** Fraction of the flight this component spends working, 0..1. */
  dutyCycle: number;
}

export function powerBudget(
  usage: Usage[],
  battery: Battery,
  flightSeconds: number,
  startFraction = 1,
): PowerBudget {
  const rows = usage.map((u) => {
    const c = COMPONENTS[u.componentId];
    const duty = Math.max(0, Math.min(1, u.dutyCycle));
    const averageMA = c.activeMA * duty + c.idleMA * (1 - duty);
    return { name: c.name, averageMA };
  });

  const averageMA = rows.reduce((s, r) => s + r.averageMA, 0);
  const usableMAh = battery.capacityMAh * USABLE_FRACTION * startFraction;
  const enduranceMin = averageMA > 0 ? (usableMAh / averageMA) * 60 : Infinity;
  const flightMin = flightSeconds / 60;

  return {
    averageMA,
    enduranceMin,
    flightMin,
    lastsTheFlight: enduranceMin >= flightMin,
    marginFraction: flightMin > 0 ? enduranceMin / flightMin - 1 : Infinity,
    breakdown: rows
      .map((r) => ({ ...r, share: averageMA > 0 ? r.averageMA / averageMA : 0 }))
      .sort((a, b) => b.averageMA - a.averageMA),
  };
}

/** Total mass of the electronics, which feeds straight into chute sizing. */
export function electronicsMassG(usage: Usage[], battery: Battery): number {
  return (
    usage.reduce((s, u) => s + COMPONENTS[u.componentId].massG, 0) + battery.massG
  );
}

/** Remaining charge at a point in the flight, 0..1. */
export function stateOfCharge(
  budget: PowerBudget,
  battery: Battery,
  elapsedS: number,
  startFraction = 1,
): number {
  const usedMAh = (budget.averageMA * elapsedS) / 3600;
  const usableMAh = battery.capacityMAh * USABLE_FRACTION * startFraction;
  return Math.max(0, 1 - usedMAh / usableMAh);
}
