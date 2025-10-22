import { GraphQLClient, RequestOptions } from 'graphql-request';
import { DocumentNode } from 'graphql';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: string; output: string; }
  JSON: { input: any; output: any; }
};

export type AccessTokenListDto = {
  __typename?: 'AccessTokenListDto';
  createdAt: Scalars['DateTime']['output'];
  expiresAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['String']['output'];
  isExpired: Scalars['Boolean']['output'];
  lastUsed: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  scopes: Maybe<Array<Scalars['String']['output']>>;
  token: Maybe<Scalars['String']['output']>;
};

export type AccessTokenResponseDto = {
  __typename?: 'AccessTokenResponseDto';
  createdAt: Scalars['DateTime']['output'];
  expiresAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  token: Scalars['String']['output'];
  tokenStored: Scalars['Boolean']['output'];
};

export type ApproveSystemAccessTokenRequestDto = {
  expiresAt?: InputMaybe<Scalars['String']['input']>;
};

export type Attachment = {
  __typename?: 'Attachment';
  createdAt: Scalars['DateTime']['output'];
  filename: Scalars['String']['output'];
  filepath: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  mediaType: Maybe<MediaType>;
  messageId: Maybe<Scalars['String']['output']>;
  originalFilename: Maybe<Scalars['String']['output']>;
  size: Maybe<Scalars['Float']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['String']['output'];
};

export type BackupInfoDto = {
  __typename?: 'BackupInfoDto';
  createdAt: Scalars['DateTime']['output'];
  filename: Scalars['String']['output'];
  path: Scalars['String']['output'];
  size: Scalars['String']['output'];
  sizeBytes: Scalars['Float']['output'];
};

export type BatchUpdateSettingInput = {
  configType: ServerSettingType;
  valueBool?: InputMaybe<Scalars['Boolean']['input']>;
  valueNumber?: InputMaybe<Scalars['Float']['input']>;
  valueText?: InputMaybe<Scalars['String']['input']>;
};

export type Bucket = {
  __typename?: 'Bucket';
  color: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  description: Maybe<Scalars['String']['output']>;
  icon: Maybe<Scalars['String']['output']>;
  iconAttachmentUuid: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isAdmin: Maybe<Scalars['Boolean']['output']>;
  isProtected: Maybe<Scalars['Boolean']['output']>;
  isPublic: Maybe<Scalars['Boolean']['output']>;
  messages: Maybe<Array<Message>>;
  name: Scalars['String']['output'];
  permissions: Array<EntityPermission>;
  updatedAt: Scalars['DateTime']['output'];
  user: User;
  userBucket: Maybe<UserBucket>;
  userBuckets: Maybe<Array<UserBucket>>;
  userPermissions: BucketPermissionsDto;
};

export type BucketPermissionsDto = {
  __typename?: 'BucketPermissionsDto';
  /** User can administer this bucket */
  canAdmin: Scalars['Boolean']['output'];
  /** User can delete this bucket */
  canDelete: Scalars['Boolean']['output'];
  /** User can read from this bucket */
  canRead: Scalars['Boolean']['output'];
  /** User can write to this bucket */
  canWrite: Scalars['Boolean']['output'];
  /** User is the owner of this bucket */
  isOwner: Scalars['Boolean']['output'];
  /** Bucket is shared with this user */
  isSharedWithMe: Scalars['Boolean']['output'];
  /** Number of users this bucket is shared with */
  sharedCount: Scalars['Int']['output'];
};

export type ChangePasswordInput = {
  currentPassword: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
};

export type ConfirmEmailDto = {
  code: Scalars['String']['input'];
  locale?: InputMaybe<Scalars['String']['input']>;
};

