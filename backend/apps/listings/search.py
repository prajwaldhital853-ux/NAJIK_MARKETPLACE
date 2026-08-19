import re

from django.db.models import Q

STOPWORDS = {
    "a",
    "an",
    "the",
    "in",
    "on",
    "of",
    "to",
    "for",
    "and",
    "or",
    "me",
    "my",
    "near",
    "nearby",
    "around",
}

SYNONYMS = {
    "room": ["room", "rooms", "apartment", "apartments", "flat", "flats", "rent", "rental", "hostel", "pg", "bhk", "paying guest"],
    "rooms": ["room", "rooms", "apartment", "apartments", "flat", "flats", "rent", "hostel"],
    "apartment": ["apartment", "apartments", "flat", "flats", "room", "rooms", "rent", "bhk"],
    "apartments": ["apartment", "apartments", "flat", "flats", "room", "rent"],
    "appertament": ["apartment", "apartments", "flat", "room", "rent"],
    "flat": ["flat", "flats", "apartment", "room", "rent"],
    "rent": ["rent", "rental", "room", "apartment", "flat", "lease", "to-let"],
    "rental": ["rent", "rental", "room", "apartment"],
    "house": ["house", "home", "bungalow", "villa", "property"],
    "home": ["home", "house", "property"],
    "land": ["land", "plot", "ghaderi", "aana", "ropani"],
    "job": ["job", "jobs", "vacancy", "hiring", "work", "career"],
    "jobs": ["job", "jobs", "vacancy", "hiring", "work"],
    "vehicle": ["vehicle", "vehicles", "automobile", "automobiles", "car", "cars", "bike", "bikes", "motorcycle", "scooter", "motorbike"],
    "vehicles": ["vehicle", "vehicles", "automobile", "automobiles", "car", "cars", "bike", "bikes", "motorcycle", "scooter"],
    "vechicles": ["vehicle", "vehicles", "automobile", "car", "cars", "bike", "bikes"],
    "automobile": ["automobile", "automobiles", "vehicle", "vehicles", "car", "cars"],
    "automobiles": ["automobile", "vehicle", "vehicles", "car", "cars"],
    "car": ["car", "cars", "vehicle", "vehicles", "automobile", "suv", "jeep"],
    "cars": ["car", "cars", "vehicle", "vehicles", "suv"],
    "bike": ["bike", "bikes", "motorcycle", "motorbike", "scooter", "vehicle", "vehicles"],
    "bikes": ["bike", "bikes", "motorcycle", "scooter", "vehicle"],
    "motorcycle": ["motorcycle", "motorbike", "bike", "bikes", "vehicle"],
    "scooter": ["scooter", "bike", "bikes", "vehicle"],
    "pulsar": ["pulsar", "bajaj", "bike", "motorcycle", "vehicle"],
    "honda": ["honda", "car", "bike", "vehicle", "civic", "city", "activa"],
    "yamaha": ["yamaha", "bike", "motorcycle", "fz", "r15"],
    "hero": ["hero", "bike", "splendor", "passion"],
    "bajaj": ["bajaj", "pulsar", "bike", "motorcycle"],
    "tvs": ["tvs", "apache", "bike", "ntorq"],
    "suzuki": ["suzuki", "car", "bike", "swift", "alto", "access"],
    "toyota": ["toyota", "car", "hilux", "innova", "corolla"],
    "hyundai": ["hyundai", "car", "i10", "i20", "creta"],
    "kia": ["kia", "car", "seltos", "sonet"],
    "tata": ["tata", "car", "nexon", "punch"],
    "mahindra": ["mahindra", "car", "scorpio", "thar", "bolero"],
    "ford": ["ford", "car", "ranger", "eco"],
    "royal": ["royal", "enfield", "bullet", "bike"],
    "enfield": ["enfield", "bullet", "bike", "motorcycle"],
    "bullet": ["bullet", "enfield", "bike"],
    "activa": ["activa", "honda", "scooter"],
    "phone": ["phone", "mobile", "smartphone", "iphone"],
    "plumber": ["plumber", "plumbing", "pipe"],
    "shop": ["shop", "store", "kirana", "retail"],
}

CATEGORY_TERMS = {
    "vehicle": "vehicles",
    "vehicles": "vehicles",
    "vechicles": "vehicles",
    "automobile": "vehicles",
    "automobiles": "vehicles",
    "car": "vehicles",
    "cars": "vehicles",
    "bike": "vehicles",
    "bikes": "vehicles",
    "motorcycle": "vehicles",
    "scooter": "vehicles",
    "pulsar": "vehicles",
    "honda": "vehicles",
    "yamaha": "vehicles",
    "hero": "vehicles",
    "bajaj": "vehicles",
    "tvs": "vehicles",
    "suzuki": "vehicles",
    "toyota": "vehicles",
    "hyundai": "vehicles",
    "kia": "vehicles",
    "tata": "vehicles",
    "mahindra": "vehicles",
    "ford": "vehicles",
    "enfield": "vehicles",
    "bullet": "vehicles",
    "activa": "vehicles",
    "room": "property",
    "rooms": "property",
    "apartment": "property",
    "apartments": "property",
    "flat": "property",
    "rent": "property",
    "house": "property",
    "land": "property",
    "job": "jobs",
    "jobs": "jobs",
    "plumber": "services",
    "shop": "business",
}

TOKEN = re.compile(r"[a-z0-9]+", re.I)


def search_terms(q: str) -> list[str]:
    raw = (q or "").strip().lower()
    if not raw:
        return []
    terms = {raw} if raw not in STOPWORDS and len(raw) >= 2 else set()
    for word in TOKEN.findall(raw):
        if len(word) < 2 or word in STOPWORDS:
            continue
        terms.add(word)
        terms.update(SYNONYMS.get(word, []))
    return [term for term in terms if len(term) >= 2][:36]


def listing_search_q(q: str) -> Q:
    query = Q()
    cats = set()
    for term in search_terms(q):
        query |= (
            Q(title__icontains=term)
            | Q(description__icontains=term)
            | Q(location__icontains=term)
            | Q(subcategory__icontains=term)
            | Q(city__icontains=term)
            | Q(district__icontains=term)
            | Q(extras__make__icontains=term)
            | Q(extras__model__icontains=term)
        )
        cat = CATEGORY_TERMS.get(term)
        if cat:
            cats.add(cat)
    for cat in cats:
        query |= Q(category=cat)
    return query


def listing_place_q(place: str) -> Q:
    text = (place or "").strip()
    if not text:
        return Q()
    return Q(location__icontains=text) | Q(city__icontains=text) | Q(district__icontains=text)
