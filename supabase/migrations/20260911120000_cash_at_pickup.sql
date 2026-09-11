-- Let a customer say "I'll pay cash at pickup" — from checkout or from a link
-- in their confirmation email — and have the desk see it.
--
-- payment_status previously only had staff-set values. cash_at_pickup is the
-- first customer-set one: it records intent, not money. Only paid_cash and
-- paid_direct mean money was received, and nothing in this migration changes
-- that — the invoice guard still checks for exactly those two.

alter table public.orders
  drop constraint if exists orders_payment_status_check;
alter table public.orders
  add constraint orders_payment_status_check
  check (payment_status in (
    'not_arranged', 'instructions_sent', 'cash_at_pickup', 'paid_cash', 'paid_direct'
  ));

alter table public.quotes
  drop constraint if exists quotes_payment_status_check;
alter table public.quotes
  add constraint quotes_payment_status_check
  check (payment_status in (
    'not_arranged', 'instructions_sent', 'cash_at_pickup', 'paid_cash', 'paid_direct'
  ));
