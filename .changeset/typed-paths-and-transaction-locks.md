---
"@cleverbrush/server": minor
"@cleverbrush/client": patch
"@cleverbrush/orm": minor
"@cleverbrush/schema": patch
---

Add typed endpoint pathname construction and matching, shared with client URL generation and server routing. Route parameters are validated and encoded as individual components.

Add optional PostgreSQL advisory locks to ORM transactions, acquired before callbacks and released with their transaction.

Reject non-object inputs to open object schemas with inspectable validation errors, including nested arrays, instead of throwing descriptor errors.
