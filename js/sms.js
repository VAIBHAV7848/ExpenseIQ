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
    if (!Auth || Auth.isGuest() || !Auth.isAuthenticated()) return;
    
    const user = Auth.getUser();
    const phoneNumber = user?.user_metadata?.phone_number;
    
    if (!phoneNumber) {
      console.log('SMS Service: User has no registered phone number. Skipping.');
      return;
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
        throw error;
      }

      console.log('SMS Service: Successfully sent SMS.', data.sid);
    } catch (err) {
      // Rule 7: If SMS sending fails, do not break the transaction flow.
      // Rule 8: Log SMS failures safely without exposing secrets.
      console.warn('SMS Service Error:', err.message || 'Unknown error');
      
      // Optional: Add an activity log entry for the failure
      if (Store && Store._logActivity) {
        Store._logActivity('Failed to send SMS notification: ' + (err.message || 'Network error'));
      }
    }
  }
};
