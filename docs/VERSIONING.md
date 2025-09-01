# SemVer Strategy

This monorepo implements a dual versioning strategy using Changesets for automated semantic versioning.

## Version Structure

- **App Version** (root `package.json`): Represents the deployable bundle version

## Making Changes

1. **Create a changeset** when you make a change:

   ```bash
   pnpm changeset
   ```

2. **Version and release** (automated via GitHub Actions on main):

   ```bash
   pnpm changeset version    # Bump versions and update changelogs
   ```

## Version Information

### Runtime Access

- **Backend**: Version logged at startup and available at `/app/version` endpoint
- **Frontend**: Injected at build time via `__APP_VERSION__` and displayed in VersionInfo component

### CI/CD Access

- **Print versions**: `node scripts/print-versions.mjs [--ci]`
- **Docker tags**: Images tagged with semantic versions + SHA
- **Git tags**: Automatic tagging as `app-vX.Y.Z`, `frontend-vX.Y.Z`, `backend-vX.Y.Z`

## Workflows

### Release Workflow

- Triggered on pushes to `main`
- Runs `changeset version` to bump versions
- Syncs root package version
- Creates git tags for new versions
- Builds and pushes Docker images with version tags

### Manual Docker Build

- Triggered manually via workflow dispatch
- Allows custom tag suffix for testing
- Tags images with SHA and custom suffix

## Example Tagging

For app version 1.8.0

- **Git tags**: `app-v1.8.0`
- **Docker tags**:
  - `app:1.8.0` (bundle version)
  