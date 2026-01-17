export default `# Privacy Policy

**Effective Date:** 2026-01-17

**Last Updated:** 2026-01-17

## 1. Introduction

This Privacy Policy describes how Zentik collects, uses, and protects the personal data of users who use the Zentik platform. We are committed to protecting user privacy and ensuring transparency regarding data processing.

## 2. Data Collected

### 2.1 Registration Data

During registration, Zentik collects the following minimum required data:

- **Email**: Email address used for authentication and communications
- **Username**: Unique username for account identification
- **First Name and Last Name**: Optional data provided by the user during registration
- **Password**: Encrypted password (hash) for authentication

### 2.2 SSO/OAuth Authentication Data

When you use authentication through external providers (GitHub, Google, Apple, etc.), Zentik may collect:

- **Email**: Email address associated with the OAuth provider
- **Avatar URL**: Profile image URL from the provider
- **Provider Type**: Identification of the OAuth provider used
- **Metadata**: Technical authentication data provided by the provider (excluding sensitive or advertising-related information)

This data is saved in the database to enable future authentication and improve user experience.

### 2.3 Session Data

For each login session, Zentik records:

- **User ID**: Unique user identifier
- **IP Address**: IP address used temporarily for security, fraud prevention, and abuse detection purposes. IP addresses are not used for tracking and are not retained beyond what is necessary for security purposes.
- **User Agent**: Information about the browser or application used
- **Operating System**: Device operating system
- **Browser**: Browser name and version (for web access)
- **Device Name**: Name or description of the device
- **Login Provider**: OAuth provider used (if applicable)
- **Last Activity Date**: Timestamp of the last activity in the session

Sessions are retained for a maximum of **14 days** of inactivity, after which they are automatically deleted.

### 2.4 Device Data

When you register a device to receive push notifications, Zentik collects:

- **Device Token**: Unique token for push notifications (APNS for iOS, FCM for Android, WebPush for web)
- **Device Model**: Device model
- **OS Version**: Operating system version
- **Device Name**: Name assigned to the device
- **Encryption Keys**: Public/private keys for end-to-end encryption (if enabled)
- **Metadata**: Technical device information (app versions, build info, etc., excluding sensitive or advertising-related data)

### 2.5 Messages and Notifications

Messages sent through Zentik are retained on the server for:

- **Maximum 7 days** from creation, or
- **Until all user devices confirm receipt** of the notification

Once all devices have confirmed receipt or 7 days have passed, messages are automatically deleted from the server. Messages are retained locally on user devices.

### 2.6 Attachments

Attachments (images, videos, audio, documents) uploaded to Zentik are retained on the server for a maximum of **7 days**. Attachments are automatically deleted from the server after this period, regardless of whether they are still referenced in messages.

Attachments are retained locally on user devices.

### 2.7 Tracked Events

Zentik tracks certain key events for service operation and to improve user experience. These events are tracked on the server and are essential for service operation. These events include:

- User authentication activities (logins, logouts)
- Account registrations
- Sending and receiving messages and notifications
- Bucket management operations (creation, sharing, deletion)
- Device registration and removal
- Account deletion
- System token requests
- User feedback submissions
- Email delivery status

Each event includes:
- **Event Type**: Type of tracked event
- **User ID**: User identifier associated with the event
- **Object ID**: Identifier of the related object (if applicable)
- **Target ID**: Identifier of the event target (if applicable)
- **Additional Information**: Technical event data in JSON format (excluding sensitive or advertising-related information)
- **Creation Date**: Event creation timestamp

### 2.8 Application Logs

The mobile application tracks certain user interface events for debugging and service improvement. **You can disable this UI tracking at any time through the Privacy settings in the app.** When disabled, these logs will not include your user ID.

UI interaction tracking is used solely for debugging and improving app usability and is never used for advertising, profiling, or cross-app tracking.

- **App Logs**: Error events and information about app usage
- **User Feedback**: Feedback and reports sent by users

These logs include:
- **User ID**: User identifier (when available)
- **Payload**: Structured data in JSON format containing information about the event, app version, context, error messages, etc.

## 3. Data Usage

The collected data is used exclusively for:

- **Providing the Service**: Authentication management, notification delivery, device management
- **Improving the Service**: Event analysis to identify issues and improve functionality
- **Security**: Prevention of fraud, abuse, and unauthorized access
- **Support**: User assistance and resolution of technical issues
- **Communications**: Sending confirmation emails, password resets, and important service-related communications

## 4. Data Retention

### 4.1 Messages and Notifications

- **Server Retention**: Maximum 7 days or until receipt confirmation by all devices
- **Local Retention**: Messages are retained locally on devices

### 4.2 Attachments

- **Server Retention**: Maximum 7 days
- **Local Retention**: Attachments are retained locally on devices

### 4.3 Sessions

- **Retention**: Sessions are automatically deleted after **14 days of inactivity**

### 4.4 Account Data

- **Retention**: Account data is retained until the account is deleted by the user
- **Deletion**: When a user deletes their account, all associated data is permanently deleted

### 4.5 Events and Logs

- **Retention**: Events and logs are retained for a period necessary for service operation and platform improvement

## 5. Data Sharing

**Zentik does not share, sell, or rent user personal data to third parties.**

### 5.1 No Advertising

Zentik does not use any advertising system and does not share data with advertisers or advertising networks.

### 5.2 No Third-Party Tracking

Zentik does not integrate third-party analytics services that track user behavior for advertising or profiling purposes.

### 5.3 OAuth Providers

When you use SSO authentication, data is shared only with the chosen OAuth provider (GitHub, Google, Apple, etc.) according to their respective privacy policies. Zentik receives only the minimum data necessary for authentication.

### 5.4 Push Notification Services

To send push notifications, Zentik uses official services:
- **Apple Push Notification Service (APNS)** for iOS
- **Firebase Cloud Messaging (FCM)** for Android
- **Web Push API** for web browsers

These services receive only device tokens and notification content necessary for delivery.

## 6. Data Security

Zentik implements security measures to protect personal data:

- **Encryption**: Passwords are encrypted using secure hashing algorithms
- **HTTPS**: All communications occur through encrypted HTTPS connections
- **Authentication**: Authentication system based on JWT (JSON Web Tokens)
- **Limited Access**: Only authorized personnel have access to data, and only for legitimate purposes

## 7. Your Rights

You have the right to:

- **Access**: Request a copy of your personal data
- **Correction**: Correct inaccurate or incomplete data
- **Deletion**: Delete your account and all associated data
- **Portability**: Export your data in a structured format
- **Objection**: Object to the processing of your data for legitimate purposes
- **Disable Tracking**: Disable user action tracking for non-commercial purposes through the app settings

### 7.1 Disabling UI Action Tracking

This setting applies only to optional user interface interaction logs and does not affect essential server-side events required for service operation and security.

You can disable user interface action tracking at any time through the Privacy settings in the app. When tracking is disabled:

- **Application Logs**: App logs and error tracking sent from the mobile application will not include your user ID
- **User Feedback**: Feedback submissions will not be associated with your user ID
- **Backend Events**: Server-side events (logins, notifications, bucket operations, etc.) will continue to be tracked for service operation and security purposes
- **Service Functionality**: All service functionality (notifications, authentication, etc.) will continue to work normally

To disable UI tracking, go to App Settings > Privacy and toggle "Enable Usage Tracking" to off.

To exercise these rights, contact us using the contact information provided below.

## 8. Cookies and Similar Technologies

Zentik uses local storage technologies for application operation:

- **Local Storage / AsyncStorage**: To store user preferences, authentication tokens, and settings
- **Session Storage**: To store temporary session data
- **Secure Storage**: To store sensitive data in encrypted form

These technologies are essential for application operation and are not used for tracking or advertising.

## 9. Privacy Policy Changes

We reserve the right to modify this Privacy Policy. Significant changes will be communicated to users via email or notifications in the application. The "Last Updated" date indicates when the policy was last modified.

## 10. Contact

For questions, requests, or reports regarding this Privacy Policy or the processing of personal data, you can contact us:

- **Email**: [CONTACT EMAIL]
- **Website**: [WEBSITE URL]

## 11. Legal Basis for Processing

The processing of personal data is based on:

- **Contract Performance**: To provide the service requested by the user
- **Consent**: For processing optional data and using additional services. Users may withdraw consent at any time for optional data processing through the app settings.
- **Legitimate Interest**: For service improvement, security, and fraud prevention
- **Legal Obligations**: To comply with legal and regulatory obligations

---

**Note**: This Privacy Policy applies to both the official Zentik instance and self-hosted instances. For self-hosted instances, the data controller is the administrator of that instance.`;