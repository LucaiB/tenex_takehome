import { NormalizedEvent } from '../types';

export class CalendarLinkBuilder {
  private baseUrl = 'https://calendar.google.com/calendar/render';

  createEventUrl(event: NormalizedEvent): string {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: this.formatDateRange(event.startTime, event.endTime),
      details: event.description,
      location: event.location,
    });

    if (event.attendees.length > 0) {
      params.append('add', event.attendees.join(','));
    }

    return `${this.baseUrl}?${params.toString()}`;
  }

  createQuickAddUrl(title: string, startTime: Date, endTime: Date): string {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: this.formatDateRange(startTime, endTime),
    });

    return `${this.baseUrl}?${params.toString()}`;
  }

  createMeetingUrl(
    title: string,
    startTime: Date,
    endTime: Date,
    attendees: string[] = [],
    location?: string,
    description?: string
  ): string {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: this.formatDateRange(startTime, endTime),
    });

    if (location) {
      params.append('location', location);
    }

    if (description) {
      params.append('details', description);
    }

    // Ensure attendees is always an array and handle edge cases
    let safeAttendees: string[] = [];
    if (Array.isArray(attendees)) {
      safeAttendees = attendees;
    } else if (typeof attendees === 'string') {
      // If attendees is a string, split by comma or treat as single attendee
      const attendeeString = attendees as string;
      safeAttendees = attendeeString.includes(',') ? attendeeString.split(',').map(e => e.trim()) : [attendeeString];
    } else if (attendees) {
      // If attendees is truthy but not array/string, try to convert
      console.warn('🔧 createMeetingUrl: attendees is not array/string:', attendees, 'type:', typeof attendees);
      safeAttendees = [];
    }

    if (safeAttendees.length > 0) {
      params.append('add', safeAttendees.join(','));
    }

    return `${this.baseUrl}?${params.toString()}`;
  }

  createFocusTimeUrl(startTime: Date, endTime: Date, title: string = 'Focus Time'): string {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: this.formatDateRange(startTime, endTime),
      details: 'Protected focus time - please do not schedule meetings during this period.',
    });

    return `${this.baseUrl}?${params.toString()}`;
  }

  createBlockedTimeUrl(
    startTime: Date,
    endTime: Date,
    title: string = 'Busy',
    description?: string
  ): string {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: this.formatDateRange(startTime, endTime),
    });

    if (description) {
      params.append('details', description);
    }

    return `${this.baseUrl}?${params.toString()}`;
  }

  createRecurringEventUrl(
    title: string,
    startTime: Date,
    endTime: Date,
    recurrence: 'daily' | 'weekly' | 'monthly',
    attendees: string[] = [],
    location?: string
  ): string {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: this.formatDateRange(startTime, endTime),
    });

    if (location) {
      params.append('location', location);
    }

    // Ensure attendees is always an array and handle edge cases
    let safeAttendees: string[] = [];
    if (Array.isArray(attendees)) {
      safeAttendees = attendees;
    } else if (typeof attendees === 'string') {
      // If attendees is a string, split by comma or treat as single attendee
      const attendeeString = attendees as string;
      safeAttendees = attendeeString.includes(',') ? attendeeString.split(',').map(e => e.trim()) : [attendeeString];
    } else if (attendees) {
      // If attendees is truthy but not array/string, try to convert
      console.warn('🔧 createRecurringEventUrl: attendees is not array/string:', attendees, 'type:', typeof attendees);
      safeAttendees = [];
    }

    if (safeAttendees.length > 0) {
      params.append('add', safeAttendees.join(','));
    }

    // Add recurrence rule
    const recurrenceRule = this.createRecurrenceRule(recurrence);
    if (recurrenceRule) {
      params.append('recur', recurrenceRule);
    }

    return `${this.baseUrl}?${params.toString()}`;
  }

  createTeamMeetingUrl(
    title: string,
    startTime: Date,
    endTime: Date,
    teamEmails: string[],
    meetingType: 'standup' | 'sync' | 'review' | 'planning' = 'sync'
  ): string {
    const description = this.getTeamMeetingDescription(meetingType);
    
    return this.createMeetingUrl(title, startTime, endTime, teamEmails, undefined, description);
  }

  createOneOnOneUrl(
    attendeeEmail: string,
    startTime: Date,
    endTime: Date,
    topic?: string
  ): string {
    const title = topic ? `1:1 - ${topic}` : '1:1 Meeting';
    const description = topic ? `Discussion topic: ${topic}` : 'One-on-one meeting';
    
    return this.createMeetingUrl(title, startTime, endTime, [attendeeEmail], undefined, description);
  }

  createClientMeetingUrl(
    clientEmail: string,
    startTime: Date,
    endTime: Date,
    projectName: string,
    agenda?: string
  ): string {
    const title = `Client Meeting - ${projectName}`;
    let description = `Client meeting for project: ${projectName}`;
    
    if (agenda) {
      description += `\n\nAgenda:\n${agenda}`;
    }

    return this.createMeetingUrl(title, startTime, endTime, [clientEmail], undefined, description);
  }

  createInterviewUrl(
    candidateEmail: string,
    startTime: Date,
    endTime: Date,
    position: string,
    interviewers: string[] = []
  ): string {
    const title = `Interview - ${position}`;
    const description = `Interview for ${position} position.\n\nInterviewers: ${interviewers.join(', ')}`;
    const allAttendees = [candidateEmail, ...interviewers];

    return this.createMeetingUrl(title, startTime, endTime, allAttendees, undefined, description);
  }

  createWorkshopUrl(
    title: string,
    startTime: Date,
    endTime: Date,
    participants: string[],
    location?: string,
    materials?: string
  ): string {
    let description = 'Workshop session';
    
    if (materials) {
      description += `\n\nMaterials: ${materials}`;
    }

    return this.createMeetingUrl(title, startTime, endTime, participants, location, description);
  }

  createAllDayEventUrl(title: string, date: Date, description?: string): string {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: this.formatDateRange(startOfDay, endOfDay),
    });

    if (description) {
      params.append('details', description);
    }

    return `${this.baseUrl}?${params.toString()}`;
  }

  createMultiDayEventUrl(
    title: string,
    startDate: Date,
    endDate: Date,
    description?: string
  ): string {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: this.formatDateRange(startDate, endDate),
    });

    if (description) {
      params.append('details', description);
    }

    return `${this.baseUrl}?${params.toString()}`;
  }

  private formatDateRange(startTime: Date, endTime: Date): string {
    const formatDate = (date: Date): string => {
      // Format as YYYYMMDDTHHMMSS in local timezone
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    };

    return `${formatDate(startTime)}/${formatDate(endTime)}`;
  }

  private createRecurrenceRule(recurrence: 'daily' | 'weekly' | 'monthly'): string {
    switch (recurrence) {
      case 'daily':
        return 'RRULE:FREQ=DAILY';
      case 'weekly':
        return 'RRULE:FREQ=WEEKLY';
      case 'monthly':
        return 'RRULE:FREQ=MONTHLY';
      default:
        return '';
    }
  }

  private getTeamMeetingDescription(meetingType: 'standup' | 'sync' | 'review' | 'planning'): string {
    switch (meetingType) {
      case 'standup':
        return 'Daily standup meeting.\n\nAgenda:\n- What did you work on yesterday?\n- What will you work on today?\n- Any blockers?';
      case 'sync':
        return 'Team sync meeting to discuss progress and align on priorities.';
      case 'review':
        return 'Team review meeting to discuss completed work and provide feedback.';
      case 'planning':
        return 'Team planning meeting to discuss upcoming work and priorities.';
      default:
        return 'Team meeting.';
    }
  }

  // Utility methods for common calendar operations
  createTodayUrl(): string {
    return 'https://calendar.google.com/calendar/r/day';
  }

  createWeekUrl(): string {
    return 'https://calendar.google.com/calendar/r/week';
  }

  createMonthUrl(): string {
    return 'https://calendar.google.com/calendar/r/month';
  }

  createAgendaUrl(): string {
    return 'https://calendar.google.com/calendar/r/agenda';
  }

  createSettingsUrl(): string {
    return 'https://calendar.google.com/calendar/r/settings';
  }

  createDraftsUrl(): string {
    return 'https://calendar.google.com/calendar/r/drafts';
  }
}
