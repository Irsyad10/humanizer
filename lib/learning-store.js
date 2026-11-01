/**
 * Learning History & Prompt Research Dataset Store (Tahap 1 Roadmap)
 * Menyimpan setiap percobaan perubahan teks AI -> Human untuk analisis dan pembelajaran berkelanjutan
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'learning-history.json');

// In-memory fallback if file system write is restricted
let memoryStore = [];

/**
 * Ensure data directory and file exist
 */
function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(FILE_PATH)) {
      fs.writeFileSync(FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('[LearningStore] Warning: Could not initialize data directory, using memoryStore.', err.message);
  }
}

/**
 * Read all records
 */
export function getStoredExperiments() {
  ensureDataFile();
  try {
    if (fs.existsSync(FILE_PATH)) {
      const content = fs.readFileSync(FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content || '[]');
      memoryStore = parsed;
      return parsed;
    }
  } catch (err) {
    console.warn('[LearningStore] Read error, fallback to memoryStore:', err.message);
  }
  return memoryStore;
}

/**
 * Save a new experiment record
 * @param {object} experiment
 */
export function recordExperiment({
  originalText,
  humanizedText,
  tone,
  providerUsed,
  aiScoreInitial,
  humanScoreResult,
  burstinessBefore,
  burstinessAfter,
  promptVersion = 'v1.4-burstiness-jitter'
}) {
  const records = getStoredExperiments();

  const id = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const record = {
    id,
    timestamp: new Date().toISOString(),
    promptVersion,
    tone,
    providerUsed,
    originalText,
    humanizedText,
    originalWordCount: originalText.trim().split(/\s+/).length,
    humanizedWordCount: humanizedText.trim().split(/\s+/).length,
    aiScoreInitial,
    humanScoreResult,
    scoreImprovement: Math.max(0, humanScoreResult - (100 - aiScoreInitial)),
    burstinessBefore: burstinessBefore || 0,
    burstinessAfter: burstinessAfter || 0,
    rating: null, // 'positive' (👍) or 'negative' (👎)
    userNotes: ''
  };

  records.unshift(record); // Prepend to top

  // Keep latest 200 records
  const trimmed = records.slice(0, 200);

  try {
    ensureDataFile();
    fs.writeFileSync(FILE_PATH, JSON.stringify(trimmed, null, 2), 'utf-8');
    memoryStore = trimmed;
  } catch (err) {
    console.warn('[LearningStore] Save error, updated memoryStore only:', err.message);
    memoryStore = trimmed;
  }

  return record;
}

/**
 * Update rating or user notes for a specific experiment (Active Learning Feedback)
 */
export function updateExperimentFeedback(id, { rating, userNotes }) {
  const records = getStoredExperiments();
  const index = records.findIndex(r => r.id === id);

  if (index === -1) {
    return null;
  }

  if (rating !== undefined) records[index].rating = rating;
  if (userNotes !== undefined) records[index].userNotes = userNotes;

  try {
    ensureDataFile();
    fs.writeFileSync(FILE_PATH, JSON.stringify(records, null, 2), 'utf-8');
    memoryStore = records;
  } catch (err) {
    memoryStore = records;
  }

  return records[index];
}

/**
 * Get statistical summary for research evaluation
 */
export function getDatasetAnalytics() {
  const records = getStoredExperiments();
  const total = records.length;

  if (total === 0) {
    return {
      totalExperiments: 0,
      avgHumanScore: 0,
      avgImprovement: 0,
      positiveRatings: 0,
      negativeRatings: 0,
      tonePerformance: {}
    };
  }

  const sumHumanScore = records.reduce((acc, r) => acc + (r.humanScoreResult || 0), 0);
  const sumImprovement = records.reduce((acc, r) => acc + (r.scoreImprovement || 0), 0);
  const positive = records.filter(r => r.rating === 'positive').length;
  const negative = records.filter(r => r.rating === 'negative').length;

  // Group by tone
  const toneMap = {};
  records.forEach(r => {
    if (!toneMap[r.tone]) toneMap[r.tone] = { count: 0, sumScore: 0 };
    toneMap[r.tone].count++;
    toneMap[r.tone].sumScore += (r.humanScoreResult || 0);
  });

  const tonePerformance = {};
  Object.keys(toneMap).forEach(tone => {
    tonePerformance[tone] = {
      trials: toneMap[tone].count,
      avgScore: Math.round(toneMap[tone].sumScore / toneMap[tone].count)
    };
  });

  return {
    totalExperiments: total,
    avgHumanScore: Math.round(sumHumanScore / total),
    avgImprovement: Math.round(sumImprovement / total),
    positiveRatings: positive,
    negativeRatings: negative,
    tonePerformance
  };
}
