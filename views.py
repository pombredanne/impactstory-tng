from app import app
from app import db

from models.person import Person
from models.person import make_person
from models.person import set_person_email
from models.person import set_person_claimed_at
from models.person import link_twitter
from models.person import refresh_profile
from models.person import add_or_overwrite_person_from_orcid_id
from models.person import delete_person
from models.product import get_all_products
from models.refset import num_people_in_db
from models.orcid import OrcidDoesNotExist
from models.orcid import NoOrcidException
from models.badge import badge_configs
from models.search import autocomplete
from models.url_slugs_to_redirect import url_slugs_to_redirect
from util import safe_commit

from flask import make_response
from flask import request
from flask import redirect
from flask import abort
from flask import jsonify
from flask import render_template
from flask import send_file
from flask import g

import jwt
from jwt import DecodeError
from jwt import ExpiredSignature
from functools import wraps
import requests
import stripe
from requests_oauthlib import OAuth1
import os
import time
import json
import logging
from urlparse import parse_qs, parse_qsl
from time import sleep

logger = logging.getLogger("views")


def json_dumper(obj):
    """
    if the obj has a to_dict() function we've implemented, uses it to get dict.
    from http://stackoverflow.com/a/28174796
    """
    try:
        return obj.to_dict()
    except AttributeError:
        return obj.__dict__


def json_resp(thing):
    # hide_keys = request.args.get("hide", "").split(",")
    # if hide_keys:
    #     for key_to_hide in hide_keys:
    #         try:
    #             del thing[key_to_hide]
    #         except KeyError:
    #             pass

    json_str = json.dumps(thing, sort_keys=True, default=json_dumper, indent=4)

    if request.path.endswith(".json") and (os.getenv("FLASK_DEBUG", False) == "True"):
        logger.info(u"rendering output through debug_api.html template")
        resp = make_response(render_template(
            'debug_api.html',
            data=json_str))
        resp.mimetype = "text/html"
    else:
        resp = make_response(json_str, 200)
        resp.mimetype = "application/json"
    return resp


def abort_json(status_code, msg):
    body_dict = {
        "HTTP_status_code": status_code,
        "message": msg,
        "error": True
    }
    resp_string = json.dumps(body_dict, sort_keys=True, indent=4)
    resp = make_response(resp_string, status_code)
    resp.mimetype = "application/json"
    abort(resp)


@app.route("/<path:page>")  # from http://stackoverflow.com/a/14023930/226013
@app.route("/")
def index_view(path="index", page=""):

    if page.lower() in url_slugs_to_redirect:
        return redirect(u"http://v1.impactstory.org/{}".format(page.strip()), code=302)

    return render_template(
        'index.html',
        is_local=os.getenv("IS_LOCAL", False),
        stripe_publishable_key=os.getenv("STRIPE_PUBLISHABLE_KEY")
    )


#support CORS
@app.after_request
def add_crossdomain_header(resp):
    resp.headers['Access-Control-Allow-Origin'] = "*"
    resp.headers['Access-Control-Allow-Methods'] = "POST, GET, OPTIONS, PUT, DELETE, PATCH, HEAD"
    resp.headers['Access-Control-Allow-Headers'] = "origin, content-type, accept, x-requested-with, authorization"
    return resp

@app.before_request
def redirects():
    new_url = None

    try:
        if request.headers["X-Forwarded-Proto"] == "https":
            pass
        elif "http://" in request.url:
            new_url = request.url.replace("http://", "https://")
    except KeyError:
        #logger.debug(u"There's no X-Forwarded-Proto header; assuming localhost, serving http.")
        pass

    if request.url.startswith("https://www.impactstory.org"):
        new_url = request.url.replace(
            "https://www.impactstory.org",
            "https://impactstory.org"
        )
        logger.debug(u"URL starts with www; redirecting to " + new_url)

    if new_url:
        return redirect(new_url, 301)  # permanent


@app.route('/small-logo.png')
def logo_small():
    filename = "static/img/impactstory-logo.png"
    return send_file(filename, mimetype='image/png')


