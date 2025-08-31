// Core type definitions for the Calendar Assistant
import { SchemaType } from '@google/generative-ai';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  organizer?: {
    email: string;
    displayName?: string;
  };
  htmlLink?: string;
  created: string;
  updated: string;
}

export interface NormalizedEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  attendees: string[];
  organizer: string;
  isAllDay: boolean;
  url: string;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  duration: number; // in minutes
  isAvailable: boolean;
  conflictingEvents?: CalendarEvent[];
}

export interface SchedulingConstraints {
  minDuration: number; // in minutes
  maxDuration: number; // in minutes
  preferredStartTime?: string; // HH:MM format
  preferredEndTime?: string; // HH:MM format
  workingDays: number[]; // 0-6, where 0 is Sunday
  timezone: string;
}

export interface EmailTemplate {
  subject: string;
  body: string;
  type: 'meeting_request' | 'follow_up' | 'project_update' | 'general' | 'custom';
  tone: 'formal' | 'casual' | 'friendly' | 'professional';
}

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
  gmailUrl: string;
}

export interface LLMResponse {
  type: 'text' | 'function_calls';
  content?: string;
  functionCalls?: FunctionCall[];
  error?: string;
}

export interface FunctionCall {
  function: string;
  parameters: Record<string, any>;
}

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: SchemaType;
    properties: Record<string, any>;
    required: string[];
  };
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: Date;
  functionCalls?: FunctionCall[];
}

export interface AuthState {
  isSignedIn: boolean;
  isLoading: boolean;
  error: string | null;
  user?: {
    email: string;
    name: string;
    picture?: string;
  };
}

export interface CalendarState {
  events: NormalizedEvent[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface AnalyticsData {
  totalMeetings: number;
  totalHours: number;
  averageMeetingDuration: number;
  mostActiveDay: string;
  mostActiveTime: string;
  meetingTypes: Record<string, number>;
  timeDistribution: {
    morning: number;
    afternoon: number;
    evening: number;
  };
  productivityScore: number;
  recommendations: string[];
}

export interface Suggestion {
  id: string;
  type: 'meeting_time' | 'email_template' | 'productivity_tip' | 'calendar_optimization';
  title: string;
  description: string;
  action: () => void;
  priority: 'low' | 'medium' | 'high';
}
