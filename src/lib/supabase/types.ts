export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          slug: string
          status: Database["public"]["Enums"]["agency_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          slug: string
          status?: Database["public"]["Enums"]["agency_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["agency_status"]
          updated_at?: string
        }
        Relationships: []
      }
      agency_memberships: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          joined_at: string
          removed_at: string | null
          role: Database["public"]["Enums"]["membership_role"]
          status: Database["public"]["Enums"]["membership_status"]
          suspended_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          joined_at?: string
          removed_at?: string | null
          role?: Database["public"]["Enums"]["membership_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          suspended_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          joined_at?: string
          removed_at?: string | null
          role?: Database["public"]["Enums"]["membership_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          suspended_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_memberships_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      business_areas: {
        Row: {
          agency_id: string
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_areas_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      case_information_relations: {
        Row: {
          agency_id: string
          case_id: string
          created_at: string
          created_by: string
          id: string
          information_id: string
        }
        Insert: {
          agency_id: string
          case_id: string
          created_at?: string
          created_by: string
          id?: string
          information_id: string
        }
        Update: {
          agency_id?: string
          case_id?: string
          created_at?: string
          created_by?: string
          id?: string
          information_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_information_relations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_information_relations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_information_relations_information_id_fkey"
            columns: ["information_id"]
            isOneToOne: false
            referencedRelation: "information_items"
            referencedColumns: ["id"]
          },
        ]
      }
      case_types: {
        Row: {
          agency_id: string | null
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_types_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          agency_id: string
          archived_at: string | null
          assignee_user_id: string | null
          business_area_id: string
          case_type_id: string
          completed_at: string | null
          core_status: string
          created_at: string
          created_by: string
          description: string | null
          due_at: string | null
          id: string
          priority: string
          source_inbox_item_id: string | null
          source_task_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          archived_at?: string | null
          assignee_user_id?: string | null
          business_area_id: string
          case_type_id: string
          completed_at?: string | null
          core_status: string
          created_at?: string
          created_by: string
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: string
          source_inbox_item_id?: string | null
          source_task_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          archived_at?: string | null
          assignee_user_id?: string | null
          business_area_id?: string
          case_type_id?: string
          completed_at?: string | null
          core_status?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: string
          source_inbox_item_id?: string | null
          source_task_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_business_area_id_fkey"
            columns: ["business_area_id"]
            isOneToOne: false
            referencedRelation: "business_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_case_type_id_fkey"
            columns: ["case_type_id"]
            isOneToOne: false
            referencedRelation: "case_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_source_inbox_item_id_fkey"
            columns: ["source_inbox_item_id"]
            isOneToOne: false
            referencedRelation: "inbox_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_source_task_id_fkey"
            columns: ["source_task_id"]
            isOneToOne: true
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      files: {
        Row: {
          created_at: string
          filename: string
          id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filename: string
          id?: string
          mime_type: string
          size_bytes: number
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filename?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inbox_item_files: {
        Row: {
          created_at: string
          file_id: string
          id: string
          inbox_item_id: string
        }
        Insert: {
          created_at?: string
          file_id: string
          id?: string
          inbox_item_id: string
        }
        Update: {
          created_at?: string
          file_id?: string
          id?: string
          inbox_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_item_files_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_item_files_inbox_item_id_fkey"
            columns: ["inbox_item_id"]
            isOneToOne: false
            referencedRelation: "inbox_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_items: {
        Row: {
          content: string
          created_at: string
          id: string
          processed_at: string | null
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          processed_at?: string | null
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          processed_at?: string | null
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inbox_relations: {
        Row: {
          created_at: string
          id: string
          inbox_item_id: string
          relation_id: string
          relation_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          inbox_item_id: string
          relation_id: string
          relation_type: string
        }
        Update: {
          created_at?: string
          id?: string
          inbox_item_id?: string
          relation_id?: string
          relation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_relations_inbox_item_id_fkey"
            columns: ["inbox_item_id"]
            isOneToOne: false
            referencedRelation: "inbox_items"
            referencedColumns: ["id"]
          },
        ]
      }
      information_item_files: {
        Row: {
          created_at: string
          display_order: number
          file_id: string
          id: string
          information_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          file_id: string
          id?: string
          information_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          file_id?: string
          id?: string
          information_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "information_item_files_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "information_item_files_information_id_fkey"
            columns: ["information_id"]
            isOneToOne: false
            referencedRelation: "information_items"
            referencedColumns: ["id"]
          },
        ]
      }
      information_items: {
        Row: {
          agency_id: string
          content: string | null
          created_at: string
          created_by: string
          id: string
          knowledge_collection_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id: string
          content?: string | null
          created_at?: string
          created_by: string
          id?: string
          knowledge_collection_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          content?: string | null
          created_at?: string
          created_by?: string
          id?: string
          knowledge_collection_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "information_items_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "information_items_knowledge_collection_id_fkey"
            columns: ["knowledge_collection_id"]
            isOneToOne: false
            referencedRelation: "knowledge_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_collections: {
        Row: {
          agency_id: string
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          is_system: boolean
          key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          key: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_collections_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          first_name: string | null
          id: string
          last_name: string | null
          locale: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          locale?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          locale?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_file_relations: {
        Row: {
          agency_id: string
          created_at: string
          created_by: string
          file_id: string
          id: string
          task_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          created_by: string
          file_id: string
          id?: string
          task_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          created_by?: string
          file_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_file_relations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_file_relations_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_file_relations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_information_relations: {
        Row: {
          agency_id: string
          created_at: string
          created_by: string
          id: string
          information_id: string
          task_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          created_by: string
          id?: string
          information_id: string
          task_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          created_by?: string
          id?: string
          information_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_information_relations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_information_relations_information_id_fkey"
            columns: ["information_id"]
            isOneToOne: false
            referencedRelation: "information_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_information_relations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_timeline_entries: {
        Row: {
          author_user_id: string
          content: string
          created_at: string
          entry_type: string
          event_key: string | null
          id: string
          metadata: Json | null
          task_id: string
        }
        Insert: {
          author_user_id: string
          content: string
          created_at?: string
          entry_type: string
          event_key?: string | null
          id?: string
          metadata?: Json | null
          task_id: string
        }
        Update: {
          author_user_id?: string
          content?: string
          created_at?: string
          entry_type?: string
          event_key?: string | null
          id?: string
          metadata?: Json | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_timeline_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          agency_id: string
          assignee_user_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id: string
          assignee_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          assignee_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_views: {
        Row: {
          agency_id: string
          created_at: string
          created_by: string
          filters: Json
          icon: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          scope: string
          sort: string
          sort_order: number
          updated_at: string
          visible_in_navigation: boolean
          visible_on_dashboard: boolean
        }
        Insert: {
          agency_id: string
          created_at?: string
          created_by: string
          filters?: Json
          icon?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          scope?: string
          sort?: string
          sort_order?: number
          updated_at?: string
          visible_in_navigation?: boolean
          visible_on_dashboard?: boolean
        }
        Update: {
          agency_id?: string
          created_at?: string
          created_by?: string
          filters?: Json
          icon?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          scope?: string
          sort?: string
          sort_order?: number
          updated_at?: string
          visible_in_navigation?: boolean
          visible_on_dashboard?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "workspace_views_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      attach_file_to_task: {
        Args: { p_file_id: string; p_task_id: string }
        Returns: undefined
      }
      attach_information_to_task: {
        Args: { p_information_id: string; p_task_id: string }
        Returns: undefined
      }
      complete_task: {
        Args: { p_task_id: string }
        Returns: {
          agency_id: string
          assignee_user_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          title: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_task: {
        Args: { p_description?: string; p_title: string }
        Returns: {
          agency_id: string
          assignee_user_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          title: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_case_from_inbox_item: {
        Args: {
          p_inbox_item_id: string
          p_case_type_key: string
          p_assignee_user_id?: string
          p_business_area_key?: string
          p_description?: string
          p_due_at?: string
          p_priority?: string
          p_title?: string
        }
        Returns: {
          already_existed: boolean
          case_id: string
          case_type_key: string
          inbox_item_id: string
          relation_id: string
        }[]
      }
      create_information_from_inbox_item: {
        Args: {
          p_inbox_item_id: string
          p_collection_key?: string
          p_content?: string
          p_title?: string
        }
        Returns: {
          already_existed: boolean
          inbox_item_id: string
          information_id: string
          relation_id: string
        }[]
      }
      create_task_from_inbox_item: {
        Args: {
          p_inbox_item_id: string
          p_assignee_user_id?: string
          p_business_area_key?: string
          p_description?: string
          p_due_date?: string
          p_priority?: string
          p_title?: string
        }
        Returns: {
          already_existed: boolean
          case_id: string | null
          inbox_item_id: string
          relation_id: string
          task_id: string
        }[]
      }
      derive_inbox_promotion_title: {
        Args: { p_content: string; p_title?: string }
        Returns: string
      }
      initialize_current_user_account: { Args: never; Returns: string }
      map_task_to_case_core_status: {
        Args: { p_completed_at: string | null }
        Returns: string
      }
      insert_task_created_timeline_entry: {
        Args: { p_author_user_id: string; p_task_id: string }
        Returns: undefined
      }
      insert_task_system_timeline_entry: {
        Args: {
          p_author_user_id: string
          p_content: string
          p_event_key: string
          p_metadata?: Json
          p_task_id: string
        }
        Returns: undefined
      }
      reopen_task: {
        Args: { p_task_id: string }
        Returns: {
          agency_id: string
          assignee_user_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          title: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_profile_display_name: {
        Args: { p_user_id: string }
        Returns: string
      }
      resolve_timeline_actor_name: {
        Args: { p_user_id: string }
        Returns: string
      }
      seed_default_business_areas_for_agency: {
        Args: { p_agency_id: string }
        Returns: undefined
      }
      seed_default_knowledge_collections_for_agency: {
        Args: { p_agency_id: string }
        Returns: undefined
      }
      seed_default_workspace_views_for_agency: {
        Args: { p_agency_id: string; p_created_by?: string }
        Returns: undefined
      }
      resolve_agency_business_area_id: {
        Args: { p_agency_id: string; p_key: string }
        Returns: string
      }
      resolve_agency_knowledge_collection_id: {
        Args: { p_agency_id: string; p_key: string }
        Returns: string
      }
      update_task_assignee: {
        Args: { p_assignee_user_id?: string; p_task_id: string }
        Returns: {
          agency_id: string
          assignee_user_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          title: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      user_has_active_agency_membership: {
        Args: { p_agency_id: string }
        Returns: boolean
      }
      user_is_active_member_of_agency: {
        Args: { p_agency_id: string; p_user_id: string }
        Returns: boolean
      }
      user_shares_active_agency_with: {
        Args: { p_other_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      agency_status: "active" | "suspended" | "archived"
      membership_role: "owner" | "member"
      membership_status: "active" | "suspended" | "removed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      agency_status: ["active", "suspended", "archived"],
      membership_role: ["owner", "member"],
      membership_status: ["active", "suspended", "removed"],
    },
  },
} as const
