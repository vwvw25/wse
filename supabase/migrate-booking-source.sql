-- Add booking_sources list to invoice_settings (configurable in Settings → General)
alter table invoice_settings
  add column if not exists booking_sources text[]
  default array['Encore', 'Poptop', 'Last Minute Musicians', 'Website'];

-- Add source field to events to track how the enquiry came in
alter table events add column if not exists source text;