export type CreateAccessTokenDto = {
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  name: Scalars['String']['input'];
  scopes?: InputMaybe<Array<Scalars['String']['input']>>;
  storeToken?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CreateBucketDto = {
  color?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  generateIconWithInitials?: InputMaybe<Scalars['Boolean']['input']>;
  icon?: InputMaybe<Scalars['String']['input']>;
  isProtected?: InputMaybe<Scalars['Boolean']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
};

export type CreateInviteCodeInput = {
  /** Expiration date (ISO string) */
  expiresAt?: InputMaybe<Scalars['String']['input']>;
  /** Maximum number of uses */
  maxUses?: InputMaybe<Scalars['Int']['input']>;
  /** Permissions to grant */
  permissions: Array<Scalars['String']['input']>;
  /** Resource ID */
  resourceId: Scalars['String']['input'];
  /** Resource type */
  resourceType: Scalars['String']['input'];
};

export type CreateMessageDto = {
  actions?: InputMaybe<Array<NotificationActionDto>>;
  addDeleteAction?: InputMaybe<Scalars['Boolean']['input']>;
  addMarkAsReadAction?: InputMaybe<Scalars['Boolean']['input']>;
  addOpenNotificationAction?: InputMaybe<Scalars['Boolean']['input']>;
  attachmentUuids?: InputMaybe<Array<Scalars['String']['input']>>;
  attachments?: InputMaybe<Array<NotificationAttachmentDto>>;
  body?: InputMaybe<Scalars['String']['input']>;
  bucketId: Scalars['String']['input'];
  collapseId?: InputMaybe<Scalars['String']['input']>;
  deliveryType: NotificationDeliveryType;
  gifUrl?: InputMaybe<Scalars['String']['input']>;
  groupId?: InputMaybe<Scalars['String']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  locale?: InputMaybe<Scalars['String']['input']>;
  maxReminders?: InputMaybe<Scalars['Float']['input']>;
  postpones?: InputMaybe<Array<Scalars['Float']['input']>>;
  remindEveryMinutes?: InputMaybe<Scalars['Float']['input']>;
  snoozes?: InputMaybe<Array<Scalars['Float']['input']>>;
  sound?: InputMaybe<Scalars['String']['input']>;
  subtitle?: InputMaybe<Scalars['String']['input']>;
  tapAction?: InputMaybe<NotificationActionDto>;
  tapUrl?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
  userIds?: InputMaybe<Array<Scalars['String']['input']>>;
  videoUrl?: InputMaybe<Scalars['String']['input']>;
};

export type CreateOAuthProviderDto = {
  additionalConfig?: InputMaybe<Scalars['String']['input']>;
  authorizationUrl?: InputMaybe<Scalars['String']['input']>;
  callbackUrl?: InputMaybe<Scalars['String']['input']>;
  clientId: Scalars['String']['input'];
  clientSecret: Scalars['String']['input'];
  color?: InputMaybe<Scalars['String']['input']>;
  iconUrl?: InputMaybe<Scalars['String']['input']>;
  isEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  profileFields?: InputMaybe<Array<Scalars['String']['input']>>;
  providerId: Scalars['String']['input'];
  scopes: Array<Scalars['String']['input']>;
  textColor?: InputMaybe<Scalars['String']['input']>;
  tokenUrl?: InputMaybe<Scalars['String']['input']>;
  type: OAuthProviderType;
  userInfoUrl?: InputMaybe<Scalars['String']['input']>;
};

export type CreatePayloadMapperDto = {
  jsEvalFn: Scalars['String']['input'];
  name: Scalars['String']['input'];
  requiredUserSettings?: InputMaybe<Array<UserSettingType>>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type CreateSystemAccessTokenRequestDto = {
  description?: InputMaybe<Scalars['String']['input']>;
  maxRequests: Scalars['Int']['input'];
};

export type CreateWebhookDto = {
  body?: InputMaybe<Scalars['JSON']['input']>;
  headers: Array<WebhookHeaderDto>;
  method: HttpMethod;
  name: Scalars['String']['input'];
  url: Scalars['String']['input'];
};

export type DeclineSystemAccessTokenRequestDto = {
  reason?: InputMaybe<Scalars['String']['input']>;
};

export type DeviceInfoDto = {
  deviceModel?: InputMaybe<Scalars['String']['input']>;
  deviceName?: InputMaybe<Scalars['String']['input']>;
  osVersion?: InputMaybe<Scalars['String']['input']>;
  platform?: InputMaybe<Scalars['String']['input']>;
};

/** Platform types for devices */
export enum DevicePlatform {
  Android = 'ANDROID',
  Ios = 'IOS',
  Web = 'WEB'
}

export type EmailConfirmationResponseDto = {
  __typename?: 'EmailConfirmationResponseDto';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type EmailStatusResponseDto = {
  __typename?: 'EmailStatusResponseDto';
  confirmed: Scalars['Boolean']['output'];
  message: Scalars['String']['output'];
};

export type EntityExecution = {
  __typename?: 'EntityExecution';
  createdAt: Scalars['DateTime']['output'];
  durationMs: Maybe<Scalars['Float']['output']>;
  entityId: Maybe<Scalars['String']['output']>;
  entityName: Maybe<Scalars['String']['output']>;
  errors: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  input: Scalars['String']['output'];
  output: Maybe<Scalars['String']['output']>;
  status: ExecutionStatus;
  type: ExecutionType;
  updatedAt: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['String']['output'];
};

export type EntityPermission = {
  __typename?: 'EntityPermission';
  createdAt: Scalars['DateTime']['output'];
  expiresAt: Maybe<Scalars['DateTime']['output']>;
  grantedBy: Maybe<User>;
  id: Scalars['ID']['output'];
  /** Invite code ID used to create this permission */
  inviteCodeId: Maybe<Scalars['String']['output']>;
  permissions: Array<Permission>;
  resourceId: Scalars['String']['output'];
  resourceType: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  user: User;
};

export type Event = {
  __typename?: 'Event';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  objectId: Maybe<Scalars['String']['output']>;
  targetId: Maybe<Scalars['String']['output']>;
  type: EventType;
  userId: Maybe<Scalars['String']['output']>;
};

/** Tracked event type */
export enum EventType {
  AccountDelete = 'ACCOUNT_DELETE',
  BucketCreation = 'BUCKET_CREATION',
  BucketSharing = 'BUCKET_SHARING',
  BucketUnsharing = 'BUCKET_UNSHARING',
  DeviceRegister = 'DEVICE_REGISTER',
  DeviceUnregister = 'DEVICE_UNREGISTER',
  Login = 'LOGIN',
  LoginOauth = 'LOGIN_OAUTH',
  Logout = 'LOGOUT',
  Message = 'MESSAGE',
  Notification = 'NOTIFICATION',
  NotificationAck = 'NOTIFICATION_ACK',
  PushPassthrough = 'PUSH_PASSTHROUGH',
  Register = 'REGISTER'
}

export type EventsQueryDto = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  objectId?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  targetId?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<EventType>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type EventsResponseDto = {
  __typename?: 'EventsResponseDto';
  events: Array<Event>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  limit: Scalars['Int']['output'];
  page: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  totalPages: Scalars['Int']['output'];
};

/** Status of the execution */
export enum ExecutionStatus {
  Error = 'ERROR',
  Skipped = 'SKIPPED',
  Success = 'SUCCESS',
  Timeout = 'TIMEOUT'
}

/** Types of executions that are tracked */
export enum ExecutionType {
  PayloadMapper = 'PAYLOAD_MAPPER',
  Webhook = 'WEBHOOK'
}

export type GetEntityExecutionsInput = {
  entityId?: InputMaybe<Scalars['String']['input']>;
  entityName?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<ExecutionType>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type GetLogsInput = {
  context?: InputMaybe<Scalars['String']['input']>;
  level?: InputMaybe<LogLevel>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type GetResourcePermissionsInput = {
  resourceId: Scalars['String']['input'];
  resourceType: ResourceType;
};

export type GrantEntityPermissionInput = {
  expiresAt?: InputMaybe<Scalars['String']['input']>;
  permissions: Array<Permission>;
  resourceId: Scalars['String']['input'];
  resourceType: ResourceType;
  userEmail?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
  username?: InputMaybe<Scalars['String']['input']>;
};

/** HTTP methods for webhooks */
export enum HttpMethod {
  Delete = 'DELETE',
  Get = 'GET',
  Patch = 'PATCH',
  Post = 'POST',
  Put = 'PUT'
}

export type InviteCode = {
  __typename?: 'InviteCode';
  /** Unique invite code */
  code: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  /** User who created this code */
  createdBy: Scalars['String']['output'];
  creator: User;
  /** Expiration date for this code */
  expiresAt: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  /** Maximum number of uses (null = unlimited) */
  maxUses: Maybe<Scalars['Float']['output']>;
  /** Permissions granted by this code */
  permissions: Array<Scalars['String']['output']>;
  /** Resource ID this code grants access to */
  resourceId: Scalars['String']['output'];
  /** Resource type (BUCKET, etc.) */
  resourceType: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  /** Number of times this code has been used */
  usageCount: Scalars['Float']['output'];
};

export type InviteCodeRedemptionResult = {
  __typename?: 'InviteCodeRedemptionResult';
  /** Error message if redemption failed */
  error: Maybe<Scalars['String']['output']>;
  /** Permissions that were granted */
  permissions: Maybe<Array<Scalars['String']['output']>>;
  /** Resource ID that was granted access to */
  resourceId: Maybe<Scalars['String']['output']>;
  /** Resource type that was granted access to */
  resourceType: Maybe<Scalars['String']['output']>;
  /** Whether redemption was successful */
  success: Scalars['Boolean']['output'];
};

export type Log = {
  __typename?: 'Log';
  context: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  level: LogLevel;
  message: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  timestamp: Scalars['DateTime']['output'];
  trace: Maybe<Scalars['String']['output']>;
};

/** Log level enum */
export enum LogLevel {
  Debug = 'DEBUG',
  Error = 'ERROR',
  Http = 'HTTP',
  Info = 'INFO',
  Silly = 'SILLY',
  Verbose = 'VERBOSE',
  Warn = 'WARN'
}

export type LoginDto = {
  deviceInfo?: InputMaybe<DeviceInfoDto>;
  email?: InputMaybe<Scalars['String']['input']>;
  password: Scalars['String']['input'];
  username?: InputMaybe<Scalars['String']['input']>;
};

export type LoginResponse = {
  __typename?: 'LoginResponse';
  accessToken: Scalars['String']['output'];
  message: Maybe<Scalars['String']['output']>;
  refreshToken: Scalars['String']['output'];
  user: User;
};

export type MarkAllAsReadResult = {
  __typename?: 'MarkAllAsReadResult';
  success: Scalars['Boolean']['output'];
  updatedCount: Scalars['Float']['output'];
};

export type MassDeleteResult = {
  __typename?: 'MassDeleteResult';
  deletedCount: Scalars['Float']['output'];
  success: Scalars['Boolean']['output'];
};

export type MassMarkResult = {
  __typename?: 'MassMarkResult';
  success: Scalars['Boolean']['output'];
  updatedCount: Scalars['Float']['output'];
};

export enum MediaType {
  Audio = 'AUDIO',
  Gif = 'GIF',
  Icon = 'ICON',
  Image = 'IMAGE',
  Video = 'VIDEO'
}

export type Message = {
  __typename?: 'Message';
  actions: Maybe<Array<NotificationAction>>;
  addDeleteAction: Maybe<Scalars['Boolean']['output']>;
  addMarkAsReadAction: Maybe<Scalars['Boolean']['output']>;
  addOpenNotificationAction: Maybe<Scalars['Boolean']['output']>;
  attachmentUuids: Maybe<Array<Scalars['String']['output']>>;
  attachments: Maybe<Array<MessageAttachment>>;
  body: Maybe<Scalars['String']['output']>;
  bucket: Bucket;
  bucketId: Scalars['String']['output'];
  collapseId: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  deliveryType: NotificationDeliveryType;
  fileAttachments: Maybe<Array<Attachment>>;
  groupId: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  locale: Maybe<Scalars['String']['output']>;
  maxReminders: Maybe<Scalars['Float']['output']>;
  postpones: Maybe<Array<Scalars['Float']['output']>>;
  remindEveryMinutes: Maybe<Scalars['Float']['output']>;
  snoozes: Maybe<Array<Scalars['Float']['output']>>;
  sound: Maybe<Scalars['String']['output']>;
  subtitle: Maybe<Scalars['String']['output']>;
  tapAction: Maybe<NotificationAction>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type MessageAttachment = {
  __typename?: 'MessageAttachment';
  attachmentUuid: Maybe<Scalars['String']['output']>;
  mediaType: MediaType;
  name: Maybe<Scalars['String']['output']>;
  saveOnServer: Maybe<Scalars['Boolean']['output']>;
  url: Maybe<Scalars['String']['output']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  approveSystemAccessTokenRequest: SystemAccessTokenRequest;
  /** Batch update multiple server settings */
  batchUpdateServerSettings: Array<ServerSetting>;
  cancelPostpone: Scalars['Boolean']['output'];
  changePassword: Scalars['Boolean']['output'];
  cleanupExpiredPermissions: Scalars['Float']['output'];
  confirmEmail: EmailConfirmationResponseDto;
  createAccessToken: AccessTokenResponseDto;
  createAccessTokenForBucket: AccessTokenResponseDto;
  createBucket: Bucket;
  /** Create a new invite code for a resource */
  createInviteCode: InviteCode;
  /** Create a new message and send notifications to bucket users (returns the created message). */
  createMessage: Message;
  createOAuthProvider: OAuthProvider;
  createPayloadMapper: PayloadMapper;
  createSystemAccessTokenRequest: SystemAccessTokenRequest;
  createSystemToken: SystemAccessTokenDto;
  createWebhook: UserWebhook;
  declineSystemAccessTokenRequest: SystemAccessTokenRequest;
  deleteAccount: Scalars['Boolean']['output'];
  /** Delete a specific backup file */
  deleteBackup: Scalars['Boolean']['output'];
  deleteBucket: Scalars['Boolean']['output'];
  /** Delete an invite code */
  deleteInviteCode: Scalars['Boolean']['output'];
  deleteNotification: Scalars['Boolean']['output'];
  deleteOAuthProvider: Scalars['Boolean']['output'];
  deletePayloadMapper: Scalars['Boolean']['output'];
  deleteWebhook: Scalars['Boolean']['output'];
  deviceReportNotificationReceived: Notification;
  executeWebhook: Scalars['Boolean']['output'];
  grantEntityPermission: EntityPermission;
  login: LoginResponse;
  logout: Scalars['String']['output'];
  markAllNotificationsAsRead: MarkAllAsReadResult;
  markNotificationAsRead: Notification;
  markNotificationAsReceived: Notification;
  markNotificationAsUnread: Notification;
  massDeleteNotifications: MassDeleteResult;
  massMarkNotificationsAsRead: MassMarkResult;
  massMarkNotificationsAsUnread: MassMarkResult;
  postponeNotification: PostponeResponseDto;
  /** Redeem an invite code to gain access */
  redeemInviteCode: InviteCodeRedemptionResult;
  refreshAccessToken: RefreshTokenResponse;
  register: RegisterResponse;
  registerDevice: UserDevice;
  removeDevice: Scalars['Boolean']['output'];
  removeDeviceByToken: Scalars['Boolean']['output'];
  requestEmailConfirmation: EmailConfirmationResponseDto;
  requestPasswordReset: PasswordResetResponseDto;
  resetPassword: PasswordResetResponseDto;
  /** Restart the server */
  restartServer: Scalars['String']['output'];
  revokeAccessToken: Scalars['Boolean']['output'];
  revokeAllAccessTokens: Scalars['Boolean']['output'];
  revokeAllOtherSessions: Scalars['Boolean']['output'];
  revokeEntityPermission: Scalars['Boolean']['output'];
  revokeSession: Scalars['Boolean']['output'];
  revokeSystemToken: Scalars['Boolean']['output'];
  /** @deprecated Usa Bucket.setBucketSnooze (questo sarà rimosso) */
  setBucketSnooze: UserBucket;
  setBucketSnoozeMinutes: UserBucket;
  setPassword: Scalars['Boolean']['output'];
  shareBucket: EntityPermission;
  toggleOAuthProvider: OAuthProvider;
  /** Manually trigger a database backup */
  triggerBackup: Scalars['String']['output'];
  /** Manually trigger log cleanup based on retention policy */
  triggerLogCleanup: Scalars['Boolean']['output'];
  unshareBucket: Scalars['Boolean']['output'];
  updateAccessToken: AccessTokenListDto;
  updateBucket: Bucket;
  /** @deprecated Usa future Bucket mutation (updateBucketSnoozes) */
  updateBucketSnoozes: UserBucket;
  updateDeviceToken: UserDevice;
  /** Update an invite code */
  updateInviteCode: InviteCode;
  updateOAuthProvider: OAuthProvider;
  updatePayloadMapper: PayloadMapper;
  updateProfile: User;
  updateReceivedNotifications: UpdateReceivedResult;
  /** Update an existing server setting */
  updateServerSetting: ServerSetting;
  updateSystemToken: SystemAccessTokenDto;
  updateUserDevice: UserDevice;
  updateUserRole: User;
  updateWebhook: UserWebhook;
  upsertMyAdminSubscription: Array<Scalars['String']['output']>;
  upsertUserSetting: UserSetting;
  validateResetToken: Scalars['Boolean']['output'];
};


export type MutationApproveSystemAccessTokenRequestArgs = {
  id: Scalars['String']['input'];
  input?: InputMaybe<ApproveSystemAccessTokenRequestDto>;
};


export type MutationBatchUpdateServerSettingsArgs = {
  settings: Array<BatchUpdateSettingInput>;
};


export type MutationCancelPostponeArgs = {
  id: Scalars['String']['input'];
};


export type MutationChangePasswordArgs = {
  input: ChangePasswordInput;
};


export type MutationConfirmEmailArgs = {
  input: ConfirmEmailDto;
};


export type MutationCreateAccessTokenArgs = {
  input: CreateAccessTokenDto;
};


export type MutationCreateAccessTokenForBucketArgs = {
  bucketId: Scalars['String']['input'];
  name: Scalars['String']['input'];
};


export type MutationCreateBucketArgs = {
  input: CreateBucketDto;
};


export type MutationCreateInviteCodeArgs = {
  input: CreateInviteCodeInput;
};


export type MutationCreateMessageArgs = {
  input: CreateMessageDto;
};


export type MutationCreateOAuthProviderArgs = {
  input: CreateOAuthProviderDto;
};


export type MutationCreatePayloadMapperArgs = {
  input: CreatePayloadMapperDto;
};


export type MutationCreateSystemAccessTokenRequestArgs = {
  input: CreateSystemAccessTokenRequestDto;
};


export type MutationCreateSystemTokenArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  expiresAt?: InputMaybe<Scalars['String']['input']>;
  maxCalls: Scalars['Float']['input'];
  requesterId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationCreateWebhookArgs = {
  input: CreateWebhookDto;
};


export type MutationDeclineSystemAccessTokenRequestArgs = {
  id: Scalars['String']['input'];
  input?: InputMaybe<DeclineSystemAccessTokenRequestDto>;
};


export type MutationDeleteBackupArgs = {
  filename: Scalars['String']['input'];
};


export type MutationDeleteBucketArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteInviteCodeArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteNotificationArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteOAuthProviderArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeletePayloadMapperArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteWebhookArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeviceReportNotificationReceivedArgs = {
  id: Scalars['String']['input'];
};


export type MutationExecuteWebhookArgs = {
  id: Scalars['ID']['input'];
};


export type MutationGrantEntityPermissionArgs = {
  input: GrantEntityPermissionInput;
};


export type MutationLoginArgs = {
  input: LoginDto;
};


export type MutationMarkNotificationAsReadArgs = {
  id: Scalars['String']['input'];
};


export type MutationMarkNotificationAsReceivedArgs = {
  id: Scalars['String']['input'];
  userDeviceId: Scalars['String']['input'];
};


export type MutationMarkNotificationAsUnreadArgs = {
  id: Scalars['String']['input'];
};


export type MutationMassDeleteNotificationsArgs = {
  ids: Array<Scalars['String']['input']>;
};


export type MutationMassMarkNotificationsAsReadArgs = {
  ids: Array<Scalars['String']['input']>;
};


export type MutationMassMarkNotificationsAsUnreadArgs = {
  ids: Array<Scalars['String']['input']>;
};


export type MutationPostponeNotificationArgs = {
  input: PostponeNotificationDto;
};


export type MutationRedeemInviteCodeArgs = {
  input: RedeemInviteCodeInput;
};


export type MutationRefreshAccessTokenArgs = {
  refreshToken: Scalars['String']['input'];
};


export type MutationRegisterArgs = {
  input: RegisterDto;
};


export type MutationRegisterDeviceArgs = {
  input: RegisterDeviceDto;
};


export type MutationRemoveDeviceArgs = {
  deviceId: Scalars['String']['input'];
};


export type MutationRemoveDeviceByTokenArgs = {
  deviceToken: Scalars['String']['input'];
};


export type MutationRequestEmailConfirmationArgs = {
  input: RequestEmailConfirmationDto;
};


export type MutationRequestPasswordResetArgs = {
  input: RequestPasswordResetDto;
};


export type MutationResetPasswordArgs = {
  input: ResetPasswordDto;
};


export type MutationRevokeAccessTokenArgs = {
  tokenId: Scalars['String']['input'];
};


export type MutationRevokeEntityPermissionArgs = {
  input: RevokeEntityPermissionInput;
};


export type MutationRevokeSessionArgs = {
  sessionId: Scalars['String']['input'];
};


export type MutationRevokeSystemTokenArgs = {
  id: Scalars['String']['input'];
};


export type MutationSetBucketSnoozeArgs = {
  bucketId: Scalars['String']['input'];
  snoozeUntil?: InputMaybe<Scalars['String']['input']>;
};


export type MutationSetBucketSnoozeMinutesArgs = {
  bucketId: Scalars['String']['input'];
  input: SetBucketSnoozeMinutesInput;
};


export type MutationSetPasswordArgs = {
  input: ChangePasswordInput;
};


export type MutationShareBucketArgs = {
  input: GrantEntityPermissionInput;
};


export type MutationToggleOAuthProviderArgs = {
  id: Scalars['String']['input'];
};


export type MutationUnshareBucketArgs = {
  input: RevokeEntityPermissionInput;
};


export type MutationUpdateAccessTokenArgs = {
  input: UpdateAccessTokenDto;
  tokenId: Scalars['String']['input'];
};


export type MutationUpdateBucketArgs = {
  id: Scalars['String']['input'];
  input: UpdateBucketDto;
};


export type MutationUpdateBucketSnoozesArgs = {
  bucketId: Scalars['String']['input'];
  snoozes: Array<SnoozeScheduleInput>;
};


export type MutationUpdateDeviceTokenArgs = {
  input: UpdateDeviceTokenDto;
};


export type MutationUpdateInviteCodeArgs = {
  input: UpdateInviteCodeInput;
};


export type MutationUpdateOAuthProviderArgs = {
  id: Scalars['String']['input'];
  input: UpdateOAuthProviderDto;
};


export type MutationUpdatePayloadMapperArgs = {
  id: Scalars['String']['input'];
  input: UpdatePayloadMapperDto;
};


export type MutationUpdateProfileArgs = {
  input: UpdateProfileInput;
};


export type MutationUpdateReceivedNotificationsArgs = {
  id: Scalars['String']['input'];
};


export type MutationUpdateServerSettingArgs = {
  configType: ServerSettingType;
  input: UpdateServerSettingDto;
};


export type MutationUpdateSystemTokenArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  expiresAt?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  maxCalls?: InputMaybe<Scalars['Float']['input']>;
  requesterId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpdateUserDeviceArgs = {
  input: UpdateUserDeviceInput;
};


export type MutationUpdateUserRoleArgs = {
  input: UpdateUserRoleInput;
};


export type MutationUpdateWebhookArgs = {
  id: Scalars['ID']['input'];
  input: UpdateWebhookDto;
};


export type MutationUpsertMyAdminSubscriptionArgs = {
  eventTypes: Array<Scalars['String']['input']>;
};


export type MutationUpsertUserSettingArgs = {
  input: UpsertUserSettingInput;
};


export type MutationValidateResetTokenArgs = {
  resetToken: Scalars['String']['input'];
};

export type Notification = {
  __typename?: 'Notification';
  createdAt: Scalars['DateTime']['output'];
  error: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  message: Message;
  readAt: Maybe<Scalars['DateTime']['output']>;
  receivedAt: Maybe<Scalars['DateTime']['output']>;
  sentAt: Maybe<Scalars['DateTime']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  user: User;
  userDevice: Maybe<UserDevice>;
  userDeviceId: Maybe<Scalars['String']['output']>;
  userId: Scalars['String']['output'];
};

export type NotificationAction = {
  __typename?: 'NotificationAction';
  destructive: Maybe<Scalars['Boolean']['output']>;
  icon: Maybe<Scalars['String']['output']>;
  title: Maybe<Scalars['String']['output']>;
  type: NotificationActionType;
  value: Maybe<Scalars['String']['output']>;
};

export type NotificationActionDto = {
  destructive?: InputMaybe<Scalars['Boolean']['input']>;
  icon?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  type: NotificationActionType;
  value?: InputMaybe<Scalars['String']['input']>;
};

export enum NotificationActionType {
  BackgroundCall = 'BACKGROUND_CALL',
  Delete = 'DELETE',
  MarkAsRead = 'MARK_AS_READ',
  Navigate = 'NAVIGATE',
  OpenNotification = 'OPEN_NOTIFICATION',
  Postpone = 'POSTPONE',
  Snooze = 'SNOOZE',
  Webhook = 'WEBHOOK'
}

export type NotificationAttachmentDto = {
  attachmentUuid?: InputMaybe<Scalars['String']['input']>;
  mediaType: MediaType;
  name?: InputMaybe<Scalars['String']['input']>;
  saveOnServer?: InputMaybe<Scalars['Boolean']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
};

export enum NotificationDeliveryType {
  Critical = 'CRITICAL',
  Normal = 'NORMAL',
  Silent = 'SILENT'
}

export type NotificationPostpone = {
  __typename?: 'NotificationPostpone';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  message: Message;
  messageId: Scalars['String']['output'];
  notification: Notification;
  notificationId: Scalars['String']['output'];
  sendAt: Scalars['DateTime']['output'];
  updatedAt: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['String']['output'];
};

export type NotificationServiceInfo = {
  __typename?: 'NotificationServiceInfo';
  devicePlatform: DevicePlatform;
  service: NotificationServiceType;
};

/** Type of notification service (Push or Local) */
export enum NotificationServiceType {
  Local = 'LOCAL',
  Push = 'PUSH'
}

export type OAuthProvider = {
  __typename?: 'OAuthProvider';
  additionalConfig: Maybe<Scalars['String']['output']>;
  authorizationUrl: Maybe<Scalars['String']['output']>;
  callbackUrl: Maybe<Scalars['String']['output']>;
  clientId: Scalars['String']['output'];
  clientSecret: Scalars['String']['output'];
  color: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  iconUrl: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isEnabled: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  profileFields: Maybe<Array<Scalars['String']['output']>>;
  providerId: Scalars['String']['output'];
  scopes: Array<Scalars['String']['output']>;
  textColor: Maybe<Scalars['String']['output']>;
  tokenUrl: Maybe<Scalars['String']['output']>;
  type: OAuthProviderType;
  updatedAt: Scalars['DateTime']['output'];
  userInfoUrl: Maybe<Scalars['String']['output']>;
};

export type OAuthProviderPublicDto = {
  __typename?: 'OAuthProviderPublicDto';
  color: Maybe<Scalars['String']['output']>;
  iconUrl: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  providerId: Scalars['String']['output'];
  textColor: Maybe<Scalars['String']['output']>;
  type: OAuthProviderType;
};

/** Type of OAuth provider (GitHub, Google, or custom) */
export enum OAuthProviderType {
  Custom = 'CUSTOM',
  Github = 'GITHUB',
  Google = 'GOOGLE'
}

export type PaginatedLogs = {
  __typename?: 'PaginatedLogs';
  limit: Scalars['Int']['output'];
  logs: Array<Log>;
  page: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  totalPages: Scalars['Int']['output'];
};

export type PasswordResetResponseDto = {
  __typename?: 'PasswordResetResponseDto';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type PayloadMapper = {
  __typename?: 'PayloadMapper';
  builtInName: Maybe<PayloadMapperBuiltInType>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  jsEvalFn: Scalars['String']['output'];
  name: Scalars['String']['output'];
  requiredUserSettings: Maybe<Array<UserSettingType>>;
  updatedAt: Scalars['DateTime']['output'];
  user: Maybe<User>;
  userId: Maybe<Scalars['ID']['output']>;
};

/** Built-in payload mapper types */
export enum PayloadMapperBuiltInType {
  ZentikAtlasStatuspage = 'ZENTIK_ATLAS_STATUSPAGE',
  ZentikAuthentik = 'ZENTIK_AUTHENTIK',
  ZentikExpo = 'ZENTIK_EXPO',
  ZentikGithub = 'ZENTIK_GITHUB',
  ZentikInstatus = 'ZENTIK_INSTATUS',
  ZentikRailway = 'ZENTIK_RAILWAY',
  ZentikServarr = 'ZENTIK_SERVARR',
  ZentikStatusIo = 'ZENTIK_STATUS_IO'
}

/** Permission enum for bucket access */
export enum Permission {
  Admin = 'ADMIN',
  Delete = 'DELETE',
  Read = 'READ',
  Write = 'WRITE'
}

export type PostponeNotificationDto = {
  minutes: Scalars['Int']['input'];
  notificationId: Scalars['String']['input'];
};

export type PostponeResponseDto = {
  __typename?: 'PostponeResponseDto';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  notificationId: Scalars['String']['output'];
  sendAt: Scalars['DateTime']['output'];
};

export type PublicAppConfig = {
  __typename?: 'PublicAppConfig';
  emailEnabled: Scalars['Boolean']['output'];
  oauthProviders: Array<OAuthProviderPublicDto>;
  uploadEnabled: Scalars['Boolean']['output'];
};

export type Query = {
  __typename?: 'Query';
  allOAuthProviders: Array<OAuthProvider>;
  attachment: Attachment;
  bucket: Bucket;
  bucketPermissions: Array<EntityPermission>;
  buckets: Array<Bucket>;
  checkEmailStatus: EmailStatusResponseDto;
  enabledOAuthProviders: Array<OAuthProviderPublicDto>;
  entityExecution: Maybe<EntityExecution>;
  events: EventsResponseDto;
  getAccessToken: AccessTokenListDto;
  getAccessTokensForBucket: Array<AccessTokenListDto>;
  getBackendVersion: Scalars['String']['output'];
  /** Get the download URL for a specific backup file */
  getBackupDownloadUrl: Scalars['String']['output'];
  getEntityExecutions: Array<EntityExecution>;
  getResourcePermissions: Array<EntityPermission>;
  getSystemToken: Maybe<SystemAccessTokenDto>;
  getUserAccessTokens: Array<AccessTokenListDto>;
  getUserSessions: Array<SessionInfoDto>;
  healthcheck: Scalars['String']['output'];
  /** Get invite code by ID */
  inviteCode: InviteCode;
  /** Get invite codes for a resource */
  inviteCodesForResource: Array<InviteCode>;
  /** List all available database backups */
  listBackups: Array<BackupInfoDto>;
  listSystemTokens: Array<SystemAccessTokenDto>;
  /** Get logs with pagination and filtering */
  logs: PaginatedLogs;
  me: User;
  messageAttachments: Array<Attachment>;
  myAdminSubscription: Maybe<Array<Scalars['String']['output']>>;
  mySystemAccessTokenRequests: Array<SystemAccessTokenRequest>;
  notification: Notification;
  notificationServices: Array<NotificationServiceInfo>;
  notifications: Array<Notification>;
  oauthProvider: OAuthProvider;
  payloadMapper: PayloadMapper;
  payloadMappers: Array<PayloadMapper>;
  pendingPostpones: Array<NotificationPostpone>;
  publicAppConfig: PublicAppConfig;
  /** Get a specific server setting by type */
  serverSetting: Maybe<ServerSetting>;
  /** Get all server settings */
  serverSettings: Array<ServerSetting>;
  systemAccessTokenRequests: Array<SystemAccessTokenRequest>;
  /** Get total log count */
  totalLogCount: Scalars['Float']['output'];
  user: User;
  userAttachments: Array<Attachment>;
  userDevice: Maybe<UserDevice>;
  userDevices: Array<UserDevice>;
  userNotificationStats: UserNotificationStats;
  userSettings: Array<UserSetting>;
  userWebhooks: Array<UserWebhook>;
  users: Array<User>;
  webhook: UserWebhook;
};


export type QueryAttachmentArgs = {
  id: Scalars['ID']['input'];
};


export type QueryBucketArgs = {
  id: Scalars['String']['input'];
};


export type QueryBucketPermissionsArgs = {
  bucketId: Scalars['String']['input'];
};


export type QueryCheckEmailStatusArgs = {
  email: Scalars['String']['input'];
};


export type QueryEntityExecutionArgs = {
  id: Scalars['String']['input'];
};


export type QueryEventsArgs = {
  query: EventsQueryDto;
};


export type QueryGetAccessTokenArgs = {
  tokenId: Scalars['String']['input'];
};


export type QueryGetAccessTokensForBucketArgs = {
  bucketId: Scalars['String']['input'];
};


export type QueryGetBackupDownloadUrlArgs = {
  filename: Scalars['String']['input'];
};


export type QueryGetEntityExecutionsArgs = {
  input: GetEntityExecutionsInput;
};


export type QueryGetResourcePermissionsArgs = {
  input: GetResourcePermissionsInput;
};


export type QueryGetSystemTokenArgs = {
  id: Scalars['String']['input'];
};


export type QueryInviteCodeArgs = {
  id: Scalars['String']['input'];
};


export type QueryInviteCodesForResourceArgs = {
  resourceId: Scalars['String']['input'];
  resourceType: Scalars['String']['input'];
};


export type QueryLogsArgs = {
  input: GetLogsInput;
};


export type QueryMessageAttachmentsArgs = {
  messageId: Scalars['ID']['input'];
};


export type QueryNotificationArgs = {
  id: Scalars['String']['input'];
};


export type QueryOauthProviderArgs = {
  id: Scalars['String']['input'];
};


export type QueryPayloadMapperArgs = {
  id: Scalars['String']['input'];
};


export type QueryServerSettingArgs = {
  configType: ServerSettingType;
};


export type QueryUserArgs = {
  id: Scalars['String']['input'];
};


export type QueryUserAttachmentsArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryUserNotificationStatsArgs = {
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryUserSettingsArgs = {
  deviceId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryWebhookArgs = {
  id: Scalars['ID']['input'];
};

export type RedeemInviteCodeInput = {
  /** Invite code to redeem */
  code: Scalars['String']['input'];
};

export type RefreshTokenResponse = {
  __typename?: 'RefreshTokenResponse';
  accessToken: Scalars['String']['output'];
  message: Maybe<Scalars['String']['output']>;
  refreshToken: Scalars['String']['output'];
};

export type RegisterDeviceDto = {
  deviceId?: InputMaybe<Scalars['String']['input']>;
  deviceModel?: InputMaybe<Scalars['String']['input']>;
  deviceName?: InputMaybe<Scalars['String']['input']>;
  deviceToken?: InputMaybe<Scalars['String']['input']>;
  onlyLocal?: InputMaybe<Scalars['Boolean']['input']>;
  osVersion?: InputMaybe<Scalars['String']['input']>;
  platform: DevicePlatform;
  publicKey?: InputMaybe<Scalars['String']['input']>;
  subscriptionFields?: InputMaybe<WebPushSubscriptionFieldsInput>;
};

export type RegisterDto = {
  email: Scalars['String']['input'];
  firstName?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  locale?: InputMaybe<Scalars['String']['input']>;
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};

export type RegisterResponse = {
  __typename?: 'RegisterResponse';
  accessToken: Maybe<Scalars['String']['output']>;
  emailConfirmationRequired: Scalars['Boolean']['output'];
  message: Scalars['String']['output'];
  refreshToken: Maybe<Scalars['String']['output']>;
  user: User;
};

export type RequestEmailConfirmationDto = {
  email: Scalars['String']['input'];
  locale?: InputMaybe<Scalars['String']['input']>;
};

export type RequestPasswordResetDto = {
  email: Scalars['String']['input'];
  locale?: InputMaybe<Scalars['String']['input']>;
};

export type ResetPasswordDto = {
  newPassword: Scalars['String']['input'];
  resetToken: Scalars['String']['input'];
};

/** Type of resource for permissions */
export enum ResourceType {
  Bucket = 'BUCKET',
  UserWebhook = 'USER_WEBHOOK'
}

export type RevokeEntityPermissionInput = {
  resourceId: Scalars['String']['input'];
  resourceType: ResourceType;
  userEmail?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
  username?: InputMaybe<Scalars['String']['input']>;
};

export type ServerSetting = {
  __typename?: 'ServerSetting';
  configType: ServerSettingType;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** Possible values for the setting (for enum-like settings) */
  possibleValues: Maybe<Array<Scalars['String']['output']>>;
  updatedAt: Scalars['DateTime']['output'];
  /** Boolean value for the setting, when applicable */
  valueBool: Maybe<Scalars['Boolean']['output']>;
  /** Numeric value for the setting, when applicable */
  valueNumber: Maybe<Scalars['Float']['output']>;
  /** String value for the setting, when applicable */
  valueText: Maybe<Scalars['String']['output']>;
};

export enum ServerSettingType {
  ApnBundleId = 'ApnBundleId',
  ApnKeyId = 'ApnKeyId',
  ApnPrivateKeyPath = 'ApnPrivateKeyPath',
  ApnProduction = 'ApnProduction',
  ApnPush = 'ApnPush',
  ApnTeamId = 'ApnTeamId',
  AttachmentsAllowedMimeTypes = 'AttachmentsAllowedMimeTypes',
  AttachmentsDeleteJobEnabled = 'AttachmentsDeleteJobEnabled',
  AttachmentsEnabled = 'AttachmentsEnabled',
  AttachmentsMaxAge = 'AttachmentsMaxAge',
  AttachmentsMaxFileSize = 'AttachmentsMaxFileSize',
  AttachmentsStoragePath = 'AttachmentsStoragePath',
  BackupCronJob = 'BackupCronJob',
  BackupEnabled = 'BackupEnabled',
  BackupExecuteOnStart = 'BackupExecuteOnStart',
  BackupMaxToKeep = 'BackupMaxToKeep',
  BackupStoragePath = 'BackupStoragePath',
  CorsCredentials = 'CorsCredentials',
  CorsOrigin = 'CorsOrigin',
  EmailEnabled = 'EmailEnabled',
  EmailFrom = 'EmailFrom',
  EmailFromName = 'EmailFromName',
  EmailHost = 'EmailHost',
  EmailPass = 'EmailPass',
  EmailPort = 'EmailPort',
  EmailSecure = 'EmailSecure',
  EmailType = 'EmailType',
  EmailUser = 'EmailUser',
  FirebaseClientEmail = 'FirebaseClientEmail',
  FirebasePrivateKey = 'FirebasePrivateKey',
  FirebaseProjectId = 'FirebaseProjectId',
  FirebasePush = 'FirebasePush',
  JwtAccessTokenExpiration = 'JwtAccessTokenExpiration',
  JwtRefreshSecret = 'JwtRefreshSecret',
  JwtRefreshTokenExpiration = 'JwtRefreshTokenExpiration',
  JwtSecret = 'JwtSecret',
  LogLevel = 'LogLevel',
  LogRetentionDays = 'LogRetentionDays',
  LogStorageEnabled = 'LogStorageEnabled',
  MessagesDeleteJobEnabled = 'MessagesDeleteJobEnabled',
  MessagesMaxAge = 'MessagesMaxAge',
  PrometheusEnabled = 'PrometheusEnabled',
  PushNotificationsPassthroughServer = 'PushNotificationsPassthroughServer',
  PushPassthroughToken = 'PushPassthroughToken',
  RateLimitBlockMs = 'RateLimitBlockMs',
  RateLimitForwardHeader = 'RateLimitForwardHeader',
  RateLimitLimit = 'RateLimitLimit',
  RateLimitMessagesRps = 'RateLimitMessagesRps',
  RateLimitMessagesTtlMs = 'RateLimitMessagesTtlMs',
  RateLimitTrustProxyEnabled = 'RateLimitTrustProxyEnabled',
  RateLimitTtlMs = 'RateLimitTtlMs',
  ResendApiKey = 'ResendApiKey',
  VapidSubject = 'VapidSubject',
  WebPush = 'WebPush'
}

export type SessionInfoDto = {
  __typename?: 'SessionInfoDto';
  browser: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  deviceName: Maybe<Scalars['String']['output']>;
  expiresAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  ipAddress: Maybe<Scalars['String']['output']>;
  isActive: Scalars['Boolean']['output'];
  isCurrent: Scalars['Boolean']['output'];
  lastActivity: Scalars['DateTime']['output'];
  location: Maybe<Scalars['String']['output']>;
  loginProvider: Maybe<Scalars['String']['output']>;
  operatingSystem: Maybe<Scalars['String']['output']>;
};

export type SetBucketSnoozeMinutesInput = {
  minutes: Scalars['Float']['input'];
};

export type SnoozeSchedule = {
  __typename?: 'SnoozeSchedule';
  days: Array<Scalars['String']['output']>;
  isEnabled: Scalars['Boolean']['output'];
  timeFrom: Scalars['String']['output'];
  timeTill: Scalars['String']['output'];
};

export type SnoozeScheduleInput = {
  days: Array<Scalars['String']['input']>;
  isEnabled: Scalars['Boolean']['input'];
  timeFrom: Scalars['String']['input'];
  timeTill: Scalars['String']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  bucketCreated: Bucket;
  bucketDeleted: Scalars['String']['output'];
  bucketUpdated: Bucket;
  entityPermissionUpdated: EntityPermission;
  notificationCreated: Notification;
  notificationDeleted: Scalars['String']['output'];
  notificationUpdated: Notification;
  userBucketUpdated: UserBucket;
  userPasswordChanged: Scalars['Boolean']['output'];
  userProfileUpdated: User;
};


export type SubscriptionEntityPermissionUpdatedArgs = {
  bucketId?: InputMaybe<Scalars['String']['input']>;
};


export type SubscriptionUserBucketUpdatedArgs = {
  bucketId?: InputMaybe<Scalars['String']['input']>;
};

export type SystemAccessToken = {
  __typename?: 'SystemAccessToken';
  calls: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  description: Maybe<Scalars['String']['output']>;
  expiresAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['String']['output'];
  maxCalls: Scalars['Float']['output'];
  requester: Maybe<User>;
  requesterId: Maybe<Scalars['String']['output']>;
  tokenHash: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type SystemAccessTokenDto = {
  __typename?: 'SystemAccessTokenDto';
  calls: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  description: Maybe<Scalars['String']['output']>;
  expiresAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['String']['output'];
  maxCalls: Scalars['Float']['output'];
  rawToken: Maybe<Scalars['String']['output']>;
  requester: Maybe<User>;
  updatedAt: Scalars['DateTime']['output'];
};

export type SystemAccessTokenRequest = {
  __typename?: 'SystemAccessTokenRequest';
  createdAt: Scalars['DateTime']['output'];
  description: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  maxRequests: Scalars['Float']['output'];
  plainTextToken: Maybe<Scalars['String']['output']>;
  status: SystemAccessTokenRequestStatus;
  systemAccessToken: Maybe<SystemAccessToken>;
  systemAccessTokenId: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['String']['output'];
};

/** Status of a system access token request */
export enum SystemAccessTokenRequestStatus {
  Approved = 'APPROVED',
  Declined = 'DECLINED',
  Pending = 'PENDING'
}

export type UpdateAccessTokenDto = {
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  name: Scalars['String']['input'];
  scopes?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UpdateBucketDto = {
  color?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  generateIconWithInitials?: InputMaybe<Scalars['Boolean']['input']>;
  icon?: InputMaybe<Scalars['String']['input']>;
  isProtected?: InputMaybe<Scalars['Boolean']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateDeviceTokenDto = {
  newDeviceToken: Scalars['String']['input'];
  oldDeviceToken: Scalars['String']['input'];
};

export type UpdateInviteCodeInput = {
  /** Expiration date (ISO string) */
  expiresAt?: InputMaybe<Scalars['String']['input']>;
  /** Invite code ID */
  id: Scalars['String']['input'];
  /** Maximum number of uses */
  maxUses?: InputMaybe<Scalars['Int']['input']>;
  /** Permissions to grant */
  permissions?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UpdateOAuthProviderDto = {
  additionalConfig?: InputMaybe<Scalars['String']['input']>;
  authorizationUrl?: InputMaybe<Scalars['String']['input']>;
  callbackUrl?: InputMaybe<Scalars['String']['input']>;
  clientId?: InputMaybe<Scalars['String']['input']>;
  clientSecret?: InputMaybe<Scalars['String']['input']>;
  color?: InputMaybe<Scalars['String']['input']>;
  iconUrl?: InputMaybe<Scalars['String']['input']>;
  isEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  profileFields?: InputMaybe<Array<Scalars['String']['input']>>;
  providerId?: InputMaybe<Scalars['String']['input']>;
  scopes?: InputMaybe<Array<Scalars['String']['input']>>;
  textColor?: InputMaybe<Scalars['String']['input']>;
  tokenUrl?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<OAuthProviderType>;
  userInfoUrl?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePayloadMapperDto = {
  jsEvalFn?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  requiredUserSettings?: InputMaybe<Array<UserSettingType>>;
};

export type UpdateProfileInput = {
  avatar?: InputMaybe<Scalars['String']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateReceivedResult = {
  __typename?: 'UpdateReceivedResult';
  success: Scalars['Boolean']['output'];
  updatedCount: Scalars['Float']['output'];
};

export type UpdateServerSettingDto = {
  valueBool?: InputMaybe<Scalars['Boolean']['input']>;
  valueNumber?: InputMaybe<Scalars['Float']['input']>;
  valueText?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateUserDeviceInput = {
  deviceId: Scalars['String']['input'];
  deviceModel?: InputMaybe<Scalars['String']['input']>;
  deviceName?: InputMaybe<Scalars['String']['input']>;
  deviceToken?: InputMaybe<Scalars['String']['input']>;
  osVersion?: InputMaybe<Scalars['String']['input']>;
  subscriptionFields?: InputMaybe<WebPushSubscriptionFieldsInput>;
};

export type UpdateUserRoleInput = {
  role: UserRole;
  userId: Scalars['String']['input'];
};

export type UpdateWebhookDto = {
  body?: InputMaybe<Scalars['JSON']['input']>;
  headers?: InputMaybe<Array<WebhookHeaderDto>>;
  method?: InputMaybe<HttpMethod>;
  name?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
};

export type UpsertUserSettingInput = {
  configType: UserSettingType;
  deviceId?: InputMaybe<Scalars['String']['input']>;
  valueBool?: InputMaybe<Scalars['Boolean']['input']>;
  valueText?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
  __typename?: 'User';
  accessTokens: Maybe<Array<UserAccessToken>>;
  avatar: Maybe<Scalars['String']['output']>;
  buckets: Maybe<Array<Bucket>>;
  createdAt: Scalars['DateTime']['output'];
  devices: Maybe<Array<UserDevice>>;
  email: Scalars['String']['output'];
  emailConfirmationToken: Maybe<Scalars['String']['output']>;
  emailConfirmationTokenRequestedAt: Maybe<Scalars['DateTime']['output']>;
  emailConfirmed: Scalars['Boolean']['output'];
  firstName: Maybe<Scalars['String']['output']>;
  hasPassword: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  identities: Maybe<Array<UserIdentity>>;
  lastName: Maybe<Scalars['String']['output']>;
  resetToken: Maybe<Scalars['String']['output']>;
  resetTokenRequestedAt: Maybe<Scalars['DateTime']['output']>;
  role: UserRole;
  sessions: Maybe<Array<UserSession>>;
  updatedAt: Scalars['DateTime']['output'];
  userBuckets: Maybe<Array<UserBucket>>;
  username: Scalars['String']['output'];
  webhooks: Maybe<Array<UserWebhook>>;
};

export type UserAccessToken = {
  __typename?: 'UserAccessToken';
  createdAt: Scalars['DateTime']['output'];
  expiresAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['String']['output'];
  isExpired: Scalars['Boolean']['output'];
  lastUsed: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  scopes: Maybe<Array<Scalars['String']['output']>>;
  token: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['String']['output'];
};

export type UserBucket = {
  __typename?: 'UserBucket';
  bucket: Bucket;
  bucketId: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  snoozeUntil: Maybe<Scalars['DateTime']['output']>;
  snoozes: Maybe<Array<SnoozeSchedule>>;
  updatedAt: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['String']['output'];
};

export type UserDevice = {
  __typename?: 'UserDevice';
  createdAt: Scalars['DateTime']['output'];
  deviceModel: Maybe<Scalars['String']['output']>;
  deviceName: Maybe<Scalars['String']['output']>;
  deviceToken: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  lastUsed: Scalars['DateTime']['output'];
  onlyLocal: Scalars['Boolean']['output'];
  osVersion: Maybe<Scalars['String']['output']>;
  platform: Scalars['String']['output'];
  privateKey: Maybe<Scalars['String']['output']>;
  publicKey: Maybe<Scalars['String']['output']>;
  subscriptionFields: Maybe<WebPushSubscriptionFields>;
  updatedAt: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['String']['output'];
};

export type UserIdentity = {
  __typename?: 'UserIdentity';
  avatarUrl: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  email: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  provider: Scalars['String']['output'];
  providerId: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['String']['output'];
};

export type UserNotificationStats = {
  __typename?: 'UserNotificationStats';
  last7Days: Scalars['Float']['output'];
  last30Days: Scalars['Float']['output'];
  thisMonth: Scalars['Float']['output'];
  thisWeek: Scalars['Float']['output'];
  today: Scalars['Float']['output'];
  total: Scalars['Float']['output'];
};

/** User role enum */
export enum UserRole {
  Admin = 'ADMIN',
  Moderator = 'MODERATOR',
  User = 'USER'
}

export type UserSession = {
  __typename?: 'UserSession';
  browser: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  deviceName: Maybe<Scalars['String']['output']>;
  expiresAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  ipAddress: Maybe<Scalars['String']['output']>;
  isActive: Scalars['Boolean']['output'];
  lastActivity: Maybe<Scalars['DateTime']['output']>;
  loginProvider: Maybe<Scalars['String']['output']>;
  operatingSystem: Maybe<Scalars['String']['output']>;
  tokenId: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  user: User;
  userAgent: Maybe<Scalars['String']['output']>;
  userId: Scalars['String']['output'];
};

export type UserSetting = {
  __typename?: 'UserSetting';
  configType: UserSettingType;
  createdAt: Scalars['DateTime']['output'];
  device: Maybe<UserDevice>;
  deviceId: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  updatedAt: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['String']['output'];
  /** Boolean value for the setting, when applicable */
  valueBool: Maybe<Scalars['Boolean']['output']>;
  /** String value for the setting, when applicable */
  valueText: Maybe<Scalars['String']['output']>;
};

export enum UserSettingType {
  AutoAddDeleteAction = 'AutoAddDeleteAction',
  AutoAddMarkAsReadAction = 'AutoAddMarkAsReadAction',
  AutoAddOpenNotificationAction = 'AutoAddOpenNotificationAction',
  DefaultPostpones = 'DefaultPostpones',
  DefaultSnoozes = 'DefaultSnoozes',
  ExpoKey = 'ExpoKey',
  GithubEventsFilter = 'GithubEventsFilter',
  HomeassistantToken = 'HomeassistantToken',
  HomeassistantUrl = 'HomeassistantUrl',
  Language = 'Language',
  Timezone = 'Timezone',
  UnencryptOnBigPayload = 'UnencryptOnBigPayload'
}

export type UserWebhook = {
  __typename?: 'UserWebhook';
  body: Maybe<Scalars['JSON']['output']>;
  createdAt: Scalars['DateTime']['output'];
  headers: Array<WebhookHeader>;
  id: Scalars['ID']['output'];
  method: HttpMethod;
  name: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  url: Scalars['String']['output'];
  user: User;
};

export type WebPushSubscriptionFields = {
  __typename?: 'WebPushSubscriptionFields';
  auth: Maybe<Scalars['String']['output']>;
  endpoint: Maybe<Scalars['String']['output']>;
  p256dh: Maybe<Scalars['String']['output']>;
};

export type WebPushSubscriptionFieldsInput = {
  auth?: InputMaybe<Scalars['String']['input']>;
  endpoint?: InputMaybe<Scalars['String']['input']>;
  p256dh?: InputMaybe<Scalars['String']['input']>;
};

export type WebhookHeader = {
  __typename?: 'WebhookHeader';
  key: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type WebhookHeaderDto = {
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type RequestPasswordResetMutationVariables = Exact<{
  input: RequestPasswordResetDto;
}>;


export type RequestPasswordResetMutation = { __typename?: 'Mutation', requestPasswordReset: { __typename?: 'PasswordResetResponseDto', success: boolean, message: string } };

export type ValidateResetTokenMutationVariables = Exact<{
  resetToken: Scalars['String']['input'];
}>;


export type ValidateResetTokenMutation = { __typename?: 'Mutation', validateResetToken: boolean };

export type ResetPasswordMutationVariables = Exact<{
  input: ResetPasswordDto;
}>;


export type ResetPasswordMutation = { __typename?: 'Mutation', resetPassword: { __typename?: 'PasswordResetResponseDto', success: boolean, message: string } };

export type AttachmentFragment = { __typename?: 'Attachment', id: string, filename: string, originalFilename: string | null, size: number | null, filepath: string, mediaType: MediaType | null, createdAt: string, userId: string };

export type MessageAttachmentFragment = { __typename?: 'MessageAttachment', mediaType: MediaType, url: string | null, name: string | null, attachmentUuid: string | null, saveOnServer: boolean | null };

export type NotificationActionFragment = { __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null };

export type MessageFragment = { __typename?: 'Message', id: string, title: string, body: string | null, subtitle: string | null, sound: string | null, deliveryType: NotificationDeliveryType, locale: string | null, snoozes: Array<number> | null, createdAt: string, updatedAt: string, attachments: Array<{ __typename?: 'MessageAttachment', mediaType: MediaType, url: string | null, name: string | null, attachmentUuid: string | null, saveOnServer: boolean | null }> | null, tapAction: { __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null } | null, actions: Array<{ __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null }> | null, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } };

export type NotificationFragment = { __typename?: 'Notification', id: string, receivedAt: string | null, readAt: string | null, sentAt: string | null, createdAt: string, updatedAt: string, message: { __typename?: 'Message', id: string, title: string, body: string | null, subtitle: string | null, sound: string | null, deliveryType: NotificationDeliveryType, locale: string | null, snoozes: Array<number> | null, createdAt: string, updatedAt: string, attachments: Array<{ __typename?: 'MessageAttachment', mediaType: MediaType, url: string | null, name: string | null, attachmentUuid: string | null, saveOnServer: boolean | null }> | null, tapAction: { __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null } | null, actions: Array<{ __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null }> | null, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } };

export type BucketPermissionsFragment = { __typename?: 'BucketPermissionsDto', canWrite: boolean, canDelete: boolean, canAdmin: boolean, canRead: boolean, isOwner: boolean, isSharedWithMe: boolean, sharedCount: number };

export type BucketFragment = { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null };

export type BucketWithDevicesFragment = { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null }, permissions: Array<{ __typename?: 'EntityPermission', id: string, resourceType: string, resourceId: string, permissions: Array<Permission>, expiresAt: string | null, createdAt: string, updatedAt: string, inviteCodeId: string | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null }, grantedBy: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null } | null }>, userBucket: { __typename?: 'UserBucket', id: string, userId: string, bucketId: string, snoozeUntil: string | null, createdAt: string, updatedAt: string, snoozes: Array<{ __typename?: 'SnoozeSchedule', days: Array<string>, timeFrom: string, timeTill: string, isEnabled: boolean }> | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null }, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } | null, userPermissions: { __typename?: 'BucketPermissionsDto', canWrite: boolean, canDelete: boolean, canAdmin: boolean, canRead: boolean, isOwner: boolean, isSharedWithMe: boolean, sharedCount: number } };

export type BucketFullFragment = { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null }, messages: Array<{ __typename?: 'Message', id: string, title: string, body: string | null, subtitle: string | null, sound: string | null, deliveryType: NotificationDeliveryType, locale: string | null, snoozes: Array<number> | null, createdAt: string, updatedAt: string, attachments: Array<{ __typename?: 'MessageAttachment', mediaType: MediaType, url: string | null, name: string | null, attachmentUuid: string | null, saveOnServer: boolean | null }> | null, tapAction: { __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null } | null, actions: Array<{ __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null }> | null, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } }> | null, permissions: Array<{ __typename?: 'EntityPermission', id: string, resourceType: string, resourceId: string, permissions: Array<Permission>, expiresAt: string | null, createdAt: string, updatedAt: string, inviteCodeId: string | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null }, grantedBy: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null } | null }>, userBucket: { __typename?: 'UserBucket', id: string, userId: string, bucketId: string, snoozeUntil: string | null, createdAt: string, updatedAt: string, snoozes: Array<{ __typename?: 'SnoozeSchedule', days: Array<string>, timeFrom: string, timeTill: string, isEnabled: boolean }> | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null }, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } | null, userPermissions: { __typename?: 'BucketPermissionsDto', canWrite: boolean, canDelete: boolean, canAdmin: boolean, canRead: boolean, isOwner: boolean, isSharedWithMe: boolean, sharedCount: number } };

export type UserFragment = { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null };

export type UserDeviceFragment = { __typename?: 'UserDevice', id: string, deviceToken: string | null, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, lastUsed: string, createdAt: string, updatedAt: string, publicKey: string | null, privateKey: string | null, onlyLocal: boolean };

export type UserWebhookFragment = { __typename?: 'UserWebhook', id: string, name: string, method: HttpMethod, url: string, body: any | null, createdAt: string, updatedAt: string, headers: Array<{ __typename?: 'WebhookHeader', key: string, value: string }>, user: { __typename?: 'User', id: string } };

export type GetNotificationsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetNotificationsQuery = { __typename?: 'Query', notifications: Array<{ __typename?: 'Notification', id: string, receivedAt: string | null, readAt: string | null, sentAt: string | null, createdAt: string, updatedAt: string, message: { __typename?: 'Message', id: string, title: string, body: string | null, subtitle: string | null, sound: string | null, deliveryType: NotificationDeliveryType, locale: string | null, snoozes: Array<number> | null, createdAt: string, updatedAt: string, attachments: Array<{ __typename?: 'MessageAttachment', mediaType: MediaType, url: string | null, name: string | null, attachmentUuid: string | null, saveOnServer: boolean | null }> | null, tapAction: { __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null } | null, actions: Array<{ __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null }> | null, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } }> };

export type GetNotificationQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetNotificationQuery = { __typename?: 'Query', notification: { __typename?: 'Notification', id: string, receivedAt: string | null, readAt: string | null, sentAt: string | null, createdAt: string, updatedAt: string, message: { __typename?: 'Message', id: string, title: string, body: string | null, subtitle: string | null, sound: string | null, deliveryType: NotificationDeliveryType, locale: string | null, snoozes: Array<number> | null, createdAt: string, updatedAt: string, attachments: Array<{ __typename?: 'MessageAttachment', mediaType: MediaType, url: string | null, name: string | null, attachmentUuid: string | null, saveOnServer: boolean | null }> | null, tapAction: { __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null } | null, actions: Array<{ __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null }> | null, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } } };

export type CreateMessageMutationVariables = Exact<{
  input: CreateMessageDto;
}>;


export type CreateMessageMutation = { __typename?: 'Mutation', createMessage: { __typename?: 'Message', id: string, title: string, body: string | null, subtitle: string | null, sound: string | null, deliveryType: NotificationDeliveryType, locale: string | null, snoozes: Array<number> | null, createdAt: string, updatedAt: string, attachments: Array<{ __typename?: 'MessageAttachment', mediaType: MediaType, url: string | null, name: string | null, attachmentUuid: string | null, saveOnServer: boolean | null }> | null, tapAction: { __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null } | null, actions: Array<{ __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null }> | null, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } };

export type DeleteNotificationMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type DeleteNotificationMutation = { __typename?: 'Mutation', deleteNotification: boolean };

export type MarkNotificationAsReadMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type MarkNotificationAsReadMutation = { __typename?: 'Mutation', markNotificationAsRead: { __typename?: 'Notification', id: string, readAt: string | null, receivedAt: string | null } };

export type MarkNotificationAsUnreadMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type MarkNotificationAsUnreadMutation = { __typename?: 'Mutation', markNotificationAsUnread: { __typename?: 'Notification', id: string, readAt: string | null, receivedAt: string | null } };

export type MarkNotificationAsReceivedMutationVariables = Exact<{
  id: Scalars['String']['input'];
  userDeviceId: Scalars['String']['input'];
}>;


export type MarkNotificationAsReceivedMutation = { __typename?: 'Mutation', markNotificationAsReceived: { __typename?: 'Notification', id: string, receivedAt: string | null, userDeviceId: string | null, userDevice: { __typename?: 'UserDevice', id: string, platform: string, deviceToken: string | null, lastUsed: string, onlyLocal: boolean } | null } };

export type DeviceReportNotificationReceivedMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type DeviceReportNotificationReceivedMutation = { __typename?: 'Mutation', deviceReportNotificationReceived: { __typename?: 'Notification', id: string, receivedAt: string | null, userDeviceId: string | null, userDevice: { __typename?: 'UserDevice', id: string, platform: string, deviceToken: string | null, lastUsed: string, onlyLocal: boolean } | null } };

export type MarkAllNotificationsAsReadMutationVariables = Exact<{ [key: string]: never; }>;


export type MarkAllNotificationsAsReadMutation = { __typename?: 'Mutation', markAllNotificationsAsRead: { __typename?: 'MarkAllAsReadResult', updatedCount: number, success: boolean } };

export type MassDeleteNotificationsMutationVariables = Exact<{
  ids: Array<Scalars['String']['input']> | Scalars['String']['input'];
}>;


export type MassDeleteNotificationsMutation = { __typename?: 'Mutation', massDeleteNotifications: { __typename?: 'MassDeleteResult', deletedCount: number, success: boolean } };

export type MassMarkNotificationsAsReadMutationVariables = Exact<{
  ids: Array<Scalars['String']['input']> | Scalars['String']['input'];
}>;


export type MassMarkNotificationsAsReadMutation = { __typename?: 'Mutation', massMarkNotificationsAsRead: { __typename?: 'MassMarkResult', updatedCount: number, success: boolean } };

export type MassMarkNotificationsAsUnreadMutationVariables = Exact<{
  ids: Array<Scalars['String']['input']> | Scalars['String']['input'];
}>;


export type MassMarkNotificationsAsUnreadMutation = { __typename?: 'Mutation', massMarkNotificationsAsUnread: { __typename?: 'MassMarkResult', updatedCount: number, success: boolean } };

export type GetBucketsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetBucketsQuery = { __typename?: 'Query', buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null }, permissions: Array<{ __typename?: 'EntityPermission', id: string, resourceType: string, resourceId: string, permissions: Array<Permission>, expiresAt: string | null, createdAt: string, updatedAt: string, inviteCodeId: string | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null }, grantedBy: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null } | null }>, userBucket: { __typename?: 'UserBucket', id: string, userId: string, bucketId: string, snoozeUntil: string | null, createdAt: string, updatedAt: string, snoozes: Array<{ __typename?: 'SnoozeSchedule', days: Array<string>, timeFrom: string, timeTill: string, isEnabled: boolean }> | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null }, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } | null, userPermissions: { __typename?: 'BucketPermissionsDto', canWrite: boolean, canDelete: boolean, canAdmin: boolean, canRead: boolean, isOwner: boolean, isSharedWithMe: boolean, sharedCount: number } }> };

export type GetBucketQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetBucketQuery = { __typename?: 'Query', bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null }, messages: Array<{ __typename?: 'Message', id: string, title: string, body: string | null, subtitle: string | null, sound: string | null, deliveryType: NotificationDeliveryType, locale: string | null, snoozes: Array<number> | null, createdAt: string, updatedAt: string, attachments: Array<{ __typename?: 'MessageAttachment', mediaType: MediaType, url: string | null, name: string | null, attachmentUuid: string | null, saveOnServer: boolean | null }> | null, tapAction: { __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null } | null, actions: Array<{ __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null }> | null, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } }> | null, permissions: Array<{ __typename?: 'EntityPermission', id: string, resourceType: string, resourceId: string, permissions: Array<Permission>, expiresAt: string | null, createdAt: string, updatedAt: string, inviteCodeId: string | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null }, grantedBy: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null } | null }>, userBucket: { __typename?: 'UserBucket', id: string, userId: string, bucketId: string, snoozeUntil: string | null, createdAt: string, updatedAt: string, snoozes: Array<{ __typename?: 'SnoozeSchedule', days: Array<string>, timeFrom: string, timeTill: string, isEnabled: boolean }> | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null }, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } | null, userPermissions: { __typename?: 'BucketPermissionsDto', canWrite: boolean, canDelete: boolean, canAdmin: boolean, canRead: boolean, isOwner: boolean, isSharedWithMe: boolean, sharedCount: number } } };

