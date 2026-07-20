import { expandTechnology, normalizeTech, technologyGraph } from './technology-graph';

describe('technology-graph', () => {
  describe('expandTechnology', () => {
    it('expands a canonical term to its ecosystem', () => {
      const result = expandTechnology('kubernetes');
      expect(result).toContain('kubernetes');
      expect(result).toEqual(expect.arrayContaining(['helm', 'argocd', 'istio']));
    });

    it('expands an alias to the same cluster as its canonical', () => {
      expect(expandTechnology('k8s')).toEqual(expect.arrayContaining(['kubernetes', 'helm']));
    });

    it('is case- and whitespace-insensitive', () => {
      expect(expandTechnology('  Kubernetes ')).toEqual(expandTechnology('kubernetes'));
    });

    it('returns just the normalized term for an ecosystem member (no reverse blow-up)', () => {
      expect(expandTechnology('helm')).toEqual(['helm']);
    });

    it('returns just the normalized term for an unknown technology', () => {
      expect(expandTechnology('CobolScript')).toEqual(['cobolscript']);
    });

    it('always includes the input term in the expansion', () => {
      for (const term of ['react', 'aws', 'python', 'golang']) {
        expect(expandTechnology(term)).toContain(term);
      }
    });
  });

  describe('normalizeTech', () => {
    it('lowercases and trims', () => {
      expect(normalizeTech('  ReactJS ')).toBe('reactjs');
    });
  });

  describe('technologyGraph', () => {
    it('exposes canonical technologies with their related terms', () => {
      const graph = technologyGraph();
      const kubernetes = graph.find((g) => g.technology === 'kubernetes');
      expect(kubernetes?.related).toContain('helm');
      expect(graph.length).toBeGreaterThan(10);
    });
  });
});
