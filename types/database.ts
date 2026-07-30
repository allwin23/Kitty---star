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
          task_id: string | null;
          image_url: string;
          caption: string | null;
          created_at: string;
        },
        {
          id?: string;
          submission_id: string;
          task_id?: string | null;
          image_url: string;
          caption?: string | null;
          created_at?: string;
        },
        { caption?: string | null; task_id?: string | null }
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
      pyq_attempts: Table<
        {
          id: string;
          user_id: string;
          set_name: string;
          subject: string;
          year: number;
          mode: string;
          started_at: string;
          submitted_at: string | null;
          score: number;
          correct: number;
          wrong: number;
          unanswered: number;
          accuracy: number;
          time_taken_seconds: number;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id?: string;
          set_name: string;
          subject: string;
          year: number;
          mode: string;
          started_at?: string;
          submitted_at?: string | null;
          score?: number;
          correct?: number;
          wrong?: number;
          unanswered?: number;
          accuracy?: number;
          time_taken_seconds?: number;
          created_at?: string;
          updated_at?: string;
        },
        {
          set_name?: string;
          subject?: string;
          year?: number;
          mode?: string;
          started_at?: string;
          submitted_at?: string | null;
          score?: number;
          correct?: number;
          wrong?: number;
          unanswered?: number;
          accuracy?: number;
          time_taken_seconds?: number;
        }
      >;
      pyq_attempt_answers: Table<
        {
          id: string;
          attempt_id: string;
          question_id: string;
          selected_option: string | null;
          correct: boolean;
          time_taken_seconds: number;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          attempt_id: string;
          question_id: string;
          selected_option?: string | null;
          correct: boolean;
          time_taken_seconds?: number;
          created_at?: string;
          updated_at?: string;
        },
        { selected_option?: string | null; correct?: boolean; time_taken_seconds?: number }
      >;
      pyq_stats: Table<
        {
          id: string;
          user_id: string;
          total_tests: number;
          total_questions: number;
          correct_answers: number;
          wrong_answers: number;
          accuracy: number;
          best_score: number;
          today_tests: number;
          today_questions: number;
          last_attempt_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          total_tests?: number;
          total_questions?: number;
          correct_answers?: number;
          wrong_answers?: number;
          accuracy?: number;
          best_score?: number;
          today_tests?: number;
          today_questions?: number;
          last_attempt_at?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          total_tests?: number;
          total_questions?: number;
          correct_answers?: number;
          wrong_answers?: number;
          accuracy?: number;
          best_score?: number;
          today_tests?: number;
          today_questions?: number;
          last_attempt_at?: string | null;
        }
      >;
      water_logs: Table<
        {
          id: string;
          user_id: string;
          amount_ml: number;
          logged_at: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id?: string;
          amount_ml: number;
          logged_at?: string;
          created_at?: string;
          updated_at?: string;
        },
        { amount_ml?: number; logged_at?: string }
      >;
      water_daily_stats: Table<
        {
          id: string;
          user_id: string;
          date: string;
          total_ml: number;
          goal_ml: number;
          goal_completed: boolean;
          current_streak: number;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id?: string;
          date: string;
          total_ml?: number;
          goal_ml?: number;
          goal_completed?: boolean;
          current_streak?: number;
          created_at?: string;
          updated_at?: string;
        },
        { total_ml?: number; goal_ml?: number; goal_completed?: boolean; current_streak?: number }
      >;
      vocabulary_progress: Table<
        {
          id: string;
          user_id: string;
          word_id: string;
          learned: boolean;
          learned_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id?: string;
          word_id: string;
          learned?: boolean;
          learned_at?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        { learned?: boolean; learned_at?: string | null }
      >;
      vocabulary_stats: Table<
        {
          id: string;
          user_id: string;
          today_words: number;
          total_words: number;
          current_streak: number;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          today_words?: number;
          total_words?: number;
          current_streak?: number;
          created_at?: string;
          updated_at?: string;
        },
        { today_words?: number; total_words?: number; current_streak?: number }
      >;
      grammar_attempts: Table<
        {
          id: string;
          user_id: string;
          set_name: string;
          topic: string;
          correct: number;
          wrong: number;
          score: number;
          completed_at: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id?: string;
          set_name: string;
          topic: string;
          correct?: number;
          wrong?: number;
          score?: number;
          completed_at?: string;
          created_at?: string;
          updated_at?: string;
        },
        never
      >;
      grammar_stats: Table<
        {
          id: string;
          user_id: string;
          today_questions: number;
          today_correct: number;
          total_questions: number;
          accuracy: number;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          today_questions?: number;
          today_correct?: number;
          total_questions?: number;
          accuracy?: number;
          created_at?: string;
          updated_at?: string;
        },
        {
          today_questions?: number;
          today_correct?: number;
          total_questions?: number;
          accuracy?: number;
        }
      >;
      flashcard_collections: Table<
        {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id?: string;
          title: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        { title?: string; description?: string | null }
      >;
      flashcards: Table<
        {
          id: string;
          collection_id: string;
          created_by: string;
          type: 'builtin' | 'user';
          question: string;
          answer: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          collection_id: string;
          created_by?: string;
          type?: 'builtin' | 'user';
          question: string;
          answer: string;
          created_at?: string;
          updated_at?: string;
        },
        { collection_id?: string; type?: 'builtin' | 'user'; question?: string; answer?: string }
      >;
      flashcard_reviews: Table<
        {
          id: string;
          card_id: string;
          user_id: string;
          reviewed_at: string;
          rating: 'again' | 'hard' | 'good' | 'easy';
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          card_id: string;
          user_id?: string;
          reviewed_at?: string;
          rating: 'again' | 'hard' | 'good' | 'easy';
          created_at?: string;
          updated_at?: string;
        },
        never
      >;
      flashcard_schedule: Table<
        {
          id: string;
          card_id: string;
          user_id: string;
          next_review: string | null;
          last_review: string | null;
          ease_factor: number;
          interval_days: number;
          repetitions: number;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          card_id: string;
          user_id?: string;
          next_review?: string | null;
          last_review?: string | null;
          ease_factor?: number;
          interval_days?: number;
          repetitions?: number;
          created_at?: string;
          updated_at?: string;
        },
        {
          next_review?: string | null;
          last_review?: string | null;
          ease_factor?: number;
          interval_days?: number;
          repetitions?: number;
        }
      >;
      daily_user_activity: Table<
        {
          id: string;
          user_id: string;
          date: string;
          study_minutes: number;
          pomodoros_completed: number;
          planned_tasks: number;
          completed_tasks: number;
          water_ml: number;
          pyq_tests: number;
          pyq_questions: number;
          grammar_questions: number;
          grammar_correct: number;
          vocabulary_words: number;
          flashcards_reviewed: number;
          xp_earned: number;
          achievements_unlocked: number;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id?: string;
          date: string;
          study_minutes?: number;
          pomodoros_completed?: number;
          planned_tasks?: number;
          completed_tasks?: number;
          water_ml?: number;
          pyq_tests?: number;
          pyq_questions?: number;
          grammar_questions?: number;
          grammar_correct?: number;
          vocabulary_words?: number;
          flashcards_reviewed?: number;
          xp_earned?: number;
          achievements_unlocked?: number;
          created_at?: string;
          updated_at?: string;
        },
        {
          study_minutes?: number;
          pomodoros_completed?: number;
          planned_tasks?: number;
          completed_tasks?: number;
          water_ml?: number;
          pyq_tests?: number;
          pyq_questions?: number;
          grammar_questions?: number;
          grammar_correct?: number;
          vocabulary_words?: number;
          flashcards_reviewed?: number;
          xp_earned?: number;
          achievements_unlocked?: number;
        }
      >;
      activity_events: Table<
        {
          id: string;
          user_id: string;
          event_type:
            | 'planner_created'
            | 'planner_updated'
            | 'task_completed'
            | 'pomodoro_started'
            | 'pomodoro_completed'
            | 'pyq_started'
            | 'pyq_completed'
            | 'grammar_completed'
            | 'vocabulary_learned'
            | 'flashcard_created'
            | 'flashcard_reviewed'
            | 'water_logged'
            | 'submission_sent'
            | 'submission_approved'
            | 'submission_rejected'
            | 'achievement_unlocked'
            | 'level_up'
            | 'streak_increased'
            | 'daily_goal_completed'
            | 'partner_connected';
          reference_table: string | null;
          reference_id: string | null;
          metadata: Json;
          visibility: 'private' | 'partner' | 'public';
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id?: string;
          event_type:
            | 'planner_created'
            | 'planner_updated'
            | 'task_completed'
            | 'pomodoro_started'
            | 'pomodoro_completed'
            | 'pyq_started'
            | 'pyq_completed'
            | 'grammar_completed'
            | 'vocabulary_learned'
            | 'flashcard_created'
            | 'flashcard_reviewed'
            | 'water_logged'
            | 'submission_sent'
            | 'submission_approved'
            | 'submission_rejected'
            | 'achievement_unlocked'
            | 'level_up'
            | 'streak_increased'
            | 'daily_goal_completed'
            | 'partner_connected';
          reference_table?: string | null;
          reference_id?: string | null;
          metadata?: Json;
          visibility?: 'private' | 'partner' | 'public';
          created_at?: string;
          updated_at?: string;
        },
        never
      >;
      mascot_feed: Table<
        {
          id: string;
          user_id: string;
          event_id: string | null;
          message_type: string;
          title: string;
          subtitle: string | null;
          icon: string | null;
          emotion: 'happy' | 'celebrate' | 'encourage' | 'remind' | 'concerned';
          priority: 'low' | 'normal' | 'high' | 'critical';
          is_read: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id?: string;
          event_id?: string | null;
          message_type: string;
          title: string;
          subtitle?: string | null;
          icon?: string | null;
          emotion: 'happy' | 'celebrate' | 'encourage' | 'remind' | 'concerned';
          priority?: 'low' | 'normal' | 'high' | 'critical';
          is_read?: boolean;
          created_at?: string;
          updated_at?: string;
        },
        { is_read?: boolean }
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
      start_pyq_attempt: {
        Args: { p_set_name: string; p_subject: string; p_year: number; p_mode: string };
        Returns: Database['public']['Tables']['pyq_attempts']['Row'];
      };
      finish_pyq_attempt: {
        Args: { p_attempt_id: string; p_answers: Json };
        Returns: Database['public']['Tables']['pyq_attempts']['Row'];
      };
      log_water: {
        Args: { p_amount_ml: number };
        Returns: Database['public']['Tables']['water_logs']['Row'];
      };
      mark_word_learned: {
        Args: { p_word_id: string };
        Returns: Database['public']['Tables']['vocabulary_progress']['Row'];
      };
      finish_grammar_quiz: {
        Args: {
          p_topic: string;
          p_correct: number;
          p_wrong: number;
          p_score: number;
          p_set_name?: string;
        };
        Returns: Database['public']['Tables']['grammar_attempts']['Row'];
      };
      create_flashcard_collection: {
        Args: { p_title: string; p_description?: string | null };
        Returns: Database['public']['Tables']['flashcard_collections']['Row'];
      };
      create_flashcard: {
        Args: { p_collection_id: string; p_question: string; p_answer: string };
        Returns: Database['public']['Tables']['flashcards']['Row'];
      };
      update_flashcard: {
        Args: {
          p_card_id: string;
          p_question: string;
          p_answer: string;
          p_collection_id?: string | null;
        };
        Returns: Database['public']['Tables']['flashcards']['Row'];
      };
      delete_flashcard: { Args: { p_card_id: string }; Returns: undefined };
      review_flashcard: {
        Args: { p_card_id: string; p_rating: 'again' | 'hard' | 'good' | 'easy' };
        Returns: Database['public']['Tables']['flashcard_reviews']['Row'];
      };
    };
    Enums: {
      flashcard_type: 'builtin' | 'user';
      flashcard_review_rating: 'again' | 'hard' | 'good' | 'easy';
      activity_event_visibility: 'private' | 'partner' | 'public';
      activity_event_type: Database['public']['Tables']['activity_events']['Row']['event_type'];
      mascot_emotion: 'happy' | 'celebrate' | 'encourage' | 'remind' | 'concerned';
      mascot_priority: 'low' | 'normal' | 'high' | 'critical';
    };
    CompositeTypes: Record<string, never>;
  };
};

export type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TableUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
