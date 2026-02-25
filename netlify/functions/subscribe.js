exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const email = body.email;

    console.log('Subscribe attempt for:', email);
    console.log('KIT_API_KEY present:', !!process.env.KIT_API_KEY);
    console.log('KIT_FORM_ID:', process.env.KIT_FORM_ID);

    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email required' }) };
    }

    const url = `https://api.convertkit.com/v3/forms/${process.env.KIT_FORM_ID}/subscribe`;
    console.log('Posting to:', url);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.KIT_API_KEY,
        email,
      }),
    });

    const text = await res.text();
    console.log('Kit response status:', res.status);
    console.log('Kit response body:', text);

    const data = JSON.parse(text);

    if (data.subscription) {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: data.message || 'Subscription failed', raw: data }),
      };
    }
  } catch (err) {
    console.error('Kit error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
