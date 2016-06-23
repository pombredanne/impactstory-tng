from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import deferred
from sqlalchemy import orm
from sqlalchemy import text
from sqlalchemy import func

from app import db

from models import product  # needed for sqla i think
from models import badge  # needed for sqla i think
from models.product import make_product
from models.product import distinct_product_list
from models.orcid import OrcidProfile
from models.orcid import clean_orcid
from models.orcid import NoOrcidException
from models.orcid import OrcidDoesNotExist
from models.orcid import make_and_populate_orcid_profile
from models.source import sources_metadata
from models.source import Source
from models.refset import Refset
from models.country import country_info
from models.top_news import top_news_titles
from util import elapsed
from util import chunks
from util import date_as_iso_utc
from util import days_ago
from util import safe_commit
from util import calculate_percentile
from util import NoDoiException
from util import normalize
from util import replace_punctuation
from util import as_proportion
from util import pick_best_url

from time import time
from time import sleep
from copy import deepcopy
import jwt
import os
import shortuuid
import requests
import json
import re
import datetime
import logging
import operator
import threading
import hashlib
import math
from nameparser import HumanName
from collections import defaultdict
from requests_oauthlib import OAuth1Session
from util import update_recursive_sum


def delete_person(orcid_id):
    # also need delete all the badges, products
    product.Product.query.filter_by(orcid_id=orcid_id).delete()
    badge.Badge.query.filter_by(orcid_id=orcid_id).delete()

    # and now delete the person.  have to do this after deleting the stuff above.
    Person.query.filter_by(orcid_id=orcid_id).delete()

    commit_success = safe_commit(db)
    if not commit_success:
        print u"COMMIT fail on {}".format(orcid_id)

def set_person_email(orcid_id, email, high_priority=False):
    my_person = Person.query.filter_by(orcid_id=orcid_id).first()
    my_person.email = email
    db.session.merge(my_person)
    commit_success = safe_commit(db)
    if not commit_success:
        print u"COMMIT fail on {}".format(orcid_id)

def set_person_claimed_at(my_person):
    my_person.claimed_at = datetime.datetime.utcnow().isoformat()
    db.session.merge(my_person)
    commit_success = safe_commit(db)
    if not commit_success:
        print u"COMMIT fail on {}".format(my_person.orcid_id)

def make_person(dirty_orcid_id, high_priority=False):
    orcid_id = clean_orcid(dirty_orcid_id)
    my_person = Person(orcid_id=orcid_id)
    db.session.add(my_person)
    print u"\nin make_person: made new person for {}".format(orcid_id)
    my_person.refresh(high_priority=high_priority)
    commit_success = safe_commit(db)
    if not commit_success:
        print u"COMMIT fail on {}".format(orcid_id)

    if my_person.invalid_orcid:
        raise OrcidDoesNotExist

    return my_person

def refresh_profile(orcid_id, high_priority=False):
    my_person = Person.query.filter_by(orcid_id=orcid_id).first()
    my_person.refresh(high_priority=high_priority)
    db.session.merge(my_person)
    commit_success = safe_commit(db)
    if not commit_success:
        print u"COMMIT fail on {}".format(orcid_id)
    return my_person

def link_twitter(orcid_id, twitter_creds):
    my_person = Person.query.filter_by(orcid_id=orcid_id).first()
    my_person.twitter_creds = twitter_creds


    oauth = OAuth1Session(
        os.getenv('TWITTER_CONSUMER_KEY'),
        client_secret=os.getenv('TWITTER_CONSUMER_SECRET'),
        resource_owner_key=twitter_creds["oauth_token"],
        resource_owner_secret=twitter_creds["oauth_token_secret"]
    )
    url = "https://api.twitter.com/1.1/account/verify_credentials.json?include_email=true"

    r = oauth.get(url)
    full_twitter_profile = r.json()
    # print "we got this back from Twitter!", full_twitter_profile

    full_twitter_profile.update(twitter_creds)
    my_person.twitter_creds = full_twitter_profile
    if my_person.email is None:
        my_person.email = full_twitter_profile["email"]

    my_person.twitter = full_twitter_profile["screen_name"]

    commit_success = safe_commit(db)
    if not commit_success:
        print u"COMMIT fail on {}".format(orcid_id)
    return my_person






# @todo refactor this to use the above functions
def add_or_overwrite_person_from_orcid_id(orcid_id,
                                          high_priority=False):

    # if one already there, use it and overwrite.  else make a new one.
    my_person = Person.query.filter_by(orcid_id=orcid_id).first()
    if my_person:
        db.session.merge(my_person)
        print u"\nusing already made person for {}".format(orcid_id)
    else:
        # make a person with this orcid_id
        my_person = Person(orcid_id=orcid_id)
        db.session.add(my_person)
        print u"\nmade new person for {}".format(orcid_id)

    my_person.refresh(high_priority=high_priority)

    # now write to the db
    commit_success = safe_commit(db)
    if not commit_success:
        print u"COMMIT fail on {}".format(my_person.orcid_id)
    return my_person



