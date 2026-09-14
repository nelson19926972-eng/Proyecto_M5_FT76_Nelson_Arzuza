import { z } from "zod";

const repositoryName = z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres").max(100, "El nombre no puede superar 100 caracteres").regex(/^[A-Za-z0-9-]+$/, "El nombre solo puede contener letras, números y guiones");
const owner = z.string().trim().min(1, "El owner es obligatorio").max(39).regex(/^[A-Za-z0-9-]+$/, "El owner de GitHub no es válido").describe("Usuario u organización propietaria del repositorio en GitHub.");
const repo = repositoryName.describe("Nombre exacto del repositorio existente en GitHub.");

export const createRepositorySchema = z.object({
  name: repositoryName.describe("Nombre nuevo del repositorio; usa solo letras, números y guiones."),
  description: z.string().trim().max(350, "La descripción no puede superar 350 caracteres").optional().describe("Descripción breve que aparecerá en GitHub."),
  isPrivate: z.boolean().optional().default(false).describe("Indica si el repositorio debe ser privado. Por defecto es false.")
}).strict();

export const createIssueSchema = z.object({
  owner, repo,
  title: z.string().trim().min(1, "El título es obligatorio").max(256, "El título no puede superar 256 caracteres").describe("Título claro y breve del issue."),
  body: z.string().max(65536, "El body es demasiado largo").optional().describe("Descripción detallada del problema o tarea."),
  labels: z.array(z.string().trim().min(1).max(50)).max(100).optional().describe("Etiquetas existentes de GitHub que se aplicarán al issue.")
}).strict();

export const listRepositoriesSchema = z.object({
  visibility: z.enum(["all", "public", "private"]).optional().default("all").describe("Filtra por visibilidad: all, public o private."),
  perPage: z.number().int().min(1).max(100).optional().default(30).describe("Cantidad máxima de repositorios a devolver, entre 1 y 100.")
}).strict();

export const createCommitSchema = z.object({
  owner, repo,
  path: z.string().trim().min(1, "La ruta del archivo es obligatoria").max(500).refine((value) => !value.startsWith("/") && !value.includes(".."), "La ruta debe ser relativa y no contener '..'").describe("Ruta relativa del archivo dentro del repositorio, por ejemplo docs/uso.md."),
  content: z.string().max(10000000, "El archivo supera el límite de 10 MB").default("").describe("Contenido textual completo del archivo; se codifica antes de enviarlo a GitHub."),
  message: z.string().trim().min(1, "El mensaje es obligatorio").max(256).describe("Mensaje del commit que se creará en GitHub."),
  branch: z.string().trim().min(1).max(255).optional().describe("Rama destino. Si se omite, GitHub usa la rama predeterminada.")
}).strict();

export const listIssuesSchema = z.object({
  owner, repo,
  state: z.enum(["open", "closed", "all"]).optional().default("open").describe("Filtra por estado: open, closed o all."),
  perPage: z.number().int().min(1).max(100).optional().default(30).describe("Cantidad máxima de issues a devolver, entre 1 y 100.")
}).strict();

export const schemas = { createRepositorySchema, createIssueSchema, listRepositoriesSchema, createCommitSchema, listIssuesSchema };