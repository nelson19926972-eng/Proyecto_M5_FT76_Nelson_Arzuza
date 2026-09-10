# Presentación y defensa

Guion de 8 slides para una presentación de 7-10 minutos y una demostración en vivo.

## Slide 1 - Problema

Operaciones repetitivas de GitHub interrumpen el flujo de trabajo. Objetivo: exponerlas de forma segura a un agente mediante MCP y lenguaje natural.

## Slide 2 - Solución

Cinco tools: crear repositorio, crear issue, listar repositorios, crear/actualizar archivo con commit y listar issues.

## Slide 3 - Arquitectura

Mostrar el diagrama del README: Antigravity es el host, el LLM decide qué tool usar, el servidor valida y Octokit llama a GitHub.

## Slide 4 - Decisiones técnicas

- TypeScript estricto para contratos claros.
- SDK oficial MCP y transporte `stdio` para interoperabilidad.
- Zod para validar antes de tocar la API.
- Octokit para autenticación y endpoints mantenibles.
- stderr para logs y nunca para datos del protocolo.

## Slide 5 - Código desafiante

Explicar `createCommit`: primero busca el SHA del archivo para actualizarlo; un 404 significa que es un archivo nuevo y se omite el SHA. Explicar también retry para 429 y 5xx.

## Slide 6 - Seguridad y errores

Token sólo en variables de entorno, redacción de secretos, permisos mínimos, y traducción de 401/403/404/red en mensajes útiles para el LLM.

## Slide 7 - Testing

Ejecutar `npm test` y mostrar 13 tests pasando. Destacar que Octokit está mockeado, por lo que los tests no modifican GitHub: schemas, payloads, SHA, 404, auth y red.

## Slide 8 - Demo y aprendizajes

Demo sugerida:

1. Pedir `Lista mis repositorios privados`.
2. Crear un repositorio temporal `mcp-demo-<fecha>`.
3. Crear un issue en ese repositorio.
4. Crear `demo.txt` con un commit.
5. Listar el issue abierto.
6. Mostrar `npm test`.

Cerrar con aprendizajes: un buen contrato de input reduce fallos, MCP separa decisión del agente y ejecución, y los errores deben estar pensados para humanos además de desarrolladores.

## Preguntas técnicas esperables

- **¿Por qué stdio?** Es el transporte local estándar para hosts MCP y no abre un puerto innecesario.
- **¿Qué ocurre ante rate limit?** Se reintenta 429 con `retry-after` o backoff exponencial, hasta el máximo configurado.
- **¿Cómo se evita filtrar el token?** Nunca se imprime; el logger redacta claves sensibles y `.env` está ignorado por Git.
- **¿Por qué mockear Octokit?** Hace las pruebas deterministas y evita efectos sobre repositorios reales.
- **¿Cómo ampliarías el servidor?** Añadiría el schema, una función en `operations.ts`, el registro de la tool y tests del contrato, sin mezclar protocolo con API.