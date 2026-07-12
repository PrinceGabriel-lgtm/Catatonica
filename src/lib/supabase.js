  // ─── SUPABASE ───
  const { createClient } = supabase;
  const sb = createClient(
    'https://azqlxjvlxttztjzjvryt.supabase.co',
    'sb_publishable_j0rnqo9byK5ep3UlrGgQDg_4nnm9Pv4'
  );

  const FREE_SESSION_MAX = 10; // free users: max 10 min sessions
  const THRESHOLD = 7;

  // Stripe payment links — replace with your actual links from Stripe Dashboard
  const STRIPE = {
    deep: 'https://buy.stripe.com/test_4gMbJ0fUZfqvcsvcDz4Rq00',   // $9/mo — Deep
    order: 'https://buy.stripe.com/test_bJe6oGcIN7Y3fEHfPL4Rq01',  // $29/mo — The Order
  };

  export { sb, FREE_SESSION_MAX, THRESHOLD, STRIPE };
