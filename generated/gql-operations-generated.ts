import { DocumentNode } from 'graphql';
import * as Apollo from '@apollo/client';
import * as ApolloReactHooks from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
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

export type AdminCreateUserInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
  skipEmailConfirmation?: InputMaybe<Scalars['Boolean']['input']>;
  username: Scalars['String']['input'];
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
  iconUrl: Maybe<Scalars['String']['output']>;
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

export type Changelog = {
  __typename?: 'Changelog';
  /** Whether this changelog is active and should be shown */
  active: Scalars['Boolean']['output'];
  /** Android app version */
  androidVersion: Scalars['String']['output'];
  /** Backend/server version */
  backendVersion: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  /** Combined changelog description */
  description: Scalars['String']['output'];
  /** Structured changelog entries (type + text) */
  entries: Maybe<Array<ChangelogEntry>>;
  id: Scalars['ID']['output'];
  /** iOS app version */
  iosVersion: Scalars['String']['output'];
  /** Web/UI version */
  uiVersion: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type ChangelogEntry = {
  __typename?: 'ChangelogEntry';
  text: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type ChangelogEntryInput = {
  text: Scalars['String']['input'];
  type: Scalars['String']['input'];
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
  generateMagicCode?: InputMaybe<Scalars['Boolean']['input']>;
  icon?: InputMaybe<Scalars['String']['input']>;
  isProtected?: InputMaybe<Scalars['Boolean']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
};

export type CreateChangelogInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  androidVersion?: InputMaybe<Scalars['String']['input']>;
  backendVersion?: InputMaybe<Scalars['String']['input']>;
  description: Scalars['String']['input'];
  entries?: InputMaybe<Array<ChangelogEntryInput>>;
  iosVersion?: InputMaybe<Scalars['String']['input']>;
  uiVersion?: InputMaybe<Scalars['String']['input']>;
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
  bucketId?: InputMaybe<Scalars['String']['input']>;
  collapseId?: InputMaybe<Scalars['String']['input']>;
  deliveryType: NotificationDeliveryType;
  executionId?: InputMaybe<Scalars['String']['input']>;
  gifUrl?: InputMaybe<Scalars['String']['input']>;
  groupId?: InputMaybe<Scalars['String']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  locale?: InputMaybe<Scalars['String']['input']>;
  magicCode?: InputMaybe<Scalars['String']['input']>;
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

export type CreateUserLogInput = {
  payload: Scalars['JSON']['input'];
  type: UserLogType;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type CreateUserTemplateDto = {
  body: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  subtitle?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
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
  additionalInfo: Maybe<Scalars['JSON']['output']>;
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
  EmailFailed = 'EMAIL_FAILED',
  EmailSent = 'EMAIL_SENT',
  Login = 'LOGIN',
  LoginOauth = 'LOGIN_OAUTH',
  Logout = 'LOGOUT',
  Message = 'MESSAGE',
  Notification = 'NOTIFICATION',
  NotificationAck = 'NOTIFICATION_ACK',
  NotificationFailed = 'NOTIFICATION_FAILED',
  PushPassthrough = 'PUSH_PASSTHROUGH',
  PushPassthroughFailed = 'PUSH_PASSTHROUGH_FAILED',
  Register = 'REGISTER',
  SystemTokenRequestApproved = 'SYSTEM_TOKEN_REQUEST_APPROVED',
  SystemTokenRequestCreated = 'SYSTEM_TOKEN_REQUEST_CREATED',
  SystemTokenRequestDeclined = 'SYSTEM_TOKEN_REQUEST_DECLINED',
  UserFeedback = 'USER_FEEDBACK'
}

export type EventsQueryDto = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  objectId?: InputMaybe<Scalars['String']['input']>;
  objectIds?: InputMaybe<Array<Scalars['String']['input']>>;
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
  MessageTemplate = 'MESSAGE_TEMPLATE',
  Notification = 'NOTIFICATION',
  PayloadMapper = 'PAYLOAD_MAPPER',
  Webhook = 'WEBHOOK'
}

export type FileInfoDto = {
  __typename?: 'FileInfoDto';
  isDir: Scalars['Boolean']['output'];
  mtime: Scalars['DateTime']['output'];
  name: Scalars['String']['output'];
  size: Scalars['Float']['output'];
};

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

export type GetUserLogsInput = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<UserLogType>;
  userId?: InputMaybe<Scalars['String']['input']>;
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
  executionId: Maybe<Scalars['String']['output']>;
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

export type MobileAppleAuthDto = {
  browser?: InputMaybe<Scalars['String']['input']>;
  deviceName?: InputMaybe<Scalars['String']['input']>;
  identityToken: Scalars['String']['input'];
  osVersion?: InputMaybe<Scalars['String']['input']>;
  payload: Scalars['String']['input'];
  platform?: InputMaybe<Scalars['String']['input']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  adminCreateUser: User;
  adminDeleteUser: Scalars['Boolean']['output'];
  appleConnectMobile: Scalars['Boolean']['output'];
  appleLoginMobile: LoginResponse;
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
  /** Create a new changelog (admin only) */
  createChangelog: Changelog;
  /** Create a new invite code for a resource */
  createInviteCode: InviteCode;
  /** Create a new message and send notifications to bucket users (returns the created message). */
  createMessage: Message;
  createOAuthProvider: OAuthProvider;
  createPayloadMapper: PayloadMapper;
  createSystemAccessTokenRequest: SystemAccessTokenRequest;
  createSystemToken: SystemAccessTokenDto;
  createUserLog: UserLog;
  /** Create a new user template */
  createUserTemplate: UserTemplate;
  createWebhook: UserWebhook;
  declineSystemAccessTokenRequest: SystemAccessTokenRequest;
  deleteAccount: Scalars['Boolean']['output'];
  deleteAttachment: Scalars['Boolean']['output'];
  /** Delete a specific backup file */
  deleteBackup: Scalars['Boolean']['output'];
  deleteBucket: Scalars['Boolean']['output'];
  /** Delete a changelog (admin only) */
  deleteChangelog: Scalars['Boolean']['output'];
  /** Delete an invite code */
  deleteInviteCode: Scalars['Boolean']['output'];
  deleteMagicCode: UserBucket;
  deleteNotification: Scalars['Boolean']['output'];
  deleteOAuthProvider: Scalars['Boolean']['output'];
  deletePayloadMapper: Scalars['Boolean']['output'];
  deleteServerFile: Scalars['Boolean']['output'];
  /** Delete user template by ID */
  deleteUserTemplate: Scalars['Boolean']['output'];
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
  regenerateMagicCode: UserBucket;
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
  /** Update an existing changelog (admin only) */
  updateChangelog: Changelog;
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
  updateUserBucketCustomName: UserBucket;
  updateUserDevice: UserDevice;
  updateUserRole: User;
  /** Update user template by ID */
  updateUserTemplate: UserTemplate;
  updateWebhook: UserWebhook;
  upsertMyAdminSubscription: Array<Scalars['String']['output']>;
  upsertUserSetting: UserSetting;
  validateResetToken: Scalars['Boolean']['output'];
};


export type MutationAdminCreateUserArgs = {
  input: AdminCreateUserInput;
};


export type MutationAdminDeleteUserArgs = {
  userId: Scalars['String']['input'];
};


export type MutationAppleConnectMobileArgs = {
  input: MobileAppleAuthDto;
};


export type MutationAppleLoginMobileArgs = {
  input: MobileAppleAuthDto;
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


export type MutationCreateChangelogArgs = {
  input: CreateChangelogInput;
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
  scopes?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationCreateUserLogArgs = {
  input: CreateUserLogInput;
};


export type MutationCreateUserTemplateArgs = {
  input: CreateUserTemplateDto;
};


export type MutationCreateWebhookArgs = {
  input: CreateWebhookDto;
};


export type MutationDeclineSystemAccessTokenRequestArgs = {
  id: Scalars['String']['input'];
  input?: InputMaybe<DeclineSystemAccessTokenRequestDto>;
};


export type MutationDeleteAttachmentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteBackupArgs = {
  filename: Scalars['String']['input'];
};


export type MutationDeleteBucketArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteChangelogArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteInviteCodeArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteMagicCodeArgs = {
  bucketId: Scalars['String']['input'];
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


export type MutationDeleteServerFileArgs = {
  name: Scalars['String']['input'];
  path?: InputMaybe<Scalars['String']['input']>;
};


export type MutationDeleteUserTemplateArgs = {
  id: Scalars['ID']['input'];
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


export type MutationRegenerateMagicCodeArgs = {
  bucketId: Scalars['String']['input'];
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


export type MutationUpdateChangelogArgs = {
  input: UpdateChangelogInput;
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
  scopes?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationUpdateUserBucketCustomNameArgs = {
  bucketId: Scalars['String']['input'];
  customName?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpdateUserDeviceArgs = {
  input: UpdateUserDeviceInput;
};


export type MutationUpdateUserRoleArgs = {
  input: UpdateUserRoleInput;
};


export type MutationUpdateUserTemplateArgs = {
  id: Scalars['ID']['input'];
  input: UpdateUserTemplateDto;
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
  NoPush = 'NO_PUSH',
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
  providerKey: Scalars['String']['output'];
  textColor: Maybe<Scalars['String']['output']>;
  type: OAuthProviderType;
};

/** Type of OAuth provider (GitHub, Google, Discord, Apple, Facebook, Microsoft, or custom) */
export enum OAuthProviderType {
  Apple = 'APPLE',
  AppleSignin = 'APPLE_SIGNIN',
  Custom = 'CUSTOM',
  Discord = 'DISCORD',
  Facebook = 'FACEBOOK',
  Github = 'GITHUB',
  Google = 'GOOGLE',
  Local = 'LOCAL',
  Microsoft = 'MICROSOFT'
}

export type PaginatedLogs = {
  __typename?: 'PaginatedLogs';
  limit: Scalars['Int']['output'];
  logs: Array<Log>;
  page: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  totalPages: Scalars['Int']['output'];
};

export type PaginatedUserLogs = {
  __typename?: 'PaginatedUserLogs';
  limit: Scalars['Int']['output'];
  logs: Array<UserLogEntry>;
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
  iconUploaderEnabled: Scalars['Boolean']['output'];
  localRegistrationEnabled: Scalars['Boolean']['output'];
  oauthProviders: Array<OAuthProviderPublicDto>;
  socialLoginEnabled: Scalars['Boolean']['output'];
  socialRegistrationEnabled: Scalars['Boolean']['output'];
  systemTokenRequestsEnabled: Scalars['Boolean']['output'];
  uploadEnabled: Scalars['Boolean']['output'];
};

export type Query = {
  __typename?: 'Query';
  /** List all changelogs (admin, includes inactive) */
  adminChangelogs: Array<Changelog>;
  allOAuthProviders: Array<OAuthProvider>;
  attachment: Attachment;
  bucket: Bucket;
  bucketPermissions: Array<EntityPermission>;
  buckets: Array<Bucket>;
  /** Get a specific changelog by id (public) */
  changelog: Changelog;
  /** List all changelogs (public) */
  changelogs: Array<Changelog>;
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
  serverFiles: Array<FileInfoDto>;
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
  /** Get user logs with pagination and filtering */
  userLogs: PaginatedUserLogs;
  userNotificationStats: UserNotificationStats;
  userSettings: Array<UserSetting>;
  /** Get user template by ID */
  userTemplate: UserTemplate;
  /** Get all user templates for the authenticated user */
  userTemplates: Array<UserTemplate>;
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


export type QueryChangelogArgs = {
  id: Scalars['ID']['input'];
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


export type QueryServerFilesArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
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


export type QueryUserLogsArgs = {
  input: GetUserLogsInput;
};


export type QueryUserNotificationStatsArgs = {
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryUserSettingsArgs = {
  deviceId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryUserTemplateArgs = {
  id: Scalars['ID']['input'];
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
  ChangelogRemoteServer = 'ChangelogRemoteServer',
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
  EnableSystemTokenRequests = 'EnableSystemTokenRequests',
  FirebaseClientEmail = 'FirebaseClientEmail',
  FirebasePrivateKey = 'FirebasePrivateKey',
  FirebaseProjectId = 'FirebaseProjectId',
  FirebasePush = 'FirebasePush',
  IconUploaderEnabled = 'IconUploaderEnabled',
  JwtAccessTokenExpiration = 'JwtAccessTokenExpiration',
  JwtRefreshSecret = 'JwtRefreshSecret',
  JwtRefreshTokenExpiration = 'JwtRefreshTokenExpiration',
  JwtSecret = 'JwtSecret',
  LocalRegistrationEnabled = 'LocalRegistrationEnabled',
  LogLevel = 'LogLevel',
  LogRetentionDays = 'LogRetentionDays',
  LogStorageDirectory = 'LogStorageDirectory',
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
  ServerFilesDirectory = 'ServerFilesDirectory',
  ServerStableIdentifier = 'ServerStableIdentifier',
  SocialLoginEnabled = 'SocialLoginEnabled',
  SocialRegistrationEnabled = 'SocialRegistrationEnabled',
  SystemTokenUsageStats = 'SystemTokenUsageStats',
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
  loginProvider: Maybe<OAuthProviderType>;
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
  failedCalls: Scalars['Float']['output'];
  id: Scalars['String']['output'];
  lastResetAt: Maybe<Scalars['DateTime']['output']>;
  maxCalls: Scalars['Float']['output'];
  requester: Maybe<User>;
  requesterId: Maybe<Scalars['String']['output']>;
  requesterIdentifier: Maybe<Scalars['String']['output']>;
  scopes: Maybe<Array<Scalars['String']['output']>>;
  token: Maybe<Scalars['String']['output']>;
  tokenHash: Scalars['String']['output'];
  totalCalls: Scalars['Float']['output'];
  totalFailedCalls: Scalars['Float']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type SystemAccessTokenDto = {
  __typename?: 'SystemAccessTokenDto';
  calls: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  description: Maybe<Scalars['String']['output']>;
  expiresAt: Maybe<Scalars['DateTime']['output']>;
  failedCalls: Scalars['Float']['output'];
  id: Scalars['String']['output'];
  lastResetAt: Maybe<Scalars['DateTime']['output']>;
  maxCalls: Scalars['Float']['output'];
  rawToken: Maybe<Scalars['String']['output']>;
  requester: Maybe<User>;
  scopes: Maybe<Array<Scalars['String']['output']>>;
  token: Maybe<Scalars['String']['output']>;
  totalCalls: Scalars['Float']['output'];
  totalFailedCalls: Scalars['Float']['output'];
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

export type UpdateChangelogInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  androidVersion?: InputMaybe<Scalars['String']['input']>;
  backendVersion?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  entries?: InputMaybe<Array<ChangelogEntryInput>>;
  id: Scalars['ID']['input'];
  iosVersion?: InputMaybe<Scalars['String']['input']>;
  uiVersion?: InputMaybe<Scalars['String']['input']>;
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
  /** Optional JSON-serialized metadata for the device (app versions, build info, etc.) */
  metadata?: InputMaybe<Scalars['String']['input']>;
  osVersion?: InputMaybe<Scalars['String']['input']>;
  subscriptionFields?: InputMaybe<WebPushSubscriptionFieldsInput>;
};

export type UpdateUserRoleInput = {
  role: UserRole;
  userId: Scalars['String']['input'];
};

export type UpdateUserTemplateDto = {
  body?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  subtitle?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
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
  templates: Maybe<Array<UserTemplate>>;
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
  customName: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  magicCode: Maybe<Scalars['String']['output']>;
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
  /** Optional JSON-serialized metadata for the device (app versions, build info, etc.) */
  metadata: Maybe<Scalars['String']['output']>;
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
  metadata: Maybe<Scalars['String']['output']>;
  providerType: Maybe<OAuthProviderType>;
  updatedAt: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['String']['output'];
};

export type UserLog = {
  __typename?: 'UserLog';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  payload: Scalars['JSON']['output'];
  type: UserLogType;
  userId: Maybe<Scalars['String']['output']>;
};

export type UserLogEntry = {
  __typename?: 'UserLogEntry';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  payload: Scalars['JSON']['output'];
  type: UserLogType;
  userId: Maybe<Scalars['String']['output']>;
};

/** Type of user log entry */
export enum UserLogType {
  AppLog = 'APP_LOG',
  Feedback = 'FEEDBACK'
}

export type UserNotificationStats = {
  __typename?: 'UserNotificationStats';
  last7Days: Scalars['Float']['output'];
  last7DaysAcked: Scalars['Float']['output'];
  last30Days: Scalars['Float']['output'];
  last30DaysAcked: Scalars['Float']['output'];
  thisMonth: Scalars['Float']['output'];
  thisMonthAcked: Scalars['Float']['output'];
  thisWeek: Scalars['Float']['output'];
  thisWeekAcked: Scalars['Float']['output'];
  today: Scalars['Float']['output'];
  todayAcked: Scalars['Float']['output'];
  total: Scalars['Float']['output'];
  totalAcked: Scalars['Float']['output'];
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
  exchangeCode: Maybe<Scalars['String']['output']>;
  exchangeCodeRequestedAt: Maybe<Scalars['DateTime']['output']>;
  expiresAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  ipAddress: Maybe<Scalars['String']['output']>;
  isActive: Scalars['Boolean']['output'];
  lastActivity: Maybe<Scalars['DateTime']['output']>;
  loginProvider: Maybe<OAuthProviderType>;
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
  ServerStableIdentifier = 'ServerStableIdentifier',
  Timezone = 'Timezone',
  UnencryptOnBigPayload = 'UnencryptOnBigPayload'
}

export type UserTemplate = {
  __typename?: 'UserTemplate';
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  description: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  input: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  output: Maybe<Scalars['String']['output']>;
  subtitle: Maybe<Scalars['String']['output']>;
  title: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['String']['output'];
};

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

export type GetEventsQueryVariables = Exact<{
  query: EventsQueryDto;
}>;


export type GetEventsQuery = { __typename?: 'Query', events: { __typename?: 'EventsResponseDto', total: number, page: number, limit: number, totalPages: number, hasNextPage: boolean, events: Array<{ __typename?: 'Event', id: string, type: EventType, userId: string | null, objectId: string | null, targetId: string | null, additionalInfo: any | null, createdAt: string }> } };

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

export type MessageFragment = { __typename?: 'Message', id: string, title: string, body: string | null, subtitle: string | null, sound: string | null, deliveryType: NotificationDeliveryType, locale: string | null, snoozes: Array<number> | null, executionId: string | null, createdAt: string, updatedAt: string, attachments: Array<{ __typename?: 'MessageAttachment', mediaType: MediaType, url: string | null, name: string | null, attachmentUuid: string | null, saveOnServer: boolean | null }> | null, tapAction: { __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null } | null, actions: Array<{ __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null }> | null, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } };

export type NotificationFragment = { __typename?: 'Notification', id: string, receivedAt: string | null, readAt: string | null, sentAt: string | null, createdAt: string, updatedAt: string, message: { __typename?: 'Message', id: string, title: string, body: string | null, subtitle: string | null, sound: string | null, deliveryType: NotificationDeliveryType, locale: string | null, snoozes: Array<number> | null, executionId: string | null, createdAt: string, updatedAt: string, attachments: Array<{ __typename?: 'MessageAttachment', mediaType: MediaType, url: string | null, name: string | null, attachmentUuid: string | null, saveOnServer: boolean | null }> | null, tapAction: { __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null } | null, actions: Array<{ __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null }> | null, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } };

export type BucketPermissionsFragment = { __typename?: 'BucketPermissionsDto', canWrite: boolean, canDelete: boolean, canAdmin: boolean, canRead: boolean, isOwner: boolean, isSharedWithMe: boolean, sharedCount: number };

export type BucketFragment = { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null };

export type BucketWithDevicesFragment = { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, permissions: Array<{ __typename?: 'EntityPermission', id: string, resourceType: string, resourceId: string, permissions: Array<Permission>, expiresAt: string | null, createdAt: string, updatedAt: string, inviteCodeId: string | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, grantedBy: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null } | null }>, userBucket: { __typename?: 'UserBucket', id: string, userId: string, bucketId: string, magicCode: string | null, customName: string | null, snoozeUntil: string | null, createdAt: string, updatedAt: string, snoozes: Array<{ __typename?: 'SnoozeSchedule', days: Array<string>, timeFrom: string, timeTill: string, isEnabled: boolean }> | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } | null, userPermissions: { __typename?: 'BucketPermissionsDto', canWrite: boolean, canDelete: boolean, canAdmin: boolean, canRead: boolean, isOwner: boolean, isSharedWithMe: boolean, sharedCount: number } };

export type BucketFullFragment = { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, messages: Array<{ __typename?: 'Message', id: string, title: string, body: string | null, subtitle: string | null, sound: string | null, deliveryType: NotificationDeliveryType, locale: string | null, snoozes: Array<number> | null, executionId: string | null, createdAt: string, updatedAt: string, attachments: Array<{ __typename?: 'MessageAttachment', mediaType: MediaType, url: string | null, name: string | null, attachmentUuid: string | null, saveOnServer: boolean | null }> | null, tapAction: { __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null } | null, actions: Array<{ __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null }> | null, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } }> | null, permissions: Array<{ __typename?: 'EntityPermission', id: string, resourceType: string, resourceId: string, permissions: Array<Permission>, expiresAt: string | null, createdAt: string, updatedAt: string, inviteCodeId: string | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, grantedBy: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null } | null }>, userBucket: { __typename?: 'UserBucket', id: string, userId: string, bucketId: string, magicCode: string | null, customName: string | null, snoozeUntil: string | null, createdAt: string, updatedAt: string, snoozes: Array<{ __typename?: 'SnoozeSchedule', days: Array<string>, timeFrom: string, timeTill: string, isEnabled: boolean }> | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } | null, userPermissions: { __typename?: 'BucketPermissionsDto', canWrite: boolean, canDelete: boolean, canAdmin: boolean, canRead: boolean, isOwner: boolean, isSharedWithMe: boolean, sharedCount: number } };

export type UserFragment = { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null };

export type UserIdentityFragment = { __typename?: 'UserIdentity', id: string, providerType: OAuthProviderType | null, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string };

export type GetMyIdentitiesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMyIdentitiesQuery = { __typename?: 'Query', me: { __typename?: 'User', id: string, identities: Array<{ __typename?: 'UserIdentity', id: string, providerType: OAuthProviderType | null, email: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string }> | null } };

export type UserDeviceFragment = { __typename?: 'UserDevice', id: string, deviceToken: string | null, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, metadata: string | null, lastUsed: string, createdAt: string, updatedAt: string, publicKey: string | null, privateKey: string | null, onlyLocal: boolean };

export type UserWebhookFragment = { __typename?: 'UserWebhook', id: string, name: string, method: HttpMethod, url: string, body: any | null, createdAt: string, updatedAt: string, headers: Array<{ __typename?: 'WebhookHeader', key: string, value: string }>, user: { __typename?: 'User', id: string } };

export type GetNotificationsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetNotificationsQuery = { __typename?: 'Query', notifications: Array<{ __typename?: 'Notification', id: string, receivedAt: string | null, readAt: string | null, sentAt: string | null, createdAt: string, updatedAt: string, message: { __typename?: 'Message', id: string, title: string, body: string | null, subtitle: string | null, sound: string | null, deliveryType: NotificationDeliveryType, locale: string | null, snoozes: Array<number> | null, executionId: string | null, createdAt: string, updatedAt: string, attachments: Array<{ __typename?: 'MessageAttachment', mediaType: MediaType, url: string | null, name: string | null, attachmentUuid: string | null, saveOnServer: boolean | null }> | null, tapAction: { __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null } | null, actions: Array<{ __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null }> | null, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } }> };

export type GetNotificationQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetNotificationQuery = { __typename?: 'Query', notification: { __typename?: 'Notification', id: string, receivedAt: string | null, readAt: string | null, sentAt: string | null, createdAt: string, updatedAt: string, message: { __typename?: 'Message', id: string, title: string, body: string | null, subtitle: string | null, sound: string | null, deliveryType: NotificationDeliveryType, locale: string | null, snoozes: Array<number> | null, executionId: string | null, createdAt: string, updatedAt: string, attachments: Array<{ __typename?: 'MessageAttachment', mediaType: MediaType, url: string | null, name: string | null, attachmentUuid: string | null, saveOnServer: boolean | null }> | null, tapAction: { __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null } | null, actions: Array<{ __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null }> | null, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } } };

export type ChangelogForModalFragment = { __typename?: 'Changelog', id: string, iosVersion: string, androidVersion: string, uiVersion: string, backendVersion: string, description: string, createdAt: string, entries: Array<{ __typename?: 'ChangelogEntry', type: string, text: string }> | null };

export type ChangelogsForModalQueryVariables = Exact<{ [key: string]: never; }>;


export type ChangelogsForModalQuery = { __typename?: 'Query', changelogs: Array<{ __typename?: 'Changelog', id: string, iosVersion: string, androidVersion: string, uiVersion: string, backendVersion: string, description: string, createdAt: string, entries: Array<{ __typename?: 'ChangelogEntry', type: string, text: string }> | null }> };

export type AdminChangelogsQueryVariables = Exact<{ [key: string]: never; }>;


export type AdminChangelogsQuery = { __typename?: 'Query', adminChangelogs: Array<{ __typename?: 'Changelog', active: boolean, id: string, iosVersion: string, androidVersion: string, uiVersion: string, backendVersion: string, description: string, createdAt: string, entries: Array<{ __typename?: 'ChangelogEntry', type: string, text: string }> | null }> };

export type ChangelogQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ChangelogQuery = { __typename?: 'Query', changelog: { __typename?: 'Changelog', active: boolean, id: string, iosVersion: string, androidVersion: string, uiVersion: string, backendVersion: string, description: string, createdAt: string, entries: Array<{ __typename?: 'ChangelogEntry', type: string, text: string }> | null } };

export type CreateChangelogMutationVariables = Exact<{
  input: CreateChangelogInput;
}>;


export type CreateChangelogMutation = { __typename?: 'Mutation', createChangelog: { __typename?: 'Changelog', id: string } };

export type UpdateChangelogMutationVariables = Exact<{
  input: UpdateChangelogInput;
}>;


export type UpdateChangelogMutation = { __typename?: 'Mutation', updateChangelog: { __typename?: 'Changelog', id: string } };

export type CreateMessageMutationVariables = Exact<{
  input: CreateMessageDto;
}>;


export type CreateMessageMutation = { __typename?: 'Mutation', createMessage: { __typename?: 'Message', id: string, title: string, body: string | null, subtitle: string | null, sound: string | null, deliveryType: NotificationDeliveryType, locale: string | null, snoozes: Array<number> | null, executionId: string | null, createdAt: string, updatedAt: string, attachments: Array<{ __typename?: 'MessageAttachment', mediaType: MediaType, url: string | null, name: string | null, attachmentUuid: string | null, saveOnServer: boolean | null }> | null, tapAction: { __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null } | null, actions: Array<{ __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null }> | null, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } };

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


export type GetBucketsQuery = { __typename?: 'Query', buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, permissions: Array<{ __typename?: 'EntityPermission', id: string, resourceType: string, resourceId: string, permissions: Array<Permission>, expiresAt: string | null, createdAt: string, updatedAt: string, inviteCodeId: string | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, grantedBy: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null } | null }>, userBucket: { __typename?: 'UserBucket', id: string, userId: string, bucketId: string, magicCode: string | null, customName: string | null, snoozeUntil: string | null, createdAt: string, updatedAt: string, snoozes: Array<{ __typename?: 'SnoozeSchedule', days: Array<string>, timeFrom: string, timeTill: string, isEnabled: boolean }> | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } | null, userPermissions: { __typename?: 'BucketPermissionsDto', canWrite: boolean, canDelete: boolean, canAdmin: boolean, canRead: boolean, isOwner: boolean, isSharedWithMe: boolean, sharedCount: number } }> };

export type GetBucketQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetBucketQuery = { __typename?: 'Query', bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, messages: Array<{ __typename?: 'Message', id: string, title: string, body: string | null, subtitle: string | null, sound: string | null, deliveryType: NotificationDeliveryType, locale: string | null, snoozes: Array<number> | null, executionId: string | null, createdAt: string, updatedAt: string, attachments: Array<{ __typename?: 'MessageAttachment', mediaType: MediaType, url: string | null, name: string | null, attachmentUuid: string | null, saveOnServer: boolean | null }> | null, tapAction: { __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null } | null, actions: Array<{ __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null }> | null, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } }> | null, permissions: Array<{ __typename?: 'EntityPermission', id: string, resourceType: string, resourceId: string, permissions: Array<Permission>, expiresAt: string | null, createdAt: string, updatedAt: string, inviteCodeId: string | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, grantedBy: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null } | null }>, userBucket: { __typename?: 'UserBucket', id: string, userId: string, bucketId: string, magicCode: string | null, customName: string | null, snoozeUntil: string | null, createdAt: string, updatedAt: string, snoozes: Array<{ __typename?: 'SnoozeSchedule', days: Array<string>, timeFrom: string, timeTill: string, isEnabled: boolean }> | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } | null, userPermissions: { __typename?: 'BucketPermissionsDto', canWrite: boolean, canDelete: boolean, canAdmin: boolean, canRead: boolean, isOwner: boolean, isSharedWithMe: boolean, sharedCount: number } } };

export type CreateBucketMutationVariables = Exact<{
  input: CreateBucketDto;
}>;


export type CreateBucketMutation = { __typename?: 'Mutation', createBucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, permissions: Array<{ __typename?: 'EntityPermission', id: string, resourceType: string, resourceId: string, permissions: Array<Permission>, expiresAt: string | null, createdAt: string, updatedAt: string, inviteCodeId: string | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, grantedBy: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null } | null }>, userBucket: { __typename?: 'UserBucket', id: string, userId: string, bucketId: string, magicCode: string | null, customName: string | null, snoozeUntil: string | null, createdAt: string, updatedAt: string, snoozes: Array<{ __typename?: 'SnoozeSchedule', days: Array<string>, timeFrom: string, timeTill: string, isEnabled: boolean }> | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } | null, userPermissions: { __typename?: 'BucketPermissionsDto', canWrite: boolean, canDelete: boolean, canAdmin: boolean, canRead: boolean, isOwner: boolean, isSharedWithMe: boolean, sharedCount: number } } };

export type UpdateReceivedNotificationsMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type UpdateReceivedNotificationsMutation = { __typename?: 'Mutation', updateReceivedNotifications: { __typename?: 'UpdateReceivedResult', updatedCount: number, success: boolean } };

export type UpdateBucketMutationVariables = Exact<{
  id: Scalars['String']['input'];
  input: UpdateBucketDto;
}>;


export type UpdateBucketMutation = { __typename?: 'Mutation', updateBucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, permissions: Array<{ __typename?: 'EntityPermission', id: string, resourceType: string, resourceId: string, permissions: Array<Permission>, expiresAt: string | null, createdAt: string, updatedAt: string, inviteCodeId: string | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, grantedBy: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null } | null }>, userBucket: { __typename?: 'UserBucket', id: string, userId: string, bucketId: string, magicCode: string | null, customName: string | null, snoozeUntil: string | null, createdAt: string, updatedAt: string, snoozes: Array<{ __typename?: 'SnoozeSchedule', days: Array<string>, timeFrom: string, timeTill: string, isEnabled: boolean }> | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } | null, userPermissions: { __typename?: 'BucketPermissionsDto', canWrite: boolean, canDelete: boolean, canAdmin: boolean, canRead: boolean, isOwner: boolean, isSharedWithMe: boolean, sharedCount: number } } };

export type DeleteBucketMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type DeleteBucketMutation = { __typename?: 'Mutation', deleteBucket: boolean };

export type BucketPermissionsQueryVariables = Exact<{
  bucketId: Scalars['String']['input'];
}>;


export type BucketPermissionsQuery = { __typename?: 'Query', bucketPermissions: Array<{ __typename?: 'EntityPermission', id: string, resourceType: string, resourceId: string, permissions: Array<Permission>, expiresAt: string | null, createdAt: string, updatedAt: string, inviteCodeId: string | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, grantedBy: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null } | null }> };

export type ShareBucketMutationVariables = Exact<{
  input: GrantEntityPermissionInput;
}>;


export type ShareBucketMutation = { __typename?: 'Mutation', shareBucket: { __typename?: 'EntityPermission', id: string, resourceType: string, resourceId: string, permissions: Array<Permission>, expiresAt: string | null, createdAt: string, updatedAt: string, inviteCodeId: string | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, grantedBy: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null } | null } };

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


export type GetMeQuery = { __typename?: 'Query', me: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null, deviceToken: string | null, publicKey: string | null, privateKey: string | null }> | null, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null } };

export type UserSettingFragment = { __typename?: 'UserSetting', id: string, userId: string, deviceId: string | null, configType: UserSettingType, valueText: string | null, valueBool: boolean | null, createdAt: string, updatedAt: string };

export type GetUserSettingsQueryVariables = Exact<{
  deviceId?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetUserSettingsQuery = { __typename?: 'Query', userSettings: Array<{ __typename?: 'UserSetting', id: string, userId: string, deviceId: string | null, configType: UserSettingType, valueText: string | null, valueBool: boolean | null, createdAt: string, updatedAt: string }> };

export type UpsertUserSettingMutationVariables = Exact<{
  input: UpsertUserSettingInput;
}>;


export type UpsertUserSettingMutation = { __typename?: 'Mutation', upsertUserSetting: { __typename?: 'UserSetting', id: string, userId: string, deviceId: string | null, configType: UserSettingType, valueText: string | null, valueBool: boolean | null, createdAt: string, updatedAt: string } };

export type AppleLoginMobileMutationVariables = Exact<{
  input: MobileAppleAuthDto;
}>;


export type AppleLoginMobileMutation = { __typename?: 'Mutation', appleLoginMobile: { __typename?: 'LoginResponse', accessToken: string, refreshToken: string, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null } } };

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


export type UpdateProfileMutation = { __typename?: 'Mutation', updateProfile: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null } };

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


export type NotificationCreatedSubscription = { __typename?: 'Subscription', notificationCreated: { __typename?: 'Notification', id: string, receivedAt: string | null, readAt: string | null, sentAt: string | null, createdAt: string, updatedAt: string, message: { __typename?: 'Message', id: string, title: string, body: string | null, subtitle: string | null, sound: string | null, deliveryType: NotificationDeliveryType, locale: string | null, snoozes: Array<number> | null, executionId: string | null, createdAt: string, updatedAt: string, attachments: Array<{ __typename?: 'MessageAttachment', mediaType: MediaType, url: string | null, name: string | null, attachmentUuid: string | null, saveOnServer: boolean | null }> | null, tapAction: { __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null } | null, actions: Array<{ __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null }> | null, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } } };

export type NotificationUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type NotificationUpdatedSubscription = { __typename?: 'Subscription', notificationUpdated: { __typename?: 'Notification', readAt: string | null, id: string, receivedAt: string | null, sentAt: string | null, createdAt: string, updatedAt: string, message: { __typename?: 'Message', id: string, title: string, body: string | null, subtitle: string | null, sound: string | null, deliveryType: NotificationDeliveryType, locale: string | null, snoozes: Array<number> | null, executionId: string | null, createdAt: string, updatedAt: string, attachments: Array<{ __typename?: 'MessageAttachment', mediaType: MediaType, url: string | null, name: string | null, attachmentUuid: string | null, saveOnServer: boolean | null }> | null, tapAction: { __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null } | null, actions: Array<{ __typename?: 'NotificationAction', type: NotificationActionType, value: string | null, title: string | null, icon: string | null, destructive: boolean | null }> | null, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } } };

