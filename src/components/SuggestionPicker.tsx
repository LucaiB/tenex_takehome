import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  IconButton,
  Collapse,
  Button,
  Tooltip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Lightbulb as LightbulbIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Schedule as ScheduleIcon,
  Email as EmailIcon,
  Analytics as AnalyticsIcon,
  Event as EventIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { Suggestion, NormalizedEvent } from '../types';

interface SuggestionPickerProps {
  events: NormalizedEvent[];
  onSuggestionClick: (suggestion: Suggestion) => void;
  onRefresh?: () => void;
}

const SuggestionPicker: React.FC<SuggestionPickerProps> = ({
  events,
  onSuggestionClick,
  onRefresh,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    generateSuggestions();
  }, [events]);

  const generateSuggestions = () => {
    setIsGenerating(true);
    
    // Simulate async suggestion generation
    setTimeout(() => {
      const newSuggestions: Suggestion[] = [];
      
      // Analyze events to generate contextual suggestions
      const totalEvents = events.length;
      const totalMinutes = events.reduce((sum, event) => sum + event.duration, 0);
      const totalHours = Math.round(totalMinutes / 60);
      
      // Meeting time suggestions
      if (totalEvents > 0) {
        newSuggestions.push({
          id: 'suggest-meeting-times',
          type: 'meeting_time',
          title: 'Find Meeting Times',
          description: `Schedule a meeting with ${totalEvents} existing events`,
          action: () => onSuggestionClick({
            id: 'suggest-meeting-times',
            type: 'meeting_time',
            title: 'Find Meeting Times',
            description: 'I can help you find optimal meeting times',
            action: () => {},
            priority: 'high',
          }),
          priority: 'high',
        });
      }

      // Email template suggestions
      if (events.some(event => event.attendees.length > 0)) {
        newSuggestions.push({
          id: 'create-follow-up',
          type: 'email_template',
          title: 'Create Follow-up Email',
          description: 'Send follow-up emails to meeting attendees',
          action: () => onSuggestionClick({
            id: 'create-follow-up',
            type: 'email_template',
            title: 'Create Follow-up Email',
            description: 'I can help you create professional follow-up emails',
            action: () => {},
            priority: 'medium',
          }),
          priority: 'medium',
        });
      }

      // Productivity analysis
      if (totalHours > 5) {
        newSuggestions.push({
          id: 'productivity-analysis',
          type: 'productivity_tip',
          title: 'Productivity Analysis',
          description: `Analyze your ${totalHours} hours of meetings`,
          action: () => onSuggestionClick({
            id: 'productivity-analysis',
            type: 'productivity_tip',
            title: 'Productivity Analysis',
            description: 'I can analyze your schedule and provide productivity insights',
            action: () => {},
            priority: 'medium',
          }),
          priority: 'medium',
        });
      }

      // Calendar optimization
      if (totalEvents > 3) {
        newSuggestions.push({
          id: 'optimize-schedule',
          type: 'calendar_optimization',
          title: 'Optimize Schedule',
          description: 'Get suggestions to improve your calendar efficiency',
          action: () => onSuggestionClick({
            id: 'optimize-schedule',
            type: 'calendar_optimization',
            title: 'Optimize Schedule',
            description: 'I can suggest ways to optimize your meeting schedule',
            action: () => {},
            priority: 'low',
          }),
          priority: 'low',
        });
      }

      // Focus time suggestions
      if (totalHours > 8) {
        newSuggestions.push({
          id: 'block-focus-time',
          type: 'calendar_optimization',
          title: 'Block Focus Time',
          description: 'Schedule protected focus time for deep work',
          action: () => onSuggestionClick({
            id: 'block-focus-time',
            type: 'calendar_optimization',
            title: 'Block Focus Time',
            description: 'I can help you schedule focus time blocks',
            action: () => {},
            priority: 'medium',
          }),
          priority: 'medium',
        });
      }

      // Default suggestions when no events
      if (totalEvents === 0) {
        newSuggestions.push(
          {
            id: 'schedule-first-meeting',
            type: 'meeting_time',
            title: 'Schedule Your First Meeting',
            description: 'Get started by scheduling your first calendar event',
            action: () => onSuggestionClick({
              id: 'schedule-first-meeting',
              type: 'meeting_time',
              title: 'Schedule Your First Meeting',
              description: 'I can help you schedule your first meeting',
              action: () => {},
              priority: 'high',
            }),
            priority: 'high',
          },
          {
            id: 'create-email-template',
            type: 'email_template',
            title: 'Create Email Template',
            description: 'Set up professional email templates for common scenarios',
            action: () => onSuggestionClick({
              id: 'create-email-template',
              type: 'email_template',
              title: 'Create Email Template',
              description: 'I can help you create email templates',
              action: () => {},
              priority: 'medium',
            }),
            priority: 'medium',
          }
        );
      }

      setSuggestions(newSuggestions);
      setIsGenerating(false);
    }, 500);
  };

  const getSuggestionIcon = (type: Suggestion['type']) => {
    switch (type) {
      case 'meeting_time':
        return <ScheduleIcon />;
      case 'email_template':
        return <EmailIcon />;
      case 'productivity_tip':
        return <TrendingUpIcon />;
      case 'calendar_optimization':
        return <EventIcon />;
      default:
        return <LightbulbIcon />;
    }
  };

  const getPriorityColor = (priority: Suggestion['priority']) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    suggestion.action();
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
    generateSuggestions();
  };

  if (isGenerating) {
    return (
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LightbulbIcon color="primary" />
              <Typography variant="h6" component="h3">
                Smart Suggestions
              </Typography>
              <CircularProgress size={16} />
            </Box>
            <IconButton disabled size="small">
              <RefreshIcon />
            </IconButton>
          </Box>
          
          <Typography variant="body2" color="text.primary" gutterBottom>
            Analyzing your calendar for personalized suggestions...
          </Typography>
          
          {/* Skeleton loading for suggestions */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {[1, 2, 3].map((index) => (
              <Box
                key={index}
                sx={{
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  backgroundColor: 'grey.50',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box sx={{ width: 20, height: 20, bgcolor: 'grey.300', borderRadius: '50%' }} />
                  <Box sx={{ width: '70%', height: 16, bgcolor: 'grey.300', borderRadius: 1 }} />
                  <Box sx={{ width: 40, height: 20, bgcolor: 'grey.300', borderRadius: 1, ml: 'auto' }} />
                </Box>
                <Box sx={{ width: '90%', height: 14, bgcolor: 'grey.300', borderRadius: 1 }} />
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LightbulbIcon color="primary" />
            <Typography variant="h6" component="h3">
              Smart Suggestions
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Refresh suggestions">
              <IconButton size="small" onClick={handleRefresh} disabled={isGenerating}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>

        <Collapse in={expanded || suggestions.length <= 3}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {isGenerating && (
              <Alert severity="info" sx={{ mb: 1 }}>
                Generating personalized suggestions...
              </Alert>
            )}

            {suggestions.map((suggestion) => (
              <Box
                key={suggestion.id}
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                    borderColor: 'primary.main',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box
                    sx={{
                      color: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      mt: 0.5,
                    }}
                  >
                    {getSuggestionIcon(suggestion.type)}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                        {suggestion.title}
                      </Typography>
                      <Chip
                        label={suggestion.priority}
                        size="small"
                        color={getPriorityColor(suggestion.priority)}
                        variant="outlined"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {suggestion.description}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Collapse>

        {!expanded && suggestions.length > 3 && (
          <Button
            size="small"
            onClick={() => setExpanded(true)}
            sx={{ mt: 1 }}
          >
            Show {suggestions.length - 3} more suggestions
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default SuggestionPicker;