export type CreateBucketMutationVariables = Exact<{
  input: CreateBucketDto;
}>;


export type CreateBucketMutation = { __typename?: 'Mutation', createBucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null }, permissions: Array<{ __typename?: 'EntityPermission', id: string, resourceType: string, resourceId: string, permissions: Array<Permission>, expiresAt: string | null, createdAt: string, updatedAt: string, inviteCodeId: string | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null }, grantedBy: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null } | null }>, userBucket: { __typename?: 'UserBucket', id: string, userId: string, bucketId: string, snoozeUntil: string | null, createdAt: string, updatedAt: string, snoozes: Array<{ __typename?: 'SnoozeSchedule', days: Array<string>, timeFrom: string, timeTill: string, isEnabled: boolean }> | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null }, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } | null, userPermissions: { __typename?: 'BucketPermissionsDto', canWrite: boolean, canDelete: boolean, canAdmin: boolean, canRead: boolean, isOwner: boolean, isSharedWithMe: boolean, sharedCount: number } } };

export type UpdateReceivedNotificationsMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type UpdateReceivedNotificationsMutation = { __typename?: 'Mutation', updateReceivedNotifications: { __typename?: 'UpdateReceivedResult', updatedCount: number, success: boolean } };

export type UpdateBucketMutationVariables = Exact<{
  id: Scalars['String']['input'];
  input: UpdateBucketDto;
}>;


