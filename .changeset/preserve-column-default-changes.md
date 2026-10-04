---
'@cleverbrush/knex-schema': patch
---

Apply and generate column default changes without dropping, retyping or changing
the nullability of the existing column. Removing a default executes DROP DEFAULT;
setting one executes SET DEFAULT with safely quoted values (including question
marks and backslashes) and support for explicit SQL expressions. Generated down
migrations restore the original default instead of assuming a timestamp column.
