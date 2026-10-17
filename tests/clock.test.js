const test = require('node:test');
const assert = require('node:assert/strict');
const { handAngles, clockTime } = require('../clock.js');

const local = (hour, minute = 0, second = 0, ms = 0) => new Date(2026, 0, 15, hour, minute, second, ms);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('midnight and noon both point straight up', () => {
  for (const hour of [0, 12, 24]) assert.deepEqual(handAngles(local(hour)), { hour: 0, minute: 0, second: 0 });
});

test('all hands include fractional seconds, minutes, and hours', () => {
  const angles = handAngles(local(3, 15, 30, 500));
  close(angles.hour, 97.75416666666666);
  close(angles.minute, 93.05);
  close(angles.second, 183);
});

test('hour rollover and midnight wrap without accumulated drift', () => {
  const before = handAngles(local(11, 59, 59, 999));
  assert.ok(before.hour < 360 && before.hour > 359.999);
  assert.ok(before.minute < 360 && before.minute > 359.999);
  close(before.second, 359.994);
  assert.deepEqual(handAngles(local(11, 60)), { hour: 0, minute: 0, second: 0 });
  assert.deepEqual(handAngles(local(23, 60)), { hour: 0, minute: 0, second: 0 });
  assert.deepEqual(handAngles(local(8, 60)), { hour: 270, minute: 0, second: 0 });
});

test('live time uses the supplied wall clock, including resume and corrections', () => {
  const now = local(7, 45, 12, 123);
  assert.equal(clockTime(now).getTime(), now.getTime());
  assert.notEqual(clockTime(now), now);
  const resumed = local(18, 20, 1);
  assert.equal(clockTime(resumed).getTime(), resumed.getTime());
  assert.equal(clockTime(local(6)).getTime(), local(6).getTime());
});

test('demo starts at 10:10, runs at 60×, and crosses noon and midnight', () => {
  const now = local(23);
  const start = clockTime(now, 0);
  assert.equal(start.getHours(), 10);
  assert.equal(start.getMinutes(), 10);
  assert.equal(clockTime(now, 1000).getTime() - start.getTime(), 60000);
  const noon = clockTime(now, 110000);
  assert.equal(noon.getHours(), 12);
  assert.deepEqual(handAngles(noon), { hour: 0, minute: 0, second: 0 });
  const midnight = clockTime(now, 830000);
  assert.equal(midnight.getHours(), 0);
  assert.equal(midnight.getDate(), 2);
  assert.deepEqual(handAngles(midnight), { hour: 0, minute: 0, second: 0 });
});

test('returning from demo immediately restores live local time', () => {
  const now = local(17, 42, 13, 251);
  assert.notEqual(clockTime(now, 1234).getTime(), now.getTime());
  assert.equal(clockTime(now, null).getTime(), now.getTime());
  assert.deepEqual(handAngles(clockTime(now, null)), handAngles(now));
});
