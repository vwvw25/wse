alter table events add column if not exists booked_band_size text;
alter table events add column if not exists booked_fee numeric(10,2);
