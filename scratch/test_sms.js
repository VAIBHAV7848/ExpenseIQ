// scratch/test_sms.js
// Mock verification of the /api/send-sms.js endpoint

import handler from '../api/send-sms.js';

// Setup Mock environment variables for verification
process.env.TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'ACmockaccountsid1234567890';
process.env.TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'mockauthtoken1234567890';
process.env.TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '+15555555555';

const mockReq = {
  method: 'POST',
  body: {
    phone_number: '+919999999999',
    amount: '120.00',
    type: 'expense',
    category: 'Food',
    formatted_time: '29 May 22, 10:45 PM',
    description: 'Starbucks Coffee',
    balance: '4380.00',
    account_label: 'GUEST'
  }
};

const mockRes = {
  status(code) {
    console.log(`[TEST] Response Status Code: ${code}`);
    return this;
  },
  json(data) {
    console.log('[TEST] Response Payload:', JSON.stringify(data, null, 2));
    return this;
  },
  setHeader(name, val) {
    // console.log(`[TEST] Header Set: ${name} = ${val}`);
    return this;
  }
};

console.log('[TEST] Executing serverless Twilio SMS gateway handler in mock isolation...');
handler(mockReq, mockRes).catch(err => {
  console.error('[TEST] Execution Failed:', err);
});