export type NotificationDeletedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type NotificationDeletedSubscription = { __typename?: 'Subscription', notificationDeleted: string };

export type BucketCreatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type BucketCreatedSubscription = { __typename?: 'Subscription', bucketCreated: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } };

export type BucketUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type BucketUpdatedSubscription = { __typename?: 'Subscription', bucketUpdated: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } };

export type BucketDeletedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type BucketDeletedSubscription = { __typename?: 'Subscription', bucketDeleted: string };

export type UserProfileUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type UserProfileUpdatedSubscription = { __typename?: 'Subscription', userProfileUpdated: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null } };

export type UserPasswordChangedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type UserPasswordChangedSubscription = { __typename?: 'Subscription', userPasswordChanged: boolean };

export type GetUserDevicesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserDevicesQuery = { __typename?: 'Query', userDevices: Array<{ __typename?: 'UserDevice', id: string, deviceToken: string | null, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, metadata: string | null, lastUsed: string, createdAt: string, updatedAt: string, publicKey: string | null, privateKey: string | null, onlyLocal: boolean }> };

export type GetUserDeviceQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserDeviceQuery = { __typename?: 'Query', userDevice: { __typename?: 'UserDevice', id: string, deviceToken: string | null, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, metadata: string | null, lastUsed: string, createdAt: string, updatedAt: string, publicKey: string | null, privateKey: string | null, onlyLocal: boolean } | null };

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

export type SessionInfoFragment = { __typename?: 'SessionInfoDto', id: string, deviceName: string | null, operatingSystem: string | null, browser: string | null, ipAddress: string | null, location: string | null, lastActivity: string, expiresAt: string, isCurrent: boolean, isActive: boolean, createdAt: string, loginProvider: OAuthProviderType | null };

export type GetUserAccessTokensQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserAccessTokensQuery = { __typename?: 'Query', getUserAccessTokens: Array<{ __typename?: 'AccessTokenListDto', id: string, name: string, expiresAt: string | null, createdAt: string, lastUsed: string | null, isExpired: boolean, token: string | null, scopes: Array<string> | null }> };

export type GetUserSessionsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserSessionsQuery = { __typename?: 'Query', getUserSessions: Array<{ __typename?: 'SessionInfoDto', id: string, deviceName: string | null, operatingSystem: string | null, browser: string | null, ipAddress: string | null, location: string | null, lastActivity: string, expiresAt: string, isCurrent: boolean, isActive: boolean, createdAt: string, loginProvider: OAuthProviderType | null }> };

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


export type RegisterDeviceMutation = { __typename?: 'Mutation', registerDevice: { __typename?: 'UserDevice', id: string, deviceToken: string | null, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, metadata: string | null, lastUsed: string, createdAt: string, updatedAt: string, publicKey: string | null, privateKey: string | null, onlyLocal: boolean } };

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

export type EntityPermissionFragment = { __typename?: 'EntityPermission', id: string, resourceType: string, resourceId: string, permissions: Array<Permission>, expiresAt: string | null, createdAt: string, updatedAt: string, inviteCodeId: string | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, grantedBy: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null } | null };

export type OAuthProviderPublicFragment = { __typename?: 'OAuthProviderPublicDto', id: string, name: string, type: OAuthProviderType, iconUrl: string | null, color: string | null, textColor: string | null, providerKey: string };

export type OAuthProviderFragment = { __typename?: 'OAuthProvider', id: string, name: string, type: OAuthProviderType, clientId: string, clientSecret: string, scopes: Array<string>, iconUrl: string | null, color: string | null, textColor: string | null, isEnabled: boolean, authorizationUrl: string | null, tokenUrl: string | null, userInfoUrl: string | null, profileFields: Array<string> | null, additionalConfig: string | null, createdAt: string, updatedAt: string };

export type GetResourcePermissionsQueryVariables = Exact<{
  input: GetResourcePermissionsInput;
}>;


export type GetResourcePermissionsQuery = { __typename?: 'Query', getResourcePermissions: Array<{ __typename?: 'EntityPermission', id: string, resourceType: string, resourceId: string, permissions: Array<Permission>, expiresAt: string | null, createdAt: string, updatedAt: string, inviteCodeId: string | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, grantedBy: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null } | null }> };

export type GrantEntityPermissionMutationVariables = Exact<{
  input: GrantEntityPermissionInput;
}>;


export type GrantEntityPermissionMutation = { __typename?: 'Mutation', grantEntityPermission: { __typename?: 'EntityPermission', id: string, resourceType: string, resourceId: string, permissions: Array<Permission>, expiresAt: string | null, createdAt: string, updatedAt: string, inviteCodeId: string | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, grantedBy: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null } | null } };

export type RevokeEntityPermissionMutationVariables = Exact<{
  input: RevokeEntityPermissionInput;
}>;


export type RevokeEntityPermissionMutation = { __typename?: 'Mutation', revokeEntityPermission: boolean };

export type CleanupExpiredPermissionsMutationVariables = Exact<{ [key: string]: never; }>;


export type CleanupExpiredPermissionsMutation = { __typename?: 'Mutation', cleanupExpiredPermissions: number };

export type AllOAuthProvidersQueryVariables = Exact<{ [key: string]: never; }>;


export type AllOAuthProvidersQuery = { __typename?: 'Query', allOAuthProviders: Array<{ __typename?: 'OAuthProvider', id: string, name: string, type: OAuthProviderType, clientId: string, clientSecret: string, scopes: Array<string>, iconUrl: string | null, color: string | null, textColor: string | null, isEnabled: boolean, authorizationUrl: string | null, tokenUrl: string | null, userInfoUrl: string | null, profileFields: Array<string> | null, additionalConfig: string | null, createdAt: string, updatedAt: string }> };

export type OAuthProviderQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type OAuthProviderQuery = { __typename?: 'Query', oauthProvider: { __typename?: 'OAuthProvider', id: string, name: string, type: OAuthProviderType, clientId: string, clientSecret: string, scopes: Array<string>, iconUrl: string | null, color: string | null, textColor: string | null, isEnabled: boolean, authorizationUrl: string | null, tokenUrl: string | null, userInfoUrl: string | null, profileFields: Array<string> | null, additionalConfig: string | null, createdAt: string, updatedAt: string } };

export type CreateOAuthProviderMutationVariables = Exact<{
  input: CreateOAuthProviderDto;
}>;


export type CreateOAuthProviderMutation = { __typename?: 'Mutation', createOAuthProvider: { __typename?: 'OAuthProvider', id: string, name: string, type: OAuthProviderType, clientId: string, clientSecret: string, scopes: Array<string>, iconUrl: string | null, color: string | null, textColor: string | null, isEnabled: boolean, authorizationUrl: string | null, tokenUrl: string | null, userInfoUrl: string | null, profileFields: Array<string> | null, additionalConfig: string | null, createdAt: string, updatedAt: string } };

export type UpdateOAuthProviderMutationVariables = Exact<{
  id: Scalars['String']['input'];
  input: UpdateOAuthProviderDto;
}>;


export type UpdateOAuthProviderMutation = { __typename?: 'Mutation', updateOAuthProvider: { __typename?: 'OAuthProvider', id: string, name: string, type: OAuthProviderType, clientId: string, clientSecret: string, scopes: Array<string>, iconUrl: string | null, color: string | null, textColor: string | null, isEnabled: boolean, authorizationUrl: string | null, tokenUrl: string | null, userInfoUrl: string | null, profileFields: Array<string> | null, additionalConfig: string | null, createdAt: string, updatedAt: string } };

export type ToggleOAuthProviderMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type ToggleOAuthProviderMutation = { __typename?: 'Mutation', toggleOAuthProvider: { __typename?: 'OAuthProvider', id: string, name: string, type: OAuthProviderType, clientId: string, clientSecret: string, scopes: Array<string>, iconUrl: string | null, color: string | null, textColor: string | null, isEnabled: boolean, authorizationUrl: string | null, tokenUrl: string | null, userInfoUrl: string | null, profileFields: Array<string> | null, additionalConfig: string | null, createdAt: string, updatedAt: string } };

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


export type UpdateUserRoleMutation = { __typename?: 'Mutation', updateUserRole: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null } };

export type UserBucketFragment = { __typename?: 'UserBucket', id: string, userId: string, bucketId: string, magicCode: string | null, customName: string | null, snoozeUntil: string | null, createdAt: string, updatedAt: string, snoozes: Array<{ __typename?: 'SnoozeSchedule', days: Array<string>, timeFrom: string, timeTill: string, isEnabled: boolean }> | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } };

export type SetBucketSnoozeMutationVariables = Exact<{
  bucketId: Scalars['String']['input'];
  snoozeUntil?: InputMaybe<Scalars['String']['input']>;
}>;


export type SetBucketSnoozeMutation = { __typename?: 'Mutation', setBucketSnooze: { __typename?: 'UserBucket', id: string, userId: string, bucketId: string, magicCode: string | null, customName: string | null, snoozeUntil: string | null, createdAt: string, updatedAt: string, snoozes: Array<{ __typename?: 'SnoozeSchedule', days: Array<string>, timeFrom: string, timeTill: string, isEnabled: boolean }> | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } };

export type UpdateBucketSnoozesMutationVariables = Exact<{
  bucketId: Scalars['String']['input'];
  snoozes: Array<SnoozeScheduleInput> | SnoozeScheduleInput;
}>;


export type UpdateBucketSnoozesMutation = { __typename?: 'Mutation', updateBucketSnoozes: { __typename?: 'UserBucket', id: string, userId: string, bucketId: string, magicCode: string | null, customName: string | null, snoozeUntil: string | null, createdAt: string, updatedAt: string, snoozes: Array<{ __typename?: 'SnoozeSchedule', days: Array<string>, timeFrom: string, timeTill: string, isEnabled: boolean }> | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } };

export type RegenerateMagicCodeMutationVariables = Exact<{
  bucketId: Scalars['String']['input'];
}>;


export type RegenerateMagicCodeMutation = { __typename?: 'Mutation', regenerateMagicCode: { __typename?: 'UserBucket', id: string, userId: string, bucketId: string, magicCode: string | null, customName: string | null, snoozeUntil: string | null, createdAt: string, updatedAt: string, snoozes: Array<{ __typename?: 'SnoozeSchedule', days: Array<string>, timeFrom: string, timeTill: string, isEnabled: boolean }> | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } };

export type DeleteMagicCodeMutationVariables = Exact<{
  bucketId: Scalars['String']['input'];
}>;


export type DeleteMagicCodeMutation = { __typename?: 'Mutation', deleteMagicCode: { __typename?: 'UserBucket', id: string, userId: string, bucketId: string, magicCode: string | null, customName: string | null, snoozeUntil: string | null, createdAt: string, updatedAt: string, snoozes: Array<{ __typename?: 'SnoozeSchedule', days: Array<string>, timeFrom: string, timeTill: string, isEnabled: boolean }> | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } };

export type UpdateUserBucketCustomNameMutationVariables = Exact<{
  bucketId: Scalars['String']['input'];
  customName?: InputMaybe<Scalars['String']['input']>;
}>;


export type UpdateUserBucketCustomNameMutation = { __typename?: 'Mutation', updateUserBucketCustomName: { __typename?: 'UserBucket', id: string, userId: string, bucketId: string, magicCode: string | null, customName: string | null, snoozeUntil: string | null, createdAt: string, updatedAt: string, snoozes: Array<{ __typename?: 'SnoozeSchedule', days: Array<string>, timeFrom: string, timeTill: string, isEnabled: boolean }> | null, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }, bucket: { __typename?: 'Bucket', id: string, name: string, description: string | null, color: string | null, icon: string | null, iconAttachmentUuid: string | null, iconUrl: string | null, createdAt: string, updatedAt: string, isProtected: boolean | null, isPublic: boolean | null, isAdmin: boolean | null } } };

export type SystemAccessTokenFragment = { __typename?: 'SystemAccessTokenDto', id: string, maxCalls: number, calls: number, totalCalls: number, failedCalls: number, totalFailedCalls: number, expiresAt: string | null, lastResetAt: string | null, description: string | null, scopes: Array<string> | null, token: string | null, createdAt: string, updatedAt: string, requester: { __typename?: 'User', id: string, username: string, email: string, firstName: string | null, lastName: string | null } | null };

export type SystemAccessTokenRequestFragment = { __typename?: 'SystemAccessTokenRequest', id: string, userId: string, systemAccessTokenId: string | null, plainTextToken: string | null, maxRequests: number, status: SystemAccessTokenRequestStatus, description: string | null, createdAt: string, user: { __typename?: 'User', id: string, username: string, email: string }, systemAccessToken: { __typename?: 'SystemAccessToken', id: string, description: string | null } | null };

export type SystemAccessTokenRequestsQueryVariables = Exact<{ [key: string]: never; }>;


export type SystemAccessTokenRequestsQuery = { __typename?: 'Query', systemAccessTokenRequests: Array<{ __typename?: 'SystemAccessTokenRequest', id: string, userId: string, systemAccessTokenId: string | null, plainTextToken: string | null, maxRequests: number, status: SystemAccessTokenRequestStatus, description: string | null, createdAt: string, user: { __typename?: 'User', id: string, username: string, email: string }, systemAccessToken: { __typename?: 'SystemAccessToken', id: string, description: string | null } | null }> };

export type ApproveSystemAccessTokenRequestMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type ApproveSystemAccessTokenRequestMutation = { __typename?: 'Mutation', approveSystemAccessTokenRequest: { __typename?: 'SystemAccessTokenRequest', id: string, userId: string, systemAccessTokenId: string | null, plainTextToken: string | null, maxRequests: number, status: SystemAccessTokenRequestStatus, description: string | null, createdAt: string, user: { __typename?: 'User', id: string, username: string, email: string }, systemAccessToken: { __typename?: 'SystemAccessToken', id: string, description: string | null } | null } };

export type MySystemAccessTokenRequestsQueryVariables = Exact<{ [key: string]: never; }>;


export type MySystemAccessTokenRequestsQuery = { __typename?: 'Query', mySystemAccessTokenRequests: Array<{ __typename?: 'SystemAccessTokenRequest', id: string, userId: string, systemAccessTokenId: string | null, plainTextToken: string | null, maxRequests: number, status: SystemAccessTokenRequestStatus, description: string | null, createdAt: string, user: { __typename?: 'User', id: string, username: string, email: string }, systemAccessToken: { __typename?: 'SystemAccessToken', id: string, description: string | null } | null }> };

export type CreateSystemAccessTokenRequestMutationVariables = Exact<{
  input: CreateSystemAccessTokenRequestDto;
}>;


export type CreateSystemAccessTokenRequestMutation = { __typename?: 'Mutation', createSystemAccessTokenRequest: { __typename?: 'SystemAccessTokenRequest', id: string, userId: string, systemAccessTokenId: string | null, plainTextToken: string | null, maxRequests: number, status: SystemAccessTokenRequestStatus, description: string | null, createdAt: string, user: { __typename?: 'User', id: string, username: string, email: string }, systemAccessToken: { __typename?: 'SystemAccessToken', id: string, description: string | null } | null } };

export type DeclineSystemAccessTokenRequestMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type DeclineSystemAccessTokenRequestMutation = { __typename?: 'Mutation', declineSystemAccessTokenRequest: { __typename?: 'SystemAccessTokenRequest', id: string, userId: string, systemAccessTokenId: string | null, plainTextToken: string | null, maxRequests: number, status: SystemAccessTokenRequestStatus, description: string | null, createdAt: string, user: { __typename?: 'User', id: string, username: string, email: string }, systemAccessToken: { __typename?: 'SystemAccessToken', id: string, description: string | null } | null } };

export type GetAllUsersQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllUsersQuery = { __typename?: 'Query', users: Array<{ __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null }> };

export type AdminCreateUserMutationVariables = Exact<{
  input: AdminCreateUserInput;
}>;


export type AdminCreateUserMutation = { __typename?: 'Mutation', adminCreateUser: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null } };

export type AdminDeleteUserMutationVariables = Exact<{
  userId: Scalars['String']['input'];
}>;


export type AdminDeleteUserMutation = { __typename?: 'Mutation', adminDeleteUser: boolean };

export type GetUserByIdQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetUserByIdQuery = { __typename?: 'Query', user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null } };

export type GetSystemAccessTokensQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSystemAccessTokensQuery = { __typename?: 'Query', listSystemTokens: Array<{ __typename?: 'SystemAccessTokenDto', id: string, maxCalls: number, calls: number, totalCalls: number, failedCalls: number, totalFailedCalls: number, expiresAt: string | null, lastResetAt: string | null, description: string | null, scopes: Array<string> | null, token: string | null, createdAt: string, updatedAt: string, requester: { __typename?: 'User', id: string, username: string, email: string, firstName: string | null, lastName: string | null } | null }> };

export type GetSystemTokenQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetSystemTokenQuery = { __typename?: 'Query', getSystemToken: { __typename?: 'SystemAccessTokenDto', id: string, maxCalls: number, calls: number, totalCalls: number, failedCalls: number, totalFailedCalls: number, expiresAt: string | null, lastResetAt: string | null, description: string | null, scopes: Array<string> | null, token: string | null, createdAt: string, updatedAt: string, requester: { __typename?: 'User', id: string, username: string, email: string, firstName: string | null, lastName: string | null } | null } | null };

export type CreateSystemAccessTokenMutationVariables = Exact<{
  maxCalls: Scalars['Float']['input'];
  expiresAt?: InputMaybe<Scalars['String']['input']>;
  requesterId?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  scopes?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
}>;


export type CreateSystemAccessTokenMutation = { __typename?: 'Mutation', createSystemToken: { __typename?: 'SystemAccessTokenDto', rawToken: string | null, id: string, maxCalls: number, calls: number, totalCalls: number, failedCalls: number, totalFailedCalls: number, expiresAt: string | null, lastResetAt: string | null, description: string | null, scopes: Array<string> | null, token: string | null, createdAt: string, updatedAt: string, requester: { __typename?: 'User', id: string, username: string, email: string, firstName: string | null, lastName: string | null } | null } };

export type UpdateSystemAccessTokenMutationVariables = Exact<{
  id: Scalars['String']['input'];
  maxCalls?: InputMaybe<Scalars['Float']['input']>;
  expiresAt?: InputMaybe<Scalars['String']['input']>;
  requesterId?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  scopes?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
}>;


export type UpdateSystemAccessTokenMutation = { __typename?: 'Mutation', updateSystemToken: { __typename?: 'SystemAccessTokenDto', id: string, maxCalls: number, calls: number, totalCalls: number, failedCalls: number, totalFailedCalls: number, expiresAt: string | null, lastResetAt: string | null, description: string | null, scopes: Array<string> | null, token: string | null, createdAt: string, updatedAt: string, requester: { __typename?: 'User', id: string, username: string, email: string, firstName: string | null, lastName: string | null } | null } };

export type CreateUserLogMutationVariables = Exact<{
  input: CreateUserLogInput;
}>;


export type CreateUserLogMutation = { __typename?: 'Mutation', createUserLog: { __typename?: 'UserLog', id: string, type: UserLogType, userId: string | null, payload: any, createdAt: string } };

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


export type PublicAppConfigQuery = { __typename?: 'Query', publicAppConfig: { __typename?: 'PublicAppConfig', emailEnabled: boolean, uploadEnabled: boolean, iconUploaderEnabled: boolean, systemTokenRequestsEnabled: boolean, socialLoginEnabled: boolean, localRegistrationEnabled: boolean, socialRegistrationEnabled: boolean, oauthProviders: Array<{ __typename?: 'OAuthProviderPublicDto', id: string, name: string, type: OAuthProviderType, iconUrl: string | null, color: string | null, textColor: string | null, providerKey: string }> } };

export type EventFragment = { __typename?: 'Event', id: string, type: EventType, userId: string | null, objectId: string | null, createdAt: string, targetId: string | null, additionalInfo: any | null };

export type GetEventsPaginatedQueryVariables = Exact<{
  query: EventsQueryDto;
}>;


export type GetEventsPaginatedQuery = { __typename?: 'Query', events: { __typename?: 'EventsResponseDto', total: number, page: number, limit: number, totalPages: number, hasNextPage: boolean, hasPreviousPage: boolean, events: Array<{ __typename?: 'Event', id: string, type: EventType, userId: string | null, objectId: string | null, createdAt: string, targetId: string | null, additionalInfo: any | null }> } };

export type UserNotificationStatsFragment = { __typename?: 'UserNotificationStats', today: number, todayAcked: number, thisWeek: number, thisWeekAcked: number, last7Days: number, last7DaysAcked: number, thisMonth: number, thisMonthAcked: number, last30Days: number, last30DaysAcked: number, total: number, totalAcked: number };

export type UserNotificationStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type UserNotificationStatsQuery = { __typename?: 'Query', userNotificationStats: { __typename?: 'UserNotificationStats', today: number, todayAcked: number, thisWeek: number, thisWeekAcked: number, last7Days: number, last7DaysAcked: number, thisMonth: number, thisMonthAcked: number, last30Days: number, last30DaysAcked: number, total: number, totalAcked: number } };

export type UserNotificationStatsByUserIdQueryVariables = Exact<{
  userId: Scalars['String']['input'];
}>;


export type UserNotificationStatsByUserIdQuery = { __typename?: 'Query', userNotificationStats: { __typename?: 'UserNotificationStats', today: number, todayAcked: number, thisWeek: number, thisWeekAcked: number, last7Days: number, last7DaysAcked: number, thisMonth: number, thisMonthAcked: number, last30Days: number, last30DaysAcked: number, total: number, totalAcked: number } };

export type ExecuteWebhookMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ExecuteWebhookMutation = { __typename?: 'Mutation', executeWebhook: boolean };

export type SetBucketSnoozeMinutesMutationVariables = Exact<{
  bucketId: Scalars['String']['input'];
  input: SetBucketSnoozeMinutesInput;
}>;


export type SetBucketSnoozeMinutesMutation = { __typename?: 'Mutation', setBucketSnoozeMinutes: { __typename?: 'UserBucket', id: string, snoozeUntil: string | null, bucket: { __typename?: 'Bucket', id: string, name: string } } };

export type PayloadMapperFragment = { __typename?: 'PayloadMapper', id: string, name: string, jsEvalFn: string, userId: string | null, builtInName: PayloadMapperBuiltInType | null, requiredUserSettings: Array<UserSettingType> | null, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null } | null };

export type GetPayloadMappersQueryVariables = Exact<{ [key: string]: never; }>;


export type GetPayloadMappersQuery = { __typename?: 'Query', payloadMappers: Array<{ __typename?: 'PayloadMapper', id: string, name: string, jsEvalFn: string, userId: string | null, builtInName: PayloadMapperBuiltInType | null, requiredUserSettings: Array<UserSettingType> | null, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null } | null }> };

export type GetPayloadMapperQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetPayloadMapperQuery = { __typename?: 'Query', payloadMapper: { __typename?: 'PayloadMapper', id: string, name: string, jsEvalFn: string, userId: string | null, builtInName: PayloadMapperBuiltInType | null, requiredUserSettings: Array<UserSettingType> | null, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null } | null } };

export type CreatePayloadMapperMutationVariables = Exact<{
  input: CreatePayloadMapperDto;
}>;


export type CreatePayloadMapperMutation = { __typename?: 'Mutation', createPayloadMapper: { __typename?: 'PayloadMapper', id: string, name: string, jsEvalFn: string, userId: string | null, builtInName: PayloadMapperBuiltInType | null, requiredUserSettings: Array<UserSettingType> | null, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null } | null } };

export type UpdatePayloadMapperMutationVariables = Exact<{
  id: Scalars['String']['input'];
  input: UpdatePayloadMapperDto;
}>;


export type UpdatePayloadMapperMutation = { __typename?: 'Mutation', updatePayloadMapper: { __typename?: 'PayloadMapper', id: string, name: string, jsEvalFn: string, userId: string | null, builtInName: PayloadMapperBuiltInType | null, requiredUserSettings: Array<UserSettingType> | null, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null } | null } };

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

export type DeleteAttachmentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteAttachmentMutation = { __typename?: 'Mutation', deleteAttachment: boolean };

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

export type GetUserLogsQueryVariables = Exact<{
  input: GetUserLogsInput;
}>;


export type GetUserLogsQuery = { __typename?: 'Query', userLogs: { __typename?: 'PaginatedUserLogs', total: number, page: number, limit: number, totalPages: number, logs: Array<{ __typename?: 'UserLogEntry', id: string, type: UserLogType, userId: string | null, payload: any, createdAt: string }> } };

export type ServerFileFragment = { __typename?: 'FileInfoDto', name: string, size: number, mtime: string, isDir: boolean };

export type ServerFilesQueryVariables = Exact<{
  path?: InputMaybe<Scalars['String']['input']>;
}>;


export type ServerFilesQuery = { __typename?: 'Query', serverFiles: Array<{ __typename?: 'FileInfoDto', name: string, size: number, mtime: string, isDir: boolean }> };

export type DeleteServerFileMutationVariables = Exact<{
  name: Scalars['String']['input'];
  path?: InputMaybe<Scalars['String']['input']>;
}>;


export type DeleteServerFileMutation = { __typename?: 'Mutation', deleteServerFile: boolean };

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

export type UserTemplateFragment = { __typename?: 'UserTemplate', id: string, name: string, description: string | null, title: string | null, subtitle: string | null, body: string, input: string | null, output: string | null, userId: string, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null } };

export type GetUserTemplatesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserTemplatesQuery = { __typename?: 'Query', userTemplates: Array<{ __typename?: 'UserTemplate', id: string, name: string, description: string | null, title: string | null, subtitle: string | null, body: string, input: string | null, output: string | null, userId: string, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null } }> };

export type GetUserTemplateQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetUserTemplateQuery = { __typename?: 'Query', userTemplate: { __typename?: 'UserTemplate', id: string, name: string, description: string | null, title: string | null, subtitle: string | null, body: string, input: string | null, output: string | null, userId: string, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null } } };

export type CreateUserTemplateMutationVariables = Exact<{
  input: CreateUserTemplateDto;
}>;


export type CreateUserTemplateMutation = { __typename?: 'Mutation', createUserTemplate: { __typename?: 'UserTemplate', id: string, name: string, description: string | null, title: string | null, subtitle: string | null, body: string, input: string | null, output: string | null, userId: string, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null } } };

export type UpdateUserTemplateMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateUserTemplateDto;
}>;


export type UpdateUserTemplateMutation = { __typename?: 'Mutation', updateUserTemplate: { __typename?: 'UserTemplate', id: string, name: string, description: string | null, title: string | null, subtitle: string | null, body: string, input: string | null, output: string | null, userId: string, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, email: string, username: string, firstName: string | null, lastName: string | null, avatar: string | null, hasPassword: boolean, role: UserRole, createdAt: string, updatedAt: string, identities: Array<{ __typename?: 'UserIdentity', id: string, email: string | null, providerType: OAuthProviderType | null, metadata: string | null, createdAt: string }> | null, buckets: Array<{ __typename?: 'Bucket', id: string, name: string, description: string | null, icon: string | null, color: string | null, createdAt: string, updatedAt: string }> | null, devices: Array<{ __typename?: 'UserDevice', id: string, platform: string, deviceName: string | null, deviceModel: string | null, osVersion: string | null, onlyLocal: boolean, lastUsed: string, createdAt: string, updatedAt: string, metadata: string | null }> | null } } };

export type DeleteUserTemplateMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteUserTemplateMutation = { __typename?: 'Mutation', deleteUserTemplate: boolean };

export const AttachmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AttachmentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Attachment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"originalFilename"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"filepath"}},{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}}]}}]} as unknown as DocumentNode;
export const MessageAttachmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageAttachmentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MessageAttachment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"attachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"saveOnServer"}}]}}]} as unknown as DocumentNode;
export const NotificationActionFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationActionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NotificationAction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"destructive"}}]}}]} as unknown as DocumentNode;
export const BucketFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}}]} as unknown as DocumentNode;
export const MessageFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Message"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"attachments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageAttachmentFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tapAction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"actions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sound"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryType"}},{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"}},{"kind":"Field","name":{"kind":"Name","value":"executionId"}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageAttachmentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MessageAttachment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"attachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"saveOnServer"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationActionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NotificationAction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"destructive"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}}]} as unknown as DocumentNode;
export const NotificationFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Notification"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"receivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"readAt"}},{"kind":"Field","name":{"kind":"Name","value":"sentAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"message"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageAttachmentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MessageAttachment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"attachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"saveOnServer"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationActionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NotificationAction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"destructive"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Message"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"attachments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageAttachmentFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tapAction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"actions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sound"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryType"}},{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"}},{"kind":"Field","name":{"kind":"Name","value":"executionId"}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}}]} as unknown as DocumentNode;
export const UserFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const EntityPermissionFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityPermissionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityPermission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inviteCodeId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"grantedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const UserBucketFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"bucketId"}},{"kind":"Field","name":{"kind":"Name","value":"magicCode"}},{"kind":"Field","name":{"kind":"Name","value":"customName"}},{"kind":"Field","name":{"kind":"Name","value":"snoozeUntil"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"timeFrom"}},{"kind":"Field","name":{"kind":"Name","value":"timeTill"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const BucketPermissionsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketPermissionsFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BucketPermissionsDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canWrite"}},{"kind":"Field","name":{"kind":"Name","value":"canDelete"}},{"kind":"Field","name":{"kind":"Name","value":"canAdmin"}},{"kind":"Field","name":{"kind":"Name","value":"canRead"}},{"kind":"Field","name":{"kind":"Name","value":"isOwner"}},{"kind":"Field","name":{"kind":"Name","value":"isSharedWithMe"}},{"kind":"Field","name":{"kind":"Name","value":"sharedCount"}}]}}]} as unknown as DocumentNode;
export const BucketWithDevicesFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketWithDevicesFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"permissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EntityPermissionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"userBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserBucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"userPermissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketPermissionsFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketPermissionsFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BucketPermissionsDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canWrite"}},{"kind":"Field","name":{"kind":"Name","value":"canDelete"}},{"kind":"Field","name":{"kind":"Name","value":"canAdmin"}},{"kind":"Field","name":{"kind":"Name","value":"canRead"}},{"kind":"Field","name":{"kind":"Name","value":"isOwner"}},{"kind":"Field","name":{"kind":"Name","value":"isSharedWithMe"}},{"kind":"Field","name":{"kind":"Name","value":"sharedCount"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityPermissionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityPermission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inviteCodeId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"grantedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"bucketId"}},{"kind":"Field","name":{"kind":"Name","value":"magicCode"}},{"kind":"Field","name":{"kind":"Name","value":"customName"}},{"kind":"Field","name":{"kind":"Name","value":"snoozeUntil"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"timeFrom"}},{"kind":"Field","name":{"kind":"Name","value":"timeTill"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}}]}}]} as unknown as DocumentNode;
export const BucketFullFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFullFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"messages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"permissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EntityPermissionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"userBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserBucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"userPermissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketPermissionsFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageAttachmentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MessageAttachment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"attachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"saveOnServer"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationActionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NotificationAction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"destructive"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Message"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"attachments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageAttachmentFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tapAction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"actions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sound"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryType"}},{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"}},{"kind":"Field","name":{"kind":"Name","value":"executionId"}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketPermissionsFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BucketPermissionsDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canWrite"}},{"kind":"Field","name":{"kind":"Name","value":"canDelete"}},{"kind":"Field","name":{"kind":"Name","value":"canAdmin"}},{"kind":"Field","name":{"kind":"Name","value":"canRead"}},{"kind":"Field","name":{"kind":"Name","value":"isOwner"}},{"kind":"Field","name":{"kind":"Name","value":"isSharedWithMe"}},{"kind":"Field","name":{"kind":"Name","value":"sharedCount"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityPermissionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityPermission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inviteCodeId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"grantedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"bucketId"}},{"kind":"Field","name":{"kind":"Name","value":"magicCode"}},{"kind":"Field","name":{"kind":"Name","value":"customName"}},{"kind":"Field","name":{"kind":"Name","value":"snoozeUntil"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"timeFrom"}},{"kind":"Field","name":{"kind":"Name","value":"timeTill"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}}]}}]} as unknown as DocumentNode;
export const UserIdentityFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserIdentityFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserIdentity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const UserDeviceFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserDeviceFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserDevice"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"deviceToken"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publicKey"}},{"kind":"Field","name":{"kind":"Name","value":"privateKey"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}}]}}]} as unknown as DocumentNode;
export const UserWebhookFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserWebhookFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserWebhook"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"headers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const ChangelogForModalFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ChangelogForModalFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Changelog"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"iosVersion"}},{"kind":"Field","name":{"kind":"Name","value":"androidVersion"}},{"kind":"Field","name":{"kind":"Name","value":"uiVersion"}},{"kind":"Field","name":{"kind":"Name","value":"backendVersion"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"text"}}]}}]}}]} as unknown as DocumentNode;
export const InviteCodeFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"InviteCodeFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"InviteCode"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"usageCount"}},{"kind":"Field","name":{"kind":"Name","value":"maxUses"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"creator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}}]}}]} as unknown as DocumentNode;
export const UserSettingFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSettingFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserSetting"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"deviceId"}},{"kind":"Field","name":{"kind":"Name","value":"configType"}},{"kind":"Field","name":{"kind":"Name","value":"valueText"}},{"kind":"Field","name":{"kind":"Name","value":"valueBool"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const AccessTokenFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccessTokenFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccessTokenListDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"isExpired"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}}]}}]} as unknown as DocumentNode;
export const AccessTokenResponseFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccessTokenResponseFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccessTokenResponseDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"tokenStored"}}]}}]} as unknown as DocumentNode;
export const SessionInfoFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SessionInfoFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SessionInfoDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"operatingSystem"}},{"kind":"Field","name":{"kind":"Name","value":"browser"}},{"kind":"Field","name":{"kind":"Name","value":"ipAddress"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"lastActivity"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"isCurrent"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"loginProvider"}}]}}]} as unknown as DocumentNode;
export const OAuthProviderPublicFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OAuthProviderPublicFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OAuthProviderPublicDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"textColor"}},{"kind":"Field","name":{"kind":"Name","value":"providerKey"}}]}}]} as unknown as DocumentNode;
export const OAuthProviderFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OAuthProviderFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OAuthProvider"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"clientId"}},{"kind":"Field","name":{"kind":"Name","value":"clientSecret"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"textColor"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"authorizationUrl"}},{"kind":"Field","name":{"kind":"Name","value":"tokenUrl"}},{"kind":"Field","name":{"kind":"Name","value":"userInfoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"profileFields"}},{"kind":"Field","name":{"kind":"Name","value":"additionalConfig"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const NotificationServiceInfoFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationServiceInfoFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NotificationServiceInfo"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"devicePlatform"}},{"kind":"Field","name":{"kind":"Name","value":"service"}}]}}]} as unknown as DocumentNode;
export const SystemAccessTokenFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SystemAccessTokenFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SystemAccessTokenDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"maxCalls"}},{"kind":"Field","name":{"kind":"Name","value":"calls"}},{"kind":"Field","name":{"kind":"Name","value":"totalCalls"}},{"kind":"Field","name":{"kind":"Name","value":"failedCalls"}},{"kind":"Field","name":{"kind":"Name","value":"totalFailedCalls"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastResetAt"}},{"kind":"Field","name":{"kind":"Name","value":"requester"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const SystemAccessTokenRequestFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SystemAccessTokenRequestFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SystemAccessTokenRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"systemAccessTokenId"}},{"kind":"Field","name":{"kind":"Name","value":"systemAccessToken"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"description"}}]}},{"kind":"Field","name":{"kind":"Name","value":"plainTextToken"}},{"kind":"Field","name":{"kind":"Name","value":"maxRequests"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]} as unknown as DocumentNode;
export const EventFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EventFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Event"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"objectId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"targetId"}},{"kind":"Field","name":{"kind":"Name","value":"additionalInfo"}}]}}]} as unknown as DocumentNode;
export const UserNotificationStatsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserNotificationStatsFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserNotificationStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"today"}},{"kind":"Field","name":{"kind":"Name","value":"todayAcked"}},{"kind":"Field","name":{"kind":"Name","value":"thisWeek"}},{"kind":"Field","name":{"kind":"Name","value":"thisWeekAcked"}},{"kind":"Field","name":{"kind":"Name","value":"last7Days"}},{"kind":"Field","name":{"kind":"Name","value":"last7DaysAcked"}},{"kind":"Field","name":{"kind":"Name","value":"thisMonth"}},{"kind":"Field","name":{"kind":"Name","value":"thisMonthAcked"}},{"kind":"Field","name":{"kind":"Name","value":"last30Days"}},{"kind":"Field","name":{"kind":"Name","value":"last30DaysAcked"}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"totalAcked"}}]}}]} as unknown as DocumentNode;
export const PayloadMapperFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PayloadMapperFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PayloadMapper"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"jsEvalFn"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"builtInName"}},{"kind":"Field","name":{"kind":"Name","value":"requiredUserSettings"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const EntityExecutionFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityExecutionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityExecution"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"entityName"}},{"kind":"Field","name":{"kind":"Name","value":"entityId"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"input"}},{"kind":"Field","name":{"kind":"Name","value":"output"}},{"kind":"Field","name":{"kind":"Name","value":"errors"}},{"kind":"Field","name":{"kind":"Name","value":"durationMs"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const ServerSettingFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ServerSettingFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ServerSetting"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"configType"}},{"kind":"Field","name":{"kind":"Name","value":"valueText"}},{"kind":"Field","name":{"kind":"Name","value":"valueBool"}},{"kind":"Field","name":{"kind":"Name","value":"valueNumber"}},{"kind":"Field","name":{"kind":"Name","value":"possibleValues"}}]}}]} as unknown as DocumentNode;
export const ServerFileFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ServerFileFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"FileInfoDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"mtime"}},{"kind":"Field","name":{"kind":"Name","value":"isDir"}}]}}]} as unknown as DocumentNode;
export const UserTemplateFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserTemplateFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserTemplate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"input"}},{"kind":"Field","name":{"kind":"Name","value":"output"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const GetEventsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetEvents"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"EventsQueryDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"events"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"events"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"objectId"}},{"kind":"Field","name":{"kind":"Name","value":"targetId"}},{"kind":"Field","name":{"kind":"Name","value":"additionalInfo"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"page"}},{"kind":"Field","name":{"kind":"Name","value":"limit"}},{"kind":"Field","name":{"kind":"Name","value":"totalPages"}},{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}}]}}]} as unknown as DocumentNode;

