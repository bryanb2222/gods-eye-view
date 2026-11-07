// src/data/traffic.test.mjs
// Feed-state honesty for the traffic layer (roadmap L7).
//
// A launch-day stranger runs a keyless build. The layer must not invent
// vehicles. Every surface it drives — the toggle chip, the panel meta line,
// the traffic sync chip — has to say the live flow feed is unavailable.
// The two pure helpers below own that contract; getStats() is a thin caller.
import test from 'node:test';
import assert from 'node:assert/strict';
import trafficLayer, {
  deriveTrafficFlowError,
  trafficFeedPresentation,
} from './traffic.js';
import { DataLayerManager, layerFeedState } from './manager.js';

/**
 * The app's live markers. Case-SENSITIVE on purpose: uppercase LIVE/GPS is
 * how this UI asserts a real feed ("LIVE · TomTom flow", the old "initiating
 * global GPS sync"), while lowercase "add TomTom key for live" names the
 * remedy without claiming one.
 */
const LIVE_CLAIM = /\bLIVE\b|\bGPS\b|\breal[- ]?time\b/;

test('a superseded flow fetch is not an outage', () => {
  assert.equal(deriveTrafficFlowError({ name: 'AbortError', message: 'aborted' }), null);
  assert.equal(deriveTrafficFlowError(null), null);
  assert.equal(deriveTrafficFlowError(undefined), null);
});

test('flow failures map onto short, specific reasons', () => {
  const reason = (message) => deriveTrafficFlowError(new Error(message));
  assert.equal(reason('flow tile 12/1/1: HTTP 503'), 'TomTom key unavailable');
  assert.equal(reason('flow tile 12/1/1: HTTP 429'), 'TomTom daily budget reached');
  assert.equal(reason('flow tile 12/1/1: HTTP 502'), 'TomTom upstream unreachable');
  assert.equal(reason('flow tile 12/1/1: HTTP 504'), 'TomTom upstream unreachable');
  assert.equal(reason('flow tile 12/1/1: HTTP 418'), 'TomTom flow error (HTTP 418)');
  assert.equal(reason('flow fetch failed'), 'TomTom flow unavailable');
});

const VEHICLE_OFF = {
  mode: 'off',
  error: 'No vehicle-position feed',
  loadingLabel: 'UNAVAILABLE — congestion flow is not vehicle positions',
};

test('traffic never presents flow segments or a missing key as vehicles', () => {
  const cases = [
    {},
    { liveMode: false },
    { liveMode: true, coveragePct: 87 },
    { liveMode: true, fetching: true },
    { statusUnavailable: true },
    { liveMode: true, flowError: 'TomTom daily budget reached', coveragePct: 87 },
  ];
  for (const input of cases) {
    assert.deepEqual(trafficFeedPresentation(input), VEHICLE_OFF);
  }
  assert.equal(trafficLayer.getParams().uncoveredRoads, 'hide');
});

test('the traffic label does not claim live or simulated vehicles', () => {
  const label = trafficFeedPresentation({ liveMode: true, coveragePct: 100 }).loadingLabel;
  assert.ok(!LIVE_CLAIM.test(label), label);
  assert.ok(!/SIMULATED/i.test(label), label);
  assert.ok(!label.includes('100'));
});

test('the rendered meta line says vehicle positions are unavailable', () => {
  const mgr = new DataLayerManager({});
  assert.equal(
    mgr._buildMetaText({
      source: 'OpenStreetMap',
      stats: { count: 0, lastUpdate: null, ...trafficFeedPresentation({ liveMode: true }) },
    }),
    'UNAVAILABLE · OpenStreetMap · No vehicle-position feed',
  );
  assert.equal(
    layerFeedState({ count: 0, lastUpdate: null, ...trafficFeedPresentation({ liveMode: true, coveragePct: 90 }) }),
    'unavailable',
  );
});

test('the shipped layer boots with no vehicles and no live claim', () => {
  const stats = trafficLayer.getStats();
  assert.equal(stats.mode, 'off');
  assert.equal(stats.error, 'No vehicle-position feed');
  assert.equal(stats.count, 0);
  assert.ok(!LIVE_CLAIM.test(stats.loadingLabel));
  assert.equal(layerFeedState(stats), 'unavailable');
});
