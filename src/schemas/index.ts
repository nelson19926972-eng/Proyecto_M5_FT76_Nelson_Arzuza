import { z } from "zod";

const repositoryName = z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres").max(100, "El nombre no puede superar 100 caracteres").regex(/^[A-Za-z0-9-]+$/, "El nombre solo puede contener letras, números y guiones");
const owner = z.string().trim().min(1, "El owner es obligatorio").max(39).regex(/^[A-Za-z0-9-]+$/, "El owner de GitHub no es válido");
const repo = repositoryName;

export const createRepositorySchema = z.object({
  name: repositoryName,
  description: z.string().trim().max(350, "La descripción no puede superar 350 caracteres").optional(),
  isPrivate: z.boolean().optional().default(false)
}).strict();

export const createIssueSchema = z.object({
  owner, repo,
  title: z.string().trim().min(1, "El título es obligatorio").max(256, "El título no puede superar 256 caracteres"),
  body: z.string().max(65536, "El body es demasiado largo").optional(),
  labels: z.array(z.string().trim().min(1).max(50)).max(100).optional()
}).strict();

export const listRepositoriesSchema = z.object({
  visibility: z.enum(["all", "public", "private"]).optional().default("all"),
  perPage: z.number().int().min(1).max(100).optional().default(30)
}).strict();

export const createCommitSchema = z.object({
  owner, repo,
  path: z.string().trim().min(1, "La ruta del archivo es obligatoria").max(500).refine((value) => !value.startsWith("/") && !value.includes(".."), "La ruta debe ser relativa y no contener '..'"),
  content: z.string().max(10000000, "El archivo supera el límite de 10 MB").default(""),
  message: z.string().trim().min(1, "El mensaje es obligatorio").max(256),
  branch: z.string().trim().min(1).max(255).optional()
}).strict();

export const listIssuesSchema = z.object({
  owner, repo,
  state: z.enum(["open", "closed", "all"]).optional().default("open"),
  perPage: z.number().int().min(1).max(100).optional().default(30)
}).strict();

export const schemas = { createRepositorySchema, createIssueSchema, listRepositoriesSchema, createCommitSchema, listIssuesSchema };