const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const BASE_URL = `http://localhost:${process.env.PORT || 5000}/api`;

async function runTestSuite() {
  console.log('====================================================');
  console.log('RUNNING CQMS END-TO-END AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName) => {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  };

  try {
    // Test 1: Health Check
    const healthRes = await axios.get(`${BASE_URL}/health`);
    assert(healthRes.data?.status === 'ok', 'API Health Check returns ok');

    // Test 2: Student Login
    const stuLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      identifier: 'student@cqms.edu',
      password: 'student123'
    });
    const stuToken = stuLoginRes.data.token;
    const stuHeaders = { headers: { Authorization: `Bearer ${stuToken}` } };
    assert(stuLoginRes.data.success && stuLoginRes.data.user.role === 'STUDENT', 'Student authentication successful');

    // Test 3: Library Staff Login
    const libLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      identifier: 'library@cqms.edu',
      password: 'library123'
    });
    const libToken = libLoginRes.data.token;
    const libHeaders = { headers: { Authorization: `Bearer ${libToken}` } };
    assert(libLoginRes.data.success && libLoginRes.data.user.role === 'LIBRARY_STAFF', 'Library Staff authentication successful');

    // Test 4: Fees Staff Login
    const feeLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      identifier: 'fees@cqms.edu',
      password: 'fees123'
    });
    const feeToken = feeLoginRes.data.token;
    const feeHeaders = { headers: { Authorization: `Bearer ${feeToken}` } };
    assert(feeLoginRes.data.success && feeLoginRes.data.user.role === 'FEES_STAFF', 'Fees Staff authentication successful');

    // Test 5: Admin Login
    const adminLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      identifier: 'admin@cqms.edu',
      password: 'admin123'
    });
    const adminToken = adminLoginRes.data.token;
    const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };
    assert(adminLoginRes.data.success && adminLoginRes.data.user.role === 'ADMIN', 'Admin authentication successful');

    // Test 6: Role Authorization Guard (Student accessing Admin route must be rejected)
    try {
      await axios.get(`${BASE_URL}/admin/analytics`, stuHeaders);
      assert(false, 'Student should NOT access /api/admin/analytics');
    } catch (err) {
      assert(err.response?.status === 403, 'Role authorization blocked student from admin endpoint (403)');
    }

    // Test 7: Departments Endpoint
    const deptRes = await axios.get(`${BASE_URL}/departments`, stuHeaders);
    assert(deptRes.data.departments?.length === 2, 'Departments endpoint returns exactly Library and Fees Payment Office');

    // Test 8: Generate Fee Token
    // Service 6 is Semester Fee Payment
    const tokenGenRes = await axios.post(`${BASE_URL}/tokens`, { serviceId: 6 }, stuHeaders);
    const feeTokenData = tokenGenRes.data.token;
    assert(
      tokenGenRes.data.success && feeTokenData.tokenNumber.startsWith('FEE-') && feeTokenData.status === 'WAITING',
      `Student generates Fees Token ${feeTokenData?.tokenNumber} with WAITING status`
    );

    // Test 9: Duplicate Active Token Policy (Should reject second token in same dept)
    try {
      await axios.post(`${BASE_URL}/tokens`, { serviceId: 7 }, stuHeaders);
      assert(false, 'Student should NOT be able to generate duplicate active token in same department');
    } catch (err) {
      assert(err.response?.status === 409, 'Duplicate active token policy correctly rejected with 409 Conflict');
    }

    // Test 10: Fees Staff Calls Next Token
    // Counter 3 is Fees Counter 1
    const callNextRes = await axios.post(`${BASE_URL}/counters/3/call-next`, {}, feeHeaders);
    assert(
      callNextRes.data.success && callNextRes.data.token?.status === 'CALLED',
      `Fees Staff calls next token: ${callNextRes.data.token?.tokenNumber} is now CALLED`
    );

    // Test 11: Cross-department Permission Guard (Library Staff trying to operate Fees counter 3 must be rejected)
    try {
      await axios.post(`${BASE_URL}/counters/3/call-next`, {}, libHeaders);
      assert(false, 'Library Staff should NOT be able to operate Fees Counter 3');
    } catch (err) {
      assert(err.response?.status === 403, 'Library Staff blocked from operating Fees Counter (403)');
    }

    // Test 12: Fees Staff Starts Serving
    const servingRes = await axios.post(`${BASE_URL}/tokens/${feeTokenData.id}/serve`, {}, feeHeaders);
    assert(servingRes.data.success && servingRes.data.token.status === 'SERVING', 'Token status transitioned to SERVING');

    // Test 13: Fees Staff Completes Service
    const completeRes = await axios.post(`${BASE_URL}/tokens/${feeTokenData.id}/complete`, {}, feeHeaders);
    assert(completeRes.data.success && completeRes.data.token.status === 'COMPLETED', 'Token status transitioned to COMPLETED');

    // Test 14: Library Token Flow (Generate LIB token, Call Next, then Skip)
    // Service 1 is Book Issue
    const libTokenRes = await axios.post(`${BASE_URL}/tokens`, { serviceId: 1 }, stuHeaders);
    const libTokenData = libTokenRes.data.token;
    assert(libTokenData.tokenNumber.startsWith('LIB-'), `Library Token generated: ${libTokenData.tokenNumber}`);

    // Call token on Library Counter 1 (id: 1)
    await axios.post(`${BASE_URL}/counters/1/call-next`, {}, libHeaders);

    // Skip token
    const skipRes = await axios.post(
      `${BASE_URL}/tokens/${libTokenData.id}/skip`,
      { reason: 'Missing Library Card' },
      libHeaders
    );
    assert(skipRes.data.success && skipRes.data.token.status === 'SKIPPED', 'Library Token marked as SKIPPED with reason');

    // Test 15: Student History Endpoint
    const historyRes = await axios.get(`${BASE_URL}/tokens/history`, stuHeaders);
    assert(
      historyRes.data.history?.length >= 2,
      `Student history verified: contains ${historyRes.data.history?.length} historical tokens`
    );

    // Test 16: Admin Analytics
    const analyticsRes = await axios.get(`${BASE_URL}/admin/analytics`, adminHeaders);
    assert(
      analyticsRes.data.kpis?.totalTokens >= 2 && analyticsRes.data.departmentBreakdown?.length === 2,
      'Admin analytics KPI and department breakdowns computed successfully'
    );

    // Test 17: Admin Reports CSV
    const csvRes = await axios.get(`${BASE_URL}/admin/reports?format=csv`, adminHeaders);
    assert(
      typeof csvRes.data === 'string' && csvRes.data.includes('Token Number'),
      'Admin CSV report export generated successfully'
    );

    console.log('\n====================================================');
    console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test Suite encountered an unexpected error:', error.response?.data || error.message);
    process.exit(1);
  }
}

runTestSuite();
