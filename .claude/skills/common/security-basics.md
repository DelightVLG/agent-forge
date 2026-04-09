# Security Basics

- Validate all external input at the boundary (HTTP handler, form submit).
- Parametrize all DB queries — never string-interpolate user input.
- Escape output by default; opt into raw only with a comment explaining why.
- Authn != authz. Check both on every protected route.
- Rate-limit auth endpoints.
- Log security events but never log secrets or full tokens.
- Dependencies: prefer maintained, popular packages. Flag anything unmaintained.
