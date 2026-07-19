import { z } from "zod";

export const jdRequirementsSchema = z.object({
  skills: z.array(z.string()),
  seniority: z.string(),
  mustHaves: z.array(z.string()),
  niceToHaves: z.array(z.string()),
  summary: z.string(),
});
export type JdRequirements = z.infer<typeof jdRequirementsSchema>;

export const cvProfileSchema = z.object({
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  yearsExperience: z.number().nullable(),
  skills: z.array(z.string()),
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string(),
      field: z.string(),
      year: z.string().nullable(),
    }),
  ),
  workExperience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      start: z.string().nullable(),
      end: z.string().nullable(),
      description: z.string(),
    }),
  ),
  summary: z.string(),
});
export type CvProfile = z.infer<typeof cvProfileSchema>;

export const matchResultSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string(),
  mustHaveGaps: z.array(z.string()),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
});
export type MatchResult = z.infer<typeof matchResultSchema>;

export const PROMPT_VERSION = "v1";
