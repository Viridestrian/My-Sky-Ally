import { useEffect, useState } from 'react';
import type { AstroScotLocation } from '@astroscot/shared';
import { calculatePlanetConditions, formatPlanetAltitude, formatPlanetHour, type PlanetConditionsData, type PlanetCondition } from '../astronomy/planetConditions';

const PLANET_ORDER: PlanetCondition['name'][] = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];

function statusLabel(planet: PlanetCondition) {
  if (planet.tier === 'advanced') return 'Telescope target';
  if (planet.visible && planet.tier === 'low') return 'Very low tonight';
  if (planet.visible) return planet.status === 'good' ? 'Good to look for' : 'Possible to see';
  return 'Not easy to see tonight';
}

function timingText(planet: PlanetCondition, timezone: string) {
  const parts: string[] = [];
  if (planet.rise) parts.push(`rises around ${formatPlanetHour(planet.rise, timezone)}`);
  if (planet.set) parts.push(`sets around ${formatPlanetHour(planet.set, timezone)}`);
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

  if (!conditions) return <article className="info-card planet-card"><div className="card-header"><div><p className="card-eyebrow">Planets</p><h2>Our Solar System</h2></div><span className="card-icon" aria-hidden="true">🪐</span></div><p className="placeholder-note">Choose a location above and My Sky Ally will show all seven planets here.</p></article>;

  const planets = PLANET_ORDER.map((name) => conditions.planets.find((planet) => planet.name === name)).filter((planet): planet is PlanetCondition => Boolean(planet));

  return <article className="info-card planet-card"><div className="card-header"><div><p className="card-eyebrow">Planets</p><h2>Our Solar System</h2></div><span className="card-icon" aria-hidden="true">🪐</span></div><div className="planet-content"><p className="planet-intro">Every planet gets a spot. The rise and set times are rounded so they are easy to read.</p><div className="planet-list">
    {planets.map((planet) => <div className="planet-item" key={planet.name}><div className="planet-item-title"><span aria-hidden="true">{planet.symbol}</span><strong>{planet.name}</strong></div><span>{statusLabel(planet)}{planet.bestAltitude !== null ? ` · ${formatPlanetAltitude(planet.bestAltitude)}` : ''}</span><p>{planet.reason}</p><p>{timingText(planet, location.timezone)}{planet.tier !== 'advanced' && planet.direction ? ` Look toward the ${planet.direction.toLowerCase()} sky.` : ''}</p></div>)}
  </div></div></article>;
}
