-- ============================================================
-- Phase 3: WhatsApp module — agent phone link for inbound logging
-- ============================================================

alter table agency_members
  add column if not exists whatsapp_phone text;

-- One agent per WhatsApp number globally (E.164, e.g. +971501234567)
create unique index if not exists agency_members_whatsapp_phone_uidx
  on agency_members (whatsapp_phone)
  where whatsapp_phone is not null;

comment on column agency_members.whatsapp_phone is
  'E.164 WhatsApp number used to map inbound webhook messages to this agent';
