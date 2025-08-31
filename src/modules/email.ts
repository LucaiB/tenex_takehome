import { EmailTemplate, EmailDraft, NormalizedEvent } from '../types';

export class EmailService {
  private accessToken: string | null = null;

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  createEmailTemplate(
    type: EmailTemplate['type'],
    context: string,
    tone: EmailTemplate['tone'] = 'professional'
  ): EmailTemplate {
    const templates = this.getTemplates();
    const template = templates[type]?.[tone] || templates.general.professional;
    
    return {
      subject: template.subject.replace('{context}', context),
      body: template.body.replace(/{context}/g, context),
      type,
      tone,
    };
  }

  private getTemplates(): Record<string, Record<string, { subject: string; body: string }>> {
    return {
      meeting_request: {
        formal: {
          subject: 'Meeting Request - {context}',
          body: `Dear [Name],

I hope this email finds you well. I would like to schedule a meeting to discuss {context}.

I am available on [date options] and would appreciate 30 minutes of your time.

Please let me know what works best for your schedule.

Best regards,
[Your Name]`
        },
        casual: {
          subject: 'Quick chat about {context}',
          body: `Hi [Name],

Hope you're doing well! I'd love to catch up about {context}.

Are you free for a quick 30-minute chat on [date options]?

Thanks!
[Your Name]`
        },
        friendly: {
          subject: "Let's meet to discuss {context}",
          body: `Hi [Name],

I hope you're having a great day! I'd really appreciate the opportunity to discuss {context} with you.

Would you be available for a 30-minute meeting on [date options]?

Looking forward to hearing from you!

Best,
[Your Name]`
        },
        professional: {
          subject: 'Meeting Request - {context}',
          body: `Dear [Name],

I hope this email finds you well. I would like to schedule a meeting to discuss {context}.

I am available on [date options] and would appreciate 30 minutes of your time.

Please let me know what works best for your schedule.

Best regards,
[Your Name]`
        }
      },
      follow_up: {
        formal: {
          subject: 'Follow-up: {context}',
          body: `Dear [Name],

Thank you for taking the time to meet with me regarding {context}.

I wanted to follow up on the key points we discussed:
- [Key point 1]
- [Key point 2]
- [Action items]

Please let me know if you have any questions or if there's anything else you'd like to discuss.

Best regards,
[Your Name]`
        },
        casual: {
          subject: 'Quick follow-up on {context}',
          body: `Hi [Name],

Thanks for the great meeting about {context}!

Just wanted to follow up on:
- [Key point 1]
- [Key point 2]
- [Next steps]

Let me know if you need anything else!

Cheers,
[Your Name]`
        },
        friendly: {
          subject: 'Following up on our {context} discussion',
          body: `Hi [Name],

It was great meeting with you about {context}!

Here's a quick summary of what we covered:
- [Key point 1]
- [Key point 2]
- [Action items]

Feel free to reach out if you have any questions!

Best,
[Your Name]`
        },
        professional: {
          subject: 'Follow-up: {context}',
          body: `Dear [Name],

Thank you for taking the time to meet with me regarding {context}.

I wanted to follow up on the key points we discussed:
- [Key point 1]
- [Key point 2]
- [Action items]

Please let me know if you have any questions or if there's anything else you'd like to discuss.

Best regards,
[Your Name]`
        }
      },
      project_update: {
        formal: {
          subject: 'Project Update - {context}',
          body: `Dear [Name],

I hope this email finds you well. I wanted to provide you with an update on the {context} project.

Current Status:
- [Status update]
- [Progress made]
- [Next steps]

Please let me know if you have any questions or require additional information.

Best regards,
[Your Name]`
        },
        casual: {
          subject: 'Quick update on {context}',
          body: `Hi [Name],

Just wanted to give you a quick update on {context}:

- [Status update]
- [Progress made]
- [Next steps]

Let me know if you need anything!

Thanks,
[Your Name]`
        },
        friendly: {
          subject: 'Update on {context}',
          body: `Hi [Name],

Hope you're doing well! Here's the latest on {context}:

- [Status update]
- [Progress made]
- [Next steps]

Feel free to reach out with any questions!

Best,
[Your Name]`
        },
        professional: {
          subject: 'Project Update - {context}',
          body: `Dear [Name],

I hope this email finds you well. I wanted to provide you with an update on the {context} project.

Current Status:
- [Status update]
- [Progress made]
- [Next steps]

Please let me know if you have any questions or require additional information.

Best regards,
[Your Name]`
        }
      },
      meeting_confirmation: {
        formal: {
          subject: 'Meeting Confirmation - {context}',
          body: `Dear [Name],

I hope this email finds you well. This email confirms your attendance at the meeting regarding {context}.

Meeting Details:
- Date: [Meeting Date]
- Time: [Meeting Time]
- Location: [Meeting Location/Virtual Platform]

Please confirm your attendance by replying to this email. If you need to reschedule or have any questions, please let me know as soon as possible.

Looking forward to our meeting.

Best regards,
[Your Name]`
        },
        casual: {
          subject: 'Confirming our meeting about {context}',
          body: `Hi [Name],

Just wanted to confirm our meeting about {context}.

When: [Meeting Date & Time]
Where: [Meeting Location/Virtual Platform]

Can you confirm you'll be there? Let me know if you need to reschedule.

Thanks!
[Your Name]`
        },
        friendly: {
          subject: 'Meeting confirmation for {context}',
          body: `Hi [Name],

Hope you're doing well! I'm confirming our meeting about {context}.

Details:
- Date: [Meeting Date]
- Time: [Meeting Time]
- Location: [Meeting Location/Virtual Platform]

Please confirm you can make it. If anything changes, just let me know!

Looking forward to it!

Best,
[Your Name]`
        },
        professional: {
          subject: 'Meeting Confirmation - {context}',
          body: `Dear [Name],

I hope this email finds you well. This email confirms your attendance at the meeting regarding {context}.

Meeting Details:
- Date: [Meeting Date]
- Time: [Meeting Time]
- Location: [Meeting Location/Virtual Platform]

Please confirm your attendance by replying to this email. If you need to reschedule or have any questions, please let me know as soon as possible.

Looking forward to our meeting.

Best regards,
[Your Name]`
        }
      },
      custom: {
        formal: {
          subject: '{context}',
          body: `Dear [Name],

I hope this email finds you well.

{context}

Please let me know if you have any questions or require additional information.

Best regards,
[Your Name]`
        },
        casual: {
          subject: '{context}',
          body: `Hi [Name],

{context}

Let me know if you need anything!

Thanks,
[Your Name]`
        },
        friendly: {
          subject: '{context}',
          body: `Hi [Name],

Hope you're doing well!

{context}

Feel free to reach out with any questions!

Best,
[Your Name]`
        },
        professional: {
          subject: '{context}',
          body: `Dear [Name],

I hope this email finds you well.

{context}

Please let me know if you have any questions or require additional information.

Best regards,
[Your Name]`
        }
      },
      general: {
        formal: {
          subject: '{context}',
          body: `Dear [Name],

I hope this email finds you well.

{context}

Please let me know if you have any questions or require additional information.

Best regards,
[Your Name]`
        },
        casual: {
          subject: '{context}',
          body: `Hi [Name],

{context}

Let me know if you need anything!

Thanks,
[Your Name]`
        },
        friendly: {
          subject: '{context}',
          body: `Hi [Name],

Hope you're doing well!

{context}

Feel free to reach out with any questions!

Best,
[Your Name]`
        },
        professional: {
          subject: '{context}',
          body: `Dear [Name],

I hope this email finds you well.

{context}

Please let me know if you have any questions or require additional information.

Best regards,
[Your Name]`
        }
      }
    };
  }

