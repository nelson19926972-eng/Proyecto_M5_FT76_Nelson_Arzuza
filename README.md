# GitHub Automation MCP

Servidor MCP en Node.js y TypeScript para ejecutar operaciones comunes de GitHub desde un cliente compatible con MCP, como Antigravity, Claude, Gemini u otros hosts. La implementación usa el SDK oficial de MCP sobre `stdio`, Octokit para la API de GitHub, Zod para validar cada entrada y Vitest para las pruebas.

El servidor nunca escribe mensajes de diagnóstico en `stdout`; ese canal queda reservado para mensajes MCP. Los logs y errores se envían a `stderr` para no interrumpir el protocolo.

## Quickstart

### Requisitos

- Node.js 20 o superior
- npm 10 o superior
- Una cuenta de GitHub con permisos para crear issues/repositorios o acceder a un repositorio de prueba
- Un Personal Access Token (PAT) con permisos adecuados

### 1) Instalar dependencias

```bash
git clone <url-del-repositorio>
cd proyecto-back-m5
npm install
```

### 2) Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y añade tu token real:

```env
GITHUB_TOKEN=github_pat_xxx
GITHUB_API_URL=https://api.github.com
LOG_LEVEL=info
RETRY_MAX_ATTEMPTS=3
```

### 3) Compilar y arrancar el servidor localmente

```bash
npm run build
npm run dev
```

Para arrancar la versión compilada:

```bash
npm start
```

> El servidor se ejecuta como proceso MCP a través de `stdio`; no esperes texto legible en la consola cuando lo invoque un host MCP.

### 4) Conectar desde un host MCP

Un ejemplo de configuración para un cliente MCP compatible es:

```json
{
  "servers": {
    "github-automation": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/dist/server.js"],
      "env": {
        "GITHUB_TOKEN": "${env:GITHUB_TOKEN}"
      }
    }
  }
}
```

Tras cargar el host, confirma que aparecen las cinco tools del catálogo.

## Variables de entorno y configuración

### Archivo `.env`

El proyecto usa un archivo `.env` en la raíz para configurar el runtime local. El ejemplo base se encuentra en `.env.example`.

```env
GITHUB_TOKEN=github_pat_replace_me
GITHUB_API_URL=https://api.github.com
LOG_LEVEL=info
RETRY_MAX_ATTEMPTS=3
```

### Variables soportadas

| Variable | Requerida | Descripción |
| --- | --- | --- |
| `GITHUB_TOKEN` | Sí | Token de GitHub usado por Octokit para autenticar todas las requests. |
| `GITHUB_API_URL` | No | Endpoint base de la API. Por defecto es `https://api.github.com`. |
| `LOG_LEVEL` | No | Nivel de logs del servidor. Valores típicos: `info`, `warn`, `error`. |
| `RETRY_MAX_ATTEMPTS` | No | Número máximo de reintentos para errores transitorios. |

### Permisos recomendados del token

1. Abre GitHub y ve a `Settings > Developer settings > Personal access tokens`.
2. Crea un token fine-grained o classic según tu flujo.
3. Asegúrate de conceder, como mínimo:
   - `Contents: Read and write` para crear o actualizar archivos.
   - `Issues: Read and write` para listar o abrir issues.
   - `Repository administration` si vas a crear repositorios bajo tu usuario.
4. Guarda el valor solo en `.env` y no lo compartas en prompts, tickets de soporte, logs ni issues.

### Recomendaciones de seguridad

- Nunca subas `.env` a control de versiones.
- Usa un token con el mínimo permiso necesario.
- Revisa cuidadosamente cualquier salida de logs antes de compartirla.
- Si tu host MCP admite `env` por configuración, pasa el token desde ese entorno y no lo hardcodees en el archivo de configuración.

## Catálogo de tools

El servidor expone cinco tools MCP. Todas tienen validación con Zod y errores formateados para que el LLM pueda interpretarlos de forma accionable.

