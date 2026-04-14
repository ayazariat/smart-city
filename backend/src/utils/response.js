/**
 * Shared response helpers to reduce repetitive res.status(...).json(...) boilerplate.
 */

const ok = (res, data, message = "Success", status = 200) =>
  res.status(status).json({ success: true, message, data });

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

const created = (res, data, message = "Created") =>
  ok(res, data, message, 201);

module.exports = { ok, fail, created };
