import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Grid,
  Paper,
  Chip,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  ViewWeek as ViewWeekIcon,
  ViewDay as ViewDayIcon,
  ViewModule as ViewModuleIcon,
  Event as EventIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { NormalizedEvent } from '../types';

interface CalendarViewProps {
  events: NormalizedEvent[];
  onEventClick?: (event: NormalizedEvent) => void;
  onRefresh?: () => void;
}

type ViewMode = 'month' | 'week' | 'day';

const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  onEventClick,
  onRefresh,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [dayViewStartHour, setDayViewStartHour] = useState(0); // Will be calculated dynamically

  // Calculate calendar data
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: NormalizedEvent[];
    }> = [];
    
    // Generate 6 weeks of dates (42 days)
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.startTime);
        return eventDate.toDateString() === date.toDateString();
      });
      
      days.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === new Date().toDateString(),
        events: dayEvents,
      });
    }
    
    return days;
  }, [currentDate, events]);

  // Week view data
  const weekData = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const weekDays: Array<{
      date: Date;
      dayName: string;
      events: NormalizedEvent[];
    }> = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.startTime);
        return eventDate.toDateString() === date.toDateString();
      });
      
      weekDays.push({
        date,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        events: dayEvents,
      });
    }
    
    return weekDays;
  }, [currentDate, events]);

  // Day view data
  const dayData = useMemo(() => {
    const dayEvents = events.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate.toDateString() === currentDate.toDateString();
    });
    
    // Sort events by start time
    return dayEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [currentDate, events]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setDate(prev.getDate() - 7);
      } else {
        newDate.setDate(prev.getDate() + 7);
      }
      return newDate;
    });
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setDate(prev.getDate() - 1);
      } else {
        newDate.setDate(prev.getDate() + 1);
      }
      return newDate;
    });
  };



  // Calculate optimal start hour for 8-hour window around current time
  const calculateOptimalStartHour = (targetDate: Date): number => {
    const currentHour = targetDate.getHours();
    
    // Calculate the center of our 8-hour window
    const centerHour = currentHour;
    
    // Calculate start hour (4 hours before center)
    let startHour = centerHour - 4;
    
    // Ensure we don't go past 11:59 PM (max 16 as start hour for 8-hour window)
    if (startHour + 8 > 24) {
      startHour = 16; // This will show 4 PM to 12 AM
    }
    
    // Ensure we don't go before 12:00 AM
    if (startHour < 0) {
      startHour = 0; // This will show 12 AM to 8 AM
    }
    
    return startHour;
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    // Calculate optimal start hour based on current time
    const optimalStart = calculateOptimalStartHour(today);
    setDayViewStartHour(optimalStart);
  };

  // Auto-scroll to current time when day view is loaded
  React.useEffect(() => {
    if (viewMode === 'day') {
      // Calculate optimal start hour for the current date
      const optimalStart = calculateOptimalStartHour(currentDate);
      setDayViewStartHour(optimalStart);
      
      // Use setTimeout to ensure the DOM has rendered
      setTimeout(() => {
        const dayViewContainer = document.querySelector('[data-day-view-container]');
        if (dayViewContainer) {
          // Scroll to show the 8-hour window starting at optimal start hour
          dayViewContainer.scrollTop = optimalStart * 50;
        }
      }, 100);
    }
  }, [viewMode, currentDate]);

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getEventColor = (event: NormalizedEvent): string => {
    const title = event.title.toLowerCase();
    if (title.includes('meeting') || title.includes('sync')) return theme.palette.primary.main;
    if (title.includes('call') || title.includes('zoom')) return theme.palette.success.main;
    if (title.includes('interview')) return theme.palette.warning.main;
    if (title.includes('focus') || title.includes('work')) return theme.palette.secondary.main;
    return theme.palette.grey[600];
  };

  const renderMonthView = () => (
    <Box>
      {/* Month header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={() => navigateMonth('prev')} size="small">
            <ChevronLeftIcon />
          </IconButton>
          <IconButton onClick={() => navigateMonth('next')} size="small">
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Day headers */}
      <Box sx={{ display: 'flex', mb: 1 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <Box
            key={day}
            sx={{
              flex: 1,
              p: 1,
              textAlign: 'center',
              fontWeight: 600,
              color: 'text.secondary',
              fontSize: '0.875rem',
            }}
          >
            {day}
          </Box>
        ))}
      </Box>

      {/* Calendar grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
        {calendarData.map((day, index) => (
          <Paper
            key={index}
            sx={{
              minHeight: { xs: 80, md: 100 },
              p: 1,
              cursor: 'pointer',
              backgroundColor: day.isToday ? 'primary.50' : 'transparent',
              border: day.isToday ? `2px solid ${theme.palette.primary.main}` : '1px solid',
              borderColor: day.isToday ? 'primary.main' : 'divider',
              borderRadius: 1,
              transition: 'all 0.2s',
              '&:hover': {
                backgroundColor: 'action.hover',
                transform: 'scale(1.02)',
              },
              ...(day.isCurrentMonth ? {} : { opacity: 0.4 }),
            }}
            onClick={() => {
              setCurrentDate(day.date);
              setViewMode('day');
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: day.isToday ? 700 : 500,
                color: day.isToday ? 'primary.main' : 'text.primary',
                mb: 1,
              }}
            >
              {day.date.getDate()}
            </Typography>
            
            {/* Events */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {day.events.slice(0, 3).map((event, eventIndex) => (
                <Box
                  key={eventIndex}
                  sx={{
                    p: 0.5,
                    backgroundColor: getEventColor(event),
                    color: 'white',
                    borderRadius: 0.5,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    '&:hover': {
                      opacity: 0.8,
                    },
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick?.(event);
                  }}
                >
                  {event.title}
                </Box>
              ))}
              {day.events.length > 3 && (
                <Typography variant="caption" color="text.secondary">
                  +{day.events.length - 3} more
                </Typography>
              )}
            </Box>
          </Paper>
        ))}
      </Box>
    </Box>
  );

  const renderWeekView = () => (
    <Box>
      {/* Week header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          {weekData[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekData[6].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={() => navigateWeek('prev')} size="small">
            <ChevronLeftIcon />
          </IconButton>
          <IconButton onClick={() => navigateWeek('next')} size="small">
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Week grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
        {weekData.map((day, index) => (
          <Paper
            key={index}
            sx={{
              minHeight: 200,
              p: 1,
              border: day.date.toDateString() === new Date().toDateString() ? `2px solid ${theme.palette.primary.main}` : '1px solid',
              borderColor: day.date.toDateString() === new Date().toDateString() ? 'primary.main' : 'divider',
              borderRadius: 1,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: day.date.toDateString() === new Date().toDateString() ? 700 : 500,
                color: day.date.toDateString() === new Date().toDateString() ? 'primary.main' : 'text.primary',
                mb: 1,
                textAlign: 'center',
              }}
            >
              {day.dayName}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                textAlign: 'center',
                color: 'text.secondary',
                mb: 1,
              }}
            >
              {day.date.getDate()}
            </Typography>
            
            {/* Events */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {day.events.map((event, eventIndex) => (
                <Box
                  key={eventIndex}
                  sx={{
                    p: 0.5,
                    backgroundColor: getEventColor(event),
                    color: 'white',
                    borderRadius: 0.5,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    '&:hover': {
                      opacity: 0.8,
                    },
                  }}
                  onClick={() => onEventClick?.(event)}
                >
                  <Box sx={{ fontWeight: 500, mb: 0.5 }}>
                    {formatTime(event.startTime)}
                  </Box>
                  <Box sx={{ fontSize: '0.7rem', opacity: 0.9 }}>
                    {event.title}
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        ))}
      </Box>
    </Box>
  );

  const renderDayView = () => (
    <Box>
      {/* Day header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          {currentDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
          })}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={() => navigateDay('prev')} size="small">
            <ChevronLeftIcon />
          </IconButton>
          <IconButton onClick={() => navigateDay('next')} size="small">
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>



      {/* Time slots - Show all 24 hours in scrollable container */}
      <Box 
        data-day-view-container
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          maxHeight: 400, // Limit height to make it more compact
          overflow: 'auto',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'grey.100',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'grey.400',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: 'grey.500',
            },
          },
        }}
      >
        {Array.from({ length: 24 }, (_, index) => {
          const hour = index;
          const timeEvents = dayData.filter(event => {
            const eventHour = event.startTime.getHours();
            return eventHour === hour;
          });

          return (
            <Box
              key={hour}
              sx={{
                display: 'flex',
                minHeight: 50, // Smaller height for more compact view
                borderBottom: '1px solid',
                borderColor: 'divider',
                position: 'relative',
              }}
            >
              {/* Time label */}
              <Box
                sx={{
                  width: 80,
                  p: 1,
                  textAlign: 'right',
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                  fontWeight: 500,
                  borderRight: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: 'grey.50',
                }}
              >
                {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </Box>
              
              {/* Events in this time slot */}
              <Box sx={{ flex: 1, p: 1, position: 'relative' }}>
                {timeEvents.map((event, eventIndex) => (
                  <Paper
                    key={eventIndex}
                    sx={{
                      p: 1,
                      backgroundColor: getEventColor(event),
                      color: 'white',
                      borderRadius: 1,
                      cursor: 'pointer',
                      mb: 0.5,
                      '&:hover': {
                        opacity: 0.9,
                        transform: 'translateX(2px)',
                      },
                      transition: 'all 0.2s',
                    }}
                    onClick={() => onEventClick?.(event)}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {event.title}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>
                      {formatTime(event.startTime)} - {formatTime(event.endTime)}
                    </Typography>
                    {event.location && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <LocationIcon sx={{ fontSize: 12 }} />
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                          {event.location}
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                ))}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );

  return (
    <Card>
      <CardContent>
        {/* Calendar controls */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<TodayIcon />}
              onClick={goToToday}
              size="small"
            >
              Today
            </Button>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton onClick={() => navigateMonth('prev')} size="small">
                <ChevronLeftIcon />
              </IconButton>
              <IconButton onClick={() => navigateMonth('next')} size="small">
                <ChevronRightIcon />
              </IconButton>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newView) => newView && setViewMode(newView)}
              size="small"
            >
              <ToggleButton value="month" aria-label="month view">
                <Tooltip title="Month view">
                  <ViewModuleIcon />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="week" aria-label="week view">
                <Tooltip title="Week view">
                  <ViewWeekIcon />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="day" aria-label="day view">
                <Tooltip title="Day view">
                  <ViewDayIcon />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>

            {onRefresh && (
              <Tooltip title="Refresh calendar">
                <IconButton
                  onClick={onRefresh}
                  size="small"
                  sx={{ ml: 1 }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Calendar content */}
        <Box>
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'day' && renderDayView()}
        </Box>
      </CardContent>
    </Card>
  );
};

export default CalendarView;
