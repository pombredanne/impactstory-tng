import datetime
import iso8601
import time
import pytz
import unicodedata
import sqlalchemy
import logging
import math
import bisect
import re
import string
import collections
import csv

def read_csv_file(filename):
    print filename
    with open(filename, "r") as csv_file:
        my_reader = csv.DictReader(csv_file)
        rows = [row for row in my_reader]
    return rows

class NoDoiException(Exception):
    pass

# from http://stackoverflow.com/a/3233356/596939
def update_recursive_sum(d, u):
    for k, v in u.iteritems():
        if isinstance(v, collections.Mapping):
            r = update_recursive_sum(d.get(k, {}), v)
            d[k] = r
        else:
            if k in d:
                d[k] += u[k]
            else:
                d[k] = u[k]
    return d

# returns dict with values that are proportion of all values
def as_proportion(my_dict):
    if not my_dict:
        return {}
    total = sum(my_dict.values())
    resp = {}
    for k, v in my_dict.iteritems():
        resp[k] = round(float(v)/total, 2)
    return resp

def calculate_percentile(refset, value):
    if value is None:  # distinguish between that and zero
        return None

    matching_index = bisect.bisect_left(refset, value)
    percentile = float(matching_index) / len(refset)
    # print u"percentile for {} is {}".format(value, percentile)

    return percentile

# good for deduping strings.  output removes spaces so isn't readable.
def normalize(text):
    # remove all white space
    response = re.sub(u"\s+", u"", text)
    response = remove_punctuation(response.lower())
    return response

def remove_punctuation(input_string):
    # from http://stackoverflow.com/questions/265960/best-way-to-strip-punctuation-from-a-string-in-python
    no_punc = input_string
    if input_string:
        no_punc = u"".join(e for e in input_string if (e.isalnum() or e.isspace()))
    return no_punc

# from http://stackoverflow.com/a/11066579/596939
def replace_punctuation(text, sub):
    punctutation_cats = set(['Pc', 'Pd', 'Ps', 'Pe', 'Pi', 'Pf', 'Po'])
    chars = []
    for my_char in text:
        if unicodedata.category(my_char) in punctutation_cats:
            chars.append(sub)
        else:
            chars.append(my_char)
    return u"".join(chars)


def word_for_num(num):
    words = {
        1.0: "a",
        2.0: "two",
        3.0: "three",
        4.0: "four",
        5.0: "five",
        6.0: "six",
        7.0: "seven",
        8.0: "eight",
        9.0: "nine",
        10.0: "ten",
        11.0: "eleven",
        12.0: "twelve"
    }

    try:
        return words[float(num)]
    except KeyError:
        return "{}".format(num)


def conversational_number(number):

    if number == 0:
        return "zero"

    elif number < 1:
        return round(number, 2)

    elif number < 1000:
        return int(math.floor(number))

    elif number < 1000000:
        unit = "thousand"

        # floor of how many thousands we have, using Integer Division
        num_units = number / 1000
        is_exact = number % 1000 == 0

    else:
        unit = "million"
        divided = number / 1000000.0

        # floor (not round) to the nearest .1
        # eg 1.21 = 1.2
        # eg 1.29 = 1.2
        # eg 1.30 = 1.3
        num_units = int(divided * 10) / 10.0
        is_exact = number % 1000000 == 0


    ret_str = "{num} {unit}".format(
        num=word_for_num(num_units),
        unit=unit
    )
    if not is_exact:
        ret_str = "over " + ret_str

    return ret_str




def safe_commit(db):
    try:
        db.session.commit()
        return True
    except (KeyboardInterrupt, SystemExit):
        # let these ones through, don't save anything to db
        raise
    except sqlalchemy.exc.DataError:
        db.session.rollback()
        print u"sqlalchemy.exc.DataError on commit.  rolling back."
    except Exception:
        db.session.rollback()
        print u"generic exception in commit.  rolling back."
        logging.exception("commit error")
    return False




def is_doi_url(url):
    # test urls at https://regex101.com/r/yX5cK0/2
    p = re.compile("https?:\/\/(?:dx.)?doi.org\/(.*)")
    matches = re.findall(p, url)
    if len(matches) > 0:
        return True
    return False

def pick_best_url(urls):
    if not urls:
        return None

    #get a backup
    response = urls[0]

    # now go through and pick the best one
    for url in urls:
        # doi if available
        if "doi.org" in url:
            response = url

        # anything else if what we currently have is bogus
        if response == "http://www.ncbi.nlm.nih.gov/pmc/articles/PMC":
            response = url

    return response

def clean_doi(dirty_doi):

    if not dirty_doi:
        raise NoDoiException("There's no valid DOI.")

    dirty_doi = remove_nonprinting_characters(dirty_doi)
    dirty_doi = dirty_doi.strip()

    # test cases for this regex are at https://regex101.com/r/zS4hA0/1
    p = re.compile(ur'.*?(10.+)')

    matches = re.findall(p, dirty_doi)
    if len(matches) == 0:
        raise NoDoiException("There's no valid DOI for {}.".format(dirty_doi))

    match = matches[0]

    try:
        resp = unicode(match, "utf-8")  # unicode is valid in dois
    except (TypeError, UnicodeDecodeError):
        resp = match

    # remove any url fragments
    if u"#" in resp:
        resp = resp.split(u"#")[0]

    # get rid of the version number at the end of a figshare url
    figshare_version_pattern = re.compile(u".*figshare.*\.v\d+$", re.IGNORECASE)  #might be .v1 or .V1
    matches = figshare_version_pattern.findall(resp)
    if matches:
        resp = resp.rsplit(u".", 1)[0]

    return resp


