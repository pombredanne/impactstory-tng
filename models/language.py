#!/usr/bin/python
# -*- coding: iso-8859-15 -*-

def get_language_from_abbreviation(abbr):
    try:
        return language_info[abbr]
    except KeyError:
        return None


language_info = {
    u'aa': u'Afar',
     u'ab': u'Abkhaz',
     u'ae': u'Avestan',
     u'af': u'Afrikaans',
     u'ak': u'Akan',
     u'am': u'Amharic',
     u'an': u'Aragonese',
     u'ar': u'Arabic',
     u'as': u'Assamese',
     u'av': u'Avaric',
     u'ay': u'Aymara',
     u'az': u'Azerbaijani',
     u'ba': u'Bashkir',
     u'be': u'Belarusian',
     u'bg': u'Bulgarian',
     u'bh': u'Bihari',
     u'bi': u'Bislama',
     u'bm': u'Bambara',
     u'bn': u'Bengali, Bangla',
     u'bo': u'Tibetan Standard, Tibetan, Central',
     u'br': u'Breton',
     u'bs': u'Bosnian',
     u'ca': u'Catalan',
     u'ce': u'Chechen',
     u'ch': u'Chamorro',
     u'co': u'Corsican',
     u'cr': u'Cree',
     u'cs': u'Czech',
     u'cu': u'Old Church Slavonic,Church Slavonic,\xc2\xa0Old Bulgarian',
     u'cv': u'Chuvash',
     u'cy': u'Welsh',
     u'da': u'Danish',
     u'de': u'German',
     u'dv': u'Divehi, Dhivehi, Maldivian',
     u'dz': u'Dzongkha',
     u'ee': u'Ewe',
     u'el': u'Greek\xc2\xa0(modern)',
     u'en': u'English',
     u'eo': u'Esperanto',
     u'es': u'Spanish',
     u'et': u'Estonian',
     u'eu': u'Basque',
     u'fa': u'Persian\xc2\xa0(Farsi)',
     u'ff': u'Fula, Fulah, Pulaar, Pular',
     u'fi': u'Finnish',
     u'fj': u'Fijian',
     u'fo': u'Faroese',
     u'fr': u'French',
     u'fy': u'Western Frisian',
     u'ga': u'Irish',
     u'gd': u'Scottish Gaelic, Gaelic',
     u'gl': u'Galician',
     u'gn': u'Guaran\xc3\xad',
     u'gu': u'Gujarati',
     u'gv': u'Manx',
     u'ha': u'Hausa',
     u'he': u'Hebrew\xc2\xa0(modern)',
     u'hi': u'Hindi',
     u'ho': u'Hiri Motu',
     u'hr': u'Croatian',
     u'ht': u'Haitian, Haitian Creole',
     u'hu': u'Hungarian',
     u'hy': u'Armenian',
     u'hz': u'Herero',
     u'ia': u'Interlingua',
     u'id': u'Indonesian',
     u'ie': u'Interlingue',
     u'ig': u'Igbo',
     u'ii': u'Nuosu',
     u'ik': u'Inupiaq',
     u'io': u'Ido',
     u'is': u'Icelandic',
     u'it': u'Italian',
     u'iu': u'Inuktitut',
     u'ja': u'Japanese',
     u'jv': u'Javanese',
     u'ka': u'Georgian',
     u'kg': u'Kongo',
     u'ki': u'Kikuyu, Gikuyu',
     u'kj': u'Kwanyama, Kuanyama',
     u'kk': u'Kazakh',
     u'kl': u'Kalaallisut, Greenlandic',
     u'km': u'Khmer',
     u'kn': u'Kannada',
     u'ko': u'Korean',
     u'kr': u'Kanuri',
     u'ks': u'Kashmiri',
     u'ku': u'Kurdish',
     u'kv': u'Komi',
     u'kw': u'Cornish',
     u'ky': u'Kyrgyz',
     u'la': u'Latin',
     u'lb': u'Luxembourgish, Letzeburgesch',
     u'lg': u'Ganda',
     u'li': u'Limburgish, Limburgan, Limburger',
     u'ln': u'Lingala',
     u'lo': u'Lao',
     u'lt': u'Lithuanian',
     u'lu': u'Luba-Katanga',
     u'lv': u'Latvian',
     u'mg': u'Malagasy',
     u'mh': u'Marshallese',
     u'mi': u'M\xc4\x81ori',
     u'mk': u'Macedonian',
     u'ml': u'Malayalam',
     u'mn': u'Mongolian',
     u'mr': u'Marathi (Mar\xc4\x81\xe1\xb9\xadh\xc4\xab)',
     u'ms': u'Malay',
     u'mt': u'Maltese',
     u'my': u'Burmese',
     u'na': u'Nauruan',
     u'nb': u'Norwegian Bokm\xc3\xa5l',
     u'nd': u'Northern Ndebele',
     u'ne': u'Nepali',
     u'ng': u'Ndonga',
     u'nl': u'Dutch',
     u'nn': u'Norwegian Nynorsk',
     u'no': u'Norwegian',
     u'nr': u'Southern Ndebele',
     u'nv': u'Navajo, Navaho',
     u'ny': u'Chichewa, Chewa, Nyanja',
     u'oc': u'Occitan',
     u'oj': u'Ojibwe, Ojibwa',
     u'om': u'Oromo',
     u'or': u'Oriya',
     u'os': u'Ossetian, Ossetic',
     u'pa': u'Panjabi, Punjabi',
     u'pi': u'P\xc4\x81li',
     u'pl': u'Polish',
     u'ps': u'Pashto, Pushto',
     u'pt': u'Portuguese',
     u'qu': u'Quechua',
     u'rm': u'Romansh',
     u'rn': u'Kirundi',
     u'ro': u'Romanian',
     u'ru': u'Russian',
     u'rw': u'Kinyarwanda',
     u'sa': u'Sanskrit (Sa\xe1\xb9\x81sk\xe1\xb9\x9bta)',
     u'sc': u'Sardinian',
     u'sd': u'Sindhi',
     u'se': u'Northern Sami',
     u'sg': u'Sango',
     u'si': u'Sinhala, Sinhalese',
     u'sk': u'Slovak',
     u'sl': u'Slovene',
     u'sm': u'Samoan',
     u'sn': u'Shona',
     u'so': u'Somali',
     u'sq': u'Albanian',
     u'sr': u'Serbian',
     u'ss': u'Swati',
     u'st': u'Southern Sotho',
     u'su': u'Sundanese',
     u'sv': u'Swedish',
     u'sw': u'Swahili',
     u'ta': u'Tamil',
     u'te': u'Telugu',
     u'tg': u'Tajik',
     u'th': u'Thai',
     u'ti': u'Tigrinya',
     u'tk': u'Turkmen',
     u'tl': u'Tagalog',
     u'tn': u'Tswana',
     u'to': u'Tonga\xc2\xa0(Tonga Islands)',
     u'tr': u'Turkish',
     u'ts': u'Tsonga',
     u'tt': u'Tatar',
     u'tw': u'Twi',
     u'ty': u'Tahitian',
     u'ug': u'Uyghur',
     u'uk': u'Ukrainian',
     u'ur': u'Urdu',
     u'uz': u'Uzbek',
     u've': u'Venda',
     u'vi': u'Vietnamese',
     u'vo': u'Volap\xc3\u0152k',
     u'wa': u'Walloon',
     u'wo': u'Wolof',
     u'xh': u'Xhosa',
     u'yi': u'Yiddish',
     u'yo': u'Yoruba',
     u'za': u'Zhuang, Chuang',
     u'zh': u'Chinese',
     u'zu': u'Zulu'
 }