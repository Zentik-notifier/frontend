export default `# Cookie Policy

**Effective Date:** [DATE]

**Last Updated:** [DATE]

**Data Controller:** [COMPANY NAME]

## 1. Introduction

This Cookie Policy explains how Zentik uses cookies and similar technologies when you visit our web and mobile applications. We inform you about:

- What cookies are
- Which cookies we use
- How to manage cookies
- Your rights regarding cookies

## 2. What Are Cookies

### 2.1 Definition
Cookies are small text files that are stored on your device (computer, tablet, smartphone) when you visit a website or use an application. Cookies allow the website to "remember" your actions and preferences for a period of time.

### 2.2 How They Work
- **Storage**: Cookies are saved by the browser or app
- **Sending**: They are automatically sent to the server with each request
- **Expiration**: Each cookie has a specific expiration date
- **Domain**: Cookies are associated with a specific domain

### 2.3 Similar Technologies
In addition to traditional cookies, we also use:
- **Local Storage**: local storage in the browser
- **Session Storage**: session-based storage
- **AsyncStorage**: React Native local storage
- **Secure Storage**: encrypted local storage for sensitive data

## 3. Types of Cookies We Use

### 3.1 Essential Cookies (Necessary)
These cookies are necessary for the application to function and cannot be disabled.

**Name** | **Purpose** | **Duration** | **Domain**
---------|-----------|------------|------------
\`accessToken\` | User authentication token | Session | \`.zentik.com\`
\`refreshToken\` | Token refresh for authentication | Session | \`.zentik.com\`
\`session_id\` | Session identification | Session | \`.zentik.com\`

**Legal Basis**: Contract performance
**Impact**: App doesn't work without these cookies

### 3.2 Functional Cookies
These cookies improve user experience by remembering your preferences.

**Name** | **Purpose** | **Duration** | **Domain**
---------|-----------|------------|------------
\`custom_api_url\` | Custom API endpoint configuration | Persistent | \`.zentik.com\`
\`user_settings\` | User preferences and settings | 1 year | \`.zentik.com\`
\`theme_mode\` | Interface theme preference | 1 year | \`.zentik.com\`
\`locale\` | Language and localization settings | 1 year | \`.zentik.com\`
\`timezone\` | User's timezone preference | 1 year | \`.zentik.com\`

**Legal Basis**: Legitimate interest
**Impact**: App works but without personalization

### 3.3 Storage and Cache Cookies
These cookies manage file storage and image caching.

**Name** | **Purpose** | **Duration** | **Domain**
---------|-----------|------------|------------
\`image_cache_metadata\` | Image cache management | 1 year | \`.zentik.com\`
\`cache_retention_policies\` | Cache cleanup policies | 1 year | \`.zentik.com\`
\`notification_filters\` | Notification preference settings | 1 year | \`.zentik.com\`

**Legal Basis**: Legitimate interest
**Impact**: App works but without cached content

### 3.4 OAuth Authentication Cookies
For OAuth providers (GitHub, Google, custom):

**Name** | **Purpose** | **Duration**
---------|-----------|------------
\`oauth_state\` | OAuth state verification | 10 minutes
\`oauth_provider\` | Selected OAuth provider | Session
\`oauth_redirect\` | Post-login redirect URL | Session

## 4. Local Storage and AsyncStorage

### 4.1 Web Browser Storage (localStorage)
For web platform users:

**Key** | **Purpose** | **Duration**
---------|-----------|------------
\`accessToken\` | JWT access token | Session
\`refreshToken\` | JWT refresh token | Session
\`custom_api_url\` | Custom API endpoint | Persistent

### 4.2 Mobile App Storage (AsyncStorage)
For mobile app users:

**Key** | **Purpose** | **Duration**
---------|-----------|------------
\`@zentik/user_settings\` | Complete user settings | Persistent
\`@zentik/theme_mode\` | Theme preference | Persistent
\`@zentik/notification_filters\` | Notification preferences | Persistent
\`@zentik/custom_api_url\` | Custom API configuration | Persistent
\`@image_cache_metadata\` | Image cache information | Persistent
\`@cache_retention_policies\` | Cache management policies | Persistent

### 4.3 Secure Storage (Keychain/iOS, Keystore/Android)
For sensitive authentication data:

**Key** | **Purpose** | **Duration**
---------|-----------|------------
\`zentik-auth\` | Encrypted access and refresh tokens | Persistent
\`device_token\` | Push notification device token | Persistent

## 5. Push Notification Tokens

### 5.1 Device Registration
For push notification services:

**Token Type** | **Purpose** | **Storage Location**
---------|-----------|------------
Push Token | iOS APNs notifications | AsyncStorage
iOS Device Token | Native iOS notifications | Secure Storage
Android FCM Token | Native Android notifications | Secure Storage

## 6. How to Manage Cookies and Storage

### 6.1 Web Browser Management
You can control and manage cookies in several ways:

#### **Browser Settings**
- **Chrome**: Settings > Privacy and security > Cookies
- **Firefox**: Options > Privacy & Security > Cookies
- **Safari**: Preferences > Privacy > Manage Website Data
- **Edge**: Settings > Cookies and site permissions

#### **Local Storage Control**
- **Developer Tools**: F12 > Application > Local Storage
- **Browser Extensions**: Privacy-focused extensions
- **Incognito Mode**: Automatic cleanup on session end

### 6.2 Mobile App Management
For mobile app users:

#### **App Settings**
- **Settings Menu**: Legal & Privacy section
- **Storage Management**: Clear cache and data
- **Notification Settings**: Manage push permissions

#### **Device Settings**
- **iOS**: Settings > General > iPhone Storage > Zentik
- **Android**: Settings > Apps > Zentik > Storage

### 6.3 Zentik Cookie Dashboard
Our app includes a dashboard to manage cookies:

- **Essential Cookies**: Always active (not modifiable)
- **Functional Cookies**: Enable/disable
- **Storage Cookies**: Individual control
- **OAuth Cookies**: Session-based management

## 7. Impact of Disabling

### 7.1 Essential Cookies
**Not Disableable** - App doesn't work without these cookies.

### 7.2 Functional Cookies
**Disableable** - App works but:
- Doesn't remember your preferences
- Doesn't personalize interface
- Doesn't save settings

### 7.3 Storage Cookies
**Disableable** - App works but:
- No cached images or files
- No saved preferences
- No offline functionality

### 7.4 OAuth Cookies
**Disableable** - App works but:
- OAuth authentication may fail
- Login sessions may be interrupted
- Provider selection may not persist

## 8. Data Retention and Cleanup

### 8.1 Automatic Cleanup
Our app implements automatic data cleanup:

- **Image Cache**: Automatic cleanup based on retention policies
- **Session Data**: Automatic expiration based on token lifetime
- **User Settings**: Persistent until manually cleared
- **OAuth Tokens**: Automatic refresh and cleanup

### 8.2 Manual Cleanup
Users can manually clear data:

- **Clear Cache**: Remove all cached content
- **Reset Settings**: Restore default preferences
- **Logout**: Clear all authentication data
- **Uninstall**: Complete data removal

## 9. Security Measures

### 9.1 Data Protection
- **Encryption**: Sensitive data encrypted in secure storage
- **Token Security**: JWT tokens with expiration
- **Session Management**: Secure session tracking
- **Access Control**: Role-based permissions

### 9.2 Privacy Controls
- **Granular Permissions**: Control over notification types
- **Data Minimization**: Only necessary data collected
- **User Control**: Full control over stored data
- **Transparency**: Clear information about data usage

## 10. Third-Party Integrations

### 10.1 OAuth Providers
We integrate with external authentication services:

- **GitHub OAuth**: Authentication and profile data
- **Google OAuth**: Authentication and profile data
- **Custom OAuth**: Configurable external providers

### 10.2 Push Notification Services
For cross-platform notifications:

- **iOS APNs Service**: iOS notifications
- **Apple Push Notification Service (APNs)**: iOS notifications
- **Firebase Cloud Messaging (FCM)**: Android notifications

### 10.3 Analytics and Monitoring
For service improvement:

- **Error Tracking**: Application performance monitoring
- **Usage Analytics**: Feature usage statistics
- **Performance Metrics**: Response time and reliability

## 11. Legal Compliance

### 11.1 GDPR (EU Regulation)
- **Explicit Consent**: Required for non-essential cookies
- **Transparency**: Complete information about data usage
- **Control**: Ability to manage and delete data
- **Right to Object**: Ability to refuse data processing

### 11.2 ePrivacy (EU Directive)
- **Informed Consent**: Clear and understandable information
- **Active Consent**: Positive user action required
- **Granular Consent**: Control by data category

### 11.3 CCPA (California)
- **Right to Know**: Information about data collected
- **Right to Refuse**: Ability to refuse data sale
- **Right to Delete**: Removal of collected data

## 12. Updates and Changes

### 12.1 Policy Changes
- We will notify you of significant changes
- Changes will be published on this page
- "Last Updated" date will be updated

### 12.2 New Technologies
- We will inform you about new storage methods
- You can manage them via the dashboard
- Consent will be requested for new data types

### 12.3 Technology Removal
- We will inform you about deprecated technologies
- Impact will be minimal for user experience
- Essential functionality will remain intact

## 13. Contact and Support

### 13.1 Cookie Questions
For specific questions about cookies and data storage:

**Email:** [COOKIE EMAIL]
**Phone:** [PHONE]
**Support Chat:** Available in the app

### 13.2 Technical Support
For technical issues with data storage:

**Support Email:** [SUPPORT EMAIL]
**Documentation:** [DOCUMENTATION LINK]
**FAQ:** [FAQ LINK]

### 13.3 Privacy Concerns
For privacy-related questions:

**Privacy Officer:** [PRIVACY EMAIL]
**DPO:** [DPO EMAIL]
**Supervisory Authority:** [GARANTE LINK]

## 14. Technical Glossary

### 14.1 Storage Technologies
- **Cookies**: Small text files stored by browsers
- **Local Storage**: Persistent browser storage
- **Session Storage**: Session-based browser storage
- **AsyncStorage**: React Native local storage
- **Secure Storage**: Encrypted local storage

### 14.2 Authentication
- **JWT**: JSON Web Token for authentication
- **OAuth**: Open standard for authorization
- **Session**: User session management
- **Token**: Authentication credentials

### 14.3 Mobile Technologies
- **React Native**: Cross-platform mobile framework
- **Expo**: Development platform for React Native
- **Keychain**: iOS secure storage
- **Keystore**: Android secure storage

---

**Note:** This Cookie Policy is a template and must be customized according to your specific legal and business needs. We recommend consulting a privacy and technology law attorney for final review.`;
