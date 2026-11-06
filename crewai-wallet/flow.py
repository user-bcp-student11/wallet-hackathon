from crewai import LLM, Crew, Process, Task
from crewai.flow.flow import Flow, listen, start
from pydantic import BaseModel

import agents
from tasks_parser import SpecTask, mark_done, parse_tasks
from tools import REPO_ROOT

CHANGE = "add-wallet-onboarding"
CHANGE_DIR = REPO_ROOT / "openspec" / "changes" / CHANGE
TASKS_FILE = CHANGE_DIR / "tasks.md"
CONTEXT_FILES = ("proposal.md", "design.md")

ROUTER_PROMPT = """Clasifica la tarea en UN solo rol y responde únicamente con su clave.
architect: decisiones técnicas, ADR, contratos OpenAPI, estructura del repositorio.
backend: Java/Spring Boot, dominio, persistencia, API, eventos, métricas.
frontend: Angular, pantallas, formularios, accesibilidad.
testing: pruebas, E2E, trazabilidad, verificación integral.
security: revisión de seguridad, privacidad, datos personales.

Tarea: {task}"""


def _context() -> str:
    parts = [(CHANGE_DIR / name).read_text(encoding="utf-8") for name in CONTEXT_FILES]
    parts += [p.read_text(encoding="utf-8") for p in sorted((CHANGE_DIR / "specs").glob("*/spec.md"))]
    return "\n\n".join(parts)


def route(task: SpecTask):
    """Elige el agente según el contenido de la tarea; backend por defecto."""
    answer = str(LLM(model=agents.MODEL).call(ROUTER_PROMPT.format(task=task.text))).strip().lower()
    return agents.ROLES.get(next((k for k in agents.ROLES if k in answer), "backend"))


class SectionState(BaseModel):
    section: int = 1
    task_ids: list[str] = []
    output: str = ""


class SectionFlow(Flow[SectionState]):
    @start()
    def run_section(self):
        pending = [t for t in parse_tasks(TASKS_FILE) if t.section == self.state.section and not t.done]
        if not pending:
            return "Sin tareas pendientes en la sección."
        self.state.task_ids = [t.id for t in pending]
        context = _context()

        tasks = [
            Task(
                description=f"Implementa la tarea {t.id} del change {CHANGE} y ejecuta su verificación:\n"
                            f"{t.text}\n\nContexto del change:\n{context}",
                expected_output="Archivos creados/modificados y resultado del comando de verificación.",
                agent=route(t),
            )
            for t in pending
        ]
        ids = ", ".join(self.state.task_ids)
        tasks.append(Task(
            description=f"Valida con pruebas lo implementado en las tareas {ids}",
            expected_output="Resultado de las pruebas ejecutadas.", agent=agents.testing))
        tasks.append(Task(
            description=f"Revisa la seguridad de lo implementado en las tareas {ids}",
            expected_output="Hallazgos de seguridad con severidad.", agent=agents.security))

        crew = Crew(agents=list(agents.ROLES.values()), tasks=tasks,
                    process=Process.sequential, verbose=True)
        self.state.output = str(crew.kickoff())
        return self.state.output

    @listen(run_section)
    def confirm(self):
        if not self.state.task_ids:
            return
        print(self.state.output)
        answer = input(f"¿Marcar {', '.join(self.state.task_ids)} como hechas en tasks.md? [s/N] ")
        if answer.strip().lower() == "s":
            mark_done(TASKS_FILE, self.state.task_ids)
