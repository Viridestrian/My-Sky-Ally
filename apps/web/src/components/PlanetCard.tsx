import { useEffect, useState } from 'react';
import type { AstroScotLocation } from '@astroscot/shared';
import { calculatePlanetConditions, formatPlanetHour, type PlanetConditionsData, type PlanetCondition } from '../astronomy/planetConditions';

const PLANET_ORDER: PlanetCondition['name'][] = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];

function localHour(date: Date, timezone: string) {
  const safeTimezone = timezone.includes('Local timezone') ? Intl.DateTimeFormat().resolvedOptions().timeZone : timezone;
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: safeTimezone, hour: 'numeric', hourCycle: 'h23' }).format(date));
}

function timingText(planet: PlanetCondition, timezone: string) {
  const parts: string[] = [];
  const riseHour = planet.rise ? localHour(planet.rise, timezone) : null;
  const setHour = planet.set ? localHour(planet.set, timezone) : null;

  if (planet.rise) {
    parts.push(riseHour !== null && riseHour < 6 ? 'Rises very early in the morning' : `Rises around ${formatPlanetHour(planet.rise, timezone)}`);
  }
  if (planet.set) {
    let setText = `sets around ${formatPlanetHour(planet.set, timezone)}`;
    if (riseHour !== null && setHour !== null && riseHour >= 18 && setHour < 12) {
      setText += ' tomorrow morning';
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
  if (planet.name === 'Mercury' || planet.name === 'Venus') return 'Not easy to see tonight.';
  return 'Not visible tonight.';
}

function planetIcon(name: PlanetCondition['name']) {
  if (name === 'Mercury') return '☿';
  if (name === 'Venus') return '♀';
  if (name === 'Mars') return '♂';
  if (name === 'Jupiter') return '♃';
  if (name === 'Saturn') return '♄';
  if (name === 'Uranus') return '♅';
  return '♆';
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
    {planets.map((planet) => <div className="planet-item" key={planet.name}><div className="planet-item-title"><span aria-hidden="true">{planetIcon(planet.name)}</span><strong>{planet.name}</strong></div><p>{descriptionText(planet, location.timezone)}</p></div>)}
  </div></div></article>;
}
