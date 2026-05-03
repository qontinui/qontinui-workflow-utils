# @qontinui/workflow-utils

Pure utility functions for the Qontinui workflow system.

## Installation

```bash
npm install @qontinui/workflow-utils
```

## Releasing

Releases are tag-triggered. Pushing a tag matching `v*` to GitHub fires the
`.github/workflows/publish.yml` workflow, which runs `npm ci`, `npm run build`,
and `npm publish --access public` against `https://registry.npmjs.org` using
the `NPM_TOKEN` org secret.

To cut a release:

```bash
# 1. Bump the version (npm updates package.json + package-lock.json + creates a tag)
npm version patch    # or: minor / major / 0.2.0

# 2. Push the commit and the tag
git push origin master
git push origin --tags
```

CI then publishes the new version. You can also tag manually:

```bash
git tag v0.2.0
git push origin v0.2.0
```

## Local development (linking against a consumer)

To pick up local changes in a consumer without publishing, use `npm link`:

```bash
# In this repo
cd qontinui-workflow-utils
npm link

# In the consumer repo (e.g. qontinui-web/frontend)
npm link @qontinui/workflow-utils
```

To unlink later:

```bash
# In the consumer
npm unlink --no-save @qontinui/workflow-utils
npm install

# In this repo
npm unlink
```

## License

AGPL-3.0-or-later
