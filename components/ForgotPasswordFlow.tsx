import { router } from 'expo-router';
import React, { useState } from 'react';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { NewPasswordStep } from './NewPasswordStep';
import { ResetCodeStep } from './ResetCodeStep';

type Step = 'email' | 'code' | 'password';

interface ForgotPasswordFlowProps {
  onBackToLogin: () => void;
}

export function ForgotPasswordFlow({ onBackToLogin }: ForgotPasswordFlowProps) {
  const [currentStep, setCurrentStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');

  const handleEmailSubmitted = (userEmail: string) => {
    setEmail(userEmail);
    setCurrentStep('code');
  };

  const handleCodeVerified = (code: string) => {
    setResetToken(code);
    setCurrentStep('password');
  };

  const handlePasswordReset = () => {
    // Reset to initial state and go back to login with email prefilled
    const emailToPass = email;
    setCurrentStep('email');
    setEmail('');
    setResetToken('');
    
    // Navigate to login with email parameter
    router.replace(`/(mobile)/public/login?email=${encodeURIComponent(emailToPass)}`);
  };

  const handleBackToEmail = () => {
    setCurrentStep('email');
    setEmail('');
    setResetToken('');
  };

  const handleBackToCode = () => {
    setCurrentStep('code');
    setResetToken('');
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'email':
        return (
          <ForgotPasswordForm
            onResetRequested={handleEmailSubmitted}
            onBackToLogin={onBackToLogin}
          />
        );
      case 'code':
        return (
          <ResetCodeStep
            email={email}
            onCodeVerified={handleCodeVerified}
            onBack={handleBackToEmail}
          />
        );
      case 'password':
        return (
          <NewPasswordStep
            resetToken={resetToken}
            onPasswordReset={handlePasswordReset}
            onBack={handleBackToCode}
          />
        );
      default:
        return null;
    }
  };

  return <>{renderCurrentStep()}</>;
}
