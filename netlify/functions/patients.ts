import type { Handler } from '@netlify/functions';

const MOCK_PATIENTS = [
  {
    id: '1',
    firstName: 'Aliou',
    lastName: 'Diop',
    email: 'aliou.diop@example.com',
    phone: '+221771234567',
    dateOfBirth: '1965-03-15',
    gender: 'M',
    bloodType: 'O+',
    dialysisStartDate: '2018-06-20',
    totalSessions: 280,
    createdAt: '2024-01-10T08:30:00Z',
  },
  {
    id: '2',
    firstName: 'Awa',
    lastName: 'Sall',
    email: 'awa.sall@example.com',
    phone: '+221772345678',
    dateOfBirth: '1972-07-22',
    gender: 'F',
    bloodType: 'A+',
    dialysisStartDate: '2019-03-15',
    totalSessions: 240,
    createdAt: '2024-01-11T09:15:00Z',
  },
  {
    id: '3',
    firstName: 'Moussa',
    lastName: 'Ba',
    email: 'moussa.ba@example.com',
    phone: '+221773456789',
    dateOfBirth: '1980-11-05',
    gender: 'M',
    bloodType: 'B+',
    dialysisStartDate: '2017-09-01',
    totalSessions: 350,
    createdAt: '2024-01-12T10:45:00Z',
  },
];

export const handler: Handler = async (event) => {
  const path = event.path.replace('/.netlify/functions/patients', '');
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
    // GET /patients or GET /patients/:id
    if (method === 'GET') {
      if (path === '' || path === '/') {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(MOCK_PATIENTS),
        };
      }

      const id = path.replace('/', '');
      const patient = MOCK_PATIENTS.find(p => p.id === id);

      if (patient) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(patient),
        };
      }

      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: 'Patient not found' }),
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
