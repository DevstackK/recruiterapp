import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  numeric,
  integer,
  boolean,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const jobStatusEnum = pgEnum("job_status", ["draft", "open", "closed"]);
export const candidateSourceEnum = pgEnum("candidate_source", [
  "upload_form",
  "email_reply",
  "manual",
]);
export const cvFileTypeEnum = pgEnum("cv_file_type", ["pdf", "docx"]);
export const cvStatusEnum = pgEnum("cv_status", ["pending", "parsed", "error"]);
export const matchStatusEnum = pgEnum("match_status", [
  "pending_review",
  "approved",
  "rejected",
]);
export const outreachStatusEnum = pgEnum("outreach_status", [
  "draft",
  "copied",
  "sent",
  "replied",
  "no_response",
  "declined",
]);
export const inboundEmailStatusEnum = pgEnum("inbound_email_status", [
  "new",
  "processed",
  "ignored",
  "error",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "new_high_match",
  "parse_error",
  "gmail_reconnect_needed",
  "linkedin_post_failed",
]);
export const apiUsagePurposeEnum = pgEnum("api_usage_purpose", [
  "jd_parse",
  "cv_parse",
  "match_score",
  "outreach_draft",
  "linkedin_post",
]);

export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  rawJdText: text("raw_jd_text"),
  rawJdFileUrl: text("raw_jd_file_url"),
  structuredRequirements: jsonb("structured_requirements").$type<{
    skills: string[];
    seniority: string;
    mustHaves: string[];
    niceToHaves: string[];
    summary: string;
  }>(),
  status: jobStatusEnum("status").default("draft").notNull(),
  publicUploadSlug: text("public_upload_slug").notNull().unique(),
  linkedinPostId: text("linkedin_post_id"),
  linkedinPostedAt: timestamp("linkedin_posted_at", { withTimezone: true }),
  linkedinPostImageUrl: text("linkedin_post_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const candidates = pgTable("candidates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  source: candidateSourceEnum("source").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const inboundEmails = pgTable("inbound_emails", {
  id: uuid("id").defaultRandom().primaryKey(),
  gmailMessageId: text("gmail_message_id").notNull().unique(),
  fromAddress: text("from_address"),
  subject: text("subject"),
  receivedAt: timestamp("received_at", { withTimezone: true }),
  hasAttachment: boolean("has_attachment").default(false).notNull(),
  attachmentCount: integer("attachment_count").default(0).notNull(),
  linkedJobId: uuid("linked_job_id").references(() => jobs.id),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  status: inboundEmailStatusEnum("status").default("new").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const cvs = pgTable("cvs", {
  id: uuid("id").defaultRandom().primaryKey(),
  candidateId: uuid("candidate_id")
    .references(() => candidates.id)
    .notNull(),
  jobId: uuid("job_id").references(() => jobs.id),
  fileUrl: text("file_url").notNull(),
  fileType: cvFileTypeEnum("file_type").notNull(),
  rawText: text("raw_text"),
  structuredProfile: jsonb("structured_profile").$type<{
    name: string;
    email: string | null;
    phone: string | null;
    yearsExperience: number | null;
    skills: string[];
    education: { institution: string; degree: string; field: string; year: string | null }[];
    workExperience: {
      company: string;
      title: string;
      start: string | null;
      end: string | null;
      description: string;
    }[];
    summary: string;
  }>(),
  sourceEmailId: uuid("source_email_id").references(() => inboundEmails.id),
  status: cvStatusEnum("status").default("pending").notNull(),
  parsedAt: timestamp("parsed_at", { withTimezone: true }),
  errorDetail: text("error_detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cvId: uuid("cv_id")
      .references(() => cvs.id)
      .notNull(),
    jobId: uuid("job_id")
      .references(() => jobs.id)
      .notNull(),
    score: numeric("score").notNull(),
    rationale: jsonb("rationale").$type<{
      summary: string;
      mustHaveGaps: string[];
      strengths: string[];
      concerns: string[];
    }>(),
    status: matchStatusEnum("status").default("pending_review").notNull(),
    modelUsed: text("model_used"),
    promptVersion: text("prompt_version"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("matches_cv_job_unique").on(table.cvId, table.jobId)],
);

export const outreachDrafts = pgTable("outreach_drafts", {
  id: uuid("id").defaultRandom().primaryKey(),
  candidateName: text("candidate_name").notNull(),
  candidateContext: jsonb("candidate_context").$type<{
    roleOrCompany: string | null;
    notes: string | null;
    linkedinUrl: string | null;
  }>(),
  jobId: uuid("job_id").references(() => jobs.id),
  draftMessage: text("draft_message").notNull(),
  status: outreachStatusEnum("status").default("draft").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: notificationTypeEnum("type").notNull(),
  relatedMatchId: uuid("related_match_id").references(() => matches.id),
  message: text("message").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const gmailSyncState = pgTable("gmail_sync_state", {
  id: uuid("id").defaultRandom().primaryKey(),
  lastHistoryId: text("last_history_id"),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  watchExpiration: timestamp("watch_expiration", { withTimezone: true }),
});

export const gmailCredentials = pgTable("gmail_credentials", {
  id: uuid("id").defaultRandom().primaryKey(),
  emailAddress: text("email_address").notNull(),
  encryptedRefreshToken: text("encrypted_refresh_token").notNull(),
  scopes: text("scopes").notNull(),
  connectedAt: timestamp("connected_at", { withTimezone: true }).defaultNow().notNull(),
  lastRefreshError: text("last_refresh_error"),
});

export const apiUsageLog = pgTable("api_usage_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  purpose: apiUsagePurposeEnum("purpose").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  cacheCreationInputTokens: integer("cache_creation_input_tokens").default(0).notNull(),
  cacheReadInputTokens: integer("cache_read_input_tokens").default(0).notNull(),
  estimatedCostUsd: numeric("estimated_cost_usd").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