/**
 * __useGetEventsQuery__
 *
 * To run a query within a React component, call `useGetEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetEventsQuery({
 *   variables: {
 *      query: // value for 'query'
 *   },
 * });
 */
export function useGetEventsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetEventsQuery, GetEventsQueryVariables> & ({ variables: GetEventsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetEventsQuery, GetEventsQueryVariables>(GetEventsDocument, options);
      }
export function useGetEventsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetEventsQuery, GetEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetEventsQuery, GetEventsQueryVariables>(GetEventsDocument, options);
        }
export function useGetEventsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetEventsQuery, GetEventsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetEventsQuery, GetEventsQueryVariables>(GetEventsDocument, options);
        }
export type GetEventsQueryHookResult = ReturnType<typeof useGetEventsQuery>;
export type GetEventsLazyQueryHookResult = ReturnType<typeof useGetEventsLazyQuery>;
export type GetEventsSuspenseQueryHookResult = ReturnType<typeof useGetEventsSuspenseQuery>;
export type GetEventsQueryResult = Apollo.QueryResult<GetEventsQuery, GetEventsQueryVariables>;
export const RequestPasswordResetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RequestPasswordReset"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RequestPasswordResetDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"requestPasswordReset"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode;
export type RequestPasswordResetMutationFn = Apollo.MutationFunction<RequestPasswordResetMutation, RequestPasswordResetMutationVariables>;

/**
 * __useRequestPasswordResetMutation__
 *
 * To run a mutation, you first call `useRequestPasswordResetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRequestPasswordResetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [requestPasswordResetMutation, { data, loading, error }] = useRequestPasswordResetMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRequestPasswordResetMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RequestPasswordResetMutation, RequestPasswordResetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RequestPasswordResetMutation, RequestPasswordResetMutationVariables>(RequestPasswordResetDocument, options);
      }
export type RequestPasswordResetMutationHookResult = ReturnType<typeof useRequestPasswordResetMutation>;
export type RequestPasswordResetMutationResult = Apollo.MutationResult<RequestPasswordResetMutation>;
export type RequestPasswordResetMutationOptions = Apollo.BaseMutationOptions<RequestPasswordResetMutation, RequestPasswordResetMutationVariables>;
export const ValidateResetTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ValidateResetToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"resetToken"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"validateResetToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"resetToken"},"value":{"kind":"Variable","name":{"kind":"Name","value":"resetToken"}}}]}]}}]} as unknown as DocumentNode;
export type ValidateResetTokenMutationFn = Apollo.MutationFunction<ValidateResetTokenMutation, ValidateResetTokenMutationVariables>;

/**
 * __useValidateResetTokenMutation__
 *
 * To run a mutation, you first call `useValidateResetTokenMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useValidateResetTokenMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [validateResetTokenMutation, { data, loading, error }] = useValidateResetTokenMutation({
 *   variables: {
 *      resetToken: // value for 'resetToken'
 *   },
 * });
 */
export function useValidateResetTokenMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ValidateResetTokenMutation, ValidateResetTokenMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ValidateResetTokenMutation, ValidateResetTokenMutationVariables>(ValidateResetTokenDocument, options);
      }
export type ValidateResetTokenMutationHookResult = ReturnType<typeof useValidateResetTokenMutation>;
export type ValidateResetTokenMutationResult = Apollo.MutationResult<ValidateResetTokenMutation>;
export type ValidateResetTokenMutationOptions = Apollo.BaseMutationOptions<ValidateResetTokenMutation, ValidateResetTokenMutationVariables>;
export const ResetPasswordDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ResetPassword"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ResetPasswordDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resetPassword"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode;
export type ResetPasswordMutationFn = Apollo.MutationFunction<ResetPasswordMutation, ResetPasswordMutationVariables>;

/**
 * __useResetPasswordMutation__
 *
 * To run a mutation, you first call `useResetPasswordMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResetPasswordMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resetPasswordMutation, { data, loading, error }] = useResetPasswordMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useResetPasswordMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ResetPasswordMutation, ResetPasswordMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ResetPasswordMutation, ResetPasswordMutationVariables>(ResetPasswordDocument, options);
      }
export type ResetPasswordMutationHookResult = ReturnType<typeof useResetPasswordMutation>;
export type ResetPasswordMutationResult = Apollo.MutationResult<ResetPasswordMutation>;
export type ResetPasswordMutationOptions = Apollo.BaseMutationOptions<ResetPasswordMutation, ResetPasswordMutationVariables>;
export const GetMyIdentitiesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMyIdentities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserIdentityFragment"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserIdentityFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserIdentity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetMyIdentitiesQuery__
 *
 * To run a query within a React component, call `useGetMyIdentitiesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyIdentitiesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyIdentitiesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetMyIdentitiesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetMyIdentitiesQuery, GetMyIdentitiesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetMyIdentitiesQuery, GetMyIdentitiesQueryVariables>(GetMyIdentitiesDocument, options);
      }
export function useGetMyIdentitiesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetMyIdentitiesQuery, GetMyIdentitiesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetMyIdentitiesQuery, GetMyIdentitiesQueryVariables>(GetMyIdentitiesDocument, options);
        }
export function useGetMyIdentitiesSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetMyIdentitiesQuery, GetMyIdentitiesQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetMyIdentitiesQuery, GetMyIdentitiesQueryVariables>(GetMyIdentitiesDocument, options);
        }
export type GetMyIdentitiesQueryHookResult = ReturnType<typeof useGetMyIdentitiesQuery>;
export type GetMyIdentitiesLazyQueryHookResult = ReturnType<typeof useGetMyIdentitiesLazyQuery>;
export type GetMyIdentitiesSuspenseQueryHookResult = ReturnType<typeof useGetMyIdentitiesSuspenseQuery>;
export type GetMyIdentitiesQueryResult = Apollo.QueryResult<GetMyIdentitiesQuery, GetMyIdentitiesQueryVariables>;
export const GetNotificationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetNotifications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notifications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageAttachmentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MessageAttachment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"attachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"saveOnServer"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationActionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NotificationAction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"destructive"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Message"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"attachments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageAttachmentFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tapAction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"actions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sound"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryType"}},{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"}},{"kind":"Field","name":{"kind":"Name","value":"executionId"}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Notification"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"receivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"readAt"}},{"kind":"Field","name":{"kind":"Name","value":"sentAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"message"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetNotificationsQuery__
 *
 * To run a query within a React component, call `useGetNotificationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetNotificationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetNotificationsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetNotificationsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetNotificationsQuery, GetNotificationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetNotificationsQuery, GetNotificationsQueryVariables>(GetNotificationsDocument, options);
      }
export function useGetNotificationsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetNotificationsQuery, GetNotificationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetNotificationsQuery, GetNotificationsQueryVariables>(GetNotificationsDocument, options);
        }
export function useGetNotificationsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetNotificationsQuery, GetNotificationsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetNotificationsQuery, GetNotificationsQueryVariables>(GetNotificationsDocument, options);
        }
export type GetNotificationsQueryHookResult = ReturnType<typeof useGetNotificationsQuery>;
export type GetNotificationsLazyQueryHookResult = ReturnType<typeof useGetNotificationsLazyQuery>;
export type GetNotificationsSuspenseQueryHookResult = ReturnType<typeof useGetNotificationsSuspenseQuery>;
export type GetNotificationsQueryResult = Apollo.QueryResult<GetNotificationsQuery, GetNotificationsQueryVariables>;
export const GetNotificationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetNotification"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notification"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageAttachmentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MessageAttachment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"attachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"saveOnServer"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationActionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NotificationAction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"destructive"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Message"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"attachments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageAttachmentFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tapAction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"actions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sound"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryType"}},{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"}},{"kind":"Field","name":{"kind":"Name","value":"executionId"}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Notification"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"receivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"readAt"}},{"kind":"Field","name":{"kind":"Name","value":"sentAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"message"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetNotificationQuery__
 *
 * To run a query within a React component, call `useGetNotificationQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetNotificationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetNotificationQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetNotificationQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetNotificationQuery, GetNotificationQueryVariables> & ({ variables: GetNotificationQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetNotificationQuery, GetNotificationQueryVariables>(GetNotificationDocument, options);
      }
export function useGetNotificationLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetNotificationQuery, GetNotificationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetNotificationQuery, GetNotificationQueryVariables>(GetNotificationDocument, options);
        }
export function useGetNotificationSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetNotificationQuery, GetNotificationQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetNotificationQuery, GetNotificationQueryVariables>(GetNotificationDocument, options);
        }
export type GetNotificationQueryHookResult = ReturnType<typeof useGetNotificationQuery>;
export type GetNotificationLazyQueryHookResult = ReturnType<typeof useGetNotificationLazyQuery>;
export type GetNotificationSuspenseQueryHookResult = ReturnType<typeof useGetNotificationSuspenseQuery>;
export type GetNotificationQueryResult = Apollo.QueryResult<GetNotificationQuery, GetNotificationQueryVariables>;
export const ChangelogsForModalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ChangelogsForModal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changelogs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChangelogForModalFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ChangelogForModalFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Changelog"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"iosVersion"}},{"kind":"Field","name":{"kind":"Name","value":"androidVersion"}},{"kind":"Field","name":{"kind":"Name","value":"uiVersion"}},{"kind":"Field","name":{"kind":"Name","value":"backendVersion"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"text"}}]}}]}}]} as unknown as DocumentNode;

/**
 * __useChangelogsForModalQuery__
 *
 * To run a query within a React component, call `useChangelogsForModalQuery` and pass it any options that fit your needs.
 * When your component renders, `useChangelogsForModalQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useChangelogsForModalQuery({
 *   variables: {
 *   },
 * });
 */
export function useChangelogsForModalQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ChangelogsForModalQuery, ChangelogsForModalQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ChangelogsForModalQuery, ChangelogsForModalQueryVariables>(ChangelogsForModalDocument, options);
      }
export function useChangelogsForModalLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ChangelogsForModalQuery, ChangelogsForModalQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ChangelogsForModalQuery, ChangelogsForModalQueryVariables>(ChangelogsForModalDocument, options);
        }
export function useChangelogsForModalSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<ChangelogsForModalQuery, ChangelogsForModalQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<ChangelogsForModalQuery, ChangelogsForModalQueryVariables>(ChangelogsForModalDocument, options);
        }
export type ChangelogsForModalQueryHookResult = ReturnType<typeof useChangelogsForModalQuery>;
export type ChangelogsForModalLazyQueryHookResult = ReturnType<typeof useChangelogsForModalLazyQuery>;
export type ChangelogsForModalSuspenseQueryHookResult = ReturnType<typeof useChangelogsForModalSuspenseQuery>;
export type ChangelogsForModalQueryResult = Apollo.QueryResult<ChangelogsForModalQuery, ChangelogsForModalQueryVariables>;
export const AdminChangelogsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminChangelogs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminChangelogs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChangelogForModalFragment"}},{"kind":"Field","name":{"kind":"Name","value":"active"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ChangelogForModalFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Changelog"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"iosVersion"}},{"kind":"Field","name":{"kind":"Name","value":"androidVersion"}},{"kind":"Field","name":{"kind":"Name","value":"uiVersion"}},{"kind":"Field","name":{"kind":"Name","value":"backendVersion"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"text"}}]}}]}}]} as unknown as DocumentNode;

/**
 * __useAdminChangelogsQuery__
 *
 * To run a query within a React component, call `useAdminChangelogsQuery` and pass it any options that fit your needs.
 * When your component renders, `useAdminChangelogsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAdminChangelogsQuery({
 *   variables: {
 *   },
 * });
 */
export function useAdminChangelogsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<AdminChangelogsQuery, AdminChangelogsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<AdminChangelogsQuery, AdminChangelogsQueryVariables>(AdminChangelogsDocument, options);
      }
export function useAdminChangelogsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<AdminChangelogsQuery, AdminChangelogsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<AdminChangelogsQuery, AdminChangelogsQueryVariables>(AdminChangelogsDocument, options);
        }
export function useAdminChangelogsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<AdminChangelogsQuery, AdminChangelogsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<AdminChangelogsQuery, AdminChangelogsQueryVariables>(AdminChangelogsDocument, options);
        }
export type AdminChangelogsQueryHookResult = ReturnType<typeof useAdminChangelogsQuery>;
export type AdminChangelogsLazyQueryHookResult = ReturnType<typeof useAdminChangelogsLazyQuery>;
export type AdminChangelogsSuspenseQueryHookResult = ReturnType<typeof useAdminChangelogsSuspenseQuery>;
export type AdminChangelogsQueryResult = Apollo.QueryResult<AdminChangelogsQuery, AdminChangelogsQueryVariables>;
export const ChangelogDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Changelog"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changelog"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChangelogForModalFragment"}},{"kind":"Field","name":{"kind":"Name","value":"active"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ChangelogForModalFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Changelog"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"iosVersion"}},{"kind":"Field","name":{"kind":"Name","value":"androidVersion"}},{"kind":"Field","name":{"kind":"Name","value":"uiVersion"}},{"kind":"Field","name":{"kind":"Name","value":"backendVersion"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"text"}}]}}]}}]} as unknown as DocumentNode;

/**
 * __useChangelogQuery__
 *
 * To run a query within a React component, call `useChangelogQuery` and pass it any options that fit your needs.
 * When your component renders, `useChangelogQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useChangelogQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useChangelogQuery(baseOptions: ApolloReactHooks.QueryHookOptions<ChangelogQuery, ChangelogQueryVariables> & ({ variables: ChangelogQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ChangelogQuery, ChangelogQueryVariables>(ChangelogDocument, options);
      }
export function useChangelogLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ChangelogQuery, ChangelogQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ChangelogQuery, ChangelogQueryVariables>(ChangelogDocument, options);
        }
export function useChangelogSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<ChangelogQuery, ChangelogQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<ChangelogQuery, ChangelogQueryVariables>(ChangelogDocument, options);
        }
export type ChangelogQueryHookResult = ReturnType<typeof useChangelogQuery>;
export type ChangelogLazyQueryHookResult = ReturnType<typeof useChangelogLazyQuery>;
export type ChangelogSuspenseQueryHookResult = ReturnType<typeof useChangelogSuspenseQuery>;
export type ChangelogQueryResult = Apollo.QueryResult<ChangelogQuery, ChangelogQueryVariables>;
export const CreateChangelogDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateChangelog"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateChangelogInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createChangelog"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode;
export type CreateChangelogMutationFn = Apollo.MutationFunction<CreateChangelogMutation, CreateChangelogMutationVariables>;

/**
 * __useCreateChangelogMutation__
 *
 * To run a mutation, you first call `useCreateChangelogMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateChangelogMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createChangelogMutation, { data, loading, error }] = useCreateChangelogMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateChangelogMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateChangelogMutation, CreateChangelogMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateChangelogMutation, CreateChangelogMutationVariables>(CreateChangelogDocument, options);
      }
export type CreateChangelogMutationHookResult = ReturnType<typeof useCreateChangelogMutation>;
export type CreateChangelogMutationResult = Apollo.MutationResult<CreateChangelogMutation>;
export type CreateChangelogMutationOptions = Apollo.BaseMutationOptions<CreateChangelogMutation, CreateChangelogMutationVariables>;
export const UpdateChangelogDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateChangelog"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateChangelogInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateChangelog"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode;
export type UpdateChangelogMutationFn = Apollo.MutationFunction<UpdateChangelogMutation, UpdateChangelogMutationVariables>;

/**
 * __useUpdateChangelogMutation__
 *
 * To run a mutation, you first call `useUpdateChangelogMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateChangelogMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateChangelogMutation, { data, loading, error }] = useUpdateChangelogMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateChangelogMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateChangelogMutation, UpdateChangelogMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateChangelogMutation, UpdateChangelogMutationVariables>(UpdateChangelogDocument, options);
      }
export type UpdateChangelogMutationHookResult = ReturnType<typeof useUpdateChangelogMutation>;
export type UpdateChangelogMutationResult = Apollo.MutationResult<UpdateChangelogMutation>;
export type UpdateChangelogMutationOptions = Apollo.BaseMutationOptions<UpdateChangelogMutation, UpdateChangelogMutationVariables>;
export const CreateMessageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateMessage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateMessageDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createMessage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageAttachmentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MessageAttachment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"attachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"saveOnServer"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationActionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NotificationAction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"destructive"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Message"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"attachments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageAttachmentFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tapAction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"actions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sound"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryType"}},{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"}},{"kind":"Field","name":{"kind":"Name","value":"executionId"}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}}]} as unknown as DocumentNode;
export type CreateMessageMutationFn = Apollo.MutationFunction<CreateMessageMutation, CreateMessageMutationVariables>;

/**
 * __useCreateMessageMutation__
 *
 * To run a mutation, you first call `useCreateMessageMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateMessageMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createMessageMutation, { data, loading, error }] = useCreateMessageMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateMessageMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateMessageMutation, CreateMessageMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateMessageMutation, CreateMessageMutationVariables>(CreateMessageDocument, options);
      }
export type CreateMessageMutationHookResult = ReturnType<typeof useCreateMessageMutation>;
export type CreateMessageMutationResult = Apollo.MutationResult<CreateMessageMutation>;
export type CreateMessageMutationOptions = Apollo.BaseMutationOptions<CreateMessageMutation, CreateMessageMutationVariables>;
export const DeleteNotificationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteNotification"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteNotification"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode;
export type DeleteNotificationMutationFn = Apollo.MutationFunction<DeleteNotificationMutation, DeleteNotificationMutationVariables>;

/**
 * __useDeleteNotificationMutation__
 *
 * To run a mutation, you first call `useDeleteNotificationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteNotificationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteNotificationMutation, { data, loading, error }] = useDeleteNotificationMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteNotificationMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteNotificationMutation, DeleteNotificationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteNotificationMutation, DeleteNotificationMutationVariables>(DeleteNotificationDocument, options);
      }
export type DeleteNotificationMutationHookResult = ReturnType<typeof useDeleteNotificationMutation>;
export type DeleteNotificationMutationResult = Apollo.MutationResult<DeleteNotificationMutation>;
export type DeleteNotificationMutationOptions = Apollo.BaseMutationOptions<DeleteNotificationMutation, DeleteNotificationMutationVariables>;
export const MarkNotificationAsReadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkNotificationAsRead"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markNotificationAsRead"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"readAt"}},{"kind":"Field","name":{"kind":"Name","value":"receivedAt"}}]}}]}}]} as unknown as DocumentNode;
export type MarkNotificationAsReadMutationFn = Apollo.MutationFunction<MarkNotificationAsReadMutation, MarkNotificationAsReadMutationVariables>;

/**
 * __useMarkNotificationAsReadMutation__
 *
 * To run a mutation, you first call `useMarkNotificationAsReadMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMarkNotificationAsReadMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [markNotificationAsReadMutation, { data, loading, error }] = useMarkNotificationAsReadMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useMarkNotificationAsReadMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<MarkNotificationAsReadMutation, MarkNotificationAsReadMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<MarkNotificationAsReadMutation, MarkNotificationAsReadMutationVariables>(MarkNotificationAsReadDocument, options);
      }
export type MarkNotificationAsReadMutationHookResult = ReturnType<typeof useMarkNotificationAsReadMutation>;
export type MarkNotificationAsReadMutationResult = Apollo.MutationResult<MarkNotificationAsReadMutation>;
export type MarkNotificationAsReadMutationOptions = Apollo.BaseMutationOptions<MarkNotificationAsReadMutation, MarkNotificationAsReadMutationVariables>;
export const MarkNotificationAsUnreadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkNotificationAsUnread"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markNotificationAsUnread"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"readAt"}},{"kind":"Field","name":{"kind":"Name","value":"receivedAt"}}]}}]}}]} as unknown as DocumentNode;
export type MarkNotificationAsUnreadMutationFn = Apollo.MutationFunction<MarkNotificationAsUnreadMutation, MarkNotificationAsUnreadMutationVariables>;

/**
 * __useMarkNotificationAsUnreadMutation__
 *
 * To run a mutation, you first call `useMarkNotificationAsUnreadMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMarkNotificationAsUnreadMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [markNotificationAsUnreadMutation, { data, loading, error }] = useMarkNotificationAsUnreadMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useMarkNotificationAsUnreadMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<MarkNotificationAsUnreadMutation, MarkNotificationAsUnreadMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<MarkNotificationAsUnreadMutation, MarkNotificationAsUnreadMutationVariables>(MarkNotificationAsUnreadDocument, options);
      }
export type MarkNotificationAsUnreadMutationHookResult = ReturnType<typeof useMarkNotificationAsUnreadMutation>;
export type MarkNotificationAsUnreadMutationResult = Apollo.MutationResult<MarkNotificationAsUnreadMutation>;
export type MarkNotificationAsUnreadMutationOptions = Apollo.BaseMutationOptions<MarkNotificationAsUnreadMutation, MarkNotificationAsUnreadMutationVariables>;
export const MarkNotificationAsReceivedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkNotificationAsReceived"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userDeviceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markNotificationAsReceived"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"userDeviceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userDeviceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"receivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"userDeviceId"}},{"kind":"Field","name":{"kind":"Name","value":"userDevice"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceToken"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}}]}}]}}]}}]} as unknown as DocumentNode;
export type MarkNotificationAsReceivedMutationFn = Apollo.MutationFunction<MarkNotificationAsReceivedMutation, MarkNotificationAsReceivedMutationVariables>;

/**
 * __useMarkNotificationAsReceivedMutation__
 *
 * To run a mutation, you first call `useMarkNotificationAsReceivedMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMarkNotificationAsReceivedMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [markNotificationAsReceivedMutation, { data, loading, error }] = useMarkNotificationAsReceivedMutation({
 *   variables: {
 *      id: // value for 'id'
 *      userDeviceId: // value for 'userDeviceId'
 *   },
 * });
 */
export function useMarkNotificationAsReceivedMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<MarkNotificationAsReceivedMutation, MarkNotificationAsReceivedMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<MarkNotificationAsReceivedMutation, MarkNotificationAsReceivedMutationVariables>(MarkNotificationAsReceivedDocument, options);
      }
export type MarkNotificationAsReceivedMutationHookResult = ReturnType<typeof useMarkNotificationAsReceivedMutation>;
export type MarkNotificationAsReceivedMutationResult = Apollo.MutationResult<MarkNotificationAsReceivedMutation>;
export type MarkNotificationAsReceivedMutationOptions = Apollo.BaseMutationOptions<MarkNotificationAsReceivedMutation, MarkNotificationAsReceivedMutationVariables>;
export const DeviceReportNotificationReceivedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeviceReportNotificationReceived"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deviceReportNotificationReceived"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"receivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"userDeviceId"}},{"kind":"Field","name":{"kind":"Name","value":"userDevice"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceToken"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}}]}}]}}]}}]} as unknown as DocumentNode;
export type DeviceReportNotificationReceivedMutationFn = Apollo.MutationFunction<DeviceReportNotificationReceivedMutation, DeviceReportNotificationReceivedMutationVariables>;

/**
 * __useDeviceReportNotificationReceivedMutation__
 *
 * To run a mutation, you first call `useDeviceReportNotificationReceivedMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeviceReportNotificationReceivedMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deviceReportNotificationReceivedMutation, { data, loading, error }] = useDeviceReportNotificationReceivedMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeviceReportNotificationReceivedMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeviceReportNotificationReceivedMutation, DeviceReportNotificationReceivedMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeviceReportNotificationReceivedMutation, DeviceReportNotificationReceivedMutationVariables>(DeviceReportNotificationReceivedDocument, options);
      }
export type DeviceReportNotificationReceivedMutationHookResult = ReturnType<typeof useDeviceReportNotificationReceivedMutation>;
export type DeviceReportNotificationReceivedMutationResult = Apollo.MutationResult<DeviceReportNotificationReceivedMutation>;
export type DeviceReportNotificationReceivedMutationOptions = Apollo.BaseMutationOptions<DeviceReportNotificationReceivedMutation, DeviceReportNotificationReceivedMutationVariables>;
export const MarkAllNotificationsAsReadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkAllNotificationsAsRead"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markAllNotificationsAsRead"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatedCount"}},{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode;
export type MarkAllNotificationsAsReadMutationFn = Apollo.MutationFunction<MarkAllNotificationsAsReadMutation, MarkAllNotificationsAsReadMutationVariables>;

/**
 * __useMarkAllNotificationsAsReadMutation__
 *
 * To run a mutation, you first call `useMarkAllNotificationsAsReadMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMarkAllNotificationsAsReadMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [markAllNotificationsAsReadMutation, { data, loading, error }] = useMarkAllNotificationsAsReadMutation({
 *   variables: {
 *   },
 * });
 */
export function useMarkAllNotificationsAsReadMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<MarkAllNotificationsAsReadMutation, MarkAllNotificationsAsReadMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<MarkAllNotificationsAsReadMutation, MarkAllNotificationsAsReadMutationVariables>(MarkAllNotificationsAsReadDocument, options);
      }
export type MarkAllNotificationsAsReadMutationHookResult = ReturnType<typeof useMarkAllNotificationsAsReadMutation>;
export type MarkAllNotificationsAsReadMutationResult = Apollo.MutationResult<MarkAllNotificationsAsReadMutation>;
export type MarkAllNotificationsAsReadMutationOptions = Apollo.BaseMutationOptions<MarkAllNotificationsAsReadMutation, MarkAllNotificationsAsReadMutationVariables>;
export const MassDeleteNotificationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MassDeleteNotifications"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ids"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"massDeleteNotifications"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ids"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ids"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deletedCount"}},{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode;
export type MassDeleteNotificationsMutationFn = Apollo.MutationFunction<MassDeleteNotificationsMutation, MassDeleteNotificationsMutationVariables>;

/**
 * __useMassDeleteNotificationsMutation__
 *
 * To run a mutation, you first call `useMassDeleteNotificationsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMassDeleteNotificationsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [massDeleteNotificationsMutation, { data, loading, error }] = useMassDeleteNotificationsMutation({
 *   variables: {
 *      ids: // value for 'ids'
 *   },
 * });
 */
export function useMassDeleteNotificationsMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<MassDeleteNotificationsMutation, MassDeleteNotificationsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<MassDeleteNotificationsMutation, MassDeleteNotificationsMutationVariables>(MassDeleteNotificationsDocument, options);
      }
export type MassDeleteNotificationsMutationHookResult = ReturnType<typeof useMassDeleteNotificationsMutation>;
export type MassDeleteNotificationsMutationResult = Apollo.MutationResult<MassDeleteNotificationsMutation>;
export type MassDeleteNotificationsMutationOptions = Apollo.BaseMutationOptions<MassDeleteNotificationsMutation, MassDeleteNotificationsMutationVariables>;
export const MassMarkNotificationsAsReadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MassMarkNotificationsAsRead"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ids"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"massMarkNotificationsAsRead"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ids"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ids"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatedCount"}},{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode;
export type MassMarkNotificationsAsReadMutationFn = Apollo.MutationFunction<MassMarkNotificationsAsReadMutation, MassMarkNotificationsAsReadMutationVariables>;

/**
 * __useMassMarkNotificationsAsReadMutation__
 *
 * To run a mutation, you first call `useMassMarkNotificationsAsReadMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMassMarkNotificationsAsReadMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [massMarkNotificationsAsReadMutation, { data, loading, error }] = useMassMarkNotificationsAsReadMutation({
 *   variables: {
 *      ids: // value for 'ids'
 *   },
 * });
 */
export function useMassMarkNotificationsAsReadMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<MassMarkNotificationsAsReadMutation, MassMarkNotificationsAsReadMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<MassMarkNotificationsAsReadMutation, MassMarkNotificationsAsReadMutationVariables>(MassMarkNotificationsAsReadDocument, options);
      }
export type MassMarkNotificationsAsReadMutationHookResult = ReturnType<typeof useMassMarkNotificationsAsReadMutation>;
export type MassMarkNotificationsAsReadMutationResult = Apollo.MutationResult<MassMarkNotificationsAsReadMutation>;
export type MassMarkNotificationsAsReadMutationOptions = Apollo.BaseMutationOptions<MassMarkNotificationsAsReadMutation, MassMarkNotificationsAsReadMutationVariables>;
export const MassMarkNotificationsAsUnreadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MassMarkNotificationsAsUnread"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ids"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"massMarkNotificationsAsUnread"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ids"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ids"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatedCount"}},{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode;
export type MassMarkNotificationsAsUnreadMutationFn = Apollo.MutationFunction<MassMarkNotificationsAsUnreadMutation, MassMarkNotificationsAsUnreadMutationVariables>;

/**
 * __useMassMarkNotificationsAsUnreadMutation__
 *
 * To run a mutation, you first call `useMassMarkNotificationsAsUnreadMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMassMarkNotificationsAsUnreadMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [massMarkNotificationsAsUnreadMutation, { data, loading, error }] = useMassMarkNotificationsAsUnreadMutation({
 *   variables: {
 *      ids: // value for 'ids'
 *   },
 * });
 */
export function useMassMarkNotificationsAsUnreadMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<MassMarkNotificationsAsUnreadMutation, MassMarkNotificationsAsUnreadMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<MassMarkNotificationsAsUnreadMutation, MassMarkNotificationsAsUnreadMutationVariables>(MassMarkNotificationsAsUnreadDocument, options);
      }
export type MassMarkNotificationsAsUnreadMutationHookResult = ReturnType<typeof useMassMarkNotificationsAsUnreadMutation>;
export type MassMarkNotificationsAsUnreadMutationResult = Apollo.MutationResult<MassMarkNotificationsAsUnreadMutation>;
export type MassMarkNotificationsAsUnreadMutationOptions = Apollo.BaseMutationOptions<MassMarkNotificationsAsUnreadMutation, MassMarkNotificationsAsUnreadMutationVariables>;
export const GetBucketsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBuckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketWithDevicesFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketPermissionsFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BucketPermissionsDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canWrite"}},{"kind":"Field","name":{"kind":"Name","value":"canDelete"}},{"kind":"Field","name":{"kind":"Name","value":"canAdmin"}},{"kind":"Field","name":{"kind":"Name","value":"canRead"}},{"kind":"Field","name":{"kind":"Name","value":"isOwner"}},{"kind":"Field","name":{"kind":"Name","value":"isSharedWithMe"}},{"kind":"Field","name":{"kind":"Name","value":"sharedCount"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketWithDevicesFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"permissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EntityPermissionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"userBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserBucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"userPermissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketPermissionsFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityPermissionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityPermission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inviteCodeId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"grantedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"bucketId"}},{"kind":"Field","name":{"kind":"Name","value":"magicCode"}},{"kind":"Field","name":{"kind":"Name","value":"customName"}},{"kind":"Field","name":{"kind":"Name","value":"snoozeUntil"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"timeFrom"}},{"kind":"Field","name":{"kind":"Name","value":"timeTill"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}}]}}]} as unknown as DocumentNode;

