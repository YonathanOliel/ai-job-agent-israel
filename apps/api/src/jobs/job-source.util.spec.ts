import { guessIsraeliCity, isIsraelLocation, isTechRole } from './job-source.util';

describe('guessIsraeliCity', () => {
  it('recognizes a specific Israeli city in English', () => {
    expect(guessIsraeliCity('Great opportunity in Tel Aviv, hybrid.')).toBe('Tel Aviv');
  });

  it('recognizes a specific Israeli city in Hebrew', () => {
    expect(guessIsraeliCity('משרה מעולה בהרצליה, היברידי.')).toBe('Herzliya');
  });

  it('falls back to "Israel" when only the country is mentioned', () => {
    expect(guessIsraeliCity('Remote role, must be based in Israel.')).toBe('Israel');
  });

  it('returns null when there is no Israel signal', () => {
    expect(guessIsraeliCity('Great opportunity in Berlin.')).toBeNull();
  });
});

describe('isTechRole / isIsraelLocation (sanity)', () => {
  it('flags a clear tech role', () => {
    expect(isTechRole('Senior backend developer with React experience')).toBe(true);
  });

  it('flags a clear Israeli location', () => {
    expect(isIsraelLocation('Tel Aviv, Israel')).toBe(true);
  });
});
