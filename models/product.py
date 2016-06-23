from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy.orm import deferred
from sqlalchemy import or_
from collections import defaultdict
import langdetect
import json
import shortuuid
import requests
import os
import re
import logging
import iso8601
import pytz
from time import sleep
from time import time
import datetime

from app import db
from util import remove_nonprinting_characters
from util import days_ago
from util import days_between
from util import normalize
from util import as_proportion

from models.source import sources_metadata
from models.source import Source
from models.country import country_info
from models.country import get_name_from_iso
from models.country import map_mendeley_countries
from models.language import get_language_from_abbreviation
from models.orcid import set_biblio_from_biblio_dict
from models.orcid import get_doi_from_biblio_dict
from models.orcid import clean_doi
from models.oa import dataset_doi_fragments
from models.oa import preprint_doi_fragments
from models.oa import open_doi_fragments
from models.oa import dataset_url_fragments
from models.oa import preprint_url_fragments
from models import oa
from models.mendeley import set_mendeley_data


def make_product(orcid_product_dict):
    my_product = Product()
    set_biblio_from_biblio_dict(my_product, orcid_product_dict)
    my_product.orcid_api_raw_json = orcid_product_dict
    return my_product

def distinct_product_list(new_product, list_so_far):
    products_with_this_title = [p for p in list_so_far if p.normalized_title==new_product.normalized_title]

    if not products_with_this_title:
        # print u"add new product {} because new title".format(new_product.normalized_title)
        if new_product.doi:
            # don't add if slightly different title if actually has the same doi
            if not new_product.doi in [p.doi for p in list_so_far if p.doi]:
                return list_so_far + [new_product]
        else:
            return list_so_far + [new_product]

    for product_in_list in products_with_this_title:

        if new_product.doi and not product_in_list.doi:
            # print u"add new product {} because has doi and other doesn't".format(new_product.normalized_title)
            # remove the old one, add this new one
            list_so_far.remove(product_in_list)
            return list_so_far + [new_product]

        if new_product.doi and product_in_list.doi:
            if new_product.doi == product_in_list.doi:
                # this is already here.
                # don't add it, no matter what else is in the list
                return list_so_far

            if new_product.doi != product_in_list.doi:
                if not new_product.isbn and not product_in_list.isbn:
                    # print u"add new product {} because dois not the same and no isbns".format(new_product.normalized_title)
                    return list_so_far + [new_product]

                elif new_product.isbn != product_in_list.isbn:
                    # print u"add new product {} because dois not the same and isbns not the same".format(new_product.normalized_title)
                    return list_so_far + [new_product]

    return list_so_far


def get_all_products(limit=100):
    q = db.session.query(Product.title, Product.doi, Product.id)
    q = q.filter( or_(
        Product.open_step=="closed",
        Product.open_step=="sherlock journal"
        )
    )
    q = q.filter(Product.doi != None)
    q = q.order_by(Product.id)
    q = q.limit(limit)
    products = q.all()
    return products