export type UpdateBucketMutation = { __typename?: 'Mutation', updateBucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null }, permissions: Array<{ __typename?: 'EntityPermission', id: string, resourceType: string, resourceId: string, permissions: Array<Permission>, expiresAt: string | null, createdAt: string, updatedAt: string, inviteCodeId: string | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null }, grantedBy: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null } | null }>, userBucket: { __typename?: 'UserBucket', id: string, userId: string, bucketId: string, snoozeUntil: string | null, createdAt: string, updatedAt: string, snoozes: Array<{ __typename?: 'SnoozeSchedule', days: Array<string>, timeFrom: string, timeTill: string, isEnabled: boolean }> | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null }, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } | null, userPermissions: { __typename?: 'BucketPermissionsDto', canWrite: boolean, canDelete: boolean, canAdmin: boolean, canRead: boolean, isOwner: boolean, isSharedWithMe: boolean, sharedCount: number } } };

export type DeleteBucketMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type DeleteBucketMutation = { __typename?: 'Mutation', deleteBucket: boolean };

export type BucketPermissionsQueryVariables = Exact<{
  bucketId: Scalars['String']['input'];
}>;


export type BucketPermissionsQuery = { __typename?: 'Query', bucketPermissions: Array<{ __typename?: 'EntityPermission', id: string, resourceType: string, resourceId: string, permissions: Array<Permission>, expiresAt: string | null, createdAt: string, updatedAt: string, inviteCodeId: string | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null }, grantedBy: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null } | null }> };

export type ShareBucketMutationVariables = Exact<{
  input: GrantEntityPermissionInput;
}>;


export type ShareBucketMutation = { __typename?: 'Mutation', shareBucket: { __typename?: 'EntityPermission', id: string, resourceType: string, resourceId: string, permissions: Array<Permission>, expiresAt: string | null, createdAt: string, updatedAt: string, inviteCodeId: string | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null }, grantedBy: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null } | null } };

export type UnshareBucketMutationVariables = Exact<{
  input: RevokeEntityPermissionInput;
}>;


export type UnshareBucketMutation = { __typename?: 'Mutation', unshareBucket: boolean };

export type InviteCodeFragment = { __typename?: 'InviteCode', id: string, code: string, resourceType: string, resourceId: string, createdBy: string, permissions: Array<string>, expiresAt: string | null, usageCount: number, maxUses: number | null, createdAt: string, updatedAt: string, creator: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null } };

export type InviteCodesForResourceQueryVariables = Exact<{
  resourceType: Scalars['String']['input'];
  resourceId: Scalars['String']['input'];
}>;


export type InviteCodesForResourceQuery = { __typename?: 'Query', inviteCodesForResource: Array<{ __typename?: 'InviteCode', id: string, code: string, resourceType: string, resourceId: string, createdBy: string, permissions: Array<string>, expiresAt: string | null, usageCount: number, maxUses: number | null, createdAt: string, updatedAt: string, creator: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null } }> };

export type CreateInviteCodeMutationVariables = Exact<{
  input: CreateInviteCodeInput;
}>;


export type CreateInviteCodeMutation = { __typename?: 'Mutation', createInviteCode: { __typename?: 'InviteCode', id: string, code: string, resourceType: string, resourceId: string, createdBy: string, permissions: Array<string>, expiresAt: string | null, usageCount: number, maxUses: number | null, createdAt: string, updatedAt: string, creator: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null } } };

export type UpdateInviteCodeMutationVariables = Exact<{
  input: UpdateInviteCodeInput;
}>;


export type UpdateInviteCodeMutation = { __typename?: 'Mutation', updateInviteCode: { __typename?: 'InviteCode', id: string, code: string, resourceType: string, resourceId: string, createdBy: string, permissions: Array<string>, expiresAt: string | null, usageCount: number, maxUses: number | null, createdAt: string, updatedAt: string, creator: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null } } };

export type DeleteInviteCodeMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type DeleteInviteCodeMutation = { __typename?: 'Mutation', deleteInviteCode: boolean };

export type RedeemInviteCodeMutationVariables = Exact<{
  input: RedeemInviteCodeInput;
}>;


export type RedeemInviteCodeMutation = { __typename?: 'Mutation', redeemInviteCode: { __typename?: 'InviteCodeRedemptionResult', success: boolean, error: string | null, resourceType: string | null, resourceId: string | null, permissions: Array<string> | null } };

export type GetMeQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMeQuery = { __typename?: 'Query', me: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, deviceToken: string | null, publicKey: string | null, privateKey: string | null }> | null, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null } };

export type UserSettingFragment = { __typename?: 'UserSetting', id: string, userId: string, deviceId: string | null, configType: UserSettingType, valueText: string | null, valueBool: boolean | null, createdAt: string, updatedAt: string };

export type GetUserSettingsQueryVariables = Exact<{
  deviceId?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetUserSettingsQuery = { __typename?: 'Query', userSettings: Array<{ __typename?: 'UserSetting', id: string, userId: string, deviceId: string | null, configType: UserSettingType, valueText: string | null, valueBool: boolean | null, createdAt: string, updatedAt: string }> };

export type UpsertUserSettingMutationVariables = Exact<{
  input: UpsertUserSettingInput;
}>;


export type UpsertUserSettingMutation = { __typename?: 'Mutation', upsertUserSetting: { __typename?: 'UserSetting', id: string, userId: string, deviceId: string | null, configType: UserSettingType, valueText: string | null, valueBool: boolean | null, createdAt: string, updatedAt: string } };

export type LoginMutationVariables = Exact<{
  input: LoginDto;
}>;


export type LoginMutation = { __typename?: 'Mutation', login: { __typename?: 'LoginResponse', accessToken: string, refreshToken: string, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null } } };

export type RegisterMutationVariables = Exact<{
  input: RegisterDto;
}>;


export type RegisterMutation = { __typename?: 'Mutation', register: { __typename?: 'RegisterResponse', message: string, emailConfirmationRequired: boolean, accessToken: string | null, refreshToken: string | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null } } };

export type LogoutMutationVariables = Exact<{ [key: string]: never; }>;


export type LogoutMutation = { __typename?: 'Mutation', logout: string };

export type RefreshAccessTokenMutationVariables = Exact<{
  refreshToken: Scalars['String']['input'];
}>;


export type RefreshAccessTokenMutation = { __typename?: 'Mutation', refreshAccessToken: { __typename?: 'RefreshTokenResponse', accessToken: string, refreshToken: string } };

export type UpdateProfileMutationVariables = Exact<{
  input: UpdateProfileInput;
}>;


export type UpdateProfileMutation = { __typename?: 'Mutation', updateProfile: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null } };

export type ChangePasswordMutationVariables = Exact<{
  input: ChangePasswordInput;
}>;


export type ChangePasswordMutation = { __typename?: 'Mutation', changePassword: boolean };

export type SetPasswordMutationVariables = Exact<{
  input: ChangePasswordInput;
}>;


export type SetPasswordMutation = { __typename?: 'Mutation', setPassword: boolean };

export type DeleteAccountMutationVariables = Exact<{ [key: string]: never; }>;


export type DeleteAccountMutation = { __typename?: 'Mutation', deleteAccount: boolean };

export type NotificationCreatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type NotificationCreatedSubscription = { __typename?: 'Subscription', notificationCreated: { __typename?: 'Notification', id: string, receivedAt: string | null, readAt: string | null, sentAt: string | null, createdAt: string, updatedAt: string, message: { __typename?: 'Message', id: string, title: string, body: string | null, subtitle: string | null, sound: string | null, deliveryType: NotificationDeliveryType, locale: string | null, snoozes: Array<number> | null, createdAt: string, updatedAt: string, attachments: Array<{ __typename?: 'MessageAttachment', mediaType: MediaType, url: string | null, name: string | null, attachmentUuid: string | null, saveOnServer: boolean | null }> | null, tapAction: { __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null } | null, actions: Array<{ __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null }> | null, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } } };

export type NotificationUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type NotificationUpdatedSubscription = { __typename?: 'Subscription', notificationUpdated: { __typename?: 'Notification', readAt: string | null, id: string, receivedAt: string | null, sentAt: string | null, createdAt: string, updatedAt: string, message: { __typename?: 'Message', id: string, title: string, body: string | null, subtitle: string | null, sound: string | null, deliveryType: NotificationDeliveryType, locale: string | null, snoozes: Array<number> | null, createdAt: string, updatedAt: string, attachments: Array<{ __typename?: 'MessageAttachment', mediaType: MediaType, url: string | null, name: string | null, attachmentUuid: string | null, saveOnServer: boolean | null }> | null, tapAction: { __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null } | null, actions: Array<{ __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null }> | null, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } } };

export type NotificationDeletedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type NotificationDeletedSubscription = { __typename?: 'Subscription', notificationDeleted: string };

export type BucketCreatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type BucketCreatedSubscription = { __typename?: 'Subscription', bucketCreated: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } };

export type BucketUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type BucketUpdatedSubscription = { __typename?: 'Subscription', bucketUpdated: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } };

export type BucketDeletedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type BucketDeletedSubscription = { __typename?: 'Subscription', bucketDeleted: string };

export type UserProfileUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type UserProfileUpdatedSubscription = { __typename?: 'Subscription', userProfileUpdated: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null } };

export type UserPasswordChangedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type UserPasswordChangedSubscription = { __typename?: 'Subscription', userPasswordChanged: boolean };

export type GetUserDevicesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserDevicesQuery = { __typename?: 'Query', userDevices: Array<{ __typename?: 'UserDevice', id: string, deviceToken: string | null, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, lastUsed: string, createdAt: string, updatedAt: string, publicKey: string | null, privateKey: string | null, onlyLocal: boolean }> };

export type GetUserDeviceQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserDeviceQuery = { __typename?: 'Query', userDevice: { __typename?: 'UserDevice', id: string, deviceToken: string | null, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, lastUsed: string, createdAt: string, updatedAt: string, publicKey: string | null, privateKey: string | null, onlyLocal: boolean } | null };

export type GetUserWebhooksQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserWebhooksQuery = { __typename?: 'Query', userWebhooks: Array<{ __typename?: 'UserWebhook', id: string, name: string, method: HttpMethod, url: string, body: any | null, createdAt: string, updatedAt: string, headers: Array<{ __typename?: 'WebhookHeader', key: string, value: string }>, user: { __typename?: 'User', id: string } }> };

export type GetWebhookQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetWebhookQuery = { __typename?: 'Query', webhook: { __typename?: 'UserWebhook', id: string, name: string, method: HttpMethod, url: string, body: any | null, createdAt: string, updatedAt: string, headers: Array<{ __typename?: 'WebhookHeader', key: string, value: string }>, user: { __typename?: 'User', id: string } } };

export type CreateWebhookMutationVariables = Exact<{
  input: CreateWebhookDto;
}>;


export type CreateWebhookMutation = { __typename?: 'Mutation', createWebhook: { __typename?: 'UserWebhook', id: string, name: string, method: HttpMethod, url: string, body: any | null, createdAt: string, updatedAt: string, headers: Array<{ __typename?: 'WebhookHeader', key: string, value: string }>, user: { __typename?: 'User', id: string } } };

export type UpdateWebhookMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateWebhookDto;
}>;


export type UpdateWebhookMutation = { __typename?: 'Mutation', updateWebhook: { __typename?: 'UserWebhook', id: string, name: string, method: HttpMethod, url: string, body: any | null, createdAt: string, updatedAt: string, headers: Array<{ __typename?: 'WebhookHeader', key: string, value: string }>, user: { __typename?: 'User', id: string } } };

export type DeleteWebhookMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteWebhookMutation = { __typename?: 'Mutation', deleteWebhook: boolean };

export type AccessTokenFragment = { __typename?: 'AccessTokenListDto', id: string, name: string, expiresAt: string | null, createdAt: string, lastUsed: string | null, isExpired: boolean, token: string | null, scopes: Array<string> | null };

export type AccessTokenResponseFragment = { __typename?: 'AccessTokenResponseDto', id: string, name: string, token: string, expiresAt: string | null, createdAt: string, tokenStored: boolean };

export type SessionInfoFragment = { __typename?: 'SessionInfoDto', id: string, deviceName: string | null, operatingSystem: string | null, browser: string | null, ipAddress: string | null, location: string | null, lastActivity: string, expiresAt: string, isCurrent: boolean, isActive: boolean, createdAt: string, loginProvider: string | null };

export type GetUserAccessTokensQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserAccessTokensQuery = { __typename?: 'Query', getUserAccessTokens: Array<{ __typename?: 'AccessTokenListDto', id: string, name: string, expiresAt: string | null, createdAt: string, lastUsed: string | null, isExpired: boolean, token: string | null, scopes: Array<string> | null }> };

export type GetUserSessionsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserSessionsQuery = { __typename?: 'Query', getUserSessions: Array<{ __typename?: 'SessionInfoDto', id: string, deviceName: string | null, operatingSystem: string | null, browser: string | null, ipAddress: string | null, location: string | null, lastActivity: string, expiresAt: string, isCurrent: boolean, isActive: boolean, createdAt: string, loginProvider: string | null }> };

export type CreateAccessTokenMutationVariables = Exact<{
  input: CreateAccessTokenDto;
}>;


export type CreateAccessTokenMutation = { __typename?: 'Mutation', createAccessToken: { __typename?: 'AccessTokenResponseDto', id: string, name: string, token: string, expiresAt: string | null, createdAt: string, tokenStored: boolean } };

export type RevokeAccessTokenMutationVariables = Exact<{
  tokenId: Scalars['String']['input'];
}>;


export type RevokeAccessTokenMutation = { __typename?: 'Mutation', revokeAccessToken: boolean };

export type RevokeAllAccessTokensMutationVariables = Exact<{ [key: string]: never; }>;


export type RevokeAllAccessTokensMutation = { __typename?: 'Mutation', revokeAllAccessTokens: boolean };

export type UpdateAccessTokenMutationVariables = Exact<{
  tokenId: Scalars['String']['input'];
  input: UpdateAccessTokenDto;
}>;


export type UpdateAccessTokenMutation = { __typename?: 'Mutation', updateAccessToken: { __typename?: 'AccessTokenListDto', id: string, name: string, expiresAt: string | null, createdAt: string, lastUsed: string | null, isExpired: boolean, token: string | null, scopes: Array<string> | null } };

export type GetAccessTokenQueryVariables = Exact<{
  tokenId: Scalars['String']['input'];
}>;


export type GetAccessTokenQuery = { __typename?: 'Query', getAccessToken: { __typename?: 'AccessTokenListDto', id: string, name: string, expiresAt: string | null, createdAt: string, lastUsed: string | null, isExpired: boolean, token: string | null, scopes: Array<string> | null } };

export type GetAccessTokensForBucketQueryVariables = Exact<{
  bucketId: Scalars['String']['input'];
}>;


export type GetAccessTokensForBucketQuery = { __typename?: 'Query', getAccessTokensForBucket: Array<{ __typename?: 'AccessTokenListDto', id: string, name: string, expiresAt: string | null, createdAt: string, lastUsed: string | null, isExpired: boolean, token: string | null, scopes: Array<string> | null }> };

export type CreateAccessTokenForBucketMutationVariables = Exact<{
  bucketId: Scalars['String']['input'];
  name: Scalars['String']['input'];
}>;


export type CreateAccessTokenForBucketMutation = { __typename?: 'Mutation', createAccessTokenForBucket: { __typename?: 'AccessTokenResponseDto', id: string, name: string, token: string, expiresAt: string | null, createdAt: string, tokenStored: boolean } };

export type RevokeSessionMutationVariables = Exact<{
  sessionId: Scalars['String']['input'];
}>;


export type RevokeSessionMutation = { __typename?: 'Mutation', revokeSession: boolean };

export type RevokeAllOtherSessionsMutationVariables = Exact<{ [key: string]: never; }>;


export type RevokeAllOtherSessionsMutation = { __typename?: 'Mutation', revokeAllOtherSessions: boolean };

export type RegisterDeviceMutationVariables = Exact<{
  input: RegisterDeviceDto;
}>;


export type RegisterDeviceMutation = { __typename?: 'Mutation', registerDevice: { __typename?: 'UserDevice', id: string, deviceToken: string | null, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, lastUsed: string, createdAt: string, updatedAt: string, publicKey: string | null, privateKey: string | null, onlyLocal: boolean } };

export type RemoveDeviceMutationVariables = Exact<{
  deviceId: Scalars['String']['input'];
}>;


export type RemoveDeviceMutation = { __typename?: 'Mutation', removeDevice: boolean };

export type RemoveDeviceByTokenMutationVariables = Exact<{
  deviceToken: Scalars['String']['input'];
}>;


export type RemoveDeviceByTokenMutation = { __typename?: 'Mutation', removeDeviceByToken: boolean };

export type UpdateDeviceTokenMutationVariables = Exact<{
  input: UpdateDeviceTokenDto;
}>;


export type UpdateDeviceTokenMutation = { __typename?: 'Mutation', updateDeviceToken: { __typename?: 'UserDevice', id: string, deviceName: string | null, deviceModel: string | null, deviceToken: string | null, platform: string, onlyLocal: boolean, updatedAt: string, createdAt: string } };

export type UpdateUserDeviceMutationVariables = Exact<{
  input: UpdateUserDeviceInput;
}>;


export type UpdateUserDeviceMutation = { __typename?: 'Mutation', updateUserDevice: { __typename?: 'UserDevice', id: string, deviceName: string | null, deviceModel: string | null, platform: string, onlyLocal: boolean, updatedAt: string, createdAt: string, subscriptionFields: { __typename?: 'WebPushSubscriptionFields', endpoint: string | null, p256dh: string | null, auth: string | null } | null } };

