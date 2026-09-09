import { useEffect, useState } from 'react';
import type { AstroScotLocation } from '@astroscot/shared';
import { calculatePlanetConditions, formatPlanetHour, type PlanetConditionsData, type PlanetCondition } from '../astronomy/planetConditions';

const PLANET_ORDER: PlanetCondition['name'][] = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];

function statusLabel(planet: PlanetCondition) {
  if (planet.tier === 'advanced') return 'Telescope target';
  if (planet.visible && planet.tier === 'low') return 'Very low tonight';
  if (planet.visible) return planet.status === 'good' ? 'Good to look for' : 'Possible to see';
  return 'Not easy to see tonight';
}

function isTomorrow(rise: Date | null, set: Date | null, timezone: string) {
  if (!rise || !set) return false;
  const safeTimezone = timezone.includes('Local timezone') ? Intl.DateTimeFormat().resolvedOptions().timeZone : timezone;
  const riseDate = new Intl.DateTimeFormat('en-CA', { timeZone: safeTimezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(rise);
  const setDate = new Intl.DateTimeFormat('en-CA', { timeZone: safeTimezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(set);
  if (riseDate === setDate) return false;
  const nextDay = new Date(`${riseDate}T12:00:00Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return setDate === nextDay.toISOString().slice(0, 10);
}

function timingText(planet: PlanetCondition, timezone: string) {
  const parts: string[] = [];
  if (planet.rise) parts.push(`rises around ${formatPlanetHour(planet.rise, timezone)}`);
  if (planet.set) parts.push(`sets around ${formatPlanetHour(planet.set, timezone)}${isTomorrow(planet.rise, planet.set, timezone) ? ' tomorrow' : ''}`);
  return parts.length ? `${parts.join(' and ')}.` : 'Its rise or set time is not available for today.';
}

export function PlanetCard({ location }: { location: AstroScotLocation }) {
  const [conditions, setConditions] = useState<PlanetConditionsData | null>(null);

  useEffect(() => {
    if (location.latitude === 0 && location.longitude === 0) { setConditions(null); return; }
    const update = () => setConditions(calculatePlanetConditions(location));
    update();
    const timer = window.setInterval(update, 60000);
    return () => window.clearInterval(timer);
  }, [location]);

  if (!conditions) return <article className="info-card planet-card"><div className="card-header"><div><p className="card-eyebrow">Planets</p></div><span className="card-icon" aria-hidden="true">🪐</span></div><p className="placeholder-note">Choose a location above and My Sky Ally will show the planets here.</p></article>;

  const planets = PLANET_ORDER.map((name) => conditions.planets.find((planet) => planet.name === name)).filter((planet): planet is PlanetCondition => Boolean(planet));

  return <article className="info-card planet-card"><div className="card-header"><div><p className="card-eyebrow">Planets</p></div><span className="card-icon" aria-hidden="true">🪐</span></div><div className="planet-content"><div className="planet-list">
    {planets.map((planet) => <div className="planet-item" key={planet.name}><div className="planet-item-title"><span aria-hidden="true">{planet.symbol}</span><strong>{planet.name}</strong></div><span>{statusLabel(planet)}</span><p>{planet.reason}</p><p>{timingText(planet, location.timezone)}{planet.tier !== 'advanced' && planet.direction ? ` Look toward the ${planet.direction.toLowerCase()} sky.` : ''}</p></div>)}
  </div></div></article>;
}