/**
 * __useGetBucketsQuery__
 *
 * To run a query within a React component, call `useGetBucketsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetBucketsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetBucketsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetBucketsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetBucketsQuery, GetBucketsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetBucketsQuery, GetBucketsQueryVariables>(GetBucketsDocument, options);
      }
export function useGetBucketsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetBucketsQuery, GetBucketsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetBucketsQuery, GetBucketsQueryVariables>(GetBucketsDocument, options);
        }
export function useGetBucketsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetBucketsQuery, GetBucketsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetBucketsQuery, GetBucketsQueryVariables>(GetBucketsDocument, options);
        }
export type GetBucketsQueryHookResult = ReturnType<typeof useGetBucketsQuery>;
export type GetBucketsLazyQueryHookResult = ReturnType<typeof useGetBucketsLazyQuery>;
export type GetBucketsSuspenseQueryHookResult = ReturnType<typeof useGetBucketsSuspenseQuery>;
export type GetBucketsQueryResult = Apollo.QueryResult<GetBucketsQuery, GetBucketsQueryVariables>;
export const GetBucketDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBucket"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bucket"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFullFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageAttachmentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MessageAttachment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"attachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"saveOnServer"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationActionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NotificationAction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"destructive"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Message"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"attachments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageAttachmentFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tapAction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"actions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sound"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryType"}},{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"}},{"kind":"Field","name":{"kind":"Name","value":"executionId"}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketPermissionsFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BucketPermissionsDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canWrite"}},{"kind":"Field","name":{"kind":"Name","value":"canDelete"}},{"kind":"Field","name":{"kind":"Name","value":"canAdmin"}},{"kind":"Field","name":{"kind":"Name","value":"canRead"}},{"kind":"Field","name":{"kind":"Name","value":"isOwner"}},{"kind":"Field","name":{"kind":"Name","value":"isSharedWithMe"}},{"kind":"Field","name":{"kind":"Name","value":"sharedCount"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFullFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"messages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"permissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EntityPermissionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"userBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserBucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"userPermissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketPermissionsFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityPermissionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityPermission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inviteCodeId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"grantedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"bucketId"}},{"kind":"Field","name":{"kind":"Name","value":"magicCode"}},{"kind":"Field","name":{"kind":"Name","value":"customName"}},{"kind":"Field","name":{"kind":"Name","value":"snoozeUntil"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"timeFrom"}},{"kind":"Field","name":{"kind":"Name","value":"timeTill"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}}]}}]} as unknown as DocumentNode;

/**
 * __useGetBucketQuery__
 *
 * To run a query within a React component, call `useGetBucketQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetBucketQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetBucketQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetBucketQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetBucketQuery, GetBucketQueryVariables> & ({ variables: GetBucketQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetBucketQuery, GetBucketQueryVariables>(GetBucketDocument, options);
      }
export function useGetBucketLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetBucketQuery, GetBucketQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetBucketQuery, GetBucketQueryVariables>(GetBucketDocument, options);
        }
export function useGetBucketSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetBucketQuery, GetBucketQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetBucketQuery, GetBucketQueryVariables>(GetBucketDocument, options);
        }
export type GetBucketQueryHookResult = ReturnType<typeof useGetBucketQuery>;
export type GetBucketLazyQueryHookResult = ReturnType<typeof useGetBucketLazyQuery>;
export type GetBucketSuspenseQueryHookResult = ReturnType<typeof useGetBucketSuspenseQuery>;
export type GetBucketQueryResult = Apollo.QueryResult<GetBucketQuery, GetBucketQueryVariables>;
export const CreateBucketDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateBucket"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateBucketDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createBucket"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketWithDevicesFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketPermissionsFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BucketPermissionsDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canWrite"}},{"kind":"Field","name":{"kind":"Name","value":"canDelete"}},{"kind":"Field","name":{"kind":"Name","value":"canAdmin"}},{"kind":"Field","name":{"kind":"Name","value":"canRead"}},{"kind":"Field","name":{"kind":"Name","value":"isOwner"}},{"kind":"Field","name":{"kind":"Name","value":"isSharedWithMe"}},{"kind":"Field","name":{"kind":"Name","value":"sharedCount"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketWithDevicesFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"permissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EntityPermissionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"userBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserBucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"userPermissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketPermissionsFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityPermissionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityPermission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inviteCodeId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"grantedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"bucketId"}},{"kind":"Field","name":{"kind":"Name","value":"magicCode"}},{"kind":"Field","name":{"kind":"Name","value":"customName"}},{"kind":"Field","name":{"kind":"Name","value":"snoozeUntil"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"timeFrom"}},{"kind":"Field","name":{"kind":"Name","value":"timeTill"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}}]}}]} as unknown as DocumentNode;
export type CreateBucketMutationFn = Apollo.MutationFunction<CreateBucketMutation, CreateBucketMutationVariables>;

/**
 * __useCreateBucketMutation__
 *
 * To run a mutation, you first call `useCreateBucketMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateBucketMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createBucketMutation, { data, loading, error }] = useCreateBucketMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateBucketMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateBucketMutation, CreateBucketMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateBucketMutation, CreateBucketMutationVariables>(CreateBucketDocument, options);
      }
export type CreateBucketMutationHookResult = ReturnType<typeof useCreateBucketMutation>;
export type CreateBucketMutationResult = Apollo.MutationResult<CreateBucketMutation>;
export type CreateBucketMutationOptions = Apollo.BaseMutationOptions<CreateBucketMutation, CreateBucketMutationVariables>;
export const UpdateReceivedNotificationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateReceivedNotifications"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateReceivedNotifications"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatedCount"}},{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode;
export type UpdateReceivedNotificationsMutationFn = Apollo.MutationFunction<UpdateReceivedNotificationsMutation, UpdateReceivedNotificationsMutationVariables>;

/**
 * __useUpdateReceivedNotificationsMutation__
 *
 * To run a mutation, you first call `useUpdateReceivedNotificationsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateReceivedNotificationsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateReceivedNotificationsMutation, { data, loading, error }] = useUpdateReceivedNotificationsMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useUpdateReceivedNotificationsMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateReceivedNotificationsMutation, UpdateReceivedNotificationsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateReceivedNotificationsMutation, UpdateReceivedNotificationsMutationVariables>(UpdateReceivedNotificationsDocument, options);
      }
export type UpdateReceivedNotificationsMutationHookResult = ReturnType<typeof useUpdateReceivedNotificationsMutation>;
export type UpdateReceivedNotificationsMutationResult = Apollo.MutationResult<UpdateReceivedNotificationsMutation>;
export type UpdateReceivedNotificationsMutationOptions = Apollo.BaseMutationOptions<UpdateReceivedNotificationsMutation, UpdateReceivedNotificationsMutationVariables>;
export const UpdateBucketDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateBucket"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateBucketDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateBucket"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketWithDevicesFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketPermissionsFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BucketPermissionsDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canWrite"}},{"kind":"Field","name":{"kind":"Name","value":"canDelete"}},{"kind":"Field","name":{"kind":"Name","value":"canAdmin"}},{"kind":"Field","name":{"kind":"Name","value":"canRead"}},{"kind":"Field","name":{"kind":"Name","value":"isOwner"}},{"kind":"Field","name":{"kind":"Name","value":"isSharedWithMe"}},{"kind":"Field","name":{"kind":"Name","value":"sharedCount"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketWithDevicesFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"permissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EntityPermissionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"userBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserBucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"userPermissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketPermissionsFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityPermissionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityPermission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inviteCodeId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"grantedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"bucketId"}},{"kind":"Field","name":{"kind":"Name","value":"magicCode"}},{"kind":"Field","name":{"kind":"Name","value":"customName"}},{"kind":"Field","name":{"kind":"Name","value":"snoozeUntil"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"timeFrom"}},{"kind":"Field","name":{"kind":"Name","value":"timeTill"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}}]}}]} as unknown as DocumentNode;
export type UpdateBucketMutationFn = Apollo.MutationFunction<UpdateBucketMutation, UpdateBucketMutationVariables>;

/**
 * __useUpdateBucketMutation__
 *
 * To run a mutation, you first call `useUpdateBucketMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateBucketMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateBucketMutation, { data, loading, error }] = useUpdateBucketMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateBucketMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateBucketMutation, UpdateBucketMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateBucketMutation, UpdateBucketMutationVariables>(UpdateBucketDocument, options);
      }
export type UpdateBucketMutationHookResult = ReturnType<typeof useUpdateBucketMutation>;
export type UpdateBucketMutationResult = Apollo.MutationResult<UpdateBucketMutation>;
export type UpdateBucketMutationOptions = Apollo.BaseMutationOptions<UpdateBucketMutation, UpdateBucketMutationVariables>;
export const DeleteBucketDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteBucket"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteBucket"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode;
export type DeleteBucketMutationFn = Apollo.MutationFunction<DeleteBucketMutation, DeleteBucketMutationVariables>;

/**
 * __useDeleteBucketMutation__
 *
 * To run a mutation, you first call `useDeleteBucketMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteBucketMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteBucketMutation, { data, loading, error }] = useDeleteBucketMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteBucketMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteBucketMutation, DeleteBucketMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteBucketMutation, DeleteBucketMutationVariables>(DeleteBucketDocument, options);
      }
export type DeleteBucketMutationHookResult = ReturnType<typeof useDeleteBucketMutation>;
export type DeleteBucketMutationResult = Apollo.MutationResult<DeleteBucketMutation>;
export type DeleteBucketMutationOptions = Apollo.BaseMutationOptions<DeleteBucketMutation, DeleteBucketMutationVariables>;
export const BucketPermissionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BucketPermissions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bucketPermissions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"bucketId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EntityPermissionFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityPermissionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityPermission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inviteCodeId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"grantedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}}]} as unknown as DocumentNode;

/**
 * __useBucketPermissionsQuery__
 *
 * To run a query within a React component, call `useBucketPermissionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useBucketPermissionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useBucketPermissionsQuery({
 *   variables: {
 *      bucketId: // value for 'bucketId'
 *   },
 * });
 */
export function useBucketPermissionsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<BucketPermissionsQuery, BucketPermissionsQueryVariables> & ({ variables: BucketPermissionsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<BucketPermissionsQuery, BucketPermissionsQueryVariables>(BucketPermissionsDocument, options);
      }
export function useBucketPermissionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<BucketPermissionsQuery, BucketPermissionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<BucketPermissionsQuery, BucketPermissionsQueryVariables>(BucketPermissionsDocument, options);
        }
export function useBucketPermissionsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<BucketPermissionsQuery, BucketPermissionsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<BucketPermissionsQuery, BucketPermissionsQueryVariables>(BucketPermissionsDocument, options);
        }
export type BucketPermissionsQueryHookResult = ReturnType<typeof useBucketPermissionsQuery>;
export type BucketPermissionsLazyQueryHookResult = ReturnType<typeof useBucketPermissionsLazyQuery>;
export type BucketPermissionsSuspenseQueryHookResult = ReturnType<typeof useBucketPermissionsSuspenseQuery>;
export type BucketPermissionsQueryResult = Apollo.QueryResult<BucketPermissionsQuery, BucketPermissionsQueryVariables>;
export const ShareBucketDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ShareBucket"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"GrantEntityPermissionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"shareBucket"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EntityPermissionFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityPermissionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityPermission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inviteCodeId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"grantedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}}]} as unknown as DocumentNode;
export type ShareBucketMutationFn = Apollo.MutationFunction<ShareBucketMutation, ShareBucketMutationVariables>;

/**
 * __useShareBucketMutation__
 *
 * To run a mutation, you first call `useShareBucketMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useShareBucketMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [shareBucketMutation, { data, loading, error }] = useShareBucketMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useShareBucketMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ShareBucketMutation, ShareBucketMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ShareBucketMutation, ShareBucketMutationVariables>(ShareBucketDocument, options);
      }
export type ShareBucketMutationHookResult = ReturnType<typeof useShareBucketMutation>;
export type ShareBucketMutationResult = Apollo.MutationResult<ShareBucketMutation>;
export type ShareBucketMutationOptions = Apollo.BaseMutationOptions<ShareBucketMutation, ShareBucketMutationVariables>;
export const UnshareBucketDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnshareBucket"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RevokeEntityPermissionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshareBucket"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode;
export type UnshareBucketMutationFn = Apollo.MutationFunction<UnshareBucketMutation, UnshareBucketMutationVariables>;

/**
 * __useUnshareBucketMutation__
 *
 * To run a mutation, you first call `useUnshareBucketMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnshareBucketMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unshareBucketMutation, { data, loading, error }] = useUnshareBucketMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUnshareBucketMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UnshareBucketMutation, UnshareBucketMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UnshareBucketMutation, UnshareBucketMutationVariables>(UnshareBucketDocument, options);
      }
export type UnshareBucketMutationHookResult = ReturnType<typeof useUnshareBucketMutation>;
export type UnshareBucketMutationResult = Apollo.MutationResult<UnshareBucketMutation>;
export type UnshareBucketMutationOptions = Apollo.BaseMutationOptions<UnshareBucketMutation, UnshareBucketMutationVariables>;
export const InviteCodesForResourceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"InviteCodesForResource"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"resourceType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"resourceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"inviteCodesForResource"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"resourceType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"resourceType"}}},{"kind":"Argument","name":{"kind":"Name","value":"resourceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"resourceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"InviteCodeFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"InviteCodeFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"InviteCode"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"usageCount"}},{"kind":"Field","name":{"kind":"Name","value":"maxUses"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"creator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}}]}}]} as unknown as DocumentNode;

/**
 * __useInviteCodesForResourceQuery__
 *
 * To run a query within a React component, call `useInviteCodesForResourceQuery` and pass it any options that fit your needs.
 * When your component renders, `useInviteCodesForResourceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useInviteCodesForResourceQuery({
 *   variables: {
 *      resourceType: // value for 'resourceType'
 *      resourceId: // value for 'resourceId'
 *   },
 * });
 */
export function useInviteCodesForResourceQuery(baseOptions: ApolloReactHooks.QueryHookOptions<InviteCodesForResourceQuery, InviteCodesForResourceQueryVariables> & ({ variables: InviteCodesForResourceQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<InviteCodesForResourceQuery, InviteCodesForResourceQueryVariables>(InviteCodesForResourceDocument, options);
      }
export function useInviteCodesForResourceLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<InviteCodesForResourceQuery, InviteCodesForResourceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<InviteCodesForResourceQuery, InviteCodesForResourceQueryVariables>(InviteCodesForResourceDocument, options);
        }
export function useInviteCodesForResourceSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<InviteCodesForResourceQuery, InviteCodesForResourceQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<InviteCodesForResourceQuery, InviteCodesForResourceQueryVariables>(InviteCodesForResourceDocument, options);
        }
export type InviteCodesForResourceQueryHookResult = ReturnType<typeof useInviteCodesForResourceQuery>;
export type InviteCodesForResourceLazyQueryHookResult = ReturnType<typeof useInviteCodesForResourceLazyQuery>;
export type InviteCodesForResourceSuspenseQueryHookResult = ReturnType<typeof useInviteCodesForResourceSuspenseQuery>;
export type InviteCodesForResourceQueryResult = Apollo.QueryResult<InviteCodesForResourceQuery, InviteCodesForResourceQueryVariables>;
export const CreateInviteCodeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateInviteCode"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateInviteCodeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createInviteCode"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"InviteCodeFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"InviteCodeFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"InviteCode"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"usageCount"}},{"kind":"Field","name":{"kind":"Name","value":"maxUses"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"creator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}}]}}]} as unknown as DocumentNode;
export type CreateInviteCodeMutationFn = Apollo.MutationFunction<CreateInviteCodeMutation, CreateInviteCodeMutationVariables>;

/**
 * __useCreateInviteCodeMutation__
 *
 * To run a mutation, you first call `useCreateInviteCodeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateInviteCodeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createInviteCodeMutation, { data, loading, error }] = useCreateInviteCodeMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateInviteCodeMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateInviteCodeMutation, CreateInviteCodeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateInviteCodeMutation, CreateInviteCodeMutationVariables>(CreateInviteCodeDocument, options);
      }
export type CreateInviteCodeMutationHookResult = ReturnType<typeof useCreateInviteCodeMutation>;
export type CreateInviteCodeMutationResult = Apollo.MutationResult<CreateInviteCodeMutation>;
export type CreateInviteCodeMutationOptions = Apollo.BaseMutationOptions<CreateInviteCodeMutation, CreateInviteCodeMutationVariables>;
export const UpdateInviteCodeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateInviteCode"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateInviteCodeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateInviteCode"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"InviteCodeFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"InviteCodeFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"InviteCode"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"usageCount"}},{"kind":"Field","name":{"kind":"Name","value":"maxUses"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"creator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}}]}}]} as unknown as DocumentNode;
export type UpdateInviteCodeMutationFn = Apollo.MutationFunction<UpdateInviteCodeMutation, UpdateInviteCodeMutationVariables>;

/**
 * __useUpdateInviteCodeMutation__
 *
 * To run a mutation, you first call `useUpdateInviteCodeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateInviteCodeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateInviteCodeMutation, { data, loading, error }] = useUpdateInviteCodeMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateInviteCodeMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateInviteCodeMutation, UpdateInviteCodeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateInviteCodeMutation, UpdateInviteCodeMutationVariables>(UpdateInviteCodeDocument, options);
      }
export type UpdateInviteCodeMutationHookResult = ReturnType<typeof useUpdateInviteCodeMutation>;
export type UpdateInviteCodeMutationResult = Apollo.MutationResult<UpdateInviteCodeMutation>;
export type UpdateInviteCodeMutationOptions = Apollo.BaseMutationOptions<UpdateInviteCodeMutation, UpdateInviteCodeMutationVariables>;
export const DeleteInviteCodeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteInviteCode"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteInviteCode"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode;
export type DeleteInviteCodeMutationFn = Apollo.MutationFunction<DeleteInviteCodeMutation, DeleteInviteCodeMutationVariables>;

/**
 * __useDeleteInviteCodeMutation__
 *
 * To run a mutation, you first call `useDeleteInviteCodeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteInviteCodeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteInviteCodeMutation, { data, loading, error }] = useDeleteInviteCodeMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteInviteCodeMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteInviteCodeMutation, DeleteInviteCodeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteInviteCodeMutation, DeleteInviteCodeMutationVariables>(DeleteInviteCodeDocument, options);
      }
export type DeleteInviteCodeMutationHookResult = ReturnType<typeof useDeleteInviteCodeMutation>;
export type DeleteInviteCodeMutationResult = Apollo.MutationResult<DeleteInviteCodeMutation>;
export type DeleteInviteCodeMutationOptions = Apollo.BaseMutationOptions<DeleteInviteCodeMutation, DeleteInviteCodeMutationVariables>;
export const RedeemInviteCodeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RedeemInviteCode"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RedeemInviteCodeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"redeemInviteCode"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}}]}}]}}]} as unknown as DocumentNode;
export type RedeemInviteCodeMutationFn = Apollo.MutationFunction<RedeemInviteCodeMutation, RedeemInviteCodeMutationVariables>;

/**
 * __useRedeemInviteCodeMutation__
 *
 * To run a mutation, you first call `useRedeemInviteCodeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRedeemInviteCodeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [redeemInviteCodeMutation, { data, loading, error }] = useRedeemInviteCodeMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRedeemInviteCodeMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RedeemInviteCodeMutation, RedeemInviteCodeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RedeemInviteCodeMutation, RedeemInviteCodeMutationVariables>(RedeemInviteCodeDocument, options);
      }
export type RedeemInviteCodeMutationHookResult = ReturnType<typeof useRedeemInviteCodeMutation>;
export type RedeemInviteCodeMutationResult = Apollo.MutationResult<RedeemInviteCodeMutation>;
export type RedeemInviteCodeMutationOptions = Apollo.BaseMutationOptions<RedeemInviteCodeMutation, RedeemInviteCodeMutationVariables>;
export const GetMeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMe"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserDeviceFragment"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserDeviceFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserDevice"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"deviceToken"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publicKey"}},{"kind":"Field","name":{"kind":"Name","value":"privateKey"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetMeQuery__
 *
 * To run a query within a React component, call `useGetMeQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMeQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetMeQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetMeQuery, GetMeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetMeQuery, GetMeQueryVariables>(GetMeDocument, options);
      }
export function useGetMeLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetMeQuery, GetMeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetMeQuery, GetMeQueryVariables>(GetMeDocument, options);
        }
export function useGetMeSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetMeQuery, GetMeQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetMeQuery, GetMeQueryVariables>(GetMeDocument, options);
        }
export type GetMeQueryHookResult = ReturnType<typeof useGetMeQuery>;
export type GetMeLazyQueryHookResult = ReturnType<typeof useGetMeLazyQuery>;
export type GetMeSuspenseQueryHookResult = ReturnType<typeof useGetMeSuspenseQuery>;
export type GetMeQueryResult = Apollo.QueryResult<GetMeQuery, GetMeQueryVariables>;
export const GetUserSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserSettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"deviceId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userSettings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"deviceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"deviceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSettingFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSettingFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserSetting"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"deviceId"}},{"kind":"Field","name":{"kind":"Name","value":"configType"}},{"kind":"Field","name":{"kind":"Name","value":"valueText"}},{"kind":"Field","name":{"kind":"Name","value":"valueBool"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetUserSettingsQuery__
 *
 * To run a query within a React component, call `useGetUserSettingsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUserSettingsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUserSettingsQuery({
 *   variables: {
 *      deviceId: // value for 'deviceId'
 *   },
 * });
 */
export function useGetUserSettingsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetUserSettingsQuery, GetUserSettingsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetUserSettingsQuery, GetUserSettingsQueryVariables>(GetUserSettingsDocument, options);
      }
export function useGetUserSettingsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetUserSettingsQuery, GetUserSettingsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetUserSettingsQuery, GetUserSettingsQueryVariables>(GetUserSettingsDocument, options);
        }
export function useGetUserSettingsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetUserSettingsQuery, GetUserSettingsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetUserSettingsQuery, GetUserSettingsQueryVariables>(GetUserSettingsDocument, options);
        }
export type GetUserSettingsQueryHookResult = ReturnType<typeof useGetUserSettingsQuery>;
export type GetUserSettingsLazyQueryHookResult = ReturnType<typeof useGetUserSettingsLazyQuery>;
export type GetUserSettingsSuspenseQueryHookResult = ReturnType<typeof useGetUserSettingsSuspenseQuery>;
export type GetUserSettingsQueryResult = Apollo.QueryResult<GetUserSettingsQuery, GetUserSettingsQueryVariables>;
export const UpsertUserSettingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpsertUserSetting"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpsertUserSettingInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"upsertUserSetting"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSettingFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSettingFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserSetting"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"deviceId"}},{"kind":"Field","name":{"kind":"Name","value":"configType"}},{"kind":"Field","name":{"kind":"Name","value":"valueText"}},{"kind":"Field","name":{"kind":"Name","value":"valueBool"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export type UpsertUserSettingMutationFn = Apollo.MutationFunction<UpsertUserSettingMutation, UpsertUserSettingMutationVariables>;

/**
 * __useUpsertUserSettingMutation__
 *
 * To run a mutation, you first call `useUpsertUserSettingMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpsertUserSettingMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [upsertUserSettingMutation, { data, loading, error }] = useUpsertUserSettingMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpsertUserSettingMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpsertUserSettingMutation, UpsertUserSettingMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpsertUserSettingMutation, UpsertUserSettingMutationVariables>(UpsertUserSettingDocument, options);
      }
export type UpsertUserSettingMutationHookResult = ReturnType<typeof useUpsertUserSettingMutation>;
export type UpsertUserSettingMutationResult = Apollo.MutationResult<UpsertUserSettingMutation>;
export type UpsertUserSettingMutationOptions = Apollo.BaseMutationOptions<UpsertUserSettingMutation, UpsertUserSettingMutationVariables>;
export const AppleLoginMobileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AppleLoginMobile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"MobileAppleAuthDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"appleLoginMobile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"accessToken"}},{"kind":"Field","name":{"kind":"Name","value":"refreshToken"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}}]}}]}}]} as unknown as DocumentNode;
export type AppleLoginMobileMutationFn = Apollo.MutationFunction<AppleLoginMobileMutation, AppleLoginMobileMutationVariables>;

/**
 * __useAppleLoginMobileMutation__
 *
 * To run a mutation, you first call `useAppleLoginMobileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAppleLoginMobileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [appleLoginMobileMutation, { data, loading, error }] = useAppleLoginMobileMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAppleLoginMobileMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<AppleLoginMobileMutation, AppleLoginMobileMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<AppleLoginMobileMutation, AppleLoginMobileMutationVariables>(AppleLoginMobileDocument, options);
      }
export type AppleLoginMobileMutationHookResult = ReturnType<typeof useAppleLoginMobileMutation>;
export type AppleLoginMobileMutationResult = Apollo.MutationResult<AppleLoginMobileMutation>;
export type AppleLoginMobileMutationOptions = Apollo.BaseMutationOptions<AppleLoginMobileMutation, AppleLoginMobileMutationVariables>;
export const LoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Login"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"LoginDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"accessToken"}},{"kind":"Field","name":{"kind":"Name","value":"refreshToken"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}}]}}]}}]} as unknown as DocumentNode;
export type LoginMutationFn = Apollo.MutationFunction<LoginMutation, LoginMutationVariables>;

/**
 * __useLoginMutation__
 *
 * To run a mutation, you first call `useLoginMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLoginMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [loginMutation, { data, loading, error }] = useLoginMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useLoginMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<LoginMutation, LoginMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<LoginMutation, LoginMutationVariables>(LoginDocument, options);
      }
export type LoginMutationHookResult = ReturnType<typeof useLoginMutation>;
export type LoginMutationResult = Apollo.MutationResult<LoginMutation>;
export type LoginMutationOptions = Apollo.BaseMutationOptions<LoginMutation, LoginMutationVariables>;
export const RegisterDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Register"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RegisterDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"register"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}},{"kind":"Field","name":{"kind":"Name","value":"emailConfirmationRequired"}},{"kind":"Field","name":{"kind":"Name","value":"accessToken"}},{"kind":"Field","name":{"kind":"Name","value":"refreshToken"}}]}}]}}]} as unknown as DocumentNode;
export type RegisterMutationFn = Apollo.MutationFunction<RegisterMutation, RegisterMutationVariables>;

/**
 * __useRegisterMutation__
 *
 * To run a mutation, you first call `useRegisterMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRegisterMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [registerMutation, { data, loading, error }] = useRegisterMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRegisterMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RegisterMutation, RegisterMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RegisterMutation, RegisterMutationVariables>(RegisterDocument, options);
      }
export type RegisterMutationHookResult = ReturnType<typeof useRegisterMutation>;
export type RegisterMutationResult = Apollo.MutationResult<RegisterMutation>;
export type RegisterMutationOptions = Apollo.BaseMutationOptions<RegisterMutation, RegisterMutationVariables>;
export const LogoutDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Logout"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logout"}}]}}]} as unknown as DocumentNode;
export type LogoutMutationFn = Apollo.MutationFunction<LogoutMutation, LogoutMutationVariables>;

/**
 * __useLogoutMutation__
 *
 * To run a mutation, you first call `useLogoutMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLogoutMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [logoutMutation, { data, loading, error }] = useLogoutMutation({
 *   variables: {
 *   },
 * });
 */
export function useLogoutMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<LogoutMutation, LogoutMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<LogoutMutation, LogoutMutationVariables>(LogoutDocument, options);
      }
export type LogoutMutationHookResult = ReturnType<typeof useLogoutMutation>;
export type LogoutMutationResult = Apollo.MutationResult<LogoutMutation>;
export type LogoutMutationOptions = Apollo.BaseMutationOptions<LogoutMutation, LogoutMutationVariables>;
export const RefreshAccessTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RefreshAccessToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"refreshToken"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"refreshAccessToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"refreshToken"},"value":{"kind":"Variable","name":{"kind":"Name","value":"refreshToken"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"accessToken"}},{"kind":"Field","name":{"kind":"Name","value":"refreshToken"}}]}}]}}]} as unknown as DocumentNode;
export type RefreshAccessTokenMutationFn = Apollo.MutationFunction<RefreshAccessTokenMutation, RefreshAccessTokenMutationVariables>;

/**
 * __useRefreshAccessTokenMutation__
 *
 * To run a mutation, you first call `useRefreshAccessTokenMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRefreshAccessTokenMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [refreshAccessTokenMutation, { data, loading, error }] = useRefreshAccessTokenMutation({
 *   variables: {
 *      refreshToken: // value for 'refreshToken'
 *   },
 * });
 */
export function useRefreshAccessTokenMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RefreshAccessTokenMutation, RefreshAccessTokenMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RefreshAccessTokenMutation, RefreshAccessTokenMutationVariables>(RefreshAccessTokenDocument, options);
      }
export type RefreshAccessTokenMutationHookResult = ReturnType<typeof useRefreshAccessTokenMutation>;
export type RefreshAccessTokenMutationResult = Apollo.MutationResult<RefreshAccessTokenMutation>;
export type RefreshAccessTokenMutationOptions = Apollo.BaseMutationOptions<RefreshAccessTokenMutation, RefreshAccessTokenMutationVariables>;
export const UpdateProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateProfile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateProfileInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProfile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export type UpdateProfileMutationFn = Apollo.MutationFunction<UpdateProfileMutation, UpdateProfileMutationVariables>;

/**
 * __useUpdateProfileMutation__
 *
 * To run a mutation, you first call `useUpdateProfileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateProfileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateProfileMutation, { data, loading, error }] = useUpdateProfileMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateProfileMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateProfileMutation, UpdateProfileMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateProfileMutation, UpdateProfileMutationVariables>(UpdateProfileDocument, options);
      }
export type UpdateProfileMutationHookResult = ReturnType<typeof useUpdateProfileMutation>;
export type UpdateProfileMutationResult = Apollo.MutationResult<UpdateProfileMutation>;
export type UpdateProfileMutationOptions = Apollo.BaseMutationOptions<UpdateProfileMutation, UpdateProfileMutationVariables>;
export const ChangePasswordDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ChangePassword"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ChangePasswordInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changePassword"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode;
export type ChangePasswordMutationFn = Apollo.MutationFunction<ChangePasswordMutation, ChangePasswordMutationVariables>;

/**
 * __useChangePasswordMutation__
 *
 * To run a mutation, you first call `useChangePasswordMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useChangePasswordMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [changePasswordMutation, { data, loading, error }] = useChangePasswordMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useChangePasswordMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ChangePasswordMutation, ChangePasswordMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ChangePasswordMutation, ChangePasswordMutationVariables>(ChangePasswordDocument, options);
      }
export type ChangePasswordMutationHookResult = ReturnType<typeof useChangePasswordMutation>;
export type ChangePasswordMutationResult = Apollo.MutationResult<ChangePasswordMutation>;
export type ChangePasswordMutationOptions = Apollo.BaseMutationOptions<ChangePasswordMutation, ChangePasswordMutationVariables>;
export const SetPasswordDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetPassword"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ChangePasswordInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setPassword"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode;
export type SetPasswordMutationFn = Apollo.MutationFunction<SetPasswordMutation, SetPasswordMutationVariables>;

/**
 * __useSetPasswordMutation__
 *
 * To run a mutation, you first call `useSetPasswordMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetPasswordMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setPasswordMutation, { data, loading, error }] = useSetPasswordMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSetPasswordMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<SetPasswordMutation, SetPasswordMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<SetPasswordMutation, SetPasswordMutationVariables>(SetPasswordDocument, options);
      }
export type SetPasswordMutationHookResult = ReturnType<typeof useSetPasswordMutation>;
export type SetPasswordMutationResult = Apollo.MutationResult<SetPasswordMutation>;
export type SetPasswordMutationOptions = Apollo.BaseMutationOptions<SetPasswordMutation, SetPasswordMutationVariables>;
export const DeleteAccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteAccount"}}]}}]} as unknown as DocumentNode;
export type DeleteAccountMutationFn = Apollo.MutationFunction<DeleteAccountMutation, DeleteAccountMutationVariables>;

/**
 * __useDeleteAccountMutation__
 *
 * To run a mutation, you first call `useDeleteAccountMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteAccountMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteAccountMutation, { data, loading, error }] = useDeleteAccountMutation({
 *   variables: {
 *   },
 * });
 */
export function useDeleteAccountMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteAccountMutation, DeleteAccountMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteAccountMutation, DeleteAccountMutationVariables>(DeleteAccountDocument, options);
      }