| Tool | Descripción ejecutiva | Entrada principal |
| --- | --- | --- |
| `create_repository` | Crea un repositorio para el usuario autenticado. | `name`, `description`, `isPrivate` |
| `create_issue` | Abre un issue en un repositorio existente. | `owner`, `repo`, `title`, `body`, `labels` |
| `list_repositories` | Lista repositorios del usuario autenticado con filtro de visibilidad. | `visibility`, `perPage` |
| `create_commit` | Crea o actualiza un archivo y genera un commit. | `owner`, `repo`, `path`, `content`, `message`, `branch` |
| `list_issues` | Lista issues de un repositorio. | `owner`, `repo`, `state`, `perPage` |

### `create_repository`

Descripción ejecutiva: crea un repositorio nuevo para el usuario autenticado desde un prompt natural.

| Campo | Tipo | Obligatorio | Detalles |
| --- | --- | --- | --- |
| `name` | `string` | Sí | 3-100 caracteres, solo letras, números y guiones. |
| `description` | `string` | No | Descripción opcional del repositorio. |
| `isPrivate` | `boolean` | No | Si es `true`, crea un repositorio privado. |

Outputs esperados: respuesta JSON con metadatos del repositorio creado, como `id`, `name`, `full_name`, `private`, `html_url` y `description`.

Ejemplo:

- Prompt: `Crea un repositorio privado llamado inventario-api con la descripción API para inventario.`
- Output:

```json
{
  "id": 123456,
  "name": "inventario-api",
  "full_name": "tu-usuario/inventario-api",
  "private": true,
  "html_url": "https://github.com/tu-usuario/inventario-api",
  "description": "API para inventario"
}
```

### `create_issue`

Descripción ejecutiva: abre un issue en un repositorio existente, con título, cuerpo y etiquetas opcionales.

| Campo | Tipo | Obligatorio | Detalles |
| --- | --- | --- | --- |
| `owner` | `string` | Sí | Propietario del repositorio. |
| `repo` | `string` | Sí | Nombre del repositorio. |
| `title` | `string` | Sí | Título del issue. |
| `body` | `string` | No | Descripción detallada del problema o tarea. |
| `labels` | `string[]` | No | Etiquetas existentes en GitHub. |

Outputs esperados: JSON con el issue generado, incluyendo `number`, `title`, `state`, `html_url` y `labels`.

Ejemplo:

- Prompt: `En acme/inventario-api crea un issue titulado “Validar SKU duplicado”, describe el bug y agrega la etiqueta bug.`
- Output:

```json
{
  "id": 987654,
  "number": 42,
  "title": "Validar SKU duplicado",
  "state": "open",
  "html_url": "https://github.com/acme/inventario-api/issues/42"
}
```

### `list_repositories`

Descripción ejecutiva: lista los repositorios del usuario autenticado, ordenados por actualización y filtrados por visibilidad.

| Campo | Tipo | Obligatorio | Detalles |
| --- | --- | --- | --- |
| `visibility` | `"all" | "public" | "private"` | No | Filtro de visibilidad. Por defecto es `all`. |
| `perPage` | `number` | No | Número de repositorios a devolver. Rango 1-100. |

Outputs esperados: array de repositorios con `name`, `full_name`, `private`, `updated_at` y `html_url`.

Ejemplo:

- Prompt: `Lista mis 10 repositorios privados más recientes.`
- Output:

```json
[
  {
    "name": "inventario-api",
    "full_name": "tu-usuario/inventario-api",
    "private": true,
    "updated_at": "2026-09-14T09:00:00Z",
    "html_url": "https://github.com/tu-usuario/inventario-api"
  }
]
```

### `create_commit`

Descripción ejecutiva: crea o actualiza un archivo dentro de un repositorio y genera un commit con la versión nueva del contenido.

| Campo | Tipo | Obligatorio | Detalles |
| --- | --- | --- | --- |
| `owner` | `string` | Sí | Usuario u organización dueña del repositorio. |
| `repo` | `string` | Sí | Nombre del repositorio. |
| `path` | `string` | Sí | Ruta relativa del archivo, por ejemplo `docs/uso.md`. |
| `content` | `string` | Sí | Contenido completo del archivo en texto plano. |
| `message` | `string` | Sí | Mensaje del commit. |
| `branch` | `string` | No | Rama de destino. Si se omite, usa la predeterminada. |

