import re
from dataclasses import dataclass
from pathlib import Path

SECTION_RE = re.compile(r"^##\s+(\d+)\.\s+(.*)$")
TASK_RE = re.compile(r"^- \[( |x)\]\s+(\d+\.\d+)\s+(.*)$")


@dataclass
class SpecTask:
    id: str
    section: int
    text: str
    done: bool


def parse_tasks(path: Path) -> list[SpecTask]:
    tasks, section = [], 0
    for line in path.read_text(encoding="utf-8").splitlines():
        if m := SECTION_RE.match(line):
            section = int(m.group(1))
        elif (m := TASK_RE.match(line)) and section:
            tasks.append(SpecTask(m.group(2), section, m.group(3), m.group(1) == "x"))
    return tasks


def mark_done(path: Path, task_ids: list[str]) -> None:
    text = path.read_text(encoding="utf-8")
    for task_id in task_ids:
        text = re.sub(rf"^- \[ \]( {re.escape(task_id)} )", r"- [x]\1", text, flags=re.M)
    path.write_text(text, encoding="utf-8")
