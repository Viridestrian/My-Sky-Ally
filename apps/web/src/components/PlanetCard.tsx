import { useEffect, useState } from 'react';
import type { AstroScotLocation } from '@astroscot/shared';
import { calculatePlanetConditions, formatPlanetTime, type PlanetConditionsData, type PlanetCondition } from '../astronomy/planetConditions';

const MAIN_PLANETS: PlanetCondition['name'][] = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

function statusLabel(planet: PlanetCondition) {
  if (planet.tier === 'low') return 'Very low tonight';
  if (planet.visible) return 'Visible tonight';
  return 'Not visible tonight';
}

function timingText(planet: PlanetCondition, timezone: string) {
  if (!planet.visible) return '';
  if (planet.tier === 'low') {
    return planet.bestTime ? `Best chance around ${formatPlanetTime(planet.bestTime, timezone)}.` : '';
  }
  if (planet.visibleFrom && planet.visibleUntil) {
    return `Best time around ${formatPlanetTime(planet.bestTime ?? planet.visibleFrom, timezone)}.`;
  }
  return planet.bestTime ? `Best time around ${formatPlanetTime(planet.bestTime, timezone)}.` : '';
}

function directionText(planet: PlanetCondition) {
  if (!planet.visible || !planet.direction) return '';
  return `Look ${planet.direction.toLowerCase()}.`;
}

export function PlanetCard({ location }: { location: AstroScotLocation }) {
  const [conditions, setConditions] = useState<PlanetConditionsData | null>(null);

  useEffect(() => {
    if (location.latitude === 0 && location.longitude === 0) {
      setConditions(null);
      return;
    }
    const update = () => setConditions(calculatePlanetConditions(location));
    update();
    const timer = window.setInterval(update, 60000);
    return () => window.clearInterval(timer);
  }, [location]);

  if (!conditions) {
    return <article className="info-card planet-card"><div className="card-header"><div><p className="card-eyebrow">Planets</p></div></div><p className="placeholder-note">Choose a location above and My Sky Ally will show what the planets are doing tonight.</p></article>;
  }

  const planets = MAIN_PLANETS.map((name) => conditions.planets.find((planet) => planet.name === name)).filter((planet): planet is PlanetCondition => Boolean(planet));

  return <article className="info-card planet-card"><div className="card-header"><div><p className="card-eyebrow">Planets</p></div></div><div className="planet-content"><p className="planet-intro">Here’s what the five main planets are doing tonight.</p><div className="planet-list">
    {planets.map((planet) => <div className="planet-item" key={planet.name}><div className="planet-item-title"><span aria-hidden="true">{planet.symbol}</span><strong>{planet.name}</strong></div><span>{statusLabel(planet)}{planet.visible && planet.direction ? ` · ${planet.direction}` : ''}</span><p>{planet.reason} {directionText(planet)} {timingText(planet, location.timezone)}</p></div>)}
  </div></div></article>;
}