###########################################################################
# from satellizer.
# move to another file later
# this is copied from early GitHub-login version of Depsy. It's here:
# https://github.com/Impactstory/depsy/blob/ed80c0cb945a280e39089822c9b3cefd45f24274/views.py
###########################################################################




def parse_token(req):
    token = req.headers.get('Authorization').split()[1]
    return jwt.decode(token, os.getenv("JWT_KEY"))


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not request.headers.get('Authorization'):
            response = jsonify(message='Missing authorization header')
            response.status_code = 401
            return response

        try:
            payload = parse_token(request)
        except DecodeError:
            response = jsonify(message='Token is invalid')
            response.status_code = 401
            return response
        except ExpiredSignature:
            response = jsonify(message='Token has expired')
            response.status_code = 401
            return response

        g.me_orcid_id = payload['sub']

        return f(*args, **kwargs)

    return decorated_function











###########################################################################
# API
###########################################################################
@app.route("/api")
def api_test():
    return json_resp({"resp": "Impactstory: The Next Generation."})

@app.route("/api/test")
def test0():
    return jsonify({"test": True})

@app.route("/api/person/<orcid_id>")
@app.route("/api/person/<orcid_id>.json")
def profile_endpoint(orcid_id):
    my_person = Person.query.filter_by(orcid_id=orcid_id).first()
    if not my_person:
        try:
            my_person = make_person(orcid_id, high_priority=True)
        except (OrcidDoesNotExist, NoOrcidException):
            print u"returning 404: orcid profile {} does not exist".format(orcid_id)
            abort_json(404, "That ORCID profile doesn't exist")
    return json_resp(my_person.to_dict())


@app.route("/api/person/twitter_screen_name/<screen_name>")
@app.route("/api/person/twitter_screen_name/<screen_name>.json")
def profile_endpoint_twitter(screen_name):
    res = db.session.query(Person.id).filter_by(twitter=screen_name).first()
    if not res:
        abort_json(404, "We don't have anyone with that twitter screen name")

    return json_resp({"id": res[0]})


@app.route("/api/person/<orcid_id>", methods=["POST"])
@app.route("/api/person/<orcid_id>.json", methods=["POST"])
def refresh_profile_endpoint(orcid_id):
    if request.json:
        my_person = Person.query.filter_by(orcid_id=orcid_id).first()

        product_id = request.json["product"]["id"]
        my_product = next(my_product for my_product in my_person.products if my_product.id==product_id)
        url = request.json["product"]["fulltext_url"]
        my_product.set_oa_from_user_supplied_fulltext_url(url)

        my_person.recalculate_openness()

        safe_commit(db)
    else:
        my_person = refresh_profile(orcid_id)
    return json_resp(my_person.to_dict())

@app.route("/api/person/<orcid_id>/fulltext", methods=["POST"])
@app.route("/api/person/<orcid_id>/fulltext.json", methods=["POST"])
def refresh_fulltext(orcid_id):
    my_person = Person.query.filter_by(orcid_id=orcid_id).first()
    my_person.recalculate_openness()
    safe_commit(db)
    return json_resp(my_person.to_dict())


@app.route("/api/person/<orcid_id>/tweeted-quickly", methods=["POST"])
def tweeted_quickly(orcid_id):
    my_person = Person.query.filter_by(orcid_id=orcid_id).first()

    if not my_person:
            print u"returning 404: orcid profile {} does not exist".format(orcid_id)
            abort_json(404, "That ORCID profile doesn't exist")

    my_person.tweeted_quickly = True
    success = safe_commit(db)
    return json_resp({"resp": "success"})


@app.route("/api/search/<search_str>")
def search(search_str):
    ret = autocomplete(search_str)
    return jsonify({"list": ret, "count": len(ret)})


@app.route("/api/products")
def all_products_endpoint():
    res = get_all_products()
    return jsonify({"list": res })

@app.route("/api/people")
def people_endpoint():
    count = num_people_in_db()
    return jsonify({"count": count})


@app.route("/api/badges")
def badges_about():
    return json_resp(badge_configs())



