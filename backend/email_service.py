import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any
from datetime import datetime

class EmailService:
    def __init__(self, email: str = None, password: str = None):
        self.email = email or os.getenv("GMAIL_EMAIL")
        self.password = password or os.getenv("GMAIL_APP_PASSWORD")
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 587
        
        # Email templates
        self.templates = {
            "welcome": {
                "subject": "Welcome to NUST Campus - Account Created",
                "template": """
Dear {student_name},

Welcome to NUST University! We're excited to have you join our academic community.

Your student account has been successfully created with the following details:
• Student ID: {student_id}
• Department: {department}
• Registered Email: {email}
• Account Created: {created_date}

Getting Started:
• You can now access all campus facilities and services
• Keep your student ID safe - you'll need it for various campus activities
• Visit the student portal to complete your profile setup
• Check out upcoming orientation events

Campus Resources:
• Library: Open Mon-Fri 8AM-10PM, Sat 9AM-8PM, Sun 10AM-6PM
• Cafeteria: Breakfast 7-10AM, Lunch 12-3PM, Dinner 6-9PM
• Student Services: Available for any questions or support

If you have any questions or need assistance, don't hesitate to contact our campus admin team.

Welcome to NUST!

Best regards,
NUST Campus Administration Team
                """
            },
            "profile_update": {
                "subject": "Profile Update Notification - NUST Campus",
                "template": """
Dear {student_name},

This email confirms that your student profile has been updated.

Update Details:
• Field Modified: {field_updated}
• Previous Value: {old_value}
• New Value: {new_value}
• Updated On: {update_date}
• Updated By: Campus Admin

If you did not request this change or believe this update was made in error, please contact the campus administration team immediately.

For your security, we recommend:
• Regularly reviewing your profile information
• Reporting any unauthorized changes immediately
• Keeping your contact information up to date

Best regards,
NUST Campus Administration Team
                """
            },
            "general_notification": {
                "subject": "NUST Campus Notification",
                "template": """
Dear {student_name},

{message_content}

This message was sent on: {send_date}

If you have any questions regarding this notification, please contact the campus administration team.

Best regards,
NUST Campus Administration Team
                """
            }
        }
        
    def _format_template(self, template_type: str, **kwargs) -> Dict[str, str]:
        """Format email template with provided data"""
        if template_type not in self.templates:
            template_type = "general_notification"
        
        template_data = self.templates[template_type]
        
        # Add current timestamp if not provided
        kwargs.setdefault("send_date", datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        kwargs.setdefault("created_date", datetime.now().strftime('%Y-%m-%d'))
        kwargs.setdefault("update_date", datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        
        try:
            formatted_subject = template_data["subject"].format(**kwargs)
            formatted_body = template_data["template"].format(**kwargs)
            
            return {
                "subject": formatted_subject,
                "body": formatted_body.strip()
            }
        except KeyError as e:
            # Fallback to general template if formatting fails
            return self._format_template("general_notification", 
                                       student_name=kwargs.get("student_name", "Student"),
                                       message_content=kwargs.get("message", "Campus notification"))
    
    def send_welcome_email(self, student_id: str, recipient_email: str, student_name: str, 
                          department: str, email: str) -> Dict[str, Any]:
        """Send welcome email using template"""
        formatted_email = self._format_template("welcome",
                                               student_id=student_id,
                                               student_name=student_name,
                                               department=department,
                                               email=email)
        
        return self.send_email(student_id, recipient_email, formatted_email["body"], 
                             formatted_email["subject"])
    
    def send_update_notification(self, student_id: str, recipient_email: str, student_name: str,
                               field_updated: str, old_value: str, new_value: str) -> Dict[str, Any]:
        """Send profile update notification using template"""
        formatted_email = self._format_template("profile_update",
                                               student_name=student_name,
                                               field_updated=field_updated,
                                               old_value=old_value,
                                               new_value=new_value)
        
        return self.send_email(student_id, recipient_email, formatted_email["body"], 
                             formatted_email["subject"])
        
    def send_email(self, student_id: str, recipient_email: str, message: str, 
                  subject: str = None) -> Dict[str, Any]:
        """Send email to student with enhanced functionality"""
        
        # Use default subject if not provided
        if not subject:
            subject = f"NUST Campus Admin Notification for Student {student_id}"
            
        # Check if we have email credentials
        if not self.email or not self.password:
            # Mock email sending for demo purposes
            mock_response = self._create_mock_email_response(
                student_id, recipient_email, message, subject, success=True
            )
            print(f"[MOCK EMAIL] {mock_response['log_message']}")
            return mock_response
        
        try:
            # Create message
            msg = MIMEMultipart()
            msg['From'] = self.email
            msg['To'] = recipient_email
            msg['Subject'] = subject
            
            # Create HTML version of email for better formatting
            html_message = self._convert_to_html(message)
            
            # Attach both plain text and HTML versions
            msg.attach(MIMEText(message, 'plain'))
            msg.attach(MIMEText(html_message, 'html'))
            
            # Connect to server and send email
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.email, self.password)
            text = msg.as_string()
            server.sendmail(self.email, recipient_email, text)
            server.quit()
            
            return {
                "success": True,
                "message": "Email sent successfully",
                "timestamp": datetime.now().isoformat(),
                "recipient": recipient_email,
                "subject": subject,
                "mock": False,
                "log_message": f"Email sent to {recipient_email}: {subject}"
            }
            
        except Exception as e:
            error_response = self._create_mock_email_response(
                student_id, recipient_email, message, subject, success=False, error=str(e)
            )
            print(f"[EMAIL ERROR] {error_response['log_message']}")
            return error_response
    
    def _create_mock_email_response(self, student_id: str, recipient_email: str, 
                                  message: str, subject: str, success: bool = True, 
                                  error: str = None) -> Dict[str, Any]:
        """Create standardized mock email response"""
        timestamp = datetime.now().isoformat()
        
        if success:
            log_message = (f"To: {recipient_email} | Subject: {subject} | "
                         f"Student: {student_id} | Status: DELIVERED (MOCK)")
            return {
                "success": True,
                "message": "Email sent successfully (mock mode - no actual email sent)",
                "timestamp": timestamp,
                "recipient": recipient_email,
                "subject": subject,
                "student_id": student_id,
                "mock": True,
                "log_message": log_message,
                "preview": message[:100] + "..." if len(message) > 100 else message
            }
        else:
            log_message = (f"FAILED - To: {recipient_email} | Subject: {subject} | "
                         f"Student: {student_id} | Error: {error}")
            return {
                "success": False,
                "message": f"Failed to send email: {error}",
                "timestamp": timestamp,
                "recipient": recipient_email,
                "subject": subject,
                "student_id": student_id,
                "mock": True,
                "log_message": log_message,
                "error": error
            }
    
    def _convert_to_html(self, text_message: str) -> str:
        """Convert plain text message to basic HTML formatting"""
        # Simple HTML conversion for better email display
        html_message = text_message.replace('\n', '<br>')
        
        # Add basic styling
        html_template = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    {html_message}
                    <hr style="margin: 20px 0; border: 1px solid #eee;">
                    <p style="font-size: 12px; color: #666;">
                        This email was sent by the NUST Campus Administration System.<br>
                        If you have questions, please contact admin@nust.edu.pk
                    </p>
                </div>
            </body>
        </html>
        """
        
        return html_template