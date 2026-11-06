# 07: Mobile install and shutdown CLI (`./offline-chess`)

**What to build:** Provide a single root command-line workflow so a player or developer on macOS or Linux can build the Suite, serve it locally, and open a temporary HTTPS Cloudflare Quick Tunnel to install Offline Chess onto an Android phone in one step, plus a companion command to cleanly shut down the preview server and tunnel. Update the root documentation so setup, development, testing, production deployment, and phone installation instructions are clear and complete.

**Blocked by:** 06: Suite PWA manifest, single root service worker, and offline precaching

**Status:** claimed

- [ ] Running `./offline-chess --install-mobile` installs dependencies if needed, builds the complete Suite, starts the local static preview server, opens a `cloudflared` HTTPS Quick Tunnel, and prints the public HTTPS URL for Android Chrome installation (reusing a healthy running instance when invoked repeatedly).
- [ ] Running `./offline-chess --shutdown` cleanly stops both the preview server and the `cloudflared` tunnel process and cleans up state files.
- [ ] Automated CLI tests verify `--install-mobile`, repeat invocation reuse, error handling when prerequisites are missing, and `--shutdown` cleanup.
- [ ] The root `README.md` documents the Suite overview, prerequisites, local development, running tests across the Suite and Tools, production deployment, and the `--install-mobile` / `--shutdown` phone installation workflow.
