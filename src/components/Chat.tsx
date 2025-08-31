import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Paper,
  CircularProgress,
  Chip,
  Divider,
  Alert,
  Button,
  Tooltip,
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { ChatMessage, FunctionCall } from '../types';

interface ChatProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onClearHistory: () => void;
  error?: string | null;
}

const Chat: React.FC<ChatProps> = ({
  messages,
  isLoading,
  onSendMessage,
  onClearHistory,
  error,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  const handleSend = () => {
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const formatFunctionCalls = (functionCalls: FunctionCall[]) => {
    return functionCalls.map((call, index) => (
      <Box key={index} sx={{ mb: 1 }}>
        <Chip
          label={`${call.function}()`}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ mb: 1 }}
        />
        <Paper
          variant="outlined"
          sx={{
            p: 1,
            backgroundColor: 'grey.50',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
          }}
        >
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(call.parameters, null, 2)}
          </pre>
        </Paper>
      </Box>
    ));
  };

  const formatMessageContent = (content: string) => {
    // Simple markdown-like formatting
    const formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br />');

    return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" component="h2">
              AI Assistant
            </Typography>
            <Box>
              <Tooltip title="Clear conversation">
                <IconButton size="small" onClick={onClearHistory}>
                  <ClearIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        {/* Messages */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {messages.length === 0 && !isLoading && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <BotIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Welcome to your Calendar Assistant!
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                I can help you manage your calendar, create email drafts, suggest meeting times, and more.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try asking me something like:
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Chip
                  label="Analyze my schedule"
                  size="small"
                  onClick={() => onSendMessage('Analyze my schedule')}
                  sx={{ cursor: 'pointer' }}
                />
                <Chip
                  label="Suggest meeting times"
                  size="small"
                  onClick={() => onSendMessage('Suggest meeting times for a 30-minute meeting')}
                  sx={{ cursor: 'pointer' }}
                />
                <Chip
                  label="Create email draft"
                  size="small"
                  onClick={() => onSendMessage('Create an email draft to schedule a meeting')}
                  sx={{ cursor: 'pointer' }}
                />
              </Box>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                display: 'flex',
                gap: 2,
                alignItems: 'flex-start',
              }}
            >
              <Avatar
                sx={{
                  bgcolor: message.sender === 'user' ? 'primary.main' : 'secondary.main',
                  width: 32,
                  height: 32,
                }}
              >
                {message.sender === 'user' ? <PersonIcon /> : <BotIcon />}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 1,
                  }}
                >
                  <Typography variant="subtitle2" color="text.secondary">
                    {message.sender === 'user' ? 'You' : 'Assistant'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Copy message">
                      <IconButton
                        size="small"
                        onClick={() => handleCopyMessage(message.id, message.text)}
                      >
                        {copiedMessageId === message.id ? <CheckIcon /> : <CopyIcon />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    backgroundColor: message.sender === 'user' ? 'primary.50' : 'grey.50',
                  }}
                >
                  {message.functionCalls && message.functionCalls.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        Function calls:
                      </Typography>
                      {formatFunctionCalls(message.functionCalls)}
                    </Box>
                  )}
                  <Typography variant="body2" component="div">
                    {formatMessageContent(message.text)}
                  </Typography>
                </Paper>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {message.timestamp.toLocaleTimeString()}
                </Typography>
              </Box>
            </Box>
          ))}

          {isLoading && (
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                alignItems: 'flex-start',
                animation: 'fadeIn 0.3s ease-in-out',
                '@keyframes fadeIn': {
                  '0%': { opacity: 0, transform: 'translateY(10px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' },
                },
              }}
            >
              <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                <BotIcon />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Assistant
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    backgroundColor: 'grey.50',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <CircularProgress 
                    size={20} 
                    thickness={4}
                    sx={{ color: 'primary.main' }}
                  />
                  <Box>
                    <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                      Analyzing your request...
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      This usually takes a few seconds
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Box>

        {/* Input */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              ref={inputRef}
              fullWidth
              multiline
              maxRows={4}
              placeholder="Ask me anything about your calendar..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              variant="outlined"
              size="small"
            />
            <IconButton
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              color="primary"
              sx={{ alignSelf: 'flex-end' }}
            >
              {isLoading ? <CircularProgress size={20} /> : <SendIcon />}
            </IconButton>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Press Enter to send, Shift+Enter for new line
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default Chat;
