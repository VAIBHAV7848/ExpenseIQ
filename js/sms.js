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

    // 2. Prepare payload
    const payload = {
      phone_number: phoneNumber,
      amount: txn.amount,
      type: txn.type,
      category: Store.getCategory(txn.category)?.name || txn.category,
      timestamp: txn.created_at || new Date().toISOString(),
      description: txn.description
    };

    // 3. Invoke Supabase Edge Function
    try {
      console.log('SMS Service: Sending notification for transaction', txn.id);
      
      const { data, error } = await supabaseClient.functions.invoke('send-sms', {
        body: payload
      });

      if (error) {
        console.error('SMS Service: [EDGE_FUNC_ERROR]', error);
        throw error;
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
  }
};
