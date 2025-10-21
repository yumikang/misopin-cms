async function testAdminAPI() {
  console.log('🔐 Logging in as SUPER_ADMIN...\n');

  // Step 1: Login
  const loginResponse = await fetch('http://localhost:3000/api/auth/cms-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'wonjang@misopin.com',
      password: 'Misopin2025',
    }),
  });

  const loginData = await loginResponse.json();

  if (!loginData.success || !loginData.token) {
    console.error('❌ Login failed:', loginData);
    process.exit(1);
  }

  const token = loginData.token;
  console.log('✅ Login successful');
  console.log(`Token: ${token.substring(0, 50)}...\n`);

  // Step 2: Test GET endpoint
  console.log('📋 Testing GET /api/admin/clinic-info...\n');

  const getResponse = await fetch('http://localhost:3000/api/admin/clinic-info', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const getData = await getResponse.json();
  console.log('Response:', JSON.stringify(getData, null, 2));

  if (getData.success) {
    console.log('\n✅ Admin GET API working!');
    console.log(`   ID: ${getData.data.id}`);
    console.log(`   Phone: ${getData.data.phonePrimary}`);
    console.log(`   Version: ${getData.data.version}`);
  } else {
    console.log('\n❌ Admin GET API failed:', getData);
  }

  // Step 3: Test PUT endpoint
  console.log('\n📝 Testing PUT /api/admin/clinic-info...\n');

  const updateData = {
    ...getData.data,
    hoursLunch: '점심시간 12:30-13:30', // Update lunch hours
  };

  const putResponse = await fetch('http://localhost:3000/api/admin/clinic-info', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updateData),
  });

  const putData = await putResponse.json();
  console.log('Response:', JSON.stringify(putData, null, 2));

  if (putData.success) {
    console.log('\n✅ Admin PUT API working!');
    console.log(`   Version updated: ${getData.data.version} → ${putData.data.version}`);
  } else {
    console.log('\n❌ Admin PUT API failed:', putData);
  }

  console.log('\n🎉 Admin API test complete!');
}

testAdminAPI().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