def date_as_iso_utc(datetime_object):
    if datetime_object is None:
        return None

    date_string = u"{}{}".format(datetime_object, "+00:00")
    return date_string


def days_between(iso_date_string1, iso_date_string2):
    my_date1 = iso8601.parse_date(iso_date_string1).replace(tzinfo=pytz.UTC)
    my_date2 = iso8601.parse_date(iso_date_string2).replace(tzinfo=pytz.UTC)
    diff = abs(my_date1 - my_date2)
    return diff.days

def days_ago(iso_date_string):
    my_date = iso8601.parse_date(iso_date_string).replace(tzinfo=pytz.UTC)
    now = datetime.datetime.utcnow().replace(tzinfo=pytz.UTC)
    diff = (now - my_date)
    return diff.days

def dict_from_dir(obj, keys_to_ignore=None, keys_to_show="all"):

    if keys_to_ignore is None:
        keys_to_ignore = []
    elif isinstance(keys_to_ignore, basestring):
        keys_to_ignore = [keys_to_ignore]

    ret = {}

    if keys_to_show != "all":
        for key in keys_to_show:
            ret[key] = getattr(obj, key)

        return ret


    for k in dir(obj):
        value = getattr(obj, k)

        if k.startswith("_"):
            pass
        elif k in keys_to_ignore:
            pass
        # hide sqlalchemy stuff
        elif k in ["query", "query_class", "metadata"]:
            pass
        elif callable(value):
            pass
        else:
            try:
                # convert datetime objects...generally this will fail becase
                # most things aren't datetime object.
                ret[k] = time.mktime(value.timetuple())
            except AttributeError:
                ret[k] = value
    return ret


def median(my_list):
    """
    Find the median of a list of ints

    from https://stackoverflow.com/questions/24101524/finding-median-of-list-in-python/24101655#comment37177662_24101655
    """
    my_list = sorted(my_list)
    if len(my_list) < 1:
            return None
    if len(my_list) %2 == 1:
            return my_list[((len(my_list)+1)/2)-1]
    if len(my_list) %2 == 0:
            return float(sum(my_list[(len(my_list)/2)-1:(len(my_list)/2)+1]))/2.0


def underscore_to_camelcase(value):
    words = value.split("_")
    capitalized_words = []
    for word in words:
        capitalized_words.append(word.capitalize())

    return "".join(capitalized_words)

def chunk_into_n_sublists(input, num_sublists):
    """
    returns num_sublists chunks of roughly equal size
    from http://stackoverflow.com/a/4119142/596939
    """
    start = 0
    for i in xrange(num_sublists):
        stop = start + len(input[i::num_sublists])
        yield input[start:stop]
        start = stop


def chunks(l, n):
    """
    Yield successive n-sized chunks from l.

    from http://stackoverflow.com/a/312464
    """
    for i in xrange(0, len(l), n):
        yield l[i:i+n]

def page_query(q, page_size=1000):
    offset = 0
    while True:
        r = False
        print "util.page_query() retrieved {} things".format(page_query())
        for elem in q.limit(page_size).offset(offset):
            r = True
            yield elem
        offset += page_size
        if not r:
            break

def elapsed(since, round_places=2):
    return round(time.time() - since, round_places)



def truncate(str, max=100):
    if len(str) > max:
        return str[0:max] + u"..."
    else:
        return str


def str_to_bool(x):
    if x.lower() in ["true", "1", "yes"]:
        return True
    elif x.lower() in ["false", "0", "no"]:
        return False
    else:
        raise ValueError("This string can't be cast to a boolean.")

# from http://stackoverflow.com/a/20007730/226013
ordinal = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])

#from http://farmdev.com/talks/unicode/
def to_unicode_or_bust(obj, encoding='utf-8'):
    if isinstance(obj, basestring):
        if not isinstance(obj, unicode):
            obj = unicode(obj, encoding)
    return obj

def remove_nonprinting_characters(input, encoding='utf-8'):
    input_was_unicode = True
    if isinstance(input, basestring):
        if not isinstance(input, unicode):
            input_was_unicode = False

    unicode_input = to_unicode_or_bust(input)

    # see http://www.fileformat.info/info/unicode/category/index.htm
    char_classes_to_remove = ["C", "M", "Z"]

    response = u''.join(c for c in unicode_input if unicodedata.category(c)[0] not in char_classes_to_remove)

    if not input_was_unicode:
        response = response.encode(encoding)

    return response

# getting a "decoding Unicode is not supported" error in this function?
# might need to reinstall libaries as per
# http://stackoverflow.com/questions/17092849/flask-login-typeerror-decoding-unicode-is-not-supported
class HTTPMethodOverrideMiddleware(object):
    allowed_methods = frozenset([
        'GET',
        'HEAD',
        'POST',
        'DELETE',
        'PUT',
        'PATCH',
        'OPTIONS'
    ])
    bodyless_methods = frozenset(['GET', 'HEAD', 'OPTIONS', 'DELETE'])

    def __init__(self, app):
        self.app = app

    def __call__(self, environ, start_response):
        method = environ.get('HTTP_X_HTTP_METHOD_OVERRIDE', '').upper()
        if method in self.allowed_methods:
            method = method.encode('ascii', 'replace')
            environ['REQUEST_METHOD'] = method
        if method in self.bodyless_methods:
            environ['CONTENT_LENGTH'] = '0'
        return self.app(environ, start_response)
