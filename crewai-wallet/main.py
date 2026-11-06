import argparse

from dotenv import load_dotenv

load_dotenv()

from flow import SectionFlow  # noqa: E402  (requiere las variables de .env ya cargadas)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ejecuta una sección de tasks.md con los agentes")
    parser.add_argument("--section", type=int, required=True, help="Número de sección (1-8)")
    SectionFlow().kickoff(inputs={"section": parser.parse_args().section})
