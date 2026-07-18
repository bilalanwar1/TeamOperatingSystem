/**
 * Database types aligned with supabase/migrations/0001_init.sql.
 * Regenerate from Supabase CLI later if preferred:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 */

export type AgencyRole = "super_admin" | "agency_owner" | "manager" | "agent";

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "negotiating"
  | "closed_won"
  | "closed_lost";

export type LeadSource =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "whatsapp"
  | "email"
  | "calls"
  | "referral"
  | "portal"
  | "other";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      agencies: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      agency_members: {
        Row: {
          id: string;
          agency_id: string;
          user_id: string;
          role: AgencyRole;
          full_name: string | null;
          email: string;
          whatsapp_phone: string | null;
          invited_at: string;
          joined_at: string | null;
        };
        Insert: {
          id?: string;
          agency_id: string;
          user_id: string;
          role?: AgencyRole;
          full_name?: string | null;
          email: string;
          whatsapp_phone?: string | null;
          invited_at?: string;
          joined_at?: string | null;
        };
        Update: {
          id?: string;
          agency_id?: string;
          user_id?: string;
          role?: AgencyRole;
          full_name?: string | null;
          email?: string;
          whatsapp_phone?: string | null;
          invited_at?: string;
          joined_at?: string | null;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          agency_id: string;
          agent_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          status: LeadStatus;
          source: LeadSource;
          notes: string | null;
          follow_up_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agency_id: string;
          agent_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          status?: LeadStatus;
          source?: LeadSource;
          notes?: string | null;
          follow_up_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agency_id?: string;
          agent_id?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          status?: LeadStatus;
          source?: LeadSource;
          notes?: string | null;
          follow_up_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      activity_events: {
        Row: {
          id: string;
          agency_id: string;
          agent_id: string;
          event_type: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          agency_id: string;
          agent_id: string;
          event_type: string;
          payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          agency_id?: string;
          agent_id?: string;
          event_type?: string;
          payload?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      feature_flags: {
        Row: {
          id: string;
          agency_id: string;
          flag_key: string;
          enabled: boolean;
        };
        Insert: {
          id?: string;
          agency_id: string;
          flag_key: string;
          enabled?: boolean;
        };
        Update: {
          id?: string;
          agency_id?: string;
          flag_key?: string;
          enabled?: boolean;
        };
        Relationships: [];
      };
      ai_insights: {
        Row: {
          id: string;
          agency_id: string;
          lead_id: string | null;
          agent_id: string | null;
          insight_type: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          agency_id: string;
          lead_id?: string | null;
          agent_id?: string | null;
          insight_type: string;
          payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          agency_id?: string;
          lead_id?: string | null;
          agent_id?: string | null;
          insight_type?: string;
          payload?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      agency_invites: {
        Row: {
          id: string;
          agency_id: string;
          email: string;
          role: AgencyRole;
          token: string;
          invited_by: string;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agency_id: string;
          email: string;
          role?: AgencyRole;
          token: string;
          invited_by: string;
          expires_at: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          agency_id?: string;
          email?: string;
          role?: AgencyRole;
          token?: string;
          invited_by?: string;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_agency_member: {
        Args: { target_agency_id: string };
        Returns: boolean;
      };
      is_agency_manager: {
        Args: { target_agency_id: string };
        Returns: boolean;
      };
      create_agency: {
        Args: { p_name: string; p_slug: string };
        Returns: Database["public"]["Tables"]["agencies"]["Row"];
      };
      get_invite_by_token: {
        Args: { p_token: string };
        Returns: {
          agency_id: string;
          agency_name: string;
          agency_slug: string;
          email: string;
          role: AgencyRole;
          expires_at: string;
          accepted_at: string | null;
        }[];
      };
      accept_agency_invite: {
        Args: { p_token: string; p_full_name?: string | null };
        Returns: Database["public"]["Tables"]["agency_members"]["Row"];
      };
    };
    Enums: {
      agency_role: AgencyRole;
      lead_status: LeadStatus;
      lead_source: LeadSource;
    };
    CompositeTypes: Record<string, never>;
  };
};
