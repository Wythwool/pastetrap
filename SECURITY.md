# Security policy

If you found a security issue in the extension itself, report it privately before opening a public issue.

Preferred route:

- Open a private advisory on GitHub if available
- Otherwise contact the maintainer through GitHub and point to this repo

Include:

- browser version
- extension version
- steps to reproduce
- impact
- whether the bug requires a malicious page or local access

What counts as a security issue here:

- unsafe rendering of untrusted page content
- extension privilege abuse
- data exposure from local logs or settings
- a way for a page to break out of expected extension boundaries

What does not count:

- missing detections
- heuristic misses
- false positives

Those belong in normal issues unless they are part of a security bypass with a concrete abuse path.
