export interface LegalDocument {
  id: string;
  title: string;
  fileName: string;
  icon: string;
}

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    id: 'terms-of-service',
    title: 'Terms of Service',
    fileName: 'terms-of-service',
    icon: 'file-document',
  },
  // Privacy Policy and Cookie Policy disabled
  // {
  //   id: 'privacy-policy',
  //   title: 'Privacy Policy',
  //   fileName: 'privacy-policy',
  //   icon: 'shield-check',
  // },
  // {
  //   id: 'cookie-policy',
  //   title: 'Cookie Policy',
  //   fileName: 'cookie-policy',
  //   icon: 'cookie',
  // },
];

// Import the markdown content as static assets
import cookiePolicyMd from '../assets/legal/cookie-policy.js';
import privacyPolicyMd from '../assets/legal/privacy-policy.js';
import termsOfServiceMd from '../assets/legal/terms-of-service.js';

/**
 * Get the raw markdown content for a legal document
 */
export const getLegalDocumentContent = async (fileName: string): Promise<string> => {
  try {
    // Map fileName to imported content
    switch (fileName) {
      case 'terms-of-service':
        return termsOfServiceMd;
      case 'privacy-policy':
        return privacyPolicyMd;
      case 'cookie-policy':
        return cookiePolicyMd;
      default:
        throw new Error(`Unknown document: ${fileName}`);
    }
  } catch (error) {
    console.error('Error loading legal document:', error);
    
    // Fallback to default content if file not found
    switch (fileName) {
      case 'terms-of-service':
        return `# Terms of Service

**Last updated: ${new Date().toLocaleDateString()}**

## 1. Introduction

Welcome to Zentik. These Terms of Service ("Terms") govern your use of our notification management application.

## 2. Acceptance of Terms

By using Zentik, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our service.

## 3. Description of Service

Zentik is a notification management application that allows you to organize, track, and manage notifications across multiple platforms.

## 4. User Responsibilities

- You are responsible for maintaining the confidentiality of your account
- You must provide accurate and complete information
- You must not use the service for illegal purposes

## 5. Privacy

Your privacy is important to us. Please review our Privacy Policy to understand how we collect and use your information.

## 6. Termination

We may terminate your account at any time for violation of these Terms.

## 7. Changes to Terms

We reserve the right to modify these Terms at any time. Users will be notified of significant changes.

## 8. Contact

For questions about these Terms, contact us at support@zentik.com.`;

      case 'privacy-policy':
        return `# Privacy Policy

**Last updated: ${new Date().toLocaleDateString()}**

## 1. Information We Collect

We collect information you provide directly to us, such as when you create an account, use our services, or contact us.

## 2. How We Use Your Information

We use the information we collect to:
- Provide, maintain, and improve our services
- Send you notifications and updates
- Respond to your comments and questions

## 3. Information Sharing

We do not sell, trade, or otherwise transfer your personal information to third parties without your consent.

## 4. Data Security

We implement appropriate security measures to protect your personal information.

## 5. Your Rights

You have the right to:
- Access your personal information
- Correct inaccurate information
- Delete your account and associated data

## 6. Contact Us

If you have questions about this Privacy Policy, contact us at privacy@zentik.com.`;

      case 'cookie-policy':
        return `# Cookie Policy

**Last updated: ${new Date().toLocaleDateString()}**

## 1. What Are Cookies

Cookies are small text files stored on your device when you visit our website or use our application.

## 2. How We Use Cookies

We use cookies to:
- Remember your preferences
- Analyze how you use our service
- Improve our application

## 3. Types of Cookies We Use

- **Essential Cookies**: Required for basic functionality
- **Analytics Cookies**: Help us understand how you use our service
- **Preference Cookies**: Remember your settings

## 4. Managing Cookies

You can control cookies through your browser settings or app preferences.

## 5. Contact

For questions about our cookie usage, contact us at support@zentik.com.`;

      default:
        throw new Error(`Unknown document: ${fileName}`);
    }
  }
};
