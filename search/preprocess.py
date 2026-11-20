"""Единый токенизатор корпуса и запросов, без готового поискового индекса."""

import re
from functools import lru_cache

from pymorphy3 import MorphAnalyzer

VERSION = "ru-lemma-1"
TOKEN = re.compile(r"mb\s*\d{3}\.\d+|dot\s*\d\+?|\d+w-\d+|[a-z]+\d+|\d+(?:[.,]\d+)?|[a-zа-яё]+", re.I)
STOP = set("а и но или в во на по с со к ко у от до из за для при о об это этот что как какой когда где мой свой быть нужно можно ли который".split())
SYNONYMS = {"антифриз": ["охлаждающий", "жидкость"], "тормозуха": ["тормозной", "жидкость"], "то": ["обслуживание", "assyst"], "ассист": ["assyst"], "коробка": ["акпп"], "резина": ["шина"]}


@lru_cache(maxsize=1)
def morphology():
    return MorphAnalyzer()


@lru_cache(maxsize=16384)
def normalize(word):
    word = re.sub(r"\s+", "", word.lower().replace("ё", "е")).replace(",", ".")
    if re.fullmatch(r"[а-я]+", word):
        return morphology().parse(word)[0].normal_form
    return word


def preprocess(text):
    return [term for m in TOKEN.finditer(text) if (term := normalize(m.group())) not in STOP]


def query_terms(text):
    terms = preprocess(text)
    return list(dict.fromkeys(terms + [normalize(s) for t in terms for s in SYNONYMS.get(t, [])]))


def matched_terms(text, terms):
    wanted = set(terms)
    return list(dict.fromkeys(m.group() for m in TOKEN.finditer(text) if normalize(m.group()) in wanted))
