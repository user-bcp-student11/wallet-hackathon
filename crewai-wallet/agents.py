import os
from pathlib import Path

from crewai import Agent
from crewai.mcp import MCPServerHTTP

from tools import ALL_TOOLS

SKILLS_DIR = Path(__file__).resolve().parent / "skills"
MODEL = os.getenv("CREWAI_MODEL", "gpt-4o-mini")

# Servidor MCP de GitHub (solo lo usa el rol backend).
GITHUB_MCP = MCPServerHTTP(
    url=os.getenv("GITHUB_MCP_URL", "http://localhost:8080/mcp"),
    headers={"Authorization": "Bearer " + os.getenv("GITHUB_MCP_API_KEY", "")},
    streamable=True,
)


def _agent(role: str, goal: str, backstory: str, **extra) -> Agent:
    return Agent(
        role=role,
        goal=goal,
        backstory=backstory,
        llm=MODEL,
        tools=ALL_TOOLS,  # todos los roles pueden leer, escribir y ejecutar comandos permitidos
        allow_delegation=False,
        verbose=True,
        **extra,
    )


architect = _agent(
    "Arquitecto de software",
    "Definir la arquitectura y los contratos de API de la wallet según las specs de OpenSpec.",
    "Arquitecto senior de Java/Spring Boot y Angular, enfocado en arquitectura hexagonal.",
)

backend = _agent(
    "Desarrollador backend",
    "Implementar los servicios y endpoints definidos por el arquitecto.",
    "Desarrollador Java/Spring Boot con foco en idempotencia y código testeable.",
    skills=[SKILLS_DIR],  # skill del backend: se especificará más adelante
    mcps=[GITHUB_MCP],
)

frontend = _agent(
    "Desarrollador frontend",
    "Implementar las pantallas mobile-first consumiendo los contratos del backend.",
    "Desarrollador Angular con experiencia en interfaces accesibles.",
)

security = _agent(
    "Especialista en seguridad",
    "Revisar el código generado y reportar vulnerabilidades y riesgos.",
    "Ingeniero AppSec con foco en OWASP y protección de datos personales.",
)

testing = _agent(
    "Ingeniero de testing",
    "Definir y escribir las pruebas que validen los escenarios de las specs.",
    "Ingeniero QA con experiencia en pruebas unitarias, de integración y E2E.",
)

ROLES = {
    "architect": architect,
    "backend": backend,
    "frontend": frontend,
    "security": security,
    "testing": testing,
}
