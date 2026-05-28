-- Normalise instrument names in event_musicians and band_template_slots
-- to match the canonical INSTRUMENTS list in types/musicians.ts

-- Vocals variants
update event_musicians    set instrument = 'Vocals' where lower(instrument) in ('vocal','vocals','lead vocal','lead vocals','singer','vocals/mc');
update band_template_slots set instrument = 'Vocals' where lower(instrument) in ('vocal','vocals','lead vocal','lead vocals','singer','vocals/mc');

-- Guitar variants
update event_musicians    set instrument = 'Guitar' where lower(instrument) in ('lead guitar','rhythm guitar','acoustic guitar');
update band_template_slots set instrument = 'Guitar' where lower(instrument) in ('lead guitar','rhythm guitar','acoustic guitar');

-- Bass variants
update event_musicians    set instrument = 'Bass' where lower(instrument) in ('bass guitar','bass player');
update band_template_slots set instrument = 'Bass' where lower(instrument) in ('bass guitar','bass player');

-- Keys variants
update event_musicians    set instrument = 'Keys' where lower(instrument) in ('keyboard','keyboards','piano','keys/piano');
update band_template_slots set instrument = 'Keys' where lower(instrument) in ('keyboard','keyboards','piano','keys/piano');

-- Saxophone variants
update event_musicians    set instrument = 'Saxophone' where lower(instrument) in ('sax','alto sax','tenor sax','baritone sax','alto saxophone','tenor saxophone','baritone saxophone');
update band_template_slots set instrument = 'Saxophone' where lower(instrument) in ('sax','alto sax','tenor sax','baritone sax','alto saxophone','tenor saxophone','baritone saxophone');