export type EntityPermissionFragment = { __typename?: 'EntityPermission', id: string, resourceType: string, resourceId: string, permissions: Array<Permission>, expiresAt: string | null, createdAt: string, updatedAt: string, inviteCodeId: string | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null }, grantedBy: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null } | null };

export type OAuthProviderPublicFragment = { __typename?: 'OAuthProviderPublicDto', id: string, name: string, providerId: string, type: OAuthProviderType, iconUrl: string | null, color: string | null, textColor: string | null };

export type OAuthProviderFragment = { __typename?: 'OAuthProvider', id: string, name: string, providerId: string, type: OAuthProviderType, clientId: string, clientSecret: string, scopes: Array<string>, iconUrl: string | null, color: string | null, textColor: string | null, isEnabled: boolean, authorizationUrl: string | null, tokenUrl: string | null, userInfoUrl: string | null, profileFields: Array<string> | null, additionalConfig: string | null, createdAt: string, updatedAt: string };

export type GetResourcePermissionsQueryVariables = Exact<{
  input: GetResourcePermissionsInput;
}>;


export type GetResourcePermissionsQuery = { __typename?: 'Query', getResourcePermissions: Array<{ __typename?: 'EntityPermission', id: string, resourceType: string, resourceId: string, permissions: Array<Permission>, expiresAt: string | null, createdAt: string, updatedAt: string, inviteCodeId: string | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null }, grantedBy: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null } | null }> };

export type GrantEntityPermissionMutationVariables = Exact<{
  input: GrantEntityPermissionInput;
}>;


export type GrantEntityPermissionMutation = { __typename?: 'Mutation', grantEntityPermission: { __typename?: 'EntityPermission', id: string, resourceType: string, resourceId: string, permissions: Array<Permission>, expiresAt: string | null, createdAt: string, updatedAt: string, inviteCodeId: string | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null }, grantedBy: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null } | null } };

export type RevokeEntityPermissionMutationVariables = Exact<{
  input: RevokeEntityPermissionInput;
}>;


export type RevokeEntityPermissionMutation = { __typename?: 'Mutation', revokeEntityPermission: boolean };

export type CleanupExpiredPermissionsMutationVariables = Exact<{ [key: string]: never; }>;


export type CleanupExpiredPermissionsMutation = { __typename?: 'Mutation', cleanupExpiredPermissions: number };

export type AllOAuthProvidersQueryVariables = Exact<{ [key: string]: never; }>;


export type AllOAuthProvidersQuery = { __typename?: 'Query', allOAuthProviders: Array<{ __typename?: 'OAuthProvider', id: string, name: string, providerId: string, type: OAuthProviderType, clientId: string, clientSecret: string, scopes: Array<string>, iconUrl: string | null, color: string | null, textColor: string | null, isEnabled: boolean, authorizationUrl: string | null, tokenUrl: string | null, userInfoUrl: string | null, profileFields: Array<string> | null, additionalConfig: string | null, createdAt: string, updatedAt: string }> };

export type OAuthProviderQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type OAuthProviderQuery = { __typename?: 'Query', oauthProvider: { __typename?: 'OAuthProvider', id: string, name: string, providerId: string, type: OAuthProviderType, clientId: string, clientSecret: string, scopes: Array<string>, iconUrl: string | null, color: string | null, textColor: string | null, isEnabled: boolean, authorizationUrl: string | null, tokenUrl: string | null, userInfoUrl: string | null, profileFields: Array<string> | null, additionalConfig: string | null, createdAt: string, updatedAt: string } };

export type CreateOAuthProviderMutationVariables = Exact<{
  input: CreateOAuthProviderDto;
}>;


export type CreateOAuthProviderMutation = { __typename?: 'Mutation', createOAuthProvider: { __typename?: 'OAuthProvider', id: string, name: string, providerId: string, type: OAuthProviderType, clientId: string, clientSecret: string, scopes: Array<string>, iconUrl: string | null, color: string | null, textColor: string | null, isEnabled: boolean, authorizationUrl: string | null, tokenUrl: string | null, userInfoUrl: string | null, profileFields: Array<string> | null, additionalConfig: string | null, createdAt: string, updatedAt: string } };

export type UpdateOAuthProviderMutationVariables = Exact<{
  id: Scalars['String']['input'];
  input: UpdateOAuthProviderDto;
}>;


export type UpdateOAuthProviderMutation = { __typename?: 'Mutation', updateOAuthProvider: { __typename?: 'OAuthProvider', id: string, name: string, providerId: string, type: OAuthProviderType, clientId: string, clientSecret: string, scopes: Array<string>, iconUrl: string | null, color: string | null, textColor: string | null, isEnabled: boolean, authorizationUrl: string | null, tokenUrl: string | null, userInfoUrl: string | null, profileFields: Array<string> | null, additionalConfig: string | null, createdAt: string, updatedAt: string } };

export type ToggleOAuthProviderMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type ToggleOAuthProviderMutation = { __typename?: 'Mutation', toggleOAuthProvider: { __typename?: 'OAuthProvider', id: string, name: string, providerId: string, type: OAuthProviderType, clientId: string, clientSecret: string, scopes: Array<string>, iconUrl: string | null, color: string | null, textColor: string | null, isEnabled: boolean, authorizationUrl: string | null, tokenUrl: string | null, userInfoUrl: string | null, profileFields: Array<string> | null, additionalConfig: string | null, createdAt: string, updatedAt: string } };

export type DeleteOAuthProviderMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type DeleteOAuthProviderMutation = { __typename?: 'Mutation', deleteOAuthProvider: boolean };

export type HealthcheckQueryVariables = Exact<{ [key: string]: never; }>;


export type HealthcheckQuery = { __typename?: 'Query', healthcheck: string };

export type GetBackendVersionQueryVariables = Exact<{ [key: string]: never; }>;


export type GetBackendVersionQuery = { __typename?: 'Query', getBackendVersion: string };

export type NotificationServiceInfoFragment = { __typename?: 'NotificationServiceInfo', devicePlatform: DevicePlatform, service: NotificationServiceType };

export type GetNotificationServicesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetNotificationServicesQuery = { __typename?: 'Query', notificationServices: Array<{ __typename?: 'NotificationServiceInfo', devicePlatform: DevicePlatform, service: NotificationServiceType }> };

export type UpdateUserRoleMutationVariables = Exact<{
  input: UpdateUserRoleInput;
}>;


export type UpdateUserRoleMutation = { __typename?: 'Mutation', updateUserRole: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null } };

export type UserBucketFragment = { __typename?: 'UserBucket', id: string, userId: string, bucketId: string, snoozeUntil: string | null, createdAt: string, updatedAt: string, snoozes: Array<{ __typename?: 'SnoozeSchedule', days: Array<string>, timeFrom: string, timeTill: string, isEnabled: boolean }> | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null }, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } };

export type SetBucketSnoozeMutationVariables = Exact<{
  bucketId: Scalars['String']['input'];
  snoozeUntil?: InputMaybe<Scalars['String']['input']>;
}>;


export type SetBucketSnoozeMutation = { __typename?: 'Mutation', setBucketSnooze: { __typename?: 'UserBucket', id: string, userId: string, bucketId: string, snoozeUntil: string | null, createdAt: string, updatedAt: string, snoozes: Array<{ __typename?: 'SnoozeSchedule', days: Array<string>, timeFrom: string, timeTill: string, isEnabled: boolean }> | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null }, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } };

export type UpdateBucketSnoozesMutationVariables = Exact<{
  bucketId: Scalars['String']['input'];
  snoozes: Array<SnoozeScheduleInput> | SnoozeScheduleInput;
}>;


export type UpdateBucketSnoozesMutation = { __typename?: 'Mutation', updateBucketSnoozes: { __typename?: 'UserBucket', id: string, userId: string, bucketId: string, snoozeUntil: string | null, createdAt: string, updatedAt: string, snoozes: Array<{ __typename?: 'SnoozeSchedule', days: Array<string>, timeFrom: string, timeTill: string, isEnabled: boolean }> | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null }, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } };

export type SystemAccessTokenFragment = { __typename?: 'SystemAccessTokenDto', id: string, maxCalls: number, calls: number, expiresAt: string | null, description: string | null, createdAt: string, updatedAt: string, requester: { __typename?: 'User', id: string, username: string, email: string, firstName: string | null, lastName: string | null } | null };

export type GetAllUsersQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllUsersQuery = { __typename?: 'Query', users: Array<{ __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null }> };

export type GetUserByIdQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetUserByIdQuery = { __typename?: 'Query', user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null } };

export type GetSystemAccessTokensQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSystemAccessTokensQuery = { __typename?: 'Query', listSystemTokens: Array<{ __typename?: 'SystemAccessTokenDto', id: string, maxCalls: number, calls: number, expiresAt: string | null, description: string | null, createdAt: string, updatedAt: string, requester: { __typename?: 'User', id: string, username: string, email: string, firstName: string | null, lastName: string | null } | null }> };

export type GetSystemTokenQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetSystemTokenQuery = { __typename?: 'Query', getSystemToken: { __typename?: 'SystemAccessTokenDto', id: string, maxCalls: number, calls: number, expiresAt: string | null, description: string | null, createdAt: string, updatedAt: string, requester: { __typename?: 'User', id: string, username: string, email: string, firstName: string | null, lastName: string | null } | null } | null };

export type CreateSystemAccessTokenMutationVariables = Exact<{
  maxCalls: Scalars['Float']['input'];
  expiresAt?: InputMaybe<Scalars['String']['input']>;
  requesterId?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
}>;


export type CreateSystemAccessTokenMutation = { __typename?: 'Mutation', createSystemToken: { __typename?: 'SystemAccessTokenDto', rawToken: string | null, id: string, maxCalls: number, calls: number, expiresAt: string | null, description: string | null, createdAt: string, updatedAt: string, requester: { __typename?: 'User', id: string, username: string, email: string, firstName: string | null, lastName: string | null } | null } };

export type UpdateSystemAccessTokenMutationVariables = Exact<{
  id: Scalars['String']['input'];
  maxCalls?: InputMaybe<Scalars['Float']['input']>;
  expiresAt?: InputMaybe<Scalars['String']['input']>;
  requesterId?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
}>;


export type UpdateSystemAccessTokenMutation = { __typename?: 'Mutation', updateSystemToken: { __typename?: 'SystemAccessTokenDto', id: string, maxCalls: number, calls: number, expiresAt: string | null, description: string | null, createdAt: string, updatedAt: string, requester: { __typename?: 'User', id: string, username: string, email: string, firstName: string | null, lastName: string | null } | null } };

export type RevokeSystemAccessTokenMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type RevokeSystemAccessTokenMutation = { __typename?: 'Mutation', revokeSystemToken: boolean };

export type RequestEmailConfirmationMutationVariables = Exact<{
  input: RequestEmailConfirmationDto;
}>;


export type RequestEmailConfirmationMutation = { __typename?: 'Mutation', requestEmailConfirmation: { __typename?: 'EmailConfirmationResponseDto', success: boolean, message: string } };

export type ConfirmEmailMutationVariables = Exact<{
  input: ConfirmEmailDto;
}>;


export type ConfirmEmailMutation = { __typename?: 'Mutation', confirmEmail: { __typename?: 'EmailConfirmationResponseDto', success: boolean, message: string } };

export type PublicAppConfigQueryVariables = Exact<{ [key: string]: never; }>;


export type PublicAppConfigQuery = { __typename?: 'Query', publicAppConfig: { __typename?: 'PublicAppConfig', emailEnabled: boolean, uploadEnabled: boolean, oauthProviders: Array<{ __typename?: 'OAuthProviderPublicDto', id: string, name: string, providerId: string, type: OAuthProviderType, iconUrl: string | null, color: string | null, textColor: string | null }> } };

export type EventFragment = { __typename?: 'Event', id: string, type: EventType, userId: string | null, objectId: string | null, createdAt: string, targetId: string | null };

export type GetEventsPaginatedQueryVariables = Exact<{
  query: EventsQueryDto;
}>;


export type GetEventsPaginatedQuery = { __typename?: 'Query', events: { __typename?: 'EventsResponseDto', total: number, page: number, limit: number, totalPages: number, hasNextPage: boolean, hasPreviousPage: boolean, events: Array<{ __typename?: 'Event', id: string, type: EventType, userId: string | null, objectId: string | null, createdAt: string, targetId: string | null }> } };

export type UserNotificationStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type UserNotificationStatsQuery = { __typename?: 'Query', userNotificationStats: { __typename?: 'UserNotificationStats', today: number, thisWeek: number, last7Days: number, thisMonth: number, last30Days: number, total: number } };

export type UserNotificationStatsByUserIdQueryVariables = Exact<{
  userId: Scalars['String']['input'];
}>;


export type UserNotificationStatsByUserIdQuery = { __typename?: 'Query', userNotificationStats: { __typename?: 'UserNotificationStats', today: number, thisWeek: number, last7Days: number, thisMonth: number, last30Days: number, total: number } };

export type ExecuteWebhookMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ExecuteWebhookMutation = { __typename?: 'Mutation', executeWebhook: boolean };

export type SetBucketSnoozeMinutesMutationVariables = Exact<{
  bucketId: Scalars['String']['input'];
  input: SetBucketSnoozeMinutesInput;
}>;


export type SetBucketSnoozeMinutesMutation = { __typename?: 'Mutation', setBucketSnoozeMinutes: { __typename?: 'UserBucket', id: string, snoozeUntil: string | null, bucket: { __typename?: 'Bucket', id: string, name: string } } };

export type PayloadMapperFragment = { __typename?: 'PayloadMapper', id: string, name: string, jsEvalFn: string, userId: string | null, builtInName: PayloadMapperBuiltInType | null, requiredUserSettings: Array<UserSettingType> | null, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null } | null };

export type GetPayloadMappersQueryVariables = Exact<{ [key: string]: never; }>;


export type GetPayloadMappersQuery = { __typename?: 'Query', payloadMappers: Array<{ __typename?: 'PayloadMapper', id: string, name: string, jsEvalFn: string, userId: string | null, builtInName: PayloadMapperBuiltInType | null, requiredUserSettings: Array<UserSettingType> | null, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null } | null }> };

export type GetPayloadMapperQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetPayloadMapperQuery = { __typename?: 'Query', payloadMapper: { __typename?: 'PayloadMapper', id: string, name: string, jsEvalFn: string, userId: string | null, builtInName: PayloadMapperBuiltInType | null, requiredUserSettings: Array<UserSettingType> | null, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null } | null } };

export type CreatePayloadMapperMutationVariables = Exact<{
  input: CreatePayloadMapperDto;
}>;


export type CreatePayloadMapperMutation = { __typename?: 'Mutation', createPayloadMapper: { __typename?: 'PayloadMapper', id: string, name: string, jsEvalFn: string, userId: string | null, builtInName: PayloadMapperBuiltInType | null, requiredUserSettings: Array<UserSettingType> | null, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null } | null } };

export type UpdatePayloadMapperMutationVariables = Exact<{
  id: Scalars['String']['input'];
  input: UpdatePayloadMapperDto;
}>;


export type UpdatePayloadMapperMutation = { __typename?: 'Mutation', updatePayloadMapper: { __typename?: 'PayloadMapper', id: string, name: string, jsEvalFn: string, userId: string | null, builtInName: PayloadMapperBuiltInType | null, requiredUserSettings: Array<UserSettingType> | null, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, provider: string, providerId: string, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string }> | null } | null } };

export type DeletePayloadMapperMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type DeletePayloadMapperMutation = { __typename?: 'Mutation', deletePayloadMapper: boolean };

export type EntityExecutionFragment = { __typename?: 'EntityExecution', id: string, type: ExecutionType, status: ExecutionStatus, entityName: string | null, entityId: string | null, userId: string, input: string, output: string | null, errors: string | null, durationMs: number | null, createdAt: string, updatedAt: string };

export type GetEntityExecutionsQueryVariables = Exact<{
  input: GetEntityExecutionsInput;
}>;


export type GetEntityExecutionsQuery = { __typename?: 'Query', getEntityExecutions: Array<{ __typename?: 'EntityExecution', id: string, type: ExecutionType, status: ExecutionStatus, entityName: string | null, entityId: string | null, userId: string, input: string, output: string | null, errors: string | null, durationMs: number | null, createdAt: string, updatedAt: string }> };

export type GetEntityExecutionQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetEntityExecutionQuery = { __typename?: 'Query', entityExecution: { __typename?: 'EntityExecution', id: string, type: ExecutionType, status: ExecutionStatus, entityName: string | null, entityId: string | null, userId: string, input: string, output: string | null, errors: string | null, durationMs: number | null, createdAt: string, updatedAt: string } | null };

export type ServerSettingFragment = { __typename?: 'ServerSetting', id: string, configType: ServerSettingType, valueText: string | null, valueBool: boolean | null, valueNumber: number | null, possibleValues: Array<string> | null };

export type GetServerSettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetServerSettingsQuery = { __typename?: 'Query', serverSettings: Array<{ __typename?: 'ServerSetting', id: string, configType: ServerSettingType, valueText: string | null, valueBool: boolean | null, valueNumber: number | null, possibleValues: Array<string> | null }> };

export type GetServerSettingQueryVariables = Exact<{
  configType: ServerSettingType;
}>;


export type GetServerSettingQuery = { __typename?: 'Query', serverSetting: { __typename?: 'ServerSetting', id: string, configType: ServerSettingType, valueText: string | null, valueBool: boolean | null, valueNumber: number | null, possibleValues: Array<string> | null } | null };

export type UpdateServerSettingMutationVariables = Exact<{
  configType: ServerSettingType;
  input: UpdateServerSettingDto;
}>;


export type UpdateServerSettingMutation = { __typename?: 'Mutation', updateServerSetting: { __typename?: 'ServerSetting', id: string, configType: ServerSettingType, valueText: string | null, valueBool: boolean | null, valueNumber: number | null, possibleValues: Array<string> | null } };

export type BatchUpdateServerSettingsMutationVariables = Exact<{
  settings: Array<BatchUpdateSettingInput> | BatchUpdateSettingInput;
}>;


export type BatchUpdateServerSettingsMutation = { __typename?: 'Mutation', batchUpdateServerSettings: Array<{ __typename?: 'ServerSetting', id: string, configType: ServerSettingType, valueText: string | null, valueBool: boolean | null, valueNumber: number | null, possibleValues: Array<string> | null }> };

export type RestartServerMutationVariables = Exact<{ [key: string]: never; }>;


export type RestartServerMutation = { __typename?: 'Mutation', restartServer: string };

export type ListBackupsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListBackupsQuery = { __typename?: 'Query', listBackups: Array<{ __typename?: 'BackupInfoDto', filename: string, path: string, size: string, sizeBytes: number, createdAt: string }> };

export type DeleteBackupMutationVariables = Exact<{
  filename: Scalars['String']['input'];
}>;


export type DeleteBackupMutation = { __typename?: 'Mutation', deleteBackup: boolean };

export type TriggerBackupMutationVariables = Exact<{ [key: string]: never; }>;


export type TriggerBackupMutation = { __typename?: 'Mutation', triggerBackup: string };

export type GetServerLogsQueryVariables = Exact<{
  input: GetLogsInput;
}>;


export type GetServerLogsQuery = { __typename?: 'Query', logs: { __typename?: 'PaginatedLogs', total: number, page: number, limit: number, totalPages: number, logs: Array<{ __typename?: 'Log', id: string, level: LogLevel, message: string, context: string | null, trace: string | null, metadata: any | null, timestamp: string, createdAt: string }> } };

export type GetTotalLogCountQueryVariables = Exact<{ [key: string]: never; }>;


export type GetTotalLogCountQuery = { __typename?: 'Query', totalLogCount: number };

export type TriggerLogCleanupMutationVariables = Exact<{ [key: string]: never; }>;


export type TriggerLogCleanupMutation = { __typename?: 'Mutation', triggerLogCleanup: boolean };

export type GetMyAdminSubscriptionsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMyAdminSubscriptionsQuery = { __typename?: 'Query', myAdminSubscription: Array<string> | null };

export type UpsertMyAdminSubscriptionsMutationVariables = Exact<{
  eventTypes: Array<Scalars['String']['input']> | Scalars['String']['input'];
}>;


export type UpsertMyAdminSubscriptionsMutation = { __typename?: 'Mutation', upsertMyAdminSubscription: Array<string> };

export type UserAttachmentsQueryVariables = Exact<{
  userId: Scalars['ID']['input'];
}>;


export type UserAttachmentsQuery = { __typename?: 'Query', userAttachments: Array<{ __typename?: 'Attachment', id: string, filename: string, originalFilename: string | null, size: number | null, filepath: string, mediaType: MediaType | null, createdAt: string, userId: string }> };

