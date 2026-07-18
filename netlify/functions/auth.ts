import type { Handler } from '@netlify/functions';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = 'd5c15007d6bcbb990341ebc08cc3cac2923293002df9f4b85f561693981d9f75d576d4b04b1ca57b2cbc4378626e6830';

interface User {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}

// Mock user data
const MOCK_USER: User = {
  id: '1',
  email: 'b.camara@clinikdia.sn',
  role: 'admin',
  permissions: ['all'],
};

const MOCK_PASSWORD = 'Admin1234';

export const handler: Handler = async (event) => {
  const path = event.path.replace('/.netlify/functions/auth', '');
  const method = event.httpMethod;

  // Set CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight
  if (method === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // POST /auth/login
    if (path === '/login' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { email, password } = body;

      if (email === MOCK_USER.email && password === MOCK_PASSWORD) {
        const token = jwt.sign(
          { id: MOCK_USER.id, email: MOCK_USER.email, role: MOCK_USER.role },
          JWT_SECRET,
          { expiresIn: '30m' }
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            access_token: token,
            user: MOCK_USER,
          }),
        };
      }

      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: 'Invalid credentials' }),
      };
    }

    // GET /auth/me
    if (path === '/me' && method === 'GET') {
      const authHeader = event.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: 'Unauthorized' }),
        };
      }

      const token = authHeader.substring(7);
      try {
        jwt.verify(token, JWT_SECRET);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(MOCK_USER),
        };
      } catch {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: 'Invalid token' }),
        };
      }
    }

    // POST /auth/logout
    if (path === '/logout' && method === 'POST') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Logged out' }),
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Not found' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