class Product(db.Model):
    id = db.Column(db.Text, primary_key=True)
    doi = db.Column(db.Text)
    orcid_id = db.Column(db.Text, db.ForeignKey('person.orcid_id'))
    created = db.Column(db.DateTime)

    title = db.Column(db.Text)
    journal = db.Column(db.Text)
    type = db.Column(db.Text)
    pubdate = db.Column(db.DateTime)
    year = db.Column(db.Text)
    authors = deferred(db.Column(db.Text))
    authors_short = db.Column(db.Text)
    url = db.Column(db.Text)
    arxiv = db.Column(db.Text)
    orcid_put_code = db.Column(db.Text)
    orcid_importer = db.Column(db.Text)

    orcid_api_raw_json = deferred(db.Column(JSONB))
    # crossref_api_raw = deferred(db.Column(JSONB))
    crossref_api_raw = db.Column(JSONB)
    altmetric_api_raw = deferred(db.Column(JSONB))
    # mendeley_api_raw = deferred(db.Column(JSONB)) #  @todo go back to this when done exploring
    mendeley_api_raw = db.Column(JSONB)

    altmetric_id = db.Column(db.Text)
    altmetric_score = db.Column(db.Float)
    post_counts = db.Column(MutableDict.as_mutable(JSONB))
    post_details = db.Column(MutableDict.as_mutable(JSONB))
    poster_counts = db.Column(MutableDict.as_mutable(JSONB))
    event_dates = db.Column(MutableDict.as_mutable(JSONB))

    repo_urls = db.Column(MutableDict.as_mutable(JSONB))  #change to list when upgrade to sqla 1.1
    base_dcoa = db.Column(db.Text)
    base_dcprovider = db.Column(db.Text)
    open_step = db.Column(db.Text)
    license_url = db.Column(db.Text)
    sherlock_response = db.Column(db.Text)
    sherlock_error = db.Column(db.Text)
    fulltext_url = db.Column(db.Text)
    user_supplied_fulltext_url = db.Column(db.Text)

    error = db.Column(db.Text)

    def __init__(self, **kwargs):
        self.id = shortuuid.uuid()[0:10]
        self.created = datetime.datetime.utcnow().isoformat()
        super(Product, self).__init__(**kwargs)

    def set_data_from_crossref(self, high_priority=False):
        if not self.doi:
            return

        # set_crossref_api_raw catches its own errors, but since this is the method
        # called by the thread from Person.set_data_from_crossref
        # want to have defense in depth and wrap this whole thing in a try/catch too
        try:
            # right now this is used for ISSN and license url
            self.set_crossref_api_raw(high_priority)
        except (KeyboardInterrupt, SystemExit):
            # let these ones through, don't save anything to db
            raise
        except Exception:
            logging.exception("exception in set_data_from_crossref")
            self.error = "error in set_data_from_crossref"
            print self.error
            print u"in generic exception handler, so rolling back in case it is needed"
            db.session.rollback()


    def set_oa_from_user_supplied_fulltext_url(self, url):
        self.user_supplied_fulltext_url = url
        self.fulltext_url = url
        self.open_step = "user supplied fulltext url"


    def set_oa_from_sherlock(self, high_priority=False):
        try:
            sherlock_request_list = []
            host = 0
            if self.base_dcoa=="2":
                host = "repo"
                for repo_url in self.repo_urls["urls"]:
                    sherlock_request_list.append([repo_url, host])
            elif self.doi:
                host = "journal"
                sherlock_request_list.append([self.url, host])
            elif self.url:
                host = "journal"
                sherlock_request_list.append([self.url, host])
            else:
                return  # shouldn't have been called

            self.sherlock_response = u"sherlock error: timeout on {}".format(host)

            url = u"http://sherlockoa.org/articles"
            # print u"calling sherlock with", sherlock_request_list
            r = requests.post(url, json=sherlock_request_list)
            if r and r.status_code==200:
                results = r.json()["results"]
                open_responses = [r for r in results if r["is_oa"]]
                error_responses = [r for r in results if "error" in r]
                if open_responses:
                    response = open_responses[0]
                    print u"sherlock says it is open!", response["url"]
                    self.fulltext_url = response["url"]
                    self.open_step = "sherlock {}".format(response["host"])
                    self.sherlock_response = u"sherlock says: open {}".format(response["host"])
                elif error_responses:
                    response = error_responses[0]
                    print u"sherlock says error: {} {}".format(host, response["error"])
                    self.fulltext_url = None
                    self.sherlock_response = u"sherlock error: {} {}".format(host, response["error"])
                    self.sherlock_error = response["error_message"]
                else:
                    # print u"sherlock says it is closed:", sherlock_request_list
                    self.sherlock_response = u"sherlock says: closed {}".format(host)

        except (KeyboardInterrupt, SystemExit):
            # let these ones through, don't save anything to db
            raise
        except Exception:
            logging.exception("exception in set_oa_from_sherlock")
            print u"rolling back in case it is needed"
            db.session.rollback()


    def set_biblio_from_orcid(self):
        if not self.orcid_api_raw_json:
            print u"no self.orcid_api_raw_json for product {}".format(self.id)
        orcid_biblio_dict = self.orcid_api_raw_json
        set_biblio_from_biblio_dict(self, orcid_biblio_dict)


    def set_data_from_altmetric(self, high_priority=False):
        # set_altmetric_api_raw catches its own errors, but since this is the method
        # called by the thread from Person.set_data_from_altmetric_for_all_products
        # want to have defense in depth and wrap this whole thing in a try/catch too
        # in case errors in calculate or anything else we add.
        try:
            self.set_altmetric_api_raw(high_priority)
            self.calculate()
        except (KeyboardInterrupt, SystemExit):
            # let these ones through, don't save anything to db
            raise
        except Exception:
            logging.exception("exception in set_data_from_altmetric")
            self.error = "error in set_data_from_altmetric"
            print self.error
            print u"in generic exception handler, so rolling back in case it is needed"
            db.session.rollback()


    def calculate(self):
        if self.doi:
            self.url = u"http://doi.org/{}".format(self.doi)
        self.set_altmetric_score()
        self.set_altmetric_id()
        self.set_post_counts()
        self.set_poster_counts()
        self.set_post_details()
        self.set_event_dates()
        self.set_license_url()
        self.set_publisher()

    @property
    def display_authors(self):
        return self.authors_short

    @property
    def has_fulltext_url(self):
        return (self.fulltext_url != None)


    def set_altmetric_score(self):
        self.altmetric_score = 0
        try:
            self.altmetric_score = self.altmetric_api_raw["score"]
            # print u"set score to", self.altmetric_score
        except (KeyError, TypeError):
            pass

    def set_data_from_mendeley(self, high_priority=False):
        # set_altmetric_api_raw catches its own errors, but since this is the method
        # called by the thread from Person.set_data_from_altmetric_for_all_products
        # want to have defense in depth and wrap this whole thing in a try/catch too
        # in case errors in calculate or anything else we add.
        try:
            self.mendeley_api_raw = set_mendeley_data(self)
        except (KeyboardInterrupt, SystemExit):
            # let these ones through, don't save anything to db
            raise
        except Exception:
            logging.exception("exception in set_data_from_mendeley")
            self.error = "error in set_data_from_mendeley"
            print self.error
            print u"in generic exception handler, so rolling back in case it is needed"
            db.session.rollback()

    def get_abstract(self):
        try:
            abstract = self.altmetric_api_raw["citation"]["abstract"]
        except (KeyError, TypeError):
            abstract = None
        return abstract

    def get_abstract_using_mendeley(self):
        abstract = None
        if self.mendeley_api_raw and "abstract" in self.mendeley_api_raw:
            abstract = self.mendeley_api_raw["abstract"]
        else:
            try:
                abstract = self.altmetric_api_raw["citation"]["abstract"]
            except (KeyError, TypeError):
                pass

        return abstract


    def post_counts_by_source(self, source):
        if not self.post_counts:
            return 0

        if source in self.post_counts:
            return self.post_counts[source]
        return 0

    @property
    def num_posts(self):
        if self.post_counts:
            return sum(self.post_counts.values())
        return 0

    @property
    def posts(self):
        if self.post_details and "list" in self.post_details:
            ret = []
            for post in self.post_details["list"]:
                if post["source"] in sources_metadata:
                    ret.append(post)
            return ret
        return []

    def set_post_details(self):
        if not self.altmetric_api_raw or \
                ("posts" not in self.altmetric_api_raw) or \
                (not self.altmetric_api_raw["posts"]):
            return

        all_post_dicts = []

        for (source, posts) in self.altmetric_api_raw["posts"].iteritems():
            for post in posts:
                post_dict = {}
                post_dict["source"] = source

                if source == "twitter":
                    if "author" in post:
                        if "id_on_source" in post["author"]:
                            post_dict["twitter_handle"] = post["author"]["id_on_source"]
                        if "followers" in post["author"]:
                            post_dict["followers"] = post["author"]["followers"]

                # useful parts
                if "posted_on" in post:
                    post_dict["posted_on"] = post["posted_on"]

                if "author" in post and "name" in post["author"]:
                    post_dict["attribution"] = post["author"]["name"]

                if "page_url" in post:
                    # for wikipedia.  we want this one not what is under url
                    post_dict["url"] = post["page_url"]
                elif "url" in post:
                    post_dict["url"] = post["url"]

                # title or summary depending on post type
                if source in ["blogs", "f1000", "news", "q&a", "reddit", "wikipedia"] and "title" in post:
                    post_dict["title"] = post["title"]
                    if source == "wikipedia" and "summary" in post:
                        post_dict["summary"] = post["summary"]
                elif "summary" in post:
                    title = post["summary"]
                    # remove urls.  From http://stackoverflow.com/a/11332580/596939
                    title = re.sub(r'^https?:\/\/.*[\r\n]*', '', title, flags=re.MULTILINE)
                    if not title:
                        title = "No title."
                    if len(title.split()) > 15:
                        first_few_words = title.split()[:15]
                        title = u" ".join(first_few_words)
                        title = u"{} \u2026".format(title)
                    post_dict["title"] = title
                else:
                    post_dict["title"] = ""

                all_post_dicts.append(post_dict)

        all_post_dicts = sorted(all_post_dicts, key=lambda k: k["posted_on"], reverse=True)
        all_post_dicts = sorted(all_post_dicts, key=lambda k: k["source"])

        self.post_details = {"list": all_post_dicts}
        return self.post_details

    def set_post_counts(self):
        self.post_counts = {}

        if not self.altmetric_api_raw or "counts" not in self.altmetric_api_raw:
            return

        exclude_keys = ["total", "readers"]
        for k in self.altmetric_api_raw["counts"]:
            if k not in exclude_keys:
                source = k
                count = int(self.altmetric_api_raw["counts"][source]["posts_count"])
                self.post_counts[source] = count
                # print u"setting posts for {source} to {count} for {doi}".format(
                #     source=source,
                #     count=count,
                #     doi=self.doi)


    def set_poster_counts(self):
        self.poster_counts = {}
        if not self.altmetric_api_raw or "counts" not in self.altmetric_api_raw:
            return

        exclude_keys = ["total", "readers"]
        for k in self.altmetric_api_raw["counts"]:
            if k not in exclude_keys:
                source = k
                count = int(self.altmetric_api_raw["counts"][source]["unique_users_count"])
                self.poster_counts[source] = count
                # print u"setting posters for {source} to {count} for {doi}".format(
                #     source=source,
                #     count=count,
                #     doi=self.doi)


    # @property
    # def tweeters(self):
    #     if self.tweeter_details and "list" in self.tweeter_details:
    #         return self.tweeter_details["list"]
    #     return []
    #
    # def set_tweeter_details(self):
    #     if not self.altmetric_api_raw or \
    #             ("posts" not in self.altmetric_api_raw) or \
    #             (not self.altmetric_api_raw["posts"]):
    #         return
    #
    #     if not "twitter" in self.altmetric_api_raw["posts"]:
    #         return
    #
    #     tweeter_dicts = {}
    #
    #     for post in self.altmetric_api_raw["posts"]["twitter"]:
    #         twitter_handle = post["author"]["id_on_source"]
    #
    #         if twitter_handle not in tweeter_dicts:
    #             tweeter_dict = {}
    #             tweeter_dict["url"] = u"http://twitter.com/{}".format(twitter_handle)
    #
    #             if "name" in post["author"]:
    #                 tweeter_dict["name"] = post["author"]["name"]
    #
    #             if "image" in post["author"]:
    #                 tweeter_dict["img"] = post["author"]["image"]
    #
    #             if "description" in post["author"]:
    #                 tweeter_dict["description"] = post["author"]["description"]
    #
    #             if "followers" in post["author"]:
    #                 tweeter_dict["followers"] = post["author"]["followers"]
    #
    #             tweeter_dicts[twitter_handle] = tweeter_dict
    #
    #     self.tweeter_details = {"list": tweeter_dicts.values()}


    @property
    def event_days_ago(self):
        if not self.event_dates:
            return {}
        resp = {}
        for source, date_list in self.event_dates.iteritems():
            resp[source] = [days_ago(event_date_string) for event_date_string in date_list]
        return resp

    @property
    def event_days_since_publication(self):
        if not self.event_dates or not self.pubdate:
            return {}
        resp = {}
        for source, date_list in self.event_dates.iteritems():
            resp[source] = [days_between(event_date_string, self.pubdate.isoformat()) for event_date_string in date_list]
        return resp

    def set_event_dates(self):
        self.event_dates = {}

        if not self.altmetric_api_raw or "posts" not in self.altmetric_api_raw:
            return
        if self.altmetric_api_raw["posts"] == []:
            return

        for source, posts in self.altmetric_api_raw["posts"].iteritems():
            for post in posts:
                post_date = post["posted_on"]
                if source not in self.event_dates:
                    self.event_dates[source] = []
                self.event_dates[source].append(post_date)

        # now sort them all
        for source in self.event_dates:
            self.event_dates[source].sort(reverse=False)
            # print u"set event_dates for {} {}".format(self.doi, source)

    @property
    def first_author_family_name(self):
        first_author = None
        if self.authors:
            try:
                first_author = self.authors.split(u",")[0]
            except UnicodeEncodeError:
                print u"unicode error on", self.authors
        return first_author


    def set_doi_from_crossref_biblio_lookup(self, high_priority=False):
        if self.doi:
            return None

        if self.title and self.first_author_family_name:
            # print u"self.first_author_family_name", self.first_author_family_name
            url_template = u"""http://doi.crossref.org/servlet/query?pid=team@impactstory.org&qdata= <?xml version="1.0"?> <query_batch version="2.0" xsi:schemaLocation="http://www.crossref.org/qschema/2.0 http://www.crossref.org/qschema/crossref_query_input2.0.xsd" xmlns="http://www.crossref.org/qschema/2.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"> <head> <email_address>support@crossref.org</email_address><doi_batch_id>ABC_123_fff </doi_batch_id> </head> <body> <query enable-multiple-hits="true" secondary-query="author-title-multiple-hits">   <article_title match="exact">{title}</article_title>    <author search-all-authors="true" match="exact">{first_author}</author> </query> </body></query_batch>"""
            url = url_template.format(
                title = self.title,
                first_author = self.first_author_family_name
            )
            try:
                r = requests.get(url, timeout=5)
                if r.status_code==200 and r.text and u"|" in r.text:
                    doi = r.text.rsplit(u"|", 1)[1]
                    if doi and doi.startswith(u"10."):
                        doi = doi.strip()
                        if doi:
                            print u"got a doi! {}".format(doi)
                            self.doi = doi
                            return doi
            except requests.Timeout:
                pass
                # print "timeout"

        # print ".",
        return None


    def set_crossref_api_raw(self, high_priority=False):
        try:
            self.error = None

            headers={"Accept": "application/json", "User-Agent": "impactstory.org"}
            url = u"http://api.crossref.org/works/{doi}".format(doi=self.clean_doi)

            # might throw requests.Timeout
            # print u"calling {} with headers {}".format(url, headers)

            r = requests.get(url, headers=headers, timeout=10)  #timeout in seconds

            if r.status_code == 404: # not found
                self.crossref_api_raw = {"error": "404"}
            elif r.status_code == 200:
                self.crossref_api_raw = r.json()["message"]
            else:
                self.error = u"got unexpected crossref status_code code {}".format(r.status_code)

        except (KeyboardInterrupt, SystemExit):
            # let these ones through, don't save anything to db
            raise
        except requests.Timeout:
            self.error = "timeout from requests when getting crossref data"
        except Exception:
            logging.exception("exception in set_crossref_api_raw")
            self.error = "misc error in set_crossref_api_raw"
            print u"in generic exception handler, so rolling back in case it is needed"
            db.session.rollback()
        finally:
            if self.error:
                print u"ERROR on {doi} profile {orcid_id}: {error}, calling {url}".format(
                    doi=self.clean_doi,
                    orcid_id=self.orcid_id,
                    error=self.error,
                    url=url)


    def set_altmetric_api_raw(self, high_priority=False):
        try:
            self.error = None
            self.altmetric_api_raw = None

            if not self.doi:
                return

            url = u"http://api.altmetric.com/v1/fetch/doi/{doi}?key={key}".format(
                doi=self.clean_doi,
                key=os.getenv("ALTMETRIC_KEY")
            )
            # print u"calling {}".format(url)

            # might throw requests.Timeout
            r = requests.get(url, timeout=10)  #timeout in seconds

            # handle rate limit stuff
            if "x-hourlyratelimit-remaining" in r.headers:
                hourly_rate_limit_remaining = int(r.headers["x-hourlyratelimit-remaining"])
                if hourly_rate_limit_remaining != 3600:
                    print u"hourly_rate_limit_remaining=", hourly_rate_limit_remaining
            else:
                hourly_rate_limit_remaining = None

            if (hourly_rate_limit_remaining and (hourly_rate_limit_remaining < 500) and not high_priority) or \
                    r.status_code == 420:
                print u"sleeping for an hour until we have more calls remaining"
                sleep(60*60) # an hour

            # Altmetric.com doesn't have this DOI, so the DOI has no metrics.
            if r.status_code == 404:
                # altmetric.com doesn't have any metrics for this doi
                self.altmetric_api_raw = {"error": "404"}
            elif r.status_code == 403:
                if r.text == "You must have a commercial license key to use this call.":
                    # this is the error we get when we have a bad doi with a # in it.  Record, but don't throw error
                    self.altmetric_api_raw = {"error": "403. Altmetric.com says must have a commercial license key to use this call"}
                else:
                    self.error = 'got a 403 for unknown reasons'
            elif r.status_code == 420:
                self.error = "hard-stop rate limit error setting altmetric.com metrics"
            elif r.status_code == 400:
                self.altmetric_api_raw = {"error": "400. Altmetric.com says bad doi"}
            elif r.status_code == 200:
                # we got a good status code, the DOI has metrics.
                self.altmetric_api_raw = r.json()
                # print u"yay nonzero metrics for {doi}".format(doi=self.doi)
            else:
                self.error = u"got unexpected altmetric status_code code {}".format(r.status_code)

        except (KeyboardInterrupt, SystemExit):
            # let these ones through, don't save anything to db
            raise
        except requests.Timeout:
            self.error = "timeout from requests when getting altmetric.com metrics"
        except Exception:
            logging.exception("exception in set_altmetric_api_raw")
            self.error = "misc error in set_altmetric_api_raw"
            print u"in generic exception handler, so rolling back in case it is needed"
            db.session.rollback()
        finally:
            if self.error:
                print u"ERROR on {doi} profile {orcid_id}: {error}, calling {url}".format(
                    doi=self.clean_doi,
                    orcid_id=self.orcid_id,
                    error=self.error,
                    url=url)

    def set_altmetric_id(self):
        try:
            self.altmetric_id = self.altmetric_api_raw["altmetric_id"]
        except (KeyError, TypeError):
            self.altmetric_id = None

    def set_publisher(self):
        try:
            self.publisher = self.crossref_api_raw["publisher"]
        except (KeyError, TypeError):
            pass

    def set_license_url(self):
        try:
            self.license_url = self.crossref_api_raw["license"][0]["URL"]
        except (KeyError, TypeError):
            pass


    @property
    def sources(self):
        sources = []
        for source_name in sources_metadata:
            source = Source(source_name, [self])
            if source.posts_count > 0:
                sources.append(source)
        return sources

    @property
    def events_last_week_count(self):
        events_last_week_count = 0
        for source in self.sources:
            events_last_week_count += source.events_last_week_count
        return events_last_week_count

    @property
    def normalized_title(self):
        return normalize(self.display_title)

    @property
    def display_title(self):
        if self.title:
            return self.title
        else:
            return "No title"

    @property
    def year_int(self):
        if not self.year:
            return 0
        return int(self.year)

    @property
    def countries(self):
        return [get_name_from_iso(my_country) for my_country in self.post_counts_by_iso_country.keys()]

    @property
    def countries_using_mendeley(self):
         return [my_country for my_country in self.post_counts_by_country_using_mendeley.keys()]

    @property
    def mendeley_url(self):
        try:
            return self.mendeley_api_raw["mendeley_url"]
        except (KeyError, TypeError):
            return None

    @property
    def mendeley_job_titles(self):
        resp = defaultdict(int)
        title_lookup = {
            "Librarian": "Librarian",
            "Student  > Bachelor": "Undergrad Student",
            "Student (Bachelor)": "Undergrad Student",
            "Student (Master)": "Masters Student",
            "Student (Postgraduate)": "Masters Student",
            "Student  > Master": "Masters Student",
            "Student  > Postgraduate": "Masters Student",
            "Doctoral Student": "PhD Student",
            "Ph.D. Student": "PhD Student",
            "Student  > Doctoral Student": "PhD Student",
            "Student  > Ph. D. Student": "PhD Student",
            "Post Doc": "Postdoc",
            "Professor": "Faculty",
            "Associate Professor": "Faculty",
            "Assistant Professor": "Faculty",
            "Professor > Associate Professor": "Faculty",
            "Professor > Assistant Professor": "Faculty",
            "Senior Lecturer": "Faculty",
            "Lecturer > Senior Lecturer": "Faculty",
            "Lecturer": "Faculty",
            "Researcher (at an Academic Institution)": "Faculty",
            "Researcher (at a non-Academic Institution)": "Researcher (non-academic)",
            "Other Professional": "Other",
          }

        if self.mendeley_api_raw and self.mendeley_api_raw["reader_count_by_academic_status"]:
            for raw_title, count in self.mendeley_api_raw["reader_count_by_academic_status"].iteritems():
                standardized_title = title_lookup.get(raw_title, raw_title)
                resp[standardized_title] += count
        return resp

    @property
    def mendeley_disciplines(self):
        resp = {}
        if self.mendeley_api_raw and self.mendeley_api_raw["reader_count_by_subdiscipline"]:
            for discipline, subdiscipline_dict in self.mendeley_api_raw["reader_count_by_subdiscipline"].iteritems():
                resp[discipline] = sum(subdiscipline_dict.values())
        return resp

    @property
    def post_counts_by_country_using_mendeley(self):
        posts_by_country = {}

        if self.mendeley_api_raw and self.mendeley_api_raw["reader_count_by_country"]:
            for mendeley_country_name, count in self.mendeley_api_raw["reader_count_by_country"].iteritems():
                country_name = map_mendeley_countries.get(mendeley_country_name, mendeley_country_name)
                posts_by_country[country_name] = count

        try:
            for iso_country, count in self.altmetric_api_raw["demographics"]["geo"]["twitter"].iteritems():
                country_name = get_name_from_iso(iso_country)
                if country_name in posts_by_country:
                    posts_by_country[country_name] += count
                else:
                    posts_by_country[country_name] = count
        except (KeyError, TypeError):
            pass
        return posts_by_country

    @property
    def post_counts_by_iso_country(self):
        try:
            resp = self.altmetric_api_raw["demographics"]["geo"]["twitter"]
        except (KeyError, TypeError):
            resp = {}
        return resp

    @property
    def poster_counts_by_type(self):
        try:
            resp = self.altmetric_api_raw["demographics"]["users"]["twitter"]["cohorts"]
            if not resp:
                resp = {}
        except (KeyError, TypeError):
            resp = {}
        return resp

    def has_source(self, source_name):
        if self.post_counts:
            return (source_name in self.post_counts)
        return False

    @property
    def impressions(self):
        return sum(self.twitter_posters_with_followers.values())


    def get_tweeter_posters_full_names(self, most_recent=None):
        names = []

        try:
            posts = self.altmetric_api_raw["posts"]["twitter"]
        except (KeyError, TypeError):
            return names

        if most_recent:
            posts = sorted(posts, key=lambda k: k["posted_on"], reverse=True)
            posts = posts[0:most_recent]
        for post in posts:
            try:
                names.append(post["author"]["name"])
            except (KeyError, TypeError):
                pass
        return names

    @property
    def follower_count_for_each_tweet(self):
        follower_counts = []
        try:
            twitter_posts = self.altmetric_api_raw["posts"]["twitter"]
        except (KeyError, TypeError):
            return {}

        for post in twitter_posts:
            try:
                poster = post["author"]["id_on_source"]
                followers = post["author"]["followers"]
                follower_counts.append(followers)
            except (KeyError, TypeError):
                pass
        return follower_counts

    @property
    def twitter_posters_with_followers(self):
        posters = {}
        try:
            twitter_posts = self.altmetric_api_raw["posts"]["twitter"]
        except (KeyError, TypeError):
            return {}

        for post in twitter_posts:
            try:
                poster = post["author"]["id_on_source"]
                followers = post["author"]["followers"]
                posters[poster] = followers
            except (KeyError, TypeError):
                pass
        return posters


    def f1000_urls_for_class(self, f1000_class):
        urls = []
        try:
            for post in self.altmetric_api_raw["posts"]["f1000"]:
                if f1000_class in post["f1000_classes"]:
                    urls.append(u"<a href='{}'>Review</a>".format(post["url"]))
        except (KeyError, TypeError):
            urls = []
        return urls

    @property
    def impact_urls(self):
        try:
            urls = self.altmetric_api_raw["citation"]["links"]
        except (KeyError, TypeError):
            urls = []
        return urls

    @property
    def languages_with_examples(self):
        resp = {}

        try:
            for (source, posts) in self.altmetric_api_raw["posts"].iteritems():
                for post in posts:
                    for key in ["title", "summary"]:
                        try:
                            num_words_in_post = len(post[key].split(" "))
                            top_detection = langdetect.detect_langs(post[key])[0]
                            if (num_words_in_post > 7) and (top_detection.prob > 0.90):

                                if top_detection.lang != "en":
                                    language_name = get_language_from_abbreviation(top_detection.lang)
                                    # print u"LANGUAGE:", language_name, top_detection.prob, post[key]

                                    # overwrites.  that's ok, we just want one example
                                    resp[language_name] = post["url"]

                        except langdetect.lang_detect_exception.LangDetectException:
                            pass

        except (KeyError, AttributeError, TypeError):
            pass

        return resp


    @property
    def publons_reviews(self):
        reviews = []
        try:
            for post in self.altmetric_api_raw["posts"]["peer_reviews"]:
                if post["pr_id"] == "publons":
                    reviews.append({
                        "url": post["publons_article_url"],
                        "publons_weighted_average": post["publons_weighted_average"]
                    })
        except (KeyError, TypeError):
            reviews = []
        return reviews

    @property
    def wikipedia_urls(self):
        articles = []
        try:
            for post in self.altmetric_api_raw["posts"]["wikipedia"]:
                articles.append(u"<a href='{}'>{}</a>".format(
                    post["page_url"],
                    post["title"]))
        except (KeyError, TypeError):
            articles = []
        return articles

    def has_country(self, country_name):
        return (country_name in self.countries)

    def has_country_using_mendeley(self, country_name):
        return (country_name in self.countries_using_mendeley)


    @property
    def clean_doi(self):
        # this shouldn't be necessary because we clean DOIs
        # before we put them in. however, there are a few legacy ones that were
        # not fully cleaned. this igis to deal with them.
        return clean_doi(self.doi)

    def __repr__(self):
        return u'<Product ({id}) {doi}>'.format(
            id=self.id,
            doi=self.doi
        )

    def guess_genre(self):

        if self.type:
            if "data" in self.type:
                return "dataset"
            elif (self.doi and ".figshare." in self.doi) or (self.url and ".figshare." in self.url):
                if self.type:
                    if ("article" in self.type or "paper" in self.type):
                        return "preprint"
                    else:
                        return self.type.replace("_", "-")
                else:
                    return "preprint"
            elif self.doi and any(fragment in self.doi for fragment in dataset_doi_fragments):
                return "dataset"
            elif self.url and any(fragment in self.url for fragment in dataset_url_fragments):
                return "dataset"
            elif "poster" in self.type:
                return "poster"
            elif "abstract" in self.type:
                return "abstract"
            elif self.doi and any(fragment in self.doi for fragment in preprint_doi_fragments):
                return "preprint"
            elif self.url and any(fragment in self.url for fragment in preprint_url_fragments):
                return "preprint"
            elif "article" in self.type:
                return "article"
            else:
                return self.type.replace("_", "-")
        return "article"

    @property
    def mendeley_countries(self):
        resp = None
        try:
            resp = self.mendeley_api_raw["reader_count_by_country"]
        except (AttributeError, TypeError):
            pass
        return resp

    @property
    def num_mentions(self):
        return self.num_posts + self.mendeley_readers

    @property
    def has_mentions(self):
        return (self.num_mentions >= 1)

    @property
    def mendeley_readers(self):
        resp = 0
        try:
            resp = self.mendeley_api_raw["reader_count"]
        except (AttributeError, TypeError):
            pass
        return resp

    @property
    def issns(self):
        try:
            return self.crossref_api_raw["ISSN"]
        except (AttributeError, TypeError, KeyError):
            return None

    def set_local_lookup_oa(self):
        start_time = time()

        open_reason = None
        open_url = self.url


        if oa.is_open_via_doaj_issn(self.issns):
            open_reason = "doaj issn"
        elif oa.is_open_via_doaj_journal(self.journal):
            open_reason = "doaj journal"
        elif oa.is_open_via_arxiv(self.arxiv):
            open_reason = "arxiv"
            open_url = u"http://arxiv.org/abs/{}".format(self.arxiv)  # override because open url isn't the base url
        elif oa.is_open_via_datacite_prefix(self.doi):
            open_reason = "datacite prefix"
        elif oa.is_open_via_license_url(self.license_url):
            open_reason = "license url"
        elif oa.is_open_via_doi_fragment(self.doi):
            open_reason = "doi fragment"
        elif oa.is_open_via_url_fragment(self.url):
            open_reason = "url fragment"

        if open_reason:
            self.fulltext_url = open_url
            self.open_step = u"local lookup: {}".format(open_reason)


    def to_dict(self):
        return {
            "id": self.id,
            "mendeley": {
                "country_percent": as_proportion(self.mendeley_countries),
                "subdiscipline_percent": as_proportion(self.mendeley_disciplines),
                "job_title_percent": as_proportion(self.mendeley_job_titles),
                "readers": self.mendeley_readers,
                "mendeley_url": self.mendeley_url
            },
            "doi": self.doi,
            "url": self.url,
            "orcid_id": self.orcid_id,
            "year": self.year,
            "_title": self.display_title,  # duplicate just for api reading help
            "title": self.display_title,
            # "title_normalized": self.normalized_title,
            "journal": self.journal,
            "authors": self.display_authors,
            "altmetric_id": self.altmetric_id,
            "altmetric_score": self.altmetric_score,
            "num_posts": self.num_posts,
            "num_mentions": self.num_mentions,
            "sources": [s.to_dict() for s in self.sources],
            "posts": self.posts,
            "events_last_week_count": self.events_last_week_count,
            "genre": self.guess_genre(),
            "is_open": self.has_fulltext_url,
            "has_fulltext_url": self.has_fulltext_url,
            "fulltext_url": self.fulltext_url
        }