  async createEmailDraft(to: string, subject: string, body: string): Promise<EmailDraft> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      '',
      body
    ].join('\n');

    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/drafts',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            raw: btoa(email).replace(/\+/g, '-').replace(/\//g, '_')
          }
        })
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Gmail access denied. Please sign in again.');
      } else if (response.status === 403) {
        throw new Error('Gmail permissions required.');
      } else {
        throw new Error(`Gmail API error: ${response.status}`);
      }
    }

    const draft = await response.json();
    const gmailUrl = `https://mail.google.com/mail/u/0/#drafts/${draft.id}`;

    return {
      to,
      subject,
      body,
      gmailUrl,
    };
  }

  createMeetingFollowUp(event: NormalizedEvent, attendeeEmail: string): EmailTemplate {
    const subject = `Follow-up: ${event.title}`;
    const attendeeName = attendeeEmail.split('@')[0];
    
    const body = `Hi ${attendeeName},

Thank you for attending our meeting about "${event.title}" on ${event.startTime.toLocaleDateString()}.

I wanted to follow up on the key points we discussed:
- [Key point 1]
- [Key point 2]
- [Action items]

Please let me know if you have any questions or if there's anything else you'd like to discuss.

Best regards,
[Your Name]`;

    return {
      subject,
      body,
      type: 'follow_up',
      tone: 'professional',
    };
  }

  generateGmailComposeUrl(to: string, subject: string, body: string): string {
    const params = new URLSearchParams({
      to,
      subject,
      body,
    });

    return `https://mail.google.com/mail/?view=cm&fs=1&${params.toString()}`;
  }

  generateMailtoLink(to: string, subject: string, body: string): string {
    const params = new URLSearchParams({
      subject,
      body,
    });

    return `mailto:${to}?${params.toString()}`;
  }

  createCalendarInviteEmail(
    eventTitle: string,
    startTime: Date,
    endTime: Date,
    attendees: string[],
    location?: string,
    description?: string
  ): EmailTemplate {
    const subject = `Calendar Invite: ${eventTitle}`;
    const attendeeList = attendees.join(', ');
    const startDate = startTime.toLocaleDateString();
    const startTimeStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTimeStr = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let body = `Hi ${attendeeList},

I'd like to invite you to a meeting:

Event: ${eventTitle}
Date: ${startDate}
Time: ${startTimeStr} - ${endTimeStr}`;

    if (location) {
      body += `\nLocation: ${location}`;
    }

    if (description) {
      body += `\n\nDescription:\n${description}`;
    }

    body += `\n\nPlease let me know if this time works for you.

Best regards,
[Your Name]`;

    return {
      subject,
      body,
      type: 'meeting_request',
      tone: 'professional',
    };
  }

  createBulkEmailTemplate(
    recipients: string[],
    subject: string,
    body: string,
    personalization?: Record<string, string>
  ): EmailTemplate[] {
    return recipients.map(recipient => {
      let personalizedBody = body;
      
      if (personalization) {
        Object.entries(personalization).forEach(([key, value]) => {
          personalizedBody = personalizedBody.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        });
      }

      return {
        subject,
        body: personalizedBody,
        type: 'general',
        tone: 'professional',
      };
    });
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  extractEmailsFromText(text: string): string[] {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    return text.match(emailRegex) || [];
  }

  formatEmailAddresses(emails: string[]): string {
    return emails.join(', ');
  }

  parseEmailAddresses(emailString: string): string[] {
    return emailString.split(/[,;\s]+/).filter(email => this.validateEmail(email.trim()));
  }
}
