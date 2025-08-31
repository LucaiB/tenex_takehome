import { CalendarEvent, NormalizedEvent } from '../types';

export class CalendarService {
  private accessToken: string | null = null;

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  private async makeRequest(url: string): Promise<any> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Calendar access denied. Please sign in again.');
      } else if (response.status === 403) {
        throw new Error('Calendar permissions required.');
      } else {
        throw new Error(`Calendar API error: ${response.status}`);
      }
    }

    return response.json();
  }

  async fetchEvents(timeMin?: Date, maxResults: number = 10): Promise<CalendarEvent[]> {
    const timeMinParam = timeMin ? timeMin.toISOString() : new Date().toISOString();
    
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${timeMinParam}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`;

    const data = await this.makeRequest(url);
    return data.items || [];
  }

  async fetchEventsForDateRange(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${startDate.toISOString()}&timeMax=${endDate.toISOString()}&singleEvents=true&orderBy=startTime`;

    const data = await this.makeRequest(url);
    return data.items || [];
  }

  async fetchEventsForWeek(weekStart: Date): Promise<CalendarEvent[]> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    return this.fetchEventsForDateRange(weekStart, weekEnd);
  }

  async fetchEventsForMonth(monthStart: Date): Promise<CalendarEvent[]> {
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthStart.getMonth() + 1);
    return this.fetchEventsForDateRange(monthStart, monthEnd);
  }

  async createEvent(eventData: {
    summary: string;
    description?: string;
    location?: string;
    startTime: Date;
    endTime: Date;
    attendees?: string[];
  }): Promise<CalendarEvent> {
    console.log('Attempting to create calendar event:', eventData);
    console.log('🔧 attendees type:', typeof eventData.attendees, 'value:', eventData.attendees, 'isArray:', Array.isArray(eventData.attendees));
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const event = {
      summary: eventData.summary,
      description: eventData.description || '',
      location: eventData.location || '',
      start: {
        dateTime: eventData.startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: eventData.endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees: Array.isArray(eventData.attendees) ? eventData.attendees.map(email => ({ email })) : [],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 10 },
        ],
      },
    };

    console.log('Making API request to create event:', {
      url: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      event: event,
      hasToken: !!this.accessToken
    });

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    console.log('API response status:', response.status, response.statusText);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Calendar access denied. Please sign in again.');
      } else if (response.status === 403) {
        throw new Error('Calendar permissions required.');
      } else {
        throw new Error(`Failed to create calendar event: ${response.status}`);
      }
    }

    return response.json();
  }
}

export function normalizeEvent(event: CalendarEvent): NormalizedEvent {
  const startTime = new Date(event.start.dateTime || event.start.date!);
  const endTime = new Date(event.end.dateTime || event.end.date!);
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  const isAllDay = !event.start.dateTime;

  return {
    id: event.id,
    title: event.summary || '(No title)',
    description: event.description || '',
    location: event.location || '',
    startTime,
    endTime,
    duration,
    attendees: event.attendees?.map(a => a.email) || [],
    organizer: event.organizer?.email || '',
    isAllDay,
    url: event.htmlLink || '',
  };
}

export function normalizeEvents(events: CalendarEvent[]): NormalizedEvent[] {
  return events.map(normalizeEvent);
}

export function filterEventsByType(events: NormalizedEvent[], type: 'meetings' | 'calls' | 'all'): NormalizedEvent[] {
  if (type === 'all') return events;

  return events.filter(event => {
    const title = event.title.toLowerCase();
    if (type === 'meetings') {
      return title.includes('meeting') || title.includes('sync') || title.includes('standup');
    } else if (type === 'calls') {
      return title.includes('call') || title.includes('phone') || title.includes('zoom');
    }
    return false;
  });
}

export function sortEventsByDate(events: NormalizedEvent[]): NormalizedEvent[] {
  return [...events].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

export function getEventsForDate(events: NormalizedEvent[], date: Date): NormalizedEvent[] {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  const nextDate = new Date(targetDate);
  nextDate.setDate(targetDate.getDate() + 1);

  return events.filter(event => {
    const eventDate = new Date(event.startTime);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate.getTime() === targetDate.getTime();
  });
}

export function getEventsForTimeRange(events: NormalizedEvent[], startTime: Date, endTime: Date): NormalizedEvent[] {
  return events.filter(event => {
    return event.startTime >= startTime && event.endTime <= endTime;
  });
}

export function calculateEventStats(events: NormalizedEvent[]) {
  const totalMeetings = events.length;
  const totalMinutes = events.reduce((sum, event) => sum + event.duration, 0);
  const totalHours = totalMinutes / 60;
  const averageDuration = totalMeetings > 0 ? totalMinutes / totalMeetings : 0;

  const dayCounts: Record<string, number> = {};
  const timeCounts: Record<string, number> = { morning: 0, afternoon: 0, evening: 0 };

  events.forEach(event => {
    const day = event.startTime.toLocaleDateString('en-US', { weekday: 'long' });
    dayCounts[day] = (dayCounts[day] || 0) + 1;

    const hour = event.startTime.getHours();
    if (hour < 12) timeCounts.morning++;
    else if (hour < 17) timeCounts.afternoon++;
    else timeCounts.evening++;
  });

  const mostActiveDay = Object.entries(dayCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'None';

  const mostActiveTime = Object.entries(timeCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'None';

  return {
    totalMeetings,
    totalMinutes,
    totalHours,
    averageDuration,
    mostActiveDay,
    mostActiveTime,
    dayDistribution: dayCounts,
    timeDistribution: timeCounts,
  };
}