export type DeleteAccountMutationHookResult = ReturnType<typeof useDeleteAccountMutation>;
export type DeleteAccountMutationResult = Apollo.MutationResult<DeleteAccountMutation>;
export type DeleteAccountMutationOptions = Apollo.BaseMutationOptions<DeleteAccountMutation, DeleteAccountMutationVariables>;
export const NotificationCreatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"NotificationCreated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notificationCreated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageAttachmentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MessageAttachment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"attachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"saveOnServer"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationActionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NotificationAction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"destructive"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Message"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"attachments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageAttachmentFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tapAction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"actions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sound"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryType"}},{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"}},{"kind":"Field","name":{"kind":"Name","value":"executionId"}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Notification"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"receivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"readAt"}},{"kind":"Field","name":{"kind":"Name","value":"sentAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"message"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}}]} as unknown as DocumentNode;

/**
 * __useNotificationCreatedSubscription__
 *
 * To run a query within a React component, call `useNotificationCreatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useNotificationCreatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useNotificationCreatedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useNotificationCreatedSubscription(baseOptions?: ApolloReactHooks.SubscriptionHookOptions<NotificationCreatedSubscription, NotificationCreatedSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useSubscription<NotificationCreatedSubscription, NotificationCreatedSubscriptionVariables>(NotificationCreatedDocument, options);
      }
export type NotificationCreatedSubscriptionHookResult = ReturnType<typeof useNotificationCreatedSubscription>;
export type NotificationCreatedSubscriptionResult = Apollo.SubscriptionResult<NotificationCreatedSubscription>;
export const NotificationUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"NotificationUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notificationUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationFragment"}},{"kind":"Field","name":{"kind":"Name","value":"readAt"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageAttachmentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MessageAttachment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"attachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"saveOnServer"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationActionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NotificationAction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"destructive"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MessageFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Message"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"attachments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageAttachmentFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tapAction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"actions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationActionFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sound"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryType"}},{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"}},{"kind":"Field","name":{"kind":"Name","value":"executionId"}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Notification"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"receivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"readAt"}},{"kind":"Field","name":{"kind":"Name","value":"sentAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"message"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MessageFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}}]} as unknown as DocumentNode;

/**
 * __useNotificationUpdatedSubscription__
 *
 * To run a query within a React component, call `useNotificationUpdatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useNotificationUpdatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useNotificationUpdatedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useNotificationUpdatedSubscription(baseOptions?: ApolloReactHooks.SubscriptionHookOptions<NotificationUpdatedSubscription, NotificationUpdatedSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useSubscription<NotificationUpdatedSubscription, NotificationUpdatedSubscriptionVariables>(NotificationUpdatedDocument, options);
      }
export type NotificationUpdatedSubscriptionHookResult = ReturnType<typeof useNotificationUpdatedSubscription>;
export type NotificationUpdatedSubscriptionResult = Apollo.SubscriptionResult<NotificationUpdatedSubscription>;
export const NotificationDeletedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"NotificationDeleted"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notificationDeleted"}}]}}]} as unknown as DocumentNode;

/**
 * __useNotificationDeletedSubscription__
 *
 * To run a query within a React component, call `useNotificationDeletedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useNotificationDeletedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useNotificationDeletedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useNotificationDeletedSubscription(baseOptions?: ApolloReactHooks.SubscriptionHookOptions<NotificationDeletedSubscription, NotificationDeletedSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useSubscription<NotificationDeletedSubscription, NotificationDeletedSubscriptionVariables>(NotificationDeletedDocument, options);
      }
export type NotificationDeletedSubscriptionHookResult = ReturnType<typeof useNotificationDeletedSubscription>;
export type NotificationDeletedSubscriptionResult = Apollo.SubscriptionResult<NotificationDeletedSubscription>;
export const BucketCreatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"BucketCreated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bucketCreated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}}]} as unknown as DocumentNode;

/**
 * __useBucketCreatedSubscription__
 *
 * To run a query within a React component, call `useBucketCreatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useBucketCreatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useBucketCreatedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useBucketCreatedSubscription(baseOptions?: ApolloReactHooks.SubscriptionHookOptions<BucketCreatedSubscription, BucketCreatedSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useSubscription<BucketCreatedSubscription, BucketCreatedSubscriptionVariables>(BucketCreatedDocument, options);
      }
export type BucketCreatedSubscriptionHookResult = ReturnType<typeof useBucketCreatedSubscription>;
export type BucketCreatedSubscriptionResult = Apollo.SubscriptionResult<BucketCreatedSubscription>;
export const BucketUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"BucketUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bucketUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}}]} as unknown as DocumentNode;

/**
 * __useBucketUpdatedSubscription__
 *
 * To run a query within a React component, call `useBucketUpdatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useBucketUpdatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useBucketUpdatedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useBucketUpdatedSubscription(baseOptions?: ApolloReactHooks.SubscriptionHookOptions<BucketUpdatedSubscription, BucketUpdatedSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useSubscription<BucketUpdatedSubscription, BucketUpdatedSubscriptionVariables>(BucketUpdatedDocument, options);
      }
export type BucketUpdatedSubscriptionHookResult = ReturnType<typeof useBucketUpdatedSubscription>;
export type BucketUpdatedSubscriptionResult = Apollo.SubscriptionResult<BucketUpdatedSubscription>;
export const BucketDeletedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"BucketDeleted"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bucketDeleted"}}]}}]} as unknown as DocumentNode;

/**
 * __useBucketDeletedSubscription__
 *
 * To run a query within a React component, call `useBucketDeletedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useBucketDeletedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useBucketDeletedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useBucketDeletedSubscription(baseOptions?: ApolloReactHooks.SubscriptionHookOptions<BucketDeletedSubscription, BucketDeletedSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useSubscription<BucketDeletedSubscription, BucketDeletedSubscriptionVariables>(BucketDeletedDocument, options);
      }
export type BucketDeletedSubscriptionHookResult = ReturnType<typeof useBucketDeletedSubscription>;
export type BucketDeletedSubscriptionResult = Apollo.SubscriptionResult<BucketDeletedSubscription>;
export const UserProfileUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"UserProfileUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userProfileUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;

/**
 * __useUserProfileUpdatedSubscription__
 *
 * To run a query within a React component, call `useUserProfileUpdatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useUserProfileUpdatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUserProfileUpdatedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useUserProfileUpdatedSubscription(baseOptions?: ApolloReactHooks.SubscriptionHookOptions<UserProfileUpdatedSubscription, UserProfileUpdatedSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useSubscription<UserProfileUpdatedSubscription, UserProfileUpdatedSubscriptionVariables>(UserProfileUpdatedDocument, options);
      }
export type UserProfileUpdatedSubscriptionHookResult = ReturnType<typeof useUserProfileUpdatedSubscription>;
export type UserProfileUpdatedSubscriptionResult = Apollo.SubscriptionResult<UserProfileUpdatedSubscription>;
export const UserPasswordChangedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"UserPasswordChanged"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userPasswordChanged"}}]}}]} as unknown as DocumentNode;

/**
 * __useUserPasswordChangedSubscription__
 *
 * To run a query within a React component, call `useUserPasswordChangedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useUserPasswordChangedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUserPasswordChangedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useUserPasswordChangedSubscription(baseOptions?: ApolloReactHooks.SubscriptionHookOptions<UserPasswordChangedSubscription, UserPasswordChangedSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useSubscription<UserPasswordChangedSubscription, UserPasswordChangedSubscriptionVariables>(UserPasswordChangedDocument, options);
      }
export type UserPasswordChangedSubscriptionHookResult = ReturnType<typeof useUserPasswordChangedSubscription>;
export type UserPasswordChangedSubscriptionResult = Apollo.SubscriptionResult<UserPasswordChangedSubscription>;
export const GetUserDevicesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserDevices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userDevices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserDeviceFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserDeviceFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserDevice"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"deviceToken"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publicKey"}},{"kind":"Field","name":{"kind":"Name","value":"privateKey"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetUserDevicesQuery__
 *
 * To run a query within a React component, call `useGetUserDevicesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUserDevicesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUserDevicesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetUserDevicesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetUserDevicesQuery, GetUserDevicesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetUserDevicesQuery, GetUserDevicesQueryVariables>(GetUserDevicesDocument, options);
      }
export function useGetUserDevicesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetUserDevicesQuery, GetUserDevicesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetUserDevicesQuery, GetUserDevicesQueryVariables>(GetUserDevicesDocument, options);
        }
export function useGetUserDevicesSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetUserDevicesQuery, GetUserDevicesQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetUserDevicesQuery, GetUserDevicesQueryVariables>(GetUserDevicesDocument, options);
        }
export type GetUserDevicesQueryHookResult = ReturnType<typeof useGetUserDevicesQuery>;
export type GetUserDevicesLazyQueryHookResult = ReturnType<typeof useGetUserDevicesLazyQuery>;
export type GetUserDevicesSuspenseQueryHookResult = ReturnType<typeof useGetUserDevicesSuspenseQuery>;
export type GetUserDevicesQueryResult = Apollo.QueryResult<GetUserDevicesQuery, GetUserDevicesQueryVariables>;
export const GetUserDeviceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserDevice"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userDevice"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserDeviceFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserDeviceFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserDevice"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"deviceToken"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publicKey"}},{"kind":"Field","name":{"kind":"Name","value":"privateKey"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetUserDeviceQuery__
 *
 * To run a query within a React component, call `useGetUserDeviceQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUserDeviceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUserDeviceQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetUserDeviceQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetUserDeviceQuery, GetUserDeviceQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetUserDeviceQuery, GetUserDeviceQueryVariables>(GetUserDeviceDocument, options);
      }
export function useGetUserDeviceLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetUserDeviceQuery, GetUserDeviceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetUserDeviceQuery, GetUserDeviceQueryVariables>(GetUserDeviceDocument, options);
        }
export function useGetUserDeviceSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetUserDeviceQuery, GetUserDeviceQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetUserDeviceQuery, GetUserDeviceQueryVariables>(GetUserDeviceDocument, options);
        }
export type GetUserDeviceQueryHookResult = ReturnType<typeof useGetUserDeviceQuery>;
export type GetUserDeviceLazyQueryHookResult = ReturnType<typeof useGetUserDeviceLazyQuery>;
export type GetUserDeviceSuspenseQueryHookResult = ReturnType<typeof useGetUserDeviceSuspenseQuery>;
export type GetUserDeviceQueryResult = Apollo.QueryResult<GetUserDeviceQuery, GetUserDeviceQueryVariables>;
export const GetUserWebhooksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserWebhooks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userWebhooks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserWebhookFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserWebhookFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserWebhook"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"headers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetUserWebhooksQuery__
 *
 * To run a query within a React component, call `useGetUserWebhooksQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUserWebhooksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUserWebhooksQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetUserWebhooksQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetUserWebhooksQuery, GetUserWebhooksQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetUserWebhooksQuery, GetUserWebhooksQueryVariables>(GetUserWebhooksDocument, options);
      }
export function useGetUserWebhooksLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetUserWebhooksQuery, GetUserWebhooksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetUserWebhooksQuery, GetUserWebhooksQueryVariables>(GetUserWebhooksDocument, options);
        }
export function useGetUserWebhooksSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetUserWebhooksQuery, GetUserWebhooksQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetUserWebhooksQuery, GetUserWebhooksQueryVariables>(GetUserWebhooksDocument, options);
        }
export type GetUserWebhooksQueryHookResult = ReturnType<typeof useGetUserWebhooksQuery>;
export type GetUserWebhooksLazyQueryHookResult = ReturnType<typeof useGetUserWebhooksLazyQuery>;
export type GetUserWebhooksSuspenseQueryHookResult = ReturnType<typeof useGetUserWebhooksSuspenseQuery>;
export type GetUserWebhooksQueryResult = Apollo.QueryResult<GetUserWebhooksQuery, GetUserWebhooksQueryVariables>;
export const GetWebhookDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWebhook"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"webhook"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserWebhookFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserWebhookFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserWebhook"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"headers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetWebhookQuery__
 *
 * To run a query within a React component, call `useGetWebhookQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetWebhookQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetWebhookQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetWebhookQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetWebhookQuery, GetWebhookQueryVariables> & ({ variables: GetWebhookQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetWebhookQuery, GetWebhookQueryVariables>(GetWebhookDocument, options);
      }
export function useGetWebhookLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetWebhookQuery, GetWebhookQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetWebhookQuery, GetWebhookQueryVariables>(GetWebhookDocument, options);
        }
export function useGetWebhookSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetWebhookQuery, GetWebhookQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetWebhookQuery, GetWebhookQueryVariables>(GetWebhookDocument, options);
        }
export type GetWebhookQueryHookResult = ReturnType<typeof useGetWebhookQuery>;
export type GetWebhookLazyQueryHookResult = ReturnType<typeof useGetWebhookLazyQuery>;
export type GetWebhookSuspenseQueryHookResult = ReturnType<typeof useGetWebhookSuspenseQuery>;
export type GetWebhookQueryResult = Apollo.QueryResult<GetWebhookQuery, GetWebhookQueryVariables>;
export const CreateWebhookDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateWebhook"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateWebhookDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createWebhook"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserWebhookFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserWebhookFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserWebhook"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"headers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export type CreateWebhookMutationFn = Apollo.MutationFunction<CreateWebhookMutation, CreateWebhookMutationVariables>;

/**
 * __useCreateWebhookMutation__
 *
 * To run a mutation, you first call `useCreateWebhookMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateWebhookMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createWebhookMutation, { data, loading, error }] = useCreateWebhookMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateWebhookMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateWebhookMutation, CreateWebhookMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateWebhookMutation, CreateWebhookMutationVariables>(CreateWebhookDocument, options);
      }
export type CreateWebhookMutationHookResult = ReturnType<typeof useCreateWebhookMutation>;
export type CreateWebhookMutationResult = Apollo.MutationResult<CreateWebhookMutation>;
export type CreateWebhookMutationOptions = Apollo.BaseMutationOptions<CreateWebhookMutation, CreateWebhookMutationVariables>;
export const UpdateWebhookDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateWebhook"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateWebhookDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateWebhook"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserWebhookFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserWebhookFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserWebhook"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"headers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export type UpdateWebhookMutationFn = Apollo.MutationFunction<UpdateWebhookMutation, UpdateWebhookMutationVariables>;

/**
 * __useUpdateWebhookMutation__
 *
 * To run a mutation, you first call `useUpdateWebhookMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateWebhookMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateWebhookMutation, { data, loading, error }] = useUpdateWebhookMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateWebhookMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateWebhookMutation, UpdateWebhookMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateWebhookMutation, UpdateWebhookMutationVariables>(UpdateWebhookDocument, options);
      }
export type UpdateWebhookMutationHookResult = ReturnType<typeof useUpdateWebhookMutation>;
export type UpdateWebhookMutationResult = Apollo.MutationResult<UpdateWebhookMutation>;
export type UpdateWebhookMutationOptions = Apollo.BaseMutationOptions<UpdateWebhookMutation, UpdateWebhookMutationVariables>;
export const DeleteWebhookDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteWebhook"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteWebhook"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode;
export type DeleteWebhookMutationFn = Apollo.MutationFunction<DeleteWebhookMutation, DeleteWebhookMutationVariables>;

/**
 * __useDeleteWebhookMutation__
 *
 * To run a mutation, you first call `useDeleteWebhookMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteWebhookMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteWebhookMutation, { data, loading, error }] = useDeleteWebhookMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteWebhookMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteWebhookMutation, DeleteWebhookMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteWebhookMutation, DeleteWebhookMutationVariables>(DeleteWebhookDocument, options);
      }
export type DeleteWebhookMutationHookResult = ReturnType<typeof useDeleteWebhookMutation>;
export type DeleteWebhookMutationResult = Apollo.MutationResult<DeleteWebhookMutation>;
export type DeleteWebhookMutationOptions = Apollo.BaseMutationOptions<DeleteWebhookMutation, DeleteWebhookMutationVariables>;
export const GetUserAccessTokensDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserAccessTokens"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getUserAccessTokens"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccessTokenFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccessTokenFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccessTokenListDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"isExpired"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetUserAccessTokensQuery__
 *
 * To run a query within a React component, call `useGetUserAccessTokensQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUserAccessTokensQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUserAccessTokensQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetUserAccessTokensQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetUserAccessTokensQuery, GetUserAccessTokensQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetUserAccessTokensQuery, GetUserAccessTokensQueryVariables>(GetUserAccessTokensDocument, options);
      }
export function useGetUserAccessTokensLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetUserAccessTokensQuery, GetUserAccessTokensQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetUserAccessTokensQuery, GetUserAccessTokensQueryVariables>(GetUserAccessTokensDocument, options);
        }
export function useGetUserAccessTokensSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetUserAccessTokensQuery, GetUserAccessTokensQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetUserAccessTokensQuery, GetUserAccessTokensQueryVariables>(GetUserAccessTokensDocument, options);
        }
export type GetUserAccessTokensQueryHookResult = ReturnType<typeof useGetUserAccessTokensQuery>;
export type GetUserAccessTokensLazyQueryHookResult = ReturnType<typeof useGetUserAccessTokensLazyQuery>;
export type GetUserAccessTokensSuspenseQueryHookResult = ReturnType<typeof useGetUserAccessTokensSuspenseQuery>;
export type GetUserAccessTokensQueryResult = Apollo.QueryResult<GetUserAccessTokensQuery, GetUserAccessTokensQueryVariables>;
export const GetUserSessionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserSessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getUserSessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SessionInfoFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SessionInfoFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SessionInfoDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"operatingSystem"}},{"kind":"Field","name":{"kind":"Name","value":"browser"}},{"kind":"Field","name":{"kind":"Name","value":"ipAddress"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"lastActivity"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"isCurrent"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"loginProvider"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetUserSessionsQuery__
 *
 * To run a query within a React component, call `useGetUserSessionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUserSessionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUserSessionsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetUserSessionsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetUserSessionsQuery, GetUserSessionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetUserSessionsQuery, GetUserSessionsQueryVariables>(GetUserSessionsDocument, options);
      }
export function useGetUserSessionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetUserSessionsQuery, GetUserSessionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetUserSessionsQuery, GetUserSessionsQueryVariables>(GetUserSessionsDocument, options);
        }
export function useGetUserSessionsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetUserSessionsQuery, GetUserSessionsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetUserSessionsQuery, GetUserSessionsQueryVariables>(GetUserSessionsDocument, options);
        }
export type GetUserSessionsQueryHookResult = ReturnType<typeof useGetUserSessionsQuery>;
export type GetUserSessionsLazyQueryHookResult = ReturnType<typeof useGetUserSessionsLazyQuery>;
export type GetUserSessionsSuspenseQueryHookResult = ReturnType<typeof useGetUserSessionsSuspenseQuery>;
export type GetUserSessionsQueryResult = Apollo.QueryResult<GetUserSessionsQuery, GetUserSessionsQueryVariables>;
export const CreateAccessTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateAccessToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateAccessTokenDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createAccessToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccessTokenResponseFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccessTokenResponseFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccessTokenResponseDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"tokenStored"}}]}}]} as unknown as DocumentNode;
export type CreateAccessTokenMutationFn = Apollo.MutationFunction<CreateAccessTokenMutation, CreateAccessTokenMutationVariables>;

/**
 * __useCreateAccessTokenMutation__
 *
 * To run a mutation, you first call `useCreateAccessTokenMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateAccessTokenMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createAccessTokenMutation, { data, loading, error }] = useCreateAccessTokenMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateAccessTokenMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateAccessTokenMutation, CreateAccessTokenMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateAccessTokenMutation, CreateAccessTokenMutationVariables>(CreateAccessTokenDocument, options);
      }
export type CreateAccessTokenMutationHookResult = ReturnType<typeof useCreateAccessTokenMutation>;
export type CreateAccessTokenMutationResult = Apollo.MutationResult<CreateAccessTokenMutation>;
export type CreateAccessTokenMutationOptions = Apollo.BaseMutationOptions<CreateAccessTokenMutation, CreateAccessTokenMutationVariables>;
export const RevokeAccessTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RevokeAccessToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tokenId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokeAccessToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"tokenId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tokenId"}}}]}]}}]} as unknown as DocumentNode;
export type RevokeAccessTokenMutationFn = Apollo.MutationFunction<RevokeAccessTokenMutation, RevokeAccessTokenMutationVariables>;

/**
 * __useRevokeAccessTokenMutation__
 *
 * To run a mutation, you first call `useRevokeAccessTokenMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRevokeAccessTokenMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [revokeAccessTokenMutation, { data, loading, error }] = useRevokeAccessTokenMutation({
 *   variables: {
 *      tokenId: // value for 'tokenId'
 *   },
 * });
 */
export function useRevokeAccessTokenMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RevokeAccessTokenMutation, RevokeAccessTokenMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RevokeAccessTokenMutation, RevokeAccessTokenMutationVariables>(RevokeAccessTokenDocument, options);
      }
export type RevokeAccessTokenMutationHookResult = ReturnType<typeof useRevokeAccessTokenMutation>;
export type RevokeAccessTokenMutationResult = Apollo.MutationResult<RevokeAccessTokenMutation>;
export type RevokeAccessTokenMutationOptions = Apollo.BaseMutationOptions<RevokeAccessTokenMutation, RevokeAccessTokenMutationVariables>;
export const RevokeAllAccessTokensDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RevokeAllAccessTokens"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokeAllAccessTokens"}}]}}]} as unknown as DocumentNode;
export type RevokeAllAccessTokensMutationFn = Apollo.MutationFunction<RevokeAllAccessTokensMutation, RevokeAllAccessTokensMutationVariables>;

/**
 * __useRevokeAllAccessTokensMutation__
 *
 * To run a mutation, you first call `useRevokeAllAccessTokensMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRevokeAllAccessTokensMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [revokeAllAccessTokensMutation, { data, loading, error }] = useRevokeAllAccessTokensMutation({
 *   variables: {
 *   },
 * });
 */
export function useRevokeAllAccessTokensMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RevokeAllAccessTokensMutation, RevokeAllAccessTokensMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RevokeAllAccessTokensMutation, RevokeAllAccessTokensMutationVariables>(RevokeAllAccessTokensDocument, options);
      }
export type RevokeAllAccessTokensMutationHookResult = ReturnType<typeof useRevokeAllAccessTokensMutation>;
export type RevokeAllAccessTokensMutationResult = Apollo.MutationResult<RevokeAllAccessTokensMutation>;
export type RevokeAllAccessTokensMutationOptions = Apollo.BaseMutationOptions<RevokeAllAccessTokensMutation, RevokeAllAccessTokensMutationVariables>;
export const UpdateAccessTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateAccessToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tokenId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateAccessTokenDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateAccessToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"tokenId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tokenId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccessTokenFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccessTokenFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccessTokenListDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"isExpired"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}}]}}]} as unknown as DocumentNode;
export type UpdateAccessTokenMutationFn = Apollo.MutationFunction<UpdateAccessTokenMutation, UpdateAccessTokenMutationVariables>;

/**
 * __useUpdateAccessTokenMutation__
 *
 * To run a mutation, you first call `useUpdateAccessTokenMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateAccessTokenMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateAccessTokenMutation, { data, loading, error }] = useUpdateAccessTokenMutation({
 *   variables: {
 *      tokenId: // value for 'tokenId'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateAccessTokenMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateAccessTokenMutation, UpdateAccessTokenMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateAccessTokenMutation, UpdateAccessTokenMutationVariables>(UpdateAccessTokenDocument, options);
      }
export type UpdateAccessTokenMutationHookResult = ReturnType<typeof useUpdateAccessTokenMutation>;
export type UpdateAccessTokenMutationResult = Apollo.MutationResult<UpdateAccessTokenMutation>;
export type UpdateAccessTokenMutationOptions = Apollo.BaseMutationOptions<UpdateAccessTokenMutation, UpdateAccessTokenMutationVariables>;
export const GetAccessTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAccessToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tokenId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getAccessToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"tokenId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tokenId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccessTokenFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccessTokenFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccessTokenListDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"isExpired"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetAccessTokenQuery__
 *
 * To run a query within a React component, call `useGetAccessTokenQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAccessTokenQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAccessTokenQuery({
 *   variables: {
 *      tokenId: // value for 'tokenId'
 *   },
 * });
 */
export function useGetAccessTokenQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetAccessTokenQuery, GetAccessTokenQueryVariables> & ({ variables: GetAccessTokenQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetAccessTokenQuery, GetAccessTokenQueryVariables>(GetAccessTokenDocument, options);
      }
export function useGetAccessTokenLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetAccessTokenQuery, GetAccessTokenQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetAccessTokenQuery, GetAccessTokenQueryVariables>(GetAccessTokenDocument, options);
        }
export function useGetAccessTokenSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetAccessTokenQuery, GetAccessTokenQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetAccessTokenQuery, GetAccessTokenQueryVariables>(GetAccessTokenDocument, options);
        }
export type GetAccessTokenQueryHookResult = ReturnType<typeof useGetAccessTokenQuery>;
export type GetAccessTokenLazyQueryHookResult = ReturnType<typeof useGetAccessTokenLazyQuery>;
export type GetAccessTokenSuspenseQueryHookResult = ReturnType<typeof useGetAccessTokenSuspenseQuery>;
export type GetAccessTokenQueryResult = Apollo.QueryResult<GetAccessTokenQuery, GetAccessTokenQueryVariables>;
export const GetAccessTokensForBucketDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAccessTokensForBucket"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getAccessTokensForBucket"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"bucketId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccessTokenFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccessTokenFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccessTokenListDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"isExpired"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetAccessTokensForBucketQuery__
 *
 * To run a query within a React component, call `useGetAccessTokensForBucketQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAccessTokensForBucketQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAccessTokensForBucketQuery({
 *   variables: {
 *      bucketId: // value for 'bucketId'
 *   },
 * });
 */
export function useGetAccessTokensForBucketQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetAccessTokensForBucketQuery, GetAccessTokensForBucketQueryVariables> & ({ variables: GetAccessTokensForBucketQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetAccessTokensForBucketQuery, GetAccessTokensForBucketQueryVariables>(GetAccessTokensForBucketDocument, options);
      }
export function useGetAccessTokensForBucketLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetAccessTokensForBucketQuery, GetAccessTokensForBucketQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetAccessTokensForBucketQuery, GetAccessTokensForBucketQueryVariables>(GetAccessTokensForBucketDocument, options);
        }
export function useGetAccessTokensForBucketSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetAccessTokensForBucketQuery, GetAccessTokensForBucketQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetAccessTokensForBucketQuery, GetAccessTokensForBucketQueryVariables>(GetAccessTokensForBucketDocument, options);
        }
export type GetAccessTokensForBucketQueryHookResult = ReturnType<typeof useGetAccessTokensForBucketQuery>;
export type GetAccessTokensForBucketLazyQueryHookResult = ReturnType<typeof useGetAccessTokensForBucketLazyQuery>;
export type GetAccessTokensForBucketSuspenseQueryHookResult = ReturnType<typeof useGetAccessTokensForBucketSuspenseQuery>;
export type GetAccessTokensForBucketQueryResult = Apollo.QueryResult<GetAccessTokensForBucketQuery, GetAccessTokensForBucketQueryVariables>;
export const CreateAccessTokenForBucketDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateAccessTokenForBucket"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createAccessTokenForBucket"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"bucketId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccessTokenResponseFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccessTokenResponseFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccessTokenResponseDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"tokenStored"}}]}}]} as unknown as DocumentNode;
export type CreateAccessTokenForBucketMutationFn = Apollo.MutationFunction<CreateAccessTokenForBucketMutation, CreateAccessTokenForBucketMutationVariables>;

/**
 * __useCreateAccessTokenForBucketMutation__
 *
 * To run a mutation, you first call `useCreateAccessTokenForBucketMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateAccessTokenForBucketMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createAccessTokenForBucketMutation, { data, loading, error }] = useCreateAccessTokenForBucketMutation({
 *   variables: {
 *      bucketId: // value for 'bucketId'
 *      name: // value for 'name'
 *   },
 * });
 */
export function useCreateAccessTokenForBucketMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateAccessTokenForBucketMutation, CreateAccessTokenForBucketMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateAccessTokenForBucketMutation, CreateAccessTokenForBucketMutationVariables>(CreateAccessTokenForBucketDocument, options);
      }
export type CreateAccessTokenForBucketMutationHookResult = ReturnType<typeof useCreateAccessTokenForBucketMutation>;
export type CreateAccessTokenForBucketMutationResult = Apollo.MutationResult<CreateAccessTokenForBucketMutation>;
export type CreateAccessTokenForBucketMutationOptions = Apollo.BaseMutationOptions<CreateAccessTokenForBucketMutation, CreateAccessTokenForBucketMutationVariables>;
export const RevokeSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RevokeSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sessionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokeSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sessionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sessionId"}}}]}]}}]} as unknown as DocumentNode;
export type RevokeSessionMutationFn = Apollo.MutationFunction<RevokeSessionMutation, RevokeSessionMutationVariables>;

/**
 * __useRevokeSessionMutation__
 *
 * To run a mutation, you first call `useRevokeSessionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRevokeSessionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [revokeSessionMutation, { data, loading, error }] = useRevokeSessionMutation({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *   },
 * });
 */
export function useRevokeSessionMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RevokeSessionMutation, RevokeSessionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RevokeSessionMutation, RevokeSessionMutationVariables>(RevokeSessionDocument, options);
      }
export type RevokeSessionMutationHookResult = ReturnType<typeof useRevokeSessionMutation>;
export type RevokeSessionMutationResult = Apollo.MutationResult<RevokeSessionMutation>;
export type RevokeSessionMutationOptions = Apollo.BaseMutationOptions<RevokeSessionMutation, RevokeSessionMutationVariables>;
export const RevokeAllOtherSessionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RevokeAllOtherSessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokeAllOtherSessions"}}]}}]} as unknown as DocumentNode;
export type RevokeAllOtherSessionsMutationFn = Apollo.MutationFunction<RevokeAllOtherSessionsMutation, RevokeAllOtherSessionsMutationVariables>;

/**
 * __useRevokeAllOtherSessionsMutation__
 *
 * To run a mutation, you first call `useRevokeAllOtherSessionsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRevokeAllOtherSessionsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [revokeAllOtherSessionsMutation, { data, loading, error }] = useRevokeAllOtherSessionsMutation({
 *   variables: {
 *   },
 * });
 */
export function useRevokeAllOtherSessionsMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RevokeAllOtherSessionsMutation, RevokeAllOtherSessionsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RevokeAllOtherSessionsMutation, RevokeAllOtherSessionsMutationVariables>(RevokeAllOtherSessionsDocument, options);
      }
export type RevokeAllOtherSessionsMutationHookResult = ReturnType<typeof useRevokeAllOtherSessionsMutation>;
export type RevokeAllOtherSessionsMutationResult = Apollo.MutationResult<RevokeAllOtherSessionsMutation>;
export type RevokeAllOtherSessionsMutationOptions = Apollo.BaseMutationOptions<RevokeAllOtherSessionsMutation, RevokeAllOtherSessionsMutationVariables>;
export const RegisterDeviceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RegisterDevice"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RegisterDeviceDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"registerDevice"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserDeviceFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserDeviceFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserDevice"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"deviceToken"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publicKey"}},{"kind":"Field","name":{"kind":"Name","value":"privateKey"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}}]}}]} as unknown as DocumentNode;
export type RegisterDeviceMutationFn = Apollo.MutationFunction<RegisterDeviceMutation, RegisterDeviceMutationVariables>;

/**
 * __useRegisterDeviceMutation__
 *
 * To run a mutation, you first call `useRegisterDeviceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRegisterDeviceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [registerDeviceMutation, { data, loading, error }] = useRegisterDeviceMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRegisterDeviceMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RegisterDeviceMutation, RegisterDeviceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RegisterDeviceMutation, RegisterDeviceMutationVariables>(RegisterDeviceDocument, options);
      }
export type RegisterDeviceMutationHookResult = ReturnType<typeof useRegisterDeviceMutation>;
export type RegisterDeviceMutationResult = Apollo.MutationResult<RegisterDeviceMutation>;
export type RegisterDeviceMutationOptions = Apollo.BaseMutationOptions<RegisterDeviceMutation, RegisterDeviceMutationVariables>;
export const RemoveDeviceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveDevice"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"deviceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeDevice"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"deviceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"deviceId"}}}]}]}}]} as unknown as DocumentNode;
export type RemoveDeviceMutationFn = Apollo.MutationFunction<RemoveDeviceMutation, RemoveDeviceMutationVariables>;

/**
 * __useRemoveDeviceMutation__
 *
 * To run a mutation, you first call `useRemoveDeviceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRemoveDeviceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [removeDeviceMutation, { data, loading, error }] = useRemoveDeviceMutation({
 *   variables: {
 *      deviceId: // value for 'deviceId'
 *   },
 * });
 */
export function useRemoveDeviceMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RemoveDeviceMutation, RemoveDeviceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RemoveDeviceMutation, RemoveDeviceMutationVariables>(RemoveDeviceDocument, options);
      }
export type RemoveDeviceMutationHookResult = ReturnType<typeof useRemoveDeviceMutation>;
export type RemoveDeviceMutationResult = Apollo.MutationResult<RemoveDeviceMutation>;
export type RemoveDeviceMutationOptions = Apollo.BaseMutationOptions<RemoveDeviceMutation, RemoveDeviceMutationVariables>;
export const RemoveDeviceByTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveDeviceByToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"deviceToken"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeDeviceByToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"deviceToken"},"value":{"kind":"Variable","name":{"kind":"Name","value":"deviceToken"}}}]}]}}]} as unknown as DocumentNode;
export type RemoveDeviceByTokenMutationFn = Apollo.MutationFunction<RemoveDeviceByTokenMutation, RemoveDeviceByTokenMutationVariables>;

/**
 * __useRemoveDeviceByTokenMutation__
 *
 * To run a mutation, you first call `useRemoveDeviceByTokenMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRemoveDeviceByTokenMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [removeDeviceByTokenMutation, { data, loading, error }] = useRemoveDeviceByTokenMutation({
 *   variables: {
 *      deviceToken: // value for 'deviceToken'
 *   },
 * });
 */
export function useRemoveDeviceByTokenMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RemoveDeviceByTokenMutation, RemoveDeviceByTokenMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RemoveDeviceByTokenMutation, RemoveDeviceByTokenMutationVariables>(RemoveDeviceByTokenDocument, options);
      }
export type RemoveDeviceByTokenMutationHookResult = ReturnType<typeof useRemoveDeviceByTokenMutation>;
export type RemoveDeviceByTokenMutationResult = Apollo.MutationResult<RemoveDeviceByTokenMutation>;
export type RemoveDeviceByTokenMutationOptions = Apollo.BaseMutationOptions<RemoveDeviceByTokenMutation, RemoveDeviceByTokenMutationVariables>;
export const UpdateDeviceTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateDeviceToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateDeviceTokenDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateDeviceToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"deviceToken"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode;
export type UpdateDeviceTokenMutationFn = Apollo.MutationFunction<UpdateDeviceTokenMutation, UpdateDeviceTokenMutationVariables>;

/**
 * __useUpdateDeviceTokenMutation__
 *
 * To run a mutation, you first call `useUpdateDeviceTokenMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateDeviceTokenMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateDeviceTokenMutation, { data, loading, error }] = useUpdateDeviceTokenMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateDeviceTokenMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateDeviceTokenMutation, UpdateDeviceTokenMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateDeviceTokenMutation, UpdateDeviceTokenMutationVariables>(UpdateDeviceTokenDocument, options);
      }
export type UpdateDeviceTokenMutationHookResult = ReturnType<typeof useUpdateDeviceTokenMutation>;
export type UpdateDeviceTokenMutationResult = Apollo.MutationResult<UpdateDeviceTokenMutation>;
export type UpdateDeviceTokenMutationOptions = Apollo.BaseMutationOptions<UpdateDeviceTokenMutation, UpdateDeviceTokenMutationVariables>;
export const UpdateUserDeviceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUserDevice"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateUserDeviceInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUserDevice"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"subscriptionFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endpoint"}},{"kind":"Field","name":{"kind":"Name","value":"p256dh"}},{"kind":"Field","name":{"kind":"Name","value":"auth"}}]}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode;
export type UpdateUserDeviceMutationFn = Apollo.MutationFunction<UpdateUserDeviceMutation, UpdateUserDeviceMutationVariables>;

/**
 * __useUpdateUserDeviceMutation__
 *
 * To run a mutation, you first call `useUpdateUserDeviceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateUserDeviceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateUserDeviceMutation, { data, loading, error }] = useUpdateUserDeviceMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateUserDeviceMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateUserDeviceMutation, UpdateUserDeviceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateUserDeviceMutation, UpdateUserDeviceMutationVariables>(UpdateUserDeviceDocument, options);
      }
export type UpdateUserDeviceMutationHookResult = ReturnType<typeof useUpdateUserDeviceMutation>;
export type UpdateUserDeviceMutationResult = Apollo.MutationResult<UpdateUserDeviceMutation>;
export type UpdateUserDeviceMutationOptions = Apollo.BaseMutationOptions<UpdateUserDeviceMutation, UpdateUserDeviceMutationVariables>;
export const GetResourcePermissionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetResourcePermissions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"GetResourcePermissionsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getResourcePermissions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EntityPermissionFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityPermissionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityPermission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inviteCodeId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"grantedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}}]} as unknown as DocumentNode;

/**
 * __useGetResourcePermissionsQuery__
 *
 * To run a query within a React component, call `useGetResourcePermissionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetResourcePermissionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetResourcePermissionsQuery({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useGetResourcePermissionsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetResourcePermissionsQuery, GetResourcePermissionsQueryVariables> & ({ variables: GetResourcePermissionsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetResourcePermissionsQuery, GetResourcePermissionsQueryVariables>(GetResourcePermissionsDocument, options);
      }
export function useGetResourcePermissionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetResourcePermissionsQuery, GetResourcePermissionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetResourcePermissionsQuery, GetResourcePermissionsQueryVariables>(GetResourcePermissionsDocument, options);
        }
export function useGetResourcePermissionsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetResourcePermissionsQuery, GetResourcePermissionsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetResourcePermissionsQuery, GetResourcePermissionsQueryVariables>(GetResourcePermissionsDocument, options);
        }
export type GetResourcePermissionsQueryHookResult = ReturnType<typeof useGetResourcePermissionsQuery>;
export type GetResourcePermissionsLazyQueryHookResult = ReturnType<typeof useGetResourcePermissionsLazyQuery>;
export type GetResourcePermissionsSuspenseQueryHookResult = ReturnType<typeof useGetResourcePermissionsSuspenseQuery>;
export type GetResourcePermissionsQueryResult = Apollo.QueryResult<GetResourcePermissionsQuery, GetResourcePermissionsQueryVariables>;
export const GrantEntityPermissionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GrantEntityPermission"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"GrantEntityPermissionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"grantEntityPermission"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EntityPermissionFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityPermissionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityPermission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inviteCodeId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"grantedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}}]} as unknown as DocumentNode;
export type GrantEntityPermissionMutationFn = Apollo.MutationFunction<GrantEntityPermissionMutation, GrantEntityPermissionMutationVariables>;

/**
 * __useGrantEntityPermissionMutation__
 *
 * To run a mutation, you first call `useGrantEntityPermissionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGrantEntityPermissionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [grantEntityPermissionMutation, { data, loading, error }] = useGrantEntityPermissionMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useGrantEntityPermissionMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<GrantEntityPermissionMutation, GrantEntityPermissionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<GrantEntityPermissionMutation, GrantEntityPermissionMutationVariables>(GrantEntityPermissionDocument, options);
      }
export type GrantEntityPermissionMutationHookResult = ReturnType<typeof useGrantEntityPermissionMutation>;
export type GrantEntityPermissionMutationResult = Apollo.MutationResult<GrantEntityPermissionMutation>;
export type GrantEntityPermissionMutationOptions = Apollo.BaseMutationOptions<GrantEntityPermissionMutation, GrantEntityPermissionMutationVariables>;
export const RevokeEntityPermissionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RevokeEntityPermission"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RevokeEntityPermissionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokeEntityPermission"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode;
export type RevokeEntityPermissionMutationFn = Apollo.MutationFunction<RevokeEntityPermissionMutation, RevokeEntityPermissionMutationVariables>;

/**
 * __useRevokeEntityPermissionMutation__
 *
 * To run a mutation, you first call `useRevokeEntityPermissionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRevokeEntityPermissionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [revokeEntityPermissionMutation, { data, loading, error }] = useRevokeEntityPermissionMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRevokeEntityPermissionMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RevokeEntityPermissionMutation, RevokeEntityPermissionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RevokeEntityPermissionMutation, RevokeEntityPermissionMutationVariables>(RevokeEntityPermissionDocument, options);
      }
export type RevokeEntityPermissionMutationHookResult = ReturnType<typeof useRevokeEntityPermissionMutation>;
export type RevokeEntityPermissionMutationResult = Apollo.MutationResult<RevokeEntityPermissionMutation>;
export type RevokeEntityPermissionMutationOptions = Apollo.BaseMutationOptions<RevokeEntityPermissionMutation, RevokeEntityPermissionMutationVariables>;
export const CleanupExpiredPermissionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CleanupExpiredPermissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cleanupExpiredPermissions"}}]}}]} as unknown as DocumentNode;
export type CleanupExpiredPermissionsMutationFn = Apollo.MutationFunction<CleanupExpiredPermissionsMutation, CleanupExpiredPermissionsMutationVariables>;

/**
 * __useCleanupExpiredPermissionsMutation__
 *
 * To run a mutation, you first call `useCleanupExpiredPermissionsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCleanupExpiredPermissionsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [cleanupExpiredPermissionsMutation, { data, loading, error }] = useCleanupExpiredPermissionsMutation({
 *   variables: {
 *   },
 * });
 */
export function useCleanupExpiredPermissionsMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CleanupExpiredPermissionsMutation, CleanupExpiredPermissionsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CleanupExpiredPermissionsMutation, CleanupExpiredPermissionsMutationVariables>(CleanupExpiredPermissionsDocument, options);
      }
export type CleanupExpiredPermissionsMutationHookResult = ReturnType<typeof useCleanupExpiredPermissionsMutation>;
export type CleanupExpiredPermissionsMutationResult = Apollo.MutationResult<CleanupExpiredPermissionsMutation>;
export type CleanupExpiredPermissionsMutationOptions = Apollo.BaseMutationOptions<CleanupExpiredPermissionsMutation, CleanupExpiredPermissionsMutationVariables>;
export const AllOAuthProvidersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AllOAuthProviders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allOAuthProviders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"OAuthProviderFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OAuthProviderFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OAuthProvider"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"clientId"}},{"kind":"Field","name":{"kind":"Name","value":"clientSecret"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"textColor"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"authorizationUrl"}},{"kind":"Field","name":{"kind":"Name","value":"tokenUrl"}},{"kind":"Field","name":{"kind":"Name","value":"userInfoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"profileFields"}},{"kind":"Field","name":{"kind":"Name","value":"additionalConfig"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;

/**
 * __useAllOAuthProvidersQuery__
 *
 * To run a query within a React component, call `useAllOAuthProvidersQuery` and pass it any options that fit your needs.
 * When your component renders, `useAllOAuthProvidersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAllOAuthProvidersQuery({
 *   variables: {
 *   },
 * });
 */
export function useAllOAuthProvidersQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<AllOAuthProvidersQuery, AllOAuthProvidersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<AllOAuthProvidersQuery, AllOAuthProvidersQueryVariables>(AllOAuthProvidersDocument, options);
      }
export function useAllOAuthProvidersLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<AllOAuthProvidersQuery, AllOAuthProvidersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<AllOAuthProvidersQuery, AllOAuthProvidersQueryVariables>(AllOAuthProvidersDocument, options);
        }
export function useAllOAuthProvidersSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<AllOAuthProvidersQuery, AllOAuthProvidersQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<AllOAuthProvidersQuery, AllOAuthProvidersQueryVariables>(AllOAuthProvidersDocument, options);
        }
export type AllOAuthProvidersQueryHookResult = ReturnType<typeof useAllOAuthProvidersQuery>;
export type AllOAuthProvidersLazyQueryHookResult = ReturnType<typeof useAllOAuthProvidersLazyQuery>;
export type AllOAuthProvidersSuspenseQueryHookResult = ReturnType<typeof useAllOAuthProvidersSuspenseQuery>;
export type AllOAuthProvidersQueryResult = Apollo.QueryResult<AllOAuthProvidersQuery, AllOAuthProvidersQueryVariables>;
export const OAuthProviderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OAuthProvider"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"oauthProvider"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"OAuthProviderFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OAuthProviderFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OAuthProvider"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"clientId"}},{"kind":"Field","name":{"kind":"Name","value":"clientSecret"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"textColor"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"authorizationUrl"}},{"kind":"Field","name":{"kind":"Name","value":"tokenUrl"}},{"kind":"Field","name":{"kind":"Name","value":"userInfoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"profileFields"}},{"kind":"Field","name":{"kind":"Name","value":"additionalConfig"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;

/**
 * __useOAuthProviderQuery__
 *
 * To run a query within a React component, call `useOAuthProviderQuery` and pass it any options that fit your needs.
 * When your component renders, `useOAuthProviderQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useOAuthProviderQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useOAuthProviderQuery(baseOptions: ApolloReactHooks.QueryHookOptions<OAuthProviderQuery, OAuthProviderQueryVariables> & ({ variables: OAuthProviderQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<OAuthProviderQuery, OAuthProviderQueryVariables>(OAuthProviderDocument, options);
      }
export function useOAuthProviderLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<OAuthProviderQuery, OAuthProviderQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<OAuthProviderQuery, OAuthProviderQueryVariables>(OAuthProviderDocument, options);
        }
export function useOAuthProviderSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<OAuthProviderQuery, OAuthProviderQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<OAuthProviderQuery, OAuthProviderQueryVariables>(OAuthProviderDocument, options);
        }
export type OAuthProviderQueryHookResult = ReturnType<typeof useOAuthProviderQuery>;
export type OAuthProviderLazyQueryHookResult = ReturnType<typeof useOAuthProviderLazyQuery>;
export type OAuthProviderSuspenseQueryHookResult = ReturnType<typeof useOAuthProviderSuspenseQuery>;
export type OAuthProviderQueryResult = Apollo.QueryResult<OAuthProviderQuery, OAuthProviderQueryVariables>;
export const CreateOAuthProviderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateOAuthProvider"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateOAuthProviderDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createOAuthProvider"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"OAuthProviderFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OAuthProviderFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OAuthProvider"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"clientId"}},{"kind":"Field","name":{"kind":"Name","value":"clientSecret"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"textColor"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"authorizationUrl"}},{"kind":"Field","name":{"kind":"Name","value":"tokenUrl"}},{"kind":"Field","name":{"kind":"Name","value":"userInfoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"profileFields"}},{"kind":"Field","name":{"kind":"Name","value":"additionalConfig"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export type CreateOAuthProviderMutationFn = Apollo.MutationFunction<CreateOAuthProviderMutation, CreateOAuthProviderMutationVariables>;

/**
 * __useCreateOAuthProviderMutation__
 *
 * To run a mutation, you first call `useCreateOAuthProviderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateOAuthProviderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createOAuthProviderMutation, { data, loading, error }] = useCreateOAuthProviderMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateOAuthProviderMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateOAuthProviderMutation, CreateOAuthProviderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateOAuthProviderMutation, CreateOAuthProviderMutationVariables>(CreateOAuthProviderDocument, options);
      }
export type CreateOAuthProviderMutationHookResult = ReturnType<typeof useCreateOAuthProviderMutation>;
export type CreateOAuthProviderMutationResult = Apollo.MutationResult<CreateOAuthProviderMutation>;
export type CreateOAuthProviderMutationOptions = Apollo.BaseMutationOptions<CreateOAuthProviderMutation, CreateOAuthProviderMutationVariables>;
export const UpdateOAuthProviderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateOAuthProvider"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateOAuthProviderDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateOAuthProvider"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"OAuthProviderFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OAuthProviderFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OAuthProvider"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"clientId"}},{"kind":"Field","name":{"kind":"Name","value":"clientSecret"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"textColor"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"authorizationUrl"}},{"kind":"Field","name":{"kind":"Name","value":"tokenUrl"}},{"kind":"Field","name":{"kind":"Name","value":"userInfoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"profileFields"}},{"kind":"Field","name":{"kind":"Name","value":"additionalConfig"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export type UpdateOAuthProviderMutationFn = Apollo.MutationFunction<UpdateOAuthProviderMutation, UpdateOAuthProviderMutationVariables>;

/**
 * __useUpdateOAuthProviderMutation__
 *
 * To run a mutation, you first call `useUpdateOAuthProviderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateOAuthProviderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateOAuthProviderMutation, { data, loading, error }] = useUpdateOAuthProviderMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateOAuthProviderMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateOAuthProviderMutation, UpdateOAuthProviderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateOAuthProviderMutation, UpdateOAuthProviderMutationVariables>(UpdateOAuthProviderDocument, options);
      }
export type UpdateOAuthProviderMutationHookResult = ReturnType<typeof useUpdateOAuthProviderMutation>;
export type UpdateOAuthProviderMutationResult = Apollo.MutationResult<UpdateOAuthProviderMutation>;
export type UpdateOAuthProviderMutationOptions = Apollo.BaseMutationOptions<UpdateOAuthProviderMutation, UpdateOAuthProviderMutationVariables>;
export const ToggleOAuthProviderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ToggleOAuthProvider"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"toggleOAuthProvider"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"OAuthProviderFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OAuthProviderFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OAuthProvider"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"clientId"}},{"kind":"Field","name":{"kind":"Name","value":"clientSecret"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"textColor"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"authorizationUrl"}},{"kind":"Field","name":{"kind":"Name","value":"tokenUrl"}},{"kind":"Field","name":{"kind":"Name","value":"userInfoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"profileFields"}},{"kind":"Field","name":{"kind":"Name","value":"additionalConfig"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export type ToggleOAuthProviderMutationFn = Apollo.MutationFunction<ToggleOAuthProviderMutation, ToggleOAuthProviderMutationVariables>;

/**
 * __useToggleOAuthProviderMutation__
 *
 * To run a mutation, you first call `useToggleOAuthProviderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useToggleOAuthProviderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [toggleOAuthProviderMutation, { data, loading, error }] = useToggleOAuthProviderMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useToggleOAuthProviderMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ToggleOAuthProviderMutation, ToggleOAuthProviderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ToggleOAuthProviderMutation, ToggleOAuthProviderMutationVariables>(ToggleOAuthProviderDocument, options);
      }
export type ToggleOAuthProviderMutationHookResult = ReturnType<typeof useToggleOAuthProviderMutation>;
export type ToggleOAuthProviderMutationResult = Apollo.MutationResult<ToggleOAuthProviderMutation>;
export type ToggleOAuthProviderMutationOptions = Apollo.BaseMutationOptions<ToggleOAuthProviderMutation, ToggleOAuthProviderMutationVariables>;
export const DeleteOAuthProviderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteOAuthProvider"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteOAuthProvider"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode;
export type DeleteOAuthProviderMutationFn = Apollo.MutationFunction<DeleteOAuthProviderMutation, DeleteOAuthProviderMutationVariables>;

/**
 * __useDeleteOAuthProviderMutation__
 *
 * To run a mutation, you first call `useDeleteOAuthProviderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteOAuthProviderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteOAuthProviderMutation, { data, loading, error }] = useDeleteOAuthProviderMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteOAuthProviderMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteOAuthProviderMutation, DeleteOAuthProviderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteOAuthProviderMutation, DeleteOAuthProviderMutationVariables>(DeleteOAuthProviderDocument, options);
      }
export type DeleteOAuthProviderMutationHookResult = ReturnType<typeof useDeleteOAuthProviderMutation>;
export type DeleteOAuthProviderMutationResult = Apollo.MutationResult<DeleteOAuthProviderMutation>;
export type DeleteOAuthProviderMutationOptions = Apollo.BaseMutationOptions<DeleteOAuthProviderMutation, DeleteOAuthProviderMutationVariables>;
export const HealthcheckDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Healthcheck"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"healthcheck"}}]}}]} as unknown as DocumentNode;

/**
 * __useHealthcheckQuery__
 *
 * To run a query within a React component, call `useHealthcheckQuery` and pass it any options that fit your needs.
 * When your component renders, `useHealthcheckQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useHealthcheckQuery({
 *   variables: {
 *   },
 * });
 */
export function useHealthcheckQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<HealthcheckQuery, HealthcheckQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<HealthcheckQuery, HealthcheckQueryVariables>(HealthcheckDocument, options);
      }
export function useHealthcheckLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<HealthcheckQuery, HealthcheckQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<HealthcheckQuery, HealthcheckQueryVariables>(HealthcheckDocument, options);
        }
export function useHealthcheckSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<HealthcheckQuery, HealthcheckQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<HealthcheckQuery, HealthcheckQueryVariables>(HealthcheckDocument, options);
        }
export type HealthcheckQueryHookResult = ReturnType<typeof useHealthcheckQuery>;
export type HealthcheckLazyQueryHookResult = ReturnType<typeof useHealthcheckLazyQuery>;
export type HealthcheckSuspenseQueryHookResult = ReturnType<typeof useHealthcheckSuspenseQuery>;
export type HealthcheckQueryResult = Apollo.QueryResult<HealthcheckQuery, HealthcheckQueryVariables>;
export const GetBackendVersionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBackendVersion"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getBackendVersion"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetBackendVersionQuery__
 *
 * To run a query within a React component, call `useGetBackendVersionQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetBackendVersionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetBackendVersionQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetBackendVersionQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetBackendVersionQuery, GetBackendVersionQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetBackendVersionQuery, GetBackendVersionQueryVariables>(GetBackendVersionDocument, options);
      }
export function useGetBackendVersionLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetBackendVersionQuery, GetBackendVersionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetBackendVersionQuery, GetBackendVersionQueryVariables>(GetBackendVersionDocument, options);
        }
export function useGetBackendVersionSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetBackendVersionQuery, GetBackendVersionQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetBackendVersionQuery, GetBackendVersionQueryVariables>(GetBackendVersionDocument, options);
        }
export type GetBackendVersionQueryHookResult = ReturnType<typeof useGetBackendVersionQuery>;
export type GetBackendVersionLazyQueryHookResult = ReturnType<typeof useGetBackendVersionLazyQuery>;
export type GetBackendVersionSuspenseQueryHookResult = ReturnType<typeof useGetBackendVersionSuspenseQuery>;
export type GetBackendVersionQueryResult = Apollo.QueryResult<GetBackendVersionQuery, GetBackendVersionQueryVariables>;
export const GetNotificationServicesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetNotificationServices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notificationServices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"NotificationServiceInfoFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"NotificationServiceInfoFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NotificationServiceInfo"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"devicePlatform"}},{"kind":"Field","name":{"kind":"Name","value":"service"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetNotificationServicesQuery__
 *
 * To run a query within a React component, call `useGetNotificationServicesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetNotificationServicesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetNotificationServicesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetNotificationServicesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetNotificationServicesQuery, GetNotificationServicesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetNotificationServicesQuery, GetNotificationServicesQueryVariables>(GetNotificationServicesDocument, options);
      }
export function useGetNotificationServicesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetNotificationServicesQuery, GetNotificationServicesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetNotificationServicesQuery, GetNotificationServicesQueryVariables>(GetNotificationServicesDocument, options);
        }
export function useGetNotificationServicesSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetNotificationServicesQuery, GetNotificationServicesQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetNotificationServicesQuery, GetNotificationServicesQueryVariables>(GetNotificationServicesDocument, options);
        }
export type GetNotificationServicesQueryHookResult = ReturnType<typeof useGetNotificationServicesQuery>;
export type GetNotificationServicesLazyQueryHookResult = ReturnType<typeof useGetNotificationServicesLazyQuery>;
export type GetNotificationServicesSuspenseQueryHookResult = ReturnType<typeof useGetNotificationServicesSuspenseQuery>;
export type GetNotificationServicesQueryResult = Apollo.QueryResult<GetNotificationServicesQuery, GetNotificationServicesQueryVariables>;
export const UpdateUserRoleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUserRole"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateUserRoleInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUserRole"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export type UpdateUserRoleMutationFn = Apollo.MutationFunction<UpdateUserRoleMutation, UpdateUserRoleMutationVariables>;

/**
 * __useUpdateUserRoleMutation__
 *
 * To run a mutation, you first call `useUpdateUserRoleMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateUserRoleMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateUserRoleMutation, { data, loading, error }] = useUpdateUserRoleMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateUserRoleMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateUserRoleMutation, UpdateUserRoleMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateUserRoleMutation, UpdateUserRoleMutationVariables>(UpdateUserRoleDocument, options);
      }
export type UpdateUserRoleMutationHookResult = ReturnType<typeof useUpdateUserRoleMutation>;
export type UpdateUserRoleMutationResult = Apollo.MutationResult<UpdateUserRoleMutation>;
export type UpdateUserRoleMutationOptions = Apollo.BaseMutationOptions<UpdateUserRoleMutation, UpdateUserRoleMutationVariables>;
export const SetBucketSnoozeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetBucketSnooze"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"snoozeUntil"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setBucketSnooze"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"bucketId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}}},{"kind":"Argument","name":{"kind":"Name","value":"snoozeUntil"},"value":{"kind":"Variable","name":{"kind":"Name","value":"snoozeUntil"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserBucketFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"bucketId"}},{"kind":"Field","name":{"kind":"Name","value":"magicCode"}},{"kind":"Field","name":{"kind":"Name","value":"customName"}},{"kind":"Field","name":{"kind":"Name","value":"snoozeUntil"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"timeFrom"}},{"kind":"Field","name":{"kind":"Name","value":"timeTill"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}}]}}]} as unknown as DocumentNode;
export type SetBucketSnoozeMutationFn = Apollo.MutationFunction<SetBucketSnoozeMutation, SetBucketSnoozeMutationVariables>;

/**
 * __useSetBucketSnoozeMutation__
 *
 * To run a mutation, you first call `useSetBucketSnoozeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetBucketSnoozeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setBucketSnoozeMutation, { data, loading, error }] = useSetBucketSnoozeMutation({
 *   variables: {
 *      bucketId: // value for 'bucketId'
 *      snoozeUntil: // value for 'snoozeUntil'
 *   },
 * });
 */
export function useSetBucketSnoozeMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<SetBucketSnoozeMutation, SetBucketSnoozeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<SetBucketSnoozeMutation, SetBucketSnoozeMutationVariables>(SetBucketSnoozeDocument, options);
      }
export type SetBucketSnoozeMutationHookResult = ReturnType<typeof useSetBucketSnoozeMutation>;
export type SetBucketSnoozeMutationResult = Apollo.MutationResult<SetBucketSnoozeMutation>;
export type SetBucketSnoozeMutationOptions = Apollo.BaseMutationOptions<SetBucketSnoozeMutation, SetBucketSnoozeMutationVariables>;
export const UpdateBucketSnoozesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateBucketSnoozes"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"snoozes"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SnoozeScheduleInput"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateBucketSnoozes"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"bucketId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}}},{"kind":"Argument","name":{"kind":"Name","value":"snoozes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"snoozes"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserBucketFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"bucketId"}},{"kind":"Field","name":{"kind":"Name","value":"magicCode"}},{"kind":"Field","name":{"kind":"Name","value":"customName"}},{"kind":"Field","name":{"kind":"Name","value":"snoozeUntil"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"timeFrom"}},{"kind":"Field","name":{"kind":"Name","value":"timeTill"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}}]}}]} as unknown as DocumentNode;
export type UpdateBucketSnoozesMutationFn = Apollo.MutationFunction<UpdateBucketSnoozesMutation, UpdateBucketSnoozesMutationVariables>;

/**
 * __useUpdateBucketSnoozesMutation__
 *
 * To run a mutation, you first call `useUpdateBucketSnoozesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateBucketSnoozesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateBucketSnoozesMutation, { data, loading, error }] = useUpdateBucketSnoozesMutation({
 *   variables: {
 *      bucketId: // value for 'bucketId'
 *      snoozes: // value for 'snoozes'
 *   },
 * });
 */
export function useUpdateBucketSnoozesMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateBucketSnoozesMutation, UpdateBucketSnoozesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateBucketSnoozesMutation, UpdateBucketSnoozesMutationVariables>(UpdateBucketSnoozesDocument, options);
      }
export type UpdateBucketSnoozesMutationHookResult = ReturnType<typeof useUpdateBucketSnoozesMutation>;
export type UpdateBucketSnoozesMutationResult = Apollo.MutationResult<UpdateBucketSnoozesMutation>;
export type UpdateBucketSnoozesMutationOptions = Apollo.BaseMutationOptions<UpdateBucketSnoozesMutation, UpdateBucketSnoozesMutationVariables>;
export const RegenerateMagicCodeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RegenerateMagicCode"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"regenerateMagicCode"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"bucketId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserBucketFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"bucketId"}},{"kind":"Field","name":{"kind":"Name","value":"magicCode"}},{"kind":"Field","name":{"kind":"Name","value":"customName"}},{"kind":"Field","name":{"kind":"Name","value":"snoozeUntil"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"timeFrom"}},{"kind":"Field","name":{"kind":"Name","value":"timeTill"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}}]}}]} as unknown as DocumentNode;
export type RegenerateMagicCodeMutationFn = Apollo.MutationFunction<RegenerateMagicCodeMutation, RegenerateMagicCodeMutationVariables>;

/**
 * __useRegenerateMagicCodeMutation__
 *
 * To run a mutation, you first call `useRegenerateMagicCodeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRegenerateMagicCodeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [regenerateMagicCodeMutation, { data, loading, error }] = useRegenerateMagicCodeMutation({
 *   variables: {
 *      bucketId: // value for 'bucketId'
 *   },
 * });
 */
export function useRegenerateMagicCodeMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RegenerateMagicCodeMutation, RegenerateMagicCodeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RegenerateMagicCodeMutation, RegenerateMagicCodeMutationVariables>(RegenerateMagicCodeDocument, options);
      }
export type RegenerateMagicCodeMutationHookResult = ReturnType<typeof useRegenerateMagicCodeMutation>;
export type RegenerateMagicCodeMutationResult = Apollo.MutationResult<RegenerateMagicCodeMutation>;
export type RegenerateMagicCodeMutationOptions = Apollo.BaseMutationOptions<RegenerateMagicCodeMutation, RegenerateMagicCodeMutationVariables>;
export const DeleteMagicCodeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteMagicCode"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteMagicCode"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"bucketId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserBucketFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"bucketId"}},{"kind":"Field","name":{"kind":"Name","value":"magicCode"}},{"kind":"Field","name":{"kind":"Name","value":"customName"}},{"kind":"Field","name":{"kind":"Name","value":"snoozeUntil"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"timeFrom"}},{"kind":"Field","name":{"kind":"Name","value":"timeTill"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}}]}}]} as unknown as DocumentNode;
export type DeleteMagicCodeMutationFn = Apollo.MutationFunction<DeleteMagicCodeMutation, DeleteMagicCodeMutationVariables>;

/**
 * __useDeleteMagicCodeMutation__
 *
 * To run a mutation, you first call `useDeleteMagicCodeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteMagicCodeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteMagicCodeMutation, { data, loading, error }] = useDeleteMagicCodeMutation({
 *   variables: {
 *      bucketId: // value for 'bucketId'
 *   },
 * });
 */
export function useDeleteMagicCodeMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteMagicCodeMutation, DeleteMagicCodeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteMagicCodeMutation, DeleteMagicCodeMutationVariables>(DeleteMagicCodeDocument, options);
      }
export type DeleteMagicCodeMutationHookResult = ReturnType<typeof useDeleteMagicCodeMutation>;
export type DeleteMagicCodeMutationResult = Apollo.MutationResult<DeleteMagicCodeMutation>;
export type DeleteMagicCodeMutationOptions = Apollo.BaseMutationOptions<DeleteMagicCodeMutation, DeleteMagicCodeMutationVariables>;
export const UpdateUserBucketCustomNameDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUserBucketCustomName"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"customName"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUserBucketCustomName"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"bucketId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}}},{"kind":"Argument","name":{"kind":"Name","value":"customName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"customName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserBucketFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Bucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"iconAttachmentUuid"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isProtected"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBucketFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"bucketId"}},{"kind":"Field","name":{"kind":"Name","value":"magicCode"}},{"kind":"Field","name":{"kind":"Name","value":"customName"}},{"kind":"Field","name":{"kind":"Name","value":"snoozeUntil"}},{"kind":"Field","name":{"kind":"Name","value":"snoozes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"timeFrom"}},{"kind":"Field","name":{"kind":"Name","value":"timeTill"}},{"kind":"Field","name":{"kind":"Name","value":"isEnabled"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BucketFragment"}}]}}]}}]} as unknown as DocumentNode;
export type UpdateUserBucketCustomNameMutationFn = Apollo.MutationFunction<UpdateUserBucketCustomNameMutation, UpdateUserBucketCustomNameMutationVariables>;

/**
 * __useUpdateUserBucketCustomNameMutation__
 *
 * To run a mutation, you first call `useUpdateUserBucketCustomNameMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateUserBucketCustomNameMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateUserBucketCustomNameMutation, { data, loading, error }] = useUpdateUserBucketCustomNameMutation({
 *   variables: {
 *      bucketId: // value for 'bucketId'
 *      customName: // value for 'customName'
 *   },
 * });
 */
export function useUpdateUserBucketCustomNameMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateUserBucketCustomNameMutation, UpdateUserBucketCustomNameMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateUserBucketCustomNameMutation, UpdateUserBucketCustomNameMutationVariables>(UpdateUserBucketCustomNameDocument, options);
      }
export type UpdateUserBucketCustomNameMutationHookResult = ReturnType<typeof useUpdateUserBucketCustomNameMutation>;
export type UpdateUserBucketCustomNameMutationResult = Apollo.MutationResult<UpdateUserBucketCustomNameMutation>;
export type UpdateUserBucketCustomNameMutationOptions = Apollo.BaseMutationOptions<UpdateUserBucketCustomNameMutation, UpdateUserBucketCustomNameMutationVariables>;
export const SystemAccessTokenRequestsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SystemAccessTokenRequests"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"systemAccessTokenRequests"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SystemAccessTokenRequestFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SystemAccessTokenRequestFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SystemAccessTokenRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"systemAccessTokenId"}},{"kind":"Field","name":{"kind":"Name","value":"systemAccessToken"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"description"}}]}},{"kind":"Field","name":{"kind":"Name","value":"plainTextToken"}},{"kind":"Field","name":{"kind":"Name","value":"maxRequests"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]} as unknown as DocumentNode;

/**
 * __useSystemAccessTokenRequestsQuery__
 *
 * To run a query within a React component, call `useSystemAccessTokenRequestsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSystemAccessTokenRequestsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSystemAccessTokenRequestsQuery({
 *   variables: {
 *   },
 * });
 */
export function useSystemAccessTokenRequestsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<SystemAccessTokenRequestsQuery, SystemAccessTokenRequestsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SystemAccessTokenRequestsQuery, SystemAccessTokenRequestsQueryVariables>(SystemAccessTokenRequestsDocument, options);
      }
export function useSystemAccessTokenRequestsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SystemAccessTokenRequestsQuery, SystemAccessTokenRequestsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SystemAccessTokenRequestsQuery, SystemAccessTokenRequestsQueryVariables>(SystemAccessTokenRequestsDocument, options);
        }
export function useSystemAccessTokenRequestsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<SystemAccessTokenRequestsQuery, SystemAccessTokenRequestsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<SystemAccessTokenRequestsQuery, SystemAccessTokenRequestsQueryVariables>(SystemAccessTokenRequestsDocument, options);
        }
export type SystemAccessTokenRequestsQueryHookResult = ReturnType<typeof useSystemAccessTokenRequestsQuery>;
export type SystemAccessTokenRequestsLazyQueryHookResult = ReturnType<typeof useSystemAccessTokenRequestsLazyQuery>;
export type SystemAccessTokenRequestsSuspenseQueryHookResult = ReturnType<typeof useSystemAccessTokenRequestsSuspenseQuery>;
export type SystemAccessTokenRequestsQueryResult = Apollo.QueryResult<SystemAccessTokenRequestsQuery, SystemAccessTokenRequestsQueryVariables>;
export const ApproveSystemAccessTokenRequestDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ApproveSystemAccessTokenRequest"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"approveSystemAccessTokenRequest"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SystemAccessTokenRequestFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SystemAccessTokenRequestFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SystemAccessTokenRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"systemAccessTokenId"}},{"kind":"Field","name":{"kind":"Name","value":"systemAccessToken"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"description"}}]}},{"kind":"Field","name":{"kind":"Name","value":"plainTextToken"}},{"kind":"Field","name":{"kind":"Name","value":"maxRequests"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]} as unknown as DocumentNode;
export type ApproveSystemAccessTokenRequestMutationFn = Apollo.MutationFunction<ApproveSystemAccessTokenRequestMutation, ApproveSystemAccessTokenRequestMutationVariables>;

/**
 * __useApproveSystemAccessTokenRequestMutation__
 *
 * To run a mutation, you first call `useApproveSystemAccessTokenRequestMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useApproveSystemAccessTokenRequestMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [approveSystemAccessTokenRequestMutation, { data, loading, error }] = useApproveSystemAccessTokenRequestMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useApproveSystemAccessTokenRequestMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ApproveSystemAccessTokenRequestMutation, ApproveSystemAccessTokenRequestMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ApproveSystemAccessTokenRequestMutation, ApproveSystemAccessTokenRequestMutationVariables>(ApproveSystemAccessTokenRequestDocument, options);
      }
export type ApproveSystemAccessTokenRequestMutationHookResult = ReturnType<typeof useApproveSystemAccessTokenRequestMutation>;
export type ApproveSystemAccessTokenRequestMutationResult = Apollo.MutationResult<ApproveSystemAccessTokenRequestMutation>;
export type ApproveSystemAccessTokenRequestMutationOptions = Apollo.BaseMutationOptions<ApproveSystemAccessTokenRequestMutation, ApproveSystemAccessTokenRequestMutationVariables>;
export const MySystemAccessTokenRequestsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MySystemAccessTokenRequests"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mySystemAccessTokenRequests"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SystemAccessTokenRequestFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SystemAccessTokenRequestFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SystemAccessTokenRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"systemAccessTokenId"}},{"kind":"Field","name":{"kind":"Name","value":"systemAccessToken"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"description"}}]}},{"kind":"Field","name":{"kind":"Name","value":"plainTextToken"}},{"kind":"Field","name":{"kind":"Name","value":"maxRequests"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]} as unknown as DocumentNode;

/**
 * __useMySystemAccessTokenRequestsQuery__
 *
 * To run a query within a React component, call `useMySystemAccessTokenRequestsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMySystemAccessTokenRequestsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMySystemAccessTokenRequestsQuery({
 *   variables: {
 *   },
 * });
 */
export function useMySystemAccessTokenRequestsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<MySystemAccessTokenRequestsQuery, MySystemAccessTokenRequestsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MySystemAccessTokenRequestsQuery, MySystemAccessTokenRequestsQueryVariables>(MySystemAccessTokenRequestsDocument, options);
      }
export function useMySystemAccessTokenRequestsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MySystemAccessTokenRequestsQuery, MySystemAccessTokenRequestsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MySystemAccessTokenRequestsQuery, MySystemAccessTokenRequestsQueryVariables>(MySystemAccessTokenRequestsDocument, options);
        }
export function useMySystemAccessTokenRequestsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<MySystemAccessTokenRequestsQuery, MySystemAccessTokenRequestsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<MySystemAccessTokenRequestsQuery, MySystemAccessTokenRequestsQueryVariables>(MySystemAccessTokenRequestsDocument, options);
        }
export type MySystemAccessTokenRequestsQueryHookResult = ReturnType<typeof useMySystemAccessTokenRequestsQuery>;
export type MySystemAccessTokenRequestsLazyQueryHookResult = ReturnType<typeof useMySystemAccessTokenRequestsLazyQuery>;
export type MySystemAccessTokenRequestsSuspenseQueryHookResult = ReturnType<typeof useMySystemAccessTokenRequestsSuspenseQuery>;
export type MySystemAccessTokenRequestsQueryResult = Apollo.QueryResult<MySystemAccessTokenRequestsQuery, MySystemAccessTokenRequestsQueryVariables>;
export const CreateSystemAccessTokenRequestDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateSystemAccessTokenRequest"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateSystemAccessTokenRequestDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSystemAccessTokenRequest"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SystemAccessTokenRequestFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SystemAccessTokenRequestFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SystemAccessTokenRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"systemAccessTokenId"}},{"kind":"Field","name":{"kind":"Name","value":"systemAccessToken"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"description"}}]}},{"kind":"Field","name":{"kind":"Name","value":"plainTextToken"}},{"kind":"Field","name":{"kind":"Name","value":"maxRequests"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]} as unknown as DocumentNode;
export type CreateSystemAccessTokenRequestMutationFn = Apollo.MutationFunction<CreateSystemAccessTokenRequestMutation, CreateSystemAccessTokenRequestMutationVariables>;