Outputs esperados: JSON con el contenido actualizado y el commit asociado, por ejemplo `commit.sha` y `content.path`.

Ejemplo:

- Prompt: `En acme/inventario-api, crea docs/uso.md con esta documentación y haz commit “docs: add usage guide” en main.`
- Output:

```json
{
  "commit": {
    "sha": "abc123def456",
    "message": "docs: add usage guide"
  },
  "content": {
    "path": "docs/uso.md",
    "download_url": "https://github.com/.../docs/uso.md"
  }
}
```

### `list_issues`

Descripción ejecutiva: lista los issues del repositorio indicado, con filtros por estado y cantidad máxima de resultados.

| Campo | Tipo | Obligatorio | Detalles |
| --- | --- | --- | --- |
| `owner` | `string` | Sí | Propietario del repositorio. |
| `repo` | `string` | Sí | Nombre del repositorio. |
| `state` | `"open" | "closed" | "all"` | No | Filtro por estado. Por defecto es `open`. |
| `perPage` | `number` | No | Resultados maxima por página. Rango 1-100. |

Outputs esperados: array de issues con `number`, `title`, `state`, `user.login` y `html_url`.

Ejemplo:

- Prompt: `Lista los issues abiertos de acme/inventario-api y resume sus títulos y números.`
- Output:

```json
[
  {
    "number": 12,
    "title": "Revisar carga de archivos",
    "state": "open",
    "html_url": "https://github.com/acme/inventario-api/issues/12"
  }
]
```

## Troubleshooting

| Error o síntoma | Causa probable | Acción sugerida |
| --- | --- | --- |
| No aparece ninguna tool en el cliente MCP | El servidor no se compiló o la ruta al binario es incorrecta | Ejecuta `npm run build`, revisa la ruta apuntando a `dist/server.js` y recarga el host. |
| `AuthenticationError` o `401` | `GITHUB_TOKEN` inexistente, expirado o sin permisos | Revisa `.env`, actualiza el token y confirma que tenga permisos de repo e issues. |
| `404 Not Found` | `owner/repo` incorrecto o acceso no autorizado al repositorio | Verifica el nombre del repositorio y que el token tenga acceso a ese proyecto. |
| `403` o `429` | Rate limit, permisos insuficientes o API temporalmente bloqueada | Consulta límites de la API y revisa permisos; recuerda que `retry` cubre errores transitorios, no permisos faltantes. |
| El servidor no responde | Se está ejecutando como proceso normal y no como `stdio` MCP | No ejecutes el servidor manualmente para pruebas; usa el host MCP y revisa `stderr` para diagnosticar. |
| Validación rechazó un input | Nombre, ruta, título o rango inválido | Revisa la regla del schema, por ejemplo rutas con `..`, nombres sin formato o `perPage` fuera de rango. |
| Error al actualizar un archivo | El archivo existe, pero si se modifica necesita SHA válido | El servidor intenta obtener el SHA antes de actualizar; si persiste, comprueba permisos y rama destino. |

## Release Checklist

Antes de publicar o compartir la integración con revisión externa, verifica lo siguiente:

- [ ] `npm install` funciona desde cero en una máquina limpia.
- [ ] `npm run build` termina correctamente y genera `dist/`.
- [ ] `npm run lint` o `tsc --noEmit` no reporta errores de tipado.
- [ ] `npm test` pasa sin fallos en la suite actual.
- [ ] El archivo `.env.example` incluye todas las variables necesarias y ninguna secret real.
- [ ] `GITHUB_TOKEN` no está comprometido en el repositorio ni en logs.
- [ ] El host MCP está configurado con `stdio` y apunta a `dist/server.js`.
- [ ] Las cinco tools aparecen correctamente en el cliente MCP.
- [ ] Los ejemplos de uso y descripciones en el README reflejan la API actual del proyecto.
- [ ] El protocolo de errores y el manejo de reintentos están documentados y consistentes con la implementación.
- [ ] La documentación marca claramente que los logs de diagnóstico van a `stderr` y no a `stdout`.
- [ ] La release no incluye secretos, tokens ni información sensible del entorno local.

## Licencia

Este proyecto está licenciado bajo la [Licencia MIT](LICENSE).