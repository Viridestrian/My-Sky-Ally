import { useEffect, useState } from 'react';
import type { AstroScotLocation } from '@astroscot/shared';
import { calculatePlanetConditions, formatPlanetHour, type PlanetConditionsData, type PlanetCondition } from '../astronomy/planetConditions';

const PLANET_ORDER: PlanetCondition['name'][] = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];

function localHour(date: Date, timezone: string) {
  const safeTimezone = timezone.includes('Local timezone') ? Intl.DateTimeFormat().resolvedOptions().timeZone : timezone;
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: safeTimezone, hour: 'numeric', hourCycle: 'h23' }).format(date));
}

function localDateKey(date: Date, timezone: string) {
  const safeTimezone = timezone.includes('Local timezone') ? Intl.DateTimeFormat().resolvedOptions().timeZone : timezone;
  return new Intl.DateTimeFormat('en-CA', { timeZone: safeTimezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function isTomorrow(rise: Date | null, set: Date | null, timezone: string) {
  if (!rise || !set) return false;
  const riseDate = localDateKey(rise, timezone);
  const setDate = localDateKey(set, timezone);
  if (riseDate === setDate) return false;
  const [year, month, day] = riseDate.split('-').map(Number);
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
  return setDate === nextDay.toISOString().slice(0, 10);
}

function timingText(planet: PlanetCondition, timezone: string) {
  const parts: string[] = [];
  if (planet.rise) {
    const riseHour = localHour(planet.rise, timezone);
    parts.push(riseHour < 6 ? 'Rises very early in the morning' : `Rises around ${formatPlanetHour(planet.rise, timezone)}`);
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
  if (planet.name === 'Mercury' || planet.name === 'Venus') return 'Not easy to see tonight.';
  return 'Not visible tonight.';
}

function planetIcon(name: PlanetCondition['name']) {
  const common = { width: 26, height: 26, viewBox: '0 0 26 26', 'aria-hidden': true as const, className: 'planet-icon' };
  if (name === 'Saturn') return <svg {...common}><ellipse cx="13" cy="13" rx="11" ry="4" fill="none" stroke="rgba(255,230,160,.9)" strokeWidth="2.2" transform="rotate(-18 13 13)"/><circle cx="13" cy="13" r="6" fill="#d8b36a"/><path d="M9 10.5c2 1.2 5 1.2 8 0M8.8 13c2.4 1.3 5.2 1.3 8.4 0M9.5 15.4c1.8 1 4.2 1 7 0" fill="none" stroke="#9a7137" strokeWidth=".9"/></svg>;
  if (name === 'Jupiter') return <svg {...common}><circle cx="13" cy="13" r="10" fill="#d8b58b"/><path d="M4 9h18M3.5 13h19M5 17h16" stroke="#a97855" strokeWidth="2"/><ellipse cx="17" cy="15.5" rx="2.2" ry="1.2" fill="#9b624d"/></svg>;
  if (name === 'Mars') return <svg {...common}><circle cx="13" cy="13" r="9.5" fill="#c95b4b"/><circle cx="9" cy="9" r="2" fill="#9f4439"/><circle cx="16.5" cy="14" r="1.6" fill="#a7473d"/><circle cx="11" cy="17" r="1.2" fill="#e17a63"/></svg>;
  if (name === 'Venus') return <svg {...common}><circle cx="13" cy="13" r="9.5" fill="#d7b66d"/><path d="M6 9c4-2 9 1 14-1M5 13c4-1 9 2 16-1M7 17c3-1 7 1 12-1" fill="none" stroke="#a78348" strokeWidth="1.2"/></svg>;
  if (name === 'Mercury') return <svg {...common}><circle cx="13" cy="13" r="9.5" fill="#a9a7a1"/><circle cx="9" cy="10" r="2" fill="#77756f"/><circle cx="16" cy="15" r="2.4" fill="#85827b"/><circle cx="13" cy="7" r="1" fill="#d0cec7"/><circle cx="8" cy="16" r="1.1" fill="#d0cec7"/></svg>;
  if (name === 'Uranus') return <svg {...common}><circle cx="13" cy="13" r="9.5" fill="#79d7dc"/><path d="M5 10c5 2 10 2 16 0M5 15c5-2 10-2 16 0" fill="none" stroke="#54aeb8" strokeWidth="1"/></svg>;
  return <svg {...common}><circle cx="13" cy="13" r="9.5" fill="#4d78d8"/><path d="M5 9c4 1 8 2 16-1M4.5 13c5 2 10 0 17-2M6 17c4-1 8 1 14-1" fill="none" stroke="#3458ad" strokeWidth="1.2"/></svg>;
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
    {planets.map((planet) => <div className="planet-item" key={planet.name}><div className="planet-item-title">{planetIcon(planet.name)}<strong>{planet.name}</strong></div><p>{descriptionText(planet, location.timezone)}</p></div>)}
  </div></div></article>;
}
