// Simulated Mode Detection Test
async function testDetection(simulatedFetch) {
  let mode = 'MODE_A';
  try {
    const res = await simulatedFetch('/api/history?limit=1');
    const cType = res.headers['content-type'] || '';
    if (res.ok && cType.includes('application/json')) {
      mode = 'MODE_B';
    } else {
      mode = 'MODE_A';
    }
  } catch (e) {
    mode = 'MODE_A';
  }
  return mode;
}

async function run() {
  // 1. Test against real local server (should be MODE_B)
  const realRes = await fetch('http://localhost:3333/api/history?limit=1');
  const headers = {};
  realRes.headers.forEach((v, k) => headers[k] = v);
  const modeReal = await testDetection(() => Promise.resolve({ ok: realRes.ok, headers }));
  console.log('Real server mode:', modeReal, '(Expected: MODE_B)');

  // 2. Test against simulated Vercel static rewrite (returns HTML with ok: true or 404)
  const mockVercel = () => Promise.resolve({ ok: true, headers: { 'content-type': 'text/html; charset=utf-8' } });
  const modeVercel = await testDetection(mockVercel);
  console.log('Simulated Vercel mode:', modeVercel, '(Expected: MODE_A)');

  // 3. Test against network error
  const mockError = () => Promise.reject(new Error('Network error'));
  const modeError = await testDetection(mockError);
  console.log('Simulated offline mode:', modeError, '(Expected: MODE_A)');

  if (modeReal === 'MODE_B' && modeVercel === 'MODE_A' && modeError === 'MODE_A') {
    console.log('ALL MODE TESTS PASSED!');
  } else {
    console.error('Mode test FAILED');
    process.exit(1);
  }
}

run().catch(console.error);