export const AttachmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AttachmentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Attachment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"originalFilename"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"filepath"}},{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}}]}}]} as unknown as DocumentNode;
export const MessageAttachmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageAttachmentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MessageAttachment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"attachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"saveOnServer"}}]}}]} as unknown as DocumentNode;
export const NotificationActionFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationActionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NotificationAction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"destructive"}}]}}]} as unknown as DocumentNode;
export const BucketFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}}]} as unknown as DocumentNode;
export const MessageFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Message"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"attachments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageAttachmentFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tapAction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"actions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sound"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryType"}},{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageAttachmentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MessageAttachment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"attachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"saveOnServer"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationActionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NotificationAction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"destructive"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}}]} as unknown as DocumentNode;
export const NotificationFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Notification"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"receivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"readAt"}},{"kind":"Field","name":{"kind":"Name","value":"sentAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"message"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageAttachmentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MessageAttachment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"attachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"saveOnServer"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationActionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NotificationAction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"destructive"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Message"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"attachments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageAttachmentFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tapAction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"actions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sound"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryType"}},{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}}]} as unknown as DocumentNode;
export const UserFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const EntityPermissionFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityPermissionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityPermission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inviteCodeId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"grantedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const UserBucketFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"bucketId"}},{"kind":"Field","name":{"kind":"Name","value":"snoozeUntil"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"timeFrom"}},{"kind":"Field","name":{"kind":"Name","value":"timeTill"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const BucketPermissionsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketPermissionsFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BucketPermissionsDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canWrite"}},{"kind":"Field","name":{"kind":"Name","value":"canDelete"}},{"kind":"Field","name":{"kind":"Name","value":"canAdmin"}},{"kind":"Field","name":{"kind":"Name","value":"canRead"}},{"kind":"Field","name":{"kind":"Name","value":"isOwner"}},{"kind":"Field","name":{"kind":"Name","value":"isSharedWithMe"}},{"kind":"Field","name":{"kind":"Name","value":"sharedCount"}}]}}]} as unknown as DocumentNode;
export const BucketWithDevicesFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketWithDevicesFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"permissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EntityPermissionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"userBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserBucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"userPermissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketPermissionsFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketPermissionsFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BucketPermissionsDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canWrite"}},{"kind":"Field","name":{"kind":"Name","value":"canDelete"}},{"kind":"Field","name":{"kind":"Name","value":"canAdmin"}},{"kind":"Field","name":{"kind":"Name","value":"canRead"}},{"kind":"Field","name":{"kind":"Name","value":"isOwner"}},{"kind":"Field","name":{"kind":"Name","value":"isSharedWithMe"}},{"kind":"Field","name":{"kind":"Name","value":"sharedCount"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityPermissionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityPermission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inviteCodeId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"grantedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"bucketId"}},{"kind":"Field","name":{"kind":"Name","value":"snoozeUntil"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"timeFrom"}},{"kind":"Field","name":{"kind":"Name","value":"timeTill"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}}]}}]} as unknown as DocumentNode;
export const BucketFullFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFullFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"messages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"permissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EntityPermissionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"userBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserBucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"userPermissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketPermissionsFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageAttachmentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MessageAttachment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"attachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"saveOnServer"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationActionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NotificationAction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"destructive"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Message"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"attachments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageAttachmentFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tapAction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"actions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sound"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryType"}},{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketPermissionsFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BucketPermissionsDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canWrite"}},{"kind":"Field","name":{"kind":"Name","value":"canDelete"}},{"kind":"Field","name":{"kind":"Name","value":"canAdmin"}},{"kind":"Field","name":{"kind":"Name","value":"canRead"}},{"kind":"Field","name":{"kind":"Name","value":"isOwner"}},{"kind":"Field","name":{"kind":"Name","value":"isSharedWithMe"}},{"kind":"Field","name":{"kind":"Name","value":"sharedCount"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityPermissionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityPermission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inviteCodeId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"grantedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"bucketId"}},{"kind":"Field","name":{"kind":"Name","value":"snoozeUntil"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"timeFrom"}},{"kind":"Field","name":{"kind":"Name","value":"timeTill"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}}]}}]} as unknown as DocumentNode;
export const UserDeviceFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserDeviceFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserDevice"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"deviceToken"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publicKey"}},{"kind":"Field","name":{"kind":"Name","value":"privateKey"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}}]}}]} as unknown as DocumentNode;
export const UserWebhookFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserWebhookFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserWebhook"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"headers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const InviteCodeFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"InviteCodeFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"InviteCode"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"usageCount"}},{"kind":"Field","name":{"kind":"Name","value":"maxUses"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"creator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}}]}}]} as unknown as DocumentNode;
export const UserSettingFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSettingFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserSetting"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"deviceId"}},{"kind":"Field","name":{"kind":"Name","value":"configType"}},{"kind":"Field","name":{"kind":"Name","value":"valueText"}},{"kind":"Field","name":{"kind":"Name","value":"valueBool"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const AccessTokenFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccessTokenFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccessTokenListDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"isExpired"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}}]}}]} as unknown as DocumentNode;
export const AccessTokenResponseFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccessTokenResponseFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccessTokenResponseDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"tokenStored"}}]}}]} as unknown as DocumentNode;
export const SessionInfoFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SessionInfoFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SessionInfoDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"operatingSystem"}},{"kind":"Field","name":{"kind":"Name","value":"browser"}},{"kind":"Field","name":{"kind":"Name","value":"ipAddress"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"lastActivity"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"isCurrent"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"loginProvider"}}]}}]} as unknown as DocumentNode;
export const OAuthProviderPublicFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OAuthProviderPublicFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OAuthProviderPublicDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"textColor"}}]}}]} as unknown as DocumentNode;
export const OAuthProviderFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OAuthProviderFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OAuthProvider"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"clientId"}},{"kind":"Field","name":{"kind":"Name","value":"clientSecret"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"textColor"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"authorizationUrl"}},{"kind":"Field","name":{"kind":"Name","value":"tokenUrl"}},{"kind":"Field","name":{"kind":"Name","value":"userInfoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"profileFields"}},{"kind":"Field","name":{"kind":"Name","value":"additionalConfig"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const NotificationServiceInfoFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationServiceInfoFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NotificationServiceInfo"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"devicePlatform"}},{"kind":"Field","name":{"kind":"Name","value":"service"}}]}}]} as unknown as DocumentNode;
export const SystemAccessTokenFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SystemAccessTokenFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SystemAccessTokenDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"maxCalls"}},{"kind":"Field","name":{"kind":"Name","value":"calls"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"requester"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const EventFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EventFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Event"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"objectId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"targetId"}}]}}]} as unknown as DocumentNode;
export const PayloadMapperFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PayloadMapperFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PayloadMapper"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"jsEvalFn"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"builtInName"}},{"kind":"Field","name":{"kind":"Name","value":"requiredUserSettings"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const EntityExecutionFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityExecutionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityExecution"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"entityName"}},{"kind":"Field","name":{"kind":"Name","value":"entityId"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"input"}},{"kind":"Field","name":{"kind":"Name","value":"output"}},{"kind":"Field","name":{"kind":"Name","value":"errors"}},{"kind":"Field","name":{"kind":"Name","value":"durationMs"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const ServerSettingFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ServerSettingFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ServerSetting"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"configType"}},{"kind":"Field","name":{"kind":"Name","value":"valueText"}},{"kind":"Field","name":{"kind":"Name","value":"valueBool"}},{"kind":"Field","name":{"kind":"Name","value":"valueNumber"}},{"kind":"Field","name":{"kind":"Name","value":"possibleValues"}}]}}]} as unknown as DocumentNode;
export const RequestPasswordResetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RequestPasswordReset"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RequestPasswordResetDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"requestPasswordReset"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode;
export const ValidateResetTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ValidateResetToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"resetToken"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"validateResetToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"resetToken"},"value":{"kind":"Variable","name":{"kind":"Name","value":"resetToken"}}}]}]}}]} as unknown as DocumentNode;
export const ResetPasswordDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ResetPassword"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ResetPasswordDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resetPassword"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode;
export const GetNotificationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetNotifications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notifications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageAttachmentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MessageAttachment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"attachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"saveOnServer"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationActionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NotificationAction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"destructive"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Message"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"attachments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageAttachmentFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tapAction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"actions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sound"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryType"}},{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Notification"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"receivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"readAt"}},{"kind":"Field","name":{"kind":"Name","value":"sentAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"message"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}}]} as unknown as DocumentNode;
export const GetNotificationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetNotification"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notification"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageAttachmentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MessageAttachment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"attachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"saveOnServer"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationActionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NotificationAction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"destructive"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Message"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"attachments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageAttachmentFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tapAction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"actions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sound"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryType"}},{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Notification"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"receivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"readAt"}},{"kind":"Field","name":{"kind":"Name","value":"sentAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"message"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}}]} as unknown as DocumentNode;
export const CreateMessageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateMessage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateMessageDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createMessage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageAttachmentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MessageAttachment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"attachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"saveOnServer"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationActionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NotificationAction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"destructive"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Message"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"attachments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageAttachmentFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tapAction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"actions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sound"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryType"}},{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}}]} as unknown as DocumentNode;
export const DeleteNotificationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteNotification"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteNotification"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode;
export const MarkNotificationAsReadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkNotificationAsRead"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markNotificationAsRead"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"readAt"}},{"kind":"Field","name":{"kind":"Name","value":"receivedAt"}}]}}]}}]} as unknown as DocumentNode;
export const MarkNotificationAsUnreadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkNotificationAsUnread"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markNotificationAsUnread"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"readAt"}},{"kind":"Field","name":{"kind":"Name","value":"receivedAt"}}]}}]}}]} as unknown as DocumentNode;
export const MarkNotificationAsReceivedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkNotificationAsReceived"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userDeviceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markNotificationAsReceived"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"userDeviceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userDeviceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"receivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"userDeviceId"}},{"kind":"Field","name":{"kind":"Name","value":"userDevice"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceToken"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}}]}}]}}]}}]} as unknown as DocumentNode;
export const DeviceReportNotificationReceivedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeviceReportNotificationReceived"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deviceReportNotificationReceived"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"receivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"userDeviceId"}},{"kind":"Field","name":{"kind":"Name","value":"userDevice"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceToken"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}}]}}]}}]}}]} as unknown as DocumentNode;
export const MarkAllNotificationsAsReadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkAllNotificationsAsRead"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markAllNotificationsAsRead"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatedCount"}},{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode;
export const MassDeleteNotificationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MassDeleteNotifications"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ids"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"massDeleteNotifications"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ids"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ids"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deletedCount"}},{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode;
export const MassMarkNotificationsAsReadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MassMarkNotificationsAsRead"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ids"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"massMarkNotificationsAsRead"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ids"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ids"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatedCount"}},{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode;
export const MassMarkNotificationsAsUnreadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MassMarkNotificationsAsUnread"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ids"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"massMarkNotificationsAsUnread"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ids"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ids"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatedCount"}},{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode;
export const GetBucketsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBuckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketWithDevicesFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketPermissionsFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BucketPermissionsDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canWrite"}},{"kind":"Field","name":{"kind":"Name","value":"canDelete"}},{"kind":"Field","name":{"kind":"Name","value":"canAdmin"}},{"kind":"Field","name":{"kind":"Name","value":"canRead"}},{"kind":"Field","name":{"kind":"Name","value":"isOwner"}},{"kind":"Field","name":{"kind":"Name","value":"isSharedWithMe"}},{"kind":"Field","name":{"kind":"Name","value":"sharedCount"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketWithDevicesFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"permissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EntityPermissionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"userBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserBucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"userPermissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketPermissionsFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityPermissionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityPermission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inviteCodeId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"grantedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"bucketId"}},{"kind":"Field","name":{"kind":"Name","value":"snoozeUntil"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"timeFrom"}},{"kind":"Field","name":{"kind":"Name","value":"timeTill"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}}]}}]} as unknown as DocumentNode;
export const GetBucketDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBucket"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bucket"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFullFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageAttachmentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MessageAttachment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"attachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"saveOnServer"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationActionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NotificationAction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"destructive"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Message"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"attachments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageAttachmentFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tapAction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"actions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sound"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryType"}},{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketPermissionsFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BucketPermissionsDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canWrite"}},{"kind":"Field","name":{"kind":"Name","value":"canDelete"}},{"kind":"Field","name":{"kind":"Name","value":"canAdmin"}},{"kind":"Field","name":{"kind":"Name","value":"canRead"}},{"kind":"Field","name":{"kind":"Name","value":"isOwner"}},{"kind":"Field","name":{"kind":"Name","value":"isSharedWithMe"}},{"kind":"Field","name":{"kind":"Name","value":"sharedCount"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFullFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"messages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"permissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EntityPermissionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"userBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserBucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"userPermissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketPermissionsFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityPermissionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityPermission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inviteCodeId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"grantedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"bucketId"}},{"kind":"Field","name":{"kind":"Name","value":"snoozeUntil"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"timeFrom"}},{"kind":"Field","name":{"kind":"Name","value":"timeTill"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}}]}}]} as unknown as DocumentNode;
export const CreateBucketDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateBucket"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateBucketDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createBucket"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketWithDevicesFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketPermissionsFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BucketPermissionsDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canWrite"}},{"kind":"Field","name":{"kind":"Name","value":"canDelete"}},{"kind":"Field","name":{"kind":"Name","value":"canAdmin"}},{"kind":"Field","name":{"kind":"Name","value":"canRead"}},{"kind":"Field","name":{"kind":"Name","value":"isOwner"}},{"kind":"Field","name":{"kind":"Name","value":"isSharedWithMe"}},{"kind":"Field","name":{"kind":"Name","value":"sharedCount"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketWithDevicesFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"permissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EntityPermissionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"userBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserBucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"userPermissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketPermissionsFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityPermissionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityPermission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inviteCodeId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"grantedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"bucketId"}},{"kind":"Field","name":{"kind":"Name","value":"snoozeUntil"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"timeFrom"}},{"kind":"Field","name":{"kind":"Name","value":"timeTill"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}}]}}]} as unknown as DocumentNode;
export const UpdateReceivedNotificationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateReceivedNotifications"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateReceivedNotifications"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatedCount"}},{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode;
export const UpdateBucketDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateBucket"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateBucketDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateBucket"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketWithDevicesFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketPermissionsFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BucketPermissionsDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canWrite"}},{"kind":"Field","name":{"kind":"Name","value":"canDelete"}},{"kind":"Field","name":{"kind":"Name","value":"canAdmin"}},{"kind":"Field","name":{"kind":"Name","value":"canRead"}},{"kind":"Field","name":{"kind":"Name","value":"isOwner"}},{"kind":"Field","name":{"kind":"Name","value":"isSharedWithMe"}},{"kind":"Field","name":{"kind":"Name","value":"sharedCount"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketWithDevicesFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"permissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EntityPermissionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"userBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserBucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"userPermissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketPermissionsFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityPermissionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityPermission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inviteCodeId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"grantedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"bucketId"}},{"kind":"Field","name":{"kind":"Name","value":"snoozeUntil"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"timeFrom"}},{"kind":"Field","name":{"kind":"Name","value":"timeTill"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}}]}}]} as unknown as DocumentNode;
export const DeleteBucketDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteBucket"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteBucket"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode;
export const BucketPermissionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BucketPermissions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bucketPermissions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"bucketId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EntityPermissionFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityPermissionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityPermission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inviteCodeId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"grantedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}}]} as unknown as DocumentNode;
export const ShareBucketDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ShareBucket"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"GrantEntityPermissionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"shareBucket"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EntityPermissionFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityPermissionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityPermission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inviteCodeId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"grantedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}}]} as unknown as DocumentNode;
export const UnshareBucketDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnshareBucket"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RevokeEntityPermissionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshareBucket"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode;
export const InviteCodesForResourceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"InviteCodesForResource"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"resourceType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"resourceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"inviteCodesForResource"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"resourceType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"resourceType"}}},{"kind":"Argument","name":{"kind":"Name","value":"resourceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"resourceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"InviteCodeFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"InviteCodeFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"InviteCode"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"usageCount"}},{"kind":"Field","name":{"kind":"Name","value":"maxUses"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"creator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}}]}}]} as unknown as DocumentNode;
export const CreateInviteCodeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateInviteCode"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateInviteCodeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createInviteCode"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"InviteCodeFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"InviteCodeFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"InviteCode"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"usageCount"}},{"kind":"Field","name":{"kind":"Name","value":"maxUses"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"creator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}}]}}]} as unknown as DocumentNode;
export const UpdateInviteCodeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateInviteCode"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateInviteCodeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateInviteCode"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"InviteCodeFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"InviteCodeFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"InviteCode"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"usageCount"}},{"kind":"Field","name":{"kind":"Name","value":"maxUses"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"creator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}}]}}]} as unknown as DocumentNode;
export const DeleteInviteCodeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteInviteCode"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteInviteCode"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode;
export const RedeemInviteCodeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RedeemInviteCode"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RedeemInviteCodeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"redeemInviteCode"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}}]}}]}}]} as unknown as DocumentNode;
export const GetMeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMe"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserDeviceFragment"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserDeviceFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserDevice"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"deviceToken"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publicKey"}},{"kind":"Field","name":{"kind":"Name","value":"privateKey"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}}]}}]} as unknown as DocumentNode;
export const GetUserSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserSettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"deviceId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userSettings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"deviceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"deviceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSettingFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSettingFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserSetting"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"deviceId"}},{"kind":"Field","name":{"kind":"Name","value":"configType"}},{"kind":"Field","name":{"kind":"Name","value":"valueText"}},{"kind":"Field","name":{"kind":"Name","value":"valueBool"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const UpsertUserSettingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpsertUserSetting"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpsertUserSettingInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"upsertUserSetting"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSettingFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSettingFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserSetting"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"deviceId"}},{"kind":"Field","name":{"kind":"Name","value":"configType"}},{"kind":"Field","name":{"kind":"Name","value":"valueText"}},{"kind":"Field","name":{"kind":"Name","value":"valueBool"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const LoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Login"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"LoginDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"accessToken"}},{"kind":"Field","name":{"kind":"Name","value":"refreshToken"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}}]}}]}}]} as unknown as DocumentNode;
export const RegisterDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Register"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RegisterDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"register"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}},{"kind":"Field","name":{"kind":"Name","value":"emailConfirmationRequired"}},{"kind":"Field","name":{"kind":"Name","value":"accessToken"}},{"kind":"Field","name":{"kind":"Name","value":"refreshToken"}}]}}]}}]} as unknown as DocumentNode;
export const LogoutDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Logout"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logout"}}]}}]} as unknown as DocumentNode;
export const RefreshAccessTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RefreshAccessToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"refreshToken"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"refreshAccessToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"refreshToken"},"value":{"kind":"Variable","name":{"kind":"Name","value":"refreshToken"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"accessToken"}},{"kind":"Field","name":{"kind":"Name","value":"refreshToken"}}]}}]}}]} as unknown as DocumentNode;
export const UpdateProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateProfile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateProfileInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProfile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const ChangePasswordDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ChangePassword"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ChangePasswordInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changePassword"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode;
export const SetPasswordDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetPassword"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ChangePasswordInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setPassword"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode;
export const DeleteAccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteAccount"}}]}}]} as unknown as DocumentNode;
export const NotificationCreatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"NotificationCreated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notificationCreated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageAttachmentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MessageAttachment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"attachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"saveOnServer"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationActionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NotificationAction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"destructive"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Message"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"attachments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageAttachmentFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tapAction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"actions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sound"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryType"}},{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Notification"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"receivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"readAt"}},{"kind":"Field","name":{"kind":"Name","value":"sentAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"message"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}}]} as unknown as DocumentNode;
export const NotificationUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"NotificationUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notificationUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationFragment"}},{"kind":"Field","name":{"kind":"Name","value":"readAt"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageAttachmentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MessageAttachment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"attachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"saveOnServer"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationActionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NotificationAction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"destructive"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Message"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"attachments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageAttachmentFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tapAction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"actions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sound"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryType"}},{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Notification"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"receivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"readAt"}},{"kind":"Field","name":{"kind":"Name","value":"sentAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"message"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}}]} as unknown as DocumentNode;
export const NotificationDeletedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"NotificationDeleted"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notificationDeleted"}}]}}]} as unknown as DocumentNode;
export const BucketCreatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"BucketCreated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bucketCreated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}}]} as unknown as DocumentNode;
export const BucketUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"BucketUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bucketUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}}]} as unknown as DocumentNode;
export const BucketDeletedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"BucketDeleted"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bucketDeleted"}}]}}]} as unknown as DocumentNode;
export const UserProfileUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"UserProfileUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userProfileUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const UserPasswordChangedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"UserPasswordChanged"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userPasswordChanged"}}]}}]} as unknown as DocumentNode;
export const GetUserDevicesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserDevices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userDevices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserDeviceFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserDeviceFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserDevice"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"deviceToken"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publicKey"}},{"kind":"Field","name":{"kind":"Name","value":"privateKey"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}}]}}]} as unknown as DocumentNode;
export const GetUserDeviceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserDevice"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userDevice"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserDeviceFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserDeviceFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserDevice"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"deviceToken"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publicKey"}},{"kind":"Field","name":{"kind":"Name","value":"privateKey"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}}]}}]} as unknown as DocumentNode;
export const GetUserWebhooksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserWebhooks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userWebhooks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserWebhookFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserWebhookFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserWebhook"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"headers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const GetWebhookDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWebhook"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"webhook"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserWebhookFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserWebhookFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserWebhook"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"headers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const CreateWebhookDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateWebhook"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateWebhookDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createWebhook"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserWebhookFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserWebhookFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserWebhook"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"headers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const UpdateWebhookDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateWebhook"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateWebhookDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateWebhook"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserWebhookFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserWebhookFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserWebhook"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"headers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const DeleteWebhookDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteWebhook"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteWebhook"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode;
export const GetUserAccessTokensDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserAccessTokens"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getUserAccessTokens"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccessTokenFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccessTokenFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccessTokenListDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"isExpired"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}}]}}]} as unknown as DocumentNode;
export const GetUserSessionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserSessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getUserSessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SessionInfoFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SessionInfoFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SessionInfoDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"operatingSystem"}},{"kind":"Field","name":{"kind":"Name","value":"browser"}},{"kind":"Field","name":{"kind":"Name","value":"ipAddress"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"lastActivity"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"isCurrent"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"loginProvider"}}]}}]} as unknown as DocumentNode;
export const CreateAccessTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateAccessToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateAccessTokenDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createAccessToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccessTokenResponseFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccessTokenResponseFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccessTokenResponseDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"tokenStored"}}]}}]} as unknown as DocumentNode;
export const RevokeAccessTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RevokeAccessToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tokenId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokeAccessToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"tokenId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tokenId"}}}]}]}}]} as unknown as DocumentNode;
export const RevokeAllAccessTokensDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RevokeAllAccessTokens"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokeAllAccessTokens"}}]}}]} as unknown as DocumentNode;
export const UpdateAccessTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateAccessToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tokenId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateAccessTokenDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateAccessToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"tokenId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tokenId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccessTokenFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccessTokenFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccessTokenListDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"isExpired"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}}]}}]} as unknown as DocumentNode;
export const GetAccessTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAccessToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tokenId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getAccessToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"tokenId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tokenId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccessTokenFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccessTokenFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccessTokenListDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"isExpired"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}}]}}]} as unknown as DocumentNode;
export const GetAccessTokensForBucketDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAccessTokensForBucket"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getAccessTokensForBucket"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"bucketId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccessTokenFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccessTokenFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccessTokenListDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"isExpired"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}}]}}]} as unknown as DocumentNode;
export const CreateAccessTokenForBucketDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateAccessTokenForBucket"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createAccessTokenForBucket"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"bucketId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccessTokenResponseFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccessTokenResponseFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccessTokenResponseDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"tokenStored"}}]}}]} as unknown as DocumentNode;
export const RevokeSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RevokeSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sessionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokeSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sessionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sessionId"}}}]}]}}]} as unknown as DocumentNode;
export const RevokeAllOtherSessionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RevokeAllOtherSessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokeAllOtherSessions"}}]}}]} as unknown as DocumentNode;
export const RegisterDeviceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RegisterDevice"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RegisterDeviceDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"registerDevice"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserDeviceFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserDeviceFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserDevice"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"deviceToken"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publicKey"}},{"kind":"Field","name":{"kind":"Name","value":"privateKey"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}}]}}]} as unknown as DocumentNode;
export const RemoveDeviceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveDevice"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"deviceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeDevice"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"deviceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"deviceId"}}}]}]}}]} as unknown as DocumentNode;
export const RemoveDeviceByTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveDeviceByToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"deviceToken"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeDeviceByToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"deviceToken"},"value":{"kind":"Variable","name":{"kind":"Name","value":"deviceToken"}}}]}]}}]} as unknown as DocumentNode;
export const UpdateDeviceTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateDeviceToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateDeviceTokenDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateDeviceToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"deviceToken"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode;
export const UpdateUserDeviceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUserDevice"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateUserDeviceInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUserDevice"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"subscriptionFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endpoint"}},{"kind":"Field","name":{"kind":"Name","value":"p256dh"}},{"kind":"Field","name":{"kind":"Name","value":"auth"}}]}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode;
export const GetResourcePermissionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetResourcePermissions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"GetResourcePermissionsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getResourcePermissions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EntityPermissionFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityPermissionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityPermission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inviteCodeId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"grantedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}}]} as unknown as DocumentNode;
export const GrantEntityPermissionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GrantEntityPermission"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"GrantEntityPermissionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"grantEntityPermission"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EntityPermissionFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityPermissionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityPermission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inviteCodeId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"grantedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}}]} as unknown as DocumentNode;
export const RevokeEntityPermissionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RevokeEntityPermission"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RevokeEntityPermissionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokeEntityPermission"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode;
export const CleanupExpiredPermissionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CleanupExpiredPermissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cleanupExpiredPermissions"}}]}}]} as unknown as DocumentNode;
export const AllOAuthProvidersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AllOAuthProviders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allOAuthProviders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"OAuthProviderFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OAuthProviderFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OAuthProvider"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"clientId"}},{"kind":"Field","name":{"kind":"Name","value":"clientSecret"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"textColor"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"authorizationUrl"}},{"kind":"Field","name":{"kind":"Name","value":"tokenUrl"}},{"kind":"Field","name":{"kind":"Name","value":"userInfoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"profileFields"}},{"kind":"Field","name":{"kind":"Name","value":"additionalConfig"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const OAuthProviderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OAuthProvider"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"oauthProvider"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"OAuthProviderFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OAuthProviderFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OAuthProvider"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"clientId"}},{"kind":"Field","name":{"kind":"Name","value":"clientSecret"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"textColor"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"authorizationUrl"}},{"kind":"Field","name":{"kind":"Name","value":"tokenUrl"}},{"kind":"Field","name":{"kind":"Name","value":"userInfoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"profileFields"}},{"kind":"Field","name":{"kind":"Name","value":"additionalConfig"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const CreateOAuthProviderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateOAuthProvider"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateOAuthProviderDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createOAuthProvider"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"OAuthProviderFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OAuthProviderFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OAuthProvider"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"clientId"}},{"kind":"Field","name":{"kind":"Name","value":"clientSecret"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"textColor"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"authorizationUrl"}},{"kind":"Field","name":{"kind":"Name","value":"tokenUrl"}},{"kind":"Field","name":{"kind":"Name","value":"userInfoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"profileFields"}},{"kind":"Field","name":{"kind":"Name","value":"additionalConfig"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const UpdateOAuthProviderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateOAuthProvider"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateOAuthProviderDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateOAuthProvider"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"OAuthProviderFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OAuthProviderFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OAuthProvider"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"clientId"}},{"kind":"Field","name":{"kind":"Name","value":"clientSecret"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"textColor"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"authorizationUrl"}},{"kind":"Field","name":{"kind":"Name","value":"tokenUrl"}},{"kind":"Field","name":{"kind":"Name","value":"userInfoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"profileFields"}},{"kind":"Field","name":{"kind":"Name","value":"additionalConfig"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const ToggleOAuthProviderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ToggleOAuthProvider"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"toggleOAuthProvider"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"OAuthProviderFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OAuthProviderFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OAuthProvider"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"clientId"}},{"kind":"Field","name":{"kind":"Name","value":"clientSecret"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"textColor"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"authorizationUrl"}},{"kind":"Field","name":{"kind":"Name","value":"tokenUrl"}},{"kind":"Field","name":{"kind":"Name","value":"userInfoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"profileFields"}},{"kind":"Field","name":{"kind":"Name","value":"additionalConfig"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const DeleteOAuthProviderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteOAuthProvider"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteOAuthProvider"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode;
export const HealthcheckDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Healthcheck"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"healthcheck"}}]}}]} as unknown as DocumentNode;
export const GetBackendVersionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBackendVersion"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getBackendVersion"}}]}}]} as unknown as DocumentNode;
export const GetNotificationServicesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetNotificationServices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notificationServices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationServiceInfoFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationServiceInfoFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NotificationServiceInfo"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"devicePlatform"}},{"kind":"Field","name":{"kind":"Name","value":"service"}}]}}]} as unknown as DocumentNode;
export const UpdateUserRoleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUserRole"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateUserRoleInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUserRole"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const SetBucketSnoozeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetBucketSnooze"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"snoozeUntil"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setBucketSnooze"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"bucketId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}}},{"kind":"Argument","name":{"kind":"Name","value":"snoozeUntil"},"value":{"kind":"Variable","name":{"kind":"Name","value":"snoozeUntil"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserBucketFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"bucketId"}},{"kind":"Field","name":{"kind":"Name","value":"snoozeUntil"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"timeFrom"}},{"kind":"Field","name":{"kind":"Name","value":"timeTill"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}}]}}]} as unknown as DocumentNode;
export const UpdateBucketSnoozesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateBucketSnoozes"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"snoozes"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SnoozeScheduleInput"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateBucketSnoozes"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"bucketId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}}},{"kind":"Argument","name":{"kind":"Name","value":"snoozes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"snoozes"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserBucketFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"bucketId"}},{"kind":"Field","name":{"kind":"Name","value":"snoozeUntil"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"timeFrom"}},{"kind":"Field","name":{"kind":"Name","value":"timeTill"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}}]}}]} as unknown as DocumentNode;
export const GetAllUsersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAllUsers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"users"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const GetUserByIdDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserById"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const GetSystemAccessTokensDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSystemAccessTokens"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listSystemTokens"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SystemAccessTokenFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SystemAccessTokenFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SystemAccessTokenDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"maxCalls"}},{"kind":"Field","name":{"kind":"Name","value":"calls"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"requester"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const GetSystemTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSystemToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getSystemToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SystemAccessTokenFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SystemAccessTokenFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SystemAccessTokenDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"maxCalls"}},{"kind":"Field","name":{"kind":"Name","value":"calls"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"requester"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const CreateSystemAccessTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateSystemAccessToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"maxCalls"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"expiresAt"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"requesterId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"description"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSystemToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"maxCalls"},"value":{"kind":"Variable","name":{"kind":"Name","value":"maxCalls"}}},{"kind":"Argument","name":{"kind":"Name","value":"expiresAt"},"value":{"kind":"Variable","name":{"kind":"Name","value":"expiresAt"}}},{"kind":"Argument","name":{"kind":"Name","value":"requesterId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"requesterId"}}},{"kind":"Argument","name":{"kind":"Name","value":"description"},"value":{"kind":"Variable","name":{"kind":"Name","value":"description"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SystemAccessTokenFragment"}},{"kind":"Field","name":{"kind":"Name","value":"rawToken"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SystemAccessTokenFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SystemAccessTokenDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"maxCalls"}},{"kind":"Field","name":{"kind":"Name","value":"calls"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"requester"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const UpdateSystemAccessTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateSystemAccessToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"maxCalls"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"expiresAt"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"requesterId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"description"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateSystemToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"maxCalls"},"value":{"kind":"Variable","name":{"kind":"Name","value":"maxCalls"}}},{"kind":"Argument","name":{"kind":"Name","value":"expiresAt"},"value":{"kind":"Variable","name":{"kind":"Name","value":"expiresAt"}}},{"kind":"Argument","name":{"kind":"Name","value":"requesterId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"requesterId"}}},{"kind":"Argument","name":{"kind":"Name","value":"description"},"value":{"kind":"Variable","name":{"kind":"Name","value":"description"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SystemAccessTokenFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SystemAccessTokenFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SystemAccessTokenDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"maxCalls"}},{"kind":"Field","name":{"kind":"Name","value":"calls"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"requester"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const RevokeSystemAccessTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RevokeSystemAccessToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokeSystemToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode;
export const RequestEmailConfirmationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RequestEmailConfirmation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RequestEmailConfirmationDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"requestEmailConfirmation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode;
export const ConfirmEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ConfirmEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ConfirmEmailDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"confirmEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode;
export const PublicAppConfigDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PublicAppConfig"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publicAppConfig"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"emailEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"uploadEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"oauthProviders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"OAuthProviderPublicFragment"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OAuthProviderPublicFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OAuthProviderPublicDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"textColor"}}]}}]} as unknown as DocumentNode;
export const GetEventsPaginatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetEventsPaginated"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"EventsQueryDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"events"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"events"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EventFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"page"}},{"kind":"Field","name":{"kind":"Name","value":"limit"}},{"kind":"Field","name":{"kind":"Name","value":"totalPages"}},{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}},{"kind":"Field","name":{"kind":"Name","value":"hasPreviousPage"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EventFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Event"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"objectId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"targetId"}}]}}]} as unknown as DocumentNode;
export const UserNotificationStatsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UserNotificationStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userNotificationStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"today"}},{"kind":"Field","name":{"kind":"Name","value":"thisWeek"}},{"kind":"Field","name":{"kind":"Name","value":"last7Days"}},{"kind":"Field","name":{"kind":"Name","value":"thisMonth"}},{"kind":"Field","name":{"kind":"Name","value":"last30Days"}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}}]} as unknown as DocumentNode;
export const UserNotificationStatsByUserIdDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UserNotificationStatsByUserId"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userNotificationStats"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"today"}},{"kind":"Field","name":{"kind":"Name","value":"thisWeek"}},{"kind":"Field","name":{"kind":"Name","value":"last7Days"}},{"kind":"Field","name":{"kind":"Name","value":"thisMonth"}},{"kind":"Field","name":{"kind":"Name","value":"last30Days"}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}}]} as unknown as DocumentNode;
export const ExecuteWebhookDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ExecuteWebhook"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"executeWebhook"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode;
export const SetBucketSnoozeMinutesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetBucketSnoozeMinutes"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SetBucketSnoozeMinutesInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setBucketSnoozeMinutes"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"bucketId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"snoozeUntil"}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode;
export const GetPayloadMappersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPayloadMappers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"payloadMappers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PayloadMapperFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PayloadMapperFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PayloadMapper"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"jsEvalFn"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"builtInName"}},{"kind":"Field","name":{"kind":"Name","value":"requiredUserSettings"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const GetPayloadMapperDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPayloadMapper"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"payloadMapper"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PayloadMapperFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PayloadMapperFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PayloadMapper"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"jsEvalFn"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"builtInName"}},{"kind":"Field","name":{"kind":"Name","value":"requiredUserSettings"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const CreatePayloadMapperDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreatePayloadMapper"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreatePayloadMapperDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createPayloadMapper"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PayloadMapperFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PayloadMapperFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PayloadMapper"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"jsEvalFn"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"builtInName"}},{"kind":"Field","name":{"kind":"Name","value":"requiredUserSettings"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const UpdatePayloadMapperDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdatePayloadMapper"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdatePayloadMapperDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatePayloadMapper"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PayloadMapperFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PayloadMapperFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PayloadMapper"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"jsEvalFn"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"builtInName"}},{"kind":"Field","name":{"kind":"Name","value":"requiredUserSettings"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const DeletePayloadMapperDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeletePayloadMapper"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deletePayloadMapper"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode;
export const GetEntityExecutionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetEntityExecutions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"GetEntityExecutionsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getEntityExecutions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EntityExecutionFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityExecutionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityExecution"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"entityName"}},{"kind":"Field","name":{"kind":"Name","value":"entityId"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"input"}},{"kind":"Field","name":{"kind":"Name","value":"output"}},{"kind":"Field","name":{"kind":"Name","value":"errors"}},{"kind":"Field","name":{"kind":"Name","value":"durationMs"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const GetEntityExecutionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetEntityExecution"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"entityExecution"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EntityExecutionFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityExecutionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityExecution"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"entityName"}},{"kind":"Field","name":{"kind":"Name","value":"entityId"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"input"}},{"kind":"Field","name":{"kind":"Name","value":"output"}},{"kind":"Field","name":{"kind":"Name","value":"errors"}},{"kind":"Field","name":{"kind":"Name","value":"durationMs"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const GetServerSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetServerSettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"serverSettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ServerSettingFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ServerSettingFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ServerSetting"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"configType"}},{"kind":"Field","name":{"kind":"Name","value":"valueText"}},{"kind":"Field","name":{"kind":"Name","value":"valueBool"}},{"kind":"Field","name":{"kind":"Name","value":"valueNumber"}},{"kind":"Field","name":{"kind":"Name","value":"possibleValues"}}]}}]} as unknown as DocumentNode;
export const GetServerSettingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetServerSetting"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"configType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ServerSettingType"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"serverSetting"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"configType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"configType"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ServerSettingFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ServerSettingFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ServerSetting"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"configType"}},{"kind":"Field","name":{"kind":"Name","value":"valueText"}},{"kind":"Field","name":{"kind":"Name","value":"valueBool"}},{"kind":"Field","name":{"kind":"Name","value":"valueNumber"}},{"kind":"Field","name":{"kind":"Name","value":"possibleValues"}}]}}]} as unknown as DocumentNode;
export const UpdateServerSettingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateServerSetting"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"configType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ServerSettingType"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateServerSettingDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateServerSetting"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"configType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"configType"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ServerSettingFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ServerSettingFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ServerSetting"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"configType"}},{"kind":"Field","name":{"kind":"Name","value":"valueText"}},{"kind":"Field","name":{"kind":"Name","value":"valueBool"}},{"kind":"Field","name":{"kind":"Name","value":"valueNumber"}},{"kind":"Field","name":{"kind":"Name","value":"possibleValues"}}]}}]} as unknown as DocumentNode;
export const BatchUpdateServerSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"BatchUpdateServerSettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"settings"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"BatchUpdateSettingInput"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"batchUpdateServerSettings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"settings"},"value":{"kind":"Variable","name":{"kind":"Name","value":"settings"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ServerSettingFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ServerSettingFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ServerSetting"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"configType"}},{"kind":"Field","name":{"kind":"Name","value":"valueText"}},{"kind":"Field","name":{"kind":"Name","value":"valueBool"}},{"kind":"Field","name":{"kind":"Name","value":"valueNumber"}},{"kind":"Field","name":{"kind":"Name","value":"possibleValues"}}]}}]} as unknown as DocumentNode;
export const RestartServerDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RestartServer"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"restartServer"}}]}}]} as unknown as DocumentNode;
export const ListBackupsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListBackups"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listBackups"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"sizeBytes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode;
export const DeleteBackupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteBackup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filename"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteBackup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filename"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filename"}}}]}]}}]} as unknown as DocumentNode;
export const TriggerBackupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"TriggerBackup"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"triggerBackup"}}]}}]} as unknown as DocumentNode;
export const GetServerLogsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetServerLogs"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"GetLogsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"trace"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"page"}},{"kind":"Field","name":{"kind":"Name","value":"limit"}},{"kind":"Field","name":{"kind":"Name","value":"totalPages"}}]}}]}}]} as unknown as DocumentNode;
export const GetTotalLogCountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTotalLogCount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalLogCount"}}]}}]} as unknown as DocumentNode;
export const TriggerLogCleanupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"TriggerLogCleanup"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"triggerLogCleanup"}}]}}]} as unknown as DocumentNode;
export const GetMyAdminSubscriptionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMyAdminSubscriptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myAdminSubscription"}}]}}]} as unknown as DocumentNode;
export const UpsertMyAdminSubscriptionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpsertMyAdminSubscriptions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"eventTypes"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"upsertMyAdminSubscription"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"eventTypes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"eventTypes"}}}]}]}}]} as unknown as DocumentNode;
export const UserAttachmentsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UserAttachments"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userAttachments"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AttachmentFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AttachmentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Attachment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"originalFilename"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"filepath"}},{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}}]}}]} as unknown as DocumentNode;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    RequestPasswordReset(variables: RequestPasswordResetMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<RequestPasswordResetMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<RequestPasswordResetMutation>({ document: RequestPasswordResetDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'RequestPasswordReset', 'mutation', variables);
    },
    ValidateResetToken(variables: ValidateResetTokenMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<ValidateResetTokenMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<ValidateResetTokenMutation>({ document: ValidateResetTokenDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'ValidateResetToken', 'mutation', variables);
    },
    ResetPassword(variables: ResetPasswordMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<ResetPasswordMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<ResetPasswordMutation>({ document: ResetPasswordDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'ResetPassword', 'mutation', variables);
    },
    GetNotifications(variables?: GetNotificationsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetNotificationsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetNotificationsQuery>({ document: GetNotificationsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetNotifications', 'query', variables);
    },
    GetNotification(variables: GetNotificationQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetNotificationQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetNotificationQuery>({ document: GetNotificationDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetNotification', 'query', variables);
    },
    CreateMessage(variables: CreateMessageMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<CreateMessageMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<CreateMessageMutation>({ document: CreateMessageDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'CreateMessage', 'mutation', variables);
    },
    DeleteNotification(variables: DeleteNotificationMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<DeleteNotificationMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteNotificationMutation>({ document: DeleteNotificationDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'DeleteNotification', 'mutation', variables);
    },
    MarkNotificationAsRead(variables: MarkNotificationAsReadMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<MarkNotificationAsReadMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<MarkNotificationAsReadMutation>({ document: MarkNotificationAsReadDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'MarkNotificationAsRead', 'mutation', variables);
    },
    MarkNotificationAsUnread(variables: MarkNotificationAsUnreadMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<MarkNotificationAsUnreadMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<MarkNotificationAsUnreadMutation>({ document: MarkNotificationAsUnreadDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'MarkNotificationAsUnread', 'mutation', variables);
    },
    MarkNotificationAsReceived(variables: MarkNotificationAsReceivedMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<MarkNotificationAsReceivedMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<MarkNotificationAsReceivedMutation>({ document: MarkNotificationAsReceivedDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'MarkNotificationAsReceived', 'mutation', variables);
    },
    DeviceReportNotificationReceived(variables: DeviceReportNotificationReceivedMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<DeviceReportNotificationReceivedMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeviceReportNotificationReceivedMutation>({ document: DeviceReportNotificationReceivedDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'DeviceReportNotificationReceived', 'mutation', variables);
    },
    MarkAllNotificationsAsRead(variables?: MarkAllNotificationsAsReadMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<MarkAllNotificationsAsReadMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<MarkAllNotificationsAsReadMutation>({ document: MarkAllNotificationsAsReadDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'MarkAllNotificationsAsRead', 'mutation', variables);
    },
    MassDeleteNotifications(variables: MassDeleteNotificationsMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<MassDeleteNotificationsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<MassDeleteNotificationsMutation>({ document: MassDeleteNotificationsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'MassDeleteNotifications', 'mutation', variables);
    },
    MassMarkNotificationsAsRead(variables: MassMarkNotificationsAsReadMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<MassMarkNotificationsAsReadMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<MassMarkNotificationsAsReadMutation>({ document: MassMarkNotificationsAsReadDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'MassMarkNotificationsAsRead', 'mutation', variables);
    },
    MassMarkNotificationsAsUnread(variables: MassMarkNotificationsAsUnreadMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<MassMarkNotificationsAsUnreadMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<MassMarkNotificationsAsUnreadMutation>({ document: MassMarkNotificationsAsUnreadDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'MassMarkNotificationsAsUnread', 'mutation', variables);
    },
    GetBuckets(variables?: GetBucketsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetBucketsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetBucketsQuery>({ document: GetBucketsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetBuckets', 'query', variables);
    },
    GetBucket(variables: GetBucketQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetBucketQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetBucketQuery>({ document: GetBucketDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetBucket', 'query', variables);
    },
    CreateBucket(variables: CreateBucketMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<CreateBucketMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<CreateBucketMutation>({ document: CreateBucketDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'CreateBucket', 'mutation', variables);
    },
    UpdateReceivedNotifications(variables: UpdateReceivedNotificationsMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UpdateReceivedNotificationsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateReceivedNotificationsMutation>({ document: UpdateReceivedNotificationsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'UpdateReceivedNotifications', 'mutation', variables);
    },
    UpdateBucket(variables: UpdateBucketMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UpdateBucketMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateBucketMutation>({ document: UpdateBucketDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'UpdateBucket', 'mutation', variables);
    },
    DeleteBucket(variables: DeleteBucketMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<DeleteBucketMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteBucketMutation>({ document: DeleteBucketDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'DeleteBucket', 'mutation', variables);
    },
    BucketPermissions(variables: BucketPermissionsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<BucketPermissionsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<BucketPermissionsQuery>({ document: BucketPermissionsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'BucketPermissions', 'query', variables);
    },
    ShareBucket(variables: ShareBucketMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<ShareBucketMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<ShareBucketMutation>({ document: ShareBucketDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'ShareBucket', 'mutation', variables);
    },
    UnshareBucket(variables: UnshareBucketMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UnshareBucketMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UnshareBucketMutation>({ document: UnshareBucketDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'UnshareBucket', 'mutation', variables);
    },
    InviteCodesForResource(variables: InviteCodesForResourceQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<InviteCodesForResourceQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InviteCodesForResourceQuery>({ document: InviteCodesForResourceDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'InviteCodesForResource', 'query', variables);
    },
    CreateInviteCode(variables: CreateInviteCodeMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<CreateInviteCodeMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<CreateInviteCodeMutation>({ document: CreateInviteCodeDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'CreateInviteCode', 'mutation', variables);
    },
    UpdateInviteCode(variables: UpdateInviteCodeMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UpdateInviteCodeMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateInviteCodeMutation>({ document: UpdateInviteCodeDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'UpdateInviteCode', 'mutation', variables);
    },
    DeleteInviteCode(variables: DeleteInviteCodeMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<DeleteInviteCodeMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteInviteCodeMutation>({ document: DeleteInviteCodeDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'DeleteInviteCode', 'mutation', variables);
    },
    RedeemInviteCode(variables: RedeemInviteCodeMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<RedeemInviteCodeMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<RedeemInviteCodeMutation>({ document: RedeemInviteCodeDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'RedeemInviteCode', 'mutation', variables);
    },
    GetMe(variables?: GetMeQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetMeQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetMeQuery>({ document: GetMeDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetMe', 'query', variables);
    },
    GetUserSettings(variables?: GetUserSettingsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetUserSettingsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetUserSettingsQuery>({ document: GetUserSettingsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetUserSettings', 'query', variables);
    },
    UpsertUserSetting(variables: UpsertUserSettingMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UpsertUserSettingMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpsertUserSettingMutation>({ document: UpsertUserSettingDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'UpsertUserSetting', 'mutation', variables);
    },
    Login(variables: LoginMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<LoginMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<LoginMutation>({ document: LoginDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'Login', 'mutation', variables);
    },
    Register(variables: RegisterMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<RegisterMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<RegisterMutation>({ document: RegisterDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'Register', 'mutation', variables);
    },
    Logout(variables?: LogoutMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<LogoutMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<LogoutMutation>({ document: LogoutDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'Logout', 'mutation', variables);
    },
    RefreshAccessToken(variables: RefreshAccessTokenMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<RefreshAccessTokenMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<RefreshAccessTokenMutation>({ document: RefreshAccessTokenDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'RefreshAccessToken', 'mutation', variables);
    },
    UpdateProfile(variables: UpdateProfileMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UpdateProfileMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateProfileMutation>({ document: UpdateProfileDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'UpdateProfile', 'mutation', variables);
    },
    ChangePassword(variables: ChangePasswordMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<ChangePasswordMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<ChangePasswordMutation>({ document: ChangePasswordDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'ChangePassword', 'mutation', variables);
    },
    SetPassword(variables: SetPasswordMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<SetPasswordMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<SetPasswordMutation>({ document: SetPasswordDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'SetPassword', 'mutation', variables);
    },
    DeleteAccount(variables?: DeleteAccountMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<DeleteAccountMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteAccountMutation>({ document: DeleteAccountDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'DeleteAccount', 'mutation', variables);
    },
    NotificationCreated(variables?: NotificationCreatedSubscriptionVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<NotificationCreatedSubscription> {
      return withWrapper((wrappedRequestHeaders) => client.request<NotificationCreatedSubscription>({ document: NotificationCreatedDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'NotificationCreated', 'subscription', variables);
    },
    NotificationUpdated(variables?: NotificationUpdatedSubscriptionVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<NotificationUpdatedSubscription> {
      return withWrapper((wrappedRequestHeaders) => client.request<NotificationUpdatedSubscription>({ document: NotificationUpdatedDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'NotificationUpdated', 'subscription', variables);
    },
    NotificationDeleted(variables?: NotificationDeletedSubscriptionVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<NotificationDeletedSubscription> {
      return withWrapper((wrappedRequestHeaders) => client.request<NotificationDeletedSubscription>({ document: NotificationDeletedDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'NotificationDeleted', 'subscription', variables);
    },
    BucketCreated(variables?: BucketCreatedSubscriptionVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<BucketCreatedSubscription> {
      return withWrapper((wrappedRequestHeaders) => client.request<BucketCreatedSubscription>({ document: BucketCreatedDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'BucketCreated', 'subscription', variables);
    },
    BucketUpdated(variables?: BucketUpdatedSubscriptionVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<BucketUpdatedSubscription> {
      return withWrapper((wrappedRequestHeaders) => client.request<BucketUpdatedSubscription>({ document: BucketUpdatedDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'BucketUpdated', 'subscription', variables);
    },
    BucketDeleted(variables?: BucketDeletedSubscriptionVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<BucketDeletedSubscription> {
      return withWrapper((wrappedRequestHeaders) => client.request<BucketDeletedSubscription>({ document: BucketDeletedDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'BucketDeleted', 'subscription', variables);
    },
    UserProfileUpdated(variables?: UserProfileUpdatedSubscriptionVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UserProfileUpdatedSubscription> {
      return withWrapper((wrappedRequestHeaders) => client.request<UserProfileUpdatedSubscription>({ document: UserProfileUpdatedDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'UserProfileUpdated', 'subscription', variables);
    },
    UserPasswordChanged(variables?: UserPasswordChangedSubscriptionVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UserPasswordChangedSubscription> {
      return withWrapper((wrappedRequestHeaders) => client.request<UserPasswordChangedSubscription>({ document: UserPasswordChangedDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'UserPasswordChanged', 'subscription', variables);
    },
    GetUserDevices(variables?: GetUserDevicesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetUserDevicesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetUserDevicesQuery>({ document: GetUserDevicesDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetUserDevices', 'query', variables);
    },
    GetUserDevice(variables?: GetUserDeviceQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetUserDeviceQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetUserDeviceQuery>({ document: GetUserDeviceDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetUserDevice', 'query', variables);
    },
    GetUserWebhooks(variables?: GetUserWebhooksQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetUserWebhooksQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetUserWebhooksQuery>({ document: GetUserWebhooksDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetUserWebhooks', 'query', variables);
    },
    GetWebhook(variables: GetWebhookQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetWebhookQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetWebhookQuery>({ document: GetWebhookDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetWebhook', 'query', variables);
    },
    CreateWebhook(variables: CreateWebhookMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<CreateWebhookMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<CreateWebhookMutation>({ document: CreateWebhookDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'CreateWebhook', 'mutation', variables);
    },
    UpdateWebhook(variables: UpdateWebhookMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UpdateWebhookMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateWebhookMutation>({ document: UpdateWebhookDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'UpdateWebhook', 'mutation', variables);
    },
    DeleteWebhook(variables: DeleteWebhookMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<DeleteWebhookMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteWebhookMutation>({ document: DeleteWebhookDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'DeleteWebhook', 'mutation', variables);
    },
    GetUserAccessTokens(variables?: GetUserAccessTokensQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetUserAccessTokensQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetUserAccessTokensQuery>({ document: GetUserAccessTokensDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetUserAccessTokens', 'query', variables);
    },
    GetUserSessions(variables?: GetUserSessionsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetUserSessionsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetUserSessionsQuery>({ document: GetUserSessionsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetUserSessions', 'query', variables);
    },
    CreateAccessToken(variables: CreateAccessTokenMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<CreateAccessTokenMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<CreateAccessTokenMutation>({ document: CreateAccessTokenDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'CreateAccessToken', 'mutation', variables);
    },
    RevokeAccessToken(variables: RevokeAccessTokenMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<RevokeAccessTokenMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<RevokeAccessTokenMutation>({ document: RevokeAccessTokenDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'RevokeAccessToken', 'mutation', variables);
    },
    RevokeAllAccessTokens(variables?: RevokeAllAccessTokensMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<RevokeAllAccessTokensMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<RevokeAllAccessTokensMutation>({ document: RevokeAllAccessTokensDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'RevokeAllAccessTokens', 'mutation', variables);
    },
    UpdateAccessToken(variables: UpdateAccessTokenMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UpdateAccessTokenMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateAccessTokenMutation>({ document: UpdateAccessTokenDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'UpdateAccessToken', 'mutation', variables);
    },
    GetAccessToken(variables: GetAccessTokenQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetAccessTokenQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetAccessTokenQuery>({ document: GetAccessTokenDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetAccessToken', 'query', variables);
    },
    GetAccessTokensForBucket(variables: GetAccessTokensForBucketQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetAccessTokensForBucketQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetAccessTokensForBucketQuery>({ document: GetAccessTokensForBucketDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetAccessTokensForBucket', 'query', variables);
    },
    CreateAccessTokenForBucket(variables: CreateAccessTokenForBucketMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<CreateAccessTokenForBucketMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<CreateAccessTokenForBucketMutation>({ document: CreateAccessTokenForBucketDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'CreateAccessTokenForBucket', 'mutation', variables);
    },
    RevokeSession(variables: RevokeSessionMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<RevokeSessionMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<RevokeSessionMutation>({ document: RevokeSessionDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'RevokeSession', 'mutation', variables);
    },
    RevokeAllOtherSessions(variables?: RevokeAllOtherSessionsMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<RevokeAllOtherSessionsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<RevokeAllOtherSessionsMutation>({ document: RevokeAllOtherSessionsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'RevokeAllOtherSessions', 'mutation', variables);
    },
    RegisterDevice(variables: RegisterDeviceMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<RegisterDeviceMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<RegisterDeviceMutation>({ document: RegisterDeviceDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'RegisterDevice', 'mutation', variables);
    },
    RemoveDevice(variables: RemoveDeviceMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<RemoveDeviceMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<RemoveDeviceMutation>({ document: RemoveDeviceDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'RemoveDevice', 'mutation', variables);
    },
    RemoveDeviceByToken(variables: RemoveDeviceByTokenMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<RemoveDeviceByTokenMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<RemoveDeviceByTokenMutation>({ document: RemoveDeviceByTokenDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'RemoveDeviceByToken', 'mutation', variables);
    },
    UpdateDeviceToken(variables: UpdateDeviceTokenMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UpdateDeviceTokenMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateDeviceTokenMutation>({ document: UpdateDeviceTokenDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'UpdateDeviceToken', 'mutation', variables);
    },
    UpdateUserDevice(variables: UpdateUserDeviceMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UpdateUserDeviceMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateUserDeviceMutation>({ document: UpdateUserDeviceDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'UpdateUserDevice', 'mutation', variables);
    },
    GetResourcePermissions(variables: GetResourcePermissionsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetResourcePermissionsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetResourcePermissionsQuery>({ document: GetResourcePermissionsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetResourcePermissions', 'query', variables);
    },
    GrantEntityPermission(variables: GrantEntityPermissionMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GrantEntityPermissionMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<GrantEntityPermissionMutation>({ document: GrantEntityPermissionDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GrantEntityPermission', 'mutation', variables);
    },
    RevokeEntityPermission(variables: RevokeEntityPermissionMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<RevokeEntityPermissionMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<RevokeEntityPermissionMutation>({ document: RevokeEntityPermissionDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'RevokeEntityPermission', 'mutation', variables);
    },
    CleanupExpiredPermissions(variables?: CleanupExpiredPermissionsMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<CleanupExpiredPermissionsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<CleanupExpiredPermissionsMutation>({ document: CleanupExpiredPermissionsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'CleanupExpiredPermissions', 'mutation', variables);
    },
    AllOAuthProviders(variables?: AllOAuthProvidersQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<AllOAuthProvidersQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<AllOAuthProvidersQuery>({ document: AllOAuthProvidersDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'AllOAuthProviders', 'query', variables);
    },
    OAuthProvider(variables: OAuthProviderQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<OAuthProviderQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<OAuthProviderQuery>({ document: OAuthProviderDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'OAuthProvider', 'query', variables);
    },
    CreateOAuthProvider(variables: CreateOAuthProviderMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<CreateOAuthProviderMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<CreateOAuthProviderMutation>({ document: CreateOAuthProviderDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'CreateOAuthProvider', 'mutation', variables);
    },
    UpdateOAuthProvider(variables: UpdateOAuthProviderMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UpdateOAuthProviderMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateOAuthProviderMutation>({ document: UpdateOAuthProviderDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'UpdateOAuthProvider', 'mutation', variables);
    },
    ToggleOAuthProvider(variables: ToggleOAuthProviderMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<ToggleOAuthProviderMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<ToggleOAuthProviderMutation>({ document: ToggleOAuthProviderDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'ToggleOAuthProvider', 'mutation', variables);
    },
    DeleteOAuthProvider(variables: DeleteOAuthProviderMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<DeleteOAuthProviderMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteOAuthProviderMutation>({ document: DeleteOAuthProviderDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'DeleteOAuthProvider', 'mutation', variables);
    },
    Healthcheck(variables?: HealthcheckQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<HealthcheckQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<HealthcheckQuery>({ document: HealthcheckDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'Healthcheck', 'query', variables);
    },
    GetBackendVersion(variables?: GetBackendVersionQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetBackendVersionQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetBackendVersionQuery>({ document: GetBackendVersionDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetBackendVersion', 'query', variables);
    },
    GetNotificationServices(variables?: GetNotificationServicesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetNotificationServicesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetNotificationServicesQuery>({ document: GetNotificationServicesDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetNotificationServices', 'query', variables);
    },
    UpdateUserRole(variables: UpdateUserRoleMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UpdateUserRoleMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateUserRoleMutation>({ document: UpdateUserRoleDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'UpdateUserRole', 'mutation', variables);
    },
    SetBucketSnooze(variables: SetBucketSnoozeMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<SetBucketSnoozeMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<SetBucketSnoozeMutation>({ document: SetBucketSnoozeDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'SetBucketSnooze', 'mutation', variables);
    },
    UpdateBucketSnoozes(variables: UpdateBucketSnoozesMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UpdateBucketSnoozesMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateBucketSnoozesMutation>({ document: UpdateBucketSnoozesDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'UpdateBucketSnoozes', 'mutation', variables);
    },
    GetAllUsers(variables?: GetAllUsersQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetAllUsersQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetAllUsersQuery>({ document: GetAllUsersDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetAllUsers', 'query', variables);
    },
    GetUserById(variables: GetUserByIdQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetUserByIdQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetUserByIdQuery>({ document: GetUserByIdDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetUserById', 'query', variables);
    },
    GetSystemAccessTokens(variables?: GetSystemAccessTokensQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetSystemAccessTokensQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetSystemAccessTokensQuery>({ document: GetSystemAccessTokensDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetSystemAccessTokens', 'query', variables);
    },
    GetSystemToken(variables: GetSystemTokenQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetSystemTokenQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetSystemTokenQuery>({ document: GetSystemTokenDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetSystemToken', 'query', variables);
    },
    CreateSystemAccessToken(variables: CreateSystemAccessTokenMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<CreateSystemAccessTokenMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<CreateSystemAccessTokenMutation>({ document: CreateSystemAccessTokenDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'CreateSystemAccessToken', 'mutation', variables);
    },
    UpdateSystemAccessToken(variables: UpdateSystemAccessTokenMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UpdateSystemAccessTokenMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateSystemAccessTokenMutation>({ document: UpdateSystemAccessTokenDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'UpdateSystemAccessToken', 'mutation', variables);
    },
    RevokeSystemAccessToken(variables: RevokeSystemAccessTokenMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<RevokeSystemAccessTokenMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<RevokeSystemAccessTokenMutation>({ document: RevokeSystemAccessTokenDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'RevokeSystemAccessToken', 'mutation', variables);
    },
    RequestEmailConfirmation(variables: RequestEmailConfirmationMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<RequestEmailConfirmationMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<RequestEmailConfirmationMutation>({ document: RequestEmailConfirmationDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'RequestEmailConfirmation', 'mutation', variables);
    },
    ConfirmEmail(variables: ConfirmEmailMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<ConfirmEmailMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<ConfirmEmailMutation>({ document: ConfirmEmailDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'ConfirmEmail', 'mutation', variables);
    },
    PublicAppConfig(variables?: PublicAppConfigQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<PublicAppConfigQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PublicAppConfigQuery>({ document: PublicAppConfigDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'PublicAppConfig', 'query', variables);
    },
    GetEventsPaginated(variables: GetEventsPaginatedQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetEventsPaginatedQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetEventsPaginatedQuery>({ document: GetEventsPaginatedDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetEventsPaginated', 'query', variables);
    },
    UserNotificationStats(variables?: UserNotificationStatsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UserNotificationStatsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<UserNotificationStatsQuery>({ document: UserNotificationStatsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'UserNotificationStats', 'query', variables);
    },
    UserNotificationStatsByUserId(variables: UserNotificationStatsByUserIdQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UserNotificationStatsByUserIdQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<UserNotificationStatsByUserIdQuery>({ document: UserNotificationStatsByUserIdDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'UserNotificationStatsByUserId', 'query', variables);
    },
    ExecuteWebhook(variables: ExecuteWebhookMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<ExecuteWebhookMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<ExecuteWebhookMutation>({ document: ExecuteWebhookDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'ExecuteWebhook', 'mutation', variables);
    },
    SetBucketSnoozeMinutes(variables: SetBucketSnoozeMinutesMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<SetBucketSnoozeMinutesMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<SetBucketSnoozeMinutesMutation>({ document: SetBucketSnoozeMinutesDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'SetBucketSnoozeMinutes', 'mutation', variables);
    },
    GetPayloadMappers(variables?: GetPayloadMappersQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetPayloadMappersQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetPayloadMappersQuery>({ document: GetPayloadMappersDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetPayloadMappers', 'query', variables);
    },
    GetPayloadMapper(variables: GetPayloadMapperQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetPayloadMapperQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetPayloadMapperQuery>({ document: GetPayloadMapperDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetPayloadMapper', 'query', variables);
    },
    CreatePayloadMapper(variables: CreatePayloadMapperMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<CreatePayloadMapperMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<CreatePayloadMapperMutation>({ document: CreatePayloadMapperDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'CreatePayloadMapper', 'mutation', variables);
    },
    UpdatePayloadMapper(variables: UpdatePayloadMapperMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UpdatePayloadMapperMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdatePayloadMapperMutation>({ document: UpdatePayloadMapperDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'UpdatePayloadMapper', 'mutation', variables);
    },
    DeletePayloadMapper(variables: DeletePayloadMapperMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<DeletePayloadMapperMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeletePayloadMapperMutation>({ document: DeletePayloadMapperDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'DeletePayloadMapper', 'mutation', variables);
    },
    GetEntityExecutions(variables: GetEntityExecutionsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetEntityExecutionsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetEntityExecutionsQuery>({ document: GetEntityExecutionsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetEntityExecutions', 'query', variables);
    },
    GetEntityExecution(variables: GetEntityExecutionQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetEntityExecutionQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetEntityExecutionQuery>({ document: GetEntityExecutionDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetEntityExecution', 'query', variables);
    },
    GetServerSettings(variables?: GetServerSettingsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetServerSettingsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetServerSettingsQuery>({ document: GetServerSettingsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetServerSettings', 'query', variables);
    },
    GetServerSetting(variables: GetServerSettingQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetServerSettingQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetServerSettingQuery>({ document: GetServerSettingDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetServerSetting', 'query', variables);
    },
    UpdateServerSetting(variables: UpdateServerSettingMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UpdateServerSettingMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateServerSettingMutation>({ document: UpdateServerSettingDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'UpdateServerSetting', 'mutation', variables);
    },
    BatchUpdateServerSettings(variables: BatchUpdateServerSettingsMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<BatchUpdateServerSettingsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<BatchUpdateServerSettingsMutation>({ document: BatchUpdateServerSettingsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'BatchUpdateServerSettings', 'mutation', variables);
    },
    RestartServer(variables?: RestartServerMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<RestartServerMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<RestartServerMutation>({ document: RestartServerDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'RestartServer', 'mutation', variables);
    },
    ListBackups(variables?: ListBackupsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<ListBackupsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ListBackupsQuery>({ document: ListBackupsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'ListBackups', 'query', variables);
    },
    DeleteBackup(variables: DeleteBackupMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<DeleteBackupMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteBackupMutation>({ document: DeleteBackupDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'DeleteBackup', 'mutation', variables);
    },
    TriggerBackup(variables?: TriggerBackupMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<TriggerBackupMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<TriggerBackupMutation>({ document: TriggerBackupDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'TriggerBackup', 'mutation', variables);
    },
    GetServerLogs(variables: GetServerLogsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetServerLogsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetServerLogsQuery>({ document: GetServerLogsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetServerLogs', 'query', variables);
    },
    GetTotalLogCount(variables?: GetTotalLogCountQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetTotalLogCountQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetTotalLogCountQuery>({ document: GetTotalLogCountDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetTotalLogCount', 'query', variables);
    },
    TriggerLogCleanup(variables?: TriggerLogCleanupMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<TriggerLogCleanupMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<TriggerLogCleanupMutation>({ document: TriggerLogCleanupDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'TriggerLogCleanup', 'mutation', variables);
    },
    GetMyAdminSubscriptions(variables?: GetMyAdminSubscriptionsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetMyAdminSubscriptionsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetMyAdminSubscriptionsQuery>({ document: GetMyAdminSubscriptionsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetMyAdminSubscriptions', 'query', variables);
    },
    UpsertMyAdminSubscriptions(variables: UpsertMyAdminSubscriptionsMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UpsertMyAdminSubscriptionsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpsertMyAdminSubscriptionsMutation>({ document: UpsertMyAdminSubscriptionsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'UpsertMyAdminSubscriptions', 'mutation', variables);
    },
    UserAttachments(variables: UserAttachmentsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UserAttachmentsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<UserAttachmentsQuery>({ document: UserAttachmentsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'UserAttachments', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;