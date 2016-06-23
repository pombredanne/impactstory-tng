from time import time
from app import db
import argparse
from jobs import update_registry
from util import elapsed

# needs to be imported so the definitions get loaded into the registry
import jobs_defs


"""
examples of calling this:

# update everything
python update.py Person.refresh --limit 10 --chunk 5 --rq

# update one thing not using rq
python update.py Package.test --id 0000-1111-2222-3333

"""


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run stuff.")

    # for everything
    parser.add_argument('fn', type=str, help="what function you want to run")
    parser.add_argument('--rq', action="store_true", default=False, help="do jobs in this thread")

    # just for updating lots
    parser.add_argument('--limit', "-l", nargs="?", type=int, help="how many jobs to do")
    parser.add_argument('--chunk', "-ch", nargs="?", type=int, help="how many to take off db at once")

    # just for updating one
    parser.add_argument('--id', nargs="?", type=str, help="id of the one thing you want to update")
    parser.add_argument('--after', nargs="?", type=str, help="minimum id or id start, ie 0000-0001")

    # parse and run
    parsed = parser.parse_args()
    update = update_registry.get(parsed.fn)

    start = time()
    update.run(
        use_rq=parsed.rq,
        obj_id=parsed.id,  # is empty unless updating just one row
        min_id=parsed.after,  # is empty unless minimum id
        num_jobs=parsed.limit,
        chunk_size=parsed.chunk
    )

    db.session.remove()
    print "finished update in {}sec".format(elapsed(start))