@app.route("/api/donation", methods=["POST"])
def donation_endpoint():
    stripe.api_key = os.getenv("STRIPE_API_KEY")
    metadata = {
        "full_name": request.json["fullName"],
        "orcid_id": request.json["orcidId"],
        "email": request.json["email"]
    }
    try:
        stripe.Charge.create(
            amount=request.json["cents"],
            currency="usd",
            source=request.json["tokenId"],
            description="Impactstory donation",
            metadata=metadata
        )
    except stripe.error.CardError, e:
        # The card has been declined
        abort_json(499, "Sorry, your credit card was declined.")

    return jsonify({"message": "well done!"})


# user management
##############################################################################


@app.route('/api/me', methods=["GET", "DELETE", "POST"])
@login_required
def me():
    if request.method == "GET":
        my_person = Person.query.filter_by(orcid_id=g.me_orcid_id).first()
        return jsonify(my_person.to_dict())
    elif request.method == "DELETE":

        delete_person(orcid_id=g.me_orcid_id)
        return jsonify({"msg": "Alas, poor Yorick! I knew him, Horatio"})

    elif request.method == "POST":

        if request.json.get("action", None) == "pull_from_orcid":
            refresh_profile(g.me_orcid_id)
            return jsonify({"msg": "pull successful"})

        elif request.json.get("email", None):
            set_person_email(g.me_orcid_id, request.json["email"], True)
            return jsonify({"msg": "email set successfully"})





@app.route("/api/auth/orcid", methods=["POST"])
def orcid_auth():
    access_token_url = 'https://pub.orcid.org/oauth/token'

    payload = dict(client_id="APP-PF0PDMP7P297AU8S",
                   redirect_uri=request.json['redirectUri'],
                   client_secret=os.getenv('ORCID_CLIENT_SECRET'),
                   code=request.json['code'],
                   grant_type='authorization_code')


    # Exchange authorization code for access token
    # The access token has the ORCID ID, which is actually all we need here.
    r = requests.post(access_token_url, data=payload)
    try:
        my_orcid_id = r.json()["orcid"]
    except KeyError:
        print u"Aborting /api/auth/orcid " \
              u"with 500 because didn't get back orcid in oauth json. got this instead: {}".format(r.json())
        abort_json(500, "Invalid JSON return from ORCID during OAuth.")

    my_person = Person.query.filter_by(orcid_id=my_orcid_id).first()

    try:
        token = my_person.get_token()
    except AttributeError:  # my_person is None. So make a new user

        my_person = make_person(my_orcid_id, high_priority=True)
        token = my_person.get_token()

    set_person_claimed_at(my_person)

    return jsonify(token=token)







@app.route('/auth/twitter', methods=['POST'])
@login_required
def twitter():

    print u"calling /auth/twitter"

    request_token_url = 'https://api.twitter.com/oauth/request_token'
    access_token_url = 'https://api.twitter.com/oauth/access_token'

    if request.json.get('oauth_token') and request.json.get('oauth_verifier'):
        # the user already has some creds from signing in to twitter.
        # now get the users's twitter login info.

        auth = OAuth1(os.getenv('TWITTER_CONSUMER_KEY'),
                      client_secret=os.getenv('TWITTER_CONSUMER_SECRET'),
                      resource_owner_key=request.json.get('oauth_token'),
                      verifier=request.json.get('oauth_verifier'))

        r = requests.post(access_token_url, auth=auth)

        twitter_creds = dict(parse_qsl(r.text))
        # print "got back creds from twitter", twitter_creds
        my_person = link_twitter(g.me_orcid_id, twitter_creds)

        # return a token because satellizer like it
        token = my_person.get_token()
        return jsonify(token=token)

    else:
        # we are just starting the whole process. give them the info to
        # help them sign in on the redirect twitter window.
        oauth = OAuth1(
            os.getenv('TWITTER_CONSUMER_KEY'),
            client_secret=os.getenv('TWITTER_CONSUMER_SECRET'),
            callback_uri=request.json.get('redirectUri', 'https://impactstory.org') #sometimes no redirectUri
        )

        r = requests.post(request_token_url, auth=oauth)
        oauth_token = dict(parse_qsl(r.text))
        return jsonify(oauth_token)



if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True, threaded=True)

















