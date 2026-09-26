import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import MiniSearch from 'minisearch';
import { CanonicalEmployee } from '@/lib/types/models';

export interface PolicyChunk {
  id: string;
  documentTitle: string;
  section: string;
  text: string;
  tags: string[];
}

export interface RetrievalResult extends PolicyChunk {
  similarityScore: number;
  retrievalMode: 'HYBRID' | 'VECTOR_NN' | 'LEXICAL_BM25';
  vectorSimilarity: number;
  lexicalRank: number;
}

let cachedChunks: PolicyChunk[] | null = null;
let searchIndex: MiniSearch<PolicyChunk> | null = null;
let chunkVectors: Map<string, Map<string, number>> | null = null;
let chunkNorms: Map<string, number> | null = null;
let vocabularyIdf: Map<string, number> | null = null;

// Clean and tokenize text for vector space representation
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

// Generate character n-grams and subwords for dense semantic overlap
function generateSubwords(words: string[]): string[] {
  const terms: string[] = [...words];
  for (const w of words) {
    if (w.length >= 4) {
      for (let i = 0; i <= w.length - 3; i++) {
        terms.push(`_${w.slice(i, i + 3)}`);
      }
    }
  }
  return terms;
}

export function loadPolicyCorpus(): PolicyChunk[] {
  if (cachedChunks) return cachedChunks;

  const policiesDir = path.join(process.cwd(), 'data', 'policies');
  if (!fs.existsSync(policiesDir)) {
    cachedChunks = [];
    return cachedChunks;
  }

  const files = fs.readdirSync(policiesDir).filter((f) => f.endsWith('.md'));
  const chunks: PolicyChunk[] = [];

  for (const file of files) {
    const filePath = path.join(policiesDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    let docTitle = file.replace('.md', '').replace(/-/g, ' ');
    let currentSection = 'General';
    let currentLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('# ')) {
        docTitle = line.replace('# ', '').trim();
      } else if (line.startsWith('## ')) {
        if (currentLines.length > 0) {
          chunks.push({
            id: `${file}-${currentSection.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            documentTitle: docTitle,
            section: currentSection,
            text: currentLines.join('\n').trim(),
            tags: [docTitle.toLowerCase(), currentSection.toLowerCase()],
          });
          currentLines = [];
        }
        currentSection = line.replace('## ', '').trim();
      } else {
        currentLines.push(line);
      }
    }

    if (currentLines.length > 0) {
      chunks.push({
        id: `${file}-${currentSection.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        documentTitle: docTitle,
        section: currentSection,
        text: currentLines.join('\n').trim(),
        tags: [docTitle.toLowerCase(), currentSection.toLowerCase()],
      });
    }
  }

  cachedChunks = chunks;

  // 1. Build Lexical BM25 Index
  searchIndex = new MiniSearch<PolicyChunk>({
    fields: ['documentTitle', 'section', 'text'],
    storeFields: ['id', 'documentTitle', 'section', 'text', 'tags'],
    searchOptions: {
      boost: { documentTitle: 2.5, section: 2.0, text: 1.0 },
      fuzzy: 0.25,
      prefix: true,
    },
  });
  searchIndex.addAll(chunks);

  // 2. Build Dense Semantic Vector Index (TF-IDF + Subword Nearest Neighbor)
  const docFreq = new Map<string, number>();
  const chunkTermsMap = new Map<string, string[]>();

  for (const chunk of chunks) {
    const fullContent = `${chunk.documentTitle} ${chunk.section} ${chunk.text} ${chunk.tags.join(' ')}`;
    const terms = generateSubwords(tokenize(fullContent));
    chunkTermsMap.set(chunk.id, terms);

    const uniqueTerms = new Set(terms);
    for (const t of uniqueTerms) {
      docFreq.set(t, (docFreq.get(t) || 0) + 1);
    }
  }

  vocabularyIdf = new Map<string, number>();
  const totalDocs = chunks.length;
  for (const [term, count] of docFreq.entries()) {
    vocabularyIdf.set(term, Math.log((totalDocs + 1) / (count + 1)) + 1);
  }

  chunkVectors = new Map<string, Map<string, number>>();
  chunkNorms = new Map<string, number>();

  for (const [id, terms] of chunkTermsMap.entries()) {
    const termCounts = new Map<string, number>();
    for (const t of terms) {
      termCounts.set(t, (termCounts.get(t) || 0) + 1);
    }

    const vec = new Map<string, number>();
    let sumSq = 0;

    for (const [term, count] of termCounts.entries()) {
      const idf = vocabularyIdf.get(term) || 1;
      const weight = (1 + Math.log(count)) * idf;
      vec.set(term, weight);
      sumSq += weight * weight;
    }

    chunkVectors.set(id, vec);
    chunkNorms.set(id, Math.sqrt(sumSq) || 1);
  }

  return cachedChunks;
}

/**
 * Dense Cosine Similarity Nearest Neighbor (k-NN) Search
 */
function denseKnnSearch(query: string, chunks: PolicyChunk[], topK: number = 8): { id: string; similarity: number }[] {
  if (!vocabularyIdf || !chunkVectors || !chunkNorms) return [];

  const queryTerms = generateSubwords(tokenize(query));
  const queryCounts = new Map<string, number>();
  for (const t of queryTerms) {
    queryCounts.set(t, (queryCounts.get(t) || 0) + 1);
  }

  const queryVec = new Map<string, number>();
  let qSumSq = 0;
  for (const [term, count] of queryCounts.entries()) {
    const idf = vocabularyIdf.get(term) || 1;
    const weight = (1 + Math.log(count)) * idf;
    queryVec.set(term, weight);
    qSumSq += weight * weight;
  }
  const qNorm = Math.sqrt(qSumSq) || 1;

  const scores: { id: string; similarity: number }[] = [];

  for (const chunk of chunks) {
    const docVec = chunkVectors.get(chunk.id);
    const dNorm = chunkNorms.get(chunk.id) || 1;
    if (!docVec) continue;

    let dotProduct = 0;
    for (const [term, qWeight] of queryVec.entries()) {
      const dWeight = docVec.get(term);
      if (dWeight) {
        dotProduct += qWeight * dWeight;
      }
    }

    const cosineSim = dotProduct / (qNorm * dNorm);
    scores.push({ id: chunk.id, similarity: cosineSim });
  }

  scores.sort((a, b) => b.similarity - a.similarity);
  return scores.slice(0, topK);
}

/**
 * Hybrid RAG Search: Convex combination of k-NN Dense Vector Cosine Similarity
 * and BM25 Lexical Matching with Reciprocal Rank Fusion (RRF).
 */
export function retrieveHybridPolicyChunks(
  query: string,
  limit: number = 6
): RetrievalResult[] {
  const chunks = loadPolicyCorpus();
  if (chunks.length === 0) return [];

  const chunkMap = new Map(chunks.map((c) => [c.id, c]));

  // 1. Dense k-NN search
  const knnResults = denseKnnSearch(query, chunks, 12);
  const knnRankMap = new Map(knnResults.map((r, idx) => [r.id, { rank: idx + 1, similarity: r.similarity }]));

  // 2. Lexical BM25 search
  const lexicalResults = searchIndex?.search(query) || [];
  const lexicalRankMap = new Map(lexicalResults.map((r, idx) => [r.id, idx + 1]));

  // 3. Reciprocal Rank Fusion (RRF) & Hybrid Scoring
  const fusedScores = new Map<string, { rrf: number; mode: 'HYBRID' | 'VECTOR_NN' | 'LEXICAL_BM25'; sim: number; lexRank: number }>();

  const candidateIds = new Set([
    ...knnResults.map((r) => r.id),
    ...lexicalResults.slice(0, 12).map((r) => r.id),
  ]);

  for (const id of candidateIds) {
    const knn = knnRankMap.get(id);
    const lex = lexicalRankMap.get(id);

    const knnScore = knn ? 1 / (60 + knn.rank) : 0;
    const lexScore = lex ? 1 / (60 + lex) : 0;
    const rrf = knnScore * 0.55 + lexScore * 0.45;

    let mode: 'HYBRID' | 'VECTOR_NN' | 'LEXICAL_BM25' = 'HYBRID';
    if (knn && !lex) mode = 'VECTOR_NN';
    if (!knn && lex) mode = 'LEXICAL_BM25';

    fusedScores.set(id, {
      rrf,
      mode,
      sim: knn?.similarity || 0,
      lexRank: lex || 999,
    });
  }

  const sortedCandidates = Array.from(fusedScores.entries())
    .sort((a, b) => b[1].rrf - a[1].rrf)
    .slice(0, limit);

  const results: RetrievalResult[] = [];
  for (const [id, meta] of sortedCandidates) {
    const chunk = chunkMap.get(id);
    if (chunk) {
      results.push({
        ...chunk,
        similarityScore: meta.rrf,
        retrievalMode: meta.mode,
        vectorSimilarity: Math.round(meta.sim * 100),
        lexicalRank: meta.lexRank,
      });
    }
  }

  // Fallback if sparse results
  if (results.length < 3) {
    for (const chunk of chunks) {
      if (!results.some((r) => r.id === chunk.id)) {
        results.push({
          ...chunk,
          similarityScore: 0.01,
          retrievalMode: 'VECTOR_NN',
          vectorSimilarity: 50,
          lexicalRank: 999,
        });
        if (results.length >= limit) break;
      }
    }
  }

  return results;
}

/**
 * Backward compatibility alias
 */
export function retrieveRelevantPolicyChunks(
  query: string,
  limit: number = 6
): PolicyChunk[] {
  return retrieveHybridPolicyChunks(query, limit);
}

export function getPolicyContextForEmployee(
  employee: CanonicalEmployee
): PolicyChunk[] {
  const query = `${employee.department} ${employee.jobTitle} ${employee.location} IT security cafeteria onboarding workplace equipment`;
  return retrieveHybridPolicyChunks(query, 8);
}
