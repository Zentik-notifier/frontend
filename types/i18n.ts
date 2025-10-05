export interface TranslationKey {
  appLogs: {
    description: string;
    fields: {
      meta: string;
      message: string;
      tag: string;
    };
    filterPlaceholder: string;
    loading: string;
    refresh: string;
    title: string;
  };
  accessTokens: {
    deleteError: string;
    description: string;
    form: {
      copied: string;
      copy: string;
      createButton: string;
      createError: string;
      creating: string;
      description: string;
      done: string;
      expiration: string;
      expirationHint: string;
      expirationPlaceholder: string;
      nameRequired: string;
      title: string;
      tokenCopied: string;
      tokenCreatedSubtitle: string;
      tokenCreatedTitle: string;
      tokenName: string;
      tokenNamePlaceholder: string;
    };
    item: {
      created: string;
      delete: string;
      deleteTokenConfirm: string;
      deleteTokenMessage: string;
      deleteTokenTitle: string;
      expired: string;
      expires: string;
      lastUsed: string;
      neverUsed: string;
    };
    noTokensSubtext: string;
    noTokensTitle: string;
    title: string;
  };
  administration: {
    accessDenied: {
      message: string;
      title: string;
    };
    cannotModifyOwnRole: string;
    cannotModifyOwnRoleMessage: string;
    changeUserRole: string;
    confirm: string;
    confirmRoleChange: string;
    confirmRoleChangeMessage: string;
    currentRole: string;
    disabled: string;
    enabled: string;
    error: string;
    errorLoadingOAuthProviders: string;
    errorLoadingOAuthProvidersDescription: string;
    errorLoadingUsers: string;
    failedToLoadUsers: string;
    failedToUpdateUserRole: string;
    userRoleUpdatedSuccessfully: string;
    userDetails: string;
    userId: string;
    username: string;
    email: string;
    createdAt: string;
    lastUpdated: string;
    userBuckets: string;
    noBucketsFound: string;
    userNotificationStats: string;
    loadingStats: string;
    noStatsAvailable: string;
    userNotFound: string;
    totalUsers: string;
    searchUsers: string;
    noUsersFound: string;
    tryDifferentSearch: string;
    noUsers: string;
    noUsersSubtext: string;
    joined: string;
    loadingUsers: string;
    logs: string;
    noOAuthProviders: string;
    noOAuthProvidersDescription: string;
    oauthProviderForm: {
      confirmDeleteProviderMessage: string;
      confirmDeleteProviderTitle: string;
      deleteProvider: string;
      disable: string;
      editProvider: string;
      enable: string;
      errorDeletingOAuthProvider: string;
      errorTogglingOAuthProvider: string;
      appearance: string;
      authorizationUrl: string;
      authorizationUrlPlaceholder: string;
      basicInformation: string;
      clientIdPlaceholder: string;
      clientIdRequired: string;
      clientSecretPlaceholder: string;
      clientSecretRequired: string;
      color: string;
      colorPlaceholder: string;
      createTitle: string;
      creating: string;
      customUrls: string;
      delete: {
        cancel: string;
        delete: string;
        deleting: string;
        error: string;
        message: string;
        title: string;
      };
      editTitle: string;
      iconUrl: string;
      iconUrlPlaceholder: string;
      loading: string;
      namePlaceholder: string;
      nameRequired: string;
      noIdProvided: string;
      notFound: string;
      oauthConfiguration: string;
      providerIdPlaceholder: string;
      providerIdRequired: string;
      save: string;
      scopes: string;
      scopesPlaceholder: string;
      success: {
        deleted: string;
        ok: string;
        title: string;
        updated: string;
      };
      textColor: string;
      textColorPlaceholder: string;
      tokenUrl: string;
      tokenUrlPlaceholder: string;
      updating: string;
      userInfoUrl: string;
      userInfoUrlPlaceholder: string;
      validation: {
        error: string;
        fillAllRequiredFields: string;
        fillRequiredFields: string;
      };
    };
    oauthProviders: string;
    oauthProvidersDescription: string;
    retry: string;
    roles: {
      admin: string;
      moderator: string;
      user: string;
    };
    selectNewRole: string;
    serverStatus: string;
    systemSettings: string;
    systemTokensDescription: string;
    systemTokensTitle: string;
    title: string;
    userManagement: string;
    userManagementDescription: string;
    you: string;
  };
  appSettings: {
    localization: {
      title: string;
      description: string;
      selectLanguage: string;
      selectPlaceholder: string;
    };
    apiUrl: {
      placeholder: string;
      reset: string;
      saveError: string;
      serverUrl: string;
      serverUrlDescription: string;
      success: string;
      successMessage: string;
    };
    autoDownload: {
      description: string;
      downloadOnWiFiOnly: string;
      downloadOnWiFiOnlyDescription: string;
      enableAutoDownload: string;
      enableAutoDownloadDescription: string;
      title: string;
    };
    autoSaveDescription: string;
    cache: {
      approximate: string;
      description: string;
      inCache: string;
      items: string;
      elements: string;
      mediaSize: string;
      notificationsCount: string;
      resetCache: string;
      summary: string;
      title: string;
      totalSize: string;
    };
    cacheReset: {
      completeReset: string;
      completeResetMessage: string;
      completeResetSuccess: string;
      completeResetTitle: string;
      confirmMessage: string;
      confirmTitle: string;
      deselectAll: string;
      notifications: string;
      notificationsDescription: string;
      notificationsInfo: string;
      graphqlInfo: string;
      media: string;
      mediaDescription: string;
      mediaInfo: string;
      noSelection: string;
      noSelectionMessage: string;
      reset: string;
      resetError: string;
      resetSuccess: string;
      resetting: string;
      selectAll: string;
      settings: string;
      settingsDescription: string;
      subtitle: string;
      title: string;
    };
    dateFormat: {
      description: string;
      selectStyle: string;
      selectPlaceholder: string;
      title: string;
      use24Hour: string;
      use24HourDescription: string;
    };
    description: string;
    gqlCache: {
      importExport: {
        buttons: {
          cancel: string;
          import: string;
        };
        confirmImportMessage: string;
        description: string;
        errors: {
          apolloCacheUnavailable: string;
          notificationsArrayNotFound: string;
        };
        exportButton: string;
        exportComplete: string;
        exportCompleteMessage: string;
        exportDescription: string;
        exportError: string;
        exportMetadataButton: string;
        exportMetadataDescription: string;
        exportMetadataError: string;
        failedApply: string;
        failedProcess: string;
        failedRead: string;
        importButton: string;
        importDescription: string;
        importError: string;
        importSuccess: string;
        importSuccessMessage: string;
        importTitle: string;
        invalidFileFormat: string;
        noNotificationsToExport: string;
        noValidNotificationsFound: string;
        confirmImportTitle: string;
        confirmImportQuestion: string;
        importCompleted: string;
        importCompletedMessage: string;
        exportCompleted: string;
        exportCompletedMessage: string;
        title: string;
      };
      maxStoredDaysDescription: string;
      maxStoredDaysTitle: string;
      maxStoredDescription: string;
      maxStoredTitle: string;
      notificationsCount: string;
      title: string;
    };
    notifications: {
      title: string;
      description: string;
      maxStoredTitle: string;
      maxStoredDescription: string;
      showAppIconOnBucketIconMissing: string;
      showAppIconOnBucketIconMissingDescription: string;
      unencryptOnBigPayload: string;
      unencryptOnBigPayloadDescription: string;
      markAsReadOnView: string;
      markAsReadOnViewDescription: string;
    };
    theme: {
      title: string;
      subtitle: string;
      selectPreset: string;
      selectPresetPlaceholder: string;
      dynamicColors: string;
      primaryColor: string;
      secondaryColor: string;
      tertiaryColor: string;
      resetToDefault: string;
      generateTheme: string;
      dynamicThemeGenerated: string;
      presets: {
        material3: string;
        blue: string;
        red: string;
        yellow: string;
        green: string;
        terra: string;
        hightech: string;
        pastel: string;
        minimal: string;
        custom: string;
      };
      presetDescriptions: {
        material3: string;
        blue: string;
        red: string;
        yellow: string;
        green: string;
        terra: string;
        hightech: string;
        pastel: string;
        minimal: string;
        custom: string;
      };
    };
    logs: {
      exportButton: string;
      exportDescription: string;
      exportComplete: string;
      exportCompleteMessage: string;
      exportError: string;
    };
    language: {
      description: string;
      searchLanguage: string;
      selectLanguage: string;
      selectPlaceholder: string;
      title: string;
    };
    retentionPolicies: {
      description: string;
      maxCacheAge: string;
      maxCacheAgeDescription: string;
      maxCacheSize: string;
      maxCacheSizeDescription: string;
      title: string;
    };
    revokeTerms: string;
    revokeTermsConfirm: string;
    revokeTermsDescription: string;
    revokeTermsSuccess: string;
    timezone: {
      description: string;
      deviceDefault: string;
      searchTimezone: string;
      selectTimezone: string;
      selectPlaceholder: string;
      title: string;
    };
    title: string;
    versions: {
      app: string;
      appDescription: string;
      backend: string;
      backendDescription: string;
      description: string;
      expo: string;
      expoDescription: string;
      noUpdateAvailable: string;
      otaUpdate: string;
      platform: string;
      platformDescription: string;
      refresh: string;
      reloadError: string;
      reloadErrorMessage: string;
      title: string;
      unknown: string;
      updateAvailable: string;
    };
  };
  attachmentGallery: {
    attachments: string;
  };
  auth: {
    emailConfirmation: {
      backToLogin: string;
      codePlaceholder: string;
      description: string;
      enterCode: string;
      error: string;
      errorMessage: string;
      invalidCode: string;
      invalidEmail: string;
      resendEmail: string;
      resending: string;
      success: string;
      successMessage: string;
      title: string;
      verifyCode: string;
      verifying: string;
    };
    forgotPassword: {
      backToLogin: string;
      codeLabel: string;
      codePlaceholder: string;
      codeRequired: string;
      codeVerificationFailed: string;
      confirmPasswordLabel: string;
      confirmPasswordPlaceholder: string;
      confirmPasswordRequired: string;
      description: string;
      emailLabel: string;
      emailPlaceholder: string;
      emailRequired: string;
      invalidCode: string;
      invalidEmail: string;
      newPasswordLabel: string;
      newPasswordPlaceholder: string;
      passwordRequired: string;
      passwordResetFailed: string;
      passwordResetSuccess: string;
      passwordResetSuccessMessage: string;
      passwordTooShort: string;
      passwordsMismatch: string;
      resetPassword: string;
      resetting: string;
      sendResetEmail: string;
      sending: string;
      title: string;
      verifyCode: string;
      verifying: string;
    };
  };
  bucketSelector: {
    allBuckets: string;
    searchBuckets: string;
    selectBucket: string;
  };
  buckets: {
    bucketNotFound: string;
    bucketNotFoundDescription: string;
    composeMessage: string;
    createFirstBucket: string;
    danglingBuckets: string;
    danglingBucketTitle: string;
    danglingBucketsDescription: string;
    danglingBucketItem: string;
    noDanglingBuckets: string;
    danglingBucketAction: string;
    danglingBucketActionDescription: string;
    migrateToExisting: string;
    createNewBucket: string;
    cancel: string;
    migrationSuccess: string;
    migrationSuccessMessage: string;
    migrationError: string;
    migrationErrorMessage: string;
    migrating: string;
    migratingDescription: string;
    notification: string;
    notifications: string;
    creatingBucket: string;
    creatingBucketDescription: string;
    bucketCreationSuccess: string;
    bucketCreationSuccessMessage: string;
    bucketCreationError: string;
    bucketCreationErrorMessage: string;
    delete: {
      confirm: string;
      confirmDeleteMessage: string;
      confirmDeleteTitle: string;
      confirmRevokeMessage: string;
      confirmRevokeTitle: string;
      deleteBucket: string;
      deleteBucketWithPermission: string;
      error: string;
      modalDescription: string;
      modalTitle: string;
      revokeSharing: string;
    };
    description: string;
    form: {
      bucketId: string;
      bucketIdCopied: string;
      bucketNotFound: string;
      chooseColor: string;
      colorPreview: string;
      createButton: string;
      createDescription: string;
      createErrorMessage: string;
      createErrorTitle: string;
      createTitle: string;
      creating: string;
      deleteBucket: string;
      editDescription: string;
      editTitle: string;
      iconPlaceholder: string;
      iconPreview: string;
      loadingBucket: string;
      namePlaceholder: string;
      noBucketId: string;
      preview: string;
      readOnlyMode: string;
      readOnlyWarning: string;
      updateButton: string;
      updateErrorMessage: string;
      updateErrorTitle: string;
      updating: string;
    };
    item: {
      bucketIdCopied: string;
      created: string;
      daysAgo: string;
      delete: string;
      hoursAgo: string;
      justNow: string;
      messages: string;
      minutesAgo: string;
      noActivity: string;
      notShared: string;
      sharedWith: string;
      sharedWithMe: string;
      sharedWithPlural: string;
    };
    loadingBucket: string;
    noBucketsYet: string;
    organize: string;
    sharing: {
      confirmRevoke: string;
      confirmRevokeMessage: string;
      description: string;
      editTitle: string;
      enterIdentifier: string;
      expiresAt: string;
      identifierPlaceholder: string;
      loading: string;
      noShares: string;
      permission: {
        admin: string;
        delete: string;
        read: string;
        readwrite: string;
        write: string;
      };
      permissions: string;
      revoke: string;
      share: string;
      shareError: string;
      shareSuccess: string;
      shareTitle: string;
      title: string;
      unknownUser: string;
      unshareError: string;
      unshareSuccess: string;
      update: string;
      userId: string;
      userIdCopied: string;
      userIdentifier: string;
    };
    title: string;
  };
  cachedMedia: {
    delete: string;
    deleteItem: {
      message: string;
      title: string;
    };
    downloadProgress: string;
    forceDownload: string;
    loadingProgress: string;
  };
  changePassword: {
    changeButton: string;
    changing: string;
    confirmPassword: string;
    confirmPasswordPlaceholder: string;
    currentPassword: string;
    currentPasswordPlaceholder: string;
    description: string;
    errors: {
      title: string;
      unknown: string;
    };
    newPassword: string;
    newPasswordPlaceholder: string;
    success: {
      message: string;
      title: string;
    };
    title: string;
    validation: {
      currentPasswordRequired: string;
      newPasswordMinLength: string;
      newPasswordRequired: string;
      passwordsDoNotMatch: string;
      samePassword: string;
    };
  };
  common: {
    add: string;
    all: string;
    apply: string;
    back: string;
    backendUnreachable: string;
    cancel: string;
    clear: string;
    close: string;
    colorPalette: string;
    copied: string;
    copiedToClipboard: string;
    copyToClipboard: string;
    created: string;
    customColor: string;
    delete: string;
    deviceNotRegistered: string;
    endOfResults: string;
    error: string;
    errorOccurred: string;
    exporting: string;
    general: string;
    hexColorCode: string;
    home: string;
    importing: string;
    info: string;
    installApp: string;
    loadMore: string;
    loading: string;
    navigationError: string;
    navigationFailed: string;
    noConnection: string;
    noOptions: string;
    noResults: string;
    notAvailableOnWeb: string;
    notice: string;
    notificationsDisabled: string;
    of: string;
    offline: string;
    ok: string;
    page: string;
    pushNeedsPwaDetails: string;
    pushNeedsPwaHint: string;
    pushPermissionsDetails: string;
    pushPermissionsHint: string;
    reset: string;
    results: string;
    retry: string;
    save: string;
    saved: string;
    savedToGallery: string;
    saving: string;
    search: string;
    selectOption: string;
    settings: string;
    shareNotAvailable: string;
    showing: string;
    snooze: string;
    snoozeGeneric: string;
    snoozeMessage: string;
    success: string;
    unableToShare: string;
    updateAvailable: string;
  };
  compose: {
    messageBuilder: {
      createMessage: string;
      title: string;
      subtitle: string;
      body: string;
      actions: string;
      attachments: string;
      titlePlaceholder: string;
      subtitlePlaceholder: string;
      bodyPlaceholder: string;
      deliveryTypePlaceholder: string;
      actionsDescription: string;
      attachmentsDescription: string;
      deliveryType: {
        normal: string;
        critical: string;
        silent: string;
      };
    };
  };
  devices: {
    description: string;
    editName: {
      cancel: string;
      description: string;
      errorMessage: string;
      namePlaceholder: string;
      nameRequired: string;
      save: string;
      saving: string;
      successMessage: string;
      title: string;
    };
    item: {
      active: string;
      delete: string;
      inactive: string;
      lastUsed: string;
      model: string;
      never: string;
      registered: string;
      removeDeviceConfirm: string;
      removeDeviceMessage: string;
      removeDeviceTitle: string;
      thisDevice: string;
      unknown: string;
    };
    noDevicesSubtext: string;
    noDevicesTitle: string;
    registerDevice: string;
    registerErrorMessage: string;
    registering: string;
    removeErrorMessage: string;
    title: string;
    unregisterDevice: string;
    unregisterErrorMessage: string;
    unregistering: string;
  };
  filters: {
    activeFilters: string;
    activeFiltersPlural: string;
    bucket: string;
    clearAll: string;
    performance: string;
    loadOnlyVisible: string;
    loadOnlyVisibleDescription: string;
    hideOlderThan: string;
    hideRead: string;
    hideReadDescription: string;
    newestFirst: string;
    oldestFirst: string;
    oneDay: string;
    oneMonth: string;
    oneWeek: string;
    priority: string;
    quickFilters: string;
    showAll: string;
    sortBy: string;
    title: string;
    withMedia: string;
    withMediaDescription: string;
  };
  gallery: {
    cachedOn: string;
    older: string;
    thisMonth: string;
    thisWeek: string;
    today: string;
    yesterday: string;
    cachedItems: string;
    statsByType: string;
  };
  gallerySettings: {
    autoPlay: string;
    autoPlayDescription: string;
    gridSize: string;
    gridSizeDescription: string;
    showFaultyMedias: string;
    showFaultyMediasDescription: string;
    title: string;
  };
  home: {
    emptyState: {
      noNotifications: string;
    };
    search: {
      placeholder: string;
    };
  };
  iconEditor: {
    title: string;
    fromUrl: string;
    fromFile: string;
    enterUrl: string;
    urlPlaceholder: string;
    loadImage: string;
    selectFile: string;
    chooseFile: string;
    cropImage: string;
    cropAndUpload: string;
    urlRequired: string;
    invalidUrl: string;
    filePickError: string;
    cropError: string;
    uploadError: string;
  };
  legal: {
    acceptTerms: string;
    acceptanceDescription: string;
    acceptanceFooterText: string;
    acceptanceRequired: string;
    allDocuments: string;
    declineTerms: string;
    declineTermsMessage: string;
    declineTermsTitle: string;
    errorAcceptingTerms: string;
    errorLoading: string;
    errorLoadingDescription: string;
    errorTitle: string;
    exitApp: string;
    loading: string;
    reviewAgain: string;
    version: string;
  };
  login: {
    emailOrUsername: string;
    emailOrUsernamePlaceholder: string;
    errors: {
      connectionError: string;
      invalidCredentials: string;
      loginFailed: string;
      networkError: string;
      unexpectedError: string;
    };
    forgotPassword: string;
    loggingIn: string;
    loginButton: string;
    noAccount: string;
    orContinueWith: string;
    password: string;
    passwordPlaceholder: string;
    providers: {
      cancelled: string;
    };
    signUp: string;
    validation: {
      emailOrUsernameMinLength: string;
      emailOrUsernameRequired: string;
      passwordRequired: string;
    };
    welcomeBack: string;
  };
  mediaTypes: {
    AUDIO: string;
    GIF: string;
    ICON: string;
    IMAGE: string;
    VIDEO: string;
    undefined: string;
  };
  medias: {
    deleteItem: {
      message: string;
      title: string;
    };
    empty: {
      message: string;
      title: string;
    };
    filters: {
      allTypes: string;
      deselectAll: string;
      noType: string;
      selectAll: string;
      selectMediaTypes: string;
      selectedTypesCount: string;
    };
    stats: {
      byType: string;
      title: string;
      totalItems: string;
      totalSize: string;
    };
  };
  navigation: {
    title: string;
    help: string;
    notifications: string;
    sections: {
      all: string;
      buckets: string;
      gallery: string;
    };
    settings: string;
    placeholder: {
      content: string;
      notifications: string;
      buckets: string;
      gallery: string;
    };
  };
  notificationActions: {
    actionCount: string;
    actionCountPlural: string;
    actionTypes: {
      BACKGROUND_CALL: string;
      CLEAR: string;
      DELETE: string;
      NAVIGATE: string;
      OPEN_NOTIFICATION: string;
      SNOOZE: string;
      WEBHOOK: string;
    };
    availableActions: string;
    destructive: string;
    noActionsAvailable: string;
  };
  notificationDetail: {
    deleteCancelButton: string;
    deleteConfirmButton: string;
    deleteConfirmMessage: string;
    deleteConfirmTitle: string;
    deleteSuccess: string;
    delete: {
      error: string;
    };
    deliveryTypes: {
      CRITICAL: string;
      NORMAL: string;
      SILENT: string;
    };
    loading: string;
    notFound: string;
    notificationCopied: string;
    read: string;
    sent: string;
    shareNotification: string;
    snooze: {
      confirm: string;
      customDateTime: string;
      errorRemoving: string;
      errorSetting: string;
      quickOptions: string;
      quickTimes: {
        "12hours": string;
        "15min": string;
        "1day": string;
        "1hour": string;
        "1week": string;
        "3days": string;
        "4hours": string;
        "2weeks": string;
      };
      remaining: string;
      removeSnooze: string;
      setSnooze: string;
      snoozedFor: string;
      snoozedUntil: string;
      title: string;
    };
    title: string;
  };
  notifications: {
    actions: {
      actionTitle: string;
      actionTitlePlaceholder: string;
      actionType: string;
      actionValue: string;
      actionValuePlaceholder: string;
      actionValueRequired: string;
      addAction: string;
      destructiveAction: string;
      iconHint: string;
      iconName: string;
      iconNamePlaceholder: string;
      searchWebhooks: string;
      selectActionType: string;
      selectWebhook: string;
      title: string;
    };
    attachments: {
      addMedia: string;
      hint: string;
      mediaName: string;
      mediaNamePlaceholder: string;
      mediaType: string;
      mediaUrl: string;
      mediaUrlPlaceholder: string;
      selectMediaType: string;
      title: string;
    };
    automaticActions: {
      addDeleteAction: string;
      addDeleteActionDescription: string;
      addMarkAsReadAction: string;
      addMarkAsReadActionDescription: string;
      addOpenNotificationAction: string;
      addOpenNotificationActionDescription: string;
      description: string;
      snoozeTimePlaceholder: string;
      snoozeTimes: string;
      snoozeTimesDescription: string;
      title: string;
    };
    content: {
      body: string;
      bodyPlaceholder: string;
      subtitle: string;
      subtitlePlaceholder: string;
      title: string;
      titlePlaceholder: string;
    };
    deleteSelected: {
      message: string;
      title: string;
    };
    description: string;
    deselectAll: string;
    endOfList: string;
    errors: {
      markAllAsReadFailed: string;
    };
    examples: {
      sampleAudio: string;
      sampleGif: string;
      sampleImage: string;
      sampleVideo: string;
      testBody: string;
      testSubtitle: string;
      testTitle: string;
      visitWebsite: string;
    };
    form: {
      cancel: string;
    };
    loadTestData: string;
    noWebhooks: {
      message: string;
    };
    preview: {
      copied: string;
      copy: string;
      description: string;
      title: string;
    };
    resetForm: string;
    selectAll: string;
    sendButton: string;
    sendErrorTitle: string;
    sending: string;
    settings: {
      deliveryType: string;
      locale: string;
      localeDescription: string;
      selectDeliveryType: string;
      selectLocale: string;
      sound: string;
      soundPlaceholder: string;
    };
    tapAction: {
      addTapAction: string;
      description: string;
      saveTapAction: string;
      title: string;
    };
    targeting: {
      bucket: string;
      bucketRequired: string;
      clearSelection: string;
      collapseId: string;
      collapseIdPlaceholder: string;
      groupId: string;
      groupIdDefault: string;
      groupIdPlaceholder: string;
      loadingBuckets: string;
      selectBucket: string;
      userIds: string;
      userIdsDefault: string;
      userIdsDescription: string;
    };
    title: string;
    titleRequired: string;
    warningNotRegistered: string;
    webhookAction: {
      methodRequired: string;
      urlRequired: string;
    };
  };
  onboarding: {
    api: {
      description: string;
      documentationInfo: string;
      documentationLink: string;
      title: string;
    };
    bucket: {
      createButton: string;
      creating: string;
      description: string;
      nameLabel: string;
      namePlaceholder: string;
      title: string;
    };
    messages: {
      bucketCreateError: string;
      bucketNameRequired: string;
      createBucketFirst: string;
      notificationFieldsRequired: string;
      notificationSendError: string;
      tokenCopied: string;
      tokenCreateError: string;
      tokenCreated: string;
      tokenNameRequired: string;
      useInHeader: string;
    };
    navigation: {
      back: string;
      complete: string;
      next: string;
      step: string;
    };
    notification: {
      bodyLabel: string;
      bodyPlaceholder: string;
      description: string;
      sendButton: string;
      sending: string;
      title: string;
      titleLabel: string;
      titlePlaceholder: string;
    };
    preview: {
      copied: string;
      copy: string;
    };
    title: string;
    token: {
      createButton: string;
      creating: string;
      description: string;
      nameLabel: string;
      namePlaceholder: string;
      title: string;
    };
    welcome: {
      description: string;
      description2: string;
      title: string;
    };
  };
  recurringSnooze: {
    add: string;
    addSchedule: string;
    addScheduleTitle: string;
    cancel: string;
    days: {
      friday: string;
      monday: string;
      saturday: string;
      sunday: string;
      thursday: string;
      tuesday: string;
      wednesday: string;
    };
    daysOfWeek: string;
    editSchedule: string;
    enableSchedule: string;
    formats: {
      everyDay: string;
      noDaysSelected: string;
      weekdays: string;
      weekends: string;
    };
    from: string;
    noSchedules: string;
    noSchedulesDescription: string;
    timeRange: string;
    to: string;
    update: string;
    validation: {
      invalidTimeRange: string;
      selectDays: string;
    };
  };
  register: {
    confirmPassword: string;
    confirmPasswordPlaceholder: string;
    email: string;
    emailConfirmation: {
      checkEmail: string;
      description: string;
      emailSentMessage: string;
      notReceived: string;
      resendEmail: string;
      resending: string;
      spamFolder: string;
      title: string;
    };
    emailPlaceholder: string;
    errors: {
      connectionError: string;
      registrationFailed: string;
    };
    firstName: string;
    firstNamePlaceholder: string;
    haveAccount: string;
    lastName: string;
    lastNamePlaceholder: string;
    login: string;
    password: string;
    passwordPlaceholder: string;
    registerButton: string;
    registering: string;
    title: string;
    validation: {
      confirmPasswordRequired: string;
      emailInvalid: string;
      emailRequired: string;
      passwordRequired: string;
      passwordsDoNotMatch: string;
    };
  };
  setPassword: {
    confirmPasswordPlaceholder: string;
    description: string;
    errors: {
      title: string;
      unknown: string;
    };
    newPasswordPlaceholder: string;
    setButton: string;
    setting: string;
    success: {
      message: string;
      title: string;
    };
    title: string;
    validation: {
      newPasswordMinLength: string;
      newPasswordRequired: string;
      passwordsDoNotMatch: string;
    };
  };
  swipeActions: {
    delete: {
      cancel: string;
      confirm: string;
      error: string;
      label: string;
      message: string;
      title: string;
    };
    markAsRead: {
      label: string;
    };
    markAsUnread: {
      label: string;
    };
  };
  systemAccessTokens: {
    deleteError: string;
    description: string;
    edit: {
      currentTokenInfo: string;
      title: string;
      tokenNotFound: string;
      updateButton: string;
      updateError: string;
      updateSuccess: string;
      updating: string;
    };
    form: {
      copied: string;
      copy: string;
      createButton: string;
      createError: string;
      creating: string;
      description: string;
      descriptionPlaceholder: string;
      done: string;
      expiration: string;
      expirationHint: string;
      expirationPlaceholder: string;
      maxCalls: string;
      maxCallsPlaceholder: string;
      maxCallsRequired: string;
      noUsers: string;
      requester: string;
      requesterHint: string;
      requesterPlaceholder: string;
      selectUser: string;
      title: string;
      tokenCopied: string;
      tokenCreatedSubtitle: string;
      tokenCreatedTitle: string;
    };
    item: {
      calls: string;
      created: string;
      delete: string;
      deleteTokenConfirm: string;
      deleteTokenMessage: string;
      deleteTokenTitle: string;
      description: string;
      expired: string;
      expires: string;
      requester: string;
    };
    noTokensSubtext: string;
    noTokensTitle: string;
    title: string;
  };
  userDropdown: {
    administration: string;
    documentation: string;
    gettingStarted: string;
    logout: string;
    offlineMode: string;
    settings: string;
    themes: {
      dark: string;
      light: string;
      system: string;
      theme: string;
    };
    unknownUser: string;
  };
  userProfile: {
    accountDeletedMessage: string;
    accountDeletedTitle: string;
    deleteAccountWarning: string;
    avatar: string;
    avatarPlaceholder: string;
    changePassword: string;
    continue: string;
    currentSessionProvider: string;
    deleteAccount: string;
    deleteAccountConfirm: string;
    deleteAccountFinalMessage: string;
    deleteAccountFinalTitle: string;
    deleteAccountMessage: string;
    deleteAccountTitle: string;
    deletingAccount: string;
    description: string;
    editProfile: string;
    email: string;
    errorLoadingData: string;
    firstName: string;
    firstNamePlaceholder: string;
    lastName: string;
    lastNamePlaceholder: string;
    localUser: string;
    logout: string;
    notificationStats: string;
    today: string;
    thisWeek: string;
    thisMonth: string;
    total: string;
    noDataAvailable: string;
    notAvailable: string;
    notSet: string;
    oauthConnections: {
      connect: string;
      connected: string;
      connectedAs: string;
      connectionError: string;
      noConnections: string;
      title: string;
    };
    profileUpdateError: string;
    profileUpdateSuccess: string;
    save: string;
    saving: string;
    title: string;
    userId: string;
    userIdCopied: string;
    username: string;
  };
  userSessions: {
    deleteError: string;
    description: string;
    item: {
      created: string;
      current: string;
      expired: string;
      expires: string;
      ipAddress: string;
      lastActivity: string;
      revoke: string;
      revokeSessionConfirm: string;
      revokeSessionMessage: string;
      revokeSessionTitle: string;
      unknownDevice: string;
    };
    noSessionsSubtext: string;
    noSessionsTitle: string;
    revokeAllOthers: string;
    revokeAllOthersConfirm: string;
    revokeAllOthersMessage: string;
    revokeAllOthersTitle: string;
    title: string;
  };
  webhooks: {
    create: string;
    createErrorMessage: string;
    delete: string;
    deleteConfirmMessage: string;
    deleteConfirmTitle: string;
    deleteErrorMessage: string;
    deleteSuccessMessage: string;
    description: string;
    edit: string;
    form: {
      body: string;
      bodyHelp: string;
      bodyPlaceholder: string;
      create: string;
      creating: string;
      jsonExample: string;
      jsonHelpMessage: string;
      jsonHelpTitle: string;
      jsonParsingError: string;
      jsonValidationError: string;
      method: string;
      name: string;
      namePlaceholder: string;
      nameRequired: string;
      noWebhookId: string;
      save: string;
      saving: string;
      url: string;
      urlInvalid: string;
      urlPlaceholder: string;
      urlRequired: string;
      webhookError: string;
      webhookExecutionFailed: string;
      webhookNotFound: string;
      webhookSuccess: string;
    };
    methods: {
      DELETE: string;
      GET: string;
      PATCH: string;
      POST: string;
      PUT: string;
    };
    noWebhooksSubtext: string;
    noWebhooksTitle: string;
    title: string;
    updateErrorMessage: string;
  };
  payloadMappers: {
    builtIn: string;
    cannotDeleteBuiltIn: string;
    cannotEditBuiltIn: string;
    create: string;
    createSuccessMessage: string;
    createErrorMessage: string;
    delete: string;
    deleteConfirmMessage: string;
    deleteConfirmTitle: string;
    deleteErrorMessage: string;
    deleteSuccessMessage: string;
    description: string;
    edit: string;
    form: {
      create: string;
      creating: string;
      jsEvalFn: string;
      jsEvalFnHelp: string;
      jsEvalFnInvalidSyntax: string;
      jsEvalFnPlaceholder: string;
      jsEvalFnRequired: string;
      name: string;
      namePlaceholder: string;
      nameRequired: string;
      save: string;
      saving: string;
      test: string;
      testError: string;
      resetToDefault: string;
      resetToSaved: string;
      testExecutionError: string;
      testInput: string;
      testInputHelp: string;
      testInputInvalidJson: string;
      testInputPlaceholder: string;
      testInputRequired: string;
      testOutput: string;
      testSuccess: string;
    };
    noPayloadMappersSubtext: string;
    noPayloadMappersTitle: string;
    title: string;
    updateErrorMessage: string;
  };
  eventsReview: {
    title: string;
    description: string;
    filters: {
      title: string;
      type: string;
      userId: string;
      objectId: string;
      targetId: string;
    };
    empty: {
      title: string;
      description: string;
    };
  };
  notFound: {
    title: string;
    description: string;
    goHome: string;
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
