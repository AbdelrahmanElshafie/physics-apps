/**
 * DC circuits formulas — Chapter 1 of the 3rd-secondary syllabus.
 *
 * Every lesson number and every exercise answer in `content/syllabi/electricity/` is checked
 * against one of these, the same discipline physics-instructor uses for its own physics: a number
 * a lesson prints is a number a test can check, so a lesson quoting 0.25 A while its own worked
 * derivation gives 0.253 A gets caught immediately rather than discovered by a confused student.
 */

/** I = Q / t. */
export function currentFromCharge(chargeCoulombs: number, seconds: number): number {
  return chargeCoulombs / seconds
}

/** N = Q / e — number of electrons corresponding to a charge. */
export function electronCount(chargeCoulombs: number): number {
  const ELEMENTARY_CHARGE = 1.6e-19
  return chargeCoulombs / ELEMENTARY_CHARGE
}

/** V = W / Q — potential difference from work done per unit charge. */
export function potentialDifference(workJoules: number, chargeCoulombs: number): number {
  return workJoules / chargeCoulombs
}

/** W = QV — work done moving a charge through a potential difference (V's own inverse). */
export function workFromChargeAndVoltage(chargeCoulombs: number, volts: number): number {
  return chargeCoulombs * volts
}

/** The potential difference between two points, each given as an absolute potential: V_AB = V_A - V_B. */
export function potentialDifferenceBetweenPoints(vA: number, vB: number): number {
  return vA - vB
}

/** Ohm's law: R = V / I. */
export function resistanceFromOhmsLaw(volts: number, amps: number): number {
  return volts / amps
}

/** R = rho * L / A — resistance of a uniform conductor. */
export function resistanceFromGeometry(resistivity: number, lengthMetres: number, areaM2: number): number {
  return (resistivity * lengthMetres) / areaM2
}

/** sigma = 1 / rho — conductivity. */
export function conductivity(resistivity: number): number {
  return 1 / resistivity
}

/** Equivalent resistance of resistors in series: sum. */
export function seriesResistance(ohms: readonly number[]): number {
  return ohms.reduce((sum, r) => sum + r, 0)
}

/** Equivalent resistance of resistors in parallel: reciprocal of the sum of reciprocals. */
export function parallelResistance(ohms: readonly number[]): number {
  return 1 / ohms.reduce((sum, r) => sum + 1 / r, 0)
}

/** Electrical power, from voltage and current: P = VI. */
export function powerFromVI(volts: number, amps: number): number {
  return volts * amps
}

/** Electrical power, from current and resistance: P = I^2 R. */
export function powerFromIR(amps: number, ohms: number): number {
  return amps * amps * ohms
}

/** Electrical power, from voltage and resistance: P = V^2 / R. */
export function powerFromVR(volts: number, ohms: number): number {
  return (volts * volts) / ohms
}

/** Energy dissipated over time: W = P t. */
export function energyFromPower(watts: number, seconds: number): number {
  return watts * seconds
}

/**
 * Ohm's law for a closed circuit with a real cell: terminal voltage V = emf - I r, equivalently
 * emf = I (R + r). Returns the current a given external resistance draws.
 */
export function currentWithInternalResistance(emfVolts: number, externalOhms: number, internalOhms: number): number {
  return emfVolts / (externalOhms + internalOhms)
}

/** Terminal voltage of a real cell delivering current I: V = emf - I r. */
export function terminalVoltage(emfVolts: number, amps: number, internalOhms: number): number {
  return emfVolts - amps * internalOhms
}
