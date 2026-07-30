export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};
type Table<Row, Insert, Update, Relations extends Relationship[] = []> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relations;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          partner_id: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          partner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          partner_id?: string | null;
        }
      >;
      partner_invites: Table<
        {
          id: string;
          code: string;
          created_by: string;
          used_by: string | null;
          status: 'active' | 'used' | 'expired';
          expires_at: string;
          created_at: string;
        },
        {
          id?: string;
          code: string;
          created_by: string;
          used_by?: string | null;
          status?: 'active' | 'used' | 'expired';
          expires_at: string;
          created_at?: string;
        },
        {
          code?: string;
          used_by?: string | null;
          status?: 'active' | 'used' | 'expired';
          expires_at?: string;
        }
      >;
      planner_drafts: Table<
        { id: string; user_id: string; date: string; created_at: string; updated_at: string },
        { id?: string; user_id?: string; date: string; created_at?: string; updated_at?: string },
        { date?: string; updated_at?: string }
      >;
      draft_tasks: Table<
        { id: string; draft_id: string; title: string; estimated_minutes: number; order: number },
        { id?: string; draft_id: string; title: string; estimated_minutes: number; order: number },
        { title?: string; estimated_minutes?: number; order?: number }
      >;
      initial_plans: Table<
        { id: string; user_id: string; date: string; created_at: string },
        { id?: string; user_id?: string; date: string; created_at?: string },
        never
      >;
      initial_tasks: Table<
        { id: string; plan_id: string; title: string; estimated_minutes: number; order: number },
        { id?: string; plan_id: string; title: string; estimated_minutes: number; order: number },
        never
      >;
      current_plans: Table<
        {
          id: string;
          user_id: string;
          date: string;
          status: 'editing' | 'submitted';
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id?: string;
          date: string;
          status?: 'editing' | 'submitted';
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        { status?: 'editing' | 'submitted'; submitted_at?: string | null },
        [
          {
            foreignKeyName: 'current_tasks_plan_id_fkey';
            columns: ['id'];
            isOneToOne: false;
            referencedRelation: 'current_tasks';
            referencedColumns: ['plan_id'];
          },
        ]
      >;
      current_tasks: Table<
        {
          id: string;
          plan_id: string;
          title: string;
          estimated_minutes: number;
          completed_minutes: number;
          completed_pomodoros: number;
          status: 'pending' | 'completed';
          order: number;
        },
        {
          id?: string;
          plan_id: string;
          title: string;
          estimated_minutes: number;
          completed_minutes?: number;
          completed_pomodoros?: number;
          status?: 'pending' | 'completed';
          order: number;
        },
        { title?: string; estimated_minutes?: number; order?: number }
      >;
      pomodoro_sessions: Table<
        {
          id: string;
          user_id: string;
          plan_id: string;
          task_id: string | null;
          duration: number;
          session_type: 'focus' | 'short_break' | 'long_break';
          completed: boolean;
          started_at: string;
          ended_at: string;
          created_at: string;
        },
        {
          id?: string;
          user_id?: string;
          plan_id: string;
          task_id?: string | null;
          duration: number;
          session_type: 'focus' | 'short_break' | 'long_break';
          completed?: boolean;
          started_at: string;
          ended_at: string;
          created_at?: string;
        },
        never
      >;
      daily_submissions: Table<
        {
          id: string;
          user_id: string;
          plan_id: string;
          remark: string | null;
          status: 'pending' | 'approved' | 'rejected';
          submitted_at: string;
          created_at: string;
        },
        {
          id?: string;
          user_id?: string;
          plan_id: string;
          remark?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          submitted_at?: string;
          created_at?: string;
        },
        { remark?: string | null },
        [
          {
            foreignKeyName: 'daily_submissions_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: true;
            referencedRelation: 'current_plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'submission_proofs_submission_id_fkey';
            columns: ['id'];
            isOneToOne: false;
            referencedRelation: 'submission_proofs';
            referencedColumns: ['submission_id'];
          },
        ]
      >;
      submission_proofs: Table<
        {
          id: string;
          submission_id: string;
          image_url: string;
          caption: string | null;
          created_at: string;
        },
        {
          id?: string;
          submission_id: string;
          image_url: string;
          caption?: string | null;
          created_at?: string;
        },
        { caption?: string | null }
      >;
      approvals: Table<
        {
          id: string;
          submission_id: string;
          reviewer_id: string;
          decision: 'approved' | 'rejected';
          comment: string | null;
          reviewed_at: string;
        },
        {
          id?: string;
          submission_id: string;
          reviewer_id: string;
          decision: 'approved' | 'rejected';
          comment?: string | null;
          reviewed_at?: string;
        },
        never
      >;
      daily_reports: Table<
        {
          id: string;
          user_id: string;
          date: string;
          planned_minutes: number;
          completed_minutes: number;
          planned_tasks: number;
          completed_tasks: number;
          total_pomodoros: number;
          approval_status: 'approved' | 'rejected';
          review_comment: string | null;
          xp_earned: number;
          streak_after_day: number;
          created_at: string;
        },
        {
          id?: string;
          user_id?: string;
          date: string;
          planned_minutes: number;
          completed_minutes: number;
          planned_tasks: number;
          completed_tasks: number;
          total_pomodoros: number;
          approval_status: 'approved' | 'rejected';
          review_comment?: string | null;
          xp_earned?: number;
          streak_after_day?: number;
          created_at?: string;
        },
        never,
        [
          {
            foreignKeyName: 'report_tasks_report_id_fkey';
            columns: ['id'];
            isOneToMany: true;
            isOneToOne: false;
            referencedRelation: 'report_tasks';
            referencedColumns: ['report_id'];
          },
        ]
      >;
      report_tasks: Table<
        {
          id: string;
          report_id: string;
          title: string;
          estimated_minutes: number;
          completed_minutes: number;
          completed: boolean;
          pomodoros: number;
          order: number;
        },
        {
          id?: string;
          report_id: string;
          title: string;
          estimated_minutes: number;
          completed_minutes: number;
          completed: boolean;
          pomodoros: number;
          order: number;
        },
        never
      >;
      user_stats: Table<
        {
          user_id: string;
          total_minutes: number;
          total_pomodoros: number;
          planned_tasks: number;
          completed_tasks: number;
          approved_days: number;
          rejected_days: number;
          current_streak: number;
          longest_streak: number;
          xp: number;
          level: number;
          updated_at: string;
        },
        {
          user_id: string;
          total_minutes?: number;
          total_pomodoros?: number;
          planned_tasks?: number;
          completed_tasks?: number;
          approved_days?: number;
          rejected_days?: number;
          current_streak?: number;
          longest_streak?: number;
          xp?: number;
          level?: number;
          updated_at?: string;
        },
        never
      >;
      achievements: Table<
        { id: string; code: string; name: string; description: string; created_at: string },
        { id?: string; code: string; name: string; description: string; created_at?: string },
        never
      >;
      user_achievements: Table<
        { id: string; user_id: string; achievement_id: string; unlocked_at: string },
        { id?: string; user_id: string; achievement_id: string; unlocked_at?: string },
        never,
        [
          {
            foreignKeyName: 'user_achievements_achievement_id_fkey';
            columns: ['achievement_id'];
            isOneToOne: true;
            referencedRelation: 'achievements';
            referencedColumns: ['id'];
          },
        ]
      >;
      xp_rules: Table<
        {
          id: string;
          code: string;
          name: string;
          xp_amount: number;
          active: boolean;
          updated_at: string;
        },
        {
          id?: string;
          code: string;
          name: string;
          xp_amount: number;
          active?: boolean;
          updated_at?: string;
        },
        { name?: string; xp_amount?: number; active?: boolean }
      >;
      notifications: Table<
        {
          id: string;
          user_id: string;
          type:
            | 'submission_received'
            | 'submission_approved'
            | 'submission_rejected'
            | 'achievement_unlocked'
            | 'partner_connected';
          title: string;
          body: string;
          data: Json;
          read_at: string | null;
          created_at: string;
        },
        {
          id?: string;
          user_id?: string;
          type:
            | 'submission_received'
            | 'submission_approved'
            | 'submission_rejected'
            | 'achievement_unlocked'
            | 'partner_connected';
          title: string;
          body: string;
          data?: Json;
          read_at?: string | null;
          created_at?: string;
        },
        { read_at?: string | null }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      create_draft: {
        Args: { p_date: string; p_tasks?: Json };
        Returns: Database['public']['Tables']['planner_drafts']['Row'];
      };
      duplicate_draft_into_daily_plans: { Args: { p_date: string }; Returns: Json };
      complete_pomodoro: {
        Args: {
          p_plan_id: string;
          p_task_id: string | null;
          p_duration: number;
          p_session_type?: string;
          p_started_at?: string;
          p_ended_at?: string;
        };
        Returns: Database['public']['Tables']['pomodoro_sessions']['Row'];
      };
      submit_day: {
        Args: { p_plan_id: string; p_remark?: string | null };
        Returns: Database['public']['Tables']['daily_submissions']['Row'];
      };
      create_submission_proof: {
        Args: { p_submission_id: string; p_image_url: string; p_caption?: string | null };
        Returns: Database['public']['Tables']['submission_proofs']['Row'];
      };
      approve_day: {
        Args: { p_submission_id: string; p_comment?: string | null };
        Returns: Database['public']['Tables']['daily_reports']['Row'];
      };
      reject_day: {
        Args: { p_submission_id: string; p_comment?: string | null };
        Returns: Database['public']['Tables']['daily_reports']['Row'];
      };
      finalize_day: {
        Args: { p_submission_id: string };
        Returns: Database['public']['Tables']['daily_reports']['Row'];
      };
      generate_invite: {
        Args: { p_expires_at?: string };
        Returns: Database['public']['Tables']['partner_invites']['Row'];
      };
      redeem_invite: { Args: { p_invite_code: string }; Returns: undefined };
      connect_partner_with_code: { Args: { invite_code: string }; Returns: undefined };
      recalculate_user_stats: {
        Args: { p_user_id: string };
        Returns: Database['public']['Tables']['user_stats']['Row'];
      };
      unlock_user_achievements: { Args: { p_user_id: string }; Returns: undefined };
      calculate_day_xp: {
        Args: { p_status: string; p_focus_pomodoros: number; p_streak: number };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TableUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
