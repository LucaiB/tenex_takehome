import { NormalizedEvent, TimeSlot, SchedulingConstraints } from '../types';

export class SchedulerService {
  private events: NormalizedEvent[] = [];
  private constraints: SchedulingConstraints;

  constructor(constraints: SchedulingConstraints) {
    this.constraints = constraints;
  }

  setEvents(events: NormalizedEvent[]) {
    this.events = events;
  }

  findFreeSlots(
    duration: number,
    startDate: Date,
    endDate: Date,
    preferredTime?: { start: string; end: string }
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // Skip non-working days
      if (!this.constraints.workingDays.includes(currentDate.getDay())) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      const daySlots = this.findFreeSlotsForDay(currentDate, duration, preferredTime);
      slots.push(...daySlots);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  }

  private findFreeSlotsForDay(
    date: Date,
    duration: number,
    preferredTime?: { start: string; end: string }
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const dayStart = new Date(date);
    const dayEnd = new Date(date);

    // Set working hours
    if (preferredTime) {
      const [startHour, startMinute] = preferredTime.start.split(':').map(Number);
      const [endHour, endMinute] = preferredTime.end.split(':').map(Number);
      dayStart.setHours(startHour, startMinute, 0, 0);
      dayEnd.setHours(endHour, endMinute, 0, 0);
    } else {
      dayStart.setHours(9, 0, 0, 0); // 9 AM
      dayEnd.setHours(17, 0, 0, 0); // 5 PM
    }

    // Get events for this day
    const dayEvents = this.getEventsForDate(date);
    const busySlots = this.getBusySlots(dayEvents);

    // Find free slots
    let currentTime = new Date(dayStart);
    while (currentTime < dayEnd) {
      const slotEnd = new Date(currentTime.getTime() + duration * 60000);
      
      if (slotEnd <= dayEnd) {
        const isAvailable = !this.isTimeSlotBusy(currentTime, slotEnd, busySlots);
        
        if (isAvailable) {
          slots.push({
            start: new Date(currentTime),
            end: slotEnd,
            duration,
            isAvailable: true,
          });
        }
      }

      // Move to next 30-minute slot
      currentTime.setMinutes(currentTime.getMinutes() + 30);
    }

    return slots;
  }

  private getEventsForDate(date: Date): NormalizedEvent[] {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(targetDate.getDate() + 1);

    return this.events.filter(event => {
      const eventDate = new Date(event.startTime);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === targetDate.getTime();
    });
  }

  private getBusySlots(events: NormalizedEvent[]): Array<{ start: Date; end: Date }> {
    return events.map(event => ({
      start: event.startTime,
      end: event.endTime,
    }));
  }

  private isTimeSlotBusy(
    start: Date,
    end: Date,
    busySlots: Array<{ start: Date; end: Date }>
  ): boolean {
    return busySlots.some(busy => {
      return start < busy.end && end > busy.start;
    });
  }

  suggestOptimalMeetingTimes(
    duration: number,
    preferredTime?: 'morning' | 'afternoon' | 'evening' | 'any',
    urgency: 'low' | 'medium' | 'high' = 'medium'
  ): TimeSlot[] {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + 7); // Look ahead 7 days

    let timePreference: { start: string; end: string } | undefined;

    switch (preferredTime) {
      case 'morning':
        timePreference = { start: '09:00', end: '12:00' };
        break;
      case 'afternoon':
        timePreference = { start: '13:00', end: '17:00' };
        break;
      case 'evening':
        timePreference = { start: '17:00', end: '19:00' };
        break;
      default:
        timePreference = { start: '09:00', end: '17:00' };
    }

    const allSlots = this.findFreeSlots(duration, today, endDate, timePreference);
    
    // Sort by urgency and preference
    const sortedSlots = this.sortSlotsByPriority(allSlots, urgency, preferredTime);
    
