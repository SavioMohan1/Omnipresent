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

let cachedChunks: PolicyChunk[] | null = null;
let searchIndex: MiniSearch<PolicyChunk> | null = null;

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

  // Initialize MiniSearch for fast keyword & BM25 retrieval
  searchIndex = new MiniSearch<PolicyChunk>({
    fields: ['documentTitle', 'section', 'text'],
    storeFields: ['id', 'documentTitle', 'section', 'text', 'tags'],
    searchOptions: {
      boost: { documentTitle: 2, section: 1.5, text: 1 },
      fuzzy: 0.2,
      prefix: true,
    },
  });

  searchIndex.addAll(chunks);
  return cachedChunks;
}

export function retrieveRelevantPolicyChunks(
  query: string,
  limit: number = 6
): PolicyChunk[] {
  loadPolicyCorpus();
  if (!searchIndex) return [];

  const results = searchIndex.search(query);
  const chunks = loadPolicyCorpus();
  const chunkMap = new Map(chunks.map((c) => [c.id, c]));

  const topChunks: PolicyChunk[] = [];
  for (const res of results.slice(0, limit)) {
    const chunk = chunkMap.get(res.id);
    if (chunk) topChunks.push(chunk);
  }

  // Fallback: if search returns fewer than 3 chunks, include core company/security/IT policies
  if (topChunks.length < 3) {
    for (const chunk of chunks) {
      if (!topChunks.some((c) => c.id === chunk.id)) {
        topChunks.push(chunk);
        if (topChunks.length >= limit) break;
      }
    }
  }

  return topChunks;
}

export function getPolicyContextForEmployee(
  employee: CanonicalEmployee
): PolicyChunk[] {
  const query = `${employee.department} ${employee.jobTitle} ${employee.location} IT security cafeteria onboarding`;
  return retrieveRelevantPolicyChunks(query, 8);
}
