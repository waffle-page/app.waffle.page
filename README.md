# app.waffle.page

Production bundle for [Waffle](https://github.com/waffle-page/waffle), served from `docs/` and promoted by tag via the Promote workflow. Do not edit by hand.

This repository is also the **desktop download channel**. The notarized macOS disk image for a release is attached to that release here by `apps/desktop/release-macos.sh` in `waffle`; the Promote workflow then writes `docs/latest.json` (which the installed app reads on "Check for updates") and `docs/download/` (the page a stranger lands on) from the release for the tag being promoted. Release assets live here because this repository is public and they therefore need no credentials.

**A `vX.Y.Z` tag here is a release container, not provenance.** This repository's history is built output, so a source tag can never already exist on it — the release script mints the tag when it publishes, with `--target` at a commit it resolves and prints, and only after proving the same tag is already on `waffle`. The commit the disk image was actually built from is stated in the release notes (`Built from waffle-page/waffle vX.Y.Z (<sha>)`) and in `docs/latest.json`'s `commitSha`. Read those; never read the tag on this repository as the source commit.

The contract lives in `waffle`: `docs/recipes/promote-production.md` § The desktop half, and `docs/recipes/install-desktop-app.md` § The channel.
