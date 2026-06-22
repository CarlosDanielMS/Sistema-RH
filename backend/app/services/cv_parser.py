"""
cv_parser.py
Extrai texto de currículos em PDF.
Reaproveitado da Aula 13 (ingestao.py), adaptado para RH.
"""
import re
from pathlib import Path
import pdfplumber


# Atributos sensíveis que a IA não deve usar para triagem — LGPD / ética
ATRIBUTOS_SENSIVEIS = [
    r"\b(cpf|rg|rg:)\b",
    r"\b(data de nascimento|nascido em|nascida em|idade:)\b",
    r"\b(endereço|rua|avenida|cep)\b",
    r"\b(religião|crença|orientação sexual)\b",
    r"\b(cor |raça |etnia )\b",
    r"\b(estado civil|casado|solteiro|divorciado|viúvo)\b",
    r"\b(deficiência|pcd)\b",
]

_SENSITIVE_RE = re.compile("|".join(ATRIBUTOS_SENSIVEIS), re.IGNORECASE)


def extrair_texto(caminho_pdf: str | Path) -> str:
    """Extrai todo o texto de um PDF página a página."""
    texto_paginas = []
    with pdfplumber.open(str(caminho_pdf)) as pdf:
        for pagina in pdf.pages:
            texto = pagina.extract_text()
            if texto:
                texto_paginas.append(texto.strip())
    return "\n\n".join(texto_paginas)


def sanitizar_para_triagem(texto: str) -> str:
    """
    Remove ou mascara atributos sensíveis antes de enviar para a IA.
    A IA de triagem só recebe competências, experiência e formação.
    """
    return _SENSITIVE_RE.sub("[DADO OMITIDO]", texto)


def extrair_secoes(texto: str) -> dict:
    """
    Divide o currículo em seções para melhorar a qualidade dos embeddings.
    Retorna um dict com seções identificadas heuristicamente.
    """
    secoes = {
        "completo": texto,
        "experiencia": "",
        "formacao": "",
        "habilidades": "",
    }

    linhas = texto.splitlines()
    secao_atual = "completo"

    mapa_secoes = {
        "experiência": "experiencia",
        "experiencia": "experiencia",
        "experience": "experiencia",
        "formação": "formacao",
        "formacao": "formacao",
        "education": "formacao",
        "habilidades": "habilidades",
        "skills": "habilidades",
        "competências": "habilidades",
        "tecnologias": "habilidades",
    }

    buffer: dict[str, list] = {k: [] for k in secoes}

    for linha in linhas:
        chave = mapa_secoes.get(linha.strip().lower())
        if chave:
            secao_atual = chave
        buffer[secao_atual].append(linha)

    for k, v in buffer.items():
        if v:
            secoes[k] = "\n".join(v)

    return secoes
