let bodyParser = require('body-parser');
let express = require('express');
let fetch = require('node-fetch');
let httpProxy = require('http-proxy');
let qs = require('qs');

let trustProxy = process.env.TRUST_PROXY;
let target = process.env.TARGET;

if (!target) {
  console.error(`Missing TARGET.`);
  process.exit(1);
}

function clientIp(req) {
  let { remoteAddress } = req.connection;

  if (!trustProxy) {
    return remoteAddress;
  }

  return req.headers['x-forwarded-for'] || remoteAddress;
}

function targetFetch(path, opt) {
  if (path.startsWith('/')) {
    path = path.slice(1);
  }

  opt = opt || {};

  let q = opt.query && qs.stringify(opt.query);

  if (q) {
    q = `?${q}`;
  }

  q = q || '';

  delete opt.query;

  let url = `${target}/${path}${q}`;

  console.log(`Fetching`, decodeURI(url), `...`);

  return fetch(url, opt);
}

function expandSlots(q, slots) {
  if (typeof q !== 'object') {
    return q;
  }

  if (Array.isArray(q)) {
    return q.map(x => expandSlots(x, slots));
  }

  if (!q.fromSlot) {
    for (let [k, v] of Object.entries(q)) {
      q[k] = expandSlots(v, slots);
    }

    return q;
  }

  if (q.fromSlot) {
    let data = slots[q.fromSlot];

    if (q.key) {
      data = data.map(x => x[q.key]);
    }

    return data;
  }
}

let app = express();
let proxy = httpProxy.createProxyServer({ target });

app.use(bodyParser.json());

app.post('/multirequest', (req, res) => {
  (async () => {
    res.slots = {};
    res.pluckSlotNames = new Set();

    for (let cmd of req.body) {
      await handlers[cmd.type](req, res, cmd);
    }

    for (let k of res.pluckSlotNames) {
      delete res.slots[k];
    }

    res.send(res.slots);
  })()
  .catch(err => {
    console.error(err);
    res.status(500).end();
  });
});

let handlers = {};

handlers.get = async (req, res, cmd) => {
  let ip = clientIp(req);

  expandSlots(cmd.query, res.slots);

  tRes = await targetFetch(cmd.path, {
    headers: {
      ...cmd.headers,
      'x-forwarded-for': ip,
    },

    query: cmd.query,
  });

  res.slots[cmd.slot] = await tRes.json();
};

handlers.pluck = (req, res, cmd) => {
  let data = res.slots[cmd.fromSlot];

  if (cmd.key) {
    data = data.map(x => x[cmd.key]);
  }

  let slot = res.slots[cmd.slot];

  if (!slot) {
    slot = res.slots[cmd.slot] = [];
  }

  res.pluckSlotNames.add(cmd.slot);
  slot.push(...data);
};

app.use((req, res) => {
  let { method } = req;
  let proto = req.protocol;
  let host = req.get('host');
  let url = req.originalUrl;

  console.log(`Proxying ${method} ${proto}://${host}${url} ...`);

  proxy.web(req, res);
});

app.listen(process.env.PORT || 3000);
