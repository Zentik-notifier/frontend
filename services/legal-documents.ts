export interface LegalDocument {
  id: string;
  title: string;
  fileName: string;
  icon: string;
}

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  // {
  //   id: 'terms-of-service',
  //   title: 'Terms of Service',
  //   fileName: 'terms-of-service',
  //   icon: 'file-document',
  // },
  {
    id: 'privacy-policy',
    title: 'Privacy Policy',
    fileName: 'privacy-policy',
    icon: 'shield-check',
  },
  // Cookie Policy disabled
  // {
  //   id: 'cookie-policy',
  //   title: 'Cookie Policy',
  //   fileName: 'cookie-policy',
  //   icon: 'cookie',
  // },
];

// Import the markdown content as static assets
// import cookiePolicyMd from '../assets/legal/cookie-policy.js';
import privacyPolicyMd from '../assets/legal/privacy-policy.js';
// import termsOfServiceMd from '../assets/legal/terms-of-service.js';

/**
 * Get the raw markdown content for a legal document
 */
export const getLegalDocumentContent = async (fileName: string): Promise<string> => {
  // Map fileName to imported content
  switch (fileName) {
    // case 'terms-of-service':
    //   return termsOfServiceMd;
    case 'privacy-policy':
      return privacyPolicyMd;
    // case 'cookie-policy':
    //   return cookiePolicyMd;
    default:
      throw new Error(`Unknown document: ${fileName}`);
  }
};