/**
 * __useCreateSystemAccessTokenRequestMutation__
 *
 * To run a mutation, you first call `useCreateSystemAccessTokenRequestMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateSystemAccessTokenRequestMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createSystemAccessTokenRequestMutation, { data, loading, error }] = useCreateSystemAccessTokenRequestMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateSystemAccessTokenRequestMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateSystemAccessTokenRequestMutation, CreateSystemAccessTokenRequestMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateSystemAccessTokenRequestMutation, CreateSystemAccessTokenRequestMutationVariables>(CreateSystemAccessTokenRequestDocument, options);
      }
export type CreateSystemAccessTokenRequestMutationHookResult = ReturnType<typeof useCreateSystemAccessTokenRequestMutation>;
export type CreateSystemAccessTokenRequestMutationResult = Apollo.MutationResult<CreateSystemAccessTokenRequestMutation>;
export type CreateSystemAccessTokenRequestMutationOptions = Apollo.BaseMutationOptions<CreateSystemAccessTokenRequestMutation, CreateSystemAccessTokenRequestMutationVariables>;
export const DeclineSystemAccessTokenRequestDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeclineSystemAccessTokenRequest"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"declineSystemAccessTokenRequest"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SystemAccessTokenRequestFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SystemAccessTokenRequestFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SystemAccessTokenRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"systemAccessTokenId"}},{"kind":"Field","name":{"kind":"Name","value":"systemAccessToken"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"description"}}]}},{"kind":"Field","name":{"kind":"Name","value":"plainTextToken"}},{"kind":"Field","name":{"kind":"Name","value":"maxRequests"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]} as unknown as DocumentNode;
export type DeclineSystemAccessTokenRequestMutationFn = Apollo.MutationFunction<DeclineSystemAccessTokenRequestMutation, DeclineSystemAccessTokenRequestMutationVariables>;

/**
 * __useDeclineSystemAccessTokenRequestMutation__
 *
 * To run a mutation, you first call `useDeclineSystemAccessTokenRequestMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeclineSystemAccessTokenRequestMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [declineSystemAccessTokenRequestMutation, { data, loading, error }] = useDeclineSystemAccessTokenRequestMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeclineSystemAccessTokenRequestMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeclineSystemAccessTokenRequestMutation, DeclineSystemAccessTokenRequestMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeclineSystemAccessTokenRequestMutation, DeclineSystemAccessTokenRequestMutationVariables>(DeclineSystemAccessTokenRequestDocument, options);
      }
export type DeclineSystemAccessTokenRequestMutationHookResult = ReturnType<typeof useDeclineSystemAccessTokenRequestMutation>;
export type DeclineSystemAccessTokenRequestMutationResult = Apollo.MutationResult<DeclineSystemAccessTokenRequestMutation>;
export type DeclineSystemAccessTokenRequestMutationOptions = Apollo.BaseMutationOptions<DeclineSystemAccessTokenRequestMutation, DeclineSystemAccessTokenRequestMutationVariables>;
export const GetAllUsersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAllUsers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"users"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetAllUsersQuery__
 *
 * To run a query within a React component, call `useGetAllUsersQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAllUsersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAllUsersQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetAllUsersQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetAllUsersQuery, GetAllUsersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetAllUsersQuery, GetAllUsersQueryVariables>(GetAllUsersDocument, options);
      }
export function useGetAllUsersLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetAllUsersQuery, GetAllUsersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetAllUsersQuery, GetAllUsersQueryVariables>(GetAllUsersDocument, options);
        }
export function useGetAllUsersSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetAllUsersQuery, GetAllUsersQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetAllUsersQuery, GetAllUsersQueryVariables>(GetAllUsersDocument, options);
        }
export type GetAllUsersQueryHookResult = ReturnType<typeof useGetAllUsersQuery>;
export type GetAllUsersLazyQueryHookResult = ReturnType<typeof useGetAllUsersLazyQuery>;
export type GetAllUsersSuspenseQueryHookResult = ReturnType<typeof useGetAllUsersSuspenseQuery>;
export type GetAllUsersQueryResult = Apollo.QueryResult<GetAllUsersQuery, GetAllUsersQueryVariables>;
export const AdminCreateUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminCreateUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AdminCreateUserInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminCreateUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export type AdminCreateUserMutationFn = Apollo.MutationFunction<AdminCreateUserMutation, AdminCreateUserMutationVariables>;

/**
 * __useAdminCreateUserMutation__
 *
 * To run a mutation, you first call `useAdminCreateUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAdminCreateUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [adminCreateUserMutation, { data, loading, error }] = useAdminCreateUserMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAdminCreateUserMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<AdminCreateUserMutation, AdminCreateUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<AdminCreateUserMutation, AdminCreateUserMutationVariables>(AdminCreateUserDocument, options);
      }
export type AdminCreateUserMutationHookResult = ReturnType<typeof useAdminCreateUserMutation>;
export type AdminCreateUserMutationResult = Apollo.MutationResult<AdminCreateUserMutation>;
export type AdminCreateUserMutationOptions = Apollo.BaseMutationOptions<AdminCreateUserMutation, AdminCreateUserMutationVariables>;
export const AdminDeleteUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminDeleteUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminDeleteUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}]}]}}]} as unknown as DocumentNode;
export type AdminDeleteUserMutationFn = Apollo.MutationFunction<AdminDeleteUserMutation, AdminDeleteUserMutationVariables>;

/**
 * __useAdminDeleteUserMutation__
 *
 * To run a mutation, you first call `useAdminDeleteUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAdminDeleteUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [adminDeleteUserMutation, { data, loading, error }] = useAdminDeleteUserMutation({
 *   variables: {
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useAdminDeleteUserMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<AdminDeleteUserMutation, AdminDeleteUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<AdminDeleteUserMutation, AdminDeleteUserMutationVariables>(AdminDeleteUserDocument, options);
      }
export type AdminDeleteUserMutationHookResult = ReturnType<typeof useAdminDeleteUserMutation>;
export type AdminDeleteUserMutationResult = Apollo.MutationResult<AdminDeleteUserMutation>;
export type AdminDeleteUserMutationOptions = Apollo.BaseMutationOptions<AdminDeleteUserMutation, AdminDeleteUserMutationVariables>;
export const GetUserByIdDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserById"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetUserByIdQuery__
 *
 * To run a query within a React component, call `useGetUserByIdQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUserByIdQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUserByIdQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetUserByIdQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetUserByIdQuery, GetUserByIdQueryVariables> & ({ variables: GetUserByIdQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetUserByIdQuery, GetUserByIdQueryVariables>(GetUserByIdDocument, options);
      }
export function useGetUserByIdLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetUserByIdQuery, GetUserByIdQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetUserByIdQuery, GetUserByIdQueryVariables>(GetUserByIdDocument, options);
        }
export function useGetUserByIdSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetUserByIdQuery, GetUserByIdQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetUserByIdQuery, GetUserByIdQueryVariables>(GetUserByIdDocument, options);
        }
export type GetUserByIdQueryHookResult = ReturnType<typeof useGetUserByIdQuery>;
export type GetUserByIdLazyQueryHookResult = ReturnType<typeof useGetUserByIdLazyQuery>;
export type GetUserByIdSuspenseQueryHookResult = ReturnType<typeof useGetUserByIdSuspenseQuery>;
export type GetUserByIdQueryResult = Apollo.QueryResult<GetUserByIdQuery, GetUserByIdQueryVariables>;
export const GetSystemAccessTokensDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSystemAccessTokens"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listSystemTokens"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SystemAccessTokenFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SystemAccessTokenFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SystemAccessTokenDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"maxCalls"}},{"kind":"Field","name":{"kind":"Name","value":"calls"}},{"kind":"Field","name":{"kind":"Name","value":"totalCalls"}},{"kind":"Field","name":{"kind":"Name","value":"failedCalls"}},{"kind":"Field","name":{"kind":"Name","value":"totalFailedCalls"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastResetAt"}},{"kind":"Field","name":{"kind":"Name","value":"requester"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetSystemAccessTokensQuery__
 *
 * To run a query within a React component, call `useGetSystemAccessTokensQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetSystemAccessTokensQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetSystemAccessTokensQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetSystemAccessTokensQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetSystemAccessTokensQuery, GetSystemAccessTokensQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetSystemAccessTokensQuery, GetSystemAccessTokensQueryVariables>(GetSystemAccessTokensDocument, options);
      }
export function useGetSystemAccessTokensLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetSystemAccessTokensQuery, GetSystemAccessTokensQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetSystemAccessTokensQuery, GetSystemAccessTokensQueryVariables>(GetSystemAccessTokensDocument, options);
        }
export function useGetSystemAccessTokensSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetSystemAccessTokensQuery, GetSystemAccessTokensQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetSystemAccessTokensQuery, GetSystemAccessTokensQueryVariables>(GetSystemAccessTokensDocument, options);
        }
export type GetSystemAccessTokensQueryHookResult = ReturnType<typeof useGetSystemAccessTokensQuery>;
export type GetSystemAccessTokensLazyQueryHookResult = ReturnType<typeof useGetSystemAccessTokensLazyQuery>;
export type GetSystemAccessTokensSuspenseQueryHookResult = ReturnType<typeof useGetSystemAccessTokensSuspenseQuery>;
export type GetSystemAccessTokensQueryResult = Apollo.QueryResult<GetSystemAccessTokensQuery, GetSystemAccessTokensQueryVariables>;
export const GetSystemTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSystemToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getSystemToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SystemAccessTokenFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SystemAccessTokenFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SystemAccessTokenDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"maxCalls"}},{"kind":"Field","name":{"kind":"Name","value":"calls"}},{"kind":"Field","name":{"kind":"Name","value":"totalCalls"}},{"kind":"Field","name":{"kind":"Name","value":"failedCalls"}},{"kind":"Field","name":{"kind":"Name","value":"totalFailedCalls"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastResetAt"}},{"kind":"Field","name":{"kind":"Name","value":"requester"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetSystemTokenQuery__
 *
 * To run a query within a React component, call `useGetSystemTokenQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetSystemTokenQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetSystemTokenQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetSystemTokenQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetSystemTokenQuery, GetSystemTokenQueryVariables> & ({ variables: GetSystemTokenQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetSystemTokenQuery, GetSystemTokenQueryVariables>(GetSystemTokenDocument, options);
      }
export function useGetSystemTokenLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetSystemTokenQuery, GetSystemTokenQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetSystemTokenQuery, GetSystemTokenQueryVariables>(GetSystemTokenDocument, options);
        }
export function useGetSystemTokenSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetSystemTokenQuery, GetSystemTokenQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetSystemTokenQuery, GetSystemTokenQueryVariables>(GetSystemTokenDocument, options);
        }
export type GetSystemTokenQueryHookResult = ReturnType<typeof useGetSystemTokenQuery>;
export type GetSystemTokenLazyQueryHookResult = ReturnType<typeof useGetSystemTokenLazyQuery>;
export type GetSystemTokenSuspenseQueryHookResult = ReturnType<typeof useGetSystemTokenSuspenseQuery>;
export type GetSystemTokenQueryResult = Apollo.QueryResult<GetSystemTokenQuery, GetSystemTokenQueryVariables>;
export const CreateSystemAccessTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateSystemAccessToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"maxCalls"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"expiresAt"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"requesterId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"description"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"scopes"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSystemToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"maxCalls"},"value":{"kind":"Variable","name":{"kind":"Name","value":"maxCalls"}}},{"kind":"Argument","name":{"kind":"Name","value":"expiresAt"},"value":{"kind":"Variable","name":{"kind":"Name","value":"expiresAt"}}},{"kind":"Argument","name":{"kind":"Name","value":"requesterId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"requesterId"}}},{"kind":"Argument","name":{"kind":"Name","value":"description"},"value":{"kind":"Variable","name":{"kind":"Name","value":"description"}}},{"kind":"Argument","name":{"kind":"Name","value":"scopes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"scopes"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SystemAccessTokenFragment"}},{"kind":"Field","name":{"kind":"Name","value":"rawToken"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SystemAccessTokenFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SystemAccessTokenDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"maxCalls"}},{"kind":"Field","name":{"kind":"Name","value":"calls"}},{"kind":"Field","name":{"kind":"Name","value":"totalCalls"}},{"kind":"Field","name":{"kind":"Name","value":"failedCalls"}},{"kind":"Field","name":{"kind":"Name","value":"totalFailedCalls"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastResetAt"}},{"kind":"Field","name":{"kind":"Name","value":"requester"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export type CreateSystemAccessTokenMutationFn = Apollo.MutationFunction<CreateSystemAccessTokenMutation, CreateSystemAccessTokenMutationVariables>;

/**
 * __useCreateSystemAccessTokenMutation__
 *
 * To run a mutation, you first call `useCreateSystemAccessTokenMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateSystemAccessTokenMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createSystemAccessTokenMutation, { data, loading, error }] = useCreateSystemAccessTokenMutation({
 *   variables: {
 *      maxCalls: // value for 'maxCalls'
 *      expiresAt: // value for 'expiresAt'
 *      requesterId: // value for 'requesterId'
 *      description: // value for 'description'
 *      scopes: // value for 'scopes'
 *   },
 * });
 */
export function useCreateSystemAccessTokenMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateSystemAccessTokenMutation, CreateSystemAccessTokenMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateSystemAccessTokenMutation, CreateSystemAccessTokenMutationVariables>(CreateSystemAccessTokenDocument, options);
      }
export type CreateSystemAccessTokenMutationHookResult = ReturnType<typeof useCreateSystemAccessTokenMutation>;
export type CreateSystemAccessTokenMutationResult = Apollo.MutationResult<CreateSystemAccessTokenMutation>;
export type CreateSystemAccessTokenMutationOptions = Apollo.BaseMutationOptions<CreateSystemAccessTokenMutation, CreateSystemAccessTokenMutationVariables>;
export const UpdateSystemAccessTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateSystemAccessToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"maxCalls"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"expiresAt"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"requesterId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"description"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"scopes"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateSystemToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"maxCalls"},"value":{"kind":"Variable","name":{"kind":"Name","value":"maxCalls"}}},{"kind":"Argument","name":{"kind":"Name","value":"expiresAt"},"value":{"kind":"Variable","name":{"kind":"Name","value":"expiresAt"}}},{"kind":"Argument","name":{"kind":"Name","value":"requesterId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"requesterId"}}},{"kind":"Argument","name":{"kind":"Name","value":"description"},"value":{"kind":"Variable","name":{"kind":"Name","value":"description"}}},{"kind":"Argument","name":{"kind":"Name","value":"scopes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"scopes"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SystemAccessTokenFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SystemAccessTokenFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SystemAccessTokenDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"maxCalls"}},{"kind":"Field","name":{"kind":"Name","value":"calls"}},{"kind":"Field","name":{"kind":"Name","value":"totalCalls"}},{"kind":"Field","name":{"kind":"Name","value":"failedCalls"}},{"kind":"Field","name":{"kind":"Name","value":"totalFailedCalls"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastResetAt"}},{"kind":"Field","name":{"kind":"Name","value":"requester"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export type UpdateSystemAccessTokenMutationFn = Apollo.MutationFunction<UpdateSystemAccessTokenMutation, UpdateSystemAccessTokenMutationVariables>;

/**
 * __useUpdateSystemAccessTokenMutation__
 *
 * To run a mutation, you first call `useUpdateSystemAccessTokenMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateSystemAccessTokenMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateSystemAccessTokenMutation, { data, loading, error }] = useUpdateSystemAccessTokenMutation({
 *   variables: {
 *      id: // value for 'id'
 *      maxCalls: // value for 'maxCalls'
 *      expiresAt: // value for 'expiresAt'
 *      requesterId: // value for 'requesterId'
 *      description: // value for 'description'
 *      scopes: // value for 'scopes'
 *   },
 * });
 */
export function useUpdateSystemAccessTokenMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateSystemAccessTokenMutation, UpdateSystemAccessTokenMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateSystemAccessTokenMutation, UpdateSystemAccessTokenMutationVariables>(UpdateSystemAccessTokenDocument, options);
      }
export type UpdateSystemAccessTokenMutationHookResult = ReturnType<typeof useUpdateSystemAccessTokenMutation>;
export type UpdateSystemAccessTokenMutationResult = Apollo.MutationResult<UpdateSystemAccessTokenMutation>;
export type UpdateSystemAccessTokenMutationOptions = Apollo.BaseMutationOptions<UpdateSystemAccessTokenMutation, UpdateSystemAccessTokenMutationVariables>;
export const CreateUserLogDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateUserLog"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateUserLogInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createUserLog"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"payload"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode;
export type CreateUserLogMutationFn = Apollo.MutationFunction<CreateUserLogMutation, CreateUserLogMutationVariables>;

/**
 * __useCreateUserLogMutation__
 *
 * To run a mutation, you first call `useCreateUserLogMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateUserLogMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createUserLogMutation, { data, loading, error }] = useCreateUserLogMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateUserLogMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateUserLogMutation, CreateUserLogMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateUserLogMutation, CreateUserLogMutationVariables>(CreateUserLogDocument, options);
      }
export type CreateUserLogMutationHookResult = ReturnType<typeof useCreateUserLogMutation>;
export type CreateUserLogMutationResult = Apollo.MutationResult<CreateUserLogMutation>;
export type CreateUserLogMutationOptions = Apollo.BaseMutationOptions<CreateUserLogMutation, CreateUserLogMutationVariables>;
export const RevokeSystemAccessTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RevokeSystemAccessToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokeSystemToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode;
export type RevokeSystemAccessTokenMutationFn = Apollo.MutationFunction<RevokeSystemAccessTokenMutation, RevokeSystemAccessTokenMutationVariables>;

/**
 * __useRevokeSystemAccessTokenMutation__
 *
 * To run a mutation, you first call `useRevokeSystemAccessTokenMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRevokeSystemAccessTokenMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [revokeSystemAccessTokenMutation, { data, loading, error }] = useRevokeSystemAccessTokenMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRevokeSystemAccessTokenMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RevokeSystemAccessTokenMutation, RevokeSystemAccessTokenMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RevokeSystemAccessTokenMutation, RevokeSystemAccessTokenMutationVariables>(RevokeSystemAccessTokenDocument, options);
      }
export type RevokeSystemAccessTokenMutationHookResult = ReturnType<typeof useRevokeSystemAccessTokenMutation>;
export type RevokeSystemAccessTokenMutationResult = Apollo.MutationResult<RevokeSystemAccessTokenMutation>;
export type RevokeSystemAccessTokenMutationOptions = Apollo.BaseMutationOptions<RevokeSystemAccessTokenMutation, RevokeSystemAccessTokenMutationVariables>;
export const RequestEmailConfirmationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RequestEmailConfirmation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RequestEmailConfirmationDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"requestEmailConfirmation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode;
export type RequestEmailConfirmationMutationFn = Apollo.MutationFunction<RequestEmailConfirmationMutation, RequestEmailConfirmationMutationVariables>;

/**
 * __useRequestEmailConfirmationMutation__
 *
 * To run a mutation, you first call `useRequestEmailConfirmationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRequestEmailConfirmationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [requestEmailConfirmationMutation, { data, loading, error }] = useRequestEmailConfirmationMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRequestEmailConfirmationMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RequestEmailConfirmationMutation, RequestEmailConfirmationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RequestEmailConfirmationMutation, RequestEmailConfirmationMutationVariables>(RequestEmailConfirmationDocument, options);
      }
export type RequestEmailConfirmationMutationHookResult = ReturnType<typeof useRequestEmailConfirmationMutation>;
export type RequestEmailConfirmationMutationResult = Apollo.MutationResult<RequestEmailConfirmationMutation>;
export type RequestEmailConfirmationMutationOptions = Apollo.BaseMutationOptions<RequestEmailConfirmationMutation, RequestEmailConfirmationMutationVariables>;
export const ConfirmEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ConfirmEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ConfirmEmailDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"confirmEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode;
export type ConfirmEmailMutationFn = Apollo.MutationFunction<ConfirmEmailMutation, ConfirmEmailMutationVariables>;

/**
 * __useConfirmEmailMutation__
 *
 * To run a mutation, you first call `useConfirmEmailMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useConfirmEmailMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [confirmEmailMutation, { data, loading, error }] = useConfirmEmailMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useConfirmEmailMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ConfirmEmailMutation, ConfirmEmailMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ConfirmEmailMutation, ConfirmEmailMutationVariables>(ConfirmEmailDocument, options);
      }
export type ConfirmEmailMutationHookResult = ReturnType<typeof useConfirmEmailMutation>;
export type ConfirmEmailMutationResult = Apollo.MutationResult<ConfirmEmailMutation>;
export type ConfirmEmailMutationOptions = Apollo.BaseMutationOptions<ConfirmEmailMutation, ConfirmEmailMutationVariables>;
export const PublicAppConfigDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PublicAppConfig"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publicAppConfig"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"emailEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"uploadEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"iconUploaderEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"systemTokenRequestsEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"socialLoginEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"localRegistrationEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"socialRegistrationEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"oauthProviders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"OAuthProviderPublicFragment"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OAuthProviderPublicFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OAuthProviderPublicDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"textColor"}},{"kind":"Field","name":{"kind":"Name","value":"providerKey"}}]}}]} as unknown as DocumentNode;

/**
 * __usePublicAppConfigQuery__
 *
 * To run a query within a React component, call `usePublicAppConfigQuery` and pass it any options that fit your needs.
 * When your component renders, `usePublicAppConfigQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePublicAppConfigQuery({
 *   variables: {
 *   },
 * });
 */
export function usePublicAppConfigQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<PublicAppConfigQuery, PublicAppConfigQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<PublicAppConfigQuery, PublicAppConfigQueryVariables>(PublicAppConfigDocument, options);
      }
export function usePublicAppConfigLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<PublicAppConfigQuery, PublicAppConfigQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<PublicAppConfigQuery, PublicAppConfigQueryVariables>(PublicAppConfigDocument, options);
        }
export function usePublicAppConfigSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<PublicAppConfigQuery, PublicAppConfigQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<PublicAppConfigQuery, PublicAppConfigQueryVariables>(PublicAppConfigDocument, options);
        }
export type PublicAppConfigQueryHookResult = ReturnType<typeof usePublicAppConfigQuery>;
export type PublicAppConfigLazyQueryHookResult = ReturnType<typeof usePublicAppConfigLazyQuery>;
export type PublicAppConfigSuspenseQueryHookResult = ReturnType<typeof usePublicAppConfigSuspenseQuery>;
export type PublicAppConfigQueryResult = Apollo.QueryResult<PublicAppConfigQuery, PublicAppConfigQueryVariables>;
export const GetEventsPaginatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetEventsPaginated"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"EventsQueryDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"events"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"events"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EventFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"page"}},{"kind":"Field","name":{"kind":"Name","value":"limit"}},{"kind":"Field","name":{"kind":"Name","value":"totalPages"}},{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}},{"kind":"Field","name":{"kind":"Name","value":"hasPreviousPage"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EventFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Event"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"objectId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"targetId"}},{"kind":"Field","name":{"kind":"Name","value":"additionalInfo"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetEventsPaginatedQuery__
 *
 * To run a query within a React component, call `useGetEventsPaginatedQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetEventsPaginatedQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetEventsPaginatedQuery({
 *   variables: {
 *      query: // value for 'query'
 *   },
 * });
 */
export function useGetEventsPaginatedQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetEventsPaginatedQuery, GetEventsPaginatedQueryVariables> & ({ variables: GetEventsPaginatedQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetEventsPaginatedQuery, GetEventsPaginatedQueryVariables>(GetEventsPaginatedDocument, options);
      }
export function useGetEventsPaginatedLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetEventsPaginatedQuery, GetEventsPaginatedQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetEventsPaginatedQuery, GetEventsPaginatedQueryVariables>(GetEventsPaginatedDocument, options);
        }
export function useGetEventsPaginatedSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetEventsPaginatedQuery, GetEventsPaginatedQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetEventsPaginatedQuery, GetEventsPaginatedQueryVariables>(GetEventsPaginatedDocument, options);
        }
export type GetEventsPaginatedQueryHookResult = ReturnType<typeof useGetEventsPaginatedQuery>;
export type GetEventsPaginatedLazyQueryHookResult = ReturnType<typeof useGetEventsPaginatedLazyQuery>;
export type GetEventsPaginatedSuspenseQueryHookResult = ReturnType<typeof useGetEventsPaginatedSuspenseQuery>;
export type GetEventsPaginatedQueryResult = Apollo.QueryResult<GetEventsPaginatedQuery, GetEventsPaginatedQueryVariables>;
export const UserNotificationStatsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UserNotificationStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userNotificationStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserNotificationStatsFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserNotificationStatsFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserNotificationStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"today"}},{"kind":"Field","name":{"kind":"Name","value":"todayAcked"}},{"kind":"Field","name":{"kind":"Name","value":"thisWeek"}},{"kind":"Field","name":{"kind":"Name","value":"thisWeekAcked"}},{"kind":"Field","name":{"kind":"Name","value":"last7Days"}},{"kind":"Field","name":{"kind":"Name","value":"last7DaysAcked"}},{"kind":"Field","name":{"kind":"Name","value":"thisMonth"}},{"kind":"Field","name":{"kind":"Name","value":"thisMonthAcked"}},{"kind":"Field","name":{"kind":"Name","value":"last30Days"}},{"kind":"Field","name":{"kind":"Name","value":"last30DaysAcked"}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"totalAcked"}}]}}]} as unknown as DocumentNode;

/**
 * __useUserNotificationStatsQuery__
 *
 * To run a query within a React component, call `useUserNotificationStatsQuery` and pass it any options that fit your needs.
 * When your component renders, `useUserNotificationStatsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUserNotificationStatsQuery({
 *   variables: {
 *   },
 * });
 */
export function useUserNotificationStatsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<UserNotificationStatsQuery, UserNotificationStatsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<UserNotificationStatsQuery, UserNotificationStatsQueryVariables>(UserNotificationStatsDocument, options);
      }
export function useUserNotificationStatsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<UserNotificationStatsQuery, UserNotificationStatsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<UserNotificationStatsQuery, UserNotificationStatsQueryVariables>(UserNotificationStatsDocument, options);
        }
export function useUserNotificationStatsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<UserNotificationStatsQuery, UserNotificationStatsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<UserNotificationStatsQuery, UserNotificationStatsQueryVariables>(UserNotificationStatsDocument, options);
        }
export type UserNotificationStatsQueryHookResult = ReturnType<typeof useUserNotificationStatsQuery>;
export type UserNotificationStatsLazyQueryHookResult = ReturnType<typeof useUserNotificationStatsLazyQuery>;
export type UserNotificationStatsSuspenseQueryHookResult = ReturnType<typeof useUserNotificationStatsSuspenseQuery>;
export type UserNotificationStatsQueryResult = Apollo.QueryResult<UserNotificationStatsQuery, UserNotificationStatsQueryVariables>;
export const UserNotificationStatsByUserIdDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UserNotificationStatsByUserId"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userNotificationStats"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserNotificationStatsFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserNotificationStatsFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserNotificationStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"today"}},{"kind":"Field","name":{"kind":"Name","value":"todayAcked"}},{"kind":"Field","name":{"kind":"Name","value":"thisWeek"}},{"kind":"Field","name":{"kind":"Name","value":"thisWeekAcked"}},{"kind":"Field","name":{"kind":"Name","value":"last7Days"}},{"kind":"Field","name":{"kind":"Name","value":"last7DaysAcked"}},{"kind":"Field","name":{"kind":"Name","value":"thisMonth"}},{"kind":"Field","name":{"kind":"Name","value":"thisMonthAcked"}},{"kind":"Field","name":{"kind":"Name","value":"last30Days"}},{"kind":"Field","name":{"kind":"Name","value":"last30DaysAcked"}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"totalAcked"}}]}}]} as unknown as DocumentNode;

/**
 * __useUserNotificationStatsByUserIdQuery__
 *
 * To run a query within a React component, call `useUserNotificationStatsByUserIdQuery` and pass it any options that fit your needs.
 * When your component renders, `useUserNotificationStatsByUserIdQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUserNotificationStatsByUserIdQuery({
 *   variables: {
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useUserNotificationStatsByUserIdQuery(baseOptions: ApolloReactHooks.QueryHookOptions<UserNotificationStatsByUserIdQuery, UserNotificationStatsByUserIdQueryVariables> & ({ variables: UserNotificationStatsByUserIdQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<UserNotificationStatsByUserIdQuery, UserNotificationStatsByUserIdQueryVariables>(UserNotificationStatsByUserIdDocument, options);
      }
export function useUserNotificationStatsByUserIdLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<UserNotificationStatsByUserIdQuery, UserNotificationStatsByUserIdQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<UserNotificationStatsByUserIdQuery, UserNotificationStatsByUserIdQueryVariables>(UserNotificationStatsByUserIdDocument, options);
        }
export function useUserNotificationStatsByUserIdSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<UserNotificationStatsByUserIdQuery, UserNotificationStatsByUserIdQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<UserNotificationStatsByUserIdQuery, UserNotificationStatsByUserIdQueryVariables>(UserNotificationStatsByUserIdDocument, options);
        }
export type UserNotificationStatsByUserIdQueryHookResult = ReturnType<typeof useUserNotificationStatsByUserIdQuery>;
export type UserNotificationStatsByUserIdLazyQueryHookResult = ReturnType<typeof useUserNotificationStatsByUserIdLazyQuery>;
export type UserNotificationStatsByUserIdSuspenseQueryHookResult = ReturnType<typeof useUserNotificationStatsByUserIdSuspenseQuery>;
export type UserNotificationStatsByUserIdQueryResult = Apollo.QueryResult<UserNotificationStatsByUserIdQuery, UserNotificationStatsByUserIdQueryVariables>;
export const ExecuteWebhookDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ExecuteWebhook"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"executeWebhook"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode;
export type ExecuteWebhookMutationFn = Apollo.MutationFunction<ExecuteWebhookMutation, ExecuteWebhookMutationVariables>;

/**
 * __useExecuteWebhookMutation__
 *
 * To run a mutation, you first call `useExecuteWebhookMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useExecuteWebhookMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [executeWebhookMutation, { data, loading, error }] = useExecuteWebhookMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useExecuteWebhookMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ExecuteWebhookMutation, ExecuteWebhookMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ExecuteWebhookMutation, ExecuteWebhookMutationVariables>(ExecuteWebhookDocument, options);
      }
export type ExecuteWebhookMutationHookResult = ReturnType<typeof useExecuteWebhookMutation>;
export type ExecuteWebhookMutationResult = Apollo.MutationResult<ExecuteWebhookMutation>;
export type ExecuteWebhookMutationOptions = Apollo.BaseMutationOptions<ExecuteWebhookMutation, ExecuteWebhookMutationVariables>;
export const SetBucketSnoozeMinutesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetBucketSnoozeMinutes"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SetBucketSnoozeMinutesInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setBucketSnoozeMinutes"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"bucketId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"bucketId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"snoozeUntil"}},{"kind":"Field","name":{"kind":"Name","value":"bucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode;
export type SetBucketSnoozeMinutesMutationFn = Apollo.MutationFunction<SetBucketSnoozeMinutesMutation, SetBucketSnoozeMinutesMutationVariables>;

/**
 * __useSetBucketSnoozeMinutesMutation__
 *
 * To run a mutation, you first call `useSetBucketSnoozeMinutesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetBucketSnoozeMinutesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setBucketSnoozeMinutesMutation, { data, loading, error }] = useSetBucketSnoozeMinutesMutation({
 *   variables: {
 *      bucketId: // value for 'bucketId'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSetBucketSnoozeMinutesMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<SetBucketSnoozeMinutesMutation, SetBucketSnoozeMinutesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<SetBucketSnoozeMinutesMutation, SetBucketSnoozeMinutesMutationVariables>(SetBucketSnoozeMinutesDocument, options);
      }
export type SetBucketSnoozeMinutesMutationHookResult = ReturnType<typeof useSetBucketSnoozeMinutesMutation>;
export type SetBucketSnoozeMinutesMutationResult = Apollo.MutationResult<SetBucketSnoozeMinutesMutation>;
export type SetBucketSnoozeMinutesMutationOptions = Apollo.BaseMutationOptions<SetBucketSnoozeMinutesMutation, SetBucketSnoozeMinutesMutationVariables>;
export const GetPayloadMappersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPayloadMappers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"payloadMappers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PayloadMapperFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PayloadMapperFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PayloadMapper"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"jsEvalFn"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"builtInName"}},{"kind":"Field","name":{"kind":"Name","value":"requiredUserSettings"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetPayloadMappersQuery__
 *
 * To run a query within a React component, call `useGetPayloadMappersQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetPayloadMappersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetPayloadMappersQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetPayloadMappersQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetPayloadMappersQuery, GetPayloadMappersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetPayloadMappersQuery, GetPayloadMappersQueryVariables>(GetPayloadMappersDocument, options);
      }
export function useGetPayloadMappersLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetPayloadMappersQuery, GetPayloadMappersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetPayloadMappersQuery, GetPayloadMappersQueryVariables>(GetPayloadMappersDocument, options);
        }
export function useGetPayloadMappersSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetPayloadMappersQuery, GetPayloadMappersQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetPayloadMappersQuery, GetPayloadMappersQueryVariables>(GetPayloadMappersDocument, options);
        }
export type GetPayloadMappersQueryHookResult = ReturnType<typeof useGetPayloadMappersQuery>;
export type GetPayloadMappersLazyQueryHookResult = ReturnType<typeof useGetPayloadMappersLazyQuery>;
export type GetPayloadMappersSuspenseQueryHookResult = ReturnType<typeof useGetPayloadMappersSuspenseQuery>;
export type GetPayloadMappersQueryResult = Apollo.QueryResult<GetPayloadMappersQuery, GetPayloadMappersQueryVariables>;
export const GetPayloadMapperDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPayloadMapper"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"payloadMapper"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PayloadMapperFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PayloadMapperFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PayloadMapper"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"jsEvalFn"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"builtInName"}},{"kind":"Field","name":{"kind":"Name","value":"requiredUserSettings"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetPayloadMapperQuery__
 *
 * To run a query within a React component, call `useGetPayloadMapperQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetPayloadMapperQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetPayloadMapperQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetPayloadMapperQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetPayloadMapperQuery, GetPayloadMapperQueryVariables> & ({ variables: GetPayloadMapperQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetPayloadMapperQuery, GetPayloadMapperQueryVariables>(GetPayloadMapperDocument, options);
      }
export function useGetPayloadMapperLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetPayloadMapperQuery, GetPayloadMapperQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetPayloadMapperQuery, GetPayloadMapperQueryVariables>(GetPayloadMapperDocument, options);
        }
export function useGetPayloadMapperSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetPayloadMapperQuery, GetPayloadMapperQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetPayloadMapperQuery, GetPayloadMapperQueryVariables>(GetPayloadMapperDocument, options);
        }
export type GetPayloadMapperQueryHookResult = ReturnType<typeof useGetPayloadMapperQuery>;
export type GetPayloadMapperLazyQueryHookResult = ReturnType<typeof useGetPayloadMapperLazyQuery>;
export type GetPayloadMapperSuspenseQueryHookResult = ReturnType<typeof useGetPayloadMapperSuspenseQuery>;
export type GetPayloadMapperQueryResult = Apollo.QueryResult<GetPayloadMapperQuery, GetPayloadMapperQueryVariables>;
export const CreatePayloadMapperDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreatePayloadMapper"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreatePayloadMapperDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createPayloadMapper"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PayloadMapperFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PayloadMapperFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PayloadMapper"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"jsEvalFn"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"builtInName"}},{"kind":"Field","name":{"kind":"Name","value":"requiredUserSettings"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export type CreatePayloadMapperMutationFn = Apollo.MutationFunction<CreatePayloadMapperMutation, CreatePayloadMapperMutationVariables>;

/**
 * __useCreatePayloadMapperMutation__
 *
 * To run a mutation, you first call `useCreatePayloadMapperMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreatePayloadMapperMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createPayloadMapperMutation, { data, loading, error }] = useCreatePayloadMapperMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreatePayloadMapperMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreatePayloadMapperMutation, CreatePayloadMapperMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreatePayloadMapperMutation, CreatePayloadMapperMutationVariables>(CreatePayloadMapperDocument, options);
      }
export type CreatePayloadMapperMutationHookResult = ReturnType<typeof useCreatePayloadMapperMutation>;
export type CreatePayloadMapperMutationResult = Apollo.MutationResult<CreatePayloadMapperMutation>;
export type CreatePayloadMapperMutationOptions = Apollo.BaseMutationOptions<CreatePayloadMapperMutation, CreatePayloadMapperMutationVariables>;
export const UpdatePayloadMapperDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdatePayloadMapper"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdatePayloadMapperDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatePayloadMapper"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PayloadMapperFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PayloadMapperFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PayloadMapper"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"jsEvalFn"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"builtInName"}},{"kind":"Field","name":{"kind":"Name","value":"requiredUserSettings"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export type UpdatePayloadMapperMutationFn = Apollo.MutationFunction<UpdatePayloadMapperMutation, UpdatePayloadMapperMutationVariables>;

/**
 * __useUpdatePayloadMapperMutation__
 *
 * To run a mutation, you first call `useUpdatePayloadMapperMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdatePayloadMapperMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updatePayloadMapperMutation, { data, loading, error }] = useUpdatePayloadMapperMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdatePayloadMapperMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdatePayloadMapperMutation, UpdatePayloadMapperMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdatePayloadMapperMutation, UpdatePayloadMapperMutationVariables>(UpdatePayloadMapperDocument, options);
      }
export type UpdatePayloadMapperMutationHookResult = ReturnType<typeof useUpdatePayloadMapperMutation>;
export type UpdatePayloadMapperMutationResult = Apollo.MutationResult<UpdatePayloadMapperMutation>;
export type UpdatePayloadMapperMutationOptions = Apollo.BaseMutationOptions<UpdatePayloadMapperMutation, UpdatePayloadMapperMutationVariables>;
export const DeletePayloadMapperDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeletePayloadMapper"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deletePayloadMapper"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode;
export type DeletePayloadMapperMutationFn = Apollo.MutationFunction<DeletePayloadMapperMutation, DeletePayloadMapperMutationVariables>;

/**
 * __useDeletePayloadMapperMutation__
 *
 * To run a mutation, you first call `useDeletePayloadMapperMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeletePayloadMapperMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deletePayloadMapperMutation, { data, loading, error }] = useDeletePayloadMapperMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeletePayloadMapperMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeletePayloadMapperMutation, DeletePayloadMapperMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeletePayloadMapperMutation, DeletePayloadMapperMutationVariables>(DeletePayloadMapperDocument, options);
      }
export type DeletePayloadMapperMutationHookResult = ReturnType<typeof useDeletePayloadMapperMutation>;
export type DeletePayloadMapperMutationResult = Apollo.MutationResult<DeletePayloadMapperMutation>;
export type DeletePayloadMapperMutationOptions = Apollo.BaseMutationOptions<DeletePayloadMapperMutation, DeletePayloadMapperMutationVariables>;
export const GetEntityExecutionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetEntityExecutions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"GetEntityExecutionsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getEntityExecutions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EntityExecutionFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityExecutionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityExecution"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"entityName"}},{"kind":"Field","name":{"kind":"Name","value":"entityId"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"input"}},{"kind":"Field","name":{"kind":"Name","value":"output"}},{"kind":"Field","name":{"kind":"Name","value":"errors"}},{"kind":"Field","name":{"kind":"Name","value":"durationMs"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetEntityExecutionsQuery__
 *
 * To run a query within a React component, call `useGetEntityExecutionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetEntityExecutionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetEntityExecutionsQuery({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useGetEntityExecutionsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetEntityExecutionsQuery, GetEntityExecutionsQueryVariables> & ({ variables: GetEntityExecutionsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetEntityExecutionsQuery, GetEntityExecutionsQueryVariables>(GetEntityExecutionsDocument, options);
      }
export function useGetEntityExecutionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetEntityExecutionsQuery, GetEntityExecutionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetEntityExecutionsQuery, GetEntityExecutionsQueryVariables>(GetEntityExecutionsDocument, options);
        }
export function useGetEntityExecutionsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetEntityExecutionsQuery, GetEntityExecutionsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetEntityExecutionsQuery, GetEntityExecutionsQueryVariables>(GetEntityExecutionsDocument, options);
        }
export type GetEntityExecutionsQueryHookResult = ReturnType<typeof useGetEntityExecutionsQuery>;
export type GetEntityExecutionsLazyQueryHookResult = ReturnType<typeof useGetEntityExecutionsLazyQuery>;
export type GetEntityExecutionsSuspenseQueryHookResult = ReturnType<typeof useGetEntityExecutionsSuspenseQuery>;
export type GetEntityExecutionsQueryResult = Apollo.QueryResult<GetEntityExecutionsQuery, GetEntityExecutionsQueryVariables>;
export const GetEntityExecutionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetEntityExecution"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"entityExecution"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EntityExecutionFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EntityExecutionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EntityExecution"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"entityName"}},{"kind":"Field","name":{"kind":"Name","value":"entityId"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"input"}},{"kind":"Field","name":{"kind":"Name","value":"output"}},{"kind":"Field","name":{"kind":"Name","value":"errors"}},{"kind":"Field","name":{"kind":"Name","value":"durationMs"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetEntityExecutionQuery__
 *
 * To run a query within a React component, call `useGetEntityExecutionQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetEntityExecutionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetEntityExecutionQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetEntityExecutionQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetEntityExecutionQuery, GetEntityExecutionQueryVariables> & ({ variables: GetEntityExecutionQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetEntityExecutionQuery, GetEntityExecutionQueryVariables>(GetEntityExecutionDocument, options);
      }
export function useGetEntityExecutionLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetEntityExecutionQuery, GetEntityExecutionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetEntityExecutionQuery, GetEntityExecutionQueryVariables>(GetEntityExecutionDocument, options);
        }
export function useGetEntityExecutionSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetEntityExecutionQuery, GetEntityExecutionQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetEntityExecutionQuery, GetEntityExecutionQueryVariables>(GetEntityExecutionDocument, options);
        }
export type GetEntityExecutionQueryHookResult = ReturnType<typeof useGetEntityExecutionQuery>;
export type GetEntityExecutionLazyQueryHookResult = ReturnType<typeof useGetEntityExecutionLazyQuery>;
export type GetEntityExecutionSuspenseQueryHookResult = ReturnType<typeof useGetEntityExecutionSuspenseQuery>;
export type GetEntityExecutionQueryResult = Apollo.QueryResult<GetEntityExecutionQuery, GetEntityExecutionQueryVariables>;
export const GetServerSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetServerSettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"serverSettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ServerSettingFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ServerSettingFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ServerSetting"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"configType"}},{"kind":"Field","name":{"kind":"Name","value":"valueText"}},{"kind":"Field","name":{"kind":"Name","value":"valueBool"}},{"kind":"Field","name":{"kind":"Name","value":"valueNumber"}},{"kind":"Field","name":{"kind":"Name","value":"possibleValues"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetServerSettingsQuery__
 *
 * To run a query within a React component, call `useGetServerSettingsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetServerSettingsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetServerSettingsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetServerSettingsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetServerSettingsQuery, GetServerSettingsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetServerSettingsQuery, GetServerSettingsQueryVariables>(GetServerSettingsDocument, options);
      }
export function useGetServerSettingsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetServerSettingsQuery, GetServerSettingsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetServerSettingsQuery, GetServerSettingsQueryVariables>(GetServerSettingsDocument, options);
        }
export function useGetServerSettingsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetServerSettingsQuery, GetServerSettingsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetServerSettingsQuery, GetServerSettingsQueryVariables>(GetServerSettingsDocument, options);
        }
export type GetServerSettingsQueryHookResult = ReturnType<typeof useGetServerSettingsQuery>;
export type GetServerSettingsLazyQueryHookResult = ReturnType<typeof useGetServerSettingsLazyQuery>;
export type GetServerSettingsSuspenseQueryHookResult = ReturnType<typeof useGetServerSettingsSuspenseQuery>;
export type GetServerSettingsQueryResult = Apollo.QueryResult<GetServerSettingsQuery, GetServerSettingsQueryVariables>;
export const GetServerSettingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetServerSetting"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"configType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ServerSettingType"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"serverSetting"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"configType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"configType"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ServerSettingFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ServerSettingFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ServerSetting"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"configType"}},{"kind":"Field","name":{"kind":"Name","value":"valueText"}},{"kind":"Field","name":{"kind":"Name","value":"valueBool"}},{"kind":"Field","name":{"kind":"Name","value":"valueNumber"}},{"kind":"Field","name":{"kind":"Name","value":"possibleValues"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetServerSettingQuery__
 *
 * To run a query within a React component, call `useGetServerSettingQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetServerSettingQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetServerSettingQuery({
 *   variables: {
 *      configType: // value for 'configType'
 *   },
 * });
 */
