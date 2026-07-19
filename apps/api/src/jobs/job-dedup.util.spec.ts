import { buildContentHash, buildDedupeKey } from './job-dedup.util';

describe('job-dedup.util', () => {
  describe('buildDedupeKey', () => {
    it('is stable across casing, punctuation and city suffixes', () => {
      const a = buildDedupeKey('Cato Networks', 'Senior Backend Engineer', 'Tel Aviv, Israel');
      const b = buildDedupeKey('cato   networks', 'senior backend engineer!', 'Tel Aviv');
      expect(a).toBe(b);
    });

    it('differs for a different role at the same company', () => {
      const a = buildDedupeKey('Acme', 'Backend Engineer', 'Tel Aviv');
      const b = buildDedupeKey('Acme', 'Frontend Engineer', 'Tel Aviv');
      expect(a).not.toBe(b);
    });

    it('produces a short hex key', () => {
      expect(buildDedupeKey('Acme', 'Engineer')).toMatch(/^[0-9a-f]{24}$/);
    });
  });

  describe('buildContentHash', () => {
    it('changes when the description changes', () => {
      const a = buildContentHash('Engineer', 'Acme', 'We use Node.js');
      const b = buildContentHash('Engineer', 'Acme', 'We use Python');
      expect(a).not.toBe(b);
    });

    it('is stable for equivalent content', () => {
      const a = buildContentHash('Engineer', 'Acme', 'Node.js  and AWS');
      const b = buildContentHash('engineer', 'acme', 'node.js and aws');
      expect(a).toBe(b);
    });
  });
});
