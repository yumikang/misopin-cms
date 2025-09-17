const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://brewed_dongeuncheon:mKWJlFOMPCZJEYsWRyflRRSP@141.164.60.51:5432/brewed_dongeuncheon',
  ssl: {
    rejectUnauthorized: false,
    require: true
  }
});

async function testConnection() {
  try {
    console.log('Attempting to connect to database...');
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully!');
    console.log('Current time from DB:', result.rows[0].now);

    // Check if users table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'users'
      );
    `);
    console.log('Users table exists:', tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      const userCount = await pool.query('SELECT COUNT(*) FROM users');
      console.log('Number of users:', userCount.rows[0].count);
    }

  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testConnection();