export interface TranslationKey {
  appSettings: {
    title: string;
    description: string;
    resetAllSettings: string;
    resetConfirm: string;
    autoSaveDescription: string;
    revokeTerms: string;
    revokeTermsDescription: string;
    revokeTermsConfirm: string;
    revokeTermsSuccess: string;
    apiUrl: {
      title: string;
      description: string;
      serverUrl: string;
      serverUrlDescription: string;
      placeholder: string;
      save: string;
      reset: string;
      success: string;
      successMessage: string;
      saveError: string;
      restartRequired: string;
      restartMessage: string;
    };
    retentionPolicies: {
      title: string;
      description: string;
      maxCacheSize: string;
      maxCacheSizeDescription: string;
      maxCacheAge: string;
      maxCacheAgeDescription: string;
      currentCacheSize: string;
      cacheItems: string;
      cacheItemsPlural: string;
      clearCache: string;
      clearCacheDescription: string;
      clearCacheConfirm: string;
      cacheClearedSuccess: string;
      cacheClearError: string;
    };
    timezone: {
      title: string;
      description: string;
      deviceDefault: string;
      selectTimezone: string;
      searchTimezone: string;
    };
    language: {
      title: string;
      description: string;
      selectLanguage: string;
      searchLanguage: string;
    };
    dateFormat: {
      title: string;
      description: string;
      selectStyle: string;
      use24Hour: string;
      use24HourDescription: string;
    };
    autoDownload: {
      title: string;
      description: string;
      enableAutoDownload: string;
      enableAutoDownloadDescription: string;
      downloadOnWiFiOnly: string;
      downloadOnWiFiOnlyDescription: string;
    };
    gqlCache: {
      title: string;
      notificationsCount: string;
      maxStoredTitle: string;
      maxStoredDescription: string;
      importExport: {
        title: string;
        description: string;
        exportButton: string;
        exportMetadataButton: string;
        importButton: string;
        exportDescription: string;
        exportMetadataDescription: string;
        importDescription: string;
        exportSuccess: string;
        exportError: string;
        importError: string;
        noNotificationsToExport: string;
        confirmImport: string;
        confirmImportMessage: string;
        invalidFileFormat: string;
        exportComplete: string;
        exportCompleteMessage: string;
        exportMetadataError: string;
        exportMetadataSuccess: string;
        failedProcess: string;
        failedRead: string;
        failedApply: string;
        importTitle: string;
        importSuccess: string;
        importSuccessMessage: string;
        buttons: {
          cancel: string;
          import: string;
        };
        errors: {
          apolloCacheUnavailable: string;
          notificationsArrayNotFound: string;
          versionNotFound: string;
        };
      };
    };
    versions: {
      title: string;
      description: string;
      backend: string;
      backendDescription: string;
      expo: string;
      expoDescription: string;
      platform: string;
      platformDescription: string;
      app: string;
      appDescription: string;
      unavailable: string;
      timeout: string;
      unknown: string;
      refresh: string;
      otaUpdate: string;
      updateAvailable: string;
      noUpdateAvailable: string;
      reloadError: string;
      reloadErrorMessage: string;
    };
    cacheReset: {
      title: string;
      subtitle: string;
      graphql: string;
      graphqlDescription: string;
      media: string;
      mediaDescription: string;
      settings: string;
      settingsDescription: string;
      selectAll: string;
      deselectAll: string;
      reset: string;
      resetting: string;
      confirmTitle: string;
      confirmMessage: string;
      resetSuccess: string;
      resetError: string;
      noSelection: string;
      noSelectionMessage: string;
      completeResetTitle: string;
      completeResetMessage: string;
      completeReset: string;
      completeResetSuccess: string;
      mediaInfo: string;
      graphqlInfo: string;
    };
    cache: {
      title: string;
      description: string;
      summary: string;
      mediaSize: string;
      notificationsCount: string;
      totalSize: string;
      items: string;
      inCache: string;
      approximate: string;
      resetCache: string;
    };
  };
  compose: {
    addText: string;
    addImage: string;
    addAction: string;
    send: string;
    title: string;
    body: string;
    subtitle: string;
    messagePlaceholder: string;
    messageBuilder: {
      title: string;
      toggleButton: string;
      actions: string;
      snooze: string;
      flags: string;
      priority: string;
      urgent: string;
      important: string;
      normal: string;
      low: string;
      addAction: string;
      actionPlaceholder: string;
      snoozeOptions: {
        title: string;
        none: string;
        "5min": string;
        "15min": string;
        "1hour": string;
        "3hours": string;
        "1day": string;
        custom: string;
      };
      requiresAction: string;
      followUp: string;
    };
  };
  userProfile: {
    title: string;
    description: string;
    loading: string;
    errorLoadingData: string;
    noDataAvailable: string;
    username: string;
    email: string;
    firstName: string;
    firstNamePlaceholder: string;
    lastName: string;
    lastNamePlaceholder: string;
    avatar: string;
    avatarPlaceholder: string;
    userId: string;
    userIdCopied: string;
    notAvailable: string;
    notSet: string;
    editProfile: string;
    save: string;
    saving: string;
    changePassword: string;
    deleteAccount: string;
    deletingAccount: string;
    logout: string;
    profileUpdateSuccess: string;
    profileUpdateError: string;
    deleteAccountTitle: string;
    deleteAccountMessage: string;
    deleteAccountFinalTitle: string;
    deleteAccountFinalMessage: string;
    oauthConnections: {
      title: string;
      noConnections: string;
      connectedAs: string;
      connected: string;
      connect: string;
      availableProviders: string;
      connectionSuccess: string;
      connectionSuccessMessage: string;
      connectionError: string;
    };
    continue: string;
    deleteAccountConfirm: string;
    accountDeletedTitle: string;
    accountDeletedMessage: string;
    loginProvider: string;
    currentSessionProvider: string;
    oauthUser: string;
    localUser: string;
  };
  buckets: {
    title: string;
    description: string;
    organize: string;
    noBucketsYet: string;
    createFirstBucket: string;
    loadingBucket: string;
    bucketNotFound: string;
    bucketNotFoundDescription: string;
    composeMessage: string;
    bucketDeletedSuccess: string;
    deleteBucketError: string;
    item: {
      delete: string;
      deleteBucketTitle: string;
      deleteBucketMessage: string;
      deleteBucketConfirm: string;
      created: string;
      bucketIdCopied: string;
      devicesCount: string;
      devicesCountPlural: string;
      allDevices: string;
      sharedWith: string;
      sharedWithPlural: string;
      notShared: string;
      sharedWithMe: string;
      messages: string;
      unread: string;
      noActivity: string;
      daysAgo: string;
      hoursAgo: string;
      minutesAgo: string;
      justNow: string;
    };
    form: {
      editTitle: string;
      createTitle: string;
      editDescription: string;
      createDescription: string;
      namePlaceholder: string;
      iconPlaceholder: string;
      preview: string;
      iconPreview: string;
      colorPreview: string;
      chooseColor: string;
      creating: string;
      updating: string;
      createButton: string;
      updateButton: string;
      bucketId: string;
      bucketIdCopied: string;
      createSuccessTitle: string;
      createErrorTitle: string;
      updateErrorTitle: string;
      createErrorMessage: string;
      updateErrorMessage: string;
      readOnlyMode: string;
      readOnlyWarning: string;
      noBucketId: string;
      bucketNotFound: string;
      loadingBucket: string;
      deleteBucket: string;
      deleteBucketConfirm: string;
      deleting: string;
      error: string;
      failedToDelete: string;
    };
    sharing: {
      title: string;
      description: string;
      shareTitle: string;
      userIdentifier: string;
      userId: string;
      userIdCopied: string;
      identifierPlaceholder: string;
      permissions: string;
      permission: {
        read: string;
        write: string;
        delete: string;
        admin: string;
        readwrite: string;
      };
      share: string;
      edit: string;
      editTitle: string;
      update: string;
      loading: string;
      noShares: string;
      enterIdentifier: string;
      shareSuccess: string;
      shareError: string;
      unshareSuccess: string;
      unshareError: string;
      confirmRevoke: string;
      confirmRevokeMessage: string;
      revoke: string;
      unknownUser: string;
      you: string;
      grantedBy: string;
      expiresAt: string;
    };
    delete: {
      modalTitle: string;
      modalDescription: string;
      deleteBucket: string;
      deleteBucketWithPermission: string;
      revokeSharing: string;
      confirm: string;
      confirmTitle: string;
      confirmMessage: string;
      confirmDeleteTitle: string;
      confirmDeleteMessage: string;
      confirmRevokeTitle: string;
      confirmRevokeMessage: string;
    };
  };
  devices: {
    title: string;
    description: string;
    registerDevice: string;
    unregisterDevice: string;
    registering: string;
    unregistering: string;
    noDevicesTitle: string;
    noDevicesSubtext: string;
    registerSuccessTitle: string;
    registerSuccessMessage: string;
    registerErrorMessage: string;
    unregisterSuccessTitle: string;
    unregisterSuccessMessage: string;
    unregisterErrorMessage: string;
    removeSuccessMessage: string;
    removeErrorMessage: string;
    item: {
      delete: string;
      removeDeviceTitle: string;
      removeDeviceMessage: string;
      removeDeviceConfirm: string;
      thisDevice: string;
      registered: string;
      model: string;
      os: string;
      deviceId: string;
      active: string;
      inactive: string;
      lastUsed: string;
      never: string;
      unknown: string;
    };
    editName: {
      title: string;
      description: string;
      namePlaceholder: string;
      nameRequired: string;
      save: string;
      saving: string;
      cancel: string;
      successMessage: string;
      errorMessage: string;
    };
  };
  systemAccessTokens: {
    title: string;
    description: string;
    noTokensTitle: string;
    noTokensSubtext: string;
    deleteError: string;
    item: {
      delete: string;
      deleteTokenTitle: string;
      deleteTokenMessage: string;
      deleteTokenConfirm: string;
      expired: string;
      token: string;
      created: string;
      maxCalls: string;
      calls: string;
      expires: string;
      requester: string;
      description: string;
    };
    form: {
      title: string;
      description: string;
      maxCalls: string;
      maxCallsPlaceholder: string;
      expiration: string;
      expirationPlaceholder: string;
      expirationHint: string;
      requester: string;
      requesterPlaceholder: string;
      requesterHint: string;
      selectUser: string;
      noUsers: string;
      descriptionPlaceholder: string;
      creating: string;
      createButton: string;
      maxCallsRequired: string;
      createError: string;
      tokenCreatedTitle: string;
      tokenCreatedSubtitle: string;
      copy: string;
      copied: string;
      tokenCopied: string;
      done: string;
    };
  };
  accessTokens: {
    title: string;
    description: string;
    noTokensTitle: string;
    noTokensSubtext: string;
    deleteError: string;
    item: {
      delete: string;
      deleteTokenTitle: string;
      deleteTokenMessage: string;
      deleteTokenConfirm: string;
      expired: string;
      token: string;
      created: string;
      lastUsed: string;
      neverUsed: string;
      expires: string;
    };
    form: {
      title: string;
      description: string;
      tokenName: string;
      tokenNamePlaceholder: string;
      expiration: string;
      expirationPlaceholder: string;
      expirationHint: string;
      creating: string;
      createButton: string;
      nameRequired: string;
      createError: string;
      tokenCreatedTitle: string;
      tokenCreatedSubtitle: string;
      copy: string;
      copied: string;
      tokenCopied: string;
      done: string;
    };
  };
  userSessions: {
    title: string;
    description: string;
    noSessionsTitle: string;
    noSessionsSubtext: string;
    deleteError: string;
    item: {
      revoke: string;
      revokeSessionTitle: string;
      revokeSessionMessage: string;
      revokeSessionConfirm: string;
      current: string;
      expired: string;
      unknownDevice: string;
      ipAddress: string;
      loginProvider: string;
      created: string;
      lastActivity: string;
      expires: string;
      unknownProvider: string;
    };
  };
  notifications: {
    title: string;
    description: string;
    sending: string;
    sendButton: string;
    resetForm: string;
    loadTestData: string;
    warningNotRegistered: string;
    sendErrorTitle: string;
    titleRequired: string;
    errors: {
      markAllAsReadFailed: string;
    },
    deleteSelected: {
      title: string;
      message: string;
    },
    selectAll: string;
    deselectAll: string;
    markAsRead: string;
    markAsUnread: string;
    content: {
      title: string;
      titlePlaceholder: string;
      subtitle: string;
      subtitlePlaceholder: string;
      body: string;
      bodyPlaceholder: string;
    };
    automaticActions: {
      title: string;
      description: string;
      addMarkAsReadAction: string;
      addMarkAsReadActionDescription: string;
      addDeleteAction: string;
      addDeleteActionDescription: string;
      addOpenNotificationAction: string;
      addOpenNotificationActionDescription: string;
      snoozeTimes: string;
      snoozeTimesDescription: string;
      snoozeTimePlaceholder: string;
    };
    attachments: {
      title: string;
      addExamples: string;
      addMedia: string;
      mediaType: string;
      mediaUrl: string;
      mediaUrlPlaceholder: string;
      mediaName: string;
      mediaNamePlaceholder: string;
      selectMediaType: string;
      hint: string;
      noAttachments: string;
    };
    settings: {
      deliveryType: string;
      selectDeliveryType: string;
      sound: string;
      soundPlaceholder: string;
      locale: string;
      localeDescription: string;
      selectLocale: string;
    };
    targeting: {
      bucket: string;
      selectBucket: string;
      targetDevices: string;
      selectDevices: string;
      allDevices: string;
      noDevicesFound: string;
      loadingBuckets: string;
      loadingDevices: string;
      bucketRequired: string;
      groupId: string;
      groupIdPlaceholder: string;
      groupIdDefault: string;
      collapseId: string;
      collapseIdPlaceholder: string;
      userIds: string;
      userIdsDescription: string;
      userIdsDefault: string;
      clearSelection: string;
    };
    actions: {
      title: string;
      addAction: string;
      actionType: string;
      selectActionType: string;
      actionValue: string;
      actionValuePlaceholder: string;
      actionTitle: string;
      actionTitlePlaceholder: string;
      iconName: string;
      iconNamePlaceholder: string;
      iconHint: string;
      actionValueRequired: string;
      destructiveAction: string;
      selectWebhook: string;
      searchWebhooks: string;
    };
    tapAction: {
      title: string;
      description: string;
      addTapAction: string;
      editTapAction: string;
      saveTapAction: string;
      tapActionType: string;
    };
    examples: {
      testTitle: string;
      testSubtitle: string;
      testBody: string;
      sampleImage: string;
      sampleGif: string;
      sampleVideo: string;
      sampleAudio: string;
      visitWebsite: string;
      dismiss: string;
      snooze30min: string;
      viewDetails: string;
      triggerWebhook: string;
      google: string;
      snooze1h: string;
    };
    form: {
      add: string;
      edit: string;
      remove: string;
      cancel: string;
    };
    preview: {
      title: string;
      description: string;
      copy: string;
      copied: string;
    };
    noWebhooks: {
      message: string;
    };
    webhookAction: {
      method: string;
      url: string;
      methodPlaceholder: string;
      urlPlaceholder: string;
      methodRequired: string;
      urlRequired: string;
      urlInvalid: string;
    };
  };
  home: {
    emptyState: {
      noNotifications: string;
      allCaughtUp: string;
      tryAdjustingFilters: string;
    };
    errorState: {
      title: string;
      subtitle: string;
    };
    search: {
      placeholder: string;
    };
    timeAgo: {
      minutesAgo: string;
      hoursAgo: string;
      daysAgo: string;
    };
  };
  filters: {
    title: string;
    clearAll: string;
    bucket: string;
    allBuckets: string;
    searchBuckets: string;
    quickFilters: string;
    hideRead: string;
    hideReadDescription: string;
    withMedia: string;
    withMediaDescription: string;
    sortBy: string;
    newestFirst: string;
    oldestFirst: string;
    priority: string;
    hideOlderThan: string;
    showAll: string;
    oneDay: string;
    oneWeek: string;
    oneMonth: string;
    activeFilters: string;
    activeFiltersPlural: string;
  };
  swipeActions: {
    delete: {
      label: string;
      title: string;
      message: string;
      confirm: string;
      cancel: string;
      error: string;
    };
    markAsRead: {
      label: string;
      error: string;
    };
    markAsUnread: {
      label: string;
      error: string;
    };
  };
  mediaTypes: {
    IMAGE: string;
    VIDEO: string;
    AUDIO: string;
    GIF: string;
    ICON: string;
    undefined: string;
  };
  common: {
    cancel: string;
    delete: string;
    save: string;
    reset: string;
    success: string;
    error: string;
    ok: string;
    close: string;
    loading: string;
    settings: string;
    general: string;
    back: string;
    info: string;
    download: string;
    exporting: string;
    importing: string;
    updateAvailable: string;
    backendUnreachable: string;
    noConnection: string;
    copied: string;
    copiedToClipboard: string;
    saved: string;
    savedToGallery: string;
    offline: string;
    navigationError: string;
    navigationFailed: string;
    actionError: string;
    actionFailed: string;
    snooze: string;
    snoozeMessage: string;
    snoozeGeneric: string;
    deviceNotRegistered: string;
    notAvailableOnWeb: string;
    shareNotAvailable: string;
    unableToShare: string;
    colorPalette: string;
    customColor: string;
    chooseCustomColor: string;
    hexColorCode: string;
    invalidColor: string;
    invalidColorMessage: string;
    apply: string;
    chooseColor: string;
    onboarding: {
      title: string;
      description: string;
      welcome: {
        title: string;
        description: string;
      };
      bucket: {
        title: string;
        description: string;
        nameLabel: string;
        namePlaceholder: string;
        createButton: string;
        creating: string;
      };
      token: {
        title: string;
        description: string;
        nameLabel: string;
        namePlaceholder: string;
        createButton: string;
      };
      notification: {
        title: string;
        description: string;
        titleLabel: string;
        titlePlaceholder: string;
        bodyLabel: string;
        bodyPlaceholder: string;
        sendButton: string;
        sending: string;
      };
      api: {
        title: string;
        description: string;
        showExampleButton: string;
      };
      navigation: {
        back: string;
        next: string;
        complete: string;
      };
      messages: {
        bucketCreated: string;
        bucketCreateError: string;
        tokenCreated: string;
        tokenCreateError: string;
        notificationSent: string;
        notificationSendError: string;
        apiExample: string;
        bucketNameRequired: string;
        tokenNameRequired: string;
        notificationFieldsRequired: string;
        createBucketFirst: string;
        tokenCopied: string;
        useInHeader: string;
        apiExampleCopied: string;
        exampleCopied: string;
      };
    };
  };
  auth: {
    forgotPassword: {
      title: string;
      description: string;
      emailLabel: string;
      emailPlaceholder: string;
      emailRequired: string;
      invalidEmail: string;
      sendResetEmail: string;
      sending: string;
      resetEmailSent: string;
      resetFailed: string;
      backToLogin: string;
      step2Title: string;
      step2Description: string;
      codeLabel: string;
      codePlaceholder: string;
      codeRequired: string;
      invalidCode: string;
      verifyCode: string;
      verifying: string;
      step3Title: string;
      step3Description: string;
      newPasswordLabel: string;
      newPasswordPlaceholder: string;
      confirmPasswordLabel: string;
      confirmPasswordPlaceholder: string;
      passwordRequired: string;
      confirmPasswordRequired: string;
      passwordsMismatch: string;
      resetPassword: string;
      resetting: string;
      passwordResetSuccess: string;
      passwordResetSuccessMessage: string;
      codeVerificationFailed: string;
      passwordTooShort: string;
      passwordResetFailed: string;
    };
    emailConfirmation: {
      title: string;
      description: string;
      resendEmail: string;
      resending: string;
      emailSent: string;
      emailSentMessage: string;
      backToLogin: string;
      checkEmail: string;
      notReceived: string;
      spamFolder: string;
      success: string;
      successMessage: string;
      error: string;
      errorMessage: string;
      enterCode: string;
      codePlaceholder: string;
      verifyCode: string;
      verifying: string;
      invalidCode: string;
      invalidEmail: string;
    };
  };
  notificationDetail: {
    loading: string;
    notFound: string;
    title: string;
    sent: string;
    read: string;
    snooze: {
      title: string;
      description: string;
      setSnooze: string;
      removeSnooze: string;
      snoozedUntil: string;
      snoozedFor: string;
      remaining: string;
      quickOptions: string;
      customDateTime: string;
      selectDateTime: string;
      cancel: string;
      confirm: string;
      errorSetting: string;
      errorRemoving: string;
      quickTimes: {
        "15min": string;
        "30min": string;
        "1hour": string;
        "2hours": string;
        "4hours": string;
        "8hours": string;
        "12hours": string;
        "1day": string;
        "3days": string;
        "1week": string;
      };
    };
    deliveryTypes: {
      SILENT: string;
      NORMAL: string;
      CRITICAL: string;
    };
    copyBody: string;
    bodyCopied: string;
    notificationCopied: string;
    shareNotification: string;
    deleteNotification: string;
    deleteConfirmTitle: string;
    deleteConfirmMessage: string;
    deleteConfirmButton: string;
    deleteCancelButton: string;
    deleteSuccess: string;

  };
  recurringSnooze: {
    addSchedule: string;
    editSchedule: string;
    addScheduleTitle: string;
    noSchedules: string;
    noSchedulesDescription: string;
    daysOfWeek: string;
    timeRange: string;
    from: string;
    to: string;
    enableSchedule: string;
    cancel: string;
    update: string;
    add: string;
    validation: {
      selectDays: string;
      invalidTimeRange: string;
    };
    days: {
      monday: string;
      tuesday: string;
      wednesday: string;
      thursday: string;
      friday: string;
      saturday: string;
      sunday: string;
    };
    formats: {
      noDaysSelected: string;
      everyDay: string;
      weekdays: string;
      weekends: string;
    };
  };
  bucketSelector: {
    allBuckets: string;
    selectBucket: string;
    searchBuckets: string;
  };
  notificationActions: {
    availableActions: string;
    defaultTapAction: string;
    noActionsAvailable: string;
    actionCount: string;
    actionCountPlural: string;
    actionTypes: {
      NAVIGATE: string;
      BACKGROUND_CALL: string;
      SNOOZE: string;
      CLEAR: string;
      DELETE: string;
      OPEN_NOTIFICATION: string;
      WEBHOOK: string;
    };
    destructive: string;
  };
  attachmentGallery: {
    attachments: string;
    failedToLoad: string;
    audio: string;
    file: string;
    playing: string;
    tapToPlay: string;
  };
  login: {
    title: string;
    welcomeBack: string;
    emailOrUsername: string;
    emailOrUsernamePlaceholder: string;
    password: string;
    passwordPlaceholder: string;
    forgotPassword: string;
    loginButton: string;
    loggingIn: string;
    noAccount: string;
    signUp: string;
    orContinueWith: string;
    providers: {
      github: string;
      google: string;
      cancelled: string;
      dismissed: string;
    };
    validation: {
      emailOrUsernameRequired: string;
      emailOrUsernameMinLength: string;
      passwordRequired: string;
    };
    errors: {
      loginFailed: string;
      connectionError: string;
      invalidCredentials: string;
      networkError: string;
      unexpectedError: string;
      emailNotConfirmed: string;
      confirmEmailFirst: string;
    };
  };
  register: {
    title: string;
    firstName: string;
    firstNamePlaceholder: string;
    lastName: string;
    lastNamePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    password: string;
    passwordPlaceholder: string;
    confirmPassword: string;
    confirmPasswordPlaceholder: string;
    registerButton: string;
    registering: string;
    haveAccount: string;
    login: string;
    validation: {
      firstNameRequired: string;
      lastNameRequired: string;
      emailRequired: string;
      emailInvalid: string;
      passwordRequired: string;
      confirmPasswordRequired: string;
      passwordsDoNotMatch: string;
    };
    errors: {
      registrationFailed: string;
      passwordRequired: string;
      connectionError: string;
    };
    emailConfirmation: {
      title: string;
      description: string;
      resendEmail: string;
      resending: string;
      emailSent: string;
      emailSentMessage: string;
      backToLogin: string;
      checkEmail: string;
      notReceived: string;
      spamFolder: string;
      enterCode: string;
      codePlaceholder: string;
      verifyCode: string;
      verifying: string;
      invalidCode: string;
    };
  };
  changePassword: {
    title: string;
    description: string;
    currentPassword: string;
    currentPasswordPlaceholder: string;
    newPassword: string;
    newPasswordPlaceholder: string;
    confirmPassword: string;
    confirmPasswordPlaceholder: string;
    changeButton: string;
    changing: string;
    validation: {
      currentPasswordRequired: string;
      newPasswordRequired: string;
      newPasswordMinLength: string;
      passwordsDoNotMatch: string;
      samePassword: string;
    };
    success: {
      title: string;
      message: string;
    };
    errors: {
      title: string;
      unknown: string;
    };
  };
  setPassword: {
    title: string;
    description: string;
    newPassword: string;
    newPasswordPlaceholder: string;
    confirmPassword: string;
    confirmPasswordPlaceholder: string;
    setButton: string;
    setting: string;
    validation: {
      newPasswordRequired: string;
      newPasswordMinLength: string;
      passwordsDoNotMatch: string;
    };
    success: {
      title: string;
      message: string;
    };
    errors: {
      title: string;
      unknown: string;
    };
  };
  webhooks: {
    title: string;
    description: string;
    noWebhooksTitle: string;
    noWebhooksSubtext: string;
    createFirst: string;
    create: string;
    edit: string;
    delete: string;
    deleteConfirmTitle: string;
    deleteConfirmMessage: string;
    deleteSuccessMessage: string;
    deleteErrorMessage: string;
    createErrorMessage: string;
    updateErrorMessage: string;
    form: {
      name: string;
      namePlaceholder: string;
      nameRequired: string;
      method: string;
      url: string;
      urlPlaceholder: string;
      urlRequired: string;
      urlInvalid: string;
      body: string;
      bodyPlaceholder: string;
      bodyHelp: string;
      jsonHelpTitle: string;
      jsonHelpMessage: string;
      jsonExample: string;
      jsonValidationError: string;
      jsonInvalid: string;
      jsonParsingError: string;
      webhookSuccess: string;
      webhookError: string;
      webhookExecutionFailed: string;
      webhookNotFound: string;
      noWebhookId: string;
      username: string;
      usernamePlaceholder: string;
      password: string;
      passwordPlaceholder: string;
      token: string;
      tokenPlaceholder: string;
      cancel: string;
      save: string;
      saving: string;
      create: string;
      creating: string;
    };
    methods: {
      GET: string;
      POST: string;
      PUT: string;
      PATCH: string;
      DELETE: string;
    };
  };
  userDropdown: {
    unknownUser: string;
    offlineMode: string;
    gettingStarted: string;
    settings: string;
    administration: string;
    logout: string;
    themes: {
      light: string;
      dark: string;
      system: string;
      theme: string;
    };
  };
  administration: {
    title: string;
    description: string;
    userManagement: string;
    userManagementDescription: string;
    loadingUsers: string;
    errorLoadingUsers: string;
    failedToLoadUsers: string;
    retry: string;
    confirm: string;
    cannotModifyOwnRole: string;
    cannotModifyOwnRoleMessage: string;
    changeUserRole: string;
    currentRole: string;
    selectNewRole: string;
    confirmRoleChange: string;
    confirmRoleChangeMessage: string;
    you: string;
    joined: string;
    error: string;
    failedToUpdateUserRole: string;
    systemSettings: string;
    oauthProviders: string;
    oauthProvidersDescription: string;
    systemTokensTitle: string;
    systemTokensDescription: string;
    loadingOAuthProviders: string;
    errorLoadingOAuthProviders: string;
    errorLoadingOAuthProvidersDescription: string;
    noOAuthProviders: string;
    noOAuthProvidersDescription: string;
    enabled: string;
    disabled: string;
    oauthProviderForm: {
      createTitle: string;
      editTitle: string;
      save: string;
      github: string;
      google: string;
      custom: string;
      basicInformation: string;
      name: string;
      nameRequired: string;
      namePlaceholder: string;
      providerId: string;
      providerIdRequired: string;
      providerIdPlaceholder: string;
      oauthConfiguration: string;
      clientId: string;
      clientIdRequired: string;
      clientIdPlaceholder: string;
      clientSecret: string;
      clientSecretRequired: string;
      clientSecretPlaceholder: string;
      scopes: string;
      scopesPlaceholder: string;
      customUrls: string;
      authorizationUrl: string;
      authorizationUrlPlaceholder: string;
      tokenUrl: string;
      tokenUrlPlaceholder: string;
      userInfoUrl: string;
      userInfoUrlPlaceholder: string;
      appearance: string;
      iconUrl: string;
      iconUrlPlaceholder: string;
      color: string;
      colorPlaceholder: string;
      textColor: string;
      textColorPlaceholder: string;
      creating: string;
      updating: string;
      validation: {
        error: string;
        fillRequiredFields: string;
        fillAllRequiredFields: string;
      };
      success: {
        title: string;
        created: string;
        updated: string;
        deleted: string;
        ok: string;
      };
      delete: {
        title: string;
        message: string;
        cancel: string;
        delete: string;
        deleting: string;
        error: string;
      };
      loading: string;
      notFound: string;
      noIdProvided: string;
    };
    serverStatus: string;
    logs: string;
    comingSoon: string;
    comingSoonMessage: string;
    roles: {
      user: string;
      moderator: string;
      admin: string;
    };
    accessDenied: {
      title: string;
      message: string;
    };
  };
  legal: {
    title: string;
    description: string;
    termsOfService: string;
    privacyPolicy: string;
    cookiePolicy: string;
    loading: string;
    errorLoading: string;
    errorLoadingDescription: string;
    errorTitle: string;
    errorAcceptingTerms: string;
    acceptTerms: string;
    declineTerms: string;
    declineTermsTitle: string;
    declineTermsMessage: string;
    reviewAgain: string;
    exitApp: string;
    acceptanceRequired: string;
    acceptanceDescription: string;
    acceptanceMessage: string;
    acceptanceFooterText: string;
    readAndAccept: string;
    mustAcceptAll: string;
    acceptAll: string;
    accepted: string;
    notAccepted: string;
    viewDocument: string;
    allDocuments: string;
    lastUpdated: string;
    version: string;
  };
  navigation: {
    notifications: string;
    settings: string;
    analytics: string;
    help: string;
    medias: string;
    sections: {
      all: string;
      buckets: string;
      gallery: string;
    };
  };
  medias: {
    title: string;
    stats: {
      title: string;
      totalItems: string;
      totalSize: string;
      byType: string;
    };
    clearCache: {
      title: string;
      message: string;
      confirm: string;
      success: {
        title: string;
        message: string;
      };
      error: {
        title: string;
        message: string;
      };
    };
    deleteItem: {
      title: string;
      message: string;
      confirm: string;
      cancel: string;
    };
    empty: {
      title: string;
      message: string;
    };
    filters: {
      noType: string;
      allTypes: string;
      selectMediaTypes: string;
      selectAll: string;
      deselectAll: string;
    };
  };
  cachedMedia: {
    download: string;
    retrying: string;
    downloading: string;
    downloadFailed: string;
    failedToLoad: string;
    audioFile: string;
    readyToPlay: string;
    loading: string;
    loadingVideo: string;
    mediaFile: string;
    tapToRetry: string;
    videoError: string;
    downloadProgress: string;
    loadingProgress: string;
    forceDownload: string;
    delete: string;
  };
  gallery: {
    groupedByDate: string;
    today: string;
    yesterday: string;
    thisWeek: string;
    thisMonth: string;
    older: string;
    cachedOn: string;
  };
  gallerySettings: {
    title: string;
    autoPlay: string;
    autoPlayDescription: string;
    showFaultyMedias: string;
    showFaultyMediasDescription: string;
  };
}

// Supported locales
export type Locale = 'en-EN' | 'it-IT';

// Translation object type (matches the JSON structure)
export type Translation = TranslationKey;

// Helper type to get the value type for a given translation key path
export type GetTranslationValue<T extends string> = T extends keyof TranslationKey
  ? TranslationKey[T] extends string
  ? string
  : TranslationKey[T]
  : string;

type Join<K, P> = K extends string | number
  ? P extends string | number
  ? `${K}.${P}`
  : never
  : never;

type PathType<T> = {
  [K in keyof T]: T[K] extends object
  ? K extends string | number
  ? T[K] extends any[]
  ? K
  : K | Join<K, PathType<T[K]>>
  : never
  : K;
}[keyof T];

export type TranslationKeyPath = PathType<TranslationKey>;