export function useGetServerSettingQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetServerSettingQuery, GetServerSettingQueryVariables> & ({ variables: GetServerSettingQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetServerSettingQuery, GetServerSettingQueryVariables>(GetServerSettingDocument, options);
      }
export function useGetServerSettingLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetServerSettingQuery, GetServerSettingQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetServerSettingQuery, GetServerSettingQueryVariables>(GetServerSettingDocument, options);
        }
export function useGetServerSettingSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetServerSettingQuery, GetServerSettingQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetServerSettingQuery, GetServerSettingQueryVariables>(GetServerSettingDocument, options);
        }
export type GetServerSettingQueryHookResult = ReturnType<typeof useGetServerSettingQuery>;
export type GetServerSettingLazyQueryHookResult = ReturnType<typeof useGetServerSettingLazyQuery>;
export type GetServerSettingSuspenseQueryHookResult = ReturnType<typeof useGetServerSettingSuspenseQuery>;
export type GetServerSettingQueryResult = Apollo.QueryResult<GetServerSettingQuery, GetServerSettingQueryVariables>;
export const UpdateServerSettingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateServerSetting"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"configType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ServerSettingType"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateServerSettingDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateServerSetting"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"configType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"configType"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ServerSettingFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ServerSettingFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ServerSetting"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"configType"}},{"kind":"Field","name":{"kind":"Name","value":"valueText"}},{"kind":"Field","name":{"kind":"Name","value":"valueBool"}},{"kind":"Field","name":{"kind":"Name","value":"valueNumber"}},{"kind":"Field","name":{"kind":"Name","value":"possibleValues"}}]}}]} as unknown as DocumentNode;
export type UpdateServerSettingMutationFn = Apollo.MutationFunction<UpdateServerSettingMutation, UpdateServerSettingMutationVariables>;

/**
 * __useUpdateServerSettingMutation__
 *
 * To run a mutation, you first call `useUpdateServerSettingMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateServerSettingMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateServerSettingMutation, { data, loading, error }] = useUpdateServerSettingMutation({
 *   variables: {
 *      configType: // value for 'configType'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateServerSettingMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateServerSettingMutation, UpdateServerSettingMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateServerSettingMutation, UpdateServerSettingMutationVariables>(UpdateServerSettingDocument, options);
      }
export type UpdateServerSettingMutationHookResult = ReturnType<typeof useUpdateServerSettingMutation>;
export type UpdateServerSettingMutationResult = Apollo.MutationResult<UpdateServerSettingMutation>;
export type UpdateServerSettingMutationOptions = Apollo.BaseMutationOptions<UpdateServerSettingMutation, UpdateServerSettingMutationVariables>;
export const BatchUpdateServerSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"BatchUpdateServerSettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"settings"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"BatchUpdateSettingInput"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"batchUpdateServerSettings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"settings"},"value":{"kind":"Variable","name":{"kind":"Name","value":"settings"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ServerSettingFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ServerSettingFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ServerSetting"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"configType"}},{"kind":"Field","name":{"kind":"Name","value":"valueText"}},{"kind":"Field","name":{"kind":"Name","value":"valueBool"}},{"kind":"Field","name":{"kind":"Name","value":"valueNumber"}},{"kind":"Field","name":{"kind":"Name","value":"possibleValues"}}]}}]} as unknown as DocumentNode;
export type BatchUpdateServerSettingsMutationFn = Apollo.MutationFunction<BatchUpdateServerSettingsMutation, BatchUpdateServerSettingsMutationVariables>;

/**
 * __useBatchUpdateServerSettingsMutation__
 *
 * To run a mutation, you first call `useBatchUpdateServerSettingsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useBatchUpdateServerSettingsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [batchUpdateServerSettingsMutation, { data, loading, error }] = useBatchUpdateServerSettingsMutation({
 *   variables: {
 *      settings: // value for 'settings'
 *   },
 * });
 */
export function useBatchUpdateServerSettingsMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<BatchUpdateServerSettingsMutation, BatchUpdateServerSettingsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<BatchUpdateServerSettingsMutation, BatchUpdateServerSettingsMutationVariables>(BatchUpdateServerSettingsDocument, options);
      }
export type BatchUpdateServerSettingsMutationHookResult = ReturnType<typeof useBatchUpdateServerSettingsMutation>;
export type BatchUpdateServerSettingsMutationResult = Apollo.MutationResult<BatchUpdateServerSettingsMutation>;
export type BatchUpdateServerSettingsMutationOptions = Apollo.BaseMutationOptions<BatchUpdateServerSettingsMutation, BatchUpdateServerSettingsMutationVariables>;
export const RestartServerDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RestartServer"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"restartServer"}}]}}]} as unknown as DocumentNode;
export type RestartServerMutationFn = Apollo.MutationFunction<RestartServerMutation, RestartServerMutationVariables>;

/**
 * __useRestartServerMutation__
 *
 * To run a mutation, you first call `useRestartServerMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRestartServerMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [restartServerMutation, { data, loading, error }] = useRestartServerMutation({
 *   variables: {
 *   },
 * });
 */
export function useRestartServerMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RestartServerMutation, RestartServerMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RestartServerMutation, RestartServerMutationVariables>(RestartServerDocument, options);
      }
export type RestartServerMutationHookResult = ReturnType<typeof useRestartServerMutation>;
export type RestartServerMutationResult = Apollo.MutationResult<RestartServerMutation>;
export type RestartServerMutationOptions = Apollo.BaseMutationOptions<RestartServerMutation, RestartServerMutationVariables>;
export const ListBackupsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListBackups"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listBackups"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"sizeBytes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode;

/**
 * __useListBackupsQuery__
 *
 * To run a query within a React component, call `useListBackupsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListBackupsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListBackupsQuery({
 *   variables: {
 *   },
 * });
 */
export function useListBackupsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListBackupsQuery, ListBackupsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListBackupsQuery, ListBackupsQueryVariables>(ListBackupsDocument, options);
      }
export function useListBackupsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListBackupsQuery, ListBackupsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListBackupsQuery, ListBackupsQueryVariables>(ListBackupsDocument, options);
        }
export function useListBackupsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<ListBackupsQuery, ListBackupsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<ListBackupsQuery, ListBackupsQueryVariables>(ListBackupsDocument, options);
        }
export type ListBackupsQueryHookResult = ReturnType<typeof useListBackupsQuery>;
export type ListBackupsLazyQueryHookResult = ReturnType<typeof useListBackupsLazyQuery>;
export type ListBackupsSuspenseQueryHookResult = ReturnType<typeof useListBackupsSuspenseQuery>;
export type ListBackupsQueryResult = Apollo.QueryResult<ListBackupsQuery, ListBackupsQueryVariables>;
export const DeleteBackupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteBackup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filename"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteBackup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filename"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filename"}}}]}]}}]} as unknown as DocumentNode;
export type DeleteBackupMutationFn = Apollo.MutationFunction<DeleteBackupMutation, DeleteBackupMutationVariables>;

/**
 * __useDeleteBackupMutation__
 *
 * To run a mutation, you first call `useDeleteBackupMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteBackupMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteBackupMutation, { data, loading, error }] = useDeleteBackupMutation({
 *   variables: {
 *      filename: // value for 'filename'
 *   },
 * });
 */
export function useDeleteBackupMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteBackupMutation, DeleteBackupMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteBackupMutation, DeleteBackupMutationVariables>(DeleteBackupDocument, options);
      }
export type DeleteBackupMutationHookResult = ReturnType<typeof useDeleteBackupMutation>;
export type DeleteBackupMutationResult = Apollo.MutationResult<DeleteBackupMutation>;
export type DeleteBackupMutationOptions = Apollo.BaseMutationOptions<DeleteBackupMutation, DeleteBackupMutationVariables>;
export const DeleteAttachmentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteAttachment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteAttachment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode;
export type DeleteAttachmentMutationFn = Apollo.MutationFunction<DeleteAttachmentMutation, DeleteAttachmentMutationVariables>;

/**
 * __useDeleteAttachmentMutation__
 *
 * To run a mutation, you first call `useDeleteAttachmentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteAttachmentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteAttachmentMutation, { data, loading, error }] = useDeleteAttachmentMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteAttachmentMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteAttachmentMutation, DeleteAttachmentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteAttachmentMutation, DeleteAttachmentMutationVariables>(DeleteAttachmentDocument, options);
      }
export type DeleteAttachmentMutationHookResult = ReturnType<typeof useDeleteAttachmentMutation>;
export type DeleteAttachmentMutationResult = Apollo.MutationResult<DeleteAttachmentMutation>;
export type DeleteAttachmentMutationOptions = Apollo.BaseMutationOptions<DeleteAttachmentMutation, DeleteAttachmentMutationVariables>;
export const TriggerBackupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"TriggerBackup"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"triggerBackup"}}]}}]} as unknown as DocumentNode;
export type TriggerBackupMutationFn = Apollo.MutationFunction<TriggerBackupMutation, TriggerBackupMutationVariables>;

/**
 * __useTriggerBackupMutation__
 *
 * To run a mutation, you first call `useTriggerBackupMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useTriggerBackupMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [triggerBackupMutation, { data, loading, error }] = useTriggerBackupMutation({
 *   variables: {
 *   },
 * });
 */
export function useTriggerBackupMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<TriggerBackupMutation, TriggerBackupMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<TriggerBackupMutation, TriggerBackupMutationVariables>(TriggerBackupDocument, options);
      }
export type TriggerBackupMutationHookResult = ReturnType<typeof useTriggerBackupMutation>;
export type TriggerBackupMutationResult = Apollo.MutationResult<TriggerBackupMutation>;
export type TriggerBackupMutationOptions = Apollo.BaseMutationOptions<TriggerBackupMutation, TriggerBackupMutationVariables>;
export const GetServerLogsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetServerLogs"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"GetLogsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"trace"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"page"}},{"kind":"Field","name":{"kind":"Name","value":"limit"}},{"kind":"Field","name":{"kind":"Name","value":"totalPages"}}]}}]}}]} as unknown as DocumentNode;

/**
 * __useGetServerLogsQuery__
 *
 * To run a query within a React component, call `useGetServerLogsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetServerLogsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetServerLogsQuery({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useGetServerLogsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetServerLogsQuery, GetServerLogsQueryVariables> & ({ variables: GetServerLogsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetServerLogsQuery, GetServerLogsQueryVariables>(GetServerLogsDocument, options);
      }
export function useGetServerLogsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetServerLogsQuery, GetServerLogsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetServerLogsQuery, GetServerLogsQueryVariables>(GetServerLogsDocument, options);
        }
export function useGetServerLogsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetServerLogsQuery, GetServerLogsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetServerLogsQuery, GetServerLogsQueryVariables>(GetServerLogsDocument, options);
        }
export type GetServerLogsQueryHookResult = ReturnType<typeof useGetServerLogsQuery>;
export type GetServerLogsLazyQueryHookResult = ReturnType<typeof useGetServerLogsLazyQuery>;
export type GetServerLogsSuspenseQueryHookResult = ReturnType<typeof useGetServerLogsSuspenseQuery>;
export type GetServerLogsQueryResult = Apollo.QueryResult<GetServerLogsQuery, GetServerLogsQueryVariables>;
export const GetTotalLogCountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTotalLogCount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalLogCount"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetTotalLogCountQuery__
 *
 * To run a query within a React component, call `useGetTotalLogCountQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTotalLogCountQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetTotalLogCountQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetTotalLogCountQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetTotalLogCountQuery, GetTotalLogCountQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetTotalLogCountQuery, GetTotalLogCountQueryVariables>(GetTotalLogCountDocument, options);
      }
export function useGetTotalLogCountLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetTotalLogCountQuery, GetTotalLogCountQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetTotalLogCountQuery, GetTotalLogCountQueryVariables>(GetTotalLogCountDocument, options);
        }
export function useGetTotalLogCountSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetTotalLogCountQuery, GetTotalLogCountQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetTotalLogCountQuery, GetTotalLogCountQueryVariables>(GetTotalLogCountDocument, options);
        }
export type GetTotalLogCountQueryHookResult = ReturnType<typeof useGetTotalLogCountQuery>;
export type GetTotalLogCountLazyQueryHookResult = ReturnType<typeof useGetTotalLogCountLazyQuery>;
export type GetTotalLogCountSuspenseQueryHookResult = ReturnType<typeof useGetTotalLogCountSuspenseQuery>;
export type GetTotalLogCountQueryResult = Apollo.QueryResult<GetTotalLogCountQuery, GetTotalLogCountQueryVariables>;
export const TriggerLogCleanupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"TriggerLogCleanup"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"triggerLogCleanup"}}]}}]} as unknown as DocumentNode;
export type TriggerLogCleanupMutationFn = Apollo.MutationFunction<TriggerLogCleanupMutation, TriggerLogCleanupMutationVariables>;

/**
 * __useTriggerLogCleanupMutation__
 *
 * To run a mutation, you first call `useTriggerLogCleanupMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useTriggerLogCleanupMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [triggerLogCleanupMutation, { data, loading, error }] = useTriggerLogCleanupMutation({
 *   variables: {
 *   },
 * });
 */
export function useTriggerLogCleanupMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<TriggerLogCleanupMutation, TriggerLogCleanupMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<TriggerLogCleanupMutation, TriggerLogCleanupMutationVariables>(TriggerLogCleanupDocument, options);
      }
export type TriggerLogCleanupMutationHookResult = ReturnType<typeof useTriggerLogCleanupMutation>;
export type TriggerLogCleanupMutationResult = Apollo.MutationResult<TriggerLogCleanupMutation>;
export type TriggerLogCleanupMutationOptions = Apollo.BaseMutationOptions<TriggerLogCleanupMutation, TriggerLogCleanupMutationVariables>;
export const GetUserLogsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserLogs"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"GetUserLogsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userLogs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"payload"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"page"}},{"kind":"Field","name":{"kind":"Name","value":"limit"}},{"kind":"Field","name":{"kind":"Name","value":"totalPages"}}]}}]}}]} as unknown as DocumentNode;

/**
 * __useGetUserLogsQuery__
 *
 * To run a query within a React component, call `useGetUserLogsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUserLogsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUserLogsQuery({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useGetUserLogsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetUserLogsQuery, GetUserLogsQueryVariables> & ({ variables: GetUserLogsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetUserLogsQuery, GetUserLogsQueryVariables>(GetUserLogsDocument, options);
      }
export function useGetUserLogsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetUserLogsQuery, GetUserLogsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetUserLogsQuery, GetUserLogsQueryVariables>(GetUserLogsDocument, options);
        }
export function useGetUserLogsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetUserLogsQuery, GetUserLogsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetUserLogsQuery, GetUserLogsQueryVariables>(GetUserLogsDocument, options);
        }
export type GetUserLogsQueryHookResult = ReturnType<typeof useGetUserLogsQuery>;
export type GetUserLogsLazyQueryHookResult = ReturnType<typeof useGetUserLogsLazyQuery>;
export type GetUserLogsSuspenseQueryHookResult = ReturnType<typeof useGetUserLogsSuspenseQuery>;
export type GetUserLogsQueryResult = Apollo.QueryResult<GetUserLogsQuery, GetUserLogsQueryVariables>;
export const ServerFilesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ServerFiles"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"path"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"serverFiles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"path"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ServerFileFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ServerFileFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"FileInfoDto"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"mtime"}},{"kind":"Field","name":{"kind":"Name","value":"isDir"}}]}}]} as unknown as DocumentNode;

/**
 * __useServerFilesQuery__
 *
 * To run a query within a React component, call `useServerFilesQuery` and pass it any options that fit your needs.
 * When your component renders, `useServerFilesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useServerFilesQuery({
 *   variables: {
 *      path: // value for 'path'
 *   },
 * });
 */
export function useServerFilesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ServerFilesQuery, ServerFilesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ServerFilesQuery, ServerFilesQueryVariables>(ServerFilesDocument, options);
      }
export function useServerFilesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ServerFilesQuery, ServerFilesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ServerFilesQuery, ServerFilesQueryVariables>(ServerFilesDocument, options);
        }
export function useServerFilesSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<ServerFilesQuery, ServerFilesQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<ServerFilesQuery, ServerFilesQueryVariables>(ServerFilesDocument, options);
        }
export type ServerFilesQueryHookResult = ReturnType<typeof useServerFilesQuery>;
export type ServerFilesLazyQueryHookResult = ReturnType<typeof useServerFilesLazyQuery>;
export type ServerFilesSuspenseQueryHookResult = ReturnType<typeof useServerFilesSuspenseQuery>;
export type ServerFilesQueryResult = Apollo.QueryResult<ServerFilesQuery, ServerFilesQueryVariables>;
export const DeleteServerFileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteServerFile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"path"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteServerFile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"path"}}}]}]}}]} as unknown as DocumentNode;
export type DeleteServerFileMutationFn = Apollo.MutationFunction<DeleteServerFileMutation, DeleteServerFileMutationVariables>;

/**
 * __useDeleteServerFileMutation__
 *
 * To run a mutation, you first call `useDeleteServerFileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteServerFileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteServerFileMutation, { data, loading, error }] = useDeleteServerFileMutation({
 *   variables: {
 *      name: // value for 'name'
 *      path: // value for 'path'
 *   },
 * });
 */
export function useDeleteServerFileMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteServerFileMutation, DeleteServerFileMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteServerFileMutation, DeleteServerFileMutationVariables>(DeleteServerFileDocument, options);
      }
export type DeleteServerFileMutationHookResult = ReturnType<typeof useDeleteServerFileMutation>;
export type DeleteServerFileMutationResult = Apollo.MutationResult<DeleteServerFileMutation>;
export type DeleteServerFileMutationOptions = Apollo.BaseMutationOptions<DeleteServerFileMutation, DeleteServerFileMutationVariables>;
export const GetMyAdminSubscriptionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMyAdminSubscriptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myAdminSubscription"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetMyAdminSubscriptions__
 *
 * To run a query within a React component, call `useGetMyAdminSubscriptions` and pass it any options that fit your needs.
 * When your component renders, `useGetMyAdminSubscriptions` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyAdminSubscriptions({
 *   variables: {
 *   },
 * });
 */
export function useGetMyAdminSubscriptions(baseOptions?: ApolloReactHooks.QueryHookOptions<GetMyAdminSubscriptionsQuery, GetMyAdminSubscriptionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetMyAdminSubscriptionsQuery, GetMyAdminSubscriptionsQueryVariables>(GetMyAdminSubscriptionsDocument, options);
      }
export function useGetMyAdminSubscriptionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetMyAdminSubscriptionsQuery, GetMyAdminSubscriptionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetMyAdminSubscriptionsQuery, GetMyAdminSubscriptionsQueryVariables>(GetMyAdminSubscriptionsDocument, options);
        }
export function useGetMyAdminSubscriptionsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetMyAdminSubscriptionsQuery, GetMyAdminSubscriptionsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetMyAdminSubscriptionsQuery, GetMyAdminSubscriptionsQueryVariables>(GetMyAdminSubscriptionsDocument, options);
        }
export type GetMyAdminSubscriptionsHookResult = ReturnType<typeof useGetMyAdminSubscriptions>;
export type GetMyAdminSubscriptionsLazyQueryHookResult = ReturnType<typeof useGetMyAdminSubscriptionsLazyQuery>;
export type GetMyAdminSubscriptionsSuspenseQueryHookResult = ReturnType<typeof useGetMyAdminSubscriptionsSuspenseQuery>;
export type GetMyAdminSubscriptionsQueryResult = Apollo.QueryResult<GetMyAdminSubscriptionsQuery, GetMyAdminSubscriptionsQueryVariables>;
export const UpsertMyAdminSubscriptionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpsertMyAdminSubscriptions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"eventTypes"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"upsertMyAdminSubscription"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"eventTypes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"eventTypes"}}}]}]}}]} as unknown as DocumentNode;
export type UpsertMyAdminSubscriptionsMutationFn = Apollo.MutationFunction<UpsertMyAdminSubscriptionsMutation, UpsertMyAdminSubscriptionsMutationVariables>;

/**
 * __useUpsertMyAdminSubscriptions__
 *
 * To run a mutation, you first call `useUpsertMyAdminSubscriptions` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpsertMyAdminSubscriptions` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [upsertMyAdminSubscriptions, { data, loading, error }] = useUpsertMyAdminSubscriptions({
 *   variables: {
 *      eventTypes: // value for 'eventTypes'
 *   },
 * });
 */
export function useUpsertMyAdminSubscriptions(baseOptions?: ApolloReactHooks.MutationHookOptions<UpsertMyAdminSubscriptionsMutation, UpsertMyAdminSubscriptionsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpsertMyAdminSubscriptionsMutation, UpsertMyAdminSubscriptionsMutationVariables>(UpsertMyAdminSubscriptionsDocument, options);
      }
export type UpsertMyAdminSubscriptionsHookResult = ReturnType<typeof useUpsertMyAdminSubscriptions>;
export type UpsertMyAdminSubscriptionsMutationResult = Apollo.MutationResult<UpsertMyAdminSubscriptionsMutation>;
export type UpsertMyAdminSubscriptionsMutationOptions = Apollo.BaseMutationOptions<UpsertMyAdminSubscriptionsMutation, UpsertMyAdminSubscriptionsMutationVariables>;
export const UserAttachmentsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UserAttachments"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userAttachments"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AttachmentFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AttachmentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Attachment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"originalFilename"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"filepath"}},{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}}]}}]} as unknown as DocumentNode;

/**
 * __useUserAttachmentsQuery__
 *
 * To run a query within a React component, call `useUserAttachmentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useUserAttachmentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUserAttachmentsQuery({
 *   variables: {
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useUserAttachmentsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<UserAttachmentsQuery, UserAttachmentsQueryVariables> & ({ variables: UserAttachmentsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<UserAttachmentsQuery, UserAttachmentsQueryVariables>(UserAttachmentsDocument, options);
      }
export function useUserAttachmentsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<UserAttachmentsQuery, UserAttachmentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<UserAttachmentsQuery, UserAttachmentsQueryVariables>(UserAttachmentsDocument, options);
        }
export function useUserAttachmentsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<UserAttachmentsQuery, UserAttachmentsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<UserAttachmentsQuery, UserAttachmentsQueryVariables>(UserAttachmentsDocument, options);
        }
export type UserAttachmentsQueryHookResult = ReturnType<typeof useUserAttachmentsQuery>;
export type UserAttachmentsLazyQueryHookResult = ReturnType<typeof useUserAttachmentsLazyQuery>;
export type UserAttachmentsSuspenseQueryHookResult = ReturnType<typeof useUserAttachmentsSuspenseQuery>;
export type UserAttachmentsQueryResult = Apollo.QueryResult<UserAttachmentsQuery, UserAttachmentsQueryVariables>;
export const GetUserTemplatesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserTemplates"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userTemplates"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserTemplateFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserTemplateFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserTemplate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"input"}},{"kind":"Field","name":{"kind":"Name","value":"output"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetUserTemplatesQuery__
 *
 * To run a query within a React component, call `useGetUserTemplatesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUserTemplatesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUserTemplatesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetUserTemplatesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetUserTemplatesQuery, GetUserTemplatesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetUserTemplatesQuery, GetUserTemplatesQueryVariables>(GetUserTemplatesDocument, options);
      }
export function useGetUserTemplatesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetUserTemplatesQuery, GetUserTemplatesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetUserTemplatesQuery, GetUserTemplatesQueryVariables>(GetUserTemplatesDocument, options);
        }
export function useGetUserTemplatesSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetUserTemplatesQuery, GetUserTemplatesQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetUserTemplatesQuery, GetUserTemplatesQueryVariables>(GetUserTemplatesDocument, options);
        }
export type GetUserTemplatesQueryHookResult = ReturnType<typeof useGetUserTemplatesQuery>;
export type GetUserTemplatesLazyQueryHookResult = ReturnType<typeof useGetUserTemplatesLazyQuery>;
export type GetUserTemplatesSuspenseQueryHookResult = ReturnType<typeof useGetUserTemplatesSuspenseQuery>;
export type GetUserTemplatesQueryResult = Apollo.QueryResult<GetUserTemplatesQuery, GetUserTemplatesQueryVariables>;
export const GetUserTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserTemplateFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserTemplateFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserTemplate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"input"}},{"kind":"Field","name":{"kind":"Name","value":"output"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;

/**
 * __useGetUserTemplateQuery__
 *
 * To run a query within a React component, call `useGetUserTemplateQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUserTemplateQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUserTemplateQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetUserTemplateQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetUserTemplateQuery, GetUserTemplateQueryVariables> & ({ variables: GetUserTemplateQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetUserTemplateQuery, GetUserTemplateQueryVariables>(GetUserTemplateDocument, options);
      }
export function useGetUserTemplateLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetUserTemplateQuery, GetUserTemplateQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetUserTemplateQuery, GetUserTemplateQueryVariables>(GetUserTemplateDocument, options);
        }
export function useGetUserTemplateSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetUserTemplateQuery, GetUserTemplateQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetUserTemplateQuery, GetUserTemplateQueryVariables>(GetUserTemplateDocument, options);
        }
export type GetUserTemplateQueryHookResult = ReturnType<typeof useGetUserTemplateQuery>;
export type GetUserTemplateLazyQueryHookResult = ReturnType<typeof useGetUserTemplateLazyQuery>;
export type GetUserTemplateSuspenseQueryHookResult = ReturnType<typeof useGetUserTemplateSuspenseQuery>;
export type GetUserTemplateQueryResult = Apollo.QueryResult<GetUserTemplateQuery, GetUserTemplateQueryVariables>;
export const CreateUserTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateUserTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateUserTemplateDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createUserTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserTemplateFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserTemplateFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserTemplate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"input"}},{"kind":"Field","name":{"kind":"Name","value":"output"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export type CreateUserTemplateMutationFn = Apollo.MutationFunction<CreateUserTemplateMutation, CreateUserTemplateMutationVariables>;

/**
 * __useCreateUserTemplateMutation__
 *
 * To run a mutation, you first call `useCreateUserTemplateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateUserTemplateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createUserTemplateMutation, { data, loading, error }] = useCreateUserTemplateMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateUserTemplateMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateUserTemplateMutation, CreateUserTemplateMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateUserTemplateMutation, CreateUserTemplateMutationVariables>(CreateUserTemplateDocument, options);
      }
export type CreateUserTemplateMutationHookResult = ReturnType<typeof useCreateUserTemplateMutation>;
export type CreateUserTemplateMutationResult = Apollo.MutationResult<CreateUserTemplateMutation>;
export type CreateUserTemplateMutationOptions = Apollo.BaseMutationOptions<CreateUserTemplateMutation, CreateUserTemplateMutationVariables>;
export const UpdateUserTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUserTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateUserTemplateDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUserTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserTemplateFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"identities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"providerType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buckets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"devices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"deviceModel"}},{"kind":"Field","name":{"kind":"Name","value":"osVersion"}},{"kind":"Field","name":{"kind":"Name","value":"onlyLocal"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserTemplateFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserTemplate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"input"}},{"kind":"Field","name":{"kind":"Name","value":"output"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export type UpdateUserTemplateMutationFn = Apollo.MutationFunction<UpdateUserTemplateMutation, UpdateUserTemplateMutationVariables>;

/**
 * __useUpdateUserTemplateMutation__
 *
 * To run a mutation, you first call `useUpdateUserTemplateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateUserTemplateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateUserTemplateMutation, { data, loading, error }] = useUpdateUserTemplateMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateUserTemplateMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateUserTemplateMutation, UpdateUserTemplateMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateUserTemplateMutation, UpdateUserTemplateMutationVariables>(UpdateUserTemplateDocument, options);
      }
export type UpdateUserTemplateMutationHookResult = ReturnType<typeof useUpdateUserTemplateMutation>;
export type UpdateUserTemplateMutationResult = Apollo.MutationResult<UpdateUserTemplateMutation>;
export type UpdateUserTemplateMutationOptions = Apollo.BaseMutationOptions<UpdateUserTemplateMutation, UpdateUserTemplateMutationVariables>;
export const DeleteUserTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteUserTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteUserTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode;
export type DeleteUserTemplateMutationFn = Apollo.MutationFunction<DeleteUserTemplateMutation, DeleteUserTemplateMutationVariables>;

/**
 * __useDeleteUserTemplateMutation__
 *
 * To run a mutation, you first call `useDeleteUserTemplateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteUserTemplateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteUserTemplateMutation, { data, loading, error }] = useDeleteUserTemplateMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteUserTemplateMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteUserTemplateMutation, DeleteUserTemplateMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteUserTemplateMutation, DeleteUserTemplateMutationVariables>(DeleteUserTemplateDocument, options);
      }
export type DeleteUserTemplateMutationHookResult = ReturnType<typeof useDeleteUserTemplateMutation>;
export type DeleteUserTemplateMutationResult = Apollo.MutationResult<DeleteUserTemplateMutation>;
export type DeleteUserTemplateMutationOptions = Apollo.BaseMutationOptions<DeleteUserTemplateMutation, DeleteUserTemplateMutationVariables>;