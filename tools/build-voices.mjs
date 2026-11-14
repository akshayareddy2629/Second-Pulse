#!/usr/bin/env node
/* ==========================================================================
   Records every JARVIS / FRIDAY line as an audio clip, so JARVIS always
   sounds male and FRIDAY always sounds female, in English, Hindi and Telugu,
   on any phone or browser (phones rarely ship a male Hindi or Telugu voice).

   Voices: Microsoft neural voices, through the free `edge-tts` tool.
     pip install edge-tts                  (or: pipx install edge-tts)
     node tools/build-voices.mjs           records new or changed lines only
     node tools/build-voices.mjs --force   re-records everything (e.g. after changing a voice)
   If edge-tts is not on your PATH:  EDGE_TTS=/path/to/edge-tts node tools/build-voices.mjs

   Reads   js/assistant-lines.js
   Writes  assets/voice/<persona>/<lang>/<key>.<hash>.mp3
           js/voice-clips.js  (the index the site uses to find each clip)
   ========================================================================== */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets', 'voice');
const INDEX = path.join(ROOT, 'js', 'voice-clips.js');
const EDGE = process.env.EDGE_TTS || 'edge-tts';
const FORCE = process.argv.includes('--force');
const PARALLEL = 4;

// JARVIS: British male in English (a nod to Paul Bettany), Indian male voices in Hindi and Telugu.
// FRIDAY: Irish female in English (a nod to Kerry Condon), Indian female voices in Hindi and Telugu.
const VOICES = {
  jarvis: { en: 'en-GB-RyanNeural', hi: 'hi-IN-MadhurNeural', te: 'te-IN-MohanNeural' },
  friday: { en: 'en-IE-EmilyNeural', hi: 'hi-IN-SwaraNeural', te: 'te-IN-ShrutiNeural' },
};
const RATE = { jarvis: '-4%', friday: '+0%' };

// Load the lines exactly as the site does
const sandbox = { window: {}, TextEncoder };
vm.runInNewContext(readFileSync(path.join(ROOT, 'js', 'assistant-lines.js'), 'utf8'), sandbox, { filename: 'assistant-lines.js' });
const { T, line, spoken, hash } = sandbox.window.SP_LINES;

const jobs = [];
for (const who of Object.keys(VOICES)) {
  for (const lang of Object.keys(T)) {
    for (const key of Object.keys(T.en)) {
      if (T[lang][key] == null) console.warn(`! ${lang}.${key} is missing, it will use the English line`);
      const said = spoken(line(lang, who, key));
      if (!said) continue;
      const id = `${who}/${lang}/${key}`;
      const h = hash(said);
      jobs.push({ id, h, said, voice: VOICES[who][lang], rate: RATE[who], file: path.join(OUT, `${id}.${h}.mp3`) });
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function record(job) {
  const tmp = path.join(os.tmpdir(), `sp-line-${process.pid}-${Math.random().toString(36).slice(2)}.txt`);
  const part = `${job.file}.part`;
  writeFileSync(tmp, job.said, 'utf8');
  mkdirSync(path.dirname(job.file), { recursive: true });
  try {
    for (let attempt = 1; ; attempt++) {
      try {
        await run(EDGE, ['--voice', job.voice, `--rate=${job.rate}`, '--file', tmp, '--write-media', part], { timeout: 90000 });
        if (statSync(part).size < 2000) throw new Error('the service returned almost no audio');
        renameSync(part, job.file);
        return;
      } catch (err) {
        if (attempt >= 3) throw err;
        await sleep(1500 * attempt);
      }
    }
  } finally {
    rmSync(tmp, { force: true });
    rmSync(part, { force: true });
  }
}

const todo = jobs.filter((j) => FORCE || !existsSync(j.file));
console.log(`${jobs.length} lines, ${todo.length} to record`);

const failed = [];
let next = 0, done = 0;
async function worker() {
  while (next < todo.length) {
    const job = todo[next++];
    try {
      await record(job);
      done++;
      process.stdout.write(`\r  recorded ${done}/${todo.length}`);
    } catch (err) {
      failed.push(job.id);
      const why = String(err.stderr || err.message || err).trim().split('\n').pop();
      console.error(`\n! ${job.id} (${job.voice}): ${why}`);
    }
  }
}
await Promise.all(Array.from({ length: Math.min(PARALLEL, todo.length) }, worker));
if (todo.length) process.stdout.write('\n');

// Remove clips for lines that changed or no longer exist (only .mp3 files inside assets/voice)
const keep = new Set(jobs.map((j) => j.file));
let removed = 0;
for (const who of Object.keys(VOICES)) {
  for (const lang of Object.keys(T)) {
    const dir = path.join(OUT, who, lang);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      const full = path.join(dir, f);
      if (f.endsWith('.mp3') && !keep.has(full)) { rmSync(full); removed++; }
    }
  }
}

// Index of the clips that exist, so the site never asks for a missing file
const clips = {};
for (const j of jobs) if (existsSync(j.file)) clips[j.id] = j.h;
const index = { base: 'assets/voice/', voices: VOICES, clips };
writeFileSync(INDEX,
  '/* Generated by tools/build-voices.mjs. Do not edit by hand.\n' +
  '   Each entry maps <persona>/<lang>/<key> to the hash in its file name. */\n' +
  `window.SP_CLIPS = ${JSON.stringify(index, null, 1)};\n`);

console.log(`index: ${Object.keys(clips).length}/${jobs.length} clips, ${removed} stale removed`);
if (failed.length) {
  console.error(`${failed.length} lines failed; the site will use the browser voice for them. Run again to retry.`);
  process.exitCode = 1;
}
