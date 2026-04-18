/* ========================================
   ExpenseIQ — Web Push Notifications Manager
   ======================================== */

const VAPID_PUBLIC_KEY = 'BKUhKUN-KRGc8FpTHi5PsAB_Dy_11oIAU7ADo5EwM3GEh1wOMU2cOLXGF6or6bew5ht3hV8axM6_NShGkLRIQO4';

const Push = {
  isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  },

  async subscribe() {
    if (!this.isSupported()) {
      if (window.Toast) Toast.error('Not Supported', 'Your browser does not support push notifications.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        if (window.Toast) Toast.warning('Permission Denied', 'You must allow notifications in browser settings.');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // Send to Supabase Edge Function / DB
      await this.saveSubscriptionToSupabase(subscription);
      
      if (window.Toast) Toast.success('Notifications Enabled', 'You will now receive alerts!');
      return true;
    } catch (e) {
      console.error('Push subscription failed:', e);
      if (window.Toast) Toast.error('Setup Failed', 'Could not enable notifications.');
      return false;
    }
  },

  async saveSubscriptionToSupabase(subscription) {
    if (!window.supabaseClient || !Auth.getUser()) return false;
    const subJson = subscription.toJSON();
    const endpoint = subJson.endpoint;
    const p256dhKey = subJson.keys.p256dh;
    const authKey = subJson.keys.auth;
    const userId = Auth.getUser().id;

    // We do an upsert or insert handling UNIQUE endpoint constraints
    const { data, error } = await supabaseClient
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: endpoint,
        p256dh_key: p256dhKey,
        auth_key: authKey
      }, { onConflict: 'endpoint' });

    if (error) {
      console.error('Failed to save push subscription to DB:', error);
      return false;
    }
    return true;
  },

  async testNotification() {
    // This hits the edge function explicitly to manually fire a notification
    if (!window.supabaseClient || !Auth.getUser()) return;
    
    // In actual production, you would hit the edge function via supabase.functions.invoke
    // Because the edge function isn't perfectly hosted yet, we can't invoke it directly from client if it doesn't exist
    // Usually: await supabaseClient.functions.invoke('send-push', { body: { user_id: Auth.getUser().id, title: 'Test', body: 'This is a test' } });
    if (window.Toast) Toast.info('Test', 'Please trigger this from the Supabase edge function dashboard.');
  },

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
  
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
  
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
};
