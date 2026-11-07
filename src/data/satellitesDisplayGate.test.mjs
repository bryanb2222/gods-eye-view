import assert from 'node:assert/strict';
import test from 'node:test';
import { twoline2satrec } from 'satellite.js';
import * as Cesium from 'cesium';
import satellitesLayer, {
  satellitePositionsDisplayed,
  _catalogGroupForTest,
  _clearDenseCatalogStateForTest,
  _setDenseCatalogStateForTest,
  _setSatelliteLabelLifecycleStateForTest,
  _trackIssForTest,
} from './satellites.js';

const TLE = [
  'STARLINK-TEST',
  '1 44444U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927',
  '2 44444  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537',
].join('\n');

const ISS = [
  'ISS (ZARYA)',
  '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927',
  '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537',
].join('\n');

async function waitFor(predicate, maxTicks = 50) {
  for (let i = 0; i < maxTicks; i++) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  return false;
}

test('propagated satellite geometry stays undisplayed', () => {
  assert.equal(satellitePositionsDisplayed(), false);
});

test('explicit point and orbit requests stay off', () => {
  satellitesLayer.setParams({ showPoints: true, showOrbits: true, catalog: 'core' });
  assert.deepEqual(
    {
      showPoints: satellitesLayer.getParams().showPoints,
      showOrbits: satellitesLayer.getParams().showOrbits,
    },
    { showPoints: false, showOrbits: false },
  );
  assert.deepEqual(satellitesLayer.getRowControls(), { chips: [], legend: [] });
});

test('saved selection and track-by-id create no entity, ring, or label', () => {
  const point = { position: new Cesium.Cartesian3(), show: true };
  const viewer = {
    entities: new Cesium.EntityCollection(),
    trackedEntity: undefined,
    scene: { primitives: { remove() {} }, frameState: { frameNumber: 1 } },
  };
  const [, line1, line2] = ISS.split('\n');
  _setSatelliteLabelLifecycleStateForTest({
    viewer,
    satrec: twoline2satrec(line1, line2),
    point,
    overlayHost: {
      setEntries() { throw new Error('ISS overlay must not be published'); },
      setVisible() {},
      clearSource() {},
    },
  });
  try {
    assert.equal(satellitesLayer.getParams().showOrbits, false);
    satellitesLayer.setParams({ selectedSatTrackingId: 25544, showOrbits: true });
    assert.equal(satellitesLayer.getParams().selectedSatTrackingId, null);
    assert.equal(viewer.entities.values.length, 0);
    assert.equal(satellitesLayer.trackById(25544), false);
    assert.equal(_trackIssForTest(), null);
    assert.equal(viewer.entities.values.length, 0);
    assert.equal(viewer.trackedEntity, undefined);
  } finally {
    _clearDenseCatalogStateForTest();
  }
});

test('dense catalog stores a name and no propagated point', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: true, text: async () => TLE });
    _setDenseCatalogStateForTest({ catalog: 'core', showPoints: true });
    satellitesLayer.setParams({ catalog: 'dense', showPoints: true, showOrbits: true });
    assert.equal(await waitFor(() => _catalogGroupForTest(44444) === 'dense'), true);
    assert.equal(satellitesLayer.getParams().showPoints, false);
    assert.equal(satellitesLayer.getAllPositions().length, 0);
    assert.equal(satellitesLayer.getDetectableObjects().length, 0);
  } finally {
    globalThis.fetch = originalFetch;
    _clearDenseCatalogStateForTest();
    assert.equal(satellitesLayer.getParams().showPoints, false);
    assert.equal(satellitesLayer.getParams().showOrbits, false);
  }
});
