alter table clients add column if not exists client_type text not null default 'direct';
