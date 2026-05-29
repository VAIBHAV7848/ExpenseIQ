/* ========================================
   ExpenseIQ — Twilio SMS Service
   ======================================== */

const SMS = {
  /**
   * Notifies the user via SMS about a new transaction.
   * Only triggers if the user has a phone number registered.
   */
  async notify(txn) {
    // 1. Safety checks
    const isGuest = Auth.isGuest();
    const user = Auth.getUser();
    const settings = Store.getSettings();
    
    // Get phone number from either Cloud Profile or Local Guest Profile
    let phoneNumber = isGuest ? settings.profile?.phoneNumber : user?.user_metadata?.phone_number;
    
    if (!phoneNumber) {
      console.warn('SMS Service: [ABORT] No registered phone number found for user', isGuest ? 'Guest' : user?.id);
      return;
    }

    // Normalize phone number (Ensure E.164 format with +)
    phoneNumber = phoneNumber.trim();
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = '+' + phoneNumber;
    }

    // Get totals for "Real Bank" style balance reporting
    const totals = Store.getTotals();
    const accountLabel = isGuest ? 'Guest' : (user?.id ? user.id.split('-')[0].toUpperCase() : 'User');

    // 2. Prepare payload
    const payload = {
      phone_number: phoneNumber,
      amount: txn.amount,
      type: txn.type,
      category: Store.getCategory(txn.category)?.name || txn.category,
      timestamp: txn.created_at || new Date().toISOString(),
      formatted_time: new Date().toLocaleString('en-IN', { 
        day: '2-digit', month: 'short', year: '2-digit', 
        hour: '2-digit', minute: '2-digit', hour12: true 
      }),
      description: txn.description,
      balance: totals.balance,
      account_label: accountLabel
    };

    // 3. Dispatch SMS Notification
    try {
      console.log('SMS Service: Sending notification for transaction', txn.id);
      
      let data, error;
      const useProxy = window.CONFIG && CONFIG.USE_SERVER_PROXY;

      if (useProxy) {
        console.log('SMS Service: Dispatching via secure Vercel Node.js gateway...');
        const response = await fetch('/api/send-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errRes = await response.json();
          error = errRes;
        } else {
          data = await response.json();
        }
      } else {
        console.log('SMS Service: Dispatching via Supabase Edge Function...');
        const result = await supabaseClient.functions.invoke('send-sms', {
          body: payload
        });
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('SMS Service: [ERROR]', error);
        throw new Error(error.detail || error.error || 'Server error');
      }

      if (data && data.success) {
        console.log('SMS Service: [SUCCESS] Sent SMS. SID:', data.sid);
      } else if (data && data.error) {
        console.error('SMS Service: [LOGICAL_ERROR]', data.error, data.detail);
      }
    } catch (err) {
      // 4. Detailed Error Handling
      const errMsg = err.message || 'Unknown error';
      
      if (errMsg.includes('INTERNET_DISCONNECTED') || errMsg.includes('Failed to fetch')) {
        console.error('SMS Service: [OFFLINE] Network connection blocked or unavailable.');
        Toast.error('Network Error', 'Could not reach SMS service. Please check your internet connection.');
      } else {
        console.warn('SMS Service Error:', errMsg);
      }
      
      // Optional: Add an activity log entry for the failure
      if (Store && Store._logActivity) {
        Store._logActivity('SMS Notification Failed: ' + errMsg);
      }
    }
  },

  /**
   * Sends a custom critical budget breach alert SMS via Twilio endpoint.
   */
  async sendBudgetAlert(messageText) {
    const isGuest = Auth.isGuest();
    const user = Auth.getUser();
    const settings = Store.getSettings();
    
    let phoneNumber = isGuest ? settings.profile?.phoneNumber : user?.user_metadata?.phone_number;
    if (!phoneNumber) {
      console.warn('SMS Service: [ABORT] No phone number registered to receive budget breach alert.');
      return;
    }

    phoneNumber = phoneNumber.trim();
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = '+' + phoneNumber;
    }

    const payload = {
      phone_number: phoneNumber,
      custom_message: messageText
    };

    try {
      console.log('SMS Service: Dispatching critical budget breach SMS alert...');
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok && data.success) {
        console.log('SMS Service: [SUCCESS] Breach SMS sent. SID:', data.sid);
        if (Store && Store._logActivity) {
          Store._logActivity('SMS Breach Alert Sent: ' + messageText);
        }
      } else {
        console.error('SMS Service: [ERROR] Twilio gateway error:', data.error || 'Unknown error');
      }
    } catch (err) {
      console.error('SMS Service: [FETCH_FAILED]', err);
    }
  }
};
