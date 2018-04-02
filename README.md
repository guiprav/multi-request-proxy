# multi-request-proxy

A reverse web proxy that adds a `POST /multirequest`
endpoint to any web server. This endpoints accepts
JSON requests of the form:

```
[ COMMAND, ... ]
```

Where each `COMMAND` is an object like the following:

```
{
  "type": "get",
  "path": "/posts",
  "query": QUERY,
  "slot": "posts"
}
```

Where the key `query` is optional, and `QUERY` is an
arbitrarily complex object to be converted into a query
string by the `qs` library.

Additionally, any value inside `QUERY` can be of the form:

```
{
  "fromSlot": "posts",
  "key": "authorId"
}
```

Or an array of those. E.g.:

```
[
  {
    "type": "get",
    "path": "/posts",
    "slot": "posts"
  },

  {
    "type": "get",
    "path": "/comments",
    "query": {
      "postId": { "fromSlot": "posts", "key": "id" }
    },
    "slot": "comments"
  },

  {
    "type": "get",
    "path": "/users",
    "query": {
      "id": [
        { "fromSlot": "posts", "key": "authorId" },
        { "fromSlot": "comments", "key": "authorId" }
      ]
    },
    "slot": "users"
  },
]
```

Those will be expanded according to the data in the
specified slots.

If none of the requests to the backend fail, the
accumulated slots are returned as the multirequest's
response.

## License

![](https://www.gnu.org/graphics/agplv3-155x51.png)

multi-request-proxy is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

## Exclusion of warranty

multi-request-proxy is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

A copy of AGPLv3 can be found in [COPYING.](COPYING)
