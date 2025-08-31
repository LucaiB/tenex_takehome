import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  IconButton,
  Collapse,
  Button,
  Tooltip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Event as EventIcon,
  AccessTime as TimeIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import { NormalizedEvent, AnalyticsData } from '../types';

interface AnalyticsPanelProps {
  events: NormalizedEvent[];
  onRefresh?: () => void;
}

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({
  events,
  onRefresh,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    calculateAnalytics();
  }, [events]);

  const calculateAnalytics = () => {
    setIsCalculating(true);
    setLoadingProgress(0);
    
    // Simulate async calculation with progress
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 100);
    
    setTimeout(() => {
      clearInterval(progressInterval);
      setLoadingProgress(100);
      
      if (events.length === 0) {
        setAnalytics(null);
        setIsCalculating(false);
        return;
      }

      const totalMeetings = events.length;
      const totalMinutes = events.reduce((sum, event) => sum + event.duration, 0);
      const totalHours = Math.round(totalMinutes / 60);
      const averageMeetingDuration = totalMeetings > 0 ? totalMinutes / totalMeetings : 0;

      // Calculate day distribution
      const dayCounts: Record<string, number> = {};
      events.forEach(event => {
        const day = event.startTime.toLocaleDateString('en-US', { weekday: 'long' });
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });

      const mostActiveDay = Object.entries(dayCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'None';

      // Calculate time distribution
      const timeDistribution = { morning: 0, afternoon: 0, evening: 0 };
      events.forEach(event => {
        const hour = event.startTime.getHours();
        if (hour < 12) timeDistribution.morning++;
        else if (hour < 17) timeDistribution.afternoon++;
        else timeDistribution.evening++;
      });

      const mostActiveTime = Object.entries(timeDistribution)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'None';

      // Calculate meeting types
      const meetingTypes: Record<string, number> = {};
      events.forEach(event => {
        const title = event.title.toLowerCase();
        if (title.includes('meeting') || title.includes('sync')) {
          meetingTypes['Meetings'] = (meetingTypes['Meetings'] || 0) + 1;
        } else if (title.includes('call') || title.includes('zoom')) {
          meetingTypes['Calls'] = (meetingTypes['Calls'] || 0) + 1;
        } else if (title.includes('interview')) {
          meetingTypes['Interviews'] = (meetingTypes['Interviews'] || 0) + 1;
        } else if (title.includes('focus') || title.includes('work')) {
          meetingTypes['Focus Time'] = (meetingTypes['Focus Time'] || 0) + 1;
        } else {
          meetingTypes['Other'] = (meetingTypes['Other'] || 0) + 1;
        }
      });

      // Calculate productivity score
      const productivityScore = Math.min(100, Math.max(0, 
        100 - (totalHours * 2) - (averageMeetingDuration * 0.5) + (timeDistribution.morning * 5)
      ));

      // Generate recommendations
      const recommendations: string[] = [];
      if (totalHours > 25) {
        recommendations.push('Consider blocking focus time between meetings');
      }
      if (averageMeetingDuration > 60) {
        recommendations.push('Try reducing meeting duration to 30 minutes');
      }
      if (timeDistribution.evening > timeDistribution.morning) {
        recommendations.push('Schedule important meetings in the morning when energy is high');
      }
      if (totalMeetings > 20) {
        recommendations.push('Consider declining meetings without clear agendas');
      }

      setAnalytics({
        totalMeetings,
        totalHours,
        averageMeetingDuration,
        mostActiveDay,
        mostActiveTime,
        timeDistribution,
        meetingTypes,
        productivityScore,
        recommendations,
      });
      setIsCalculating(false);
    }, 500);
  };

  if (!analytics && !isCalculating) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <AnalyticsIcon color="primary" />
            <Typography variant="h6">Analytics</Typography>
            {onRefresh && (
              <Tooltip title="Refresh Analytics">
                <IconButton size="small" onClick={onRefresh}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">
            No events to analyze. Add some calendar events to see analytics.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (isCalculating) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <AnalyticsIcon color="primary" />
            <Typography variant="h6">Analytics</Typography>
            <CircularProgress size={20} />
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.primary" gutterBottom>
              Analyzing your calendar data...
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={loadingProgress} 
              sx={{ height: 6, borderRadius: 3 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {loadingProgress}% complete
            </Typography>
          </Box>
          
          {/* Skeleton loading for analytics */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ width: '100%', height: 60, bgcolor: 'grey.100', borderRadius: 1 }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              {[1, 2, 3, 4].map((index) => (
                <Box key={index} sx={{ textAlign: 'center', p: 1 }}>
                  <Box sx={{ width: 32, height: 32, bgcolor: 'grey.200', borderRadius: '50%', mx: 'auto', mb: 1 }} />
                  <Box sx={{ width: '60%', height: 20, bgcolor: 'grey.200', borderRadius: 1, mx: 'auto', mb: 0.5 }} />
                  <Box sx={{ width: '80%', height: 16, bgcolor: 'grey.200', borderRadius: 1, mx: 'auto' }} />
                </Box>
              ))}
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) return null;

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AnalyticsIcon color="primary" />
            <Typography variant="h6">Analytics</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {onRefresh && (
              <Tooltip title="Refresh Analytics">
                <IconButton size="small" onClick={onRefresh}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={expanded ? "Show Less" : "Show More"}>
              <IconButton size="small" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Productivity Score */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Productivity Score
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <LinearProgress
                variant="determinate"
                value={analytics.productivityScore}
                sx={{ height: 8, borderRadius: 4 }}
                color={analytics.productivityScore > 70 ? 'success' : analytics.productivityScore > 40 ? 'warning' : 'error'}
              />
            </Box>
            <Typography variant="h6" color="primary">
              {Math.round(analytics.productivityScore)}%
            </Typography>
          </Box>
        </Box>

        {/* Key Metrics */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
          <Box sx={{ textAlign: 'center', p: 1 }}>
            <EventIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="h6">{analytics.totalMeetings}</Typography>
            <Typography variant="caption" color="text.secondary">
              Total Events
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 1 }}>
            <TimeIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="h6">{analytics.totalHours}h</Typography>
            <Typography variant="caption" color="text.secondary">
              Total Hours
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 1 }}>
            <ScheduleIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="h6">{Math.round(analytics.averageMeetingDuration)}m</Typography>
            <Typography variant="caption" color="text.secondary">
              Avg Duration
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 1 }}>
            <TrendingUpIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="h6">{analytics.mostActiveDay}</Typography>
            <Typography variant="caption" color="text.secondary">
              Busiest Day
            </Typography>
          </Box>
        </Box>

        <Collapse in={expanded}>
          {/* Time Distribution */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Time Distribution
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {Object.entries(analytics.timeDistribution).map(([time, count]) => (
                <Box key={time} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" sx={{ minWidth: 80, textTransform: 'capitalize' }}>
                    {time}
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={(count / analytics.totalMeetings) * 100}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 30 }}>
                    {count}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Meeting Types */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Meeting Types
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {Object.entries(analytics.meetingTypes).map(([type, count]) => (
                <Chip
                  key={type}
                  label={`${type}: ${count}`}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>

          {/* Recommendations */}
          {analytics.recommendations.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Recommendations
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {analytics.recommendations.map((recommendation, index) => (
                  <Alert key={index} severity="info" sx={{ py: 0 }}>
                    <Typography variant="body2">
                      {recommendation}
                    </Typography>
                  </Alert>
                ))}
              </Box>
            </Box>
          )}
        </Collapse>

        {!expanded && (
          <Button
            size="small"
            onClick={() => setExpanded(true)}
            sx={{ mt: 1 }}
          >
            Show More Details
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default AnalyticsPanel;
