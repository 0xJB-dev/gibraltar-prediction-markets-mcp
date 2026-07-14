import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  search,
  fetchDocument,
  getRegulation,
  getSchedule,
  getPart,
  getDefinition,
  listRegulations,
  data,
  documents,
} from '../dist/data.js';

test('data collection lengths', () => {
  assert.equal(data.regulations.length, 34);
  assert.equal(data.schedules.length, 3);
  assert.equal(data.definitions.length, 14);
});

test('search returns reg-19 as top hit for safeguarding client money', () => {
  const results = search('safeguarding client money');
  assert.ok(Array.isArray(results) && results.length > 0);
  const top = results[0];
  const topId = top.id ?? top.document?.id ?? top.doc?.id;
  assert.equal(topId, 'reg-19');
});

test('getDefinition settlement source is defined and mentions reference', () => {
  const def = getDefinition('settlement source');
  assert.ok(def, 'definition should be defined');
  const text = JSON.stringify(def);
  assert.match(text, /reference/i);
});

test('getRegulation(12) title includes Approval', () => {
  const reg = getRegulation(12);
  assert.ok(reg, 'regulation 12 should exist');
  assert.match(reg.title, /Approval/);
});

test('getSchedule(2) title includes CORE AUTHORISATION', () => {
  const sched = getSchedule(2);
  assert.ok(sched, 'schedule 2 should exist');
  assert.match(sched.title, /CORE AUTHORISATION/);
});

test('fetchDocument(reg-33) text mentions Financial Services Act 2019', () => {
  const doc = fetchDocument('reg-33');
  assert.ok(doc, 'reg-33 document should exist');
  const text = doc.text ?? JSON.stringify(doc);
  assert.match(text, /Financial Services Act 2019/);
});

test('every documents[i].id is unique', () => {
  const ids = documents.map((d) => d.id);
  const unique = new Set(ids);
  assert.equal(unique.size, ids.length);
});
