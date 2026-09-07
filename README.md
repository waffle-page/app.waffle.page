# app.waffle.page

Production bundle for [Waffle](https://github.com/waffle-page/waffle), served from `docs/` and promoted by tag via the Promote workflow. Do not edit by hand.

This repository is also the **desktop download channel**. The notarized macOS disk image for a release is attached to that release here by `apps/desktop/release-macos.sh` in `waffle`; the Promote workflow then writes `docs/latest.json` (which the installed app reads on "Check for updates") and `docs/download/` (the page a stranger lands on) from the release for the tag being promoted. Release assets live here because this repository is public and they therefore need no credentials.

The contract lives in `waffle`: `docs/recipes/promote-production.md` § The desktop half, and `docs/recipes/install-desktop-app.md` § The channel.
