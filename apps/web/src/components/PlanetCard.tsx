import { useEffect, useState } from 'react';
import type { AstroScotLocation } from '@astroscot/shared';
import { calculatePlanetConditions, formatPlanetHour, type PlanetConditionsData, type PlanetCondition } from '../astronomy/planetConditions';

const PLANET_ORDER: PlanetCondition['name'][] = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];

function localHour(date: Date, timezone: string) {
  const safeTimezone = timezone.includes('Local timezone') ? Intl.DateTimeFormat().resolvedOptions().timeZone : timezone;
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: safeTimezone, hour: 'numeric', hourCycle: 'h23' }).format(date));
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
  if (planet.rise) {
    const riseHour = localHour(planet.rise, timezone);
    const riseText = riseHour < 6 ? 'Rises very early in the morning' : `Rises around ${formatPlanetHour(planet.rise, timezone)}`;
    parts.push(riseText);
  }
  if (planet.set) {
    let setText = `sets around ${formatPlanetHour(planet.set, timezone)}`;
    if (isTomorrow(planet.rise, planet.set, timezone)) {
      const setHour = localHour(planet.set, timezone);
      setText += setHour < 12 ? ' tomorrow morning' : ' tomorrow';
    }
    parts.push(setText);
  }
  return parts.length ? `${parts.join(', ')}.` : 'Rise or set time is not available for today.';
}

function viewingText(planet: PlanetCondition, timezone: string) {
  if (planet.tier === 'advanced') return 'Very hard to see without a strong telescope.';

  const riseHour = planet.rise ? localHour(planet.rise, timezone) : null;
  const setHour = planet.set ? localHour(planet.set, timezone) : null;

  if (riseHour !== null && riseHour < 6 && setHour !== null && setHour < 18) {
    return 'Not visible tonight.';
  }

  if (planet.visible && planet.status === 'good') {
    if (riseHour !== null && riseHour >= 18) {
      return 'Might be visible in the southern sky if you stay up late.';
    }
    return 'Not easy to see tonight.';
  }

  if (planet.visible || planet.tier === 'low') return 'Not easy to see tonight.';
  return 'Not visible tonight.';
}

function descriptionText(planet: PlanetCondition, timezone: string) {
  return `${timingText(planet, timezone)} ${viewingText(planet, timezone)}`;
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
    {planets.map((planet) => <div className="planet-item" key={planet.name}><div className="planet-item-title"><span aria-hidden="true">{planet.symbol}</span><strong>{planet.name}</strong></div><p>{descriptionText(planet, location.timezone)}</p></div>)}
  </div></div></article>;
}