class Person(db.Model):
    id = db.Column(db.Text, primary_key=True)
    orcid_id = db.Column(db.Text, unique=True)

    given_names = db.Column(db.Text)
    family_name = db.Column(db.Text)

    created = db.Column(db.DateTime)
    updated = db.Column(db.DateTime)
    claimed_at = db.Column(db.DateTime)

    orcid_api_raw_json = deferred(db.Column(JSONB))
    invalid_orcid = db.Column(db.Boolean)
    twitter_creds = db.Column(MutableDict.as_mutable(JSONB))

    email = db.Column(db.Text)
    twitter = db.Column(db.Text)
    campaign = db.Column(db.Text)
    depsy_id = db.Column(db.Text)
    depsy_percentile = db.Column(db.Float)
    affiliation_name = db.Column(db.Text)
    affiliation_role_title = db.Column(db.Text)

    post_counts = db.Column(MutableDict.as_mutable(JSONB))
    # mendeley_sums = deferred(db.Column(MutableDict.as_mutable(JSONB)))
    # not deferred for now
    mendeley_sums = db.Column(MutableDict.as_mutable(JSONB))
    num_products = db.Column(db.Integer)
    num_posts = db.Column(db.Integer)
    num_mentions = db.Column(db.Integer)
    openness = db.Column(db.Float)
    weekly_event_count = db.Column(db.Float)
    monthly_event_count = db.Column(db.Float)
    tweeted_quickly = db.Column(db.Boolean)
    coauthors = db.Column(MutableDict.as_mutable(JSONB))

    error = db.Column(db.Text)



    products = db.relationship(
        'Product',
        lazy='subquery',
        cascade="all, delete-orphan",
        backref=db.backref("person", lazy="subquery"),
        foreign_keys="Product.orcid_id"
    )

    badges = db.relationship(
        'Badge',
        lazy='subquery',
        cascade="all, delete-orphan",
        backref=db.backref("person", lazy="subquery"),
        foreign_keys="Badge.orcid_id"
    )


    def __init__(self, orcid_id):
        self.id = orcid_id
        self.orcid_id = orcid_id
        self.invalid_orcid = False
        self.created = datetime.datetime.utcnow().isoformat()


    # doesn't have error handling; called by refresh when you want it to be robust
    def call_apis(self, high_priority=False, overwrite_orcid=True, overwrite_metrics=True):
        print u"** calling set_api_raw_from_orcid"
        if overwrite_orcid or not self.orcid_api_raw_json:
            self.set_api_raw_from_orcid()
        else:
            print u"not calling orcid because no overwrite"

        # parse orcid so we now what to gather
        self.set_from_orcid()

        # never bother overwriting crossref, so isn't even an option
        products_without_crossref = [p for p in self.products if not p.crossref_api_raw]

        if products_without_crossref:
            print u"** calling set_data_for_all_products for crossref doi lookup"
            # do this first, so have doi for everything else
            self.set_data_for_all_products("set_doi_from_crossref_biblio_lookup", high_priority)

            print u"** calling set_data_for_all_products for crossref"
            self.set_data_for_all_products("set_data_from_crossref", high_priority)
        else:
            print u"** all products have crossref data, so not calling crossref"

        products_without_altmetric = [p for p in self.products if not p.altmetric_api_raw]
        if overwrite_metrics or products_without_altmetric:
            print u"** calling set_data_for_all_products for altmetric"
            self.set_data_for_all_products("set_data_from_altmetric", high_priority)
        else:
            print u"** all products have altmetric data and no overwrite, so not calling altmetric"

        products_without_mendeley = [p for p in self.products if not p.mendeley_api_raw]
        if overwrite_metrics or products_without_mendeley:
            print u"** calling set_data_for_all_products for mendeley"
            self.set_data_for_all_products("set_data_from_mendeley", high_priority)
        else:
            print u"** all products have mendeley data and no overwrite, so not calling mendeley"


    # doesn't have error handling; called by refresh when you want it to be robust
    def refresh_from_db(self):
        print u"* refresh_from_db {}".format(self.orcid_id)
        self.error = None
        start_time = time()
        try:
            print u"** calling call_apis with overwrites false"
            self.call_apis(overwrite_orcid=False, overwrite_metrics=False)

            print u"** calling calculate"
            self.calculate()
        except (KeyboardInterrupt, SystemExit):
            # let these ones through, don't save anything to db
            raise
        except requests.Timeout:
            self.error = "requests timeout"
        except OrcidDoesNotExist:
            self.invalid_orcid = True
            self.error = "invalid orcid"
        except Exception:
            logging.exception("refresh error")
            self.error = "refresh error"
            print u"in generic exception handler, so rolling back in case it is needed"
            db.session.rollback()
        finally:
            self.updated = datetime.datetime.utcnow().isoformat()
            if self.error:
                print u"ERROR refreshing person {}: {}".format(self.id, self.error)


    # doesn't throw errors; sets error column if error
    def refresh(self, high_priority=False):
        print u"* refreshing {} ({})".format(self.orcid_id, self.full_name)
        self.error = None
        start_time = time()
        try:
            print u"** calling call_apis"
            self.call_apis(high_priority=high_priority)

            print u"** calling calculate"
            self.calculate()

            print u"** finished refreshing all {num} products for {orcid_id} ({name}) in {sec}s".format(
                orcid_id=self.orcid_id,
                name=self.full_name,
                num=len(self.all_products),
                sec=elapsed(start_time)
            )

        except (KeyboardInterrupt, SystemExit):
            # let these ones through, don't save anything to db
            raise
        except requests.Timeout:
            self.error = "requests timeout"
        except OrcidDoesNotExist:
            self.invalid_orcid = True
            self.error = "invalid orcid"
        except Exception:
            logging.exception("refresh error")
            self.error = "refresh error"
            print u"in generic exception handler, so rolling back in case it is needed"
            db.session.rollback()
        finally:
            self.updated = datetime.datetime.utcnow().isoformat()
            if self.error:
                print u"ERROR refreshing person {}: {}".format(self.id, self.error)


    def set_mendeley(self, high_priority=False):
        self.set_data_for_all_products("set_data_from_mendeley", high_priority)

    def set_mendeley_sums(self):
        self.mendeley_sums = None
        products_with_mendeley = [p for p in self.all_products if p.mendeley_api_raw]
        if products_with_mendeley:
            print "saving mendeley"
            self.mendeley_sums = {
            "readers": self.mendeley_readers,
            "country": self.mendeley_countries,
            "country_percent": as_proportion(self.mendeley_countries),
            "subdiscipline": self.mendeley_disciplines,
            "subdiscipline_percent": as_proportion(self.mendeley_disciplines),
            "academic_status": self.mendeley_job_titles,
            "academic_status_percent": as_proportion(self.mendeley_job_titles),
            "h_index": self._mendeley_h_index,
            "percent_of_products": self.mendeley_percent_of_products
            }
        else:
            print "no mendeley"
        return self.mendeley_sums


    def set_products(self, products_to_add):
        updated_products = []

        for product_to_add in products_to_add:
            needs_to_be_added = True
            for my_existing_product in self.products:
                if my_existing_product.orcid_put_code == product_to_add.orcid_put_code:

                    # update the product biblio from the most recent orcid api response
                    my_existing_product.orcid_api_raw_json = product_to_add.orcid_api_raw_json
                    my_existing_product.set_biblio_from_orcid()

                    updated_products.append(my_existing_product)
                    needs_to_be_added = False
            if needs_to_be_added:
                updated_products.append(product_to_add)
        self.products = updated_products


    def recalculate_openness(self):
        self.set_openness()
        self.assign_badges(limit_to_badges=["percent_fulltext"])
        self.set_badge_percentiles(limit_to_badges=["percent_fulltext"])


    def calculate(self):
        # things with api calls in them, or things needed to make those calls
        start_time = time()
        self.set_publisher()
        self.set_openness()
        self.set_fulltext_urls()
        self.set_depsy()
        print u"finished api calling part of {method_name} on {num} products in {sec}s".format(
            method_name="calculate".upper(),
            num = len(self.products),
            sec = elapsed(start_time, 2)
        )

        # everything else
        start_time = time()
        self.set_post_counts() # do this first
        self.set_mendeley_sums()
        self.set_num_posts()
        self.set_num_mentions()
        self.set_num_products()
        self.set_event_counts()
        self.set_coauthors()  # do this last, uses scores
        print u"finished calculating part of {method_name} on {num} products in {sec}s".format(
            method_name="calculate".upper(),
            num = len(self.products),
            sec = elapsed(start_time, 2)
        )

        start_time = time()
        self.assign_badges()
        self.set_badge_percentiles()

        print u"finished badges part of {method_name} on {num} products in {sec}s".format(
            method_name="calculate".upper(),
            num = len(self.products),
            sec = elapsed(start_time, 2)
        )

    def mini_calculate(self):
        self.set_num_posts()
        self.set_num_mentions()
        self.set_num_products()


    def set_fulltext_urls(self):

        total_start_time = time()
        start_time = time()

        #### default everything to closed
        # reset everything that we are going to redo
        for p in self.all_products:

            # p.fulltext_url = None  # uncomment this if want to set open from scratch

            if not p.has_fulltext_url:
                p.repo_urls = {"urls": []}
                p.open_step = None
                p.base_dcoa = None
                p.base_dcprovider = None
                p.sherlock_response = None
                p.sherlock_error = None

        print u"starting set_fulltext_urls with {} total products".format(len([p for p in self.all_products]))
        print u"STARTING WITH: {} open\n".format(len([p for p in self.all_products if p.has_fulltext_url]))

        ### first: user supplied a url?  it is open!
        print u"first making user_supplied_fulltext_url products open"
        for p in self.all_products:
            if p.user_supplied_fulltext_url:
                p.set_oa_from_user_supplied_fulltext_url(p.user_supplied_fulltext_url)

        ### go see if it is open based on its id
        products_for_lookup = [p for p in self.all_products if not p.has_fulltext_url]
        self.call_local_lookup_oa(products_for_lookup)
        print u"SO FAR: {} open\n".format(len([p for p in self.all_products if p.has_fulltext_url]))

        ### check base with everything that isn't yet open and has a title
        products_for_base = [p for p in self.all_products if p.title and not p.has_fulltext_url]
        self.call_base(products_for_base)
        print u"SO FAR: {} open\n".format(len([p for p in self.all_products if p.has_fulltext_url]))

        ### check sherlock with all base 2s and all not-yet-open dois
        products_for_sherlock = set([p for p in self.all_products if not p.has_fulltext_url])
        self.call_sherlock(list(products_for_sherlock))
        print u"SO FAR: {} open\n".format(len([p for p in self.all_products if p.has_fulltext_url]))

        ## and that's a wrap!
        for p in self.all_products:
            if not p.has_fulltext_url:
                p.open_step = "closed"  # so can tell it didn't error out
        print u"finished all of set_fulltext_urls in {}s".format(elapsed(total_start_time, 2))


    # if not called with products, run on everything
    def call_local_lookup_oa(self, limit_to_products=None):
        start_time = time()

        if limit_to_products:
            products = limit_to_products
        else:
            products = self.products

        for p in products:
            p.set_local_lookup_oa()
        print u"SO FAR: {} open\n".format(len([p for p in products if p.has_fulltext_url]))
        print u"finished local step of set_fulltext_urls in {}s".format(elapsed(start_time, 2))


    def call_sherlock(self, products):
        if not products:
            print "empty product list so not calling sherlock"
            return
        self.set_data_for_all_products("set_oa_from_sherlock", high_priority=True, include_products=products)


    def call_base(self, products):
        if not products:
            print "empty product list so not calling base"
            return

        titles = []
        # may be more than one product for a given title, so is a dict of lists
        titles_to_products = defaultdict(list)

        for p in products:
            title = p.title
            titles_to_products[normalize(title)].append(p)

            title = title.lower()
            # can't just replace all punctuation because ' replaced with ? gets no hits
            title = title.replace('"', "?")
            title = title.replace('#', "?")
            title = title.replace('=', "?")
            title = title.replace('&', "?")
            title = title.replace('%', "?")
            title = title.replace('-', "*")

            # only bother looking up titles that are at least 3 words long
            title_words = title.split()
            if len(title_words) >= 3:
                # only look up the first 12 words
                title_to_query = u" ".join(title_words[0:12])
                titles.append(title_to_query)

        # now do the lookup in base
        titles_string = u"%20OR%20".join([u'%22{}%22'.format(title) for title in titles])
        print u"{}: calling base with query string of length {}, utf8 bits {}".format(self.id, len(titles_string), 8*len(titles_string.encode('utf-8')))
        url_template = u"https://api.base-search.net/cgi-bin/BaseHttpSearchInterface.fcgi?func=PerformSearch&query=(dcoa:1%20OR%20dcoa:2)%20AND%20dctitle:({titles_string})&fields=dctitle,dccreator,dcyear,dcrights,dcprovider,dcidentifier,dcoa,dclink&hits=100000&format=json"
        url = url_template.format(titles_string=titles_string)
        # print u"{}: calling base with {}".format(self.id, url)

        start_time = time()
        proxy_url = os.getenv("STATIC_IP_PROXY")
        proxies = {"https": proxy_url}
        r = None
        try:
            r = requests.get(url, proxies=proxies, timeout=6)
            # print u"** querying with {} titles took {}s".format(len(titles), elapsed(start_time))
        except requests.exceptions.ConnectionError:
            print u"connection error in set_fulltext_urls on {}, skipping.".format(self.orcid_id)
        except requests.Timeout:
            print u"timeout error in set_fulltext_urls on {}, skipping.".format(self.orcid_id)

        if r != None and r.status_code != 200:
            print u"problem searching base for {}! status_code={}".format(self.id, r.status_code)
            for p in products:
                p.base_dcoa = u"base query error: status_code={}".format(r.status_code)

        else:
            try:
                data = r.json()["response"]
                # print "number found:", data["numFound"]
                for doc in data["docs"]:
                    base_dcoa = str(doc["dcoa"])
                    try:
                        matching_products = titles_to_products[normalize(doc["dctitle"])]
                        for p in matching_products:
                            if base_dcoa == "1":
                                # got a 1 hit.  yay!  overwrite no matter what.
                                p.fulltext_url = pick_best_url(doc["dcidentifier"])
                                p.open_step = "base 1"
                                p.repo_urls["urls"] = {}
                                p.base_dcoa = base_dcoa
                                p.base_dcprovider = doc["dcprovider"]
                            elif base_dcoa == "2" and p.base_dcoa != "1":
                                # got a 2 hit.  use only if we don't already have a 1.
                                p.repo_urls["urls"] += doc["dcidentifier"]
                                p.base_dcoa = base_dcoa
                                p.base_dcprovider = doc["dcprovider"]
                    except KeyError:
                        # print u"no hit with title {}".format(doc["dctitle"])
                        # print u"normalized: {}".format(normalize(doc["dctitle"]))
                        pass
            except ValueError:  # includes simplejson.decoder.JSONDecodeError
                print u'***Error: decoding JSON has failed on {}'.format(self.orcid_id)
                print u"{}: base status_code {}".format(self.id, r.status_code)
                for p in products:
                    p.base_dcoa = u"base lookup error: json response parsing"
            except AttributeError:  # no json
                # print u"no hit with title {}".format(doc["dctitle"])
                # print u"normalized: {}".format(normalize(doc["dctitle"]))
                pass


        print u"finished base step of set_fulltext_urls with {} titles in {}s".format(
            len(titles_to_products), elapsed(start_time, 2))


    def set_depsy(self):
        if self.email:
            headers = {'Accept': 'application/json'}
            # example http://depsy.org/api/search/person?email=ethan@weecology.org
            url = "http://depsy.org/api/search/person?email={}".format(self.email)
            # might throw requests.Timeout
            r = requests.get(url, headers=headers, timeout=10)
            response_dict = r.json()
            if response_dict["count"] > 0:
                self.depsy_id = response_dict["list"][0]["id"]
                self.depsy_percentile = response_dict["list"][0]["impact_percentile"]
                print u"got a depsy id for {}: {}".format(self.id, self.depsy_id)

    @property
    def first_name(self):
        first_name = self.given_names
        try:
            parsed_name = HumanName(self.full_name)
            first_name = parsed_name["first"]
            if first_name and len(first_name) <= 2 and parsed_name["middle"]:
                first_name = parsed_name["middle"]
        except KeyError:
            pass
        # print u"set first name {} as first name for {}".format(self.first_name, self.full_name)
        return first_name


    def set_api_raw_from_orcid(self):
        start_time = time()

        # look up profile in orcid
        try:
            orcid_data = make_and_populate_orcid_profile(self.orcid_id)
            self.orcid_api_raw_json = orcid_data.api_raw_profile
        except requests.Timeout:
            self.error = "timeout from requests when getting orcid"

        print u"finished {method_name} in {sec}s".format(
            method_name="set_api_raw_from_orcid".upper(),
            sec = elapsed(start_time, 2)
        )


    def set_from_orcid(self):
        if not self.orcid_api_raw_json:
            print u"no orcid data in db for {}".format(self.orcid_id)
            return

        orcid_data = OrcidProfile(self.orcid_id)
        orcid_data.api_raw_profile = self.orcid_api_raw_json

        self.given_names = orcid_data.given_names
        self.family_name = orcid_data.family_name
        if orcid_data.best_affiliation:
            self.affiliation_name = orcid_data.best_affiliation["name"]
            self.affiliation_role_title = orcid_data.best_affiliation["role_title"]
        else:
            self.affiliation_name = None
            self.affiliation_role_title = None

        # now walk through all the orcid works and save the most recent ones in our db, deduped.
        products_to_add = []
        for work in orcid_data.works:
            new_product = make_product(work)
            products_to_add = distinct_product_list(new_product, products_to_add)

        products_to_add.sort(key=operator.attrgetter('year_int'), reverse=True)

        # keep only most recent products
        products_to_add = products_to_add[:100]

        self.set_products(products_to_add)


    def set_data_for_all_products(self, method_name, high_priority=False, include_products=None):
        start_time = time()
        threads = []

        # use all products unless passed a specific set
        if not include_products:
            include_products = self.all_products

        # start a thread for each product
        for work in include_products:
            method = getattr(work, method_name)
            process = threading.Thread(target=method, args=[high_priority])
            process.start()
            threads.append(process)

        # wait till all work is done
        for process in threads:
            process.join()

        # now go see if any of them had errors
        # need to do it this way because can't catch thread failures; have to check
        # object afterwards instead to see if they logged failures
        for work in include_products:
            if work.error:
                # don't print out doi here because that could cause another bug
                # print u"setting person error; {} for product {}".format(work.error, work.id)
                self.error = work.error

        print u"finished {method_name} on {num} products in {sec}s".format(
            method_name=method_name.upper(),
            num = len(include_products),
            sec = elapsed(start_time, 2)
        )



    @property
    def picture(self):
        try:
            url = self.twitter_creds["profile_image_url"].replace("_normal", "").replace("http:", "https:")
        except TypeError:
            # no twitter. let's try gravatar

            try:
                email_hash = hashlib.md5(self.email).hexdigest()
            except TypeError:
                # bummer, no email either. that's ok, gravatar will return a blank face for
                # an email they don't have
                email_hash = ""

            url = u"https://www.gravatar.com/avatar/{}?s=110&d=mm".format(email_hash)

        return url


    @property
    def wikipedia_urls(self):
        articles = set()
        for my_product in self.products_with_dois:
            if my_product.post_counts_by_source("wikipedia"):
                articles.update(my_product.wikipedia_urls)
        return articles

    @property
    def distinct_fans_count(self):
        fans = set()
        for my_product in self.products_with_dois:
            for fan_name in my_product.twitter_posters_with_followers:
                fans.add(fan_name)
        return len(fans)

    @property
    def countries_using_mendeley(self):
        countries = set()
        for my_product in self.all_products:
            for my_country in my_product.countries_using_mendeley:
                if my_country:
                    countries.add(my_country)
        return sorted(countries)


    @property
    def countries(self):
        countries = set()
        for my_product in self.products_with_dois:
            for my_country in my_product.countries:
                if my_country:
                    countries.add(my_country)
        return sorted(countries)


    @property
    def subscores(self):
        resp = []
        subscore_names = ["buzz", "engagement", "openness", "fun"]
        for subscore_name in subscore_names:
            resp.append({
                "name": subscore_name,
                "display_name": subscore_name
            })
        return resp

    @property
    def sources(self):
        sources = []
        for source_name in sources_metadata:
            source = Source(source_name, self.products_with_dois)
            if source.posts_count > 0:
                sources.append(source)
        return sources


    # convenience so can have all of these set for one profile
    def set_post_details(self):
        for my_product in self.non_zero_products:
            my_product.set_post_details()


    def set_coauthors(self):
        # comment out the commit.  this means coauthors made during this commit session don't show up on this refresh
        # but doing it because is so much faster
        # safe_commit(db)

        # now go for it
        print u"running coauthors for {}".format(self.orcid_id)
        coauthor_orcid_id_query = u"""select distinct orcid_id
                    from product
                    where doi in
                      (select doi from product where orcid_id='{}')""".format(self.orcid_id)
        rows = db.engine.execute(text(coauthor_orcid_id_query))

        # remove own orcid_id
        orcid_ids = [row[0] for row in rows if row[0] if row[0] != self.id]
        if not orcid_ids:
            return

        # don't load products or badges
        coauthors = Person.query.filter(Person.orcid_id.in_(orcid_ids)).options(orm.noload('*')).all()

        resp = {}
        for coauthor in coauthors:
            resp[coauthor.orcid_id] = {
                "name": coauthor.full_name,
                "id": coauthor.id,
                "orcid_id": coauthor.orcid_id,
                "num_posts": coauthor.num_posts,
            }
        self.coauthors = resp


    def get_event_dates(self):
        event_dates = []

        for product in self.products_with_dois:
            if product.event_dates:
                for source, dates_list in product.event_dates.iteritems():
                    event_dates += dates_list
        # now sort them all
        event_dates.sort(reverse=False)
        return event_dates

    def set_event_counts(self):
        self.monthly_event_count = 0
        self.weekly_event_count = 0

        event_dates = self.get_event_dates()
        if not event_dates:
            return

        for event_date in event_dates:
            event_days_ago = days_ago(event_date)
            if event_days_ago <= 7:
                self.weekly_event_count += 1
            if event_days_ago <= 30:
                self.monthly_event_count += 1


    def get_tweeter_names(self, most_recent=None):
        twitter_posts = self.get_twitter_posts(most_recent)
        names = [post["attribution"] for post in twitter_posts if "attribution" in post]
        return names

    def get_twitter_posts(self, most_recent=None):
        twitter_posts = [post for post in self.get_posts() if post["source"]=="twitter"]
        if most_recent:
            twitter_posts = twitter_posts[0:most_recent]
        return twitter_posts

    def get_posts(self):
        posts = []
        for my_product in self.products_with_dois:
            posts += my_product.posts
        return posts


    @property
    def first_publishing_date(self):
        pubdates = [p.pubdate for p in self.products if p.pubdate]
        if pubdates:
            return min(pubdates)
        return None

    @property
    def openness_proportion(self):
        if not self.all_products:
            return None

        num_open_products = len([p for p in self.all_products if p.has_fulltext_url])

        # only defined if three or more products
        if self.num_products >= 3:
            openness = round((num_open_products / float(self.num_products)), 3)
        else:
            openness = None

        return openness


    def set_openness(self):
        self.openness = self.openness_proportion
        return self.openness


    def post_counts_by_source(self, source_name):
        if self.post_counts and source_name in self.post_counts:
            return self.post_counts[source_name]
        return 0

    def set_post_counts(self):
        self.post_counts = {}

        for p in self.products_with_dois:
            if p.post_counts:
                for metric, count in p.post_counts.iteritems():
                    try:
                        self.post_counts[metric] += int(count)
                    except KeyError:
                        self.post_counts[metric] = int(count)

        # print u"setting post_counts", self.post_counts


    def set_num_posts(self):
        self.num_posts = 0
        if self.post_counts:
            self.num_posts = sum(self.post_counts.values())

    def set_num_mentions(self):
        self.num_mentions = sum([p.num_mentions for p in self.all_products])

    def set_num_products(self):
        self.num_products = len(self.all_products)

    def get_token(self):
        payload = {
            'sub': self.orcid_id,
            'first_name': self.first_name,
            'family_name': self.family_name,
            'given_names': self.given_names,
            'claimed_at': date_as_iso_utc(self.claimed_at),
            'iat': datetime.datetime.utcnow(),
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=999),
        }
        token = jwt.encode(payload, os.getenv("JWT_KEY"))
        return token.decode('unicode_escape')

    @property
    def overview_badges(self):
        overview_possibilities = [b for b in self.badges_for_api if b.my_badge_type.show_in_ui]

        if len(overview_possibilities) <= 3:
            return overview_possibilities

        already_have_groups = []
        badges_to_return = []

        for my_badge in overview_possibilities:
            if my_badge.group not in already_have_groups and my_badge.group != "fun":
                badges_to_return.append(my_badge)
                already_have_groups.append(my_badge.group)

        if len(badges_to_return) < 3:
            for my_badge in overview_possibilities:
                if my_badge.group != "fun" and (my_badge.name not in [b.name for b in badges_to_return]):
                    badges_to_return.append(my_badge)

        return badges_to_return[0:3]

    @property
    def badges_for_api(self):
        badges = []
        for my_badge in self.badges:
            if my_badge.value and my_badge.my_badge_type.valid_badge:
                # custom exclusions specific to badge type
                badges.append(my_badge)

        badges.sort(key=lambda x: x.sort_score, reverse=True)


        # custom exclusions specific to badge type
        if len(badges) > 1:
            badges = [b for b in badges if b.name != "first_steps"]

        return badges

    def get_badge(self, badge_name):
        for my_badge in self.badges:
            if my_badge.name == badge_name:
                return my_badge
        return None

    def assign_badges(self, limit_to_badges=[]):

        for badge_assigner_class in badge.all_badge_assigners():

            badge_assigner = badge_assigner_class()
            if limit_to_badges:
                if badge_assigner.name not in limit_to_badges:
                    # isn't a badge we want to assign right now, so skip
                    continue

            candidate_badge = badge_assigner.get_badge_or_None(self)
            already_assigned_badge = self.get_badge(badge_assigner.name)

            if candidate_badge:
                if already_assigned_badge:
                    already_assigned_badge.level = candidate_badge.level
                    already_assigned_badge.value = candidate_badge.value
                    already_assigned_badge.products = candidate_badge.products
                    already_assigned_badge.support = candidate_badge.support
                    print u"{} already had badge, now updated {}".format(
                        self.id, already_assigned_badge)
                else:
                    print u"{} first time got badge {}".format(self.id, candidate_badge)
                    self.badges.append(candidate_badge)

                    if candidate_badge.name == 'babel':
                        print u"BABEL support: {}".format(candidate_badge.support)

            else:
                # print u"nope, {} doesn't get badge {}".format(self.id, badge_assigner.name)
                if already_assigned_badge:
                    print u"{} doesn't get badge {}, but had it before, so removing".format(self.id, badge_assigner.name)

                    if already_assigned_badge.name == 'babel':
                        print u"first, here was its BABEL support: {}".format(already_assigned_badge.support)
                        print u"used to have babel support on dois: {}".format(already_assigned_badge.dois)

                    badge.Badge.query.filter_by(id=already_assigned_badge.id).delete()


    def set_badge_percentiles(self, limit_to_badges=[]):
        badge_names = [my_badge.name for my_badge in self.badges]
        refsets = Refset.query.filter(Refset.name.in_(badge_names)).all()

        for my_badge in self.badges:
            if limit_to_badges:
                if my_badge.name not in limit_to_badges:
                    # isn't a badge we want to assign right now, so skip
                    continue

            if my_badge.name in badge.all_badge_assigner_names():
                # from http://stackoverflow.com/a/7125547/596939
                matching_refset = next((ref for ref in refsets if ref.name==my_badge.name), None)

                if matching_refset:
                    my_badge.set_percentile(matching_refset.cutoffs)


    @property
    def parsed_name(self):
        return u"{} {}".format(self.given_names, self.family_name)


    @property
    def full_name(self):
        return u"{} {}".format(self.given_names, self.family_name)


    # temp convenience, to run on a person
    def set_publisher(self):
        for p in self.products:
            p.set_publisher()


    @property
    def num_non_zero_products(self):
        return len(self.non_zero_products)

    @property
    def num_twitter_followers(self):
        try:
            return self.twitter_creds["followers_count"]
        except TypeError:
            return None


    @property
    def non_zero_products(self):
        resp = []
        for my_product in self.products_with_dois:
            if my_product.altmetric_score > 0:
                resp.append(my_product)
        return resp

    @property
    def display_coauthors(self):
        if not self.coauthors:
            return None
        else:
            ret = []
            for coauthor in self.coauthors.values():
                coauthor["sort_score"] = coauthor.get("num_posts", 0)
                ret.append(coauthor)
            return ret

    # convenience method
    def all_products_set_biblio_from_orcid(self):
        for p in self.all_products:
            p.set_biblio_from_orcid()

    @property
    def sorted_products(self):
        return sorted([p for p in self.products],
                key=lambda k: k.altmetric_score,
                reverse=True)

    @property
    def products_with_dois(self):
        ret = [p for p in self.all_products if p.doi]
        return ret

    @property
    def products_no_dois(self):
        ret = [p for p in self.all_products if not p.doi]
        return ret

    @property
    def products_with_mentions(self):
        ret = [p for p in self.all_products if p.has_mentions]
        return ret

    @property
    def all_products(self):
        ret = self.sorted_products
        return ret


    @property
    def mendeley_readers(self):
        total = 0
        for p in self.all_products:
            if p.mendeley_api_raw and "reader_count" in p.mendeley_api_raw:
                total += p.mendeley_api_raw["reader_count"]
        return total

    @property
    def mendeley_percent_of_products(self):
        if not self.all_products:
            return None

        count = 0
        for p in self.all_products:
            if p.mendeley_api_raw and "reader_count" in p.mendeley_api_raw:
                if p.mendeley_api_raw["reader_count"] >= 1:
                    count += 1
        return float(count) / len(self.all_products)

    @property
    def mendeley_countries(self):
        resp = {}
        for p in self.all_products:
            try:
                resp = update_recursive_sum(resp, p.mendeley_api_raw["reader_count_by_country"])
            except (AttributeError, TypeError):
                pass
        return resp

    @property
    def mendeley_disciplines(self):
        resp = {}
        for p in self.all_products:
            try:
                resp = update_recursive_sum(resp, p.mendeley_disciplines)
            except (AttributeError, TypeError):
                pass
        return resp

    @property
    def mendeley_job_titles(self):
        resp = {}
        for p in self.all_products:
            try:
                resp = update_recursive_sum(resp, p.mendeley_job_titles)
            except (AttributeError, TypeError):
                pass
        return resp

    @property
    def _mendeley_h_index(self):
        reader_counts = []
        for p in self.all_products:
            try:
                reader_counts.append(p.mendeley_api_raw["reader_count"])
            except (KeyError, TypeError):
                reader_counts.append(0)

        t_index = h_index(reader_counts)
        return t_index

    def __repr__(self):
        return u'<Person ({id}) "{given_names} {family_name}" >'.format(
            id=self.id,
            given_names=self.given_names,
            family_name=self.family_name
        )


    def to_dict(self):
        ret = {
            "_id": self.id,  # do this too, so it is on top
            "_full_name": self.full_name,
            "id": self.id,
            "orcid_id": self.orcid_id,
            "email": self.email,
            "first_name": self.first_name,
            "given_names": self.given_names,
            "family_name": self.family_name,
            "created": date_as_iso_utc(self.created),
            "updated": date_as_iso_utc(self.updated),
            "claimed_at": date_as_iso_utc(self.claimed_at),
            "picture": self.picture,
            "affiliation_name": self.affiliation_name,
            "affiliation_role_title": self.affiliation_role_title,
            "twitter": self.twitter,
            "depsy_id": self.depsy_id,
            "campaign": self.campaign,
            "percent_fulltext": self.openness_proportion,

            "num_posts": self.num_posts,
            "num_mentions": self.num_mentions,
            "num_orcid_products": len(self.all_products),
            "mendeley": {
                "country_percent": as_proportion(self.mendeley_countries),
                "subdiscipline_percent": as_proportion(self.mendeley_disciplines),
                "job_title_percent": as_proportion(self.mendeley_job_titles),
                "mendeley_url": None,
                "readers": self.mendeley_readers,
                "percent_of_products": self.mendeley_percent_of_products
            },
            "sources": [s.to_dict() for s in self.sources],
            "overview_badges": [b.to_dict() for b in self.overview_badges],
            "badges": [b.to_dict() for b in self.badges_for_api],
            "coauthors": self.display_coauthors,
            "subscores": self.subscores,
            "products": [p.to_dict() for p in self.all_products],
            "num_twitter_followers": self.num_twitter_followers
        }


        # for testing! no products for jason.
        # if self.orcid_id == "0000-0001-6187-6610":
        #     ret["products"] = []

        return ret


def h_index(citations):
    # from http://www.rainatian.com/2015/09/05/leetcode-python-h-index/

    citations.sort(reverse=True)

    i=0
    while (i<len(citations) and i+1 <= citations[i]):
        i += 1

    return i



