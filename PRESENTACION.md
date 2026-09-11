# Presentación y defensa

Guion para una exposición de 10-12 minutos más una demostración en vivo. La idea central es mostrar que el servidor no solo conecta un LLM con GitHub: define contratos, valida entradas, controla errores y permite probar la lógica sin modificar repositorios reales.

## Objetivo de la presentación

Al finalizar, la audiencia debe poder responder:

- Qué problema resuelve el servidor.
- Cómo viaja una petición desde Antigravity hasta GitHub.
- Por qué se eligieron MCP, `stdio`, TypeScript, Zod y Octokit.
- Cómo se manejan seguridad, validación, rate limits y errores.
- Cómo se demuestra que la solución funciona mediante tests.

## Slide 1 - Problema y objetivo

**Problema:** las operaciones repetitivas de GitHub obligan a salir del flujo de conversación y repetir pasos manuales.

**Objetivo:** exponer operaciones frecuentes como tools MCP para que un agente compatible pueda ejecutarlas usando lenguaje natural, con validación y mensajes de error accionables.

Frase para defenderlo:

> El LLM decide qué operación necesita, pero el servidor conserva el control sobre qué datos acepta y cómo se ejecuta la operación.

## Slide 2 - Qué construí

El servidor registra cinco tools:

| Tool | Responsabilidad |
| --- | --- |
| `create_repository` | Crear un repositorio para el usuario autenticado |
| `create_issue` | Abrir un issue con título, descripción y etiquetas |
| `list_repositories` | Consultar repositorios del usuario autenticado |
| `create_commit` | Crear o actualizar un archivo mediante un commit |
| `list_issues` | Listar issues por estado en un repositorio |

La interfaz es lenguaje natural, pero cada tool termina usando un schema estructurado y una operación explícita contra la API de GitHub.

## Slide 3 - Arquitectura y flujo de una petición

Mostrar el diagrama del README y explicar este recorrido:

1. Antigravity actúa como host MCP y envía la petición por `stdio`.
2. El LLM interpreta la intención y selecciona una de las cinco tools.
3. El SDK MCP entrega los argumentos al servidor.
4. Zod valida los argumentos antes de llamar a GitHub.
5. `operations.ts` delega en Octokit.
6. El cliente de GitHub aplica retry para `429` y errores `5xx`.
7. El resultado vuelve como contenido de texto MCP.
8. Los logs de diagnóstico salen por `stderr`; `stdout` queda reservado para el protocolo.

```text
Antigravity -> LLM -> MCP por stdio -> Zod -> operations.ts -> Octokit -> GitHub API
																									 |
																							errorResponse
```

## Slide 4 - Decisiones técnicas

- **TypeScript estricto:** hace explícitos los contratos y reduce errores entre schemas, tools y operaciones.
- **SDK oficial de MCP:** permite registrar tools con el formato esperado por hosts compatibles.
- **`stdio`:** es adecuado para un servidor local lanzado por el host y no requiere abrir un puerto HTTP.
- **Zod:** valida en el borde del sistema: nombres, paginación, estados, rutas y tamaño del archivo.
- **Octokit:** encapsula autenticación y endpoints de GitHub sin construir manualmente las peticiones HTTP.
- **Separación por capas:** `server.ts` maneja MCP, `schemas` valida, `operations.ts` decide la operación de GitHub y `errors` normaliza fallos.

## Slide 5 - Walkthrough: registro de una tool

Mostrar `src/server.ts` y explicar el patrón:

```ts
server.registerTool("list_issues", {
	description: "Lista issues de un repositorio",
	inputSchema: schemas.listIssuesSchema.shape,
}, (input) => run(async () =>
	(await operations.listIssues(client, input)).data
));
```

Puntos importantes:

- La descripción ayuda al LLM a seleccionar la tool.
- El schema limita los argumentos aceptables.
- La operación está separada del protocolo MCP.
- `run` centraliza éxito, conversión de errores, logging y respuesta MCP.

## Slide 6 - Walkthrough: `create_commit`

Este es el flujo más interesante porque crear y actualizar un archivo requieren payloads diferentes:

1. Se llama a `getContent` para obtener el archivo existente.
2. Si GitHub devuelve un archivo, se extrae su `sha`.
3. Si devuelve `404` en este punto, se interpreta como archivo nuevo y no se envía `sha`.
4. El contenido se convierte a Base64.
5. `createOrUpdateFileContents` crea o actualiza el archivo con el mensaje y la rama.

La razón técnica es que GitHub exige el SHA del blob actual para actualizar un archivo y no lo exige para crear uno nuevo.

Matiz para la defensa: un `404` también puede indicar repositorio inexistente o sin permisos; la operación posterior y la normalización del error determinan el diagnóstico final.

## Slide 7 - Robustez, seguridad y errores

- El token se obtiene de `GITHUB_TOKEN`; no se recibe como argumento de una tool.
- Se recomiendan permisos mínimos de GitHub: contenidos e issues, más administración de repositorios solo si se necesita crear repositorios.
- El logger escribe en `stderr` y redacta campos cuyo nombre contiene `token`, `authorization` o `secret`.
- Las categorías de error son `ValidationError`, `AuthenticationError`, `GitHubAPIError` y `NetworkError`.
- Los errores `429` y `5xx` se reintentan hasta el máximo configurado; se respeta `retry-after` cuando GitHub lo envía y, si no, se usa backoff exponencial.
- Las respuestas se convierten en texto útil para el LLM, por ejemplo, indicando que se verifique `owner/repo` ante un `404`.

No decir que el servidor puede corregir permisos insuficientes: el token y GitHub siguen siendo la autoridad.

