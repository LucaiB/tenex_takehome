import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Event as EventIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  CalendarToday as CalendarIcon,
  Link as LinkIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { NormalizedEvent } from '../types';
import { CalendarLinkBuilder } from '../modules/calendarLinks';
import { ICSGenerator } from '../modules/ics';

interface CalendarListProps {
  events: NormalizedEvent[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onEventClick?: (event: NormalizedEvent) => void;
}

const CalendarList: React.FC<CalendarListProps> = ({
  events,
  isLoading,
  error,
  onRefresh,
  onEventClick,
}) => {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [showAllEvents, setShowAllEvents] = useState(false);
  const linkBuilder = new CalendarLinkBuilder();
  const icsGenerator = new ICSGenerator();

  const handleEventToggle = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const handleEventSelect = (eventId: string) => {
    const newSelected = new Set(selectedEvents);
    if (newSelected.has(eventId)) {
      newSelected.delete(eventId);
    } else {
      newSelected.add(eventId);
    }
    setSelectedEvents(newSelected);
  };

  const handleOpenInCalendar = (event: NormalizedEvent) => {
    const url = linkBuilder.createEventUrl(event);
    window.open(url, '_blank');
  };

  const handleDownloadICS = (event: NormalizedEvent) => {
    icsGenerator.downloadSingleEventICS(event);
  };

  const handleDownloadSelectedICS = () => {
    const selectedEventList = events.filter(event => selectedEvents.has(event.id));
    if (selectedEventList.length > 0) {
      icsGenerator.addEvents(selectedEventList);
      icsGenerator.downloadICS(`selected_events_${new Date().toISOString().split('T')[0]}.ics`);
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    }
  };

  const getEventColor = (event: NormalizedEvent): string => {
    const title = event.title.toLowerCase();
    if (title.includes('meeting') || title.includes('sync')) return '#1976d2';
    if (title.includes('call') || title.includes('zoom')) return '#388e3c';
    if (title.includes('interview')) return '#f57c00';
    if (title.includes('focus') || title.includes('work')) return '#7b1fa2';
    return '#757575';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="h6" component="h2">
                Loading Events...
              </Typography>
            </Box>
            <IconButton disabled size="small">
              <RefreshIcon />
            </IconButton>
          </Box>
          
          {/* Skeleton loading for events */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[1, 2, 3].map((index) => (
              <Box
                key={index}
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  backgroundColor: 'grey.50',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box sx={{ width: '60%', height: 20, bgcolor: 'grey.300', borderRadius: 1 }} />
                  <Box sx={{ width: 60, height: 20, bgcolor: 'grey.300', borderRadius: 1 }} />
                </Box>
                <Box sx={{ width: '40%', height: 16, bgcolor: 'grey.300', borderRadius: 1, mb: 1 }} />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Box sx={{ width: 80, height: 24, bgcolor: 'grey.300', borderRadius: 1 }} />
                  <Box sx={{ width: 100, height: 24, bgcolor: 'grey.300', borderRadius: 1 }} />
                </Box>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" action={
            <Button color="inherit" size="small" onClick={onRefresh}>
              Retry
            </Button>
          }>
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CalendarIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No events found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Your calendar appears to be empty for this time period.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
          >
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Limit events to show only first 5 by default
  const displayedEvents = showAllEvents ? events : events.slice(0, 5);
  const hasMoreEvents = events.length > 5;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2">
          Upcoming Events ({events.length})
          {!showAllEvents && hasMoreEvents && ` • Showing 5 of ${events.length}`}
        </Typography>
        <Box>
          {selectedEvents.size > 0 && (
            <Tooltip title="Download selected events as ICS">
              <IconButton
                onClick={handleDownloadSelectedICS}
                size="small"
                sx={{ mr: 1 }}
              >
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Refresh events">
            <IconButton onClick={onRefresh} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <List sx={{ p: 0 }}>
        {displayedEvents.map((event, index) => (
          <React.Fragment key={event.id}>
            <ListItem
              sx={{
                p: 0,
                mb: 1,
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              <Card
                sx={{
                  width: '100%',
                  borderLeft: `4px solid ${getEventColor(event)}`,
                  cursor: 'pointer',
                }}
                onClick={() => onEventClick?.(event)}
              >
                <CardContent sx={{ py: 2, px: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <EventIcon sx={{ fontSize: 20, color: 'text.secondary', mr: 1 }} />
                        <Typography variant="subtitle1" component="div" sx={{ fontWeight: 500 }}>
                          {event.title}
                        </Typography>
                        {event.isAllDay && (
                          <Chip
                            label="All Day"
                            size="small"
                            sx={{ ml: 1, fontSize: '0.75rem' }}
                          />
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <TimeIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(event.startTime)} • {formatTime(event.startTime)} - {formatTime(event.endTime)}
                          {!event.isAllDay && ` (${formatDuration(event.duration)})`}
                        </Typography>
                      </Box>

                      {event.location && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <LocationIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            {event.location}
                          </Typography>
                        </Box>
                      )}

                      {event.attendees.length > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <PeopleIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                          </Typography>
                        </Box>
                      )}

                      <Collapse in={expandedEvents.has(event.id)}>
                        <Box sx={{ mt: 2 }}>
                          {event.description && (
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              {event.description}
                            </Typography>
                          )}
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              startIcon={<LinkIcon />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenInCalendar(event);
                              }}
                            >
                              Open in Calendar
                            </Button>
                            <Button
                              size="small"
                              startIcon={<DownloadIcon />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadICS(event);
                              }}
                            >
                              Download ICS
                            </Button>
                          </Box>
                        </Box>
                      </Collapse>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventToggle(event.id);
                        }}
                      >
                        {expandedEvents.has(event.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </ListItem>
            {index < events.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
      
      {/* Show more/less events button */}
      {hasMoreEvents && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setShowAllEvents(!showAllEvents)}
            startIcon={showAllEvents ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            size="small"
          >
            {showAllEvents ? 'Show Less' : `Show ${events.length - 5} More Events`}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default CalendarList;
