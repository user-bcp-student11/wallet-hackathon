import subprocess
from pathlib import Path

from crewai.tools import BaseTool
from pydantic import BaseModel, Field

REPO_ROOT = Path(__file__).resolve().parent.parent
ALLOWED_COMMANDS = ("./mvnw", "mvnw", "ng", "npx playwright", "npm", "openspec validate")


def _safe(path: str) -> Path:
    target = (REPO_ROOT / path).resolve()
    if REPO_ROOT not in target.parents and target != REPO_ROOT:
        raise ValueError("Ruta fuera del repositorio")
    return target


class _ReadArgs(BaseModel):
    path: str = Field(description="Ruta relativa a la raíz del repositorio")


class _WriteArgs(_ReadArgs):
    content: str = Field(description="Contenido completo del archivo")


class _RunArgs(BaseModel):
    command: str = Field(description="Comando a ejecutar desde la raíz del repositorio")
    cwd: str = Field(default=".", description="Subcarpeta relativa donde ejecutar")


class ReadFileTool(BaseTool):
    name: str = "read_file"
    description: str = "Lee un archivo de texto del repositorio."
    args_schema: type[BaseModel] = _ReadArgs

    def _run(self, path: str) -> str:
        return _safe(path).read_text(encoding="utf-8")


class WriteFileTool(BaseTool):
    name: str = "write_file"
    description: str = "Crea o sobrescribe un archivo del repositorio."
    args_schema: type[BaseModel] = _WriteArgs

    def _run(self, path: str, content: str) -> str:
        target = _safe(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        return f"Escrito {path}"


class RunCommandTool(BaseTool):
    name: str = "run_command"
    description: str = "Ejecuta un comando de build/test permitido (mvnw, ng, npx playwright, npm, openspec validate)."
    args_schema: type[BaseModel] = _RunArgs

    def _run(self, command: str, cwd: str = ".") -> str:
        if not command.startswith(ALLOWED_COMMANDS):
            return f"Comando no permitido: {command}"
        done = subprocess.run(command, shell=True, cwd=_safe(cwd), capture_output=True,
                              text=True, timeout=900)
        return f"exit={done.returncode}\n{(done.stdout + done.stderr)[-4000:]}"


FILE_TOOLS = [ReadFileTool(), WriteFileTool()]
ALL_TOOLS = FILE_TOOLS + [RunCommandTool()]