## Slide 8 - Demostración en vivo en Antigravity

### Preparación antes de presentar

Ejecutar:

```bash
npm install
npm run build
```

Configurar `GITHUB_TOKEN` en el entorno que abre Antigravity y apuntar el servidor MCP a `dist/server.js`:

```json
{
	"servers": {
		"github-automation": {
			"type": "stdio",
			"command": "node",
			"args": ["${workspaceFolder}/dist/server.js"],
			"env": { "GITHUB_TOKEN": "${env:GITHUB_TOKEN}" }
		}
	}
}
```

Recargar Antigravity y confirmar que aparecen las cinco tools.

### Guion de la demo

1. Pedir: `Lista mis 5 repositorios privados más recientes.`
2. Crear un repositorio privado temporal, por ejemplo: `Crea un repositorio privado llamado mcp-demo-20260911.`
3. Crear un issue: `En OWNER/mcp-demo-20260911 crea un issue titulado Demo MCP y describe que es una prueba.`
4. Crear un archivo: `En OWNER/mcp-demo-20260911 crea demo.txt con el texto MCP funcionando y haz commit "docs: add demo file".`
5. Listar los issues abiertos del repositorio.
6. Probar validación con una petición que use la ruta `../secret.txt` y mostrar el rechazo.
7. Mostrar en otra terminal `npm test` y explicar que la demo real sí toca GitHub, mientras que los tests no.

Usar un repositorio temporal y eliminarlo manualmente al terminar. No mostrar nunca el valor del token en pantalla.

## Slide 9 - Testing y evidencia

Ejecutar:

```bash
npm test
npm run lint
npm run build
```

La suite actual contiene **15 tests**:

- **4 tests de errores:** `404`, credenciales inválidas, red y validación Zod.
- **5 tests de operaciones GitHub:** creación de repositorio, issue, listado, actualización con SHA y creación tras `404`.
- **6 tests de schemas:** inputs válidos, nombres inválidos, nombre corto, issue válido, título vacío y ruta insegura.

Octokit se mockea para que las pruebas sean deterministas y no creen repositorios, issues ni commits reales. La estrategia separa:

1. **Contrato:** qué inputs acepta o rechaza cada schema.
2. **Comportamiento:** qué endpoint y payload usa cada operación.
3. **Errores:** cómo se transforma un fallo técnico en un error de aplicación.

Reconocer el límite actual: retry, logging, registro de tools y respuestas MCP no tienen tests directos dedicados. Son buenos candidatos para ampliar la cobertura.

## Slide 10 - Desafíos y soluciones

### Crear o actualizar el mismo archivo

**Desafío:** GitHub necesita SHA al actualizar, pero no al crear.

**Solución:** consultar primero el contenido, conservar el SHA si existe y tratar el `404` como creación dentro de ese flujo.

### Mantener limpio el canal MCP

**Desafío:** cualquier log en `stdout` puede romper la comunicación `stdio`.

**Solución:** reservar `stdout` para el SDK MCP y enviar diagnósticos a `stderr`.

### Errores comprensibles para un agente

**Desafío:** los errores de Octokit son demasiado técnicos para una conversación.

**Solución:** centralizar `toAppError` y devolver categorías y mensajes accionables.

### Evitar efectos secundarios en tests

**Desafío:** probar GitHub contra la API real sería lento, frágil y riesgoso.

**Solución:** inyectar un cliente y mockear sus métodos `rest`.

## Slide 11 - Aprendizajes clave

- Un buen contrato de entrada evita que errores sencillos lleguen a una API externa.
- MCP separa la decisión del agente de la ejecución controlada del servidor.
- La observabilidad debe respetar el protocolo: logs útiles, pero fuera de `stdout`.
- Los errores deben estar pensados para quien consume la respuesta, en este caso el LLM y la persona usuaria.
- La inyección del cliente hace posible probar lógica de integración sin depender de GitHub.

## Preguntas técnicas esperables

**¿Por qué `stdio` y no HTTP?**

El servidor se ejecuta localmente junto al host MCP. `stdio` evita administrar un puerto y es suficiente para esta integración. HTTP sería razonable para un despliegue remoto, pero requeriría autenticación, transporte y operación adicionales.

**¿Qué ocurre ante un rate limit?**

Se reintenta un `429` usando `retry-after` si está presente; si no, se aplica backoff exponencial hasta `RETRY_MAX_ATTEMPTS`. Un `403` por permisos no se arregla reintentando indefinidamente.

**¿Cómo se evita filtrar el token?**

El token se lee desde el entorno y no forma parte del schema de ninguna tool. Los logs redactan campos sensibles. Además, nunca se debe incluir el token en prompts, issues o capturas de pantalla.

**¿Por qué mockear Octokit?**

Para verificar payloads y decisiones de negocio de forma rápida y determinista, sin modificar GitHub. La demo en vivo cubre la integración real.

**¿Cómo ampliarías el servidor?**

Añadiría el schema, una operación aislada en `operations.ts`, el registro de la tool y tests del contrato y del payload. Mantendría separadas las responsabilidades de MCP, validación y API.

**¿Qué mejorarías después?**

Añadiría tests directos para retry, logging, registro de tools y respuestas MCP; también mejoraría el diagnóstico que distingue un archivo inexistente de un repositorio inaccesible antes de asumir que se trata de una creación.

## Cierre

> Este proyecto convierte acciones de GitHub en herramientas controladas para un agente: el lenguaje natural facilita la interacción, mientras que los schemas, la separación de capas, el manejo de errores y los tests mantienen la ejecución predecible.