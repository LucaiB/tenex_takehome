import { NormalizedEvent } from '../types';

export class ICSGenerator {
  private events: NormalizedEvent[] = [];

  constructor(events: NormalizedEvent[] = []) {
    this.events = events;
  }

  addEvent(event: NormalizedEvent): void {
    this.events.push(event);
  }

  addEvents(events: NormalizedEvent[]): void {
    this.events.push(...events);
  }

  generateICS(): string {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Calendar Assistant//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      ...this.events.map(event => this.generateEventICS(event)),
      'END:VCALENDAR'
    ].join('\r\n');

    return icsContent;
  }

  generateSingleEventICS(event: NormalizedEvent): string {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Calendar Assistant//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      this.generateEventICS(event),
      'END:VCALENDAR'
    ].join('\r\n');

    return icsContent;
  }

  private generateEventICS(event: NormalizedEvent): string {
    const lines = [
      'BEGIN:VEVENT',
      `UID:${event.id}@calendar-assistant`,
      `DTSTAMP:${this.formatDate(new Date())}`,
      `DTSTART:${this.formatDate(event.startTime)}`,
      `DTEND:${this.formatDate(event.endTime)}`,
      `SUMMARY:${this.escapeText(event.title)}`,
    ];

    if (event.description) {
      lines.push(`DESCRIPTION:${this.escapeText(event.description)}`);
    }

    if (event.location) {
      lines.push(`LOCATION:${this.escapeText(event.location)}`);
    }

    if (event.attendees.length > 0) {
      event.attendees.forEach(attendee => {
        lines.push(`ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${attendee}`);
      });
    }

    if (event.organizer) {
      lines.push(`ORGANIZER;CN=${this.escapeText(event.organizer)}:mailto:${event.organizer}`);
    }

    if (event.url) {
      lines.push(`URL:${event.url}`);
    }

    lines.push('END:VEVENT');
    return lines.join('\r\n');
  }

  private formatDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  private escapeText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  }

  downloadICS(filename: string = 'calendar.ics'): void {
    const icsContent = this.generateICS();
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  downloadSingleEventICS(event: NormalizedEvent, filename?: string): void {
    const icsContent = this.generateSingleEventICS(event);
    const eventFilename = filename || `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = eventFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Utility methods for common event types
  createMeetingICS(
    title: string,
    startTime: Date,
    endTime: Date,
    attendees: string[] = [],
    location?: string,
    description?: string
  ): string {
    const event: NormalizedEvent = {
      id: this.generateUID(),
      title,
      description: description || '',
      location: location || '',
      startTime,
      endTime,
      duration: Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)),
      attendees,
      organizer: '',
      isAllDay: false,
      url: '',
    };

    return this.generateSingleEventICS(event);
  }

  createAllDayEventICS(
    title: string,
    date: Date,
    description?: string
  ): string {
    const startTime = new Date(date);
    startTime.setHours(0, 0, 0, 0);
    
    const endTime = new Date(date);
    endTime.setHours(23, 59, 59, 999);

    const event: NormalizedEvent = {
      id: this.generateUID(),
      title,
      description: description || '',
      location: '',
      startTime,
      endTime,
      duration: 24 * 60, // 24 hours in minutes
      attendees: [],
      organizer: '',
      isAllDay: true,
      url: '',
    };

    return this.generateSingleEventICS(event);
  }

  createRecurringEventICS(
    title: string,
    startTime: Date,
    endTime: Date,
    recurrence: 'daily' | 'weekly' | 'monthly',
    attendees: string[] = [],
    location?: string,
    description?: string
  ): string {
    const event: NormalizedEvent = {
      id: this.generateUID(),
      title,
      description: description || '',
      location: location || '',
      startTime,
      endTime,
      duration: Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)),
      attendees,
      organizer: '',
      isAllDay: false,
      url: '',
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Calendar Assistant//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${event.id}@calendar-assistant`,
      `DTSTAMP:${this.formatDate(new Date())}`,
      `DTSTART:${this.formatDate(event.startTime)}`,
      `DTEND:${this.formatDate(event.endTime)}`,
      `SUMMARY:${this.escapeText(event.title)}`,
      `RRULE:FREQ=${recurrence.toUpperCase()}`,
    ];

    if (event.description) {
      icsContent.push(`DESCRIPTION:${this.escapeText(event.description)}`);
    }

    if (event.location) {
      icsContent.push(`LOCATION:${this.escapeText(event.location)}`);
    }

    if (event.attendees.length > 0) {
      event.attendees.forEach(attendee => {
        icsContent.push(`ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${attendee}`);
      });
    }

    icsContent.push('END:VEVENT', 'END:VCALENDAR');

    return icsContent.join('\r\n');
  }

  createFocusTimeICS(
    startTime: Date,
    endTime: Date,
    title: string = 'Focus Time'
  ): string {
    const description = 'Protected focus time - please do not schedule meetings during this period.';
    
    return this.createMeetingICS(title, startTime, endTime, [], undefined, description);
  }

  createTeamMeetingICS(
    title: string,
    startTime: Date,
    endTime: Date,
    teamEmails: string[],
    meetingType: 'standup' | 'sync' | 'review' | 'planning' = 'sync'
  ): string {
    const description = this.getTeamMeetingDescription(meetingType);
    
    return this.createMeetingICS(title, startTime, endTime, teamEmails, undefined, description);
  }

  createOneOnOneICS(
    attendeeEmail: string,
    startTime: Date,
    endTime: Date,
    topic?: string
  ): string {
    const title = topic ? `1:1 - ${topic}` : '1:1 Meeting';
    const description = topic ? `Discussion topic: ${topic}` : 'One-on-one meeting';
    
    return this.createMeetingICS(title, startTime, endTime, [attendeeEmail], undefined, description);
  }

  private generateUID(): string {
    return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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

  // Batch operations
  generateBatchICS(events: NormalizedEvent[], filename: string = 'events.ics'): void {
    const generator = new ICSGenerator(events);
    generator.downloadICS(filename);
  }

  generateEventsForDateRange(
    events: NormalizedEvent[],
    startDate: Date,
    endDate: Date,
    filename?: string
  ): void {
    const filteredEvents = events.filter(event => 
      event.startTime >= startDate && event.startTime <= endDate
    );
    
    const eventFilename = filename || `events_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.ics`;
    this.generateBatchICS(filteredEvents, eventFilename);
  }
}