    // Return top suggestions based on urgency
    const suggestionCount = urgency === 'high' ? 5 : urgency === 'medium' ? 3 : 2;
    return sortedSlots.slice(0, suggestionCount);
  }

  private sortSlotsByPriority(
    slots: TimeSlot[],
    urgency: 'low' | 'medium' | 'high',
    preferredTime?: 'morning' | 'afternoon' | 'evening' | 'any'
  ): TimeSlot[] {
    return slots.sort((a, b) => {
      // Priority 1: Earlier dates for higher urgency
      const dateDiff = a.start.getTime() - b.start.getTime();
      if (urgency === 'high' && Math.abs(dateDiff) > 24 * 60 * 60 * 1000) {
        return dateDiff;
      }

      // Priority 2: Preferred time of day
      if (preferredTime && preferredTime !== 'any') {
        const aHour = a.start.getHours();
        const bHour = b.start.getHours();
        
        const aPreferred = this.isPreferredTime(aHour, preferredTime);
        const bPreferred = this.isPreferredTime(bHour, preferredTime);
        
        if (aPreferred && !bPreferred) return -1;
        if (!aPreferred && bPreferred) return 1;
      }

      // Priority 3: Earlier in the day
      return a.start.getHours() - b.start.getHours();
    });
  }

  private isPreferredTime(hour: number, preferredTime: 'morning' | 'afternoon' | 'evening'): boolean {
    switch (preferredTime) {
      case 'morning':
        return hour >= 9 && hour < 12;
      case 'afternoon':
        return hour >= 13 && hour < 17;
      case 'evening':
        return hour >= 17 && hour < 19;
      default:
        return true;
    }
  }

  checkAvailability(
    startTime: Date,
    endTime: Date,
    attendees: string[] = []
  ): { available: boolean; conflicts: NormalizedEvent[] } {
    const conflicts = this.events.filter(event => {
      // Check time conflicts
      const timeConflict = startTime < event.endTime && endTime > event.startTime;
      
      // Check attendee conflicts
      const attendeeConflict = attendees.length > 0 && 
        attendees.some(attendee => event.attendees.includes(attendee));
      
      return timeConflict || attendeeConflict;
    });

    return {
      available: conflicts.length === 0,
      conflicts,
    };
  }

  getNextAvailableSlot(
    duration: number,
    afterTime: Date = new Date(),
    maxDays: number = 7
  ): TimeSlot | null {
    const endDate = new Date(afterTime);
    endDate.setDate(afterTime.getDate() + maxDays);

    const slots = this.findFreeSlots(duration, afterTime, endDate);
    return slots.length > 0 ? slots[0] : null;
  }

  optimizeSchedule(
    events: NormalizedEvent[],
    focus: 'reduce_meetings' | 'consolidate_meetings' | 'improve_productivity' | 'block_focus_time'
  ): string[] {
    const suggestions: string[] = [];
    const stats = this.analyzeSchedule(events);

    switch (focus) {
      case 'reduce_meetings':
        if (stats.totalMeetings > 20) {
          suggestions.push('Consider declining meetings without clear agendas');
          suggestions.push('Set "no meeting" blocks in your calendar');
        }
        if (stats.averageDuration > 60) {
          suggestions.push('Try reducing meeting duration to 30 minutes');
        }
        break;

      case 'consolidate_meetings':
        const similarMeetings = this.findSimilarMeetings(events);
        if (similarMeetings.length > 0) {
          suggestions.push('Consider consolidating similar meetings');
          suggestions.push('Batch related discussions into single meetings');
        }
        break;

      case 'improve_productivity':
        if (stats.timeDistribution.morning < 2) {
          suggestions.push('Schedule important meetings in the morning when energy is high');
        }
        if (stats.totalHours > 25) {
          suggestions.push('Consider blocking focus time between meetings');
        }
        break;

      case 'block_focus_time':
        suggestions.push('Schedule 2-hour focus blocks for deep work');
        suggestions.push('Protect focus time from meeting requests');
        suggestions.push('Use "Do Not Disturb" during focus periods');
        break;
    }

    return suggestions;
  }

  private analyzeSchedule(events: NormalizedEvent[]) {
    const totalMeetings = events.length;
    const totalMinutes = events.reduce((sum, event) => sum + event.duration, 0);
    const totalHours = Math.round(totalMinutes / 60);
    const averageDuration = totalMeetings > 0 ? totalMinutes / totalMeetings : 0;

    const timeDistribution = { morning: 0, afternoon: 0, evening: 0 };
    events.forEach(event => {
      const hour = event.startTime.getHours();
      if (hour < 12) timeDistribution.morning++;
      else if (hour < 17) timeDistribution.afternoon++;
      else timeDistribution.evening++;
    });

    return {
      totalMeetings,
      totalMinutes,
      totalHours,
      averageDuration,
      timeDistribution,
    };
  }

  private findSimilarMeetings(events: NormalizedEvent[]): NormalizedEvent[][] {
    const groups: NormalizedEvent[][] = [];
    const processed = new Set<string>();

    events.forEach(event => {
      if (processed.has(event.id)) return;

      const similar = events.filter(other => {
        if (other.id === event.id || processed.has(other.id)) return false;
        
        // Check for similar titles
        const titleSimilarity = this.calculateTitleSimilarity(event.title, other.title);
        return titleSimilarity > 0.7;
      });

      if (similar.length > 0) {
        groups.push([event, ...similar]);
        processed.add(event.id);
        similar.forEach(s => processed.add(s.id));
      }
    });

    return groups;
  }

  private calculateTitleSimilarity(title1: string, title2: string): number {
    const words1 = title1.toLowerCase().split(/\s+/);
    const words2 = title2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return totalWords > 0 ? commonWords.length / totalWords : 0;
  }
}
