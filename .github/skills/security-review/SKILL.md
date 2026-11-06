---
name: security-review
description: "Revisión defensiva y autorizada de seguridad para Al toque. Usa esta skill ante cambios de datos personales, OTP, finanzas, APIs, autorización, secretos, criptografía o dependencias."
argument-hint: Change OpenSpec o superficie de seguridad a revisar
---

# Revisión de seguridad defensiva

## Cuándo usarla

- Revisar cambios que manejan DNI, PII, OTP, credenciales, secretos o información financiera.
- Evaluar cambios de API, validación, autenticación/autorización, sesiones, configuración, criptografía o dependencias.
- Analizar un riesgo reportado por QA o validar los controles de seguridad de un change antes de aceptarlo.

## Procedimiento

1. **Establece autorización y alcance.** Confirma el change, las rutas y el entorno permitido. Si la autorización o el alcance de una prueba activa no están claros, limítate a inspección de código y pregunta antes de probar.
2. **Entiende el comportamiento esperado.** Lee specs, `design.md`, ADR y código relacionado. Identifica activos, datos sensibles, límites de confianza y controles definidos. Usa OWASP ASVS u otras referencias solo como guía, no como requisitos automáticos del proyecto.
3. **Inspecciona de forma dirigida.** Revisa validación de entradas, controles de acceso aplicables, protección de datos, manejo de errores, exposición de secretos, configuración y dependencias, priorizando las superficies afectadas por el cambio.
4. **Ejecuta comprobaciones seguras.** Usa únicamente herramientas ya configuradas y pertinentes. Prefiere pruebas locales o de test, no destructivas y con datos sintéticos. No agregues herramientas ni dependencias sin aprobación.
5. **Valida cada señal.** Reproduce de forma segura cuando sea necesario; confirma precondiciones e impacto y descarta falsos positivos. Distingue hallazgos confirmados, riesgos potenciales y observaciones. Un escaneo limpio no demuestra ausencia de vulnerabilidades.
6. **Entrega un informe accionable.** Para cada hallazgo informa:
   - Severidad (crítica, alta, media o baja) y confianza.
   - Archivo y línea(s), componente y control/categoría afectados.
   - Evidencia, impacto y condiciones necesarias.
   - Pasos seguros de reproducción y recomendación de remediación.
   - Estado: confirmado, potencial o falso positivo.
7. **Escala sin implementar cambios de producción.** Deriva correcciones a `ia-engineer`, decisiones técnicas a `architect` y requisitos ambiguos de producto/cumplimiento a `product-owner`. Si se solicita un documento, guárdalo en `docs/qa/<change-id>-seguridad.md`.

## Límites de seguridad

- Trabaja solo en código propio y entornos locales/de test o expresamente autorizados; no escanees producción ni terceros sin alcance y autorización explícitos.
- No hagas explotación, pruebas destructivas, persistencia, evasión de controles, extracción de datos ni pruebas que degraden disponibilidad.
- No uses datos personales reales ni incluyas secretos, tokens o información sensible en comandos, logs o informes.
- No afirmes la existencia de autenticación, autorización, sesión u otros controles no definidos por las specs o la arquitectura.
- No edites código de producción, no despliegues y no modifiques infraestructura o datos.
