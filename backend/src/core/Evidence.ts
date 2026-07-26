import { createHash } from 'node:crypto';

/**
 * Evidence attached to lineage events. Every recorded claim carries where it
 * came from and a content hash, so a lineage replay can be checked against the
 * artifact it refers to.
 */
export type EvidenceRecord = {
  source: 'user' | 'model' | 'system' | 'agent';
  /** Present when the evidence refers to produced text. */
  content_sha256?: string;
  content_length?: number;
  /** Free-form provenance, e.g. model_type or the profile that produced it. */
  origin?: string;
  recorded_at: string;
};

export function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export function buildEvidence(
  source: EvidenceRecord['source'],
  content?: string,
  origin?: string,
): EvidenceRecord {
  const evidence: EvidenceRecord = {
    source,
    recorded_at: new Date().toISOString(),
  };
  if (content !== undefined) {
    evidence.content_sha256 = sha256(content);
    evidence.content_length = content.length;
  }
  if (origin !== undefined) {
    evidence.origin = origin;
  }
  return evidence;
}
