/**
 * Curated technology knowledge graph for query expansion. Searching a canonical
 * technology (or one of its aliases) also matches postings tagged only with a
 * related tool in the same ecosystem — e.g. "kubernetes" surfaces jobs tagged
 * helm / argocd / istio. Deterministic and offline; hand-maintained for the
 * Israeli hi-tech stack. All terms are lowercase.
 */
interface TechCluster {
  /** Primary term. */
  canonical: string;
  /** Synonyms that expand to the same cluster (e.g. "k8s" ⇒ kubernetes). */
  aliases: string[];
  /** Ecosystem members surfaced when the canonical/alias is searched. */
  related: string[];
}

const TECH_CLUSTERS: TechCluster[] = [
  {
    canonical: 'kubernetes',
    aliases: ['k8s'],
    related: ['helm', 'argocd', 'istio', 'kustomize', 'kubectl', 'cilium', 'keda', 'rancher'],
  },
  {
    canonical: 'docker',
    aliases: [],
    related: ['containerd', 'docker-compose', 'podman', 'oci'],
  },
  {
    canonical: 'aws',
    aliases: ['amazon web services'],
    related: ['ec2', 's3', 'lambda', 'eks', 'dynamodb', 'cloudformation', 'rds'],
  },
  {
    canonical: 'gcp',
    aliases: ['google cloud', 'google cloud platform'],
    related: ['gke', 'bigquery', 'cloud run', 'gcs'],
  },
  {
    canonical: 'azure',
    aliases: ['microsoft azure'],
    related: ['aks', 'azure functions', 'cosmos db'],
  },
  {
    canonical: 'terraform',
    aliases: [],
    related: ['terragrunt', 'opentofu', 'pulumi'],
  },
  {
    canonical: 'react',
    aliases: ['react.js', 'reactjs'],
    related: ['next.js', 'nextjs', 'redux', 'react native', 'jsx'],
  },
  {
    canonical: 'node.js',
    aliases: ['node', 'nodejs'],
    related: ['express', 'nestjs', 'fastify'],
  },
  {
    canonical: 'python',
    aliases: [],
    related: ['django', 'flask', 'fastapi', 'pandas', 'numpy'],
  },
  {
    canonical: 'typescript',
    aliases: ['ts'],
    related: ['javascript'],
  },
  {
    canonical: 'java',
    aliases: [],
    related: ['spring', 'spring boot', 'kotlin', 'maven', 'gradle'],
  },
  {
    canonical: 'golang',
    aliases: ['go'],
    related: ['gin', 'grpc'],
  },
  {
    canonical: 'postgresql',
    aliases: ['postgres'],
    related: ['sql', 'pgvector', 'timescaledb'],
  },
  {
    canonical: 'kafka',
    aliases: ['apache kafka'],
    related: ['rabbitmq', 'pulsar'],
  },
  {
    canonical: 'elasticsearch',
    aliases: ['elastic'],
    related: ['opensearch', 'kibana', 'logstash'],
  },
  {
    canonical: 'machine learning',
    aliases: ['ml'],
    related: ['pytorch', 'tensorflow', 'scikit-learn', 'llm', 'nlp', 'deep learning'],
  },
];

/** Lowercases and trims a technology term for consistent lookups. */
export function normalizeTech(term: string): string {
  return term.trim().toLowerCase();
}

// key (canonical or alias) → the full expansion set for that cluster.
const EXPANSION_BY_KEY = new Map<string, string[]>();
for (const cluster of TECH_CLUSTERS) {
  const expansion = [...new Set([cluster.canonical, ...cluster.aliases, ...cluster.related])];
  for (const key of [cluster.canonical, ...cluster.aliases]) {
    EXPANSION_BY_KEY.set(key, expansion);
  }
}

/**
 * Expands a technology term to the set that should match it: the term itself
 * plus its ecosystem when the term is a known canonical or alias. Unknown terms
 * (or ecosystem members) expand to just themselves. Always includes the input.
 */
export function expandTechnology(term: string): string[] {
  const normalized = normalizeTech(term);
  const expansion = EXPANSION_BY_KEY.get(normalized);
  if (!expansion) {
    return [normalized];
  }
  return expansion.includes(normalized) ? expansion : [normalized, ...expansion];
}

/** Full canonical → related adjacency, for surfacing "related tech" in the UI. */
export function technologyGraph(): Array<{ technology: string; related: string[] }> {
  return TECH_CLUSTERS.map((cluster) => ({
    technology: cluster.canonical,
    related: cluster.related,
  }));
}
